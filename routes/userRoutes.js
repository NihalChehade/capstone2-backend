"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureCorrectUser } = require("../middleware/auth");
const { validateLifxToken } = require("../controllers/deviceController");
const { BadRequestError } = require("../expressError");
const User = require("../models/userModel");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();

/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName}
 *
 * Authorization required: same-user-as-:username
 **/

router.get(
  "/:username",
  ensureLoggedIn,
  ensureCorrectUser,
  async function (req, res, next) {
    try {
      const user = await User.get(req.params.username);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email, lifxToken }
 *
 * Returns { username, firstName, lastName, email, lifxToken}
 *
 * Authorization required: same-user-as-:username
 **/

router.patch(
  "/:username",
  ensureLoggedIn,
  ensureCorrectUser,
  async function (req, res, next) {
    try {
      const errors = []; // Initialize an array to collect errors
      const { lifxToken } = req.body;

      // Validate LIFX Token
      if (lifxToken) {
        const tokenIsValid = await validateLifxToken(lifxToken);
        if (!tokenIsValid) {
          errors.push({
            field: "lifxToken",
            message: "Invalid LIFX Token. Please ensure it is correct."
          });
        }
      }

      // Validate input data using schema
      const validator = jsonschema.validate(req.body, userUpdateSchema);
      if (!validator.valid) {
        const validationErrors = validator.errors.map(e => ({
          field: e.path[0], // Get the field that caused the error, or default to 'field'
          message: e.message // Get the error message
        }));
        errors.push(...validationErrors); // Add schema validation errors to the errors array
      }

      // If any errors were collected, throw a BadRequestError with all collected errors
      if (errors.length > 0) {
        throw new BadRequestError(errors, "Validation failed.");
      }

      // Update user if validation passes
      const user = await User.update(req.params.username, req.body);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  }
);


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required:  same-user-as-:username
 **/

router.delete(
  "/:username",
  ensureLoggedIn,
  ensureCorrectUser,
  async function (req, res, next) {
    try {
      await User.remove(req.params.username);
      return res.json({ deleted: req.params.username });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
