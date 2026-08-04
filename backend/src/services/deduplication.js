'use strict';
const { supabaseAdmin } = require('../db/supabase');

/**
 * Checks if a transaction from a PDF already exists in the database.
 * Match criteria (ALL must match):
 *   - user_id
 *   - amount (exact)
 *   - transaction_date (exact)
 *   - merchant (fuzzy, case-insensitive)
 *   - type (debit/credit)
 *
 * @returns {{ isDuplicate: boolean, existingId: string|null }}
 */
async function checkDuplicate(userId, { amount, transaction_date, merchant, type }) {
  let query = supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('amount', amount)
    .eq('transaction_date', transaction_date)
    .eq('type', type)
    .eq('is_deleted', false);

  // Fuzzy merchant match
  if (merchant) {
    query = query.ilike('merchant', `%${merchant.substring(0, 10)}%`);
  }

  const { data } = await query.limit(1).maybeSingle();

  return {
    isDuplicate: !!data,
    existingId: data?.id ?? null,
  };
}

module.exports = { checkDuplicate };
