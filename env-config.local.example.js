/**
 * Local Development Environment Configuration
 * 
 * Copy this file to env-config.local.js and fill in your values.
 * The .local.js file is gitignored and won't be committed.
 * 
 * For Cloudflare Pages deployment, set these as environment variables
 * in the Cloudflare Pages dashboard - they'll be injected at build time.
 */

(function() {
  'use strict';
  
  window.__ENV__ = {
    // Firebase Configuration (from Firebase Console → Project Settings → Your apps)
    VITE_FIREBASE_API_KEY: 'YOUR_FIREBASE_API_KEY',
    VITE_FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'your-project-id',
    VITE_FIREBASE_STORAGE_BUCKET: 'your-project.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
    VITE_FIREBASE_APP_ID: '1:123456789012:web:abc123',
    
    // Stripe Configuration (from Stripe Dashboard → Developers → API keys)
    VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
  };
  
  console.log('[env-config.local] Local environment configuration loaded');
})();
