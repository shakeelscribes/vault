'use strict';
const { z } = require('zod');
const { PAYMENT_MODES, TRANSACTION_TYPES, BUDGET_PERIODS } = require('./constants');

// ── SMS Ingestion ─────────────────────────────────────────────────────
const smsSchema = z.object({
  raw_sms: z.string().min(10).max(1000),
  timestamp: z.string().datetime({ offset: true }).optional(),
});

// ── Manual Transaction Entry ─────────────────────────────────────────
const manualTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(TRANSACTION_TYPES),
  payment_mode: z.enum(PAYMENT_MODES),
  merchant: z.string().max(255).optional(),
  category_id: z.string().uuid().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
});

// ── Transaction Update ────────────────────────────────────────────────
const updateTransactionSchema = z.object({
  category_id: z.string().uuid().optional(),
  merchant: z.string().max(255).optional(),
  note: z.string().max(500).optional(),
  is_flagged: z.boolean().optional(),
  payment_mode: z.enum(PAYMENT_MODES).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  amount: z.number().positive().optional(),
  transaction_date: z.string().optional(),
}).strict();

// ── Category ──────────────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// ── Budget ────────────────────────────────────────────────────────────
const budgetSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  period: z.enum(BUDGET_PERIODS),
  amount: z.number().positive(),
});

// ── Auth ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(100).optional(),
});

// ── Bulk Remap ────────────────────────────────────────────────────────
const bulkRemapSchema = z.object({
  merchant_pattern: z.string().min(1).max(255),
  new_category_id: z.string().uuid(),
  apply_retroactively: z.boolean().default(false),
});

// ── Middleware helper ─────────────────────────────────────────────────
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        details: result.error.errors,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  smsSchema,
  manualTransactionSchema,
  updateTransactionSchema,
  categorySchema,
  budgetSchema,
  loginSchema,
  registerSchema,
  bulkRemapSchema,
  validate,
};
