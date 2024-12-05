"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");
const User = require('../models/userModel')


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when they must provide a valid token & be user matching
 *  username provided as route param.
 *
 *  If not, raises Unauthorized.
 */

function ensureCorrectUser(req, res, next) {
  try {
    const user = res.locals.user;
    if (!(user && (user.username === req.params.username))) {
      throw new UnauthorizedError();
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/** 
 *  Middleware to use when a lifxToken is needed for a deviceControl
 *  
 */
async function fetchLifxToken(req, res, next) {
  // Check if the user is authenticated
  if (res.locals.user) {
    try {
      // Fetch the user's LIFX token from the database
      const username = res.locals.user.username;
      const user = await User.get(username); // Assuming User.get fetches the full user record

      // Store the LIFX token in res.locals for use in subsequent handlers
      res.locals.lifxToken = user.lifxToken;
      next();
    } catch (error) {
      console.error("Error fetching LIFX token:", error);
      next(error); // Forward to error handling middleware
    }
  } else {
    // If no user is found in res.locals, skip fetching the LIFX token
    next();
  }
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
  fetchLifxToken
};
