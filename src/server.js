require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connect } = require('./services/db');
const { ussdRouter } = require('./ussd/router');
const { adminRouter } = require('./web/admin');

const app = express();

// Enable trust proxy specifically for ngrok
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.use(helmet());
// Configure body parser with appropriate limits
app.use(express.urlencoded({ 
  extended: true,
  limit: '10kb'
}));
app.use(express.json({
  limit: '10kb'
}));

// Configure timeouts
app.use((req, res, next) => {
  // Set server timeout to 20 seconds
  res.setTimeout(20000, () => {
    console.error('Response timeout');
    res.status(408).send('Request timeout');
  });
  next();
});

app.use(morgan('dev')); // Use 'dev' for more detailed logging

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  // Skip rate limiting for USSD endpoint
  skip: (req) => req.path === '/ussd'
});
app.use(limiter);

app.get('/', (req, res) => {
  res.send('Hifadhi Link USSD backend is running ✅');
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Routes
app.post('/ussd', ussdRouter);
app.use('/admin', adminRouter);

// Start
const PORT=process.env.PORT
connect().then(() => {
  app.listen(PORT,() => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('DB connection failed', err);
  process.exit(1);
});
