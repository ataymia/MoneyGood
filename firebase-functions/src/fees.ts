/**
 * Single source of truth for all fee calculations
 * All fees are in cents
 */

export interface FeeCalculation {
  setupFeeCents: number;
  fairnessHoldA: number;
  fairnessHoldB: number;
  extensionFeeCents: number;
  totalFees: number;
}

// Platform fees (in cents)
export const SETUP_FEE_CENTS = 500; // $5.00 per deal
export const EXTENSION_FEE_CENTS = 300; // $3.00 per extension

// Fairness hold percentages
export const FAIRNESS_HOLD_PERCENTAGE = 0.20; // 20% of declared value

/**
 * Calculate setup fee
 * Fixed fee for creating a deal
 */
export function calculateSetupFee(): number {
  return SETUP_FEE_CENTS;
}

/**
 * Calculate extension fee
 * Fixed fee for extending a deal past its original date
 */
export function calculateExtensionFee(): number {
  return EXTENSION_FEE_CENTS;
}

/**
 * Calculate fairness hold for a goods party
 * 20% of declared value to ensure good faith
 */
export function calculateFairnessHold(declaredValueCents: number): number {
  if (!declaredValueCents || declaredValueCents <= 0) {
    return 0;
  }
  return Math.round(declaredValueCents * FAIRNESS_HOLD_PERCENTAGE);
}

/**
 * Calculate all fees for a deal based on its type
 */
export function calculateDealFees(params: {
  dealType: 'CASH_CASH' | 'CASH_GOODS' | 'GOODS_GOODS' | 
            'MONEY_MONEY' | 'MONEY_GOODS' | 'MONEY_SERVICE' | 
            'GOODS_SERVICE' | 'SERVICE_SERVICE';
  declaredValueA?: number;
  declaredValueB?: number;
}): FeeCalculation {
  const { dealType, declaredValueA, declaredValueB } = params;
  
  const setupFeeCents = calculateSetupFee();
  let fairnessHoldA = 0;
  let fairnessHoldB = 0;

  // Normalize deal type to handle both legacy and new formats
  const normalizedType = dealType.replace('MONEY', 'CASH').replace('SERVICE', 'GOODS') as 
    'CASH_CASH' | 'CASH_GOODS' | 'GOODS_GOODS';

  // Calculate fairness holds based on deal type
  switch (normalizedType) {
    case 'CASH_CASH':
      // No fairness holds for pure cash deals
      fairnessHoldA = 0;
      fairnessHoldB = 0;
      break;
      
    case 'CASH_GOODS':
      // Only goods party needs fairness hold
      fairnessHoldA = 0;
      fairnessHoldB = declaredValueB ? calculateFairnessHold(declaredValueB) : 0;
      break;
      
    case 'GOODS_GOODS':
      // Both parties need fairness holds
      fairnessHoldA = declaredValueA ? calculateFairnessHold(declaredValueA) : 0;
      fairnessHoldB = declaredValueB ? calculateFairnessHold(declaredValueB) : 0;
      break;
  }

  const totalFees = setupFeeCents + fairnessHoldA + fairnessHoldB;

  return {
    setupFeeCents,
    fairnessHoldA,
    fairnessHoldB,
    extensionFeeCents: 0, // Extension fees calculated separately when requested
    totalFees,
  };
}

/**
 * Calculate refund amounts based on deal outcome
 */
export function calculateRefunds(params: {
  fairnessHoldA: number;
  fairnessHoldB: number;
  outcome: 'BOTH_COMPLETED' | 'A_FAILED' | 'B_FAILED' | 'BOTH_FAILED' | 'CANCELLED';
}): { refundA: number; refundB: number; forfeitA: number; forfeitB: number } {
  const { fairnessHoldA, fairnessHoldB, outcome } = params;

  let refundA = 0;
  let refundB = 0;
  let forfeitA = 0;
  let forfeitB = 0;

  switch (outcome) {
    case 'BOTH_COMPLETED':
      // Both parties fulfilled - refund all fairness holds
      refundA = fairnessHoldA;
      refundB = fairnessHoldB;
      break;
      
    case 'A_FAILED':
      // Party A failed - they forfeit their hold, B gets refunded
      refundB = fairnessHoldB;
      forfeitA = fairnessHoldA;
      break;
      
    case 'B_FAILED':
      // Party B failed - they forfeit their hold, A gets refunded
      refundA = fairnessHoldA;
      forfeitB = fairnessHoldB;
      break;
      
    case 'BOTH_FAILED':
      // Both failed - both forfeit (platform keeps)
      forfeitA = fairnessHoldA;
      forfeitB = fairnessHoldB;
      break;
      
    case 'CANCELLED':
      // Deal cancelled - refund both parties
      refundA = fairnessHoldA;
      refundB = fairnessHoldB;
      break;
  }

  return { refundA, refundB, forfeitA, forfeitB };
}

/**
 * Format cents to dollar string for display
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Parse dollar string to cents
 */
export function parseDollarsToCents(dollars: string | number): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars.replace(/[^0-9.]/g, '')) : dollars;
  return Math.round(num * 100);
}
