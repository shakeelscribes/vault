'use strict';
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Anon client — used for user-context requests (respects RLS)
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Service role client — bypasses RLS, used only in server-side operations
// like SMS ingestion and PDF import where we need to write on behalf of a user
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { persistSession: false } }
);

module.exports = { supabase, supabaseAdmin };
