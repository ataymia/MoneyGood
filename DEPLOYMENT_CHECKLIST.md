# Deployment Checklist

Use this checklist to deploy MoneyGood with proper Stripe + Firebase integration.

## ✅ Pre-Deployment Verification

- [x] All code committed (no hardcoded secrets)
- [x] Firebase Functions build successfully (`npm run build`)
- [x] No TypeScript errors
- [x] `.gitignore` includes `.env`, `firebase-config.js`, etc.
- [x] Documentation created (STRIPE_FIREBASE_SETUP.md)

## 📋 Step-by-Step Deployment

Follow these steps in order:

### 1. Firebase Project Setup

- [ ] Created Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enabled **Authentication** (Email/Password)
- [ ] Created **Firestore Database**
- [ ] Deployed Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deployed Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Copied Firebase config values (apiKey, authDomain, etc.)

### 2. Stripe Account Setup

- [ ] Created/logged into Stripe account at [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Got **Publishable key** (pk_test_... or pk_live_...)
- [ ] Got **Secret key** (sk_test_... or sk_live_...) — KEEP SECURE!

### 3. Cloudflare Pages Environment Variables

- [ ] Logged into [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Navigated to Workers & Pages → MoneyGood → Settings → Environment Variables
- [ ] Added Production variables:
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Redeployed or triggered new deployment

### 4. Firebase Cloud Functions Setup

- [ ] Installed Firebase CLI: `npm install -g firebase-tools`
- [ ] Logged in: `firebase login`
- [ ] Installed dependencies: `cd firebase-functions && npm install`
- [ ] Set Stripe secret key:
  ```bash
  firebase functions:secrets:set STRIPE_SECRET_KEY
  # Pasted sk_test_... or sk_live_...
  ```
- [ ] Built functions: `npm run build`
- [ ] Deployed functions: `firebase deploy --only functions`
- [ ] Copied `stripeWebhook` function URL from deploy output

### 5. Stripe Webhook Configuration

- [ ] Went to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
- [ ] Clicked **Add endpoint**
- [ ] Pasted `stripeWebhook` function URL
- [ ] Selected events:
  - [ ] `checkout.session.completed`
  - [ ] `payment_intent.payment_failed`
  - [ ] `charge.refunded`
  - [ ] `charge.dispute.created`
- [ ] Clicked **Add endpoint**
- [ ] Revealed and copied webhook signing secret (whsec_...)
- [ ] Set webhook secret:
  ```bash
  firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
  # Pasted whsec_...
  ```
- [ ] Redeployed webhook function: `firebase deploy --only functions:stripeWebhook`

### 6. Testing

- [ ] Visited deployed Cloudflare Pages URL
- [ ] Verified no "Firebase Configuration Missing" error
- [ ] Signed up for new account
- [ ] Created a test deal
- [ ] Accepted deal invite (second browser/incognito)
- [ ] Clicked "Pay Setup Fee"
- [ ] Redirected to Stripe Checkout
- [ ] Completed test payment (4242 4242 4242 4242)
- [ ] Redirected back to deal page
- [ ] Verified payment marked complete in UI
- [ ] Checked Stripe webhook received 200 status
- [ ] Checked Firebase Functions logs: `firebase functions:log`
- [ ] Verified Firestore updated with payment data

### 7. Production Readiness (if going live)

- [ ] Switched Stripe to **Live mode**
- [ ] Updated `VITE_STRIPE_PUBLISHABLE_KEY` to `pk_live_...`
- [ ] Updated `STRIPE_SECRET_KEY` to `sk_live_...`
- [ ] Created new production webhook endpoint
- [ ] Updated `STRIPE_WEBHOOK_SECRET` with production secret
- [ ] Tested with real card (refunded immediately)
- [ ] Set up Firebase monitoring alerts
- [ ] Set up Stripe dashboard alerts
- [ ] Reviewed Firestore security rules
- [ ] Enabled Firebase backups

## 🚨 Troubleshooting

### Frontend shows "Firebase Configuration Missing"
→ Check Cloudflare Pages env vars are set correctly  
→ Redeploy after adding variables

### Frontend shows "Stripe is not configured"
→ Check `VITE_STRIPE_PUBLISHABLE_KEY` is set  
→ Verify format: pk_test_* or pk_live_*

### "Payment Checkout Fails"
→ Check Firebase Functions logs: `firebase functions:log`  
→ Verify `STRIPE_SECRET_KEY` secret is set  
→ Ensure deal exists and user is participant

### "Webhook signature verification failed"
→ Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard  
→ Check webhook endpoint URL matches deployed function  
→ Redeploy functions after setting secret

### "Deal doesn't activate after payment"
→ Check webhook logs in Stripe Dashboard  
→ Verify webhook received event with 200 status  
→ Check Firebase Functions logs for errors

## 📚 Resources

- **Complete Guide:** [STRIPE_FIREBASE_SETUP.md](./STRIPE_FIREBASE_SETUP.md)
- **Env Vars Reference:** [ENV_VARS_QUICK_REF.md](./ENV_VARS_QUICK_REF.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## ✅ Deployment Complete

Once all items checked:
- ✅ Frontend deployed to Cloudflare Pages
- ✅ Backend deployed to Firebase Cloud Functions
- ✅ Stripe integrated and tested
- ✅ All environment variables set
- ✅ All secrets configured
- ✅ Webhook endpoint configured
- ✅ End-to-end payment flow tested

**Your MoneyGood application is now live! 🚀**
