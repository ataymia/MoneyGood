import { z } from 'zod';

export const CreateDealSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  participantEmail: z.string().email(),
  type: z.enum(['CASH_CASH', 'CASH_GOODS', 'GOODS_GOODS']),
  dealDate: z.string(),
  timezone: z.string(),
  moneyAmountCents: z.number().int().min(0).optional(),
  goodsA: z.string().optional(),
  goodsB: z.string().optional(),
  declaredValueA: z.number().int().min(0).optional(),
  declaredValueB: z.number().int().min(0).optional(),
});

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
