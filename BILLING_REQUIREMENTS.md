# Firebase Functions Deployment Requirements

## Status: Code Updated Successfully ✅

All code has been updated to use `functions.config()` instead of Secret Manager to avoid Secret Manager billing requirements. However, deployment still requires billing to be enabled on the Firebase project.

## What Was Changed

✅ **Removed Secret Manager Usage:**
- Removed `defineSecret` from `firebase-functions/params`
- Removed `{ secrets: [...] }` from function options
- Switched to `functions.config()` for all Stripe credentials

✅ **Updated Code:**
- `firebase-functions/src/stripe.ts` — Uses `functions.config().stripe.secret` and `functions.config().stripe.webhook_secret`
- `firebase-functions/src/index.ts` — Webhook uses v1 `functions.https.onRequest` (not v2)
- All documentation updated to use runtime config commands

## Current Deployment Issue

The deployment error is **NOT** related to Secret Manager:

```
Error: Write access to project 'moneygoodapp' was denied: 
please check billing account associated and retry
```

This is a different billing requirement — **Firebase Cloud Functions requires billing** to deploy any functions, regardless of Secret Manager usage.

## What This Means

1. ✅ **Secret Manager billing NOT required** — Code no longer uses Secret Manager
2. ❌ **Cloud Functions billing IS required** — Firebase requires billing to deploy any functions
3. **Solution:** Enable billing on the Firebase project at [Firebase Console → Billing](https://console.firebase.google.com/project/moneygoodapp/settings/billing)

## Billing Plans

### Spark Plan (Free Tier)
- **Cloud Functions:** Limited free tier (125K invocations/month, 40K GB-seconds, 40K CPU-seconds)
- **Cost:** Free up to limits, pay-as-you-go after
- **Requires:** Credit card on file, but won't charge unless you exceed free tier

### Blaze Plan (Pay-as-you-go)
- **Required for:** Any Cloud Functions deployment
- **Free tier included:** Same as Spark Plan
- **Cost after free tier:** ~$0.40 per million invocations + compute costs
- **Typical small app:** Often stays within free tier

## Next Steps

1. **Enable Billing on Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select project "moneygoodapp"
   - Go to Settings → Billing
   - Upgrade to Blaze (pay-as-you-go) plan
   - Add payment method

2. **Deploy Functions:**
   ```bash
   cd firebase-functions
   firebase deploy --only functions
   ```

3. **Monitor Usage:**
   - Check Firebase Console → Functions → Usage tab
   - Set up budget alerts in Google Cloud Console
   - Most small apps stay within free tier

## Alternative: No Backend Option

If you don't want to enable billing, you would need to:
- Remove all Firebase Cloud Functions
- Use client-side Stripe integration only (less secure, limited functionality)
- Move backend logic to another platform (Cloudflare Workers with paid plan, AWS Lambda, etc.)

## Summary

✅ Code is ready — Secret Manager removed  
✅ Runtime config set — `stripe.secret` and `stripe.webhook_secret`  
❌ Billing required — Cloud Functions needs Blaze plan  
✅ Documentation updated — All docs reflect runtime config approach

**The code changes are complete and correct. The only remaining step is enabling billing on the Firebase project to deploy functions.**
