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
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { 
  getFunctions, 
  httpsCallable 
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js';

// Firebase configuration from environment variables (Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase initialization state (safe mode)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseFunctions = null;

// Export Firebase ready state
export let firebaseReady = false;
export let firebaseError = null;

// Validate Firebase configuration (non-throwing)
function validateFirebaseConfig(config) {
  // Check if config is missing or has placeholder values
  if (!config || !config.apiKey || !config.projectId) {
    return 'Firebase configuration is missing. Copy firebase-config.template.js to firebase-config.js and add your credentials.';
  }
  
  const isPlaceholder = 
    config.apiKey.includes('DEMO') || 
    config.apiKey.includes('REPLACE') ||
    config.apiKey.includes('YOUR_') ||
    config.apiKey.includes('PLACEHOLDER') ||
    config.apiKey === 'AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL' ||
    config.apiKey.length < 20;
  
  if (isPlaceholder) {
    const errorMessage = 'Firebase configuration contains placeholder values. Update firebase-config.js with your actual Firebase credentials.';
    console.warn('⚠️ Firebase configuration error: Using placeholder credentials!');
    console.warn('📋 To fix this issue:');
    console.warn('1. Copy firebase-config.template.js to firebase-config.js');
    console.warn('2. Go to Firebase Console: https://console.firebase.google.com');
    console.warn('3. Select your project > Project Settings > Your apps > Web app');
    console.warn('4. Copy your Firebase config values into firebase-config.js');
    return errorMessage;
  }
  
  return null;
}

// Initialize Firebase (safe mode - never throws)
try {
  const validationError = validateFirebaseConfig(firebaseConfig);
  
  if (validationError) {
    firebaseError = validationError;
    firebaseReady = false;
    console.warn('Firebase initialization skipped due to invalid configuration');
  } else {
    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseFunctions = getFunctions(firebaseApp);
    
    firebaseReady = true;
    firebaseError = null;
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  firebaseReady = false;
  firebaseError = `Firebase initialization failed: ${error.message}`;
  console.error('❌ Firebase initialization error:', error);
}

// Safe getters for Firebase instances
export function getFirebase() {
  if (!firebaseReady) {
    throw new Error(firebaseError || 'Firebase is not initialized');
  }
  return {
    app: firebaseApp,
    auth: firebaseAuth,
    db: firebaseDb,
    functions: firebaseFunctions
  };
}

// Export instances (will be null if not ready)
export const auth = firebaseAuth;
export const db = firebaseDb;
export const functions = firebaseFunctions;

// Auth exports
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};

// Firestore exports
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
};

// Functions exports
export { httpsCallable };
