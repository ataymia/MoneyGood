# MoneyGood Deployment Guide 🚀

Quick reference for deploying MoneyGood to production.

## Pre-Deployment Checklist

### 1. Firebase Project Setup
- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enable Authentication (Email/Password)
- [ ] Create Firestore database
- [ ] Upgrade to Blaze plan (required for Cloud Functions)
- [ ] Enable Firebase Hosting

### 2. Stripe Setup
- [ ] Create Stripe account at [stripe.com](https://stripe.com)
- [ ] Get API keys (Dashboard > Developers > API keys)
- [ ] Enable Stripe Connect (Dashboard > Connect > Get started)
- [ ] Note down your test keys for development
- [ ] Note down your live keys for production

### 3. Configuration

#### A. Frontend Configuration
Edit `public/firebase.js` and replace placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Get these from: Firebase Console > Project Settings > General > Your apps > Web app

#### B. Backend Configuration
Create `functions/.env` file:

```env
STRIPE_SECRET_KEY=sk_live_your_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
APP_URL=https://your-project-id.web.app
```

⚠️ Use test keys (sk_test_...) for development, live keys (sk_live_...) for production

### 4. Install Dependencies

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 5. Update Firebase Project

```bash
# Set your Firebase project
firebase use your-project-id

# Or create new project alias
firebase use --add
```

## Deployment Steps

### Step 1: Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

✅ Verify: Check Firebase Console > Firestore > Rules

### Step 2: Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

⏱️ This may take 5-10 minutes

✅ Verify: Check Firebase Console > Functions > Dashboard

### Step 3: Deploy Frontend (Hosting)

```bash
firebase deploy --only hosting
```

✅ Verify: Visit your hosting URL (shown in deployment output)

### Step 4: Complete Deployment

```bash
# Deploy everything at once (alternative)
firebase deploy
```

## Post-Deployment Configuration

### 1. Set Up Stripe Webhook

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL:
   ```
   https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook
   ```
   (Find exact URL in Firebase Console > Functions > stripeWebhook)
4. Select events to listen to:
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the webhook signing secret (starts with `whsec_`)
7. Update `functions/.env` with this secret
8. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

### 2. Test the Application

1. Visit your hosting URL
2. Create a test account
3. Create a test deal
4. Use [Stripe test cards](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future date for expiry
   - Any 3 digits for CVC
   - Any 5 digits for ZIP

### 3. Set Up Monitoring

1. **Firebase Console**:
   - Functions > Logs (monitor execution)
   - Firestore > Usage (track reads/writes)
   - Hosting > Usage (track traffic)

2. **Stripe Dashboard**:
   - Developers > Webhooks (verify delivery)
   - Payments (monitor transactions)
   - Connect > Accounts (track onboarding)

## Environment-Specific Deployments

### Development

```bash
# Use test Stripe keys in functions/.env
STRIPE_SECRET_KEY=sk_test_...

# Deploy to development project
firebase use dev
firebase deploy
```

### Production

```bash
# Use live Stripe keys in functions/.env
STRIPE_SECRET_KEY=sk_live_...

# Deploy to production project
firebase use production
firebase deploy
```

## Rollback

If deployment fails or has issues:

```bash
# Rollback hosting
firebase hosting:rollback

# For functions, redeploy previous version from git
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

## Common Issues

### Issue: "Insufficient permissions"
**Solution**: Ensure you're on Blaze plan and have billing enabled

### Issue: "Function deployment failed"
**Solution**: 
```bash
cd functions
npm install
npm run build
# Check for TypeScript errors
cd ..
firebase deploy --only functions --debug
```

### Issue: "Stripe webhook not working"
**Solution**: 
1. Verify webhook URL matches deployed function
2. Check webhook secret in functions/.env
3. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to https://YOUR_FUNCTION_URL
   ```

### Issue: "Firebase config not working"
**Solution**: Clear browser cache and verify config values in `public/firebase.js`

## Performance Optimization

### 1. Enable Firestore Indexes
All required indexes are in `firestore.indexes.json` and automatically deployed

### 2. Cache Firestore Queries
The app uses Firestore snapshots which benefit from automatic caching

### 3. Optimize Cloud Functions
- Functions use Node 20 runtime (fastest)
- Consider increasing memory for high-traffic functions:
  ```typescript
  export const functionName = functions
    .runWith({ memory: '512MB' })
    .https.onCall(...)
  ```

## Cost Estimates

Based on Firebase and Stripe pricing:

### Firebase (Blaze Plan)
- **Free tier includes**:
  - 50K function invocations/day
  - 10GB storage
  - 360MB/day hosting transfer
  - 50K Firestore reads/day

- **Beyond free tier** (typical startup):
  - Functions: ~$0.40 per 1M invocations
  - Firestore: ~$0.06 per 100K reads
  - Hosting: ~$0.15 per GB
  - **Estimated**: $5-20/month for small-medium traffic

### Stripe
- **Standard fees**:
  - 2.9% + $0.30 per successful card charge
  - No monthly fee
  - Connect: Additional 0.25% per transaction

## Security Checklist

Before going live:

- [ ] Replace all placeholder Firebase credentials
- [ ] Use live Stripe keys (not test keys)
- [ ] Enable 2FA on Firebase account
- [ ] Enable 2FA on Stripe account
- [ ] Review and test Firestore security rules
- [ ] Set up Firebase App Check (optional, but recommended)
- [ ] Configure CORS if needed
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Review Cloud Function permissions
- [ ] Test all payment flows end-to-end
- [ ] Verify webhook signature validation

## Support

For deployment issues:
- Firebase: [firebase.google.com/support](https://firebase.google.com/support)
- Stripe: [support.stripe.com](https://support.stripe.com)
- GitHub Issues: [github.com/ataymia/MoneyGood/issues](https://github.com/ataymia/MoneyGood/issues)

---

🎉 **Congratulations!** Your MoneyGood app is now live!
