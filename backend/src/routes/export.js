'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

function toCSV(transactions) {
  const header = 'Date,Amount,Type,Payment Mode,Merchant,Category,UPI Ref,Balance After,Note,Source';
  const rows = transactions.map(t => [
    t.transaction_date,
    t.amount,
    t.type,
    t.payment_mode,
    t.merchant || '',
    t.categories?.name || '',
    t.upi_ref || '',
    t.balance_after || '',
    (t.note || '').replace(/,/g, ';'),
    t.source,
  ].join(','));
  return [header, ...rows].join('\n');
}

// ── GET /api/export ───────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { format = 'csv', start_date, end_date, category_id, payment_mode } = req.query;

    let query = supabaseAdmin
      .from('transactions')
      .select('*, categories(name,emoji)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false });

    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);
    if (category_id) query = query.eq('category_id', category_id);
    if (payment_mode) query = query.eq('payment_mode', payment_mode);

    const { data, error } = await query;
    if (error) throw error;

    if (format === 'csv') {
      const csv = toCSV(data || []);
      const filename = `vault-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    // For PDF format — return JSON for frontend to render
    // Full PDF generation is done client-side via browser print API
    res.json({ transactions: data, generated_at: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
