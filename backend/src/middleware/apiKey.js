'use strict';
const config = require('../config/env');

module.exports = function apiKeyMiddleware(req, res, next) {
  const key = req.headers['x-vault-api-key'];
  if (!key || key !== config.auth.vaultApiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};
