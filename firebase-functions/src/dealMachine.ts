// Deal state machine and business logic
import { calculateSetupFee as calcSetupFee, calculateDealFees, EXTENSION_FEE_CENTS } from './fees';

export type DealStatus = 
  | 'draft'
  | 'invited'
  | 'awaiting_funding'
  | 'active'
  | 'outcome_proposed'
  | 'confirmed'
  | 'past_due'
  | 'frozen'
  | 'completed'
  | 'cancelled';

// Support both legacy and new type names
export type DealType = 
  | 'CASH_CASH' | 'CASH_GOODS' | 'GOODS_GOODS' // Legacy
  | 'MONEY_MONEY' | 'MONEY_GOODS' | 'MONEY_SERVICE' | 'GOODS_SERVICE' | 'SERVICE_SERVICE'; // New

// Map legacy types to new types
export function normalizeDealType(type: string): DealType {
  const mapping: Record<string, DealType> = {
    'CASH_CASH': 'MONEY_MONEY',
    'CASH_GOODS': 'MONEY_GOODS',
    'GOODS_GOODS': 'GOODS_GOODS',
  };
  return (mapping[type] as DealType) || (type as DealType);
}

// Re-export fee calculations for backward compatibility
// dealType parameter kept for API compatibility but not used (fees are fixed)
export function calculateSetupFee(dealType: DealType): number {
  return calcSetupFee();
}

export function calculateFairnessHold(
  dealType: DealType,
  declaredValueA?: number,
  declaredValueB?: number
): { fairnessHoldA: number; fairnessHoldB: number } {
  const fees = calculateDealFees({
    dealType,
    declaredValueA,
    declaredValueB,
  });
  return {
    fairnessHoldA: fees.fairnessHoldA,
    fairnessHoldB: fees.fairnessHoldB,
  };
}

export function canTransitionTo(currentStatus: DealStatus, newStatus: DealStatus): boolean {
  const transitions: Record<DealStatus, DealStatus[]> = {
    draft: ['invited', 'cancelled'],
    invited: ['awaiting_funding', 'cancelled'],
    awaiting_funding: ['active', 'cancelled'],
    active: ['outcome_proposed', 'completed', 'past_due', 'frozen', 'cancelled'],
    outcome_proposed: ['confirmed', 'active', 'frozen', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    past_due: ['outcome_proposed', 'completed', 'frozen', 'active', 'cancelled'],
    frozen: ['active', 'past_due', 'completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

export function getNextStatus(
  currentStatus: DealStatus,
  event: 'accept' | 'fund' | 'propose_outcome' | 'confirm_outcome' | 'complete' | 'pastdue' | 'freeze' | 'unfreeze' | 'cancel'
): DealStatus | null {
  const eventTransitions: Record<string, Record<DealStatus, DealStatus | null>> = {
    accept: {
      invited: 'awaiting_funding',
    } as Record<DealStatus, DealStatus | null>,
    fund: {
      awaiting_funding: 'active',
    } as Record<DealStatus, DealStatus | null>,
    propose_outcome: {
      active: 'outcome_proposed',
      past_due: 'outcome_proposed',
    } as Record<DealStatus, DealStatus | null>,
    confirm_outcome: {
      outcome_proposed: 'confirmed',
    } as Record<DealStatus, DealStatus | null>,
    complete: {
      active: 'completed',
      confirmed: 'completed',
      past_due: 'completed',
      frozen: 'completed',
    } as Record<DealStatus, DealStatus | null>,
    pastdue: {
      active: 'past_due',
    } as Record<DealStatus, DealStatus | null>,
    freeze: {
      active: 'frozen',
      past_due: 'frozen',
    } as Record<DealStatus, DealStatus | null>,
    unfreeze: {
      frozen: 'active', // Will be computed based on deal date
    } as Record<DealStatus, DealStatus | null>,
    cancel: {
      draft: 'cancelled',
      invited: 'cancelled',
      awaiting_funding: 'cancelled',
    } as Record<DealStatus, DealStatus | null>,
  };

  return eventTransitions[event]?.[currentStatus] || null;
}

export function isDealPastDue(dealDate: Date): boolean {
  return new Date() > dealDate;
}

export function calculateExtensionFee(extensionType: 'standard' | 'extended'): number {
  // Use standard extension fee from fees.ts
  return EXTENSION_FEE_CENTS;
}

export function getExtensionDays(extensionType: 'standard' | 'extended'): number {
  return extensionType === 'standard' ? 7 : 14;
}
