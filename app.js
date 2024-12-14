"use strict";
/** Express app for jobly. */

const express = require("express");
const cors = require("cors");

const { NotFoundError } = require("./expressError");

const { authenticateJWT } = require("./middleware/auth");

const authRoutes = require("./routes/auth");

const userRoutes = require("./routes/userRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(authenticateJWT);

app.use("/auth", authRoutes);

app.use("/users", userRoutes);

app.use("/devices", deviceRoutes);

/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;
  const errors = err.errors;  // Detailed field-specific errors

  return res.status(status).json({
    error: {
      message,  // General error message
      errors,   // Detailed field-specific errors if available
      status
    }
  });
});


module.exports = app;
