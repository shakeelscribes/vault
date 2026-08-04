'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const { parseSMS } = require('../services/groqParser');

const router = Router();

router.get('/', async (req, res) => {
  let dbStatus = 'connected';
  let groqStatus = 'reachable';

  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (error) dbStatus = 'error: ' + error.message;
  } catch {
    dbStatus = 'unreachable';
  }

  // Light Groq ping — won't cost a full request token budget
  try {
    const Groq = require('groq-sdk');
    const config = require('../config/env');
    const g = new Groq({ apiKey: config.groq.apiKey });
    await g.models.list(); // cheap endpoint to confirm API key validity
  } catch {
    groqStatus = 'unreachable';
  }

  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    database: dbStatus,
    groq: groqStatus,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
