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
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
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
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const newUser = await User.register({ ...req.body});
    
    const token = createToken(newUser);
    res.locals.lifxToken = newUser.lifxToken;
    return res.status(201).json({ token });
  } catch (err) {
    return next(err);
  }
});

// Logout route
// router.post('/logout', ensureLoggedIn, async function(req, res, next) {
//   try {
//       // Destroy the session
//       req.session.destroy(err => {
//           if (err) {
//               return next(err);
//           }
//           res.status(200).json({ message: 'Logout successful.' });
//       });
//   } catch (err) {
//       return next(err);
//   }
// });


module.exports = router;
