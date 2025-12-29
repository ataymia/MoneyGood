/**
 * Runtime Environment Configuration
 * 
 * This file provides environment variables at runtime for static deployments
 * (without Vite build step). It works on Cloudflare Pages, GitHub Pages, etc.
 * 
 * HOW IT WORKS:
 * 1. For local dev: Set window.__ENV__ directly in this file or use .env loading
 * 2. For Cloudflare Pages: The build script (scripts/generate-env.sh) generates 
 *    this file with actual env var values during the build process
 * 3. The app reads from window.__ENV__ instead of import.meta.env
 * 
 * IMPORTANT: This file should NOT contain real secrets in the committed version.
 * Real values are injected during the Cloudflare Pages build process.
 */

(function() {
  'use strict';
  
  // Runtime environment configuration
  // These values are replaced during Cloudflare Pages build
  window.__ENV__ = window.__ENV__ || {
    // Firebase Configuration
    VITE_FIREBASE_API_KEY: '%%VITE_FIREBASE_API_KEY%%',
    VITE_FIREBASE_AUTH_DOMAIN: '%%VITE_FIREBASE_AUTH_DOMAIN%%',
    VITE_FIREBASE_PROJECT_ID: '%%VITE_FIREBASE_PROJECT_ID%%',
    VITE_FIREBASE_STORAGE_BUCKET: '%%VITE_FIREBASE_STORAGE_BUCKET%%',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '%%VITE_FIREBASE_MESSAGING_SENDER_ID%%',
    VITE_FIREBASE_APP_ID: '%%VITE_FIREBASE_APP_ID%%',
    
    // Stripe Configuration
    VITE_STRIPE_PUBLISHABLE_KEY: '%%VITE_STRIPE_PUBLISHABLE_KEY%%',
  };
  
  // Check if placeholders were replaced (for debugging)
  const hasPlaceholders = Object.values(window.__ENV__).some(v => 
    typeof v === 'string' && v.startsWith('%%') && v.endsWith('%%')
  );
  
  if (hasPlaceholders) {
    console.warn('[env-config] Environment variables contain placeholders.');
    console.warn('[env-config] If running locally, create env-config.local.js with your values.');
    console.warn('[env-config] If on Cloudflare Pages, check the build script ran correctly.');
  } else {
    console.log('[env-config] Environment configuration loaded successfully');
  }
})();
