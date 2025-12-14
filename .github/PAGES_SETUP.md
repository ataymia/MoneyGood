# GitHub Pages Quick Setup Guide

This repository is configured to automatically deploy to GitHub Pages. Follow these steps to get your site live:

## Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Build and deployment":
   - **Source**: Select **"GitHub Actions"** (not "Deploy from a branch")
4. That's it! No need to click Save - it's automatic

## Step 2: Trigger Deployment

The workflow automatically runs when you push to `main`. To trigger it manually:

1. Go to **Actions** tab in your repository
2. Click **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait 30-60 seconds for completion

## Step 3: Access Your Site

After the workflow completes:
- Your site will be live at: `https://yourusername.github.io/MoneyGood/`
- Replace `yourusername` with your actual GitHub username

## Step 4: Configure Firebase (Important!)

The site won't work until you configure Firebase:

1. Edit `public/firebase.js` with your Firebase credentials
2. Go to Firebase Console → Authentication → Settings → Authorized domains
3. Add your GitHub Pages domain: `yourusername.github.io`
4. Commit and push changes to trigger redeployment

## Troubleshooting

**Site shows README instead of app:**
- Verify GitHub Pages source is set to "GitHub Actions" (not "Deploy from a branch")
- Check Actions tab to see if workflow ran successfully

**Blank page or configuration error:**
- Update `public/firebase.js` with real Firebase credentials
- Check browser console (F12) for errors

**404 error:**
- Wait a few minutes after first deployment
- Check that workflow completed successfully in Actions tab

## Need More Help?

See the full guide: [GITHUB_PAGES_DEPLOYMENT.md](../GITHUB_PAGES_DEPLOYMENT.md)
