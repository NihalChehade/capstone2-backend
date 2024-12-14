const express = require('express');
const Device = require('../models/deviceModel');
const { ensureLoggedIn, fetchLifxToken } = require('../middleware/auth');  
const { validateSerialNumber, controlADevice, controlManyDevices } = require("../controllers/deviceController");
const jsonschema = require("jsonschema");
const deviceNewSchema = require("../schemas/deviceNew.json");
const deviceUpdateSchema = require("../schemas/deviceUpdate.json");
const { BadRequestError } = require("../expressError");

const router = express.Router();

// Route to handle device creation
router.post('/', ensureLoggedIn, fetchLifxToken, async (req, res, next) => {
  try {
    const errors = []; // Initialize an array to collect errors

    const { serial_number } = req.body;

    // Validate serial number
    if (serial_number) {
      const serialIsValid = await validateSerialNumber(serial_number, res.locals.lifxToken);
      if (!serialIsValid) {
        errors.push({
          field: "serial_number",
          message: "Invalid serial number. Ensure adding your device to your LIFX account before adding it to your dashboard!"
        });
      }
    }

    // Validate input data using schema
    const validator = jsonschema.validate(req.body, deviceNewSchema);
    if (!validator.valid) {
      
      const validationErrors = validator.errors.map(e => ({
        field: e.path[0], // Get the field that caused the error
        message: e.message // Get the error message
      }));
      errors.push(...validationErrors); // Add schema validation errors to the errors array
    }

    // If any errors were collected, throw a BadRequestError
    if (errors.length > 0) {
      
      throw new BadRequestError(errors, "Validation failed.");
    }
    
    // Create new device if validation passes
    const newDevice = await Device.create({ ...req.body, username: res.locals.user.username });
    res.status(201).json({ device: newDevice });
  } catch (error) {
    return next(error);
  }
});



// Route to update a device name
router.patch('/:name/rename', ensureLoggedIn, async (req, res, next) => {
  try {
    const {name} =req.body;
    const validator = jsonschema.validate(req.body, deviceUpdateSchema);
    if (!validator.valid) {
      // Collect error messages without stack details for security
      const errs = validator.errors.map(e => e.message);
      throw new BadRequestError(errs.join(", "));
    }
    const updatedDevice = await Device.updateDeviceName(req.params.name, name, res.locals.user.username);
    res.json({device:updatedDevice});
  } catch (error) {
    return next(error);
  }
});

// Route to delete a device
router.delete('/:name', ensureLoggedIn, async (req, res, next) => {
  try {
    const deletedDevice = await Device.remove(req.params.name, res.locals.user.username);
    res.json({ deleted: deletedDevice.name });
  } catch (error) {
    return next(error);
  }
});

// Route to get a device
router.get('/:name', ensureLoggedIn, async (req, res, next) => {
  try {
    const device = await Device.findByDeviceName(req.params.name, res.locals.user.username);
   
    res.json({device});
  } catch (error) {
    return next(error);
  }
});

// Route to list all devices for a user
router.get('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const devices = await Device.findAllByUserName(res.locals.user.username);
   
    res.json({devices});
  } catch (error) {
    return next(error);
  }
});

// Route to change the status/brightness/color or all at once of a light
router.patch('/lights/:name', ensureLoggedIn, fetchLifxToken, controlADevice);

// Route to change the status/brightness/color or all at once for all devices of a user or by room
router.patch('/lights', ensureLoggedIn, fetchLifxToken, controlManyDevices);


module.exports = router;
