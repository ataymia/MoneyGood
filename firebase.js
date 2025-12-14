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
// See .env.template or CLOUDFLARE_DEPLOYMENT.md for required environment variables
const firebaseConfig = {
  apiKey: "AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL",
  authDomain: "moneygood-app.firebaseapp.com",
  projectId: "moneygood-app",
  storageBucket: "moneygood-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Validate Firebase configuration
function validateFirebaseConfig(config) {
  const isPlaceholder = 
    config.apiKey.includes('DEMO') || 
    config.apiKey.includes('REPLACE') ||
    config.apiKey === 'AIzaSyDEMO_KEY_REPLACE_WITH_ACTUAL';
  
  if (isPlaceholder) {
    console.error('❌ Firebase configuration error: Using placeholder credentials!');
    console.error('📋 To fix this issue:');
    console.error('1. Go to Firebase Console: https://console.firebase.google.com');
    console.error('2. Select your project > Project Settings > Your apps > Web app');
    console.error('3. Copy your Firebase config values');
    console.error('4. Replace the placeholder values in firebase.js (in repository root)');
    console.error('5. For Cloudflare deployment, see CLOUDFLARE_DEPLOYMENT.md');
    
    // Show user-friendly error in the UI
    if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: white; border-radius: 16px; padding: 48px; max-width: 600px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                <h1 style="font-size: 32px; font-weight: bold; color: #1a202c; margin: 0 0 16px 0;">Configuration Required</h1>
                <p style="font-size: 18px; color: #4a5568; margin: 0;">MoneyGood needs to be configured with your Firebase credentials</p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #92400e; margin: 0; line-height: 1.6;">
                  <strong>Current Status:</strong> Using placeholder Firebase configuration<br>
                  The app cannot connect to Firebase services without valid credentials.
                </p>
              </div>
              
              <div style="background: #f3f4f6; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #1a202c; margin: 0 0 16px 0;">Setup Instructions:</h2>
                <ol style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 24px;">
                  <li>Go to <a href="https://console.firebase.google.com" target="_blank" style="color: #3b82f6; text-decoration: underline;">Firebase Console</a></li>
                  <li>Select your project or create a new one</li>
                  <li>Navigate to: <strong>Project Settings → Your apps → Web app</strong></li>
                  <li>Copy your Firebase configuration values</li>
                  <li>Update <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">firebase.js</code> in the repository root with your credentials</li>
                  <li>Push changes to trigger Cloudflare Pages redeployment</li>
                  <li>For detailed instructions, see <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">CLOUDFLARE_DEPLOYMENT.md</code></li>
                </ol>
              </div>
              
              <div style="text-align: center;">
                <a href="https://github.com/ataymia/MoneyGood/blob/main/CLOUDFLARE_DEPLOYMENT.md" target="_blank" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Deployment Guide
                </a>
              </div>
              
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  Need help? Check the <a href="https://github.com/ataymia/MoneyGood" target="_blank" style="color: #3b82f6;">GitHub repository</a>
                </p>
              </div>
            </div>
          </div>
        `;
      });
    }
    
    throw new Error('Firebase configuration contains placeholder values. Please update with your actual credentials.');
  }
}

// Validate before initializing
validateFirebaseConfig(firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

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
