'use strict';
const Groq = require('groq-sdk');
const config = require('../config/env');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: config.groq.apiKey });

const ACTIVE_GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── System Prompt ─────────────────────────────────────────────────────
const SMS_SYSTEM_PROMPT = `You are a banking SMS parser for Canara Bank (India).
Extract transaction details from the SMS and return ONLY valid JSON. No explanation, no markdown.

Rules:
- "Dr." or "debited" = debit. "Cr." or "credited" = credit.
- If "UPI" appears in the SMS → payment_mode = "upi"
- If "NEFT" appears → payment_mode = "neft"
- If "IMPS" appears → payment_mode = "imps"
- If "RTGS" appears → payment_mode = "rtgs"
- If "POS" or "linked to card" appears → payment_mode = "card_pos"
- If "ATM" or "withdrawn" appears → payment_mode = "atm"
- Otherwise → payment_mode = "other"
- Extract the UPI reference number if present (digits after "UPI:" or "UPI/")
- Amounts are in INR. Remove commas. Parse as decimal number.
- Dates may be DD/MM/YY or DD/MM/YYYY format. Return as YYYY-MM-DD.
- Auto-categorise based on merchant:
  Zomato/Swiggy/Blinkit/Zepto → "Food & Dining"
  Amazon/Flipkart/Myntra/Meesho → "Shopping"
  Uber/Ola/Rapido/Bus/Auto → "Transport"
  Netflix/Spotify/Prime/Hotstar → "Entertainment"
  Hospital/Pharmacy/Medical → "Health"
  School/College/Course/Udemy → "Education"
  ATM WDL → "Cash Withdrawal"
  NEFT/IMPS/Transfer/Salary → "Transfer"
  Airtel/Jio/EB/Electricity/Water → "Bills & Utilities"
  Others → "Other"
- confidence: your confidence in the accuracy of parsing (0.0 to 1.0)

Return this exact JSON structure (no other text):
{
  "amount": <number>,
  "type": "<debit|credit>",
  "payment_mode": "<upi|card_pos|atm|neft|imps|rtgs|other>",
  "merchant": "<string or null>",
  "upi_ref": "<string or null>",
  "balance_after": <number or null>,
  "transaction_date": "<YYYY-MM-DD>",
  "category": "<string>",
  "confidence": <number>
}

If you cannot parse the SMS, return:
{ "error": "unparseable", "reason": "<brief reason>", "confidence": 0.0 }`;

const PDF_ROW_SYSTEM_PROMPT = `You are parsing a single transaction row from a Canara Bank PDF bank statement.
The row may contain: Date, Description/Narration, Debit amount, Credit amount, Balance.
Extract and return the same JSON format as the SMS parser.
If Debit column has a value → type = "debit". If Credit column has a value → type = "credit".
Return ONLY valid JSON, no explanation.`;

// ── Retry Helper ──────────────────────────────────────────────────────
async function withRetry(fn, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn(`Groq retry ${attempt}/${retries} after ${delay}ms`, { error: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Parse SMS ─────────────────────────────────────────────────────────
async function parseSMS(rawSms) {
  return withRetry(async () => {
    const modelToUse = (config.groq.model && !config.groq.model.includes('3.1'))
      ? config.groq.model
      : ACTIVE_GROQ_MODEL;

    const completion = await groq.chat.completions.create({
      model: modelToUse,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: 'system', content: SMS_SYSTEM_PROMPT },
        { role: 'user', content: rawSms },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Groq returned empty response');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error('Groq returned non-JSON', { raw });
      return { error: 'unparseable', reason: 'non-JSON response', confidence: 0.0 };
    }

    logger.info('SMS parsed', {
      amount: parsed.amount,
      type: parsed.type,
      merchant: parsed.merchant,
      confidence: parsed.confidence,
    });

    return parsed;
  });
}

// ── Parse PDF Row ─────────────────────────────────────────────────────
async function parsePDFRow(rowText) {
  return withRetry(async () => {
    const modelToUse = (config.groq.model && !config.groq.model.includes('3.1'))
      ? config.groq.model
      : ACTIVE_GROQ_MODEL;

    const completion = await groq.chat.completions.create({
      model: modelToUse,
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: 'system', content: PDF_ROW_SYSTEM_PROMPT },
        { role: 'user', content: rowText },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Groq returned empty response');

    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'unparseable', reason: 'non-JSON response', confidence: 0.0 };
    }
  });
}

module.exports = { parseSMS, parsePDFRow };
