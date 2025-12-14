# GitHub Pages Deployment Guide for MoneyGood 🚀

This guide explains how to deploy MoneyGood to **GitHub Pages**. The frontend is hosted on GitHub Pages while the backend uses Firebase services (Auth, Firestore, Functions).

## Why GitHub Pages?

- **Free hosting**: No cost for public repositories
- **Automatic deployment**: Deploy on every push to main
- **Custom domains**: Support for custom domains with HTTPS
- **GitHub integration**: Native integration with GitHub repositories
- **CDN**: Global content delivery via GitHub's infrastructure
- **Simple setup**: No additional account registration needed

## Architecture Overview

```
┌─────────────────────┐
│   GitHub Pages      │  ← Frontend hosting (HTML/CSS/JS)
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

Before deploying to GitHub Pages:

1. ✅ **GitHub account** with this repository
2. ✅ **Firebase project** set up with:
   - Authentication enabled
   - Firestore database created
   - Cloud Functions deployed
   - Blaze (pay-as-you-go) plan active
3. ✅ **Stripe account** configured

## Step-by-Step Deployment

### Step 1: Enable GitHub Pages

#### 1.1 Configure GitHub Pages Settings

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
5. Save the settings

The GitHub Actions workflow (`.github/workflows/deploy-github-pages.yml`) is already configured in this repository and will automatically deploy the `public/` directory.

#### 1.2 Trigger First Deployment

The workflow runs automatically when you:
- Push to the `main` branch
- Manually trigger it from the Actions tab

To trigger manually:
1. Go to **Actions** tab in your repository
2. Click "Deploy to GitHub Pages" workflow
3. Click "Run workflow" → "Run workflow"

Wait for the workflow to complete (usually 30-60 seconds).

#### 1.3 Access Your Site

After deployment completes, your site will be available at:
```
https://yourusername.github.io/MoneyGood/
```

For example: `https://ataymia.github.io/MoneyGood/`

### Step 2: Set Up Firebase Backend

Even though the frontend is on GitHub Pages, you still need Firebase for the backend.

#### 2.1 Create Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize or use existing project
firebase use --add
```

#### 2.2 Deploy Firebase Backend

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

#### 2.3 Configure Stripe Webhook

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
   APP_URL=https://yourusername.github.io/MoneyGood/
   ```
7. Redeploy functions: `firebase deploy --only functions`

### Step 3: Configure Firebase Credentials

#### 3.1 Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Scroll to "Your apps" → Click on your Web app (or create one)
5. Copy the `firebaseConfig` object

#### 3.2 Update Frontend Configuration

Open `public/firebase.js` and replace the placeholder values:

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

#### 3.3 Update Authorized Domains

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your GitHub Pages domain:
   ```
   yourusername.github.io
   ```
3. Save the changes

#### 3.4 Commit and Push Changes

```bash
git add public/firebase.js
git commit -m "Update Firebase configuration"
git push origin main
```

This will trigger the GitHub Actions workflow to redeploy your site with the updated Firebase credentials.

### Step 4: Custom Domain (Optional)

#### 4.1 Add Custom Domain to GitHub Pages

1. In your repository, go to **Settings → Pages**
2. Under "Custom domain", enter your domain (e.g., `app.yourdomain.com`)
3. Click "Save"
4. Wait for DNS check to complete

#### 4.2 Configure DNS

Add one of these DNS records to your domain:

**For subdomain (e.g., app.yourdomain.com):**
```
Type: CNAME
Name: app
Value: yourusername.github.io
```

**For apex domain (e.g., yourdomain.com):**
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

#### 4.3 Enable HTTPS

1. After DNS propagates (can take up to 24 hours)
2. In GitHub Pages settings, check "Enforce HTTPS"
3. GitHub automatically provisions SSL certificate

#### 4.4 Update Firebase and Stripe

After setting up a custom domain:

1. **Firebase Authentication**:
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your custom domain

2. **Stripe Webhook**:
   - Update `firebase-functions/.env`:
     ```env
     APP_URL=https://app.yourdomain.com
     ```
   - Redeploy functions: `firebase deploy --only functions`

## Understanding the GitHub Actions Workflow

The `.github/workflows/deploy-github-pages.yml` file automates deployment:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main        # Triggers on push to main branch
  workflow_dispatch: # Allows manual trigger

permissions:
  contents: read
  pages: write      # Required to deploy to Pages
  id-token: write   # Required for deployment

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './public'  # Deploys from public directory
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

**Key Points:**
- Automatically runs on push to `main` branch
- Can be triggered manually from Actions tab
- Deploys only the `public/` directory
- Uses official GitHub Actions for Pages deployment

## Troubleshooting

### Issue: Site shows README instead of app

**Cause**: GitHub Pages is serving from repository root instead of `public/` directory.

**Solution**:
1. Verify GitHub Pages source is set to "GitHub Actions" (not "Deploy from a branch")
2. Check that `.github/workflows/deploy-github-pages.yml` exists
3. Go to Actions tab and manually trigger "Deploy to GitHub Pages" workflow
4. Wait for workflow to complete successfully

### Issue: "404 There isn't a GitHub Pages site here"

**Causes**:
1. GitHub Pages not enabled
2. Workflow hasn't run yet
3. Deployment failed

**Solutions**:
1. Go to Settings → Pages and verify Pages is enabled
2. Go to Actions tab to check if workflow ran successfully
3. If workflow failed, click on it to view error logs
4. Common fixes:
   - Ensure repository is public OR you have GitHub Pro/Teams/Enterprise
   - Check workflow permissions (Settings → Actions → General → Workflow permissions)
   - Verify `public/` directory exists with `index.html`

### Issue: Blank page / Configuration error

**Cause**: Firebase credentials not configured

**Solutions**:
1. Open browser DevTools (F12) → Console
2. Look for Firebase configuration errors
3. Update `public/firebase.js` with real Firebase credentials
4. Push changes to trigger redeployment
5. Add GitHub Pages domain to Firebase authorized domains

### Issue: "Cannot read properties of undefined (reading 'getAuth')"

**Cause**: Firebase SDK failed to initialize

**Solutions**:
1. Verify `public/firebase.js` has correct Firebase config
2. Check browser console for network errors
3. Ensure Firebase CDN URLs are accessible
4. Try clearing browser cache

### Issue: Authentication doesn't work

**Cause**: GitHub Pages domain not authorized in Firebase

**Solution**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your GitHub Pages domain:
   - For default: `yourusername.github.io`
   - For custom: `app.yourdomain.com`
3. Save and test again

### Issue: Payments fail / Stripe errors

**Causes**:
1. Wrong Stripe keys
2. Webhook not configured
3. Wrong APP_URL in Cloud Functions

**Solutions**:
1. Verify Stripe keys in `firebase-functions/.env`
2. Check Stripe Dashboard → Webhooks for webhook status
3. Verify `APP_URL` matches your GitHub Pages URL
4. Check Cloud Function logs in Firebase Console
5. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to https://YOUR_FUNCTION_URL
   ```

### Issue: Deal updates don't appear

**Causes**:
1. Firestore rules not deployed
2. User not authenticated
3. Network/CORS issues

**Solutions**:
1. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
2. Verify user is logged in (check DevTools → Application → Storage)
3. Check browser console for errors
4. Verify Firestore rules allow read/write for authenticated users

## Continuous Deployment

GitHub Pages automatically redeploys when you push to the `main` branch:

```bash
# Make changes to files in public/
vim public/app.js

# Commit and push
git add .
git commit -m "Update feature"
git push origin main

# GitHub Actions automatically builds and deploys
# Check status at: https://github.com/yourusername/MoneyGood/actions
```

### Preview Deployments

For preview deployments before merging:

1. Create a feature branch:
   ```bash
   git checkout -b feature-branch
   ```

2. Make changes and push:
   ```bash
   git push origin feature-branch
   ```

3. Create a Pull Request on GitHub

4. For PR previews, consider using [Cloudflare Pages](./CLOUDFLARE_DEPLOYMENT.md) which provides automatic preview URLs for each PR

## Performance Tips

### 1. Minimize File Sizes

```bash
# Use minified versions of external libraries
# Current setup already uses CDN-hosted minified versions
```

### 2. Leverage Browser Caching

GitHub Pages automatically sets cache headers for static assets.

### 3. Optimize Images

If you add images:
- Use WebP format when possible
- Compress images before committing
- Consider lazy loading for images below the fold

### 4. Monitor Performance

Use browser DevTools to analyze:
- Network tab: Check file sizes and load times
- Lighthouse: Run performance audits
- Console: Watch for JavaScript errors

## Security Checklist

Before going live:

- [ ] Replace all placeholder Firebase credentials
- [ ] Use Stripe **live keys** (not test keys) in production
- [ ] Add GitHub Pages domain to Firebase authorized domains
- [ ] Enable 2FA on GitHub account
- [ ] Enable 2FA on Firebase account
- [ ] Enable 2FA on Stripe account
- [ ] Review Firestore security rules
- [ ] Test all payment flows end-to-end
- [ ] Verify webhook signature validation
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Test on multiple browsers and devices
- [ ] Review GitHub Actions workflow permissions

## Cost Breakdown

### GitHub Pages (Free)

- ✅ **100GB bandwidth per month** (soft limit)
- ✅ **100GB storage**
- ✅ **10 builds per hour**
- ✅ **Free SSL certificates**
- ✅ **Free for public repositories**

**Notes:**
- Private repositories require GitHub Pro, Teams, or Enterprise
- Soft limits may be enforced for excessive usage
- Generally sufficient for small to medium traffic

**Total**: $0/month for public repos, $4/month for private (GitHub Pro)

### Firebase (Blaze Plan)

See main `DEPLOYMENT.md` for Firebase cost estimates (~$5-20/month for small-medium traffic)

### Stripe

See main `DEPLOYMENT.md` for Stripe fees (2.9% + $0.30 per transaction)

## Comparison: GitHub Pages vs Cloudflare Pages vs Firebase Hosting

| Feature | GitHub Pages | Cloudflare Pages | Firebase Hosting |
|---------|--------------|------------------|------------------|
| **Bandwidth** | 100GB/month | Unlimited | 360MB/day free |
| **Storage** | 100GB | 25,000 files | 10GB |
| **Build minutes** | Varies | 500/month | N/A |
| **Custom domains** | 1 per repo | Unlimited | Unlimited |
| **SSL certificates** | Automatic | Automatic | Automatic |
| **Deploy speed** | ~30-60 sec | ~30-60 sec | ~10-30 sec |
| **Preview deploys** | Via 3rd party | ✅ Per PR | ✅ Per channel |
| **DDoS protection** | Basic | Enterprise-grade | Google-grade |
| **Price** | Free (public) | Free | Free tier smaller |

**Recommendations:**
- **GitHub Pages**: Best for simple projects, open-source, or if already using GitHub
- **Cloudflare Pages**: Best for high traffic or need advanced CDN features
- **Firebase Hosting**: Best for all-in-one Firebase solution

## Migration Between Hosting Options

You can easily switch between hosting providers:

### From Firebase Hosting to GitHub Pages

1. Keep Firebase backend (Auth, Firestore, Functions)
2. Enable GitHub Pages (follow this guide)
3. Test thoroughly on GitHub Pages URL
4. Update DNS if using custom domain
5. Optional: Disable Firebase Hosting

### From GitHub Pages to Cloudflare Pages

1. Keep GitHub repository
2. Connect Cloudflare Pages to same repository
3. Follow [Cloudflare deployment guide](./CLOUDFLARE_DEPLOYMENT.md)
4. Test on Cloudflare Pages URL
5. Update DNS if using custom domain
6. Optional: Disable GitHub Pages

All three options can coexist during migration/testing.

## Support

### Getting Help

- **GitHub Pages**: [GitHub Pages Documentation](https://docs.github.com/en/pages)
- **Firebase issues**: [Firebase Support](https://firebase.google.com/support)
- **Stripe issues**: [Stripe Support](https://support.stripe.com)
- **MoneyGood issues**: [GitHub Issues](https://github.com/ataymia/MoneyGood/issues)

### Useful Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

🎉 **Success!** Your MoneyGood app should now be live on GitHub Pages with Firebase backend!

If you encounter any issues, check the Troubleshooting section above or open an issue on GitHub.
