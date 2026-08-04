'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

function getPeriodDates(period, date) {
  const ref = date ? new Date(date) : new Date();
  let startDate, endDate;

  if (period === 'daily') {
    const d = ref.toISOString().split('T')[0];
    startDate = endDate = d;
  } else if (period === 'weekly') {
    const day = ref.getDay();
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - (day === 0 ? 6 : day - 1));
    startDate = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    endDate = sunday.toISOString().split('T')[0];
  } else {
    // monthly
    startDate = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    endDate = lastDay.toISOString().split('T')[0];
  }
  return { startDate, endDate };
}

// ── GET /api/dashboard/summary ────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const period = req.query.period || 'weekly';
    const { startDate, endDate } = getPeriodDates(period, req.query.date);

    const { data: txns, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) throw error;

    const debits = txns.filter(t => t.type === 'debit');
    const credits = txns.filter(t => t.type === 'credit');

    const totalDebit = debits.reduce((s, t) => s + Number(t.amount), 0);
    const totalCredit = credits.reduce((s, t) => s + Number(t.amount), 0);

    // By category
    const byCategoryMap = {};
    for (const t of debits) {
      const key = t.category_id || 'uncategorised';
      if (!byCategoryMap[key]) {
        byCategoryMap[key] = { category_id: key, name: t.categories?.name || 'Other', emoji: t.categories?.emoji || '📦', color: t.categories?.color || '#9CA3AF', amount: 0 };
      }
      byCategoryMap[key].amount += Number(t.amount);
    }
    const byCategory = Object.values(byCategoryMap).sort((a, b) => b.amount - a.amount);

    // By payment mode
    const byModeMap = {};
    for (const t of debits) {
      byModeMap[t.payment_mode] = (byModeMap[t.payment_mode] || 0) + Number(t.amount);
    }
    const byPaymentMode = Object.entries(byModeMap).map(([mode, amount]) => ({ mode, amount }));

    // Daily trend
    const trendMap = {};
    for (const t of txns) {
      if (!trendMap[t.transaction_date]) trendMap[t.transaction_date] = { date: t.transaction_date, debit: 0, credit: 0 };
      if (t.type === 'debit') trendMap[t.transaction_date].debit += Number(t.amount);
      else trendMap[t.transaction_date].credit += Number(t.amount);
    }
    const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top category
    const topCategory = byCategory[0] || null;

    // Biggest single payment
    const biggest = debits.reduce((max, t) => Number(t.amount) > Number(max?.amount || 0) ? t : max, null);

    res.json({
      period,
      start_date: startDate,
      end_date: endDate,
      total_debit: totalDebit,
      total_credit: totalCredit,
      net: totalCredit - totalDebit,
      transaction_count: txns.length,
      top_category: topCategory,
      biggest_payment: biggest ? { merchant: biggest.merchant, amount: Number(biggest.amount) } : null,
      by_category: byCategory,
      by_payment_mode: byPaymentMode,
      daily_trend: dailyTrend,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
