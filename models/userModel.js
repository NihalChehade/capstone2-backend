"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config.js");
const algorithm = "aes-256-ctr";

/** Related functions for users. */

class User {
  /** Encrypt token */
  static encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, SECRET_KEY, iv);
      const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
      ]);
      return iv.toString("hex") + ":" + encrypted.toString("hex");
    } catch (err) {
      console.error("Encryption error:", err);
      throw new BadRequestError("Failed to encrypt data.");
    }
  }

  /** Decrypt token */
  static decrypt(text) {
    try {
      if (!text) {
        throw new BadRequestError("No token provided for decryption.");
      }
      const textParts = text.split(":");
      if (textParts.length < 2) {
        throw new BadRequestError("Invalid token format.");
      }
      const iv = Buffer.from(textParts.shift(), "hex");
      const encryptedText = Buffer.from(textParts.join(":"), "hex");
      const decipher = crypto.createDecipheriv(algorithm, SECRET_KEY, iv);
      const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final(),
      ]);
      return decrypted.toString();
    } catch (err) {
      console.error("Decryption error:", err);
      throw new BadRequestError("Failed to decrypt data.");
    }
  }

  /** Authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, lifxToken }
   *
   * Throws UnauthorizedError if user not found or wrong password.
   **/
  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT username,
              password,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              lifx_token AS "encryptedLifxToken"
       FROM users
       WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
        const lifxToken = User.decrypt(user.encryptedLifxToken);
        delete user.password;
        delete user.encryptedLifxToken;
        return { ...user, lifxToken };
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, lifxToken }
   *
   * Throws BadRequestError on duplicates.
   **/
  static async register({
    username,
    password,
    firstName,
    lastName,
    email,
    lifxToken,
  }) {
    const duplicateCheck = await db.query(
      `SELECT username
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const encryptedLifxToken = User.encrypt(lifxToken);

    const result = await db.query(
      `INSERT INTO users
       (username, password, first_name, last_name, email, lifx_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING username, first_name AS "firstName", last_name AS "lastName", email, lifx_token AS "encryptedLifxToken"`,
      [username, hashedPassword, firstName, lastName, email, encryptedLifxToken]
    );

    const user = result.rows[0];
    user.lifxToken = lifxToken;
    delete user.encryptedLifxToken;
    return user;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, firstName, lastName, email, lifxToken }
   *
   * Throws NotFoundError if user not found.
   **/
  static async get(username) {
    const userRes = await db.query(
      `SELECT username,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              lifx_token AS "encryptedLifxToken"
       FROM users
       WHERE username = $1`,
      [username]
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const lifxToken = User.decrypt(user.encryptedLifxToken);
    delete user.encryptedLifxToken;
    return { ...user, lifxToken };
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, lifxToken }
   *
   * Returns { username, firstName, lastName, email, lifxToken }
   *
   * Throws NotFoundError if not found.
   *
   */
  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    // Check for lifxToken in the data to update it specifically
    if (data.lifxToken) {
      data.lifx_token = User.encrypt(data.lifxToken);
      delete data.lifxToken; // Remove plain token from the data object
    }

    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      lifx_token: "lifx_token",
    });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                    SET ${setCols} 
                    WHERE username = ${usernameVarIdx} 
                    RETURNING username,
                              first_name AS "firstName",
                              last_name AS "lastName",
                              email,
                              lifx_token AS "encryptedLifxToken"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const lifxToken = User.decrypt(user.encryptedLifxToken);
    delete user.encryptedLifxToken;
    return { ...user, lifxToken };
  }

  /** Delete given user from database; returns username. */

  static async remove(username) {
    let result = await db.query(
      `DELETE
         FROM users
         WHERE username = $1
         RETURNING username`,
      [username]
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
    return user;
  }
}

module.exports = User;
