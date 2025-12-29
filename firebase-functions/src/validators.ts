import { z } from 'zod';

// Leg model for structured agreement sides
const LegSchema = z.object({
  kind: z.enum(['MONEY', 'GOODS', 'SERVICE']),
  description: z.string().max(1000).optional(), // Required for GOODS/SERVICE
  declaredValueCents: z.number().int().min(0).optional(), // Required for GOODS/SERVICE
  moneyAmountCents: z.number().int().min(0).optional(), // Required for MONEY
  dueDate: z.string().optional(), // Optional for SERVICE
}).refine((leg) => {
  // Validate that MONEY legs have moneyAmountCents
  if (leg.kind === 'MONEY') {
    return leg.moneyAmountCents !== undefined && leg.moneyAmountCents >= 0;
  }
  // Validate that GOODS/SERVICE legs have description and declaredValueCents
  if (leg.kind === 'GOODS' || leg.kind === 'SERVICE') {
    return leg.description && leg.description.length > 0 && 
           leg.declaredValueCents !== undefined && leg.declaredValueCents >= 0;
  }
  return true;
}, { message: 'Invalid leg data for the specified kind' });

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
  // Legacy fields (kept for backward compatibility)
  moneyAmountCents: z.number().int().min(0).optional(),
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

export const RequestExtensionSchema = z.object({
  dealId: z.string().min(1),
  extensionType: z.enum(['standard', 'extended']),
});

export const ApproveExtensionSchema = z.object({
  dealId: z.string().min(1),
});
