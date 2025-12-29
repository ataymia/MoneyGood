# Stripe + Firebase Setup Guide

Complete guide for configuring MoneyGood with Stripe payments and Firebase backend.

---

## Overview

MoneyGood uses:
- **Cloudflare Pages** for hosting the frontend (static files)
- **Firebase Authentication** for user management
- **Firebase Firestore** for database
- **Firebase Cloud Functions** for backend logic (NOT Cloudflare Workers)
- **Stripe Checkout** for payment processing
- **Stripe Webhooks** for payment event handling

### Architecture

```
┌─────────────────────┐
│  Cloudflare Pages   │  ← Frontend hosting + env vars
│   (Static Files)    │     (VITE_* variables)
└──────────┬──────────┘
           │
           ├──→ Firebase Auth/Firestore (user data, deals)
           │
           └──→ Firebase Cloud Functions ──→ Stripe API
                (Backend logic + webhook)    (Payments)
```

---

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project**
3. Enter project name (e.g., `moneygood-app`)
4. Enable Google Analytics (optional)
5. Click **Create project**

### 1.2 Enable Firebase Services

#### Enable Authentication
1. In Firebase Console, go to **Build → Authentication**
2. Click **Get started**
3. Enable **Email/Password** sign-in method
4. Save

#### Enable Firestore Database
1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Select **Production mode** (or Test mode for development)
4. Choose a location (e.g., `us-central`)
5. Click **Enable**

#### Set Up Firestore Rules
1. Go to **Firestore Database → Rules**
2. Copy rules from `firestore.rules` in this repo
3. Click **Publish**

#### Set Up Firestore Indexes
1. Go to **Firestore Database → Indexes**
2. Import `firestore.indexes.json` from this repo
3. Or create indexes as needed when prompted by Firebase

### 1.3 Get Firebase Config (Frontend)

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click **Web** icon (`</>`) to add a web app
4. Register app with nickname (e.g., `MoneyGood Web`)
5. Copy the `firebaseConfig` object values:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-app",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

6. **Save these values** — you'll add them to Cloudflare Pages in Part 3.

---

## Part 2: Stripe Setup

### 2.1 Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign up or log in
3. Activate your account (verify business details)

### 2.2 Get Stripe Keys

#### Test Mode (for development)
1. In Stripe Dashboard, ensure **Test mode** toggle is ON (top right)
2. Go to **Developers → API keys**
3. Copy:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) — keep this secure!

#### Live Mode (for production)
1. Toggle to **Live mode**
2. Copy:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) — keep this secure!

### 2.3 Create Webhook Endpoint

You'll configure this **after** deploying Firebase Functions (Part 4).

---

## Part 3: Cloudflare Pages Environment Variables (Frontend)

These variables configure the **frontend** (public, safe to expose in browser).

### 3.1 Access Cloudflare Pages Settings

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages**
3. Select your **MoneyGood** project
4. Go to **Settings → Environment variables**

### 3.2 Add Environment Variables

Add the following variables for **Production** (and optionally **Preview**):

| Variable Name                        | Value                                           | Source         |
|--------------------------------------|-------------------------------------------------|----------------|
| `VITE_FIREBASE_API_KEY`              | Your Firebase `apiKey`                          | Firebase Step 1.3 |
| `VITE_FIREBASE_AUTH_DOMAIN`          | Your Firebase `authDomain`                      | Firebase Step 1.3 |
| `VITE_FIREBASE_PROJECT_ID`           | Your Firebase `projectId`                       | Firebase Step 1.3 |
| `VITE_FIREBASE_STORAGE_BUCKET`       | Your Firebase `storageBucket`                   | Firebase Step 1.3 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`  | Your Firebase `messagingSenderId`               | Firebase Step 1.3 |
| `VITE_FIREBASE_APP_ID`               | Your Firebase `appId`                           | Firebase Step 1.3 |
| `VITE_STRIPE_PUBLISHABLE_KEY`        | `pk_test_...` (test) or `pk_live_...` (prod)   | Stripe Step 2.2 |

### 3.3 Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment, or
3. Push a new commit to trigger a deployment

---

## Part 4: Firebase Cloud Functions Setup

### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4.2 Login to Firebase

```bash
firebase login
```

### 4.3 Initialize Firebase in This Repo (if not done)

From the root of the MoneyGood repo:

```bash
firebase init functions
```

- Select **Use an existing project**: Choose your Firebase project
- Language: **TypeScript** (already configured)
- Install dependencies: **Yes**

The `firebase-functions/` folder is already set up.

### 4.4 Set Stripe Runtime Config

Firebase Functions uses runtime configuration for secrets. Set your Stripe keys:

```bash
# Set Stripe secret key (from Stripe Dashboard → API Keys)
firebase functions:config:set stripe.secret="sk_test_..." 
# or for production: stripe.secret="sk_live_..."

# Set Stripe webhook secret (you'll get this in Part 5 after creating the webhook)
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

Verify config:

```bash
firebase functions:config:get
```

**Important Notes:**
- Runtime config (`functions.config()`) is being used instead of Secret Manager to avoid billing requirements
- This method works without enabling billing on your Firebase project
- Runtime config is [scheduled for deprecation in March 2026](https://firebase.google.com/docs/functions/config-env)
- **TODO:** Migrate to Secret Manager or environment variables before deprecation
- For now, this is the recommended approach for projects without billing enabled

### 4.5 Install Dependencies

```bash
cd firebase-functions
npm install
```

### 4.6 Build Functions

```bash
npm run build
```

### 4.7 Deploy Functions

```bash
firebase deploy --only functions
```

This will deploy:
- `createCheckoutSession` (callable function)
- `stripeWebhook` (HTTP function for Stripe webhooks)
- Other deal-related functions

**Save the deployed function URLs**, especially the `stripeWebhook` URL.

Example output:
```
✔  functions[stripeWebhook(us-central1)] https://us-central1-your-project.cloudfunctions.net/stripeWebhook
```

---

## Part 5: Stripe Webhook Configuration

### 5.1 Add Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL**: Paste your deployed `stripeWebhook` function URL from Part 4.7
   - Example: `https://us-central1-your-project.cloudfunctions.net/stripeWebhook`
4. **Events to send**: Select the following events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
5. Click **Add endpoint**

### 5.2 Get Webhook Signing Secret

1. After creating the endpoint, click on it
2. Click **Reveal** under **Signing secret**
3. Copy the secret (starts with `whsec_...`)

### 5.3 Set Webhook Secret in Firebase

```bash
firebase functions:config:set stripe.webhook_secret="whsec_..."
# Paste the webhook secret you copied
```

Verify config:

```bash
firebase functions:config:get
```

### 5.4 Redeploy Functions (to use new config)

```bash
firebase deploy --only functions:stripeWebhook
```

---

## Part 6: Local Development (Optional)

### 6.1 Create `.env` File for Local Dev

In the root of the repo, create a `.env` file (DO NOT commit this):

```bash
# Frontend (Vite)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6.2 Run Local Dev Server

```bash
# Root directory
npm install
npm run dev
# or
npx vite
```

Vite will automatically load `.env` variables.

### 6.3 Run Firebase Emulators (Optional)

To test Cloud Functions locally:

```bash
cd firebase-functions
npm run serve
```

This starts the Firebase Emulators Suite (Functions, Firestore, Auth).

**Note**: Stripe webhooks won't work locally unless you use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events.

---

## Part 7: Testing the Integration

### 7.1 Test Frontend

1. Visit your deployed Cloudflare Pages URL (or `localhost:5173` for local)
2. Sign up for an account
3. Create a new deal
4. Accept the invite (use invite link or token)
5. Attempt to pay the setup fee

### 7.2 Test Payment Flow

1. Click **Pay Setup Fee** button in a deal
2. You should be redirected to Stripe Checkout
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits
4. Complete the test payment
5. You should be redirected back to your deal
6. Verify the payment is marked as completed in the deal UI

### 7.3 Test Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Check the **Events** log to verify `checkout.session.completed` was received
4. Status should be **Succeeded** (200 response)

If webhook fails:
- Check Firebase Functions logs: `firebase functions:log`
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Ensure the webhook URL matches the deployed function URL

---

## Part 8: Firestore Payment Schema

The webhook updates Firestore with this structure:

```javascript
deals/{dealId}
  ├─ payments: {
  │    setupFee: {
  │      [uid]: { paid: true, sessionId: "cs_...", paidAt: timestamp }
  │    },
  │    contribution: {
  │      [uid]: { paid: true, sessionId: "cs_...", paidAt: timestamp }
  │    },
  │    fairnessHold: {
  │      [uid]: { paid: true, sessionId: "cs_...", paidAt: timestamp }
  │    }
  │  }
  ├─ payments/ (subcollection)
       └─ {paymentId}
            ├─ party: "A" or "B"
            ├─ purpose: "SETUP_FEE" | "CONTRIBUTION" | "FAIRNESS_HOLD"
            ├─ amountCents: number
            ├─ status: "pending" | "succeeded" | "failed" | "refunded" | "disputed"
            ├─ stripeCheckoutSessionId: "cs_..."
            ├─ stripePaymentIntentId: "pi_..."
            ├─ createdAt: timestamp
```

---

## Troubleshooting

### Frontend Shows "Firebase Configuration Missing"

- Verify environment variables are set in Cloudflare Pages
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Frontend Shows "Stripe is not configured"

- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check the key format: must start with `pk_test_` or `pk_live_`

### Payment Checkout Fails

- Check Firebase Functions logs: `firebase functions:log`
- Verify `STRIPE_SECRET_KEY` secret is set
- Ensure deal exists and user is a participant

### Webhook Signature Verification Fails

- Verify `STRIPE_WEBHOOK_SECRET` secret matches the Stripe Dashboard value
- Check webhook endpoint URL matches deployed function URL
- Redeploy functions after setting the secret

### Deal Doesn't Activate After Payment

- Check webhook logs in Stripe Dashboard
- Verify webhook received `checkout.session.completed` event
- Check Firebase Functions logs for errors in webhook handler
- Ensure payment metadata includes `dealId`, `purpose`, `payerUid`

---

## Security Checklist

✅ **Never commit secrets to Git**:
- No `sk_test_*` or `sk_live_*` keys
- No `whsec_*` webhook secrets
- No Firebase Admin SDK private keys

✅ **Use Firebase secrets** for backend secrets (not env vars)

✅ **Frontend env vars** (`VITE_*`) are safe to expose in browser

✅ **Firestore Security Rules** restrict read/write access to authenticated users

✅ **Stripe webhook signature verification** prevents unauthorized requests

---

## Production Deployment Checklist

Before going live:

- [ ] Switch Stripe from **Test mode** to **Live mode**
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` with `pk_live_...`
- [ ] Update `STRIPE_SECRET_KEY` secret with `sk_live_...`
- [ ] Create new webhook endpoint for production
- [ ] Update `STRIPE_WEBHOOK_SECRET` with new `whsec_...`
- [ ] Test payment flow with real card (then refund)
- [ ] Set up Stripe Dashboard alerts and monitoring
- [ ] Enable Firestore backups
- [ ] Set up Firebase Monitoring alerts
- [ ] Review and update Firestore security rules
- [ ] Test all payment scenarios (success, failure, refund, dispute)

---

## Commands Reference

```bash
# Firebase
firebase login
firebase init functions
firebase deploy --only functions
firebase functions:log
firebase functions:secrets:set SECRET_NAME
firebase functions:secrets:access SECRET_NAME

# Local Development
npm install
npm run dev
cd firebase-functions && npm run serve

# Build
cd firebase-functions && npm run build
```

---

## Support & Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)

---

## Next Steps

After completing this setup:
1. Test the complete payment flow end-to-end
2. Set up monitoring and alerts
3. Plan for production deployment
4. Document any custom modifications

**You're ready to process payments with MoneyGood! 🚀**
