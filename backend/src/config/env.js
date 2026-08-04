'use strict';
require('dotenv').config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
  'VAULT_API_KEY',
  'JWT_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  auth: {
    vaultApiKey: process.env.VAULT_API_KEY,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '1h',
    refreshExpiresIn: '30d',
  },
  rateLimit: {
    smsWindowMs: parseInt(process.env.SMS_RATE_LIMIT_WINDOW_MS || '60000', 10),
    smsMax: parseInt(process.env.SMS_RATE_LIMIT_MAX || '30', 10),
    globalMax: 100,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};
