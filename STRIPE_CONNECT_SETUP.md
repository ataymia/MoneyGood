# Stripe Connect Setup Guide

This document provides instructions for setting up Stripe Connect for MoneyGood platform payments.

## Overview

MoneyGood uses Stripe Connect Express to enable users to receive payouts from completed deals. When a deal is resolved in a user's favor, funds are transferred to their connected Stripe account.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Firebase Functions deployed
3. Firebase CLI installed and authenticated

## Required Environment Variables

### Firebase Functions Configuration

Set these using Firebase Functions config:

```bash
# Stripe API Keys
firebase functions:config:set stripe.secret_key="sk_live_xxx" stripe.publishable_key="pk_live_xxx"

# Stripe Webhook Secret
firebase functions:config:set stripe.webhook_secret="whsec_xxx"

# App URL for return/refresh URLs
firebase functions:config:set app.url="https://yourdomain.com"
```

### For Local Development

Create a `.env` file in `/firebase-functions`:

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
APP_URL=http://localhost:5000
```

## Stripe Dashboard Setup

### 1. Enable Connect

1. Go to Stripe Dashboard → Connect → Settings
2. Enable "Express" account type
3. Configure platform settings:
   - Platform name: MoneyGood
   - Platform logo
   - Support email

### 2. Configure Branding

1. Go to Connect → Settings → Branding
2. Set up colors and logo to match MoneyGood branding
3. Configure business information

### 3. Set Up Webhooks

1. Go to Developers → Webhooks
2. Add a new endpoint:
   - URL: `https://YOUR_FIREBASE_PROJECT.cloudfunctions.net/stripeWebhook`
   - Events to send:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
     - `charge.refunded`
     - `charge.dispute.created`
     - `account.updated` ← **Important for Connect**

3. Copy the webhook signing secret and add to Firebase config

### 4. Configure Capabilities

For Express accounts, ensure these capabilities are requested:
- `card_payments`
- `transfers`

This is configured in the `createConnectAccount` function.

## User Flow

### 1. User Initiates Connection

1. User navigates to Settings
2. Clicks "Set Up Payouts"
3. `setupStripeConnect` function is called

### 2. Onboarding

1. Function creates Express account (if not exists)
2. Generates account link with return/refresh URLs
3. User is redirected to Stripe-hosted onboarding

### 3. Return URLs

| URL | Purpose |
|-----|---------|
| `/#/connect/return` | User completes onboarding |
| `/#/connect/refresh` | Link expired or user left early |

### 4. Status Updates

The `account.updated` webhook updates user's connect status:
- `detailsSubmitted` - User submitted required info
- `chargesEnabled` - Account can accept charges
- `payoutsEnabled` - Account can receive payouts

## Firebase Functions

### `setupStripeConnect`

Creates Connect account and returns onboarding URL.

```typescript
// Request
{ } // No parameters needed

// Response
{ url: "https://connect.stripe.com/..." }
```

### `refreshConnectStatus`

Retrieves latest account status from Stripe.

```typescript
// Request
{ } // No parameters needed

// Response
{
  connected: true,
  status: {
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
  },
  accountId: "acct_xxx"
}
```

### `stripeWebhook`

Handles webhook events including `account.updated`.

## Firestore Schema

User document connect fields:

```javascript
{
  stripeConnectAccountId: "acct_xxx",
  stripeConnectStatus: {
    detailsSubmitted: boolean,
    chargesEnabled: boolean,
    payoutsEnabled: boolean,
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
}
```

## UI States

The Settings page shows different states:

| State | Badge | Button |
|-------|-------|--------|
| Not connected | Red "Not Connected" | "Set Up Payouts" |
| Incomplete | Yellow "Incomplete" | "Finish Setup" |
| Pending verification | Yellow "Pending Verification" | "Complete Setup" |
| Fully connected | Green "Fully Connected" | "Manage Payout Account" |

## Testing

### Test Mode

1. Use test API keys (`sk_test_xxx`, `pk_test_xxx`)
2. Use Stripe test accounts for onboarding
3. Test webhook events using Stripe CLI:

```bash
stripe listen --forward-to localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
```

### Test Scenarios

1. **New user connection**: Complete full onboarding flow
2. **Expired link**: Wait for link to expire, test refresh flow
3. **Incomplete onboarding**: Exit partway, verify status
4. **Account verification**: Verify status updates via webhook

## Troubleshooting

### "Failed to set up Stripe Connect"

- Check Stripe API key is correctly configured
- Verify user is authenticated
- Check Firebase Functions logs

### Webhook not receiving events

- Verify webhook URL is correct
- Check webhook signing secret matches
- Ensure `account.updated` event is selected in Stripe dashboard

### Status not updating

- Verify `account.updated` webhook is configured
- Check webhook handler logs
- Manually call `refreshConnectStatus` to sync

### User stuck in "Pending Verification"

- This is normal for new accounts
- Stripe reviews accounts based on risk profile
- Usually resolves within minutes to hours

## Security Considerations

1. **Never expose secret key client-side** - Only use in Firebase Functions
2. **Validate webhook signatures** - Already implemented in `constructWebhookEvent`
3. **User can only access own connect account** - Enforced by auth check
4. **Admin cannot access user's Stripe dashboard** - Only status fields stored

## Support

For Stripe-related issues:
- [Stripe Documentation](https://stripe.com/docs/connect)
- [Stripe Support](https://support.stripe.com)

For MoneyGood integration issues:
- Check Firebase Functions logs
- Review webhook event logs in Stripe Dashboard

---

*Last updated: December 2024*
