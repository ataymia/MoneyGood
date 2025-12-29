/**
 * Admin API Client
 * 
 * Client-side functions to call admin Firebase Functions.
 * All functions require the user to have admin custom claim.
 */

import { httpsCallable } from './firebaseClient.js';

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Set user account status
 * @param {string} uid - User ID
 * @param {'active'|'paused'|'suspended'|'deleted'} status - New status
 * @param {string} reason - Reason for status change
 */
export async function adminSetUserStatus(uid, status, reason) {
  const fn = httpsCallable(window.functions, 'adminSetUserStatus');
  const result = await fn({ uid, status, reason });
  return result.data;
}

/**
 * Delete user account
 * @param {string} uid - User ID
 * @param {string} reason - Reason for deletion
 * @param {boolean} hardDelete - If true, permanently deletes from Firebase Auth
 */
export async function adminDeleteUser(uid, reason, hardDelete = false) {
  const fn = httpsCallable(window.functions, 'adminDeleteUser');
  const result = await fn({ uid, reason, hardDelete });
  return result.data;
}

/**
 * Add admin note to user
 * @param {string} uid - User ID
 * @param {string} note - Note content
 */
export async function adminAddUserNote(uid, note) {
  const fn = httpsCallable(window.functions, 'adminAddUserNote');
  const result = await fn({ uid, note });
  return result.data;
}

// ============================================
// DEAL MANAGEMENT
// ============================================

/**
 * Admin cancel deal
 * @param {string} dealId - Deal ID
 * @param {string} reason - Reason for cancellation
 */
export async function adminCancelDeal(dealId, reason) {
  const fn = httpsCallable(window.functions, 'adminCancelDeal');
  const result = await fn({ dealId, reason });
  return result.data;
}

/**
 * Add admin note to deal
 * @param {string} dealId - Deal ID
 * @param {string} note - Note content
 */
export async function adminAddDealNote(dealId, note) {
  const fn = httpsCallable(window.functions, 'adminAddDealNote');
  const result = await fn({ dealId, note });
  return result.data;
}

// ============================================
// MARKETPLACE MODERATION
// ============================================

/**
 * Remove marketplace listing
 * @param {string} listingId - Listing ID
 * @param {string} reason - Reason for removal
 */
export async function adminRemoveListing(listingId, reason) {
  const fn = httpsCallable(window.functions, 'adminRemoveListing');
  const result = await fn({ listingId, reason });
  return result.data;
}

/**
 * Restore removed listing
 * @param {string} listingId - Listing ID
 * @param {string} reason - Reason for restoration
 */
export async function adminRestoreListing(listingId, reason) {
  const fn = httpsCallable(window.functions, 'adminRestoreListing');
  const result = await fn({ listingId, reason });
  return result.data;
}

// ============================================
// PAYMENTS & REFUNDS
// ============================================

/**
 * Issue refund
 * @param {string} paymentId - Payment ID
 * @param {number} refundAmountCents - Amount to refund in cents
 * @param {string} reason - Reason for refund
 */
export async function adminIssueRefund(paymentId, refundAmountCents, reason) {
  const fn = httpsCallable(window.functions, 'adminIssueRefund');
  const result = await fn({ paymentId, refundAmountCents, reason });
  return result.data;
}

// ============================================
// SUPPORT TICKETS
// ============================================

/**
 * Reply to support ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} message - Reply message
 * @param {string} status - Optional new status
 * @param {boolean} isInternal - If true, not visible to user
 */
export async function adminReplyToTicket(ticketId, message, status = null, isInternal = false) {
  const fn = httpsCallable(window.functions, 'adminReplyToTicket');
  const result = await fn({ ticketId, message, status, isInternal });
  return result.data;
}

// ============================================
// CASES / INVESTIGATIONS
// ============================================

/**
 * Create investigation case
 * @param {Object} caseData - Case data
 */
export async function adminCreateCase(caseData) {
  const fn = httpsCallable(window.functions, 'adminCreateCase');
  const result = await fn(caseData);
  return result.data;
}

/**
 * Add note to case
 * @param {string} caseId - Case ID
 * @param {string} note - Note content
 * @param {boolean} isInternal - Internal note flag
 */
export async function adminAddCaseNote(caseId, note, isInternal = true) {
  const fn = httpsCallable(window.functions, 'adminAddCaseNote');
  const result = await fn({ caseId, note, isInternal });
  return result.data;
}

/**
 * Update case status
 * @param {string} caseId - Case ID
 * @param {string} status - New status
 * @param {string} reason - Reason for status change
 */
export async function adminUpdateCaseStatus(caseId, status, reason) {
  const fn = httpsCallable(window.functions, 'adminUpdateCaseStatus');
  const result = await fn({ caseId, status, reason });
  return result.data;
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Send admin notification
 * @param {Object} notificationData - Notification data
 */
export async function adminSendNotification(notificationData) {
  const fn = httpsCallable(window.functions, 'adminSendNotification');
  const result = await fn(notificationData);
  return result.data;
}

// ============================================
// MODERATION CONFIG
// ============================================

/**
 * Update moderation configuration
 * @param {Object} config - Config updates
 */
export async function adminUpdateModerationConfig(config) {
  const fn = httpsCallable(window.functions, 'adminUpdateModerationConfig');
  const result = await fn(config);
  return result.data;
}

// ============================================
// ADMIN MANAGEMENT
// ============================================

/**
 * Bootstrap admin access (for first admin)
 */
export async function adminBootstrap() {
  const fn = httpsCallable(window.functions, 'adminBootstrap');
  const result = await fn({});
  return result.data;
}

/**
 * Grant admin access to user
 * @param {string} uid - User ID (optional if email provided)
 * @param {string} email - User email (optional if uid provided)
 */
export async function adminGrantAccess(uid, email) {
  const fn = httpsCallable(window.functions, 'adminGrantAccess');
  const result = await fn({ uid, email });
  return result.data;
}

/**
 * Revoke admin access from user
 * @param {string} uid - User ID
 */
export async function adminRevokeAccess(uid) {
  const fn = httpsCallable(window.functions, 'adminRevokeAccess');
  const result = await fn({ uid });
  return result.data;
}

// ============================================
// ANALYTICS / STATS
// ============================================

/**
 * Get admin dashboard stats
 */
export async function adminGetStats() {
  const fn = httpsCallable(window.functions, 'adminGetStats');
  const result = await fn({});
  return result.data;
}
