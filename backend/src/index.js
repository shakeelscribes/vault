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
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
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
app.listen(config.port, () => {
  logger.info(`VAULT API running on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = app;
