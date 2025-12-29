#!/usr/bin/env node

/**
 * Admin Bootstrap Script
 * 
 * Use this script to set the first admin user safely using Firebase Admin SDK.
 * Requires a service account key file.
 * 
 * Usage:
 *   node scripts/bootstrap-admin.js <email>
 * 
 * Or with explicit service account:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/bootstrap-admin.js <email>
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
function initializeFirebase() {
  // Check for service account file
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Try default credentials (for Cloud Shell, GCE, etc.)
    try {
      admin.initializeApp();
    } catch (error) {
      console.error('Error: Could not initialize Firebase Admin SDK.');
      console.error('Please set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key file.');
      console.error('');
      console.error('Steps to get a service account key:');
      console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
      console.error('2. Click "Generate new private key"');
      console.error('3. Save the file and set GOOGLE_APPLICATION_CREDENTIALS to its path');
      process.exit(1);
    }
  }
}

async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function setAdminClaim(email) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Check if already admin
    const currentClaims = userRecord.customClaims || {};
    if (currentClaims.admin === true) {
      console.log('✓ User is already an admin.');
      return;
    }

    // Confirm action
    const confirmed = await promptConfirmation(
      `\nGrant admin access to ${email}? (yes/no): `
    );

    if (!confirmed) {
      console.log('Operation cancelled.');
      process.exit(0);
    }

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      admin: true,
    });

    // Update Firestore user document
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      isAdmin: true,
      adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminGrantedBy: 'bootstrap-script',
    }, { merge: true });

    // Create audit log entry
    await db.collection('auditLogs').add({
      adminUid: userRecord.uid,
      adminEmail: email,
      actionType: 'ADMIN_BOOTSTRAP',
      targetType: 'user',
      targetId: userRecord.uid,
      reason: 'Admin access granted via CLI bootstrap script',
      beforeSnapshot: { isAdmin: false },
      afterSnapshot: { isAdmin: true },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓ Admin access granted successfully!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. User ${email} should sign out and sign back in`);
    console.log('  2. Navigate to /#/admin to access the admin console');
    console.log('');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: No user found with email: ${email}`);
      console.error('Make sure the user has signed up first.');
    } else {
      console.error('Error setting admin claim:', error.message);
    }
    process.exit(1);
  }
}

async function listAdmins() {
  try {
    const db = admin.firestore();
    const adminsSnapshot = await db.collection('users')
      .where('isAdmin', '==', true)
      .get();

    if (adminsSnapshot.empty) {
      console.log('No admin users found.');
      return;
    }

    console.log('');
    console.log('Current Admin Users:');
    console.log('────────────────────────────────────────');
    
    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      const userRecord = await admin.auth().getUser(doc.id);
      console.log(`  • ${userRecord.email} (${doc.id})`);
      if (data.adminGrantedAt) {
        console.log(`    Granted: ${data.adminGrantedAt.toDate().toISOString()}`);
      }
    }
    console.log('');

  } catch (error) {
    console.error('Error listing admins:', error.message);
    process.exit(1);
  }
}

async function revokeAdmin(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    const currentClaims = userRecord.customClaims || {};
    if (!currentClaims.admin) {
      console.log('User is not an admin.');
      return;
    }

    const confirmed = await promptConfirmation(
      `\nRevoke admin access from ${email}? (yes/no): `
    );

    if (!confirmed) {
      console.log('Operation cancelled.');
      process.exit(0);
    }

    // Remove admin claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      admin: false,
    });

    // Update Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).update({
      isAdmin: false,
      adminRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminRevokedBy: 'bootstrap-script',
    });

    // Audit log
    await db.collection('auditLogs').add({
      adminUid: 'system',
      adminEmail: 'bootstrap-script',
      actionType: 'REVOKE_ADMIN_ACCESS',
      targetType: 'user',
      targetId: userRecord.uid,
      reason: 'Admin access revoked via CLI bootstrap script',
      beforeSnapshot: { isAdmin: true },
      afterSnapshot: { isAdmin: false },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('');
    console.log('✓ Admin access revoked successfully.');
    console.log('');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: No user found with email: ${email}`);
    } else {
      console.error('Error revoking admin:', error.message);
    }
    process.exit(1);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('');
    console.log('MoneyGood Admin Bootstrap Script');
    console.log('═════════════════════════════════');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/bootstrap-admin.js <email>        Grant admin access');
    console.log('  node scripts/bootstrap-admin.js --list         List all admins');
    console.log('  node scripts/bootstrap-admin.js --revoke <email>  Revoke admin access');
    console.log('');
    console.log('Environment:');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS  Path to Firebase service account key');
    console.log('');
    console.log('Examples:');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/bootstrap-admin.js admin@example.com');
    console.log('');
    process.exit(0);
  }

  initializeFirebase();

  if (args[0] === '--list') {
    await listAdmins();
  } else if (args[0] === '--revoke' && args[1]) {
    await revokeAdmin(args[1]);
  } else if (args[0].includes('@')) {
    await setAdminClaim(args[0]);
  } else {
    console.error('Invalid argument. Use --help for usage information.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(console.error);
