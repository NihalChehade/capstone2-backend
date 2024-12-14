"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

class Device {
  // Static method to insert a new device
  static async create({ serial_number, name, room, type, status, username }) {
    const result = await db.query(
      `INSERT INTO devices (serial_number, name, room, type, status, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [serial_number, name, room, type, status, username]
    );
    return result.rows[0];
  }

  static async updateDeviceName(deviceName, newDeviceName, username) {
    // Verify the current device exists
    const device = await this.findByDeviceName(deviceName, username);
    if (!device) {
      throw new NotFoundError("No device found with the provided name.");
    }

    // Check if the new name is already in use by another device (excluding the current one)
    const existingWithName = await this.findByDeviceName(
      newDeviceName,
      username      
    );
    if (
      existingWithName &&
      existingWithName.serial_number !== device.serial_number
    ) {
      throw new BadRequestError({},
        "Another device with the same name already exists."
      );
    }

    // Proceed to update the device name
    const result = await db.query(
      `UPDATE devices SET name = $1 WHERE serial_number = $2 AND username = $3 RETURNING *;`,
      [newDeviceName, device.serial_number, username]
    );
    if (result.rows.length === 0) {
      throw new BadRequestError({},"Update failed, no changes made.");
    }
    return result.rows[0];
  }

  // Static method to update an existing device
  static async updateADevice(deviceName, data, username) {
    const { status, brightness, color } = data;
    const fields = [];
    const values = [];

    // Start by adding deviceName to align with $1
    values.push(deviceName);

    // Add values in the order of their placeholders
    if (status !== undefined) {
      fields.push("status");
      values.push(status); // This will be $2
    }
    if (brightness !== undefined) {
      fields.push("brightness");
      values.push(brightness); // This will be $3 if status is defined, otherwise $2
    }
    if (color !== undefined) {
      fields.push("color");
      values.push(color); // Position depends on what's defined above
    }

    // Add username at the end to align with the last placeholder
    values.push(username); // This will be $5 if all fields are defined, otherwise earlier

    // Early throw if no fields to update
    if (fields.length === 0) {
      throw new BadRequestError({},"No data provided to update.");
    }

    // Build the SQL update clause dynamically
    const setClause = fields
      .map((field, index) => `${field}=$${index + 2}`)
      .join(", ");

    // Build the complete SQL query
    const query = `UPDATE devices SET ${setClause} WHERE name=$1 AND username=$${
      fields.length + 2
    } RETURNING *;`;

    // Verify the current device exists
    const device = await this.findByDeviceName(deviceName, username);
    if (!device) {
      throw new NotFoundError("No device found with the provided name.");
    }
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async updateMany(username, room, updates) {
    const { status, brightness, color } = updates;
    let query = `UPDATE devices SET `;
    const conditions = [];
    const values = [];

    if (status !== undefined) {
      conditions.push(`status = $1`);
      values.push(status);
    }
    if (brightness !== undefined) {
      conditions.push(`brightness = $2`);
      values.push(brightness);
    }
    if (color !== undefined) {
      conditions.push(`color = $3`);
      values.push(color);
    }

    query += conditions.join(", ");

    // Adding where clause based on username and optional room
    query += ` WHERE username = $${values.length + 1}`;
    values.push(username);

    if (room) {
      query += ` AND room = $${values.length + 1}`;
      values.push(room);
    }

    query += ` RETURNING *;`; // Optional based on need

    const result = await db.query(query, values);
    return result.rows; // Or handle differently based on your needs
  }

  // Static method to delete a device
  static async remove(deviceName, username) {
    const result = await db.query(
      `DELETE FROM devices WHERE name=$1 AND username=$2 RETURNING name;`,
      [deviceName, username]
    );
    return result.rows[0];
  }

  // Static method to retrieve all devices by username
  static async findAllByUserName(username) {
    const result = await db.query(
      `SELECT serial_number, name, type, status, brightness, color, room, username 
       FROM devices 
       WHERE username=$1;`,
      [username]
    );
    return result.rows;
  }

  // Static method to find a single device by device name and username
  static async findByDeviceName(deviceName, username) {
   
    const result = await db.query(
      `SELECT serial_number, name, type, status, brightness, color, room, username 
       FROM devices 
       WHERE name=$1 AND username=$2;`,
      [deviceName, username]
    );
   
    return result.rows[0];
  }

  static async findByRoomAndUserName(room, username) {
    const result = await db.query(
      `SELECT serial_number, name, type, status, brightness, color, room, username 
       FROM devices 
       WHERE room=$1 AND username=$2;`,
      [room, username]
    );
    return result.rows;
  }
}

module.exports = Device;
