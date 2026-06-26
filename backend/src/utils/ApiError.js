class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message Error message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    // Preserve proper stack trace (only works on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
