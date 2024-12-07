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
      const { lifxToken } = req.body;
      if (lifxToken) {
        const tokenIsValid = await validateLifxToken(lifxToken);
        if (!tokenIsValid) {
          throw new BadRequestError("Invalid LIFX Token.");
        }
      }

      const validator = jsonschema.validate(req.body, userUpdateSchema);
      if (!validator.valid) {
        // Collect error messages without stack details
        const errs = validator.errors.map((e) => e.message);
        throw new BadRequestError(errs.join(", "));
      }

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
