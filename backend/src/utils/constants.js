'use strict';

// Payment modes allowed by DB enum
const PAYMENT_MODES = ['upi', 'card_pos', 'atm', 'neft', 'imps', 'rtgs', 'cash', 'other'];

// Transaction types
const TRANSACTION_TYPES = ['debit', 'credit'];

// Capture sources
const SOURCES = ['sms', 'pdf', 'manual'];

// Budget periods
const BUDGET_PERIODS = ['daily', 'weekly', 'monthly'];

// Default categories (mirroring the DB seed trigger)
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining',    emoji: '🍕', color: '#F97316' },
  { name: 'Transport',         emoji: '🚗', color: '#3B82F6' },
  { name: 'Petrol',            emoji: '⛽', color: '#EF4444' },
  { name: 'Shopping',          emoji: '🛍️', color: '#8B5CF6' },
  { name: 'Bills & Utilities', emoji: '💡', color: '#F59E0B' },
  { name: 'Entertainment',     emoji: '🎬', color: '#EC4899' },
  { name: 'Health',            emoji: '💊', color: '#10B981' },
  { name: 'Education',         emoji: '📚', color: '#6366F1' },
  { name: 'Cash Withdrawal',   emoji: '🏧', color: '#6B7280' },
  { name: 'Transfer',          emoji: '🏦', color: '#14B8A6' },
  { name: 'Other',             emoji: '📦', color: '#9CA3AF' },
];

// Keywords that indicate a Canara Bank transactional SMS
const CANARA_KEYWORDS = ['canara', 'canbnk'];

// Keywords that confirm a banking transaction
const BANKING_KEYWORDS = ['inr', 'dr.', 'cr.', 'debited', 'credited', 'bal'];

// Keywords that indicate OTP — must be discarded
const OTP_KEYWORDS = ['otp', 'one-time password', 'one time password'];

// Groq confidence threshold — below this value, flag for manual review
const GROQ_CONFIDENCE_THRESHOLD = 0.7;

// Quick Presets for manual entry
const QUICK_PRESETS = [
  { label: '☕ Chai',    amount: 10,  category: 'Food & Dining', payment_mode: 'cash' },
  { label: '🍵 Tea',     amount: 15,  category: 'Food & Dining', payment_mode: 'cash' },
  { label: '🚌 Bus',     amount: 20,  category: 'Transport',     payment_mode: 'cash' },
  { label: '🥤 Drink',   amount: 30,  category: 'Food & Dining', payment_mode: 'cash' },
  { label: '⛽ Petrol',  amount: 100, category: 'Petrol',        payment_mode: 'cash' },
];

module.exports = {
  PAYMENT_MODES,
  TRANSACTION_TYPES,
  SOURCES,
  BUDGET_PERIODS,
  DEFAULT_CATEGORIES,
  CANARA_KEYWORDS,
  BANKING_KEYWORDS,
  OTP_KEYWORDS,
  GROQ_CONFIDENCE_THRESHOLD,
  QUICK_PRESETS,
};
