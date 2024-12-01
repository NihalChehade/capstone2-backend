const express = require('express');
const Device = require('../models/deviceModel');
const { ensureLoggedIn } = require('../middleware/auth');  
const jsonschema = require("jsonschema");
const deviceNewSchema = require("../schemas/deviceNew.json");
const deviceUpdateSchema = require("../schemas/deviceUpdate.json");
const { BadRequestError } = require("../expressError");

const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Route to handle device creation
router.post('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const validator = jsonschema.validate(req.body, deviceNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
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
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
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
    const deletedDevice = await Device.remove(req.params.name);
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
router.patch('/lights/:name', ensureLoggedIn, deviceController.controlADevice);

// Route to change the status/brightness/color or all at once for all devices of a user or by room
router.patch('/lights', ensureLoggedIn, deviceController.controlManyDevices);


module.exports = router;
