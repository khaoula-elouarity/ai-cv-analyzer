const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
};

/**
 * Central error translator. Known operational errors (ApiError, Mongoose
 * validation, JWT, Multer) become clean, actionable JSON. Everything else is
 * logged server-side and reported as an opaque 500 so internals never leak.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];
  let code = err.code;

  // --- Multer -------------------------------------------------------------
  if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum size is ${env.maxUploadMb} MB.`
        : `Upload error: ${err.message}`;
  }

  // --- Mongoose: bad ObjectId -------------------------------------------
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path || 'identifier'}`;
  }

  // --- Mongoose: schema validation ---------------------------------------
  if (err.name === 'ValidationError') {
    statusCode = 422;
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation failed';
  }

  // --- Mongoose: duplicate key -------------------------------------------
  if (code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message =
      field === 'email'
        ? 'An account with that email already exists'
        : `Duplicate value for ${field}`;
    errors = [{ field, message }];
  }

  // Never leak stack traces or driver internals to the client.
  if (statusCode >= 500) {
    console.error('[error]', req.method, req.originalUrl, err);
    message = 'Something went wrong on our end. Please try again.';
  }

  const body = { success: false, message };
  if (errors.length) body.errors = errors;
  if (!env.isProd && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
