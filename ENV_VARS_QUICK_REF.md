# Environment Variables Quick Reference

## Frontend (Cloudflare Pages) — `VITE_*` Variables

Set these in **Cloudflare Pages Dashboard → Settings → Environment Variables**:

```bash
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc...

# Stripe (from Stripe Dashboard → API Keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_... for production
```

**Note:** These are safe to expose in the browser (frontend-only, no secrets).

---

## Backend (Firebase Cloud Functions) — Runtime Config

Set these via **Firebase CLI** (NOT in Cloudflare):

```bash
# Stripe Secret Key (from Stripe Dashboard → API Keys)
firebase functions:config:set stripe.secret="sk_test_..."
# For production: stripe.secret="sk_live_..."

# Stripe Webhook Secret (from Stripe Dashboard → Webhooks → Endpoint)
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

**Note:** 
- These are server-only secrets, never exposed to the frontend
- Using `functions.config()` to avoid billing requirements (Secret Manager needs billing)
- Runtime config is [scheduled for deprecation in March 2026](https://firebase.google.com/docs/functions/config-env)
- Consider migrating to Secret Manager or environment variables before then

---

## Local Development (Optional)

Create a `.env` file in the repo root (DO NOT commit):

```bash
# Copy from .env.example
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Run: `npm run dev` (Vite automatically loads `.env`)

---

## Verification

### Check Frontend Config
1. Open browser console on your deployed site
2. Look for: `✅ Firebase initialized successfully from environment variables`
3. Look for: `✅ Stripe initialized successfully from environment variables`

### Check Backend Config
```bash
firebase functions:config:get
```

You should see:
```json
{
  "stripe": {
    "secret": "sk_test_...",
    "webhook_secret": "whsec_..."
  }
}
```

### Check Deployment
```bash
# View deployed function URLs
firebase functions:list

# Check logs
firebase functions:log
```

---

## Quick Commands

```bash
# Set runtime config
firebase functions:config:set stripe.secret="sk_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# View config
firebase functions:config:get

# Deploy functions
cd firebase-functions
npm run build
firebase deploy --only functions

# View logs
firebase functions:log --only stripeWebhook
```

---

## Where to Get Values

| Variable/Secret | Source |
|----------------|--------|
| `VITE_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps → Web app config |
| `VITE_STRIPE_PUBLISHABLE_KEY` | [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys → Publishable key |
| `stripe.secret` | [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys → Secret key |
| `stripe.webhook_secret` | [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks → [Your endpoint] → Signing secret |

---

## Production Checklist

Before going live:

- [ ] Switch Stripe to **Live mode** (toggle in Stripe Dashboard)
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` to `pk_live_...`
- [ ] Update runtime config: `firebase functions:config:set stripe.secret="sk_live_..."`
- [ ] Create new webhook endpoint for production
- [ ] Update runtime config: `firebase functions:config:set stripe.webhook_secret="whsec_..."`
- [ ] Test payment flow with real card (then refund)
- [ ] Monitor Firebase Functions logs
- [ ] Monitor Stripe Dashboard for successful payments

---

For complete setup instructions, see **[STRIPE_FIREBASE_SETUP.md](./STRIPE_FIREBASE_SETUP.md)**
