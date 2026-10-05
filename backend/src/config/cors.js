const allowedOriginsStr = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

module.exports = { corsOptions };
