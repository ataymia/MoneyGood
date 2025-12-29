import { z } from 'zod';
import { MIN_AMOUNT_CENTS, MAX_AMOUNT_CENTS, MIN_DECLARED_VALUE_CENTS } from './feeConfig';

// Minimum amount is $5.00 (500 cents)
const MIN_PRINCIPAL_CENTS = MIN_AMOUNT_CENTS; // 500

// Leg model for structured agreement sides
const LegSchema = z.object({
  kind: z.enum(['MONEY', 'GOODS', 'SERVICE']),
  description: z.string().max(1000).optional(), // Required for GOODS/SERVICE
  // Primary: cents-based fields (supports decimal inputs converted to cents)
  principalCents: z.number().int().min(MIN_PRINCIPAL_CENTS).max(MAX_AMOUNT_CENTS).optional(),
  declaredValueCents: z.number().int().min(MIN_DECLARED_VALUE_CENTS).max(MAX_AMOUNT_CENTS).optional(),
  // Legacy/display fields
  amountUsd: z.number().min(0).optional(), // Can have decimals now
  declaredValueUsd: z.number().min(0).optional(),
  moneyAmountCents: z.number().int().min(0).optional(), // Legacy alias for principalCents
  dueDate: z.string().optional(), // Optional for SERVICE
}).refine((leg) => {
  // Validate that MONEY legs have principalCents or moneyAmountCents
  if (leg.kind === 'MONEY') {
    const cents = leg.principalCents || leg.moneyAmountCents;
    return cents !== undefined && cents >= MIN_PRINCIPAL_CENTS;
  }
  // Validate that GOODS/SERVICE legs have description and declaredValueCents
  if (leg.kind === 'GOODS' || leg.kind === 'SERVICE') {
    const hasDescription = leg.description && leg.description.length > 0;
    const hasValue = leg.declaredValueCents !== undefined && leg.declaredValueCents >= MIN_DECLARED_VALUE_CENTS;
    return hasDescription && hasValue;
  }
  return true;
}, { message: 'Invalid leg data for the specified kind. Money legs require minimum $5.00.' });

export const CreateDealSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  participantEmail: z.string().email(),
  // Support both old and new type formats for backward compatibility
  type: z.enum([
    'CASH_CASH', 'CASH_GOODS', 'GOODS_GOODS', // Legacy
    'MONEY_MONEY', 'MONEY_GOODS', 'GOODS_GOODS', 'MONEY_SERVICE', 'GOODS_SERVICE', 'SERVICE_SERVICE' // New
  ]),
  dealDate: z.string(),
  timezone: z.string(),
  // Primary: cents-based (supports decimal amounts)
  principalCents: z.number().int().min(MIN_PRINCIPAL_CENTS).max(MAX_AMOUNT_CENTS).optional(),
  // Legacy fields (kept for backward compatibility)
  moneyAmountCents: z.number().int().min(0).optional(),
  amountUsd: z.number().min(0).optional(), // Can have decimals now
  goodsA: z.string().optional(),
  goodsB: z.string().optional(),
  declaredValueA: z.number().int().min(0).optional(),
  declaredValueB: z.number().int().min(0).optional(),
  // New structured leg model
  legA: LegSchema.optional(),
  legB: LegSchema.optional(),
}).refine((data) => {
  // If using new leg model, validate legs exist
  if (data.legA || data.legB) {
    return data.legA && data.legB;
  }
  return true;
}, { message: 'Both legA and legB must be provided if using leg model' });

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});

export const CreateCheckoutSessionSchema = z.object({
  dealId: z.string().min(1),
  purpose: z.enum(['SETUP_FEE', 'CONTRIBUTION', 'FAIRNESS_HOLD', 'EXTENSION_FEE']),
});

export const ProposeOutcomeSchema = z.object({
  dealId: z.string().min(1),
  outcome: z.enum(['RELEASE_TO_CREATOR', 'RELEASE_TO_PARTICIPANT', 'REFUND_BOTH']),
});

export const ConfirmOutcomeSchema = z.object({
  dealId: z.string().min(1),
});

export const FreezeDealSchema = z.object({
  dealId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export const UnfreezeDealSchema = z.object({
  dealId: z.string().min(1),
});

export const CancelDealSchema = z.object({
  dealId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const RequestExtensionSchema = z.object({
  dealId: z.string().min(1),
  extensionType: z.enum(['standard', 'extended']),
});

export const ApproveExtensionSchema = z.object({
  dealId: z.string().min(1),
});
