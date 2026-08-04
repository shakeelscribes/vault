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

function getPreviousPeriodDates(period, date) {
  const ref = date ? new Date(date) : new Date();
  let startDate, endDate;

  if (period === 'daily') {
    const prev = new Date(ref);
    prev.setDate(prev.getDate() - 1);
    const d = prev.toISOString().split('T')[0];
    startDate = endDate = d;
  } else if (period === 'weekly') {
    const day = ref.getDay();
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - (day === 0 ? 6 : day - 1));
    monday.setDate(monday.getDate() - 7);
    startDate = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    endDate = sunday.toISOString().split('T')[0];
  } else {
    // monthly
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    startDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
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

// ── GET /api/dashboard/analytics ──────────────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const period = req.query.period || 'monthly';
    const { startDate, endDate } = getPeriodDates(period, req.query.date);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriodDates(period, req.query.date);

    // Current period transactions
    const { data: txns, error: txnError } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (txnError) throw txnError;

    // Previous period transactions for comparison
    const { data: prevTxns, error: prevError } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', prevStartDate)
      .lte('transaction_date', prevEndDate);

    if (prevError) throw prevError;

    // Budgets for current period
    const { data: budgets, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('id, amount, period, category_id, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (budgetError) throw budgetError;

    const debits = txns.filter(t => t.type === 'debit');
    const credits = txns.filter(t => t.type === 'credit');
    const prevDebits = prevTxns.filter(t => t.type === 'debit');
    const prevCredits = prevTxns.filter(t => t.type === 'credit');

    const totalDebit = debits.reduce((s, t) => s + Number(t.amount), 0);
    const totalCredit = credits.reduce((s, t) => s + Number(t.amount), 0);
    const prevTotalDebit = prevDebits.reduce((s, t) => s + Number(t.amount), 0);
    const prevTotalCredit = prevCredits.reduce((s, t) => s + Number(t.amount), 0);

    // Category breakdown (current)
    const byCategoryMap = {};
    for (const t of debits) {
      const key = t.category_id || 'uncategorised';
      if (!byCategoryMap[key]) {
        byCategoryMap[key] = { category_id: key, name: t.categories?.name || 'Other', emoji: t.categories?.emoji || '📦', color: t.categories?.color || '#9CA3AF', amount: 0 };
      }
      byCategoryMap[key].amount += Number(t.amount);
    }
    const byCategory = Object.values(byCategoryMap).sort((a, b) => b.amount - a.amount);

    // Category breakdown (previous) for comparison
    const prevByCategoryMap = {};
    for (const t of prevDebits) {
      const key = t.category_id || 'uncategorised';
      if (!prevByCategoryMap[key]) {
        prevByCategoryMap[key] = { category_id: key, name: t.categories?.name || 'Other', amount: 0 };
      }
      prevByCategoryMap[key].amount += Number(t.amount);
    }

    // Category with MoM change
    const byCategoryWithChange = byCategory.map(cat => {
      const prev = prevByCategoryMap[cat.category_id];
      const prevAmount = prev?.amount || 0;
      const change = prevAmount > 0 ? ((cat.amount - prevAmount) / prevAmount) * 100 : (cat.amount > 0 ? 100 : 0);
      return { ...cat, prev_amount: prevAmount, change_pct: Math.round(change * 100) / 100 };
    });

    // Budget vs Actual
    const budgetComparison = [];
    for (const budget of budgets) {
      const budgetPeriod = budget.period;
      let budgetStart, budgetEnd;
      if (budgetPeriod === 'daily') {
        budgetStart = budgetEnd = startDate;
      } else if (budgetPeriod === 'weekly') {
        const day = new Date(startDate).getDay();
        const monday = new Date(startDate);
        monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
        budgetStart = monday.toISOString().split('T')[0];
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        budgetEnd = sunday.toISOString().split('T')[0];
      } else {
        budgetStart = startDate;
        budgetEnd = endDate;
      }

      const relevantDebits = debits.filter(d => 
        d.transaction_date >= budgetStart && 
        d.transaction_date <= budgetEnd &&
        (!budget.category_id || d.category_id === budget.category_id)
      );
      const spent = relevantDebits.reduce((s, t) => s + Number(t.amount), 0);

      const budgetAmount = Number(budget.amount);
      const pct = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
      const status = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'safe';

      budgetComparison.push({
        budget_id: budget.id,
        category: budget.categories ? { name: budget.categories.name, emoji: budget.categories.emoji, color: budget.categories.color } : { name: 'Overall', emoji: '📊', color: '#7C3AED' },
        period: budgetPeriod,
        budget: budgetAmount,
        spent,
        remaining: Math.max(0, budgetAmount - spent),
        pct: Math.round(pct * 100) / 100,
        status,
      });
    }

    // Top merchants
    const merchantMap = {};
    for (const t of debits) {
      const key = t.merchant || 'Unknown';
      if (!merchantMap[key]) merchantMap[key] = { merchant: key, amount: 0, count: 0 };
      merchantMap[key].amount += Number(t.amount);
      merchantMap[key].count += 1;
    }
    const topMerchants = Object.values(merchantMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(m => ({ ...m, avg: Math.round(m.amount / m.count * 100) / 100 }));

    // Spending by day of week
    const dowMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const byDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const t of debits) {
      const day = new Date(t.transaction_date).getDay();
      byDayOfWeek[day] += Number(t.amount);
    }
    const dayOfWeekData = Object.entries(byDayOfWeek).map(([day, amount]) => ({
      day: dowMap[day],
      amount: Math.round(amount * 100) / 100,
    }));

    // Average transaction size
    const avgDebit = debits.length > 0 ? totalDebit / debits.length : 0;
    const avgCredit = credits.length > 0 ? totalCredit / credits.length : 0;

    // Savings rate
    const savingsRate = totalCredit > 0 ? ((totalCredit - totalDebit) / totalCredit) * 100 : 0;

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const { data: sixMonthTxns } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', sixMonthsAgoStr);

    const monthlyMap = {};
    if (sixMonthTxns) {
      for (const t of sixMonthTxns) {
        const monthKey = t.transaction_date.substring(0, 7); // YYYY-MM
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { month: monthKey, debit: 0, credit: 0 };
        if (t.type === 'debit') monthlyMap[monthKey].debit += Number(t.amount);
        else monthlyMap[monthKey].credit += Number(t.amount);
      }
    }
    const monthlyTrend = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, net: m.credit - m.debit, savings_rate: m.credit > 0 ? ((m.credit - m.debit) / m.credit) * 100 : 0 }));

    res.json({
      period,
      start_date: startDate,
      end_date: endDate,
      // Summary
      total_debit: totalDebit,
      total_credit: totalCredit,
      net: totalCredit - totalDebit,
      transaction_count: txns.length,
      savings_rate: Math.round(savingsRate * 100) / 100,
      avg_debit: Math.round(avgDebit * 100) / 100,
      avg_credit: Math.round(avgCredit * 100) / 100,
      // Comparison
      prev_total_debit: prevTotalDebit,
      prev_total_credit: prevTotalCredit,
      debit_change_pct: prevTotalDebit > 0 ? Math.round(((totalDebit - prevTotalDebit) / prevTotalDebit) * 10000) / 100 : (totalDebit > 0 ? 100 : 0),
      credit_change_pct: prevTotalCredit > 0 ? Math.round(((totalCredit - prevTotalCredit) / prevTotalCredit) * 10000) / 100 : (totalCredit > 0 ? 100 : 0),
      // Breakdowns
      by_category: byCategoryWithChange,
      by_payment_mode: Object.entries(
        debits.reduce((acc, t) => { acc[t.payment_mode] = (acc[t.payment_mode] || 0) + Number(t.amount); return acc; }, {})
      ).map(([mode, amount]) => ({ mode, amount })),
      daily_trend: Object.values(
        txns.reduce((acc, t) => {
          if (!acc[t.transaction_date]) acc[t.transaction_date] = { date: t.transaction_date, debit: 0, credit: 0 };
          if (t.type === 'debit') acc[t.transaction_date].debit += Number(t.amount);
          else acc[t.transaction_date].credit += Number(t.amount);
          return acc;
        }, {})
      ).sort((a, b) => a.date.localeCompare(b.date)),
      // Advanced
      budget_comparison: budgetComparison,
      top_merchants: topMerchants,
      day_of_week: dayOfWeekData,
      monthly_trend: monthlyTrend,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
