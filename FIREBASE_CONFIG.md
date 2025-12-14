# Firebase Configuration Guide

This guide will help you configure Firebase for your MoneyGood deployment.

## Why is Firebase Configuration Required?

MoneyGood uses Firebase for:
- **Authentication**: User login and signup
- **Firestore Database**: Storing deals, users, and notifications
- **Cloud Functions**: Backend business logic and Stripe integration
- **Hosting** (optional): For Firebase Hosting deployments

Without proper Firebase configuration, the app will run in limited mode with authentication and deal features unavailable.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or select an existing project
3. Follow the setup wizard:
   - Enter a project name (e.g., "moneygood-production")
   - Choose whether to enable Google Analytics (optional)
   - Accept the terms and create the project

## Step 2: Register Your Web App

1. In the Firebase Console, click on your project
2. Click the **Web icon** (`</>`) to add a web app
3. Register your app:
   - App nickname: "MoneyGood Web App"
   - Check "Also set up Firebase Hosting" if you plan to use Firebase Hosting
   - Click **"Register app"**

## Step 3: Get Your Firebase Configuration

After registering your app, you'll see a configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstu",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Copy these values** - you'll need them in the next step.

## Step 4: Update firebase.js

Open `firebase.js` in the root of the repository and replace the placeholder values with your actual Firebase configuration:

```javascript
// Replace this:
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL",
  authDomain: "moneygood-app.firebaseapp.com",
  projectId: "moneygood-app",
  storageBucket: "moneygood-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// With your actual values:
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstu",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 5: Enable Firebase Authentication

1. In the Firebase Console, go to **Authentication** in the left sidebar
2. Click **"Get started"**
3. Select **"Email/Password"** from the sign-in methods
4. Enable it and click **"Save"**

## Step 6: Set Up Firestore Database

1. In the Firebase Console, go to **Firestore Database** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (security rules are already in the repo)
4. Select a location closest to your users
5. Click **"Enable"**

## Step 7: Deploy Firestore Security Rules

From your project root, run:

```bash
firebase deploy --only firestore:rules
```

This will deploy the security rules from `firestore.rules` in the repository.

## Step 8: Deploy Cloud Functions

1. Install dependencies in the functions directory:

```bash
cd firebase-functions
npm install
cd ..
```

2. Deploy the Cloud Functions:

```bash
firebase deploy --only functions
```

## Step 9: Set Up Stripe (Required for Payments)

Cloud Functions need Stripe API keys to process payments:

1. Get your Stripe API keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Set the Firebase environment variables:

```bash
firebase functions:config:set stripe.secret_key="sk_test_your_stripe_secret_key"
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
firebase functions:config:set stripe.platform_fee="500"
```

3. Redeploy functions to apply the new config:

```bash
firebase deploy --only functions
```

## Step 10: Deploy to Cloudflare Pages

If you're deploying to Cloudflare Pages:

1. Commit your updated `firebase.js` file:

```bash
git add firebase.js
git commit -m "Configure Firebase credentials"
git push
```

2. Cloudflare Pages will automatically redeploy with the new configuration

## Troubleshooting

### Issue: "Firebase configuration contains placeholder values"

**Solution**: Make sure you've replaced ALL the placeholder values in `firebase.js` with your actual Firebase configuration. The `apiKey` field is especially important - it should start with "AIzaSy" and be much longer than the placeholder.

### Issue: "Permission denied" errors in Firestore

**Solution**: 
1. Check that you've deployed the security rules: `firebase deploy --only firestore:rules`
2. Make sure the user is authenticated before trying to access protected data
3. Review the security rules in `firestore.rules`

### Issue: Cloud Functions not working

**Solution**:
1. Make sure you've deployed functions: `firebase deploy --only functions`
2. Check the Firebase Console > Functions for error logs
3. Verify that Stripe environment variables are set correctly
4. Ensure your Firebase project is on the Blaze (pay-as-you-go) plan, as Cloud Functions require it

### Issue: "Module not found" errors

**Solution**:
1. Navigate to `firebase-functions` directory
2. Run `npm install` to install dependencies
3. Try deploying again

## Environment Variables (Alternative Method)

If you prefer to use environment variables instead of hardcoding values in `firebase.js`, you can use Cloudflare Pages environment variables:

1. In Cloudflare Pages dashboard, go to your project
2. Navigate to **Settings → Environment Variables**
3. Add the following variables:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

Note: This requires modifying the build process to inject these variables. For simplicity, direct configuration in `firebase.js` is recommended.

## Security Best Practices

1. **Never commit real API keys to public repositories**
   - For open-source projects, use placeholder values
   - Provide this configuration guide for others to set up their own Firebase project

2. **Use Firebase Security Rules** to protect your data
   - The rules in `firestore.rules` restrict access to authenticated users
   - Review and customize them for your needs

3. **Use Stripe Test Mode** during development
   - Use test API keys (starting with `sk_test_`) for development
   - Switch to live keys only in production

4. **Monitor your Firebase usage**
   - Check the Firebase Console regularly for usage and billing
   - Set up budget alerts in Google Cloud Console

## Getting Help

- **Firebase Documentation**: https://firebase.google.com/docs
- **MoneyGood Repository**: https://github.com/ataymia/MoneyGood
- **Firebase Support**: https://firebase.google.com/support

## Summary Checklist

- [ ] Created Firebase project
- [ ] Registered web app
- [ ] Copied Firebase configuration values
- [ ] Updated `firebase.js` with real values
- [ ] Enabled Email/Password authentication
- [ ] Created Firestore database
- [ ] Deployed Firestore security rules
- [ ] Installed Cloud Functions dependencies
- [ ] Set Stripe environment variables
- [ ] Deployed Cloud Functions
- [ ] Committed and pushed changes
- [ ] Verified the app loads without configuration errors

Once you've completed all these steps, your MoneyGood app should be fully configured and ready to use!
