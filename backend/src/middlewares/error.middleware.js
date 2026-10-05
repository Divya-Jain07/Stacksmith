/**
 * Global Error Handler Middleware
 */
module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong inside the server.';

  // Map Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Map Invalid ObjectId cast errors
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Hide 5xx internals in production
  if (statusCode >= 500) {
    console.error(err); // Log the stack server-side
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
    }
  }

  res.status(statusCode).json({ error: message });
};
