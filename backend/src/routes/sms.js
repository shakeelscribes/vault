'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const { parseSMS } = require('../services/groqParser');
const { resolveCategory } = require('../services/categoryEngine');
const apiKeyMiddleware = require('../middleware/apiKey');
const { smsLimiter } = require('../middleware/rateLimiter');
const { validate, smsSchema } = require('../utils/validators');
const { CANARA_KEYWORDS, BANKING_KEYWORDS, OTP_KEYWORDS, GROQ_CONFIDENCE_THRESHOLD } = require('../utils/constants');
const logger = require('../utils/logger');

const router = Router();

// The user_id for the single-user MVP is the only user in the system.
// We look up the first user to associate SMS transactions with them.
async function getSingleUserId() {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  return data?.id ?? null;
}

// ── POST /api/sms ─────────────────────────────────────────────────────
router.post('/', smsLimiter, apiKeyMiddleware, validate(smsSchema), async (req, res, next) => {
  try {
    const { raw_sms, timestamp } = req.body;
    const smsLower = raw_sms.toLowerCase();

    // 1. Canara Bank filter — must mention Canara or CANBNK
    const isCanara = CANARA_KEYWORDS.some(k => smsLower.includes(k));
    if (!isCanara) {
      return res.json({ status: 'ignored', reason: 'non-canara' });
    }

    // 2. OTP filter — discard silently
    const isOtp = OTP_KEYWORDS.some(k => smsLower.includes(k));
    if (isOtp) {
      return res.json({ status: 'ignored', reason: 'otp' });
    }

    // 3. Banking keywords pre-filter
    const hasFinancialData = BANKING_KEYWORDS.some(k => smsLower.includes(k));
    if (!hasFinancialData) {
      return res.json({ status: 'ignored', reason: 'non-transactional' });
    }

    // 4. Resolve user
    const userId = await getSingleUserId();
    if (!userId) {
      return res.status(500).json({ error: 'No user found in database. Please register first.' });
    }

    // 5. Parse with Groq AI
    const parsed = await parseSMS(raw_sms);

    if (parsed.error === 'unparseable') {
      logger.warn('Groq could not parse SMS', { reason: parsed.reason, raw_sms });
      // Still store it as flagged
      const { data: txn, error: dbErr } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: userId,
          amount: 1, // placeholder
          type: 'debit',
          payment_mode: 'other',
          source: 'sms',
          raw_sms,
          transaction_date: new Date().toISOString().split('T')[0],
          is_flagged: true,
          flag_reason: `Groq: unparseable — ${parsed.reason}`,
          groq_confidence: 0.0,
        })
        .select()
        .single();

      if (dbErr) logger.error('Failed to store flagged SMS', { error: dbErr.message });
      return res.status(202).json({ status: 'flagged', reason: parsed.reason });
    }

    // 6. Resolve category via engine
    const categoryId = await resolveCategory(userId, parsed.merchant, parsed.category);

    // 7. Determine if should be flagged
    const isFlagged = parsed.confidence < GROQ_CONFIDENCE_THRESHOLD;
    const flagReason = isFlagged ? `Low confidence: ${parsed.confidence}` : null;

    // 8. Insert transaction
    const { data: txn, error: dbErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        amount: parsed.amount,
        type: parsed.type,
        payment_mode: parsed.payment_mode,
        merchant: parsed.merchant,
        category_id: categoryId,
        upi_ref: parsed.upi_ref,
        balance_after: parsed.balance_after,
        source: 'sms',
        raw_sms,
        transaction_date: parsed.transaction_date || new Date().toISOString().split('T')[0],
        is_flagged: isFlagged,
        flag_reason: flagReason,
        groq_confidence: parsed.confidence,
      })
      .select(`
        id, amount, type, payment_mode, merchant,
        category_id, upi_ref, balance_after, transaction_date,
        is_flagged, groq_confidence, created_at,
        categories ( name, emoji, color )
      `)
      .single();

    if (dbErr) throw dbErr;

    logger.info('Transaction created from SMS', {
      id: txn.id,
      amount: txn.amount,
      type: txn.type,
      merchant: txn.merchant,
    });

    res.status(201).json({ status: 'created', transaction: txn });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
