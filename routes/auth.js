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
const { BadRequestError } = require("../expressError");

/** POST /auth/token:  { username, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post("/token", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userAuthSchema);
    if (!validator.valid) {
      // Collect error messages without stack details
      const errs = validator.errors.map(e => e.message);
      throw new BadRequestError(errs.join(", "));
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
    const validator = jsonschema.validate(req.body, userRegisterSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => {
        const path = e.instancePath.split("/").pop(); // Get the field name

        switch (path) {
          case "username":
            if (e.keyword === "minLength") {
              return "Username must be at least 1 character long.";
            } else if (e.keyword === "maxLength") {
              return "Username must be less than 31 characters.";
            }
            break;
          case "password":
            if (e.keyword === "minLength") {
              return "Password must be at least 5 characters long.";
            } else if (e.keyword === "maxLength") {
              return "Password must be less than 21 characters.";
            }
            break;
          case "firstName":
          case "lastName":
            if (e.keyword === "minLength") {
              return `${path.charAt(0).toUpperCase() + path.slice(1)} must be at least 1 character long.`;
            } else if (e.keyword === "maxLength") {
              return `${path.charAt(0).toUpperCase() + path.slice(1)} must be less than 31 characters.`;
            }
            break;
          case "email":
            if (e.keyword === "format") {
              return "Please enter a valid email address.";
            } else if (e.keyword === "minLength") {
              return "Email must be at least 6 characters long.";
            } else if (e.keyword === "maxLength") {
              return "Email must be less than 61 characters.";
            }
            break;
          case "lifxToken":
            if (e.keyword === "minLength") {
              return "LIFX Token must be at least 10 characters long.";
            } else if (e.keyword === "maxLength") {
              return "LIFX Token must be less than 101 characters.";
            }
            break;
        }
        return e.message;  // Default message for other less common errors
      });
      throw new BadRequestError(errs.join(", "));
    }

    const newUser = await User.register({ ...req.body});
    
    const token = createToken(newUser);
    res.locals.lifxToken = newUser.lifxToken;
    return res.status(201).json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
