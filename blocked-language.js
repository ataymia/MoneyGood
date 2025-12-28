/**
 * Blocked Language Filter
 * 
 * This module enforces safety constraints to prevent wagering/betting language
 * and ensure the platform remains focused on conditional agreements and commitments.
 * 
 * IMPORTANT: Agreements must remain standalone and independent.
 * Do NOT implement features that:
 * - Create "linked agreements" pairing opposing outcomes
 * - Enable netting or combined settlement
 * - Suggest "take the other side" flows
 * - Show combined results as winners/losers
 */

// Blocked terms and phrases (case-insensitive)
const BLOCKED_PATTERNS = [
  // Direct betting/wagering terms
  /\bbet\b/i,
  /\bbets\b/i,
  /\bbetting\b/i,
  /\bwager\b/i,
  /\bwagers\b/i,
  /\bwagering\b/i,
  /\bgambl(e|ing)\b/i,
  /\bodds\b/i,
  /\bparlay\b/i,
  /\bbookie\b/i,
  /\bsportsbook\b/i,
  /\blines\b.*\bspread\b/i,
  /\bspread\b.*\blines\b/i,
  /\bover\s*\/\s*under\b/i,
  /\bover-under\b/i,
  
  // Opposing position language
  /\btake\s+the\s+other\s+side\b/i,
  /\blooking\s+for\s+someone\s+to\s+take\b/i,
  /\bwinner\s+takes\s+all\b/i,
  /\bversus\b.*\boutcome\b/i,
  /\bopposing\s+outcome\b/i,
  /\bopposite\s+position\b/i,
  /\bmatch\s+your\s+\$\b/i,
  /\bdouble\s+or\s+nothing\b/i,
  /\ball\s+or\s+nothing\b/i,
  
  // Paired/linked agreement language
  /\blinked\s+agreement\b/i,
  /\bpaired\s+agreement\b/i,
  /\bmirrored\s+agreement\b/i,
  /\bcounter\s+agreement\b/i,
  /\bnetting\s+outcome\b/i,
  /\bcombined\s+settlement\b/i,
];

// Phrases that suggest betting context
const CONTEXT_PATTERNS = [
  /\bif\s+.*\s+wins\b/i,
  /\bif\s+.*\s+loses\b/i,
  /\bsports\s+event\b/i,
  /\bgame\s+outcome\b/i,
];

/**
 * Check if text contains blocked language
 * @param {string} text - Text to check
 * @returns {{ blocked: boolean, matches: string[] }} - Result with matched patterns
 */
export function containsBlockedLanguage(text) {
  if (!text || typeof text !== 'string') {
    return { blocked: false, matches: [] };
  }

  const matches = [];

  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  return {
    blocked: matches.length > 0,
    matches: [...new Set(matches)], // Remove duplicates
  };
}

/**
 * Validate deal/listing data for blocked language
 * @param {Object} data - Data object with title and description
 * @returns {{ valid: boolean, errors: string[] }} - Validation result
 */
export function validateDealLanguage(data) {
  const errors = [];

  if (data.title) {
    const titleCheck = containsBlockedLanguage(data.title);
    if (titleCheck.blocked) {
      errors.push(`Title contains blocked terms: ${titleCheck.matches.join(', ')}`);
    }
  }

  if (data.description) {
    const descCheck = containsBlockedLanguage(data.description);
    if (descCheck.blocked) {
      errors.push(`Description contains blocked terms: ${descCheck.matches.join(', ')}`);
    }
  }

  // Check leg descriptions for goods/services
  if (data.legA?.description) {
    const legACheck = containsBlockedLanguage(data.legA.description);
    if (legACheck.blocked) {
      errors.push(`Side A description contains blocked terms: ${legACheck.matches.join(', ')}`);
    }
  }

  if (data.legB?.description) {
    const legBCheck = containsBlockedLanguage(data.legB.description);
    if (legBCheck.blocked) {
      errors.push(`Side B description contains blocked terms: ${legBCheck.matches.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get user-friendly error message for blocked language
 */
export function getBlockedLanguageMessage() {
  return 'This platform supports conditional agreements and commitments. Please remove wagering/betting language and terms suggesting opposing positions or paired outcomes.';
}

/**
 * Safe example phrases for users
 */
export const SAFE_EXAMPLES = [
  "I'll pay $100 upon proof of completion",
  "I'll trade my PS5 for web design services by Friday",
  "I'll contribute $50 if the project milestone is reached",
  "I'll provide consulting services for agreed payment",
  "I'll deliver the goods upon receipt of payment confirmation",
];

/**
 * Unsafe example phrases (for educational purposes)
 */
export const UNSAFE_EXAMPLES = [
  "I'll bet $100 on the game outcome",
  "Looking for someone to take the other side",
  "Winner takes all, double or nothing",
  "I'll wager on sports event X",
];
