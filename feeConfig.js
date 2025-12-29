/**
 * Fee Configuration - Frontend
 * 
 * Mirrors the backend fee config for display purposes.
 * All calculations should match the server-side logic.
 * 
 * KEY CHANGES:
 * - Supports decimal amounts (e.g., $150.72)
 * - Stores internally as cents
 * - Minimum agreement amount: $5.00 (500 cents)
 * - User sees ONE "Startup fee" (includes platform + processing)
 * - Principal only is refundable; startup fee is non-refundable
 */

// ============================================
// MONEYGOOD PLATFORM FEES
// ============================================

/** MoneyGood platform fee in cents (base platform fee before gross-up) */
export const PLATFORM_FEE_CENTS = 300; // $3.00

/** Extension fee in cents */
export const EXTENSION_FEE_CENTS = 300; // $3.00

// ============================================
// STRIPE FEE CONFIGURATION (internal only)
// ============================================

/** Stripe percentage fee (2.9%) */
const STRIPE_FEE_PERCENT = 0.029;

/** Stripe fixed fee in cents (30¢) */
const STRIPE_FEE_FIXED_CENTS = 30;

// ============================================
// AMOUNT LIMITS
// ============================================

/** Minimum agreement amount in cents ($5.00) */
export const MIN_AMOUNT_CENTS = 500;

/** Minimum agreement amount in dollars */
export const MIN_AMOUNT_USD = 5.00;

/** Maximum agreement amount in cents ($50,000) */
export const MAX_AMOUNT_CENTS = 5000000;

/** Maximum agreement amount in dollars */
export const MAX_AMOUNT_USD = 50000;

/** Minimum declared value in cents */
export const MIN_DECLARED_VALUE_CENTS = 100;

// ============================================
// FEE CALCULATOR
// ============================================

/**
 * Calculate the all-in startup fee that covers platform fee + processing
 * 
 * This is the SINGLE fee shown to users. Internally it's computed to cover:
 * - Platform fee (our revenue)
 * - Stripe processing fee (gross-up so we don't lose money)
 * 
 * Formula:
 *   targetNet = principalCents + platformFeeCents
 *   gross = (targetNet + STRIPE_FIXED) / (1 - STRIPE_PERCENT)
 *   allInStartupFee = gross - principalCents
 * 
 * @param {number} principalCents - Principal amount in cents
 * @returns {Object} Fee breakdown
 */
export function calculateFees(principalCents) {
  if (principalCents < 0) {
    throw new Error('Principal amount cannot be negative');
  }
  
  // Target net = principal + platform fee (what we want after Stripe takes cut)
  const targetNetCents = principalCents + PLATFORM_FEE_CENTS;
  
  // Gross-up formula to cover Stripe fees
  // gross - (gross * percent + fixed) = targetNet
  // gross = (targetNet + fixed) / (1 - percent)
  const grossCents = Math.ceil(
    (targetNetCents + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT)
  );
  
  // The all-in startup fee is everything above the principal
  const allInStartupFeeCents = grossCents - principalCents;
  
  // Internal tracking (not shown to user)
  const estimatedStripeFeeCents = Math.ceil(
    grossCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS
  );
  
  return {
    principalCents,
    // User-facing: single "Startup fee" that covers everything
    startupFeeCents: allInStartupFeeCents,
    totalChargeCents: grossCents,
    // Internal accounting (not exposed to user)
    _internal: {
      platformFeeCents: PLATFORM_FEE_CENTS,
      estimatedStripeFeeCents,
      expectedNetCents: grossCents - estimatedStripeFeeCents,
    }
  };
}

/**
 * Calculate fees and return USD amounts for display
 * 
 * @param {number} amountUsd - Principal amount in dollars (can have decimals)
 * @returns {Object} Fee breakdown for display
 */
export function calculateFeesForDisplay(amountUsd) {
  const principalCents = Math.round(amountUsd * 100);
  const fees = calculateFees(principalCents);
  
  return {
    principalCents: fees.principalCents,
    principalUsd: fees.principalCents / 100,
    startupFeeCents: fees.startupFeeCents,
    startupFeeUsd: fees.startupFeeCents / 100,
    totalChargeCents: fees.totalChargeCents,
    totalChargeUsd: fees.totalChargeCents / 100,
  };
}

/**
 * Calculate the refundable amount (ONLY principal, startup fee is non-refundable)
 * 
 * @param {number} principalCents - The principal amount paid
 * @returns {number} Amount eligible for refund (principal only)
 */
export function calculateRefundableAmount(principalCents) {
  // Only principal is refundable
  // Startup fee (which includes processing) is non-refundable
  return Math.max(0, principalCents);
}

/**
 * Calculate fairness hold (20% of declared value)
 */
export function calculateFairnessHold(declaredValueCents) {
  if (!declaredValueCents || declaredValueCents <= 0) return 0;
  return Math.round(declaredValueCents * 0.20);
}

// ============================================
// VALIDATION
// ============================================

/**
 * Parse and validate a monetary amount input
 * Accepts: "150", "150.7", "150.72" (up to 2 decimals)
 * Rejects: "150.123" (3+ decimals), negative values
 * 
 * @param {string|number} input - User input
 * @returns {{ valid: boolean, cents?: number, error?: string }}
 */
export function parseAndValidateAmount(input) {
  // Handle null/undefined
  if (input === null || input === undefined || input === '') {
    return { valid: false, error: 'Please enter an amount' };
  }
  
  // Clean the input string
  const cleanedInput = String(input).trim().replace(/[$,\s]/g, '');
  
  // Check for valid number format (optional decimals, up to 2 places)
  const amountRegex = /^(\d+)(\.\d{1,2})?$/;
  if (!amountRegex.test(cleanedInput)) {
    // Check if it has too many decimals
    if (/^\d+\.\d{3,}$/.test(cleanedInput)) {
      return { valid: false, error: 'Maximum 2 decimal places allowed' };
    }
    return { valid: false, error: 'Please enter a valid amount (e.g., 150.00)' };
  }
  
  const amountUsd = parseFloat(cleanedInput);
  
  // Check for negative
  if (amountUsd < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }
  
  // Convert to cents
  const cents = Math.round(amountUsd * 100);
  
  // Check minimum
  if (cents < MIN_AMOUNT_CENTS) {
    return { valid: false, error: `Minimum agreement amount is ${formatCurrency(MIN_AMOUNT_CENTS)}` };
  }
  
  // Check maximum
  if (cents > MAX_AMOUNT_CENTS) {
    return { valid: false, error: `Maximum agreement amount is ${formatCurrency(MAX_AMOUNT_CENTS)}` };
  }
  
  return { valid: true, cents, amountUsd };
}

/**
 * Validate amount in cents
 */
export function validateAmountCents(cents) {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (cents < MIN_AMOUNT_CENTS) {
    return { valid: false, error: `Minimum agreement amount is ${formatCurrency(MIN_AMOUNT_CENTS)}` };
  }
  
  if (cents > MAX_AMOUNT_CENTS) {
    return { valid: false, error: `Maximum agreement amount is ${formatCurrency(MAX_AMOUNT_CENTS)}` };
  }
  
  return { valid: true };
}

/**
 * @deprecated Use parseAndValidateAmount instead
 * Kept for backward compatibility
 */
export function validateAmountUsd(amountUsd) {
  const cents = Math.round(amountUsd * 100);
  return validateAmountCents(cents);
}

/**
 * @deprecated No longer needed - we support decimals now
 */
export function sanitizeToWholeDollars(input) {
  const result = parseAndValidateAmount(input);
  return result.valid ? result.cents / 100 : 0;
}

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Format cents to currency string using Intl.NumberFormat
 * e.g., 15072 -> "$150.72"
 */
export function formatCurrency(cents) {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format dollars to currency string
 * e.g., 150.72 -> "$150.72"
 */
export function formatUsd(dollars) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format cents to dollar display string (alias for formatCurrency)
 */
export function formatCentsToUsd(cents) {
  return formatCurrency(cents);
}

/**
 * Format amount for display (handles both cents and dollars)
 */
export function formatAmount(amount, isCents = false) {
  const cents = isCents ? amount : amount * 100;
  return formatCurrency(cents);
}

// ============================================
// FEE BREAKDOWN COMPONENT
// ============================================

/**
 * Generate HTML for fee breakdown display
 * Shows ONLY: Agreement amount + Startup fee + Total
 * Does NOT show separate processing/Stripe fee
 * 
 * @param {number} principalCents - Principal amount in cents
 * @param {Object} options - Display options
 */
export function renderFeeBreakdown(principalCents, options = {}) {
  const { 
    compact = false,
    className = ''
  } = options;
  
  if (!principalCents || principalCents <= 0) {
    return '';
  }
  
  const fees = calculateFees(principalCents);
  
  if (compact) {
    return `
      <div class="fee-breakdown-compact ${className}">
        <div class="text-sm text-navy-600 dark:text-navy-400">
          Total: <span class="font-semibold text-navy-900 dark:text-white">${formatCurrency(fees.totalChargeCents)}</span>
          <span class="text-xs">(includes ${formatCurrency(fees.startupFeeCents)} startup fee)</span>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="fee-breakdown bg-navy-50 dark:bg-navy-800/50 rounded-lg p-4 ${className}">
      <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Payment Summary</h4>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Agreement Amount</span>
          <span class="font-semibold text-navy-900 dark:text-white">${formatCurrency(fees.principalCents)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">
            Startup Fee
            <span class="text-xs ml-1 text-amber-600 dark:text-amber-400">(non-refundable)</span>
          </span>
          <span class="font-semibold text-navy-900 dark:text-white">${formatCurrency(fees.startupFeeCents)}</span>
        </div>
        <div class="border-t border-navy-200 dark:border-navy-700 pt-2 mt-2">
          <div class="flex justify-between">
            <span class="font-semibold text-navy-900 dark:text-white">Total Today</span>
            <span class="font-bold text-lg text-emerald-600">${formatCurrency(fees.totalChargeCents)}</span>
          </div>
        </div>
      </div>
      <p class="text-xs text-navy-500 dark:text-navy-400 mt-3">
        If cancelled, your agreement amount (${formatCurrency(fees.principalCents)}) will be refunded. The startup fee is non-refundable.
      </p>
    </div>
  `;
}

/**
 * Render refund policy notice
 */
export function renderRefundNotice(principalCents) {
  return `
    <div class="text-xs text-navy-500 dark:text-navy-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3">
      <strong class="text-amber-700 dark:text-amber-300">Refund Policy:</strong> 
      If you cancel before the agreement locks, your agreement amount (${formatCurrency(principalCents)}) will be refunded. 
      The startup fee is non-refundable.
    </div>
  `;
}
