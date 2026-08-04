'use strict';
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

/**
 * Extracts raw text from a Canara Bank PDF statement buffer.
 * Handles optional password for password-protected PDFs.
 */
async function extractPDFText(buffer, password = null) {
  const options = {};
  if (password) options.password = password;

  try {
    const data = await pdfParse(buffer, options);
    return data.text;
  } catch (err) {
    if (err.message?.includes('password')) {
      throw Object.assign(new Error('PDF is password-protected. Please provide the password.'), { status: 400 });
    }
    throw err;
  }
}

/**
 * Splits raw PDF text into individual transaction rows.
 * Canara Bank statements list one transaction per line with date prefix.
 * Returns array of raw row strings for Groq parsing.
 */
function splitIntoRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);

  // Canara Bank rows typically start with a date pattern: DD/MM/YYYY or DD-MM-YYYY
  const datePattern = /^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;

  const rows = [];
  let currentRow = null;

  for (const line of lines) {
    if (datePattern.test(line)) {
      if (currentRow) rows.push(currentRow);
      currentRow = line;
    } else if (currentRow && line.length > 0) {
      currentRow += ' ' + line;
    }
  }
  if (currentRow) rows.push(currentRow);

  logger.info(`PDF split into ${rows.length} rows`);
  return rows;
}

/**
 * Fast local deterministic parser for standardized Canara Bank statement rows.
 * Parses dates, amounts, balances, UPI refs, merchant names, and categories in milliseconds.
 * Bypasses cloud LLM rate limits completely for known table formats.
 */
function parseCanaraRow(rowText) {
  try {
    const text = rowText.trim();
    // 1. Extract Date at start
    const dateMatch = text.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/);
    if (!dateMatch) return null;
    const day = dateMatch[1];
    const month = dateMatch[2];
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;
    const transaction_date = `${year}-${month}-${day}T00:00:00Z`;

    // 2. Extract Amount and Balance at end
    const amountMatch = text.match(/([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)$/);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    const balance_after = parseFloat(amountMatch[2].replace(/,/g, ''));
    if (isNaN(amount) || isNaN(balance_after)) return null;

    // 3. Extract middle narration
    let narration = text.slice(dateMatch[0].length, -amountMatch[0].length).trim();

    // 4. Determine Type & Mode
    let type = 'debit';
    if (narration.includes('UPI/CR/') || narration.includes('NEFT CR') || narration.includes('/CR/') || narration.includes('DEPOSIT') || narration.includes('BY ')) {
      type = 'credit';
    }

    let payment_mode = 'other';
    if (narration.includes('UPI/')) payment_mode = 'upi';
    else if (narration.includes('NEFT')) payment_mode = 'neft';
    else if (narration.includes('IMPS')) payment_mode = 'imps';
    else if (narration.includes('ATM/')) payment_mode = 'atm';
    else if (narration.includes('PAY*') || narration.includes('POS') || narration.includes('CARD')) payment_mode = 'card_pos';

    // 5. Extract UPI Reference number if any
    let upi_ref = null;
    const upiRefMatch = narration.match(/UPI\/(?:DR|CR)\/(\d{10,14})/i);
    if (upiRefMatch) {
      upi_ref = upiRefMatch[1];
    } else {
      const chqMatch = narration.match(/Chq:\s*(\d+)/i);
      if (chqMatch && chqMatch[1] !== '0') upi_ref = chqMatch[1];
    }

    // 6. Extract clean Merchant name
    let merchant = 'Unknown Merchant';
    const upiMerchantMatch = narration.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//i);
    if (upiMerchantMatch && upiMerchantMatch[1]) {
      merchant = upiMerchantMatch[1].trim().replace(/\s+/g, ' ');
    } else if (narration.includes('PAY*')) {
      const payMatch = narration.match(/PAY\*([^\/\-\s]+)/i);
      if (payMatch && payMatch[1]) merchant = payMatch[1].trim();
      else merchant = 'Card Purchase';
    } else if (narration.includes('NEFT CR')) {
      const neftMatch = narration.match(/NEFT CR-[^\s]+-[^\s]+-([^\s].*?)(?:\s*Chq:|$)/i);
      if (neftMatch && neftMatch[1]) merchant = neftMatch[1].trim();
      else merchant = 'NEFT Transfer';
    } else {
      let clean = narration.replace(/Chq:\s*\d+/ig, '').replace(/VIA\/\/SMY\S+/ig, '').replace(/\d{2}\/\d{2}\/\d{2,4}\s*\d{2}:\d{2}:\d{2}/g, '').trim();
      merchant = clean.substring(0, 30).trim() || 'Bank Transaction';
    }

    // 7. Determine Category via keyword match
    const lower = (merchant + ' ' + narration).toLowerCase();
    let category = 'Other';
    if (/zomato|swiggy|restaurant|hotel|cafe|food|pizza|burger|dining|bakery/i.test(lower)) category = 'Food';
    else if (/bigtree|bookmyshow|cinema|multiplex|theatre|movie|netflix|spotify|prime|pss/i.test(lower)) category = 'Entertainment';
    else if (/jio|airtel|vi\b|bsnl|fiber|wifi|broadband|recharge|bill|electricity|water|gas/i.test(lower)) category = 'Bills';
    else if (/amazon|flipkart|myntra|ajio|store|mall|supermarket|mart|retail|zara/i.test(lower)) category = 'Shopping';
    else if (/uber|ola|rapido|petrol|fuel|hpcl|bpcl|indocl|toll|fastag|metro|railway|irctc/i.test(lower)) category = 'Transport';
    else if (/hospital|pharmacy|clinic|medical|doctor|medplus|apollo|health/i.test(lower)) category = 'Health';
    else if (/school|college|tuition|books|course|exam/i.test(lower)) category = 'Education';
    else if (type === 'credit') category = 'Income';
    else if (payment_mode === 'upi') category = 'Transfer';

    return {
      type,
      amount,
      merchant,
      category,
      payment_mode,
      upi_ref,
      balance_after,
      transaction_date,
      confidence: 1.0,
    };
  } catch (err) {
    logger.warn('Local PDF parse failed for row, will fall back to Groq:', { error: err.message });
    return null;
  }
}

module.exports = { extractPDFText, splitIntoRows, parseCanaraRow };
