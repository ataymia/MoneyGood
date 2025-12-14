// Deal state machine and business logic
import { calculateSetupFee as calcSetupFee, calculateDealFees, EXTENSION_FEE_CENTS } from './fees';

export type DealStatus = 
  | 'draft'
  | 'invited'
  | 'awaiting_funding'
  | 'active'
  | 'past_due'
  | 'frozen'
  | 'completed'
  | 'cancelled';

export type DealType = 'CASH_CASH' | 'CASH_GOODS' | 'GOODS_GOODS';

// Re-export fee calculations for backward compatibility
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
    active: ['completed', 'past_due', 'frozen', 'cancelled'],
    past_due: ['completed', 'frozen', 'active', 'cancelled'],
    frozen: ['active', 'past_due', 'completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

export function getNextStatus(
  currentStatus: DealStatus,
  event: 'accept' | 'fund' | 'complete' | 'pastdue' | 'freeze' | 'unfreeze' | 'cancel'
): DealStatus | null {
  const eventTransitions: Record<string, Record<DealStatus, DealStatus | null>> = {
    accept: {
      invited: 'awaiting_funding',
    } as Record<DealStatus, DealStatus | null>,
    fund: {
      awaiting_funding: 'active',
    } as Record<DealStatus, DealStatus | null>,
    complete: {
      active: 'completed',
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
