/**
 * Fee Configuration Unit Tests
 * 
 * Tests for:
 * - Cents support and validation
 * - $5.00 minimum enforcement
 * - Single startup fee calculation
 * - Refund policy (principal only)
 */

import {
  calculateFees,
  calculateFeesForDisplay,
  calculateRefundableAmount,
  calculateFairnessHold,
  validateAmountCents,
  parseAmountToCents,
  MIN_AMOUNT_CENTS,
  MAX_AMOUNT_CENTS,
  PLATFORM_FEE_CENTS,
  STRIPE_FEE_PERCENT,
  STRIPE_FEE_FIXED_CENTS,
} from './feeConfig';

// ============================================
// PART A: CENTS SUPPORT TESTS
// ============================================

describe('Amount Parsing and Validation', () => {
  
  // TEST: $4.99 rejected (below minimum)
  test('rejects $4.99 (below minimum $5.00)', () => {
    const result = parseAmountToCents(4.99);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum');
  });
  
  // TEST: $5.00 accepted
  test('accepts $5.00 (minimum amount)', () => {
    const result = parseAmountToCents(5.00);
    expect(result.valid).toBe(true);
    expect(result.cents).toBe(500);
  });
  
  // TEST: $150.72 accepted and correctly converted
  test('accepts $150.72 and converts to 15072 cents', () => {
    const result = parseAmountToCents(150.72);
    expect(result.valid).toBe(true);
    expect(result.cents).toBe(15072);
  });
  
  // TEST: $150.7 normalized to 15070 cents
  test('accepts $150.7 and converts to 15070 cents', () => {
    const result = parseAmountToCents(150.7);
    expect(result.valid).toBe(true);
    expect(result.cents).toBe(15070);
  });
  
  // TEST: Whole dollars work
  test('accepts whole dollars like $150', () => {
    const result = parseAmountToCents(150);
    expect(result.valid).toBe(true);
    expect(result.cents).toBe(15000);
  });
  
  // TEST: Maximum amount
  test('rejects amounts over maximum ($50,000)', () => {
    const result = parseAmountToCents(50001);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum');
  });
  
  // TEST: Negative amounts rejected
  test('rejects negative amounts', () => {
    const result = parseAmountToCents(-10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('negative');
  });
});

describe('Cents Validation', () => {
  
  test('validates 500 cents (minimum)', () => {
    const result = validateAmountCents(500);
    expect(result.valid).toBe(true);
  });
  
  test('rejects 499 cents (below minimum)', () => {
    const result = validateAmountCents(499);
    expect(result.valid).toBe(false);
  });
  
  test('validates 15072 cents ($150.72)', () => {
    const result = validateAmountCents(15072);
    expect(result.valid).toBe(true);
  });
  
  test('validates 5000000 cents ($50,000 max)', () => {
    const result = validateAmountCents(5000000);
    expect(result.valid).toBe(true);
  });
  
  test('rejects 5000001 cents (over max)', () => {
    const result = validateAmountCents(5000001);
    expect(result.valid).toBe(false);
  });
});

// ============================================
// PART B: SINGLE STARTUP FEE TESTS
// ============================================

describe('Fee Calculation - Single Startup Fee', () => {
  
  // TEST: Fee breakdown returns single startup fee
  test('returns single startupFeeCents (not separate platform + stripe)', () => {
    const fees = calculateFees(10000); // $100
    
    // Should have startupFeeCents, NOT moneygoodFeeCents + stripeFeeCents
    expect(fees.startupFeeCents).toBeDefined();
    expect(fees.principalCents).toBe(10000);
    expect(fees.totalChargeCents).toBe(fees.principalCents + fees.startupFeeCents);
    
    // Internal accounting exists but user doesn't see it
    expect(fees._internal).toBeDefined();
    expect(fees._internal.platformFeeCents).toBe(PLATFORM_FEE_CENTS);
  });
  
  // TEST: Total charge covers principal + all fees
  test('totalChargeCents = principalCents + startupFeeCents', () => {
    const fees = calculateFees(15072); // $150.72
    expect(fees.totalChargeCents).toBe(fees.principalCents + fees.startupFeeCents);
  });
  
  // TEST: Gross-up formula works correctly
  test('gross-up ensures we net the target amount after Stripe fees', () => {
    const principal = 10000; // $100
    const fees = calculateFees(principal);
    
    // After Stripe takes their cut from totalCharge, we should net at least principal + platform fee
    const stripeWouldTake = Math.ceil(
      fees.totalChargeCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS
    );
    const netAfterStripe = fees.totalChargeCents - stripeWouldTake;
    
    // We should net at least principal + platform fee
    expect(netAfterStripe).toBeGreaterThanOrEqual(principal + PLATFORM_FEE_CENTS);
  });
  
  // TEST: Small amount ($5) fee calculation
  test('calculates fees correctly for minimum amount ($5)', () => {
    const fees = calculateFees(500); // $5.00
    
    expect(fees.principalCents).toBe(500);
    expect(fees.startupFeeCents).toBeGreaterThan(0);
    expect(fees.totalChargeCents).toBeGreaterThan(500);
  });
  
  // TEST: Large amount ($10,000) fee calculation
  test('calculates fees correctly for large amount ($10,000)', () => {
    const fees = calculateFees(1000000); // $10,000
    
    expect(fees.principalCents).toBe(1000000);
    expect(fees.startupFeeCents).toBeGreaterThan(PLATFORM_FEE_CENTS);
    expect(fees.totalChargeCents).toBe(fees.principalCents + fees.startupFeeCents);
  });
  
  // TEST: Display helper works
  test('calculateFeesForDisplay returns USD values', () => {
    const display = calculateFeesForDisplay(150.72);
    
    expect(display.principalCents).toBe(15072);
    expect(display.principalUsd).toBeCloseTo(150.72, 2);
    expect(display.startupFeeCents).toBeGreaterThan(0);
    expect(display.startupFeeUsd).toBe(display.startupFeeCents / 100);
    expect(display.totalChargeUsd).toBe(display.totalChargeCents / 100);
  });
});

// ============================================
// PART C: REFUND TESTS
// ============================================

describe('Refund Calculation - Principal Only', () => {
  
  // TEST: Refund amount equals principal only
  test('refund amount equals principal cents only', () => {
    const principal = 15072; // $150.72
    const refundable = calculateRefundableAmount(principal);
    
    // Only principal is refundable, NOT the startup fee
    expect(refundable).toBe(principal);
  });
  
  // TEST: Zero principal = zero refund
  test('zero principal returns zero refund', () => {
    const refundable = calculateRefundableAmount(0);
    expect(refundable).toBe(0);
  });
  
  // TEST: Never returns negative
  test('never returns negative refund', () => {
    const refundable = calculateRefundableAmount(-100);
    expect(refundable).toBe(0);
  });
  
  // TEST: $5 minimum refund works
  test('$5 minimum amount is fully refundable', () => {
    const principal = 500; // $5.00
    const refundable = calculateRefundableAmount(principal);
    expect(refundable).toBe(500);
  });
  
  // TEST: Large amount refund
  test('large amounts are fully refundable', () => {
    const principal = 1000000; // $10,000
    const refundable = calculateRefundableAmount(principal);
    expect(refundable).toBe(1000000);
  });
});

// ============================================
// FAIRNESS HOLD TESTS
// ============================================

describe('Fairness Hold Calculation', () => {
  
  test('calculates 20% of declared value', () => {
    const hold = calculateFairnessHold(10000); // $100
    expect(hold).toBe(2000); // $20
  });
  
  test('returns 0 for zero value', () => {
    const hold = calculateFairnessHold(0);
    expect(hold).toBe(0);
  });
  
  test('returns 0 for negative value', () => {
    const hold = calculateFairnessHold(-1000);
    expect(hold).toBe(0);
  });
  
  test('rounds to nearest cent', () => {
    const hold = calculateFairnessHold(1001); // $10.01
    expect(hold).toBe(200); // 20% of 1001 = 200.2, rounds to 200
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  
  test('handles floating point precision correctly', () => {
    // 0.1 + 0.2 !== 0.3 in JS, make sure we handle this
    const result = parseAmountToCents(0.1 + 0.2); // Should be 0.3
    expect(result.valid).toBe(false); // Below minimum, but shouldn't error
  });
  
  test('fee calculation does not throw for zero principal', () => {
    expect(() => calculateFees(0)).not.toThrow();
    const fees = calculateFees(0);
    expect(fees.principalCents).toBe(0);
  });
  
  test('fee calculation throws for negative principal', () => {
    expect(() => calculateFees(-100)).toThrow();
  });
  
  test('handles exactly $50,000 (max)', () => {
    const result = parseAmountToCents(50000);
    expect(result.valid).toBe(true);
    expect(result.cents).toBe(5000000);
    
    const fees = calculateFees(5000000);
    expect(fees.totalChargeCents).toBeGreaterThan(5000000);
  });
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('Fee Constants', () => {
  
  test('minimum amount is $5 (500 cents)', () => {
    expect(MIN_AMOUNT_CENTS).toBe(500);
  });
  
  test('maximum amount is $50,000 (5,000,000 cents)', () => {
    expect(MAX_AMOUNT_CENTS).toBe(5000000);
  });
  
  test('platform fee is $3 (300 cents)', () => {
    expect(PLATFORM_FEE_CENTS).toBe(300);
  });
  
  test('Stripe fee is 2.9% + 30¢', () => {
    expect(STRIPE_FEE_PERCENT).toBe(0.029);
    expect(STRIPE_FEE_FIXED_CENTS).toBe(30);
  });
});
