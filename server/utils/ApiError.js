/**
 * Operational error with an HTTP status code. Anything thrown that is *not*
 * an ApiError is treated as an unexpected bug and reported as a 500 without
 * leaking internals to the client.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Array<{field?: string, message: string}>} [errors]
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', errors) {
    return new ApiError(400, msg, errors);
  }
  static unauthorized(msg = 'Not authenticated') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Not allowed') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Resource already exists') {
    return new ApiError(409, msg);
  }
  static payloadTooLarge(msg = 'Payload too large') {
    return new ApiError(413, msg);
  }
  static unprocessable(msg = 'Unprocessable entity', errors) {
    return new ApiError(422, msg, errors);
  }
  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg);
  }
  /** A dependency we rely on is down or could not initialise (e.g. OCR). */
  static serviceUnavailable(msg = 'Service temporarily unavailable') {
    return new ApiError(503, msg);
  }
}

module.exports = ApiError;
