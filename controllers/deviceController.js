const axios = require("axios");
const Device = require("../models/deviceModel");
const jsonschema = require("jsonschema");
const deviceUpdateSchema = require("../schemas/deviceUpdate.json");
const { BadRequestError } = require("../expressError");
require("dotenv").config();


// Function to validate LIFX token
exports.validateLifxToken =async (lifxToken) => {
  try {
    await axios.get(`${process.env.LIFX_API}/all`, {
      headers: { Authorization: `Bearer ${lifxToken}` }
    });
    return true;  // Token is valid
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return false;  // Token is invalid
    }
    throw new Error('Failed to validate token due to an unexpected error.');
  }
}

// Function to validate device serial number
exports.validateSerialNumber =async (serial_number, lifxToken) => {
  try {
    await axios.get(`${process.env.LIFX_API}/id:${serial_number}`, {
      headers: { Authorization: `Bearer ${lifxToken}` }
    });
    return true;  // serial_number is valid
  } catch (error) {
    
      return false;  // serial_number is invalid
   
  }
}

// Function to send commands to LIFX API

async function sendLifxCommand(selector, action, lifxToken) {
  try {
    const url = `${process.env.LIFX_API}/${selector}/state`;
    const headers = {
      Authorization: `Bearer ${lifxToken}`,
      "Content-Type": "application/json",
    };
    const response = await axios.put(url, action, { headers });
    return response.data;
  } catch (error) {
    console.error("Failed to send command to LIFX:", error.message);
    throw error;
  }
}

exports.controlADevice = async (req, res) => {
  const { name } = req.params;
  const { status, brightness, color } = req.body; 
  try {
    const validator = jsonschema.validate(req.body, deviceUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }
    const device = await Device.findByDeviceName(name, res.locals.user.username);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Prepare the action object based on what's provided in the request
    const action = {};
    if (status !== undefined) action.power = status;
    if (brightness !== undefined) action.brightness = brightness / 100; // LIFX expects 0-1 for brightness
    if (color !== undefined) action.color = color;

    // Send command to LIFX API
    const result = await sendLifxCommand(`id:${device.serial_number}`, action, res.locals.lifxToken);
    if (result.error) {
      throw new Error(result.error);
    }

    // Update device attributes in the database
    await Device.updateADevice(
      device.name,
      { status, brightness, color },
      res.locals.user.username
    );
    res.json({
      message: `Device ${device.name} controlled successfully.`,
      details: result,
    });
  } catch (error) {
    console.error("Failed to control device:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.controlManyDevices = async (req, res) => {
  const { room, status, brightness, color } = req.body;
  const username = res.locals.user.username;
  try {
    // Retrieve devices based on room or for the entire user
    const devices = room
      ? await Device.findByRoomAndUserName(room, username)
      : await Device.findAllByUserName(username);
    if (devices.length === 0) {
      return res.status(404).json({ message: "No devices found." });
    }

    // Prepare the action object based on provided attributes
    const actions = {};
    if (status !== undefined) actions.power = status;
    if (brightness !== undefined) actions.brightness = brightness / 100; // LIFX expects brightness in the range 0-1
    if (color !== undefined) actions.color = color;

    // Attempt to send commands to all devices and collect results
    const apiPromises = devices.map((device) =>
      sendLifxCommand(`id:${device.serial_number}`, actions, res.locals.lifxToken)
    );

    // Await all API calls
    const apiResults = await Promise.all(
      apiPromises.map((p) => p.catch((e) => e))
    );

    // Check if all API calls were successful
    const allSuccessful = apiResults.every(
      (result) => !(result instanceof Error)
    );

    if (!allSuccessful) {
      const failed = apiResults.filter((result) => result instanceof Error);
      throw new Error(
        `Failed to update ${failed.length} out of ${apiResults.length} devices.`
      );
    }

    // If all API calls are successful, update all relevant devices in the database
    await Device.updateMany(username, room, { status, brightness, color });
    res.json({ message: `Successfully updated ${devices.length} devices.` });
  } catch (error) {
    console.error("Failed to control multiple devices:", error);
    res
      .status(500)
      .json({
        error: error.message,
        details: "Failed to update all devices successfully.",
      });
  }
};
