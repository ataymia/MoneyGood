/**
 * Firebase Client - Environment Variable Configuration
 * 
 * This module initializes Firebase using environment variables from Cloudflare Pages.
 * It provides a centralized, singleton Firebase instance to prevent multiple initializations.
 * 
 * Environment Variables Required (set in Cloudflare Pages):
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { 
  getFunctions, 
  httpsCallable 
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js';
import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js';

// Firebase initialization state
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseFunctions = null;
let firebaseStorage = null;

export let firebaseReady = false;
export let firebaseError = null;

/**
 * Validate that all required Firebase environment variables are present
 */
function validateFirebaseEnvVars() {
  const requiredVars = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const missing = [];
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === 'undefined' || value === '') {
      missing.push(`VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required Firebase environment variables: ${missing.join(', ')}`,
      missing
    };
  }

  return { valid: true, config: requiredVars };
}

/**
 * Initialize Firebase with environment variables
 */
function initializeFirebase() {
  const validation = validateFirebaseEnvVars();

  if (!validation.valid) {
    firebaseError = validation.message;
    firebaseReady = false;
    console.error('❌ Firebase initialization failed:', validation.message);
    console.error('📋 Setup Instructions:');
    console.error('1. Go to Cloudflare Pages Dashboard → Your Project → Settings → Environment Variables');
    console.error('2. Add the following variables (get values from Firebase Console):');
    validation.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('3. Redeploy your site or restart the dev server');
    return;
  }

  try {
    // Initialize Firebase app
    firebaseApp = initializeApp(validation.config);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseFunctions = getFunctions(firebaseApp);
    firebaseStorage = getStorage(firebaseApp);

    firebaseReady = true;
    firebaseError = null;
    console.log('✅ Firebase initialized successfully from environment variables');
  } catch (error) {
    firebaseReady = false;
    firebaseError = `Firebase initialization failed: ${error.message}`;
    console.error('❌ Firebase initialization error:', error);
  }
}

// Initialize Firebase on module load
initializeFirebase();

/**
 * Get Firebase app instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseApp() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return firebaseApp;
}

/**
 * Get Firebase Auth instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseAuth() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return firebaseAuth;
}

/**
 * Get Firestore database instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseDb() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return firebaseDb;
}

/**
 * Get Firebase Functions instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseFunctions() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return firebaseFunctions;
}

/**
 * Get Firebase Storage instance
 * @throws {Error} If Firebase is not initialized
 */
export function getFirebaseStorage() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return firebaseStorage;
}

/**
 * Show user-friendly error UI if Firebase is not configured
 */
export function showFirebaseConfigError() {
  if (firebaseReady) return;

  const errorHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900 bg-opacity-95 backdrop-blur-sm">
      <div class="max-w-2xl mx-4 bg-white dark:bg-navy-800 rounded-xl shadow-2xl p-8">
        <div class="text-center mb-6">
          <div class="text-6xl mb-4">⚠️</div>
          <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">
            Firebase Configuration Missing
          </h1>
          <p class="text-navy-600 dark:text-navy-400">
            This application requires Firebase environment variables to be configured.
          </p>
        </div>
        
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p class="text-sm font-mono text-red-800 dark:text-red-300">
            ${firebaseError}
          </p>
        </div>
        
        <div class="text-left space-y-4 text-sm text-navy-700 dark:text-navy-300">
          <div>
            <h3 class="font-bold mb-2">🔧 For Administrators:</h3>
            <ol class="list-decimal list-inside space-y-2 ml-2">
              <li>Go to your Cloudflare Pages Dashboard</li>
              <li>Navigate to: <strong>Settings → Environment Variables</strong></li>
              <li>Add the following variables with values from your Firebase Console:</li>
            </ol>
            <ul class="list-disc list-inside mt-2 ml-6 space-y-1 font-mono text-xs">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
            </ul>
            <p class="mt-2 ml-2">4. Redeploy your site to apply changes</p>
          </div>
          
          <div>
            <h3 class="font-bold mb-2">📚 Documentation:</h3>
            <p class="ml-2">
              See <code class="bg-navy-100 dark:bg-navy-700 px-2 py-1 rounded">STRIPE_FIREBASE_SETUP.md</code> for complete setup instructions.
            </p>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <button 
            onclick="window.location.reload()" 
            class="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  `;

  // Inject error UI
  const container = document.createElement('div');
  container.id = 'firebase-config-error';
  container.innerHTML = errorHTML;
  document.body.appendChild(container);
}

// Re-export Firebase SDK functions for convenience
export {
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  // Firestore
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  // Functions
  httpsCallable,
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
};
