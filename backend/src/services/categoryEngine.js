'use strict';
const { supabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');

/**
 * Resolves the category_id for a transaction.
 * Priority: 1) merchant_mappings (user's own overrides), 2) Groq suggestion, 3) "Other"
 *
 * @param {string} userId
 * @param {string|null} merchant
 * @param {string|null} groqCategoryName
 * @returns {Promise<string|null>} category_id UUID or null
 */
async function resolveCategory(userId, merchant, groqCategoryName) {
  // 1. Merchant Memory lookup
  if (merchant) {
    const { data: mapping } = await supabaseAdmin
      .from('merchant_mappings')
      .select('category_id')
      .eq('user_id', userId)
      .ilike('merchant_pattern', `%${merchant}%`)
      .limit(1)
      .maybeSingle();

    if (mapping?.category_id) {
      logger.info('Category resolved from merchant memory', { merchant, category_id: mapping.category_id });
      return mapping.category_id;
    }
  }

  // 2. Groq AI suggestion
  if (groqCategoryName) {
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', groqCategoryName)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (category?.id) return category.id;
  }

  // 3. Default: "Other"
  const { data: other } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Other')
    .limit(1)
    .maybeSingle();

  return other?.id ?? null;
}

/**
 * Creates or updates a merchant → category mapping (merchant memory).
 */
async function upsertMerchantMapping(userId, merchant, categoryId) {
  if (!merchant || !categoryId) return;

  const { error } = await supabaseAdmin.from('merchant_mappings').upsert(
    { user_id: userId, merchant_pattern: merchant, category_id: categoryId },
    { onConflict: 'user_id,merchant_pattern' }
  );

  if (error) logger.warn('Failed to upsert merchant mapping', { error: error.message });
}

/**
 * Retroactively applies a merchant → category mapping to all existing transactions.
 */
async function bulkRemap(userId, merchantPattern, newCategoryId) {
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({ category_id: newCategoryId })
    .eq('user_id', userId)
    .ilike('merchant', `%${merchantPattern}%`)
    .eq('is_deleted', false);

  if (error) throw error;
}

module.exports = { resolveCategory, upsertMerchantMapping, bulkRemap };
