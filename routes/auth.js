"use strict";

/** Routes for authentication. */

const jsonschema = require("jsonschema");
const {ensureLoggedIn} =require('../middleware/auth');
const User = require("../models/userModel");
const express = require("express");
const router = new express.Router();
const { createToken } = require("../helpers/tokens");
const userAuthSchema = require("../schemas/userAuth.json");
const userRegisterSchema = require("../schemas/userRegister.json");
const { validateLifxToken } = require('../controllers/deviceController');
const { BadRequestError } = require("../expressError");

/** POST /auth/token:  { username, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/token", async function (req, res, next) {
  try {
    const errors = []; // Initialize an array to collect errors

    // Validate input data using schema
    const validator = jsonschema.validate(req.body, userAuthSchema);
    if (!validator.valid) {
      const validationErrors = validator.errors.map(e => ({
        field: e.path[0], // Get the field that caused the error
        message: e.message // Get the error message
      }));
      errors.push(...validationErrors); // Add schema validation errors to the errors array
    }

    // If any errors were collected, throw a BadRequestError with all collected errors
    if (errors.length > 0) {
      throw new BadRequestError(errors, "Validation failed.");
    }

    const { username, password } = req.body;
    const user = await User.authenticate(username, password);
    const token = createToken(user);
    res.locals.lifxToken = user.lifxToken;

    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});


/** POST /auth/register:   { user } => { token }
 *
 * user must include { username, password, firstName, lastName, email }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/register", async function (req, res, next) {
  try {
    const { lifxToken } = req.body;
    const errors = []; // Initialize an array to collect errors

    // Validate LIFX token if provided
    if (lifxToken) {
      const tokenIsValid = await validateLifxToken(lifxToken);
      if (!tokenIsValid) {
        errors.push({ field: "lifxToken", message: "Invalid LIFX Token. Ensure it is correct and try again." });
      }
    }

    // Validate input data against the user registration schema
    const validator = jsonschema.validate(req.body, userRegisterSchema);
    if (!validator.valid) {
      const validationErrors = validator.errors.map(e => ({
        field: e.path[0],
        message: e.message
      }));
      errors.push(...validationErrors); // Add schema validation errors to the errors array
    }

    // If any errors were collected, throw a BadRequestError with all collected errors
    if (errors.length > 0) {
      throw new BadRequestError(errors, "Validation failed.");
    }

    // Register user if there are no validation errors
    const newUser = await User.register(req.body);
    const token = createToken(newUser);
    return res.status(201).json({ token });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
