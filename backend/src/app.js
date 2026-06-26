const express = require('express');
const cors = require('cors');

const logger = require('./middlewares/logger.middleware');
const errorHandler = require('./middlewares/error.middleware');
const apiRoutes = require('./routes/index');

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Library System API is running.',
    version: '1.0.0'
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
