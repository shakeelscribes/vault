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

module.exports = { extractPDFText, splitIntoRows };
