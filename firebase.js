import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  getFunctions, 
  httpsCallable 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Firebase configuration
// ⚠️ IMPORTANT: Replace these placeholder values with your actual Firebase project credentials
// Get your config from Firebase Console > Project Settings > Your apps > Web app
// See FIREBASE_CONFIG.md for detailed setup instructions
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL",
  authDomain: "moneygood-app.firebaseapp.com",
  projectId: "moneygood-app",
  storageBucket: "moneygood-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
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
  const isPlaceholder = 
    config.apiKey.includes('DEMO') || 
    config.apiKey.includes('REPLACE') ||
    config.apiKey === 'AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL' ||
    !config.apiKey ||
    config.apiKey.length < 20;
  
  if (isPlaceholder) {
    const errorMessage = 'Firebase configuration contains placeholder values. See FIREBASE_CONFIG.md for setup instructions.';
    console.warn('⚠️ Firebase configuration error: Using placeholder credentials!');
    console.warn('📋 To fix this issue:');
    console.warn('1. Go to Firebase Console: https://console.firebase.google.com');
    console.warn('2. Select your project > Project Settings > Your apps > Web app');
    console.warn('3. Copy your Firebase config values');
    console.warn('4. Replace the placeholder values in firebase.js');
    console.warn('5. See FIREBASE_CONFIG.md for detailed instructions');
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
