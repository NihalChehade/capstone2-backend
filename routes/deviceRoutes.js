const express = require('express');
const Device = require('../models/deviceModel');
const { ensureLoggedIn, fetchLifxToken } = require('../middleware/auth');  
const { validateSerialnumber } = require("../controllers/deviceController");
const jsonschema = require("jsonschema");
const deviceNewSchema = require("../schemas/deviceNew.json");
const deviceUpdateSchema = require("../schemas/deviceUpdate.json");
const { BadRequestError } = require("../expressError");

const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Route to handle device creation
router.post('/', ensureLoggedIn, fetchLifxToken, async (req, res, next) => {
  try {
    const { serial_number } = req.body;
      if (serial_number) {
        const serialIsValid = await validateSerialnumber(serial_number, res.locals.lifxToken);
        if (!serialIsValid) {
          throw new BadRequestError("Invalid serial number. Ensure adding your device to your lifx account before adding it to your dashboard!");
        }
      }
    const validator = jsonschema.validate(req.body, deviceNewSchema);
    if (!validator.valid) {
      // Collect error messages without stack details for security
      const errs = validator.errors.map(e => e.message);
      throw new BadRequestError(errs.join(", "));
    }
    const newDevice = await Device.create({ ...req.body, username: res.locals.user.username });
    res.status(201).json({device:newDevice});
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
    console.log("device name to delete from deviceRoutes.js", req.params.name)
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
router.patch('/lights/:name', ensureLoggedIn, fetchLifxToken, deviceController.controlADevice);

// Route to change the status/brightness/color or all at once for all devices of a user or by room
router.patch('/lights', ensureLoggedIn, fetchLifxToken, deviceController.controlManyDevices);


module.exports = router;
