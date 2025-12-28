import Stripe from 'stripe';
import { defineSecret } from 'firebase-functions/params';

// Define secrets using Firebase Functions v2 secrets management
// These must be set via: firebase functions:secrets:set STRIPE_SECRET_KEY
export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
export const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// Initialize Stripe lazily to avoid errors when secrets aren't loaded
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = stripeSecretKey.value();
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY secret is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeInstance;
}

// Keep this export for backward compatibility (will be lazily initialized)
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return (getStripe() as any)[prop];
  }
});

export async function createCheckoutSession(
  amountCents: number,
  currency: string,
  dealId: string,
  purpose: string,
  customerEmail: string,
  payerUid: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  
  return await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `MoneyGood - ${purpose}`,
            description: `Deal ID: ${dealId}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      dealId,
      purpose,
      payerUid,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createConnectAccount(email: string): Promise<Stripe.Account> {
  const stripe = getStripe();
  
  return await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  const stripe = getStripe();
  
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

export async function createTransfer(
  amountCents: number,
  currency: string,
  destinationAccount: string,
  description: string
): Promise<Stripe.Transfer> {
  const stripe = getStripe();
  
  return await stripe.transfers.create({
    amount: amountCents,
    currency,
    destination: destinationAccount,
    description,
  });
}

export async function createRefund(
  paymentIntentId: string,
  amountCents?: number
): Promise<Stripe.Refund> {
  const stripe = getStripe();
  
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = stripeWebhookSecret.value();
  
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET secret is not configured');
  }
  
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
