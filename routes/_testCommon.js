const bcrypt = require("bcrypt");

const db = require("../db.js");
const { createToken } = require("../helpers/tokens");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
  try {
    await db.query("DELETE FROM devices");
    await db.query("DELETE FROM users");

    await db.query(`
        INSERT INTO users(username, password, first_name, last_name, email)
        VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
               ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
        RETURNING username`,
        [
            await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
            await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
        ]);

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
const u1Token = createToken({ username: "u1", isAdmin: false });
const u2Token = createToken({ username: "u2", isAdmin: false });

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
  u2Token 
};