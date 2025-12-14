# Cloudflare Pages Setup Guide

## Quick Setup

### Cloudflare Pages Settings

When setting up your Cloudflare Pages project, use these exact settings:

```
Framework preset: None
Build command: (leave empty)
Build output directory: / (root)
Root directory: (leave empty or /)
```

### Why These Settings?

- **No build needed**: This is a pure static site with vanilla JavaScript
- **Root directory**: All frontend files are in the repository root
- **Hash routing**: The app uses hash-based routing (`#/app`, `#/deal/123`), so no server-side redirects are needed

## Key Files

### `_routes.json`

This file tells Cloudflare Pages which files are static assets that should be served directly:

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

**Purpose**: Ensures proper caching and prevents Cloudflare from treating static assets as dynamic routes.

### `_headers`

Sets security headers and caching policies for the deployed site.

### `/firebase-functions/` Directory

**Important**: This directory contains Firebase Cloud Functions (backend). It is **NOT** Cloudflare Pages Functions.

The directory is named `firebase-functions` (instead of `functions`) to prevent Cloudflare from attempting to build it as Pages Functions during deployment.

## How Routing Works

MoneyGood uses **hash-based routing**, which means:

- Routes look like: `https://yoursite.com/#/app`, `https://yoursite.com/#/deal/123`
- No server-side redirects needed
- All navigation is client-side via JavaScript
- Deep linking works automatically (refreshing `/#/deal/123` always loads)
- No 404 errors on routes because the browser never sends the hash to the server

### Example Routes

- Landing: `https://yoursite.com/` or `https://yoursite.com/#/`
- Login: `https://yoursite.com/#/login`
- Dashboard: `https://yoursite.com/#/app`
- Deal detail: `https://yoursite.com/#/deal/abc123`
- Settings: `https://yoursite.com/#/settings`
- Join deal: `https://yoursite.com/#/join/token123`

All these routes work without any special server configuration!

## Deployment Checklist

Before deploying to Cloudflare Pages:

- [ ] Update `firebase.js` with your actual Firebase credentials
- [ ] Deploy Firebase Cloud Functions: `cd firebase-functions && npm run build && cd .. && firebase deploy --only functions`
- [ ] Configure Stripe webhook to point to your Cloud Function URL
- [ ] Add your Cloudflare Pages domain to Firebase authorized domains
- [ ] Push to GitHub (triggers automatic Cloudflare deployment)

## Common Issues

### Issue: "No routes found when building Functions directory"

**Status**: ✅ Fixed

**Explanation**: Previously, the repo had a `/functions` directory which Cloudflare detected as Pages Functions. We renamed it to `/firebase-functions` to avoid this detection.

### Issue: "Infinite redirect loop" or "_redirects file ignored"

**Status**: ✅ Fixed

**Explanation**: The old `_redirects` file had a catch-all rule `/* /index.html 200` which Cloudflare flagged as an infinite loop. We removed this file because hash-based routing doesn't need server-side redirects.

### Issue: Routes return 404

**Status**: ✅ Fixed

**Explanation**: Hash-based routing eliminates this issue entirely. Routes like `/app` don't exist on the server - they're `/#/app` which means the browser loads `index.html` and the JavaScript router handles the `#/app` part.

## Testing After Deployment

After deploying, test these scenarios:

1. ✅ Visit `/` - should load landing page
2. ✅ Visit `/#/app` - should load dashboard (after login)
3. ✅ Visit `/#/deal/anything` - should load deal page (router handles it)
4. ✅ Refresh on any route - should work without 404
5. ✅ Share deep link like `https://yoursite.com/#/deal/123` - should load correctly
6. ✅ Static assets (JS, CSS) load normally

## Backend Configuration

The backend runs on Firebase (separate from Cloudflare):

- **Firebase Auth**: User authentication
- **Cloud Firestore**: Database
- **Cloud Functions**: API endpoints and Stripe webhooks
- **Stripe**: Payment processing

Configure these in `firebase.js` and `firebase-functions/.env`.

## Need Help?

See the complete deployment guide in [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md).
