/**
 * Fee Configuration - Backend (Single Source of Truth)
 * 
 * All fees and rates are defined here for consistency across the app.
 * 
 * KEY POINTS:
 * - Supports decimal amounts (e.g., $150.72)
 * - Stores internally as cents (integer)
 * - Minimum agreement amount: $5.00 (500 cents)
 * - User sees ONE "Startup fee" (includes platform + processing)
 * - Principal only is refundable; startup fee is non-refundable
 */

// ============================================
// MONEYGOOD PLATFORM FEES
// ============================================

/** MoneyGood platform fee in cents (base platform fee, our revenue target) */
export const PLATFORM_FEE_CENTS = 300; // $3.00

/** Extension fee in cents */
export const EXTENSION_FEE_CENTS = 300; // $3.00

// Legacy exports for backward compatibility
export const MONEYGOOD_STARTUP_FEE_CENTS = PLATFORM_FEE_CENTS;
export const MONEYGOOD_STARTUP_FEE_USD = PLATFORM_FEE_CENTS / 100;

// ============================================
// STRIPE FEE CONFIGURATION (internal only)
// ============================================

/** Stripe percentage fee (2.9%) */
export const STRIPE_FEE_PERCENT = 0.029;

/** Stripe fixed fee in cents (30¢) */
export const STRIPE_FEE_FIXED_CENTS = 30;

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
// FAIRNESS HOLD CONFIGURATION
// ============================================

/** Percentage of declared value for fairness holds */
export const FAIRNESS_HOLD_PERCENTAGE = 0.20;

// ============================================
// FEE CALCULATION TYPES
// ============================================

export interface FeeBreakdown {
  /** Principal amount in cents (the agreement amount) */
  principalCents: number;
  /** All-in startup fee shown to user (includes platform + processing gross-up) */
  startupFeeCents: number;
  /** Total amount to charge */
  totalChargeCents: number;
  /** Internal accounting (not exposed to user) */
  _internal: {
    platformFeeCents: number;
    estimatedStripeFeeCents: number;
    expectedNetCents: number;
  };
}

// ============================================
// FEE CALCULATOR (with Stripe gross-up)
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
 * @param principalCents - The agreement amount in cents
 * @returns Fee breakdown with all amounts
 */
export function calculateFees(principalCents: number): FeeBreakdown {
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
    startupFeeCents: allInStartupFeeCents,
    totalChargeCents: grossCents,
    _internal: {
      platformFeeCents: PLATFORM_FEE_CENTS,
      estimatedStripeFeeCents,
      expectedNetCents: grossCents - estimatedStripeFeeCents,
    }
  };
}

/**
 * Calculate fees and return USD amounts for display
 */
export function calculateFeesForDisplay(amountUsd: number): {
  principalCents: number;
  principalUsd: number;
  startupFeeCents: number;
  startupFeeUsd: number;
  totalChargeCents: number;
  totalChargeUsd: number;
} {
  const principalCents = Math.round(amountUsd * 100);
  const breakdown = calculateFees(principalCents);
  
  return {
    principalCents: breakdown.principalCents,
    principalUsd: breakdown.principalCents / 100,
    startupFeeCents: breakdown.startupFeeCents,
    startupFeeUsd: breakdown.startupFeeCents / 100,
    totalChargeCents: breakdown.totalChargeCents,
    totalChargeUsd: breakdown.totalChargeCents / 100,
  };
}

/**
 * Calculate the refundable amount (ONLY principal, startup fee is non-refundable)
 * 
 * REFUND POLICY:
 * - Principal is fully refundable if cancelled before lock
 * - Startup fee (which includes processing) is NON-REFUNDABLE
 * 
 * @param principalCents - The principal amount paid
 * @returns Amount eligible for refund (principal only)
 */
export function calculateRefundableAmount(principalCents: number): number {
  // Only principal is refundable
  // Startup fee (which includes processing) is non-refundable
  return Math.max(0, principalCents);
}

/**
 * Calculate fairness hold amount based on declared value
 */
export function calculateFairnessHold(declaredValueCents: number): number {
  if (!declaredValueCents || declaredValueCents <= 0) {
    return 0;
  }
  return Math.round(declaredValueCents * FAIRNESS_HOLD_PERCENTAGE);
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate amount in cents is within allowed range
 */
export function validateAmountCents(cents: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(cents)) {
    return { valid: false, error: 'Amount must be a whole number of cents' };
  }
  
  if (cents < MIN_AMOUNT_CENTS) {
    return { valid: false, error: `Minimum agreement amount is $${(MIN_AMOUNT_CENTS / 100).toFixed(2)}` };
  }
  
  if (cents > MAX_AMOUNT_CENTS) {
    return { valid: false, error: `Maximum agreement amount is $${(MAX_AMOUNT_CENTS / 100).toLocaleString()}` };
  }
  
  return { valid: true };
}

/**
 * Parse and validate a monetary amount from USD to cents
 * Accepts: 150, 150.7, 150.72 (up to 2 decimals)
 * 
 * @param amountUsd - Amount in dollars (can have decimals)
 * @returns Validation result with cents if valid
 */
export function parseAmountToCents(amountUsd: number): { valid: boolean; cents?: number; error?: string } {
  if (typeof amountUsd !== 'number' || isNaN(amountUsd)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (amountUsd < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }
  
  // Convert to cents (round to handle floating point)
  const cents = Math.round(amountUsd * 100);
  
  // Validate the cents value
  const validation = validateAmountCents(cents);
  if (!validation.valid) {
    return validation;
  }
  
  return { valid: true, cents };
}

/**
 * @deprecated Use validateAmountCents instead
 */
export function validateAmountUsd(amountUsd: number): { valid: boolean; error?: string } {
  const cents = Math.round(amountUsd * 100);
  return validateAmountCents(cents);
}

/**
 * @deprecated No longer needed - we support decimals
 */
export function sanitizeToWholeDollars(input: string | number): number {
  const num = typeof input === 'string' 
    ? parseFloat(input.replace(/[^0-9.]/g, '')) 
    : input;
  
  if (isNaN(num)) return 0;
  return num; // Return as-is, we support decimals now
}

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Format cents to dollar display string
 */
export function formatCentsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format whole dollars with commas
 */
export function formatUsd(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}
