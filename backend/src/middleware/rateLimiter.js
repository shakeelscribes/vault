'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// SMS endpoint — strict limit (30/min per IP)
const smsLimiter = rateLimit({
  windowMs: config.rateLimit.smsWindowMs,
  max: config.rateLimit.smsMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Max 30 SMS per minute.' },
});

// Global API limit (100/min per IP)
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: config.rateLimit.globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { smsLimiter, globalLimiter };
