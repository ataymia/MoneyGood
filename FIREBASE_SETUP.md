# Firebase Configuration Setup

## 🔐 Secure Configuration

Your Firebase API keys are now stored in a separate, gitignored file to prevent them from being committed to version control.

## Setup Steps

### 1. Create Your Config File

The repository includes:
- `firebase-config.template.js` - Template with placeholders (committed to repo)
- `firebase-config.js` - Your actual config with API keys (gitignored, NOT committed)

**The actual `firebase-config.js` has already been created with your credentials.**

### 2. Verify Configuration

Check that `firebase-config.js` exists and contains your Firebase credentials:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyANrK-fg_4sETHFwfBRwlZiT1frtPFATyE",
  authDomain: "moneygoodapp.firebaseapp.com",
  projectId: "moneygoodapp",
  storageBucket: "moneygoodapp.firebasestorage.app",
  messagingSenderId: "87544705244",
  appId: "1:87544705244:web:382997bd0a9dd91a7e0419"
};
```

### 3. Gitignore Status

The `.gitignore` file has been updated to include:
```
firebase-config.js
```

This ensures your API keys will never be committed to the repository.

### 4. For Team Members

When team members clone the repository, they need to:

1. Copy the template:
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```

2. Get Firebase credentials from:
   - Firebase Console > Project Settings > Your apps
   - Or from your team's secure credential storage
   - Or from the `.env.template` file (if shared securely)

3. Update `firebase-config.js` with actual values

## Environment Variables Reference

The `.env.template` file contains your actual Firebase values as a reference for backend configuration. This file is committed to the repo but contains no sensitive data for the backend (Stripe keys remain in separate `.env` files that are gitignored).

## Security Best Practices

✅ **DO:**
- Keep `firebase-config.js` gitignored
- Share credentials securely with team members (password manager, secure vault)
- Use different Firebase projects for development and production
- Rotate API keys if accidentally exposed

❌ **DON'T:**
- Commit `firebase-config.js` to version control
- Share credentials in chat, email, or public channels
- Use production credentials in development
- Hardcode credentials in other files

## Firebase SDK Version

Updated to Firebase SDK v12.7.0 (latest stable version).

## Troubleshooting

### Error: "Cannot find module './firebase-config.js'"

**Solution:** Copy the template and add your credentials:
```bash
cp firebase-config.template.js firebase-config.js
# Then edit firebase-config.js with your Firebase values
```

### Error: "Firebase configuration contains placeholder values"

**Solution:** Update `firebase-config.js` with actual Firebase credentials from the Firebase Console.

### Checking if Config is Loaded

Open browser console and look for:
- ✅ `Firebase initialized successfully` - Config loaded correctly
- ⚠️ `Firebase configuration error` - Config has placeholder values or is missing

## Production Deployment

For production deployments (Cloudflare Pages, GitHub Pages, etc.):

1. **Frontend:** The `firebase-config.js` file must be included in the deployment. Make sure your build process includes it.

2. **Backend (Firebase Functions):** Environment variables are set via:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_..." stripe.webhook_secret="whsec_..."
   ```

3. **Cloudflare Pages:** You may need to add Firebase config as environment variables in the Cloudflare dashboard if using serverless functions there.

## Summary

- ✅ Firebase config moved to separate gitignored file
- ✅ Template file available for team members
- ✅ Your actual credentials are already configured
- ✅ SDK updated to v12.7.0
- ✅ No API keys in repository code
