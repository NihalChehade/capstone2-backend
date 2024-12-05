const bcrypt = require("bcrypt");
const User = require("../models/userModel"); // Ensure User model is correctly imported
const db = require("../db.js");
const { createToken } = require("../helpers/tokens");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
  try {
    await db.query("DELETE FROM devices");
    await db.query("DELETE FROM users");

    // Encrypt lifxToken for test users and ensure encryption is awaited
    const encryptedToken1 = User.encrypt("token123456");
    const encryptedToken2 = User.encrypt("token234567");
    await db.query(
      `
      INSERT INTO users(username, password, first_name, last_name, email, lifx_token)
      VALUES 
        ('u1', $1, 'U1F', 'U1L', 'u1@email.com', $3),
        ('u2', $2, 'U2F', 'U2L', 'u2@email.com', $4)
      RETURNING username`,
      [
        await bcrypt.hash("password1", BCRYPT_WORK_FACTOR), // $1
        await bcrypt.hash("password2", BCRYPT_WORK_FACTOR), // $2
        encryptedToken1, // $3
        encryptedToken2, // $4
      ]
    );

    await db.query(`
        INSERT INTO devices (serial_number, name, room, type, status, username, brightness, color)
        VALUES ('123', 'KitchenLight', 'Kitchen', 'Light', 'off', 'u1', 50, 'white'),
               ('456', 'BedroomLight', 'Bedroom', 'Light', 'on', 'u1', 75, 'blue')
        RETURNING serial_number`);
  } catch (error) {
    console.error("Error setting up database before tests:", error);
    throw error;
  }
}

const u1Token = createToken({ username: "u1", lifxToken: "token1" });
const u2Token = createToken({ username: "u2", lifxToken: "token2" });

async function commonAfterAll() {
  try {
    await db.end();
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
};
