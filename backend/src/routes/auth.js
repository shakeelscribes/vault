'use strict';
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../db/supabase');
const config = require('../config/env');
const logger = require('../utils/logger');
const { validate, loginSchema, registerSchema } = require('../utils/validators');
const authMiddleware = require('../middleware/auth');

const router = Router();

// Track failed attempts per username (in-memory — sufficient for single-user MVP)
const failedAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function isLocked(username) {
  const entry = failedAttempts.get(username);
  if (!entry) return false;
  if (entry.count >= LOCKOUT_THRESHOLD && Date.now() - entry.lastAttempt < LOCKOUT_MS) return true;
  if (Date.now() - entry.lastAttempt >= LOCKOUT_MS) {
    failedAttempts.delete(username);
    return false;
  }
  return false;
}

function recordFail(username) {
  const entry = failedAttempts.get(username) || { count: 0, lastAttempt: 0 };
  entry.count += 1;
  entry.lastAttempt = Date.now();
  failedAttempts.set(username, entry);
}

function clearFail(username) {
  failedAttempts.delete(username);
}

function signTokens(userId, username) {
  const access = jwt.sign({ userId, username }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
  const refresh = jwt.sign({ userId, username, type: 'refresh' }, config.auth.jwtSecret, {
    expiresIn: config.auth.refreshExpiresIn,
  });
  return { access, refresh };
}

// ── POST /api/auth/register ───────────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, password, name } = req.body;

    // Check if username taken
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ username, password_hash, name })
      .select('id, username, name, setup_complete')
      .single();

    if (error) throw error;

    const { access, refresh } = signTokens(user.id, user.username);

    res
      .cookie('vault_refresh', refresh, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({ token: access, user: { id: user.id, username: user.username, name: user.name, setup_complete: user.setup_complete } });

    logger.info('User registered', { username });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (isLocked(username)) {
      return res.status(429).json({ error: 'Account locked. Too many failed attempts. Try again in 5 minutes.' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, name, password_hash, setup_complete')
      .eq('username', username)
      .single();

    if (error || !user) {
      recordFail(username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFail(username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    clearFail(username);
    const { access, refresh } = signTokens(user.id, user.username);

    res
      .cookie('vault_refresh', refresh, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({
        token: access,
        user: { id: user.id, username: user.username, name: user.name, setup_complete: user.setup_complete },
      });

    logger.info('User logged in', { username });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.vault_refresh;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const payload = jwt.verify(refreshToken, config.auth.jwtSecret);
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });

    const access = jwt.sign({ userId: payload.userId, username: payload.username }, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });

    res.json({ token: access });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token invalid or expired. Please log in again.' });
    }
    next(err);
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('vault_refresh').json({ status: 'logged_out' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, name, setup_complete, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/auth/setup-complete ────────────────────────────────────
router.patch('/setup-complete', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ setup_complete: true })
      .eq('id', req.user.userId);

    if (error) throw error;
    res.json({ status: 'ok', setup_complete: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/change-password ────────────────────────────────────
router.post('/change-password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide both current and new passwords.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ password_hash })
      .eq('id', req.user.userId);

    if (updateErr) throw updateErr;

    logger.info('Password successfully changed for user', { userId: req.user.userId });
    res.json({ status: 'ok', message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, recoveryKey, newPassword } = req.body;
    if (!username || !recoveryKey || !newPassword) {
      return res.status(400).json({ error: 'Please fill out all required fields.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (recoveryKey !== config.auth.vaultApiKey) {
      return res.status(403).json({ error: 'Invalid Master Recovery Key.' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'No user found with that username.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ password_hash })
      .eq('id', user.id);

    if (updateErr) throw updateErr;

    clearFail(username); // reset any account lockout flags upon password reset
    logger.info('Password reset via Master Recovery Key for user', { username });
    res.json({ status: 'ok', message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
