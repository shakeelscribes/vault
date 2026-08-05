'use strict';
const { supabaseAdmin } = require('../db/supabase');
const logger = require('../utils/logger');
const { DEFAULT_CATEGORIES } = require('../utils/constants');

/**
 * Resolves the category_id for a transaction.
 * Priority: 0) Hardcoded precision rules (e.g. RSA SHANK -> Petrol), 1) merchant_mappings, 2) Groq suggestion, 3) "Other"
 *
 * @param {string} userId
 * @param {string|null} merchant
 * @param {string|null} groqCategoryName
 * @returns {Promise<string|null>} category_id UUID or null
 */
async function resolveCategory(userId, merchant, groqCategoryName) {
  let targetCatName = groqCategoryName;

  // 0. Hardcoded precision overrides (e.g. RSA SHANK / Fuel / Petrol stations)
  if (merchant) {
    const mUpper = merchant.toUpperCase();
    if (
      mUpper.includes('RSA SHANK') ||
      mUpper.includes('SHANK') ||
      mUpper.includes('PETROL') ||
      mUpper.includes('FUEL') ||
      mUpper.includes('HPCL') ||
      mUpper.includes('BPCL') ||
      mUpper.includes('IOCL') ||
      mUpper.includes('SHELL') ||
      mUpper.includes('INDIAN OIL')
    ) {
      targetCatName = 'Petrol';
      logger.info('Merchant matched Petrol keywords rule', { merchant });
    }
  }

  // 1. Merchant Memory lookup (only if not overridden by Petrol rule)
  if (merchant && targetCatName !== 'Petrol') {
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

  // Normalize shorthand Groq category names
  if (targetCatName) {
    const n = targetCatName.toLowerCase();
    if (n === 'food') targetCatName = 'Food & Dining';
    if (n === 'bills') targetCatName = 'Bills & Utilities';
    if (n === 'cash' || n === 'atm' || n === 'atm wdl') targetCatName = 'Cash Withdrawal';
    if (n === 'transfer' || n === 'salary') targetCatName = 'Transfer';
  }

  // 2. Groq AI suggestion / Override target
  if (targetCatName) {
    let { data: category } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', targetCatName)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (category?.id) return category.id;

    // If target category is a default category (like Petrol) but not in DB yet, auto-create it!
    const defCat = DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === targetCatName.toLowerCase());
    if (defCat) {
      const { data: created } = await supabaseAdmin
        .from('categories')
        .insert({ name: defCat.name, emoji: defCat.emoji, color: defCat.color, user_id: userId, is_default: true, is_active: true })
        .select('id')
        .maybeSingle();
      if (created?.id) {
        logger.info('Auto-seeded missing category during resolve', { name: defCat.name, category_id: created.id });
        return created.id;
      }
    }
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
