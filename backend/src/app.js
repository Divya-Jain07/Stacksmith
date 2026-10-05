const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { corsOptions } = require('./config/cors');
const logger = require('./middlewares/logger.middleware');
const errorHandler = require('./middlewares/error.middleware');
const apiRoutes = require('./routes/index');

const app = express();

// Trust proxy for rate limiting behind Vercel/proxies
app.set('trust proxy', 1);

// Add security headers
app.use(helmet());

// Core middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(logger);

// General API rate limit: ~120 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests from this IP, please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

// API Routes
app.use('/api', apiLimiter, apiRoutes);

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
