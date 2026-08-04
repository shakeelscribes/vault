'use strict';
const { ZodError } = require('zod');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    return res.status(422).json({ error: 'Validation failed', details: err.errors });
  }

  if (err.name === 'GroqError' || err.status === 503) {
    return res.status(503).json({ error: 'AI parser temporarily unavailable. Try again.' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.expose ? err.message : 'Internal server error',
  });
};
