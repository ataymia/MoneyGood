/**
 * Admin Firebase Functions
 * 
 * All functions require admin custom claim: request.getAuth().token.admin == true
 * All actions are logged to auditLogs collection
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { createRefund } from './stripe';

// Lazy initialization - db and auth are accessed via getters
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const SetUserStatusSchema = z.object({
  uid: z.string().min(1),
  status: z.enum(['active', 'paused', 'suspended', 'deleted']),
  reason: z.string().min(1).max(1000),
});

const DeleteUserSchema = z.object({
  uid: z.string().min(1),
  reason: z.string().min(1).max(1000),
  hardDelete: z.boolean().optional().default(false),
});

const AdminCancelDealSchema = z.object({
  dealId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

const RemoveListingSchema = z.object({
  listingId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

const RestoreListingSchema = z.object({
  listingId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

const IssueRefundSchema = z.object({
  paymentId: z.string().min(1),
  refundAmountCents: z.number().int().positive(),
  reason: z.string().min(1).max(1000),
});

const CreateCaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  linkedUserIds: z.array(z.string()).optional(),
  linkedDealIds: z.array(z.string()).optional(),
  linkedListingIds: z.array(z.string()).optional(),
  linkedPaymentIds: z.array(z.string()).optional(),
  linkedTicketIds: z.array(z.string()).optional(),
});

const AddCaseNoteSchema = z.object({
  caseId: z.string().min(1),
  note: z.string().min(1).max(5000),
  isInternal: z.boolean().optional().default(true),
});

const UpdateCaseStatusSchema = z.object({
  caseId: z.string().min(1),
  status: z.enum(['open', 'in_review', 'awaiting_user', 'resolved', 'closed']),
  reason: z.string().min(1).max(500),
});

const ReplyToTicketSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1).max(5000),
  status: z.enum(['open', 'pending', 'in_progress', 'resolved', 'closed']).optional(),
  isInternal: z.boolean().optional().default(false),
});

const SendNotificationSchema = z.object({
  targetType: z.enum(['user', 'deal', 'broadcast']),
  targetId: z.string().optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'success', 'alert']).optional().default('info'),
});

const UpdateModerationConfigSchema = z.object({
  blockedTerms: z.array(z.string()).optional(),
  flaggedTerms: z.array(z.string()).optional(),
  suggestions: z.record(z.string()).optional(),
});

const AddUserNoteSchema = z.object({
  uid: z.string().min(1),
  note: z.string().min(1).max(5000),
});

const AddDealNoteSchema = z.object({
  dealId: z.string().min(1),
  note: z.string().min(1).max(5000),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify admin custom claim
 */
function verifyAdmin(context: functions.https.CallableContext): void {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
}

/**
 * Write audit log entry
 */
async function writeAuditLog(
  adminUid: string,
  adminEmail: string,
  actionType: string,
  targetType: string,
  targetId: string,
  reason: string,
  beforeSnapshot?: Record<string, any>,
  afterSnapshot?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<string> {
  const logRef = await getDb().collection('auditLogs').add({
    adminUid,
    adminEmail,
    actionType,
    targetType,
    targetId,
    reason,
    beforeSnapshot: beforeSnapshot || null,
    afterSnapshot: afterSnapshot || null,
    metadata: metadata || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return logRef.id;
}

/**
 * Create notification for user
 */
async function createUserNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  dealId?: string
): Promise<void> {
  await getDb().collection('users').doc(userId).collection('notifications').add({
    type,
    title,
    message,
    dealId: dealId || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Set user account status (active/paused/suspended/deleted)
 */
export const adminSetUserStatus = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = SetUserStatusSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Get current user data
  const userRef = getDb().collection('users').doc(validated.uid);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
  
  const beforeData = userDoc.data();
  const previousStatus = beforeData?.status || 'active';
  
  // Update user status
  await userRef.update({
    status: validated.status,
    statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    statusUpdatedBy: adminUid,
    statusReason: validated.reason,
  });
  
  // If suspended or deleted, revoke refresh tokens
  if (validated.status === 'suspended' || validated.status === 'deleted') {
    await getAuth().revokeRefreshTokens(validated.uid);
  }
  
  // Write audit log
  await writeAuditLog(
    adminUid,
    adminEmail,
    'SET_USER_STATUS',
    'user',
    validated.uid,
    validated.reason,
    { status: previousStatus },
    { status: validated.status }
  );
  
  // Notify user (except for deleted status)
  if (validated.status !== 'deleted') {
    const statusMessages: Record<string, { title: string; message: string }> = {
      paused: {
        title: 'Account Paused',
        message: 'Your account has been temporarily paused. Please contact support for more information.',
      },
      suspended: {
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact support to resolve this issue.',
      },
      active: {
        title: 'Account Reactivated',
        message: 'Your account has been reactivated. You can now access all features.',
      },
    };
    
    const notification = statusMessages[validated.status];
    if (notification) {
      await createUserNotification(validated.uid, 'account_status', notification.title, notification.message);
    }
  }
  
  return { 
    success: true, 
    previousStatus,
    newStatus: validated.status,
    userId: validated.uid,
  };
});

/**
 * Delete user account (soft or hard delete)
 */
export const adminDeleteUser = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = DeleteUserSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Get current user data
  const userRef = getDb().collection('users').doc(validated.uid);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
  
  const userData = userDoc.data();
  
  if (validated.hardDelete) {
    // Hard delete - remove from Firebase Auth and Firestore
    // This is a dangerous operation and should be used sparingly
    
    // Delete from Firebase Auth
    await getAuth().deleteUser(validated.uid);
    
    // Soft-delete the Firestore doc (mark as deleted, don't actually delete)
    await userRef.update({
      status: 'hard_deleted',
      hardDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
      hardDeletedBy: adminUid,
      email: `deleted_${validated.uid}@deleted.local`,
      displayName: '[Deleted User]',
    });
    
    await writeAuditLog(
      adminUid,
      adminEmail,
      'HARD_DELETE_USER',
      'user',
      validated.uid,
      validated.reason,
      { email: userData?.email, displayName: userData?.displayName },
      { status: 'hard_deleted' }
    );
  } else {
    // Soft delete - disable login, mark as deleted
    await getAuth().updateUser(validated.uid, { disabled: true });
    
    await userRef.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: adminUid,
      deleteReason: validated.reason,
    });
    
    await writeAuditLog(
      adminUid,
      adminEmail,
      'SOFT_DELETE_USER',
      'user',
      validated.uid,
      validated.reason,
      { status: userData?.status || 'active' },
      { status: 'deleted' }
    );
  }
  
  return { 
    success: true, 
    deleteType: validated.hardDelete ? 'hard' : 'soft',
    userId: validated.uid,
  };
});

/**
 * Add admin note to user
 */
export const adminAddUserNote = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = AddUserNoteSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Verify user exists
  const userDoc = await getDb().collection('users').doc(validated.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
  
  // Add note to subcollection
  const noteRef = await getDb().collection('users').doc(validated.uid).collection('adminNotes').add({
    note: validated.note,
    adminUid,
    adminEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Write audit log
  await writeAuditLog(
    adminUid,
    adminEmail,
    'ADD_USER_NOTE',
    'user',
    validated.uid,
    'Added admin note',
    undefined,
    { noteId: noteRef.id }
  );
  
  return { success: true, noteId: noteRef.id };
});

// ============================================
// DEAL MANAGEMENT FUNCTIONS
// ============================================

/**
 * Admin cancel deal with refund
 */
export const adminCancelDeal = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = AdminCancelDealSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const dealRef = getDb().collection('deals').doc(validated.dealId);
  const dealDoc = await dealRef.get();
  
  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }
  
  const deal = dealDoc.data()!;
  const previousStatus = deal.status;
  
  // Check if deal can be cancelled
  if (['completed', 'cancelled', 'refunded'].includes(deal.status)) {
    throw new functions.https.HttpsError('failed-precondition', `Cannot cancel deal with status: ${deal.status}`);
  }
  
  // Process refunds if payments were made
  const refunds: Array<{ type: string; amountCents: number; chargeId?: string }> = [];
  
  // Refund principal only (startup fee is non-refundable per business rules)
  if (deal.principalCents && deal.principalCents > 0 && deal.stripePaymentIntentId) {
    try {
      await createRefund(deal.stripePaymentIntentId, deal.principalCents);
      refunds.push({
        type: 'principal',
        amountCents: deal.principalCents,
        chargeId: deal.stripePaymentIntentId,
      });
    } catch (err: any) {
      console.error('Refund failed:', err);
      // Continue with cancellation even if refund fails
      // Mark for manual review
    }
  }
  
  // Update deal status
  await dealRef.update({
    status: 'cancelled',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    cancelledBy: adminUid,
    cancelReason: validated.reason,
    adminCancelled: true,
    refunds,
  });
  
  // Write audit log
  await writeAuditLog(
    adminUid,
    adminEmail,
    'ADMIN_CANCEL_DEAL',
    'deal',
    validated.dealId,
    validated.reason,
    { status: previousStatus },
    { status: 'cancelled', refunds }
  );
  
  // Notify participants
  if (deal.creatorUid) {
    await createUserNotification(
      deal.creatorUid,
      'deal_cancelled',
      'Agreement Cancelled',
      'An administrator has cancelled your agreement. Any eligible payments will be refunded.',
      validated.dealId
    );
  }
  
  if (deal.participantUid) {
    await createUserNotification(
      deal.participantUid,
      'deal_cancelled',
      'Agreement Cancelled',
      'An administrator has cancelled your agreement. Any eligible payments will be refunded.',
      validated.dealId
    );
  }
  
  return { 
    success: true, 
    previousStatus,
    refunds,
    dealId: validated.dealId,
  };
});

/**
 * Add admin note to deal
 */
export const adminAddDealNote = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = AddDealNoteSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const dealDoc = await getDb().collection('deals').doc(validated.dealId).get();
  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }
  
  // Add note to deal's actions subcollection
  const noteRef = await getDb().collection('deals').doc(validated.dealId).collection('actions').add({
    type: 'ADMIN_NOTE',
    actorUid: adminUid,
    userEmail: adminEmail,
    details: validated.note,
    isAdminNote: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'ADD_DEAL_NOTE',
    'deal',
    validated.dealId,
    'Added admin note',
    undefined,
    { noteId: noteRef.id }
  );
  
  return { success: true, noteId: noteRef.id };
});

// ============================================
// MARKETPLACE MODERATION FUNCTIONS
// ============================================

/**
 * Remove marketplace listing
 */
export const adminRemoveListing = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = RemoveListingSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const listingRef = getDb().collection('listings').doc(validated.listingId);
  const listingDoc = await listingRef.get();
  
  if (!listingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Listing not found');
  }
  
  const listing = listingDoc.data()!;
  const previousStatus = listing.status;
  
  await listingRef.update({
    status: 'removed',
    adminRemoved: true,
    removedAt: admin.firestore.FieldValue.serverTimestamp(),
    removedBy: adminUid,
    removeReason: validated.reason,
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'REMOVE_LISTING',
    'listing',
    validated.listingId,
    validated.reason,
    { status: previousStatus },
    { status: 'removed', adminRemoved: true }
  );
  
  // Notify listing owner
  if (listing.creatorUid) {
    await createUserNotification(
      listing.creatorUid,
      'listing_removed',
      'Listing Removed',
      `Your marketplace listing "${listing.title}" has been removed by an administrator.`,
    );
  }
  
  return { success: true, listingId: validated.listingId };
});

/**
 * Restore removed listing
 */
export const adminRestoreListing = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = RestoreListingSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const listingRef = getDb().collection('listings').doc(validated.listingId);
  const listingDoc = await listingRef.get();
  
  if (!listingDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Listing not found');
  }
  
  const listing = listingDoc.data()!;
  
  await listingRef.update({
    status: 'open',
    adminRemoved: false,
    restoredAt: admin.firestore.FieldValue.serverTimestamp(),
    restoredBy: adminUid,
    restoreReason: validated.reason,
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'RESTORE_LISTING',
    'listing',
    validated.listingId,
    validated.reason,
    { status: listing.status, adminRemoved: listing.adminRemoved },
    { status: 'open', adminRemoved: false }
  );
  
  return { success: true, listingId: validated.listingId };
});

// ============================================
// REFUND FUNCTIONS
// ============================================

/**
 * Issue refund for a payment
 */
export const adminIssueRefund = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = IssueRefundSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Get payment record
  const paymentRef = getDb().collection('payments').doc(validated.paymentId);
  const paymentDoc = await paymentRef.get();
  
  if (!paymentDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Payment not found');
  }
  
  const payment = paymentDoc.data()!;
  
  // Check if already fully refunded
  const totalRefunded = (payment.refundedAmountCents || 0) + validated.refundAmountCents;
  if (totalRefunded > payment.amountCents) {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      `Refund amount exceeds remaining balance. Max refundable: ${payment.amountCents - (payment.refundedAmountCents || 0)} cents`
    );
  }
  
  // Process Stripe refund
  const chargeId = payment.stripeChargeId || payment.stripePaymentIntentId;
  if (!chargeId) {
    throw new functions.https.HttpsError('failed-precondition', 'No Stripe charge ID found for payment');
  }
  
  const refund = await createRefund(chargeId, validated.refundAmountCents);
  
  // Update payment record
  await paymentRef.update({
    refundedAmountCents: totalRefunded,
    status: totalRefunded >= payment.amountCents ? 'refunded' : 'partial_refund',
    lastRefundAt: admin.firestore.FieldValue.serverTimestamp(),
    refunds: admin.firestore.FieldValue.arrayUnion({
      amountCents: validated.refundAmountCents,
      reason: validated.reason,
      adminUid,
      stripeRefundId: refund.id,
      createdAt: new Date().toISOString(),
    }),
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'ISSUE_REFUND',
    'payment',
    validated.paymentId,
    validated.reason,
    { refundedAmountCents: payment.refundedAmountCents || 0 },
    { refundedAmountCents: totalRefunded, stripeRefundId: refund.id }
  );
  
  // Notify payer
  if (payment.payerUid) {
    await createUserNotification(
      payment.payerUid,
      'refund_processed',
      'Refund Processed',
      `A refund of $${(validated.refundAmountCents / 100).toFixed(2)} has been processed to your payment method.`,
      payment.dealId
    );
  }
  
  return { 
    success: true, 
    refundId: refund.id,
    refundedAmountCents: validated.refundAmountCents,
    totalRefundedCents: totalRefunded,
  };
});

// ============================================
// SUPPORT TICKET FUNCTIONS
// ============================================

/**
 * Reply to support ticket
 */
export const adminReplyToTicket = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = ReplyToTicketSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const ticketRef = getDb().collection('supportTickets').doc(validated.ticketId);
  const ticketDoc = await ticketRef.get();
  
  if (!ticketDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Ticket not found');
  }
  
  const ticket = ticketDoc.data()!;
  
  // Add message to ticket
  await ticketRef.collection('messages').add({
    message: validated.message,
    senderType: 'admin',
    senderUid: adminUid,
    senderEmail: adminEmail,
    isInternal: validated.isInternal || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Update ticket status if provided
  const updates: Record<string, any> = {
    lastResponseAt: admin.firestore.FieldValue.serverTimestamp(),
    lastResponseBy: adminUid,
  };
  
  if (validated.status) {
    updates.status = validated.status;
  }
  
  await ticketRef.update(updates);
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'REPLY_TO_TICKET',
    'supportTicket',
    validated.ticketId,
    validated.isInternal ? 'Added internal note' : 'Sent reply to user',
    undefined,
    { status: validated.status, isInternal: validated.isInternal }
  );
  
  // Notify user if not internal
  if (!validated.isInternal && ticket.userUid) {
    await createUserNotification(
      ticket.userUid,
      'support_reply',
      'Support Response',
      'You have received a response to your support request.',
    );
  }
  
  return { success: true, ticketId: validated.ticketId };
});

// ============================================
// CASE MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create investigation case
 */
export const adminCreateCase = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = CreateCaseSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const caseRef = await getDb().collection('cases').add({
    title: validated.title,
    description: validated.description,
    priority: validated.priority,
    status: 'open',
    linkedUserIds: validated.linkedUserIds || [],
    linkedDealIds: validated.linkedDealIds || [],
    linkedListingIds: validated.linkedListingIds || [],
    linkedPaymentIds: validated.linkedPaymentIds || [],
    linkedTicketIds: validated.linkedTicketIds || [],
    createdBy: adminUid,
    createdByEmail: adminEmail,
    assignedTo: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Add initial timeline event
  await caseRef.collection('timeline').add({
    type: 'CREATED',
    adminUid,
    adminEmail,
    details: 'Case created',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'CREATE_CASE',
    'case',
    caseRef.id,
    validated.title,
    undefined,
    { priority: validated.priority, linkedEntities: validated.linkedUserIds?.length || 0 }
  );
  
  return { success: true, caseId: caseRef.id };
});

/**
 * Add note to case
 */
export const adminAddCaseNote = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = AddCaseNoteSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const caseRef = getDb().collection('cases').doc(validated.caseId);
  const caseDoc = await caseRef.get();
  
  if (!caseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Case not found');
  }
  
  // Add note
  const noteRef = await caseRef.collection('notes').add({
    note: validated.note,
    isInternal: validated.isInternal,
    adminUid,
    adminEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Add to timeline
  await caseRef.collection('timeline').add({
    type: 'NOTE_ADDED',
    adminUid,
    adminEmail,
    details: 'Note added to case',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  await caseRef.update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'ADD_CASE_NOTE',
    'case',
    validated.caseId,
    'Added case note',
    undefined,
    { noteId: noteRef.id }
  );
  
  return { success: true, noteId: noteRef.id };
});

/**
 * Update case status
 */
export const adminUpdateCaseStatus = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = UpdateCaseStatusSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const caseRef = getDb().collection('cases').doc(validated.caseId);
  const caseDoc = await caseRef.get();
  
  if (!caseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Case not found');
  }
  
  const previousStatus = caseDoc.data()!.status;
  
  await caseRef.update({
    status: validated.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  // Add to timeline
  await caseRef.collection('timeline').add({
    type: 'STATUS_CHANGED',
    adminUid,
    adminEmail,
    details: `Status changed from ${previousStatus} to ${validated.status}: ${validated.reason}`,
    previousStatus,
    newStatus: validated.status,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'UPDATE_CASE_STATUS',
    'case',
    validated.caseId,
    validated.reason,
    { status: previousStatus },
    { status: validated.status }
  );
  
  return { success: true, previousStatus, newStatus: validated.status };
});

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Send admin notification (broadcast or targeted)
 */
export const adminSendNotification = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = SendNotificationSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const targetUids: string[] = [];
  
  if (validated.targetType === 'user' && validated.targetId) {
    // Single user notification
    targetUids.push(validated.targetId);
  } else if (validated.targetType === 'deal' && validated.targetId) {
    // Notify deal participants
    const dealDoc = await getDb().collection('deals').doc(validated.targetId).get();
    if (!dealDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Deal not found');
    }
    const deal = dealDoc.data()!;
    if (deal.creatorUid) targetUids.push(deal.creatorUid);
    if (deal.participantUid) targetUids.push(deal.participantUid);
  } else if (validated.targetType === 'broadcast') {
    // Get all active users
    const usersSnapshot = await getDb().collection('users')
      .where('status', 'in', ['active', null])
      .limit(1000) // Safety limit
      .get();
    usersSnapshot.docs.forEach(doc => targetUids.push(doc.id));
  }
  
  // Create notifications
  const batch = getDb().batch();
  for (const uid of targetUids) {
    const notifRef = getDb().collection('users').doc(uid).collection('notifications').doc();
    batch.set(notifRef, {
      type: validated.type,
      title: validated.title,
      message: validated.message,
      fromAdmin: true,
      adminUid,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'SEND_NOTIFICATION',
    validated.targetType,
    validated.targetId || 'broadcast',
    validated.title,
    undefined,
    { recipientCount: targetUids.length, type: validated.type }
  );
  
  return { success: true, recipientCount: targetUids.length };
});

// ============================================
// MODERATION CONFIG FUNCTIONS
// ============================================

/**
 * Update moderation config
 */
export const adminUpdateModerationConfig = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const validated = UpdateModerationConfigSchema.parse(data);
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  const configRef = getDb().collection('moderationConfig').doc('main');
  const configDoc = await configRef.get();
  
  const beforeData = configDoc.exists ? configDoc.data() : {};
  
  const updates: Record<string, any> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  };
  
  if (validated.blockedTerms !== undefined) {
    updates.blockedTerms = validated.blockedTerms;
  }
  if (validated.flaggedTerms !== undefined) {
    updates.flaggedTerms = validated.flaggedTerms;
  }
  if (validated.suggestions !== undefined) {
    updates.suggestions = validated.suggestions;
  }
  
  await configRef.set(updates, { merge: true });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'UPDATE_MODERATION_CONFIG',
    'moderationConfig',
    'main',
    'Updated moderation configuration',
    { 
      blockedTermsCount: beforeData?.blockedTerms?.length || 0,
      flaggedTermsCount: beforeData?.flaggedTerms?.length || 0,
    },
    { 
      blockedTermsCount: validated.blockedTerms?.length || beforeData?.blockedTerms?.length || 0,
      flaggedTermsCount: validated.flaggedTerms?.length || beforeData?.flaggedTerms?.length || 0,
    }
  );
  
  return { success: true };
});

// ============================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================

/**
 * Bootstrap first admin
 * This function allows the FIRST admin to be created if no admins exist yet,
 * OR if the user's email is in the ADMIN_BOOTSTRAP_EMAILS env var
 */
export const adminBootstrap = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userEmail = context.auth.token.email;
  if (!userEmail) {
    throw new functions.https.HttpsError('failed-precondition', 'User must have an email');
  }
  
  // Check if user already has admin claim
  if (context.auth.token.admin) {
    return { success: true, message: 'Already an admin' };
  }
  
  // Check if ANY admins exist
  const existingAdmins = await getDb().collection('users')
    .where('isAdmin', '==', true)
    .limit(1)
    .get();
  
  const noAdminsExist = existingAdmins.empty;
  
  // Check allowlist from environment variable
  const allowedEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
  const emailInAllowlist = allowedEmails.includes(userEmail.toLowerCase());
  
  // Allow if: no admins exist OR email is in allowlist
  if (!noAdminsExist && !emailInAllowlist) {
    throw new functions.https.HttpsError('permission-denied', 'Admin bootstrap not available. Contact an existing admin.');
  }
  
  // Set admin custom claim
  await getAuth().setCustomUserClaims(context.auth.uid, { admin: true });
  
  // Update user document
  await getDb().collection('users').doc(context.auth.uid).set({
    isAdmin: true,
    adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
    adminGrantedBy: noAdminsExist ? 'first-admin-bootstrap' : 'email-allowlist-bootstrap',
  }, { merge: true });
  
  // Write audit log
  await writeAuditLog(
    context.auth.uid,
    userEmail,
    'ADMIN_BOOTSTRAP',
    'user',
    context.auth.uid,
    noAdminsExist ? 'First admin created via bootstrap' : 'Admin access granted via email allowlist',
    { isAdmin: false },
    { isAdmin: true }
  );
  
  return { 
    success: true, 
    message: 'Admin access granted! Please sign out and sign back in for changes to take effect.',
    firstAdmin: noAdminsExist,
  };
});

/**
 * Grant admin access to another user (requires existing admin)
 */
export const adminGrantAccess = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const { uid, email } = z.object({
    uid: z.string().optional(),
    email: z.string().email().optional(),
  }).parse(data);
  
  if (!uid && !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Must provide uid or email');
  }
  
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Find target user
  let targetUid = uid;
  if (!targetUid && email) {
    const userRecord = await getAuth().getUserByEmail(email);
    targetUid = userRecord.uid;
  }
  
  if (!targetUid) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }
  
  // Set admin claim
  await getAuth().setCustomUserClaims(targetUid, { admin: true });
  
  // Update user document
  await getDb().collection('users').doc(targetUid).update({
    isAdmin: true,
    adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
    adminGrantedBy: adminUid,
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'GRANT_ADMIN_ACCESS',
    'user',
    targetUid,
    `Admin access granted to user`,
    { isAdmin: false },
    { isAdmin: true }
  );
  
  return { success: true, targetUid };
});

/**
 * Revoke admin access from a user
 */
export const adminRevokeAccess = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const { uid } = z.object({
    uid: z.string().min(1),
  }).parse(data);
  
  const adminUid = context.auth!.uid;
  const adminEmail = context.auth!.token.email || '';
  
  // Cannot revoke own admin access
  if (uid === adminUid) {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot revoke own admin access');
  }
  
  // Remove admin claim
  await getAuth().setCustomUserClaims(uid, { admin: false });
  
  // Update user document
  await getDb().collection('users').doc(uid).update({
    isAdmin: false,
    adminRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
    adminRevokedBy: adminUid,
  });
  
  await writeAuditLog(
    adminUid,
    adminEmail,
    'REVOKE_ADMIN_ACCESS',
    'user',
    uid,
    'Admin access revoked',
    { isAdmin: true },
    { isAdmin: false }
  );
  
  return { success: true, targetUid: uid };
});

// ============================================
// ANALYTICS / STATS FUNCTIONS
// ============================================

/**
 * Get admin dashboard stats
 */
export const adminGetStats = functions.https.onCall(async (data, context) => {
  verifyAdmin(context);
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  // Parallel queries for efficiency
  const [
    usersSnapshot,
    users7dSnapshot,
    users30dSnapshot,
    dealsSnapshot,
    listingsSnapshot,
    ticketsSnapshot,
    paymentsSnapshot,
  ] = await Promise.all([
    getDb().collection('users').count().get(),
    getDb().collection('users').where('createdAt', '>=', sevenDaysAgo).count().get(),
    getDb().collection('users').where('createdAt', '>=', thirtyDaysAgo).count().get(),
    getDb().collection('deals').get(),
    getDb().collection('listings').get(),
    getDb().collection('supportTickets').where('status', '==', 'open').count().get(),
    getDb().collection('payments').where('createdAt', '>=', thirtyDaysAgo).get(),
  ]);
  
  // Process deals by status
  const dealsByStatus: Record<string, number> = {};
  let totalPrincipalCents = 0;
  dealsSnapshot.docs.forEach(doc => {
    const deal = doc.data();
    dealsByStatus[deal.status] = (dealsByStatus[deal.status] || 0) + 1;
    if (deal.principalCents) {
      totalPrincipalCents += deal.principalCents;
    }
  });
  
  // Process listings by status
  const listingsByStatus: Record<string, number> = {};
  listingsSnapshot.docs.forEach(doc => {
    const listing = doc.data();
    listingsByStatus[listing.status] = (listingsByStatus[listing.status] || 0) + 1;
  });
  
  // Process payments
  let paymentsToday = 0;
  let payments7d = 0;
  let payments30d = 0;
  let refundCount = 0;
  
  paymentsSnapshot.docs.forEach(doc => {
    const payment = doc.data();
    const paymentDate = payment.createdAt?.toDate();
    
    if (paymentDate >= today) {
      paymentsToday += payment.amountCents || 0;
    }
    if (paymentDate >= sevenDaysAgo) {
      payments7d += payment.amountCents || 0;
    }
    payments30d += payment.amountCents || 0;
    
    if (payment.status === 'refunded' || payment.refundedAmountCents > 0) {
      refundCount++;
    }
  });
  
  return {
    users: {
      total: usersSnapshot.data().count,
      last7d: users7dSnapshot.data().count,
      last30d: users30dSnapshot.data().count,
    },
    deals: {
      total: dealsSnapshot.size,
      byStatus: dealsByStatus,
      totalPrincipalCents,
    },
    listings: {
      total: listingsSnapshot.size,
      byStatus: listingsByStatus,
    },
    payments: {
      todayCents: paymentsToday,
      last7dCents: payments7d,
      last30dCents: payments30d,
      refundCount,
    },
    support: {
      openTickets: ticketsSnapshot.data().count,
    },
    generatedAt: new Date().toISOString(),
  };
});
