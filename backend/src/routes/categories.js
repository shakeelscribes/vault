'use strict';
const { Router } = require('express');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { validate, categorySchema, bulkRemapSchema } = require('../utils/validators');
const { bulkRemap, upsertMerchantMapping } = require('../services/categoryEngine');

const router = Router();
router.use(authMiddleware);

// ── GET /api/categories ───────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', req.user.userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/categories ──────────────────────────────────────────────
router.post('/', validate(categorySchema), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ ...req.body, user_id: req.user.userId, is_default: false })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/categories/:id ─────────────────────────────────────────
router.patch('/:id', validate(categorySchema.partial()), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/categories/:id ────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId)
      .eq('is_default', false) // Cannot delete default categories
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found or is a system default' });
    res.json({ status: 'deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/categories/bulk-remap ──────────────────────────────────
router.post('/bulk-remap', validate(bulkRemapSchema), async (req, res, next) => {
  try {
    const { merchant_pattern, new_category_id, apply_retroactively } = req.body;
    const userId = req.user.userId;

    await upsertMerchantMapping(userId, merchant_pattern, new_category_id);

    if (apply_retroactively) {
      await bulkRemap(userId, merchant_pattern, new_category_id);
    }

    res.json({ status: 'ok', applied_retroactively: apply_retroactively });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
