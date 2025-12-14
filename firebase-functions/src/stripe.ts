import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(
  amountCents: number,
  currency: string,
  dealId: string,
  purpose: string,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
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
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createConnectAccount(email: string): Promise<Stripe.Account> {
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
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
