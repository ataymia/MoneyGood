# Admin Portal Setup Guide

This document provides comprehensive instructions for setting up and managing the MoneyGood Admin Portal.

## Table of Contents
1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Initial Setup](#initial-setup)
4. [Admin Access Management](#admin-access-management)
5. [Admin Modules](#admin-modules)
6. [Audit Logging](#audit-logging)
7. [Support Ticket Flow](#support-ticket-flow)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The MoneyGood Admin Portal provides comprehensive operational controls for platform administrators. It is built with security-first principles using Firebase Auth Custom Claims for access control.

### Key Features
- 🔐 **Secure Access**: Firebase Custom Claims (`admin: true`)
- 📊 **Dashboard**: Real-time KPIs and activity monitoring
- 👥 **User Management**: Status control, admin access grants
- 📄 **Agreement Oversight**: Cancel deals, add notes, create cases
- 🛒 **Marketplace Moderation**: Remove/restore listings
- 💰 **Payment Management**: View transactions, issue refunds
- 📬 **Support Inbox**: Manage user support tickets
- 📁 **Investigation Cases**: Track complex issues
- 🚫 **Content Moderation**: Blocked/flagged term configuration
- 📢 **Notifications**: Broadcast and targeted messaging
- 📝 **Templates**: Manage communication templates
- 📋 **Audit Log**: Complete action history

---

## Security Architecture

### Custom Claims Authentication
Admin access is controlled via Firebase Auth Custom Claims. This ensures:
- Admin status is cryptographically verified
- Cannot be spoofed from client-side
- Enforced at both Firestore rules AND Firebase Functions

### Three Layers of Protection

1. **Firestore Security Rules** (`firestore.rules`)
   ```javascript
   function isAdmin() {
     return request.auth != null && request.auth.token.admin == true;
   }
   ```

2. **Firebase Functions Verification** (`firebase-functions/src/admin.ts`)
   ```typescript
   function verifyAdmin(context: CallableContext) {
     if (!context.auth?.token?.admin) {
       throw new HttpsError('permission-denied', 'Admin access required');
     }
   }
   ```

3. **Client-Side Guard** (`ui/admin/layout.js`)
   ```javascript
   export async function initAdminAccess() {
     const tokenResult = await user.getIdTokenResult(true);
     return tokenResult.claims.admin === true;
   }
   ```

---

## Initial Setup

### Prerequisites
- Firebase project with Firestore, Auth, and Functions enabled
- Node.js 18+ installed
- Firebase CLI installed and authenticated

### Step 1: Deploy Firebase Functions

```bash
cd firebase-functions
npm install
npm run build
firebase deploy --only functions
```

### Step 2: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Step 3: Create First Admin

**Option A: Using CLI Script (Recommended)**

```bash
# Set up service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Grant admin to an existing Firebase Auth user
node scripts/bootstrap-admin.js admin@example.com

# List all admins
node scripts/bootstrap-admin.js --list

# Revoke admin access
node scripts/bootstrap-admin.js --revoke admin@example.com
```

**Option B: Using Cloud Function**

1. Set allowed bootstrap emails in Firebase Functions config:
   ```bash
   firebase functions:config:set admin.bootstrap_emails="admin@example.com,founder@example.com"
   ```

2. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

3. Call the bootstrap function from the app (logged in as an allowed email):
   ```javascript
   const { httpsCallable } = await import('./firebaseClient.js');
   const adminBootstrap = httpsCallable(functions, 'adminBootstrap');
   await adminBootstrap();
   ```

### Step 4: Verify Access

1. Log out and log back in (to refresh token with new claims)
2. Navigate to `/#/admin`
3. Should see the Admin Dashboard

---

## Admin Access Management

### Granting Admin Access

From the Admin Portal:
1. Go to **Users** module
2. Search for the user
3. Click on user to open detail drawer
4. Click **"Grant Admin Access"**
5. Confirm the action

Or via CLI:
```bash
node scripts/bootstrap-admin.js newadmin@example.com
```

### Revoking Admin Access

From the Admin Portal:
1. Go to **Users** module
2. Find the admin user
3. Click **"Revoke Admin Access"**
4. Confirm the action

Or via CLI:
```bash
node scripts/bootstrap-admin.js --revoke formeremail@example.com
```

### Important Notes
- Users must log out and back in after their admin status changes
- The client caches auth tokens; force refresh with `getIdTokenResult(true)`
- All admin grants/revokes are logged to the audit log

---

## Admin Modules

### Overview Dashboard (`/#/admin/overview`)
- KPI cards: Users, Active Agreements, Revenue, Open Tickets
- Deal status distribution chart
- Recent admin activity stream
- Quick action shortcuts

### Users (`/#/admin/users`)
- User table with search and status filters
- User detail drawer with:
  - Profile information
  - Status actions (Activate, Pause, Suspend, Delete)
  - Admin access controls
  - Recent deals
  - Admin notes
  - Create case option
- CSV export

### Agreements (`/#/admin/agreements`)
- Agreement table with status filters
- Agreement detail drawer with:
  - Participant details
  - Financial breakdown
  - Timeline / activity log
  - Admin cancel (with refund options)
  - Add notes
  - Create case

### Marketplace (`/#/admin/marketplace`)
- Listing table with moderation status
- Remove listings with reason
- Restore removed listings
- Flagged content queue

### Payments (`/#/admin/payments`)
- Payment transaction list
- Revenue statistics
- Refund management
  - Partial or full refunds
  - Requires typing "REFUND" to confirm
  - Refund reason required

### Support (`/#/admin/support`)
- Ticket inbox with status tabs (Open, Pending, Resolved)
- Reply to tickets
- Mark as internal notes
- Update ticket status
- Create investigation cases from tickets

### Cases (`/#/admin/cases`)
- Investigation case management
- Link cases to users, deals, tickets
- Status workflow (Open → In Progress → Resolved → Closed)
- Timeline and notes
- Create new cases manually

### Moderation (`/#/admin/moderation`)
- Blocked terms (auto-block listings)
- Flagged terms (queue for review)
- Toggle auto-block/auto-flag
- Description length limits
- Flagged content review queue

### Notifications (`/#/admin/notifications`)
- Broadcast to all users
- Targeted notifications (specific users, deal participants)
- Notification types: Info, Success, Warning, Error, Announcement
- Quick templates
- Recent notification history

### Templates (`/#/admin/templates`)
- Email, In-App, SMS, Legal templates
- Template variables support
- Version tracking
- CRUD operations

### Audit Log (`/#/admin/audit`)
- Comprehensive action history
- Filter by action type, date range
- Search functionality
- Detailed view with before/after snapshots
- CSV export

---

## Audit Logging

Every admin action is automatically logged to the `auditLogs` collection with:

```typescript
{
  adminUid: string,
  adminEmail: string,
  actionType: string,
  targetType: 'user' | 'deal' | 'listing' | 'ticket' | 'case' | 'notification' | 'config',
  targetId: string,
  reason: string,
  beforeSnapshot: object | null,
  afterSnapshot: object | null,
  details: object | null,
  timestamp: Timestamp
}
```

### Logged Action Types
- `user_status_changed`
- `user_deleted`
- `user_note_added`
- `admin_access_granted`
- `admin_access_revoked`
- `deal_cancelled`
- `deal_note_added`
- `listing_removed`
- `listing_restored`
- `refund_issued`
- `ticket_reply`
- `case_created`
- `case_status_changed`
- `case_note_added`
- `notification_sent`
- `moderation_config_updated`

---

## Support Ticket Flow

### User Experience
1. User clicks "Get Help" floating button (visible on all pages)
2. Fills out support form (category, subject, description, optional deal ID)
3. Ticket created in `supportTickets` collection
4. User receives confirmation

### Admin Experience
1. Navigate to Support Inbox (`/#/admin/support`)
2. View open tickets sorted by priority/date
3. Open ticket detail drawer
4. Reply to user (or add internal note)
5. Update status as appropriate
6. Optionally create investigation case

### Ticket Statuses
- `open` - Needs admin response
- `pending` - Awaiting user response
- `in_progress` - Being worked on
- `resolved` - Issue addressed
- `closed` - No further action needed

---

## Troubleshooting

### "Unauthorized" Error on Admin Pages

**Cause**: User doesn't have `admin: true` custom claim

**Solution**:
1. Verify user has been granted admin access
2. Have user log out and log back in
3. Clear browser cache if issue persists
4. Check `auditLogs` to confirm grant action completed

### Admin Grant Not Working

**Cause**: Firebase Functions not deployed or configured

**Solution**:
1. Ensure functions are deployed: `firebase deploy --only functions`
2. Check Firebase Functions logs for errors
3. Verify service account has `Firebase Auth Admin` permissions

### Firestore Permission Denied

**Cause**: Firestore rules not deployed or incorrect

**Solution**:
1. Deploy latest rules: `firebase deploy --only firestore:rules`
2. Verify `isAdmin()` helper exists in rules
3. Check that collection rules include admin access patterns

### Audit Logs Not Appearing

**Cause**: `writeAuditLog()` function failing silently

**Solution**:
1. Check Firebase Functions logs
2. Ensure `auditLogs` collection has proper write rules for admin
3. Verify function is awaiting the audit write

### Support Tickets Not Submitting

**Cause**: Missing write permission for `supportTickets`

**Solution**:
1. Check Firestore rules for `supportTickets` collection
2. Authenticated users should be able to create tickets
3. Add rule: `allow create: if request.auth != null;`

---

## Environment Variables

### Firebase Functions
```bash
# Set via Firebase CLI
firebase functions:config:set admin.bootstrap_emails="email1@example.com,email2@example.com"
```

### Local Development
```bash
# .env file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## File Structure

```
ui/admin/
├── audit.js         # Audit log viewer
├── cases.js         # Investigation cases
├── components.js    # Shared admin UI components
├── layout.js        # Admin layout & auth guard
├── marketplace.js   # Listing moderation
├── moderation.js    # Content moderation config
├── notifications.js # Broadcast/targeted notifications
├── overview.js      # Dashboard
├── payments.js      # Payment management
├── support.js       # Support ticket inbox
├── templates.js     # Template management
└── users.js         # User management

firebase-functions/src/
├── admin.ts         # Admin callable functions
└── index.ts         # Function exports

scripts/
└── bootstrap-admin.js  # CLI admin bootstrap tool

adminApi.js          # Client API for admin functions
firestore.rules      # Security rules with admin patterns
```

---

## Security Checklist

- [ ] Firebase Functions deployed with admin verification
- [ ] Firestore rules deployed with `isAdmin()` helper
- [ ] First admin created via secure method (CLI or bootstrap function)
- [ ] Audit logging verified working
- [ ] Support ticket creation tested from user perspective
- [ ] Admin access grant/revoke cycle tested
- [ ] Token refresh after admin grant verified
- [ ] All admin routes require authentication
- [ ] Sensitive operations require confirmation (refunds, deletions)

---

## Support

For questions or issues with the Admin Portal setup, consult:
1. Firebase Console logs
2. Browser developer console
3. This documentation
4. Code comments in admin modules

---

*Last updated: January 2025*
