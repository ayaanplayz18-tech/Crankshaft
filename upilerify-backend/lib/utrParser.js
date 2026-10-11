/**
 * Multi-bank Indian credit-alert UTR & Amount parser
 * Supports: HDFC, ICICI, SBI, Axis, Kotak, Paytm, PhonePe, Google Pay, CRED, IndusInd, PNB, etc.
 */

// Regex patterns to detect 12-digit UTR / Reference numbers
const UTR_PATTERNS = [
  // Explicit UTR mentions: UTR: 423985172039, UTR 423985172039, UTR no 423985172039
  /\bUTR\s*(?:no\.?|num\.?|number)?[:\s\-]+([0-9]{12})\b/i,
  // Bank Reference numbers: Ref: 423985172039, Ref No: 423985172039
  /\bRef(?:\.|erence)?\s*(?:no\.?|num\.?|number)?[:\s\-]+([0-9]{12})\b/i,
  // UPI Transaction Reference / RRN: UPI Ref: 423985172039, RRN: 423985172039
  /\b(?:UPI\s*Ref|RRN|Txn\s*ID|TxnNo)[:\s\-]+([0-9]{12})\b/i,
  // Standard NPCI UPI formatted strings: UPI/CR/423985172039 or UPI/P2A/423985172039
  /\bUPI\/(?:CR|P2A|P2P|REV)\/([0-9]{12})\b/i,
  // IMPS / NEFT ref
  /\bIMPS\/(?:P2A|CR)\/([0-9]{12})\b/i,
  // Fallback: any 12 digit integer preceded by UPI keywords
  /\b(?:UPI|VPA|GPay|PhonePe|Paytm)[^\d]{1,20}([0-9]{12})\b/i,
];

// Regex patterns to detect alphanumeric Transaction IDs (FamApp / FamPay / P2P alerts)
const TXN_ID_PATTERNS = [
  // FamApp: with transaction id FMPIB6769945477 or Transaction ID : FMPIB...
  /\b(?:transaction\s*id|txn\s*id|txnid)\s*[:\s\-]+([A-Za-z0-9]{8,25})\b/i,
  // Direct FMPIB prefix
  /\b(FMPIB[A-Za-z0-9]{8,20})\b/i,
  // General transaction reference
  /\b(?:Txn\s*ID|Transaction\s*ID|Ref\s*ID)[:\s\-]+([A-Za-z0-9]{8,25})\b/i,
];

// Regex patterns to detect credit amount
const AMOUNT_PATTERNS = [
  // Credited with/by/for: credited with INR 499.02, credited by Rs. 499.02
  /(?:credited|received|deposited)\s+(?:by|with|for|of)?\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+\.[0-9]{2})\b/i,
  // Amount with INR / Rs prefix: INR 499.02, Rs 499.02, ₹499.02
  /(?:INR|Rs\.?|₹)\s*([0-9,]+\.[0-9]{2})\b/i,
  // Fallback integer amount: credited with Rs 499
  /(?:credited|received)\s+(?:by|with|for|of)?\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+)\b/i,
];

function isCreditAlert(text, subject = "") {
  const combined = `${subject} ${text}`.toLowerCase();
  
  // Explicit debit indicators
  if (
    combined.includes("debited") ||
    combined.includes("paid to") ||
    combined.includes("sent to") ||
    combined.includes("payment of") ||
    combined.includes("successfully paid")
  ) {
    // If it mentions both debit and credit (e.g. "paid to you"), check specifically for incoming phrasing
    if (!combined.includes("received") && !combined.includes("credited")) {
      return false;
    }
  }

  // Must contain credit/receipt indicators
  const hasCreditKeywords =
    combined.includes("credited") ||
    combined.includes("received") ||
    combined.includes("deposited") ||
    combined.includes("you received") ||
    combined.includes("money received") ||
    combined.includes("inward");

  return hasCreditKeywords;
}

function parseBankAlert(text, subject = "") {
  if (!isCreditAlert(text, subject)) {
    return { utr: null, amount: null };
  }

  const combined = `${subject}\n${text}`;
  
  let utr = null;
  // First, check explicit 12-digit numeric UTRs
  for (const pattern of UTR_PATTERNS) {
    const match = combined.match(pattern);
    if (match && match[1] && /^\d{12}$/.test(match[1])) {
      utr = match[1];
      break;
    }
  }

  // If no 12-digit UTR found, check for bank/FamApp alphanumeric transaction IDs
  if (!utr) {
    for (const pattern of TXN_ID_PATTERNS) {
      const match = combined.match(pattern);
      if (match && match[1] && /^[A-Za-z0-9]{8,25}$/.test(match[1])) {
        utr = match[1].toUpperCase();
        break;
      }
    }
  }

  let amount = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, "");
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  return { utr, amount };
}

module.exports = { parseBankAlert, UTR_PATTERNS, TXN_ID_PATTERNS, AMOUNT_PATTERNS };
