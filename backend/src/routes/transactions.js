'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { validate, manualTransactionSchema, updateTransactionSchema } = require('../utils/validators');
const { upsertMerchantMapping } = require('../services/categoryEngine');
const logger = require('../utils/logger');

const router = Router();
router.use(authMiddleware);

const TXN_SELECT = `
  id, amount, type, payment_mode, merchant,
  category_id, upi_ref, balance_after, source,
  transaction_date, note, is_flagged, flag_reason,
  is_deleted, groq_confidence, created_at, updated_at,
  categories ( id, name, emoji, color )
`;

// ── GET /api/transactions ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      limit = 50,
      offset = 0,
      start_date,
      end_date,
      payment_mode,
      category_id,
      type,
      is_flagged,
      search,
      sort = 'date_desc',
    } = req.query;

    let query = supabaseAdmin
      .from('transactions')
      .select(TXN_SELECT, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);
    if (payment_mode) query = query.eq('payment_mode', payment_mode);
    if (category_id) query = query.eq('category_id', category_id);
    if (type) query = query.eq('type', type);
    if (is_flagged !== undefined) query = query.eq('is_flagged', is_flagged === 'true');
    if (search) query = query.ilike('merchant', `%${search}%`);

    // Apply sorting
    switch (sort) {
      case 'date_asc':
        query = query.order('transaction_date', { ascending: true }).order('created_at', { ascending: true });
        break;
      case 'amount_desc':
        query = query.order('amount', { ascending: false });
        break;
      case 'amount_asc':
        query = query.order('amount', { ascending: true });
        break;
      case 'date_desc':
      default:
        query = query.order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ transactions: data, total: count, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/transactions/:id ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select(TXN_SELECT)
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Transaction not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/transactions/:id ───────────────────────────────────────
router.patch('/:id', validate(updateTransactionSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get old values for audit log
    const { data: old } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!old) return res.status(404).json({ error: 'Transaction not found' });

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .select(TXN_SELECT)
      .single();

    if (error) throw error;

    // Merchant memory: if category changed, upsert mapping
    if (req.body.category_id && req.body.category_id !== old.category_id && data.merchant) {
      await upsertMerchantMapping(userId, data.merchant, req.body.category_id);
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      entity_type: 'transaction',
      entity_id: req.params.id,
      action: 'update',
      old_values: old,
      new_values: data,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: old } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!old) return res.status(404).json({ error: 'Transaction not found' });

    const { error } = await supabaseAdmin
      .from('transactions')
      .update({ is_deleted: true })
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (error) throw error;

    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      entity_type: 'transaction',
      entity_id: req.params.id,
      action: 'delete',
      old_values: old,
      new_values: { is_deleted: true },
    });

    res.json({ status: 'deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/transactions/manual ─────────────────────────────────────
router.post('/manual', validate(manualTransactionSchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({ ...req.body, user_id: userId, source: 'manual' })
      .select(TXN_SELECT)
      .single();

    if (error) throw error;

    logger.info('Manual transaction created', { id: data.id, amount: data.amount });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
