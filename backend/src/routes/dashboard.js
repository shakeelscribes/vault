'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

const MODE_LABELS = {
  upi: 'UPI',
  card_pos: 'Debit Card (POS)',
  atm: 'ATM Cash Withdrawal',
  neft: 'NEFT Transfer',
  imps: 'IMPS Transfer',
  rtgs: 'RTGS Transfer',
  cash: 'Cash',
  other: 'Other'
};

function getPeriodDates(period, date, customStart, customEnd) {
  const ref = date ? new Date(date) : new Date();
  let startDate, endDate;

  if (period === 'custom') {
    startDate = customStart || '2020-01-01';
    endDate = customEnd || new Date().toISOString().split('T')[0];
  } else if (period === 'daily') {
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
  } else if (period === 'all') {
    startDate = '2020-01-01';
    endDate = '2035-12-31';
  } else {
    // monthly default
    startDate = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    endDate = lastDay.toISOString().split('T')[0];
  }
  return { startDate, endDate };
}

function getPreviousPeriodDates(period, date, customStart, customEnd) {
  const ref = date ? new Date(date) : new Date();
  let startDate, endDate;

  if (period === 'custom') {
    const s = new Date(customStart || '2020-01-01');
    const e = new Date(customEnd || new Date());
    const diffDays = Math.max(1, Math.round((e - s) / 86400000));
    const prevE = new Date(s.getTime() - 86400000);
    const prevS = new Date(prevE.getTime() - (diffDays - 1) * 86400000);
    startDate = prevS.toISOString().split('T')[0];
    endDate = prevE.toISOString().split('T')[0];
  } else if (period === 'daily') {
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
  } else if (period === 'all') {
    startDate = '2010-01-01';
    endDate = '2019-12-31';
  } else {
    // monthly
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    startDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    endDate = lastDay.toISOString().split('T')[0];
  }
  return { startDate, endDate };
}

function computePaymentModes(txns) {
  const byModeMap = {};
  for (const t of txns) {
    const modeKey = t.payment_mode || 'other';
    if (!byModeMap[modeKey]) {
      byModeMap[modeKey] = {
        mode: modeKey,
        label: MODE_LABELS[modeKey] || modeKey.toUpperCase(),
        debit: 0,
        credit: 0,
        count: 0
      };
    }
    byModeMap[modeKey].count += 1;
    if (t.type === 'debit') byModeMap[modeKey].debit += Number(t.amount);
    if (t.type === 'credit') byModeMap[modeKey].credit += Number(t.amount);
  }
  return Object.values(byModeMap).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit));
}

function generateInsights(debits, credits, totalDebit, totalCredit, byCategory, byPaymentMode) {
  const insights = [];
  const net = totalCredit - totalDebit;
  const savingsRate = totalCredit > 0 ? ((totalCredit - totalDebit) / totalCredit) * 100 : 0;

  // 1. Overall net cash flow insight
  if (totalCredit === 0 && totalDebit === 0) {
    insights.push({ icon: '💬', title: 'No Activity', text: 'No recorded transactions in this period yet. Send SMS or add manual entries to start seeing insights!' });
    return insights;
  }

  if (totalCredit > totalDebit && totalCredit > 0) {
    insights.push({
      icon: '💰',
      title: 'Positive Cash Flow',
      text: `You saved ₹${net.toLocaleString('en-IN')} (${savingsRate.toFixed(1)}% savings rate) during this period! Keep up the great financial discipline.`
    });
  } else if (totalDebit > totalCredit && totalCredit > 0) {
    insights.push({
      icon: '⚠️',
      title: 'Expenditure Exceeded Income',
      text: `Your debits exceeded your incoming credits by ₹${Math.abs(net).toLocaleString('en-IN')} in this timeframe.`
    });
  } else if (totalCredit === 0 && totalDebit > 0) {
    insights.push({
      icon: '📉',
      title: 'Expense Tracker Active',
      text: `You tracked ₹${totalDebit.toLocaleString('en-IN')} across ${debits.length} debit transactions.`
    });
  }

  // 2. Payment Medium Insight (Credited & Debited breakdown)
  const topDebitMode = byPaymentMode.slice().sort((a, b) => b.debit - a.debit)[0];
  const topCreditMode = byPaymentMode.slice().sort((a, b) => b.credit - a.credit)[0];
  if (topDebitMode && topDebitMode.debit > 0) {
    const share = Math.round((topDebitMode.debit / (totalDebit || 1)) * 100);
    insights.push({
      icon: '💳',
      title: 'Primary Spending Medium',
      text: `Most of your outgoing expenditures were via ${topDebitMode.label} totaling ₹${topDebitMode.debit.toLocaleString('en-IN')} (${share}% of total debits across ${topDebitMode.count} txns).`
    });
  }
  if (topCreditMode && topCreditMode.credit > 0) {
    insights.push({
      icon: '📥',
      title: 'Primary Income Medium',
      text: `You received ₹${topCreditMode.credit.toLocaleString('en-IN')} credited directly via ${topCreditMode.label}.`
    });
  }

  // 3. Category Dominance Insight
  if (byCategory.length > 0 && byCategory[0].amount > 0) {
    const topCat = byCategory[0];
    const share = Math.round((topCat.amount / (totalDebit || 1)) * 100);
    insights.push({
      icon: topCat.emoji || '🔥',
      title: 'Top Expenditure Category',
      text: `${topCat.name} was your highest spending category at ₹${topCat.amount.toLocaleString('en-IN')}, representing ${share}% of total spending.`
    });
  }

  // 4. Average Transaction Size
  if (debits.length > 0) {
    const avg = Math.round(totalDebit / debits.length);
    insights.push({
      icon: '📊',
      title: 'Average Expense',
      text: `On average, you spend ₹${avg.toLocaleString('en-IN')} per debit transaction.`
    });
  }

  return insights;
}

// ── GET /api/dashboard/summary ────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const period = req.query.period || 'weekly';
    const { startDate, endDate } = getPeriodDates(period, req.query.date, req.query.start_date, req.query.end_date);

    const { data: txns, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', startDate + 'T00:00:00.000Z')
      .lte('transaction_date', endDate + 'T23:59:59.999Z');

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

    // By payment mode (now separating debit and credit)
    const byPaymentMode = computePaymentModes(txns);

    // Daily trend
    const trendMap = {};
    for (const t of txns) {
      const dayKey = t.transaction_date.split('T')[0];
      if (!trendMap[dayKey]) trendMap[dayKey] = { date: dayKey, debit: 0, credit: 0 };
      if (t.type === 'debit') trendMap[dayKey].debit += Number(t.amount);
      else trendMap[dayKey].credit += Number(t.amount);
    }
    const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const topCategory = byCategory[0] || null;
    const biggest = debits.reduce((max, t) => Number(t.amount) > Number(max?.amount || 0) ? t : max, null);
    const insights = generateInsights(debits, credits, totalDebit, totalCredit, byCategory, byPaymentMode);

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
      insights,
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
    const { startDate, endDate } = getPeriodDates(period, req.query.date, req.query.start_date, req.query.end_date);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriodDates(period, req.query.date, req.query.start_date, req.query.end_date);

    // Current period transactions
    const { data: txns, error: txnError } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', startDate + 'T00:00:00.000Z')
      .lte('transaction_date', endDate + 'T23:59:59.999Z');

    if (txnError) throw txnError;

    // Previous period transactions for comparison
    const { data: prevTxns, error: prevError } = await supabaseAdmin
      .from('transactions')
      .select('amount, type, payment_mode, merchant, category_id, transaction_date, categories(name,emoji,color)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('transaction_date', prevStartDate + 'T00:00:00.000Z')
      .lte('transaction_date', prevEndDate + 'T23:59:59.999Z');

    if (prevError) throw prevError;

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

    // Category breakdown (previous) for MoM comparison
    const prevByCategoryMap = {};
    for (const t of prevDebits) {
      const key = t.category_id || 'uncategorised';
      if (!prevByCategoryMap[key]) {
        prevByCategoryMap[key] = { category_id: key, name: t.categories?.name || 'Other', amount: 0 };
      }
      prevByCategoryMap[key].amount += Number(t.amount);
    }

    const byCategoryWithChange = byCategory.map(cat => {
      const prev = prevByCategoryMap[cat.category_id];
      const prevAmount = prev?.amount || 0;
      const change = prevAmount > 0 ? ((cat.amount - prevAmount) / prevAmount) * 100 : (cat.amount > 0 ? 100 : 0);
      return { ...cat, prev_amount: prevAmount, change_pct: Math.round(change * 100) / 100 };
    });

    // Payment modes separating debit and credit
    const byPaymentMode = computePaymentModes(txns);

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

    const avgDebit = debits.length > 0 ? totalDebit / debits.length : 0;
    const avgCredit = credits.length > 0 ? totalCredit / credits.length : 0;
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

    const insights = generateInsights(debits, credits, totalDebit, totalCredit, byCategory, byPaymentMode);

    res.json({
      period,
      start_date: startDate,
      end_date: endDate,
      total_debit: totalDebit,
      total_credit: totalCredit,
      net: totalCredit - totalDebit,
      transaction_count: txns.length,
      savings_rate: Math.round(savingsRate * 100) / 100,
      avg_debit: Math.round(avgDebit * 100) / 100,
      avg_credit: Math.round(avgCredit * 100) / 100,
      prev_total_debit: prevTotalDebit,
      prev_total_credit: prevTotalCredit,
      debit_change_pct: prevTotalDebit > 0 ? Math.round(((totalDebit - prevTotalDebit) / prevTotalDebit) * 10000) / 100 : (totalDebit > 0 ? 100 : 0),
      credit_change_pct: prevTotalCredit > 0 ? Math.round(((totalCredit - prevTotalCredit) / prevTotalCredit) * 10000) / 100 : (totalCredit > 0 ? 100 : 0),
      by_category: byCategoryWithChange,
      by_payment_mode: byPaymentMode,
      daily_trend: Object.values(
        txns.reduce((acc, t) => {
          const dayKey = t.transaction_date.split('T')[0];
          if (!acc[dayKey]) acc[dayKey] = { date: dayKey, debit: 0, credit: 0 };
          if (t.type === 'debit') acc[dayKey].debit += Number(t.amount);
          else acc[dayKey].credit += Number(t.amount);
          return acc;
        }, {})
      ).sort((a, b) => a.date.localeCompare(b.date)),
      top_merchants: topMerchants,
      day_of_week: dayOfWeekData,
      monthly_trend: monthlyTrend,
      insights,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
