'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { validate, budgetSchema } = require('../utils/validators');

const router = Router();
router.use(authMiddleware);

// Helper: calculate period spend
async function getPeriodSpend(userId, categoryId, period) {
  const now = new Date();
  let startDate, endDate;

  if (period === 'daily') {
    startDate = endDate = now.toISOString().split('T')[0];
  } else if (period === 'weekly') {
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startDate = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    endDate = sunday.toISOString().split('T')[0];
  } else {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endDate = lastDay.toISOString().split('T')[0];
  }

  let query = supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .eq('is_deleted', false)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (categoryId) query = query.eq('category_id', categoryId);

  const { data } = await query;
  return (data || []).reduce((sum, t) => sum + Number(t.amount), 0);
}

// ── GET /api/budgets ──────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .select('*, categories ( id, name, emoji, color )')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('period');

    if (error) throw error;

    // Attach current spend to each budget
    const budgetsWithSpend = await Promise.all(
      (data || []).map(async (b) => ({
        ...b,
        current_spend: await getPeriodSpend(userId, b.category_id, b.period),
      }))
    );

    res.json(budgetsWithSpend);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/budgets ─────────────────────────────────────────────────
router.post('/', validate(budgetSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .insert({ ...req.body, user_id: req.user.userId })
      .select('*, categories ( id, name, emoji, color )')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Budget for this category and period already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/budgets/:id ────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(422).json({ error: 'Amount must be a positive number' });
    }

    const { data, error } = await supabaseAdmin
      .from('budgets')
      .update({ amount })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Budget not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/budgets/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('budgets')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) throw error;
    res.json({ status: 'deleted' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/budgets/alerts ───────────────────────────────────────────
router.get('/alerts', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('budget_alerts')
      .select('*, budgets ( period, amount, categories ( name, emoji ) )')
      .eq('user_id', req.user.userId)
      .eq('is_read', false)
      .order('triggered_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/budgets/alerts/:id/read ───────────────────────────────
router.patch('/alerts/:id/read', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('budget_alerts')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId);

    if (error) throw error;
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
