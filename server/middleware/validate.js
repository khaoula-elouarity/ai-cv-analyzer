const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Collects express-validator results and converts failures into a single
 * 422 response shaped for the frontend to render inline field errors.
 *
 * @param {{location?: 'body'|'query'|'params'}} [options]
 */
const validate = (options = {}) => (req, res, next) => {
  const result = validationResult({ ...req, ...options });
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return next(ApiError.unprocessable('Validation failed', errors));
};

module.exports = validate;
