'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Routes
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const smsRouter = require('./routes/sms');
const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const budgetsRouter = require('./routes/budgets');
const pdfRouter = require('./routes/pdf');
const exportRouter = require('./routes/export');
const dashboardRouter = require('./routes/dashboard');

const app = express();

// ── Security ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in dev to allow mobile connections
}));

// CORS configuration — allow localhost and local network IP
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, shortcuts)
    if (!origin) return callback(null, true);

    if (
      config.nodeEnv === 'development' ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('192.168.') ||
      origin === config.frontendUrl
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body Parsers ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Global Rate Limit ─────────────────────────────────────────────────
app.use('/api', globalLimiter);

// ── Request Logging ───────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/sms', smsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/export', exportRouter);
app.use('/api/dashboard', dashboardRouter);

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────
app.listen(config.port, '0.0.0.0', () => {
  logger.info(`VAULT API running on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = app;
