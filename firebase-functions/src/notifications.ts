/**
 * Notification system for deal actions and updates
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface Notification {
  id?: string;
  userId: string;
  type: 'DEAL_INVITE' | 'DEAL_FUNDED' | 'DEAL_ACTIVE' | 'DEAL_PAST_DUE' | 
        'OUTCOME_PROPOSED' | 'OUTCOME_CONFIRMED' | 'DEAL_COMPLETED' | 
        'DEAL_FROZEN' | 'EXTENSION_REQUESTED' | 'EXTENSION_APPROVED' | 
        'PAYMENT_RECEIVED' | 'ACTION_REQUIRED';
  title: string;
  message: string;
  dealId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: FirebaseFirestore.Timestamp | FieldValue;
}

const db = getFirestore();

/**
 * Create a notification for a user
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<void> {
  try {
    const notifData: Omit<Notification, 'id'> = {
      ...notification,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(notification.userId)
      .collection('notifications')
      .add(notifData);
      
    console.log(`Notification created for user ${notification.userId}: ${notification.type}`);
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Create notifications for both parties in a deal
 */
export async function notifyBothParties(params: {
  creatorUid: string;
  participantUid: string;
  type: Notification['type'];
  title: string;
  message: string;
  dealId: string;
  actionUrl?: string;
}): Promise<void> {
  const { creatorUid, participantUid, type, title, message, dealId, actionUrl } = params;

  await Promise.all([
    createNotification({
      userId: creatorUid,
      type,
      title,
      message,
      dealId,
      actionUrl,
    }),
    createNotification({
      userId: participantUid,
      type,
      title,
      message,
      dealId,
      actionUrl,
    }),
  ]);
}

/**
 * Notify party about deal invitation
 */
export async function notifyDealInvite(params: {
  invitedUserId: string;
  dealId: string;
  dealTitle: string;
  inviterEmail: string;
}): Promise<void> {
  await createNotification({
    userId: params.invitedUserId,
    type: 'DEAL_INVITE',
    title: 'New Deal Invitation',
    message: `${params.inviterEmail} invited you to a deal: ${params.dealTitle}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when deal is fully funded and active
 */
export async function notifyDealActive(params: {
  creatorUid: string;
  participantUid: string;
  dealId: string;
  dealTitle: string;
}): Promise<void> {
  await notifyBothParties({
    creatorUid: params.creatorUid,
    participantUid: params.participantUid,
    type: 'DEAL_ACTIVE',
    title: 'Deal is Now Active',
    message: `Your deal "${params.dealTitle}" is fully funded and active!`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when deal is past due
 */
export async function notifyDealPastDue(params: {
  creatorUid: string;
  participantUid: string;
  dealId: string;
  dealTitle: string;
}): Promise<void> {
  await notifyBothParties({
    creatorUid: params.creatorUid,
    participantUid: params.participantUid,
    type: 'DEAL_PAST_DUE',
    title: 'Deal Past Due',
    message: `Your deal "${params.dealTitle}" has passed its completion date. Propose an outcome or request an extension.`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when outcome is proposed
 */
export async function notifyOutcomeProposed(params: {
  otherPartyUid: string;
  dealId: string;
  dealTitle: string;
  proposerEmail: string;
  outcome: string;
}): Promise<void> {
  await createNotification({
    userId: params.otherPartyUid,
    type: 'OUTCOME_PROPOSED',
    title: 'Deal Outcome Proposed',
    message: `${params.proposerEmail} proposed outcome for "${params.dealTitle}": ${params.outcome}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when deal is completed
 */
export async function notifyDealCompleted(params: {
  creatorUid: string;
  participantUid: string;
  dealId: string;
  dealTitle: string;
}): Promise<void> {
  await notifyBothParties({
    creatorUid: params.creatorUid,
    participantUid: params.participantUid,
    type: 'DEAL_COMPLETED',
    title: 'Deal Completed',
    message: `Your deal "${params.dealTitle}" has been completed successfully!`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when deal is frozen
 */
export async function notifyDealFrozen(params: {
  otherPartyUid: string;
  dealId: string;
  dealTitle: string;
  freezerEmail: string;
  reason: string;
}): Promise<void> {
  await createNotification({
    userId: params.otherPartyUid,
    type: 'DEAL_FROZEN',
    title: 'Deal Frozen - Dispute',
    message: `${params.freezerEmail} froze deal "${params.dealTitle}". Reason: ${params.reason}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when extension is requested
 */
export async function notifyExtensionRequested(params: {
  otherPartyUid: string;
  dealId: string;
  dealTitle: string;
  requesterEmail: string;
  newDate: string;
}): Promise<void> {
  await createNotification({
    userId: params.otherPartyUid,
    type: 'EXTENSION_REQUESTED',
    title: 'Extension Requested',
    message: `${params.requesterEmail} requested to extend "${params.dealTitle}" to ${params.newDate}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when extension is approved
 */
export async function notifyExtensionApproved(params: {
  requesterUid: string;
  dealId: string;
  dealTitle: string;
  newDate: string;
}): Promise<void> {
  await createNotification({
    userId: params.requesterUid,
    type: 'EXTENSION_APPROVED',
    title: 'Extension Approved',
    message: `Your extension request for "${params.dealTitle}" was approved. New date: ${params.newDate}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when payment is received
 */
export async function notifyPaymentReceived(params: {
  userId: string;
  dealId: string;
  dealTitle: string;
  amountCents: number;
  purpose: string;
}): Promise<void> {
  const amount = `$${(params.amountCents / 100).toFixed(2)}`;
  await createNotification({
    userId: params.userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `Received ${amount} for ${params.purpose} - "${params.dealTitle}"`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}

/**
 * Notify when action is required from user
 */
export async function notifyActionRequired(params: {
  userId: string;
  dealId: string;
  dealTitle: string;
  action: string;
}): Promise<void> {
  await createNotification({
    userId: params.userId,
    type: 'ACTION_REQUIRED',
    title: 'Action Required',
    message: `"${params.dealTitle}": ${params.action}`,
    dealId: params.dealId,
    actionUrl: `#/deal/${params.dealId}`,
  });
}
