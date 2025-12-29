#!/usr/bin/env node
/**
 * Bootstrap Admin Script
 * 
 * Run this script to make a user an admin.
 * 
 * Usage:
 *   node scripts/make-admin.js <email>
 * 
 * Prerequisites:
 *   - Firebase CLI logged in: firebase login
 *   - Service account key OR use Firebase emulator
 */

const { execSync } = require('child_process');

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/make-admin.js <email>');
  console.error('Example: node scripts/make-admin.js user@example.com');
  process.exit(1);
}

console.log(`\nMaking ${email} an admin...\n`);

// Use Firebase CLI to run a script via the Functions shell
const script = `
const admin = require('firebase-admin');
admin.initializeApp();

async function makeAdmin() {
  try {
    const user = await admin.auth().getUserByEmail('${email}');
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Also update Firestore user doc
    await admin.firestore().collection('users').doc(user.uid).set({
      isAdmin: true,
      adminGrantedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('SUCCESS! User ${email} is now an admin.');
    console.log('UID:', user.uid);
    console.log('\\nThe user must sign out and sign back in for changes to take effect.');
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}
makeAdmin();
`;

console.log('This script requires a service account key.');
console.log('You can also use the Firebase Console method below:\n');
console.log('='.repeat(60));
console.log('FIREBASE CONSOLE METHOD (Easiest):');
console.log('='.repeat(60));
console.log(`
1. Go to: https://console.firebase.google.com/project/moneygoodapp/firestore

2. Create or update the document:
   Collection: users
   Document ID: <the user's UID from Authentication tab>
   
   Add field:
   - isAdmin: true (boolean)

3. Then go to Google Cloud Console to set the custom claim:
   https://console.cloud.google.com/cloudshell?project=moneygoodapp
   
   Run this in Cloud Shell:
   
   npm install firebase-admin
   
   node -e "
   const admin = require('firebase-admin');
   admin.initializeApp({ projectId: 'moneygoodapp' });
   admin.auth().getUserByEmail('${email}')
     .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
     .then(() => console.log('Done! User is now admin.'))
     .catch(console.error);
   "

4. Sign out and back in to the app.
`);
