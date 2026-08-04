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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const datePattern = /^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;

  const rows = [];
  let openingBalance = null;
  let currentRow = null;

  const ignorePatterns = [
    /^page\s*\d+/i,
    /^date\s*particulars/i,
    /^customer\s+id/i,
    /^branch\s+(?:code|name)/i,
    /^ifsc\s+code/i,
    /^statement\s+for\s+a\/c/i,
    /^disclaimer/i,
    /^unless\s+the\s+constituent/i,
    /^beware\s+of\s+phishing/i,
    /^imb\s+users/i,
    /^do\s+not\s+share/i,
    /^computer\s+output/i,
    /^end\s+of\s+statement/i,
    /^closing\s+balance/i,
    /^brought\s+forward/i,
    /^carried\s+forward/i,
  ];

  for (const line of lines) {
    // Detect Opening Balance - handles both "Opening Balance 490.79" AND "Opening Balance490.79" (no space)
    const opMatch = line.match(/(?:opening\s*balance|brought\s*forward)\s*(\d[\d,]*\.\d{1,2})/i);
    if (opMatch) {
      openingBalance = parseFloat(opMatch[1].replace(/,/g, ''));
    }

    // Completely filter out headers, footers, page numbering, opening/closing balances from transaction rows
    if (ignorePatterns.some(p => p.test(line))) {
      continue;
    }
    // Also filter opening balance line (may not have a space)
    if (/^opening\s*balance/i.test(line)) {
      continue;
    }
    if (/www\.canarabank\.com|please\s*beware|change\s+in\s+the\s+address/i.test(line)) {
      continue;
    }

    if (datePattern.test(line)) {
      if (currentRow) rows.push(currentRow);
      currentRow = line;
    } else if (currentRow) {
      currentRow += ' ' + line;
    }
  }
  if (currentRow) rows.push(currentRow);

  // Post-process each row:
  // 1. Strip repeated page headers that got merged into row text (e.g. "DateParticularsDepositsWithdrawalsBalance")
  // 2. Split concatenated amount+balance numbers (e.g. "580.001,033.97" → "580.00 1,033.97", "35.00998.97" → "35.00 998.97")
  for (let i = 0; i < rows.length; i++) {
    // Remove inline page headers
    rows[i] = rows[i].replace(/DateParticulars\S*/gi, '').trim();
    
    // KEY FIX: pdf-parse extracts Canara Bank PDF table columns without spaces between them.
    // The Deposits, Withdrawals, and Balance columns get concatenated like:
    //   "580.001,033.97"  (amount=580.00, balance=1,033.97)
    //   "35.00998.97"     (amount=35.00, balance=998.97)
    //   "706.82583.97"    (amount=706.82, balance=583.97)
    // We need to insert a space AFTER the first decimal number ends and BEFORE the next one starts.
    // Pattern: a decimal number ending (digit after ".XX") followed immediately by another digit
    rows[i] = rows[i].replace(/(\.\d{2})(\d)/g, '$1 $2');
  }

  rows.openingBalance = openingBalance;
  logger.info(`PDF split into ${rows.length} clean transaction rows. Opening balance seeded: ${openingBalance}`);
  return rows;
}

/**
 * Fast local deterministic parser with Mathematical Ledger Balance Verification.
 * Eliminates balance/amount confusion and mathematically distinguishes Deposits vs Withdrawals.
 */
function parseCanaraRow(rowText, prevBalance = null) {
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

    // 2. Extract monetary figures (only match numbers with decimals — these are currency values)
    const matches = [...text.matchAll(/(\d+(?:,\d+)*\.\d{2})\b/g)];
    if (!matches || matches.length === 0) {
      logger.warn('Local parser could not find monetary decimal figures in row:', text.substring(0, 60));
      return null;
    }

    // Filter out any monetary matches that appear inside the narration timestamp (e.g. date portions)
    // Real amounts and balances are always the LAST two decimal numbers in the row
    let amountIndex = 0;
    let amount = 0;
    let balance_after = null;
    let type = 'debit';
    let foundMathMatch = false;

    // TIER 1: Mathematical Ledger Continuity (Previous Balance ± Amount = New Balance)
    if (prevBalance !== null && prevBalance !== undefined && !isNaN(prevBalance) && matches.length >= 2) {
      for (let idx = matches.length - 2; idx >= 0; idx--) {
        const c1 = parseFloat(matches[idx][1].replace(/,/g, ''));
        const c2 = parseFloat(matches[idx + 1][1].replace(/,/g, ''));
        
        if (Math.abs((prevBalance + c1) - c2) <= 0.05) {
          amount = c1;
          balance_after = c2;
          type = 'credit'; // Verified Deposit
          amountIndex = matches[idx].index;
          foundMathMatch = true;
          break;
        } else if (Math.abs((prevBalance - c1) - c2) <= 0.05) {
          amount = c1;
          balance_after = c2;
          type = 'debit'; // Verified Withdrawal
          amountIndex = matches[idx].index;
          foundMathMatch = true;
          break;
        }
      }
    }

    // TIER 2: Column Position & Comprehensive Keyword Fallback (for rows without prior running balance)
    if (!foundMathMatch) {
      if (matches.length >= 2) {
        const amountMatch = matches[matches.length - 2];
        const balanceMatch = matches[matches.length - 1];
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        balance_after = parseFloat(balanceMatch[1].replace(/,/g, ''));
        amountIndex = amountMatch.index;
      } else {
        const amountMatch = matches[0];
        amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        amountIndex = amountMatch.index;
      }

      const narrationCandidate = text.slice(0, amountIndex).toUpperCase();
      if (
        narrationCandidate.includes('UPI/CR/') ||
        narrationCandidate.includes('NEFT CR') ||
        narrationCandidate.includes('/CR/') ||
        /\bCR\b/.test(narrationCandidate) ||
        narrationCandidate.includes('DEPOSIT') ||
        narrationCandidate.includes('BY ') ||
        narrationCandidate.includes('INTEREST') ||
        narrationCandidate.includes('DIVIDEND')
      ) {
        type = 'credit';
      } else {
        type = 'debit';
      }
    }

    if (isNaN(amount) || amount === 0) return null;

    // 3. Extract middle narration between Date and Amount
    let narration = text.slice(dateMatch[0].length, amountIndex).trim();
    if (!narration && amountIndex === 0) narration = text.trim();

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
