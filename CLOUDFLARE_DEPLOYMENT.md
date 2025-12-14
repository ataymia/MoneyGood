# Cloudflare Pages Deployment Guide for MoneyGood 🚀

This guide explains how to deploy MoneyGood to **Cloudflare Pages** instead of Firebase Hosting. While the backend still uses Firebase services (Auth, Firestore, Functions), the frontend can be hosted on Cloudflare Pages for better global performance and DDoS protection.

## Why Cloudflare Pages?

- **Global CDN**: 200+ locations worldwide
- **Automatic HTTPS**: Free SSL certificates
- **Unlimited bandwidth**: No bandwidth limits on Free tier
- **Fast builds**: Quick deployment times
- **DDoS protection**: Built-in security
- **Git integration**: Auto-deploy on push

## Architecture Overview

```
┌─────────────────────┐
│  Cloudflare Pages   │  ← Frontend hosting (HTML/CSS/JS)
│  (Static Frontend)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Firebase Backend  │  ← Authentication, Database, Functions
│ • Auth              │
│ • Firestore         │
│ • Cloud Functions   │
│ • Stripe Integration│
└─────────────────────┘
```

## Prerequisites

Before deploying to Cloudflare Pages:

1. ✅ **GitHub account** with this repository
2. ✅ **Cloudflare account** (free tier works)
3. ✅ **Firebase project** set up with:
   - Authentication enabled
   - Firestore database created
   - Cloud Functions deployed
   - Blaze (pay-as-you-go) plan active
4. ✅ **Stripe account** configured

## Step-by-Step Deployment

### Step 1: Set Up Firebase Backend

Even though the frontend is on Cloudflare, you still need Firebase for the backend.

#### 1.1 Create Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize or use existing project
firebase use --add
```

#### 1.2 Deploy Firebase Backend

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Install and build Cloud Functions
cd functions
npm install
npm run build
cd ..

# Deploy Cloud Functions
firebase deploy --only functions
```

**Important**: Note down your Cloud Functions URLs from the deployment output. You'll need these for Stripe webhooks.

#### 1.3 Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your Cloud Function URL:
   ```
   https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
4. Select event: `checkout.session.completed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add to `firebase-functions/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   APP_URL=https://your-site.pages.dev
   ```
7. Redeploy functions: `firebase deploy --only functions`

### Step 2: Configure Firebase Credentials

#### 2.1 Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Scroll to "Your apps" → Click on your Web app (or create one)
5. Copy the `firebaseConfig` object

#### 2.2 Update Frontend Configuration

Open `firebase.js` in the root directory and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",                    // ← Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**⚠️ Security Note**: These values are safe to expose in client-side code. Firebase uses security rules to protect your data, not API key secrecy.

**Alternative**: Use environment variables (see Step 3.3 below).

### Step 3: Deploy to Cloudflare Pages

#### 3.1 Connect Repository to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** in the left sidebar
3. Click **Create a project**
4. Click **Connect to Git**
5. Select **GitHub** and authorize Cloudflare
6. Choose the `MoneyGood` repository
7. Click **Begin setup**

#### 3.2 Configure Build Settings

Use these settings in the Cloudflare Pages setup:

| Setting | Value |
|---------|-------|
| **Framework preset** | None |
| **Project name** | `moneygood` (or your preferred name) |
| **Production branch** | `main` |
| **Build command** | *Leave empty* (no build needed) |
| **Build output directory** | `/` (root directory) |
| **Root directory** | *Leave empty or `/`* |

**Important Notes:**
- The site files are in the root directory for Cloudflare Pages deployment
- This app uses **hash-based routing** (`#/app`, `#/deal/123`), so no server-side redirects are needed
- The `_routes.json` file tells Cloudflare which files are static assets (JS, CSS, images)
- The `/firebase-functions` directory contains Firebase Cloud Functions (backend) - NOT Cloudflare Pages Functions

#### 3.3 Add Environment Variables (Optional)

If you want to use environment variables instead of hardcoding Firebase config:

1. In Cloudflare Pages project settings, go to **Settings → Environment variables**
2. Add these variables:
   - `FIREBASE_API_KEY`: Your Firebase API key
   - `FIREBASE_AUTH_DOMAIN`: Your auth domain
   - `FIREBASE_PROJECT_ID`: Your project ID
   - `FIREBASE_STORAGE_BUCKET`: Your storage bucket
   - `FIREBASE_MESSAGING_SENDER_ID`: Your sender ID
   - `FIREBASE_APP_ID`: Your app ID

3. Update `firebase.js` (in root) to use environment variables (requires a build step):

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.FIREBASE_APP_ID
};
```

**Note**: This requires a bundler like Vite or Webpack. For simplicity, we recommend hardcoding the config values in `firebase.js` as they're not sensitive.

#### 3.4 Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete (usually 30-60 seconds)
3. Your site will be live at: `https://moneygood.pages.dev`

### Step 4: Custom Domain (Optional)

#### 4.1 Add Custom Domain

1. In Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (automatic)

#### 4.2 Update Firebase and Stripe

After setting up a custom domain, update these configurations:

1. **Firebase Authentication**:
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your custom domain

2. **Stripe Webhook**:
   - If your app URL changed, update `firebase-functions/.env`:
     ```env
     APP_URL=https://app.yourdomain.com
     ```
   - Redeploy functions: `firebase deploy --only functions`

## Configuration Files

MoneyGood includes Cloudflare-specific configuration files in the root directory:

### `_routes.json`

Tells Cloudflare Pages which files are static assets (should be served directly) vs dynamic routes (should be handled by the SPA):

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": [
    "/api.js",
    "/app.js",
    "/firebase.js",
    "/router.js",
    "/store.js",
    "/styles.css",
    "/ui/*",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.gif",
    "/*.svg",
    "/*.ico",
    "/*.webp",
    "/*.woff",
    "/*.woff2",
    "/*.ttf",
    "/*.eot"
  ]
}
```

**Why this file exists:** This prevents Cloudflare from trying to serve static assets as dynamic routes and ensures proper caching.

**Note on Routing:** MoneyGood uses **hash-based routing** (`#/app`, `#/deal/123`, etc.), which means:
- No server-side redirects are needed
- All routes work without special configuration
- Deep linking works automatically (e.g., sharing `https://yoursite.com/#/deal/123` works perfectly)
- Page refreshes always load `index.html`, and the JavaScript router handles the hash

### `_headers`

Sets security headers and caching policies:

```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Cache-Control: no-cache, no-store, must-revalidate

/*.js
  Cache-Control: public, max-age=31536000, immutable
```

### `/firebase-functions` Directory

**Important:** This directory contains Firebase Cloud Functions for the backend (Auth, Firestore, Stripe webhooks). This is **NOT** Cloudflare Pages Functions.

The directory is named `firebase-functions` (not `functions`) to prevent Cloudflare from attempting to build it as Pages Functions during deployment. Cloudflare should only serve the static frontend files.

## Troubleshooting

### Issue: "Cannot see the site" / Blank page

**Symptoms**: Site loads but shows configuration error or blank page

**Causes**:
1. Using placeholder Firebase credentials
2. Firebase config not updated
3. JavaScript errors preventing app initialization

**Solutions**:

1. **Check Firebase config**:
   - Open browser DevTools (F12) → Console
   - Look for Firebase configuration errors
   - Verify you've replaced placeholder values in `firebase.js`

2. **Verify Firebase credentials**:
   ```javascript
   // ❌ BAD - Placeholder values
   apiKey: "AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL"
   
   // ✅ GOOD - Real values
   apiKey: "AIzaSyBn3xK..."
   ```

3. **Check browser console**:
   - Open DevTools → Console
   - Look for error messages
   - Common errors:
     - `Firebase: Error (auth/invalid-api-key)` → Update Firebase config
     - `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT` → Ad blocker interfering
     - CORS errors → Check Firebase Functions deployment

4. **Test Firebase connection**:
   - Open DevTools → Console
   - Run: `firebase.auth().currentUser`
   - Should return `null` or user object (not an error)

### Issue: "Firebase is not defined"

**Cause**: Firebase SDK failed to load from CDN

**Solutions**:
1. Check internet connection
2. Verify CDN URLs in `firebase.js` are correct
3. Check if firewall/ad blocker is blocking `gstatic.com`

### Issue: Authentication doesn't work

**Cause**: Domain not authorized in Firebase

**Solution**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Cloudflare Pages domain (e.g., `moneygood.pages.dev`)
3. If using custom domain, add that too

### Issue: Cloud Functions return CORS errors

**Cause**: Cloud Functions not configured for Cloudflare domain

**Solution**:
1. In `firebase-functions/src/index.ts`, verify CORS configuration allows your domain
2. Add your Cloudflare domain to allowed origins
3. Redeploy functions: `firebase deploy --only functions`

### Issue: Payments fail silently

**Causes**:
1. Stripe webhook not configured
2. Wrong webhook secret in `firebase-functions/.env`
3. Cloud Functions not deployed

**Solutions**:
1. Check Stripe Dashboard → Webhooks → View events
2. Verify webhook URL matches deployed Cloud Function
3. Check Cloud Function logs in Firebase Console → Functions → Logs
4. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to https://YOUR_FUNCTION_URL
   ```

### Issue: Deals don't load / Firestore errors

**Causes**:
1. Firestore rules not deployed
2. Firestore indexes not created
3. User not authenticated

**Solutions**:
1. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
2. Check Firebase Console → Firestore → Indexes
3. Verify user is logged in before accessing deals

## Continuous Deployment

Cloudflare Pages automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Cloudflare automatically builds and deploys
# Check status at: https://dash.cloudflare.com/pages
```

### Preview Deployments

Every pull request gets a preview deployment:

1. Create a branch: `git checkout -b feature-branch`
2. Push changes: `git push origin feature-branch`
3. Create PR on GitHub
4. Cloudflare creates preview deployment
5. Preview URL: `https://abc123.moneygood.pages.dev`

## Performance Optimization

### Enable Cloudflare Features

1. **Cloudflare Analytics**:
   - Go to your Cloudflare dashboard
   - View traffic, performance metrics, and visitor insights

2. **Web Analytics** (privacy-friendly):
   - Pages → Your project → Web Analytics
   - Add analytics snippet to `index.html` (optional)

3. **Argo Smart Routing** (paid):
   - Reduces latency by routing traffic through fastest paths
   - ~$5/month + $0.10/GB

### Optimize Assets

1. **Enable minification** (automatic in Cloudflare)
2. **Use image CDN** for user-uploaded content
3. **Lazy load** Firebase SDK if not needed immediately

## Security Checklist

Before going live:

- [ ] Replace all placeholder Firebase credentials
- [ ] Use Stripe **live keys** (not test keys) in production
- [ ] Add custom domain to Firebase authorized domains
- [ ] Enable 2FA on Cloudflare account
- [ ] Enable 2FA on Firebase account
- [ ] Enable 2FA on Stripe account
- [ ] Review Firestore security rules
- [ ] Test all payment flows end-to-end
- [ ] Verify webhook signature validation
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure Content Security Policy headers
- [ ] Test on multiple browsers and devices

## Cost Breakdown

### Cloudflare Pages (Free Tier)

- ✅ **Unlimited bandwidth**
- ✅ **Unlimited requests**
- ✅ **500 builds per month**
- ✅ **Free SSL certificates**
- ✅ **Free DDoS protection**
- 💰 **Beyond free tier**: Argo ~$5/month (optional)

**Total**: $0/month (free tier is generous)

### Firebase (Blaze Plan)

See main `DEPLOYMENT.md` for Firebase cost estimates (~$5-20/month for small-medium traffic)

### Stripe

See main `DEPLOYMENT.md` for Stripe fees (2.9% + $0.30 per transaction)

## Comparison: Cloudflare Pages vs Firebase Hosting

| Feature | Cloudflare Pages | Firebase Hosting |
|---------|------------------|------------------|
| **Bandwidth** | Unlimited | 360MB/day free, then $0.15/GB |
| **Build minutes** | 500/month | N/A (no build system) |
| **Custom domains** | Unlimited | Unlimited |
| **SSL certificates** | Automatic | Automatic |
| **Global CDN** | 200+ locations | 180+ locations |
| **Deploy speed** | ~30-60 seconds | ~10-30 seconds |
| **Preview deploys** | ✅ Per PR | ✅ Per channel |
| **Rollback** | ✅ One click | ✅ Firebase CLI |
| **Analytics** | ✅ Built-in | ✅ Built-in |
| **DDoS protection** | ✅ Enterprise-grade | ✅ Google-grade |
| **Price** | Free tier generous | Free tier smaller |

**Recommendation**: Use Cloudflare Pages if you have high traffic or want to minimize costs. Use Firebase Hosting if you prefer an all-in-one Firebase solution.

## Migration from Firebase Hosting

Already deployed to Firebase Hosting? Here's how to migrate:

1. **Keep Firebase backend** (don't redeploy functions)
2. **Deploy frontend to Cloudflare** (follow steps above)
3. **Update DNS** to point to Cloudflare
4. **Test thoroughly** before switching production traffic
5. **Update Firebase authorized domains**
6. **Optional**: Disable Firebase Hosting to save costs

You can run both simultaneously during migration.

## Support

### Getting Help

- **Firebase issues**: [Firebase Support](https://firebase.google.com/support)
- **Cloudflare issues**: [Cloudflare Community](https://community.cloudflare.com/)
- **Stripe issues**: [Stripe Support](https://support.stripe.com)
- **MoneyGood issues**: [GitHub Issues](https://github.com/ataymia/MoneyGood/issues)

### Useful Links

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

🎉 **Success!** Your MoneyGood app should now be live on Cloudflare Pages with Firebase backend!

If you see a configuration error page, follow the instructions shown to update your Firebase credentials.
