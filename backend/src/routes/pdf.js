'use strict';
const { Router } = require('express');
const multer = require('multer');
const { supabaseAdmin } = require('../db/supabase');
const authMiddleware = require('../middleware/auth');
const { extractPDFText, splitIntoRows } = require('../services/pdfParser');
const { parsePDFRow } = require('../services/groqParser');
const { checkDuplicate } = require('../services/deduplication');
const { resolveCategory } = require('../services/categoryEngine');
const { GROQ_CONFIDENCE_THRESHOLD } = require('../utils/constants');
const logger = require('../utils/logger');

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  },
});

// ── POST /api/pdf/upload ──────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res, next) => {
  const userId = req.user.userId;
  let importRecord = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Create import record
    const { data: imp } = await supabaseAdmin
      .from('statement_imports')
      .insert({
        user_id: userId,
        filename: req.file.originalname,
        file_size_bytes: req.file.size,
        status: 'processing',
      })
      .select()
      .single();

    importRecord = imp;

    // Extract text
    const password = req.body.password || null;
    const text = await extractPDFText(req.file.buffer, password);

    // Split into rows
    const rows = splitIntoRows(text);

    let importedCount = 0;
    let duplicateCount = 0;
    let flaggedCount = 0;

    for (const row of rows) {
      try {
        const parsed = await parsePDFRow(row);
        if (parsed.error || !parsed.amount || !parsed.type) continue;

        const { isDuplicate } = await checkDuplicate(userId, {
          amount: parsed.amount,
          transaction_date: parsed.transaction_date,
          merchant: parsed.merchant,
          type: parsed.type,
        });

        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        const categoryId = await resolveCategory(userId, parsed.merchant, parsed.category);
        const isFlagged = parsed.confidence < GROQ_CONFIDENCE_THRESHOLD;

        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          amount: parsed.amount,
          type: parsed.type,
          payment_mode: parsed.payment_mode || 'other',
          merchant: parsed.merchant,
          category_id: categoryId,
          upi_ref: parsed.upi_ref,
          balance_after: parsed.balance_after,
          source: 'pdf',
          transaction_date: parsed.transaction_date,
          is_flagged: isFlagged,
          flag_reason: isFlagged ? `Low confidence: ${parsed.confidence}` : null,
          groq_confidence: parsed.confidence,
        });

        importedCount++;
        if (isFlagged) flaggedCount++;
      } catch (rowErr) {
        logger.warn('Skipped PDF row', { row: row.substring(0, 50), error: rowErr.message });
      }
    }

    // Update import record
    await supabaseAdmin
      .from('statement_imports')
      .update({
        status: 'completed',
        total_rows: rows.length,
        imported_count: importedCount,
        duplicate_count: duplicateCount,
      })
      .eq('id', importRecord.id);

    res.json({
      status: 'completed',
      import_id: importRecord.id,
      total_rows: rows.length,
      imported: importedCount,
      duplicates: duplicateCount,
      flagged: flaggedCount,
    });
  } catch (err) {
    if (importRecord) {
      await supabaseAdmin
        .from('statement_imports')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', importRecord.id);
    }
    next(err);
  }
});

// ── GET /api/pdf/history ──────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('statement_imports')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('imported_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
