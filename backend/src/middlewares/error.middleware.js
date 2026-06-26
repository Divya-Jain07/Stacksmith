/**
 * Global Error Handler Middleware
 */
module.exports = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message || 'Something went wrong inside the server.'
  });
};
