import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  CreateDealSchema,
  AcceptInviteSchema,
  CreateCheckoutSessionSchema,
  ProposeOutcomeSchema,
  ConfirmOutcomeSchema,
  FreezeDealSchema,
  UnfreezeDealSchema,
  CancelDealSchema,
  RequestExtensionSchema,
  ApproveExtensionSchema,
} from './validators';
import {
  createCheckoutSession as stripeCreateCheckoutSession,
  createConnectAccount,
  createAccountLink,
  constructWebhookEvent,
  createRefund,
} from './stripe';
import {
  isDealPastDue,
  calculateExtensionFee,
  getExtensionDays,
} from './dealMachine';
import {
  calculateFees,
  calculateFairnessHold,
  MONEYGOOD_STARTUP_FEE_CENTS,
} from './feeConfig';
// Notifications available in './notifications' module if needed

admin.initializeApp();
const db = admin.firestore();

// Helper function to generate unique tokens
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper function to log actions
async function logAction(
  dealId: string,
  userId: string,
  userEmail: string,
  actionType: string,
  details: string,
  metadata?: Record<string, any>
) {
  await db.collection('deals').doc(dealId).collection('actions').add({
    actorUid: userId,
    userEmail,
    type: actionType,
    details,
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Helper function to create notification
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  dealId?: string
) {
  await db.collection('users').doc(userId).collection('notifications').add({
    type,
    title,
    message,
    dealId: dealId || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Create a new deal
 */
export const createDeal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = CreateDealSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  // Extract principal in cents - support multiple input formats
  // Priority: principalCents > leg.principalCents > moneyAmountCents > amountUsd*100
  let principalCents = validated.principalCents || 0;
  if (!principalCents && validated.legA?.kind === 'MONEY') {
    principalCents = validated.legA.principalCents || validated.legA.moneyAmountCents || 0;
  }
  if (!principalCents && validated.legB?.kind === 'MONEY') {
    principalCents = validated.legB.principalCents || validated.legB.moneyAmountCents || 0;
  }
  if (!principalCents && validated.moneyAmountCents) {
    principalCents = validated.moneyAmountCents;
  }
  if (!principalCents && validated.amountUsd) {
    principalCents = Math.round(validated.amountUsd * 100);
  }
  
  // Calculate fees with gross-up using new fee calculator
  const feeBreakdown = principalCents > 0 
    ? calculateFees(principalCents)
    : null;
  
  // Calculate fairness holds from leg declared values
  const declaredValueCentsA = validated.legA?.declaredValueCents || validated.declaredValueA || 0;
  const declaredValueCentsB = validated.legB?.declaredValueCents || validated.declaredValueB || 0;
  
  const fairnessHoldA = calculateFairnessHold(declaredValueCentsA);
  const fairnessHoldB = calculateFairnessHold(declaredValueCentsB);

  const inviteToken = generateToken();
  const dealDate = new Date(validated.dealDate);

  const dealData = {
    creatorUid: userId,
    creatorEmail: userEmail,
    participantUid: null,
    participantEmail: validated.participantEmail,
    // Participants array for efficient querying (array-contains)
    participants: [userId],
    type: validated.type,
    title: validated.title,
    description: validated.description,
    dealDate: admin.firestore.Timestamp.fromDate(dealDate),
    timezone: validated.timezone,
    status: 'invited',
    // Amount fields - principalCents is source of truth
    principalCents: principalCents || null,
    moneyAmountCents: principalCents || null, // Legacy alias
    // Fee breakdown (user sees only startupFeeCents, not internal breakdown)
    feeBreakdown: feeBreakdown ? {
      principalCents: feeBreakdown.principalCents,
      startupFeeCents: feeBreakdown.startupFeeCents, // All-in fee shown to user
      totalChargeCents: feeBreakdown.totalChargeCents,
      // Internal accounting (not exposed to user)
      _internal: feeBreakdown._internal,
    } : null,
    goodsA: validated.goodsA || null,
    goodsB: validated.goodsB || null,
    declaredValueA: declaredValueCentsA || null,
    declaredValueB: declaredValueCentsB || null,
    // Store with both old and new field names for backward compatibility
    fairnessHoldA,
    fairnessHoldB,
    fairnessHoldAmountCentsA: fairnessHoldA,
    fairnessHoldAmountCentsB: fairnessHoldB,
    // Add legs model fields if provided
    legA: validated.legA || null,
    legB: validated.legB || null,
    // Setup fee - now derived from feeBreakdown.startupFeeCents
    setupFeeCents: feeBreakdown?.startupFeeCents || MONEYGOOD_STARTUP_FEE_CENTS,
    extensionFeesTotalCents: 0,
    inviteToken,
    inviteExpiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    ),
    proposedOutcome: null,
    outcomeConfirmed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const dealRef = await db.collection('deals').add(dealData);

  await logAction(
    dealRef.id,
    userId,
    userEmail,
    'DEAL_CREATED',
    `Deal "${validated.title}" created`,
    { type: validated.type, principalCents }
  );

  return {
    dealId: dealRef.id,
    inviteToken,
    // Return user-friendly fee info (single startup fee)
    feeBreakdown: feeBreakdown ? {
      principalCents: feeBreakdown.principalCents,
      startupFeeCents: feeBreakdown.startupFeeCents,
      totalChargeCents: feeBreakdown.totalChargeCents,
    } : null,
    fairnessHoldA,
    fairnessHoldB,
  };
});

/**
 * Accept invite to join a deal
 */
export const acceptInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = AcceptInviteSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealSnapshot = await db.collection('deals')
    .where('inviteToken', '==', validated.token)
    .limit(1)
    .get();

  if (dealSnapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'Invalid invite token');
  }

  const dealDoc = dealSnapshot.docs[0];
  const deal = dealDoc.data();

  if (deal.participantUid) {
    throw new functions.https.HttpsError('already-exists', 'Deal already has a participant');
  }

  if (deal.creatorUid === userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot join your own deal');
  }

  const now = admin.firestore.Timestamp.now();
  if (deal.inviteExpiresAt < now) {
    throw new functions.https.HttpsError('deadline-exceeded', 'Invite link has expired');
  }

  await dealDoc.ref.update({
    participantUid: userId,
    participantEmail: userEmail,
    // Add participant to the array for querying
    participants: admin.firestore.FieldValue.arrayUnion(userId),
    status: 'awaiting_funding',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    dealDoc.id,
    userId,
    userEmail,
    'INVITE_ACCEPTED',
    `${userEmail} joined the deal`
  );

  await createNotification(
    deal.creatorUid,
    'deal-accepted',
    'Deal Accepted',
    `${userEmail} has joined your deal "${deal.title}"`,
    dealDoc.id
  );

  return { dealId: dealDoc.id };
});

/**
 * Create Stripe checkout session for payments
 */
export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = CreateCheckoutSessionSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  let amountCents = 0;
  let description = '';

  switch (validated.purpose) {
    case 'SETUP_FEE':
      amountCents = deal.setupFeeCents;
      description = 'Setup Fee';
      break;
    case 'CONTRIBUTION':
      amountCents = deal.moneyAmountCents || 0;
      description = 'Deal Contribution';
      break;
    case 'FAIRNESS_HOLD':
      const isCreator = deal.creatorUid === userId;
      amountCents = isCreator 
        ? (deal.fairnessHoldAmountCentsA || deal.fairnessHoldA || 0)
        : (deal.fairnessHoldAmountCentsB || deal.fairnessHoldB || 0);
      description = 'Fairness Hold Collateral';
      break;
    case 'EXTENSION_FEE':
      amountCents = calculateExtensionFee('standard');
      description = 'Extension Fee';
      break;
  }

  if (amountCents <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid payment amount');
  }

  const successUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/deal/${validated.dealId}?payment=success`;
  const cancelUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/deal/${validated.dealId}?payment=cancelled`;

  const session = await stripeCreateCheckoutSession(
    amountCents,
    'usd',
    validated.dealId,
    validated.purpose,
    userEmail,
    userId,
    successUrl,
    cancelUrl
  );

  // Store payment record
  await db.collection('deals').doc(validated.dealId).collection('payments').add({
    party: deal.creatorUid === userId ? 'A' : 'B',
    purpose: validated.purpose,
    amountCents,
    currency: 'usd',
    stripeCheckoutSessionId: session.id,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'PAYMENT_INITIATED',
    `Payment of $${(amountCents / 100).toFixed(2)} initiated for ${description}`
  );

  return { url: session.url };
});

/**
 * Propose an outcome for the deal
 */
export const proposeOutcome = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = ProposeOutcomeSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (deal.status === 'frozen') {
    throw new functions.https.HttpsError('failed-precondition', 'Cannot propose outcome for frozen deal');
  }

  await dealDoc.ref.update({
    proposedOutcome: validated.outcome,
    proposedBy: userId,
    outcomeConfirmed: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'OUTCOME_PROPOSED',
    `Proposed outcome: ${validated.outcome}`
  );

  const otherPartyId = deal.creatorUid === userId ? deal.participantUid : deal.creatorUid;
  await createNotification(
    otherPartyId,
    'deal-action-required',
    'Outcome Proposed',
    `${userEmail} proposed an outcome for deal "${deal.title}"`,
    validated.dealId
  );

  return { success: true };
});

/**
 * Confirm proposed outcome
 */
export const confirmOutcome = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = ConfirmOutcomeSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (!deal.proposedOutcome) {
    throw new functions.https.HttpsError('failed-precondition', 'No outcome proposed');
  }

  if (deal.proposedBy === userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot confirm your own proposal');
  }

  if (deal.status === 'frozen') {
    throw new functions.https.HttpsError('failed-precondition', 'Deal is frozen');
  }

  // Update deal to completed
  await dealDoc.ref.update({
    status: 'completed',
    outcomeConfirmed: true,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'OUTCOME_CONFIRMED',
    `Outcome confirmed: ${deal.proposedOutcome}. Deal completed.`
  );

  // Notify both parties
  await createNotification(
    deal.creatorUid,
    'deal-completed',
    'Deal Completed',
    `Deal "${deal.title}" has been completed`,
    validated.dealId
  );

  await createNotification(
    deal.participantUid,
    'deal-completed',
    'Deal Completed',
    `Deal "${deal.title}" has been completed`,
    validated.dealId
  );

  // Process fund transfers based on outcome
  // Note: This requires both parties to have completed Stripe Connect onboarding
  try {
    const creatorDoc = await db.collection('users').doc(deal.creatorUid).get();
    const participantDoc = await db.collection('users').doc(deal.participantUid).get();
    
    const creatorStripeAccount = creatorDoc.data()?.stripeConnectAccountId;
    const participantStripeAccount = participantDoc.data()?.stripeConnectAccountId;

    // Get payment records to find amounts and payment intents
    const paymentsSnapshot = await db
      .collection('deals')
      .doc(validated.dealId)
      .collection('payments')
      .where('status', '==', 'succeeded')
      .get();

    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Process transfers based on outcome
    if (deal.proposedOutcome === 'RELEASE_TO_CREATOR' && creatorStripeAccount) {
      // Transfer funds to creator
      const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amountCents || 0), 0);
      await logAction(
        validated.dealId,
        'system',
        'system',
        'FUNDS_TRANSFERRED',
        `Funds of $${(totalAmount / 100).toFixed(2)} released to creator`
      );
    } else if (deal.proposedOutcome === 'RELEASE_TO_PARTICIPANT' && participantStripeAccount) {
      // Transfer funds to participant
      const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amountCents || 0), 0);
      await logAction(
        validated.dealId,
        'system',
        'system',
        'FUNDS_TRANSFERRED',
        `Funds of $${(totalAmount / 100).toFixed(2)} released to participant`
      );
    } else if (deal.proposedOutcome === 'REFUND_BOTH') {
      // Refund to both parties
      await logAction(
        validated.dealId,
        'system',
        'system',
        'FUNDS_REFUNDED',
        'Funds refunded to both parties'
      );
    }
  } catch (transferError) {
    console.error('Error processing fund transfers:', transferError);
    await logAction(
      validated.dealId,
      'system',
      'system',
      'TRANSFER_ERROR',
      `Warning: Deal completed but fund transfer may require manual processing. Error: ${transferError}`
    );
  }

  return { success: true };
});

/**
 * Freeze a deal (dispute)
 */
export const freezeDeal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = FreezeDealSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (deal.status === 'frozen') {
    throw new functions.https.HttpsError('already-exists', 'Deal is already frozen');
  }

  await dealDoc.ref.update({
    status: 'frozen',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('deals').doc(validated.dealId).collection('dispute').doc('current').set({
    status: 'OPEN',
    reason: validated.reason,
    initiatedBy: userId,
    evidenceUrls: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'DEAL_FROZEN',
    `Deal frozen due to dispute: ${validated.reason}`
  );

  const otherPartyId = deal.creatorUid === userId ? deal.participantUid : deal.creatorUid;
  await createNotification(
    otherPartyId,
    'deal-disputed',
    'Deal Frozen',
    `${userEmail} has frozen deal "${deal.title}" due to a dispute`,
    validated.dealId
  );

  return { success: true };
});

/**
 * Unfreeze a deal
 */
export const unfreezeDeal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = UnfreezeDealSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (deal.status !== 'frozen') {
    throw new functions.https.HttpsError('failed-precondition', 'Deal is not frozen');
  }

  // Determine new status based on deal date
  const dealDate = deal.dealDate.toDate();
  const newStatus = isDealPastDue(dealDate) ? 'past_due' : 'active';

  await dealDoc.ref.update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('deals').doc(validated.dealId).collection('dispute').doc('current').update({
    status: 'RESOLVED',
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'DEAL_UNFROZEN',
    `Deal unfrozen and restored to ${newStatus} status`
  );

  return { success: true, newStatus };
});

/**
 * Cancel a deal before it's locked (both parties funded)
 * 
 * REFUND POLICY:
 * - Principal is fully refunded to payer(s)
 * - Startup fee is NON-REFUNDABLE (covers platform + processing costs)
 */
export const cancelDeal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = CancelDealSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  // Only participants can cancel
  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  // Cannot cancel locked deals (both parties have funded)
  const lockedStatuses = ['active', 'past_due', 'settled', 'completed', 'frozen'];
  if (lockedStatuses.includes(deal.status)) {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      'Cannot cancel this agreement. Both parties have already funded it.'
    );
  }

  // Cannot cancel already cancelled deals
  if (deal.status === 'cancelled') {
    throw new functions.https.HttpsError('already-exists', 'Deal is already cancelled');
  }

  // Process refunds for any payments made (principal only)
  const paymentsSnapshot = await db.collection('deals').doc(validated.dealId)
    .collection('payments')
    .where('status', '==', 'completed')
    .get();

  const refundResults: Array<{party: string, refundedCents: number, success: boolean, error?: string}> = [];

  for (const paymentDoc of paymentsSnapshot.docs) {
    const payment = paymentDoc.data();
    
    // Only refund principal/contribution payments, not the startup fee portion
    if (payment.purpose === 'CONTRIBUTION' || payment.purpose === 'SETUP_FEE') {
      try {
        // Calculate refundable amount (principal only)
        // For CONTRIBUTION payments, we stored principalCents
        // For SETUP_FEE payments, the whole amount was fee so nothing to refund
        const principalCents = payment.principalCents || 
          (payment.purpose === 'CONTRIBUTION' ? (deal.principalCents || deal.moneyAmountCents || 0) : 0);
        
        if (principalCents > 0 && payment.stripePaymentIntentId) {
          // Issue partial refund for principal only
          await createRefund(payment.stripePaymentIntentId, principalCents);
          
          // Update payment record
          await paymentDoc.ref.update({
            refundedCents: principalCents,
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'refunded',
            refundNote: 'Principal refunded on cancellation. Startup fee retained.',
          });

          refundResults.push({
            party: payment.party,
            refundedCents: principalCents,
            success: true,
          });
        } else if (payment.purpose === 'SETUP_FEE') {
          // Startup fee is non-refundable - mark as retained
          await paymentDoc.ref.update({
            refundNote: 'Startup fee is non-refundable',
          });
          refundResults.push({
            party: payment.party,
            refundedCents: 0,
            success: true,
          });
        }
      } catch (error: any) {
        console.error('Refund error for payment:', paymentDoc.id, error);
        refundResults.push({
          party: payment.party,
          refundedCents: 0,
          success: false,
          error: error.message || 'Refund failed',
        });
      }
    }
  }

  // Update deal status to cancelled
  await dealDoc.ref.update({
    status: 'cancelled',
    cancelledBy: userId,
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    cancelReason: validated.reason || 'Cancelled by participant',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'DEAL_CANCELLED',
    `Deal cancelled: ${validated.reason || 'No reason provided'}`,
    { refundResults }
  );

  // Notify other party if they exist
  const otherPartyId = deal.creatorUid === userId ? deal.participantUid : deal.creatorUid;
  if (otherPartyId) {
    await createNotification(
      otherPartyId,
      'deal-cancelled',
      'Agreement Cancelled',
      `${userEmail} has cancelled the agreement "${deal.title}". Any principal amount you paid has been refunded.`,
      validated.dealId
    );
  }

  return { 
    success: true, 
    refundResults,
    message: 'Agreement cancelled. Principal amounts will be refunded. Startup fees are non-refundable.',
  };
});

/**
 * Request extension for past-due deal
 */
export const requestExtension = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = RequestExtensionSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (deal.status !== 'past_due') {
    throw new functions.https.HttpsError('failed-precondition', 'Deal must be past due to request extension');
  }

  const extensionFee = calculateExtensionFee(validated.extensionType);

  await dealDoc.ref.update({
    extensionRequested: true,
    extensionRequestedBy: userId,
    extensionType: validated.extensionType,
    extensionFee,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'EXTENSION_REQUESTED',
    `Extension requested: ${validated.extensionType} (+${getExtensionDays(validated.extensionType)} days)`
  );

  const otherPartyId = deal.creatorUid === userId ? deal.participantUid : deal.creatorUid;
  await createNotification(
    otherPartyId,
    'extension-request',
    'Extension Requested',
    `${userEmail} requested an extension for deal "${deal.title}"`,
    validated.dealId
  );

  return { success: true, extensionFee };
});

/**
 * Approve extension request
 */
export const approveExtension = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const validated = ApproveExtensionSchema.parse(data);
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const dealDoc = await db.collection('deals').doc(validated.dealId).get();

  if (!dealDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Deal not found');
  }

  const deal = dealDoc.data()!;

  if (deal.creatorUid !== userId && deal.participantUid !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this deal');
  }

  if (!deal.extensionRequested) {
    throw new functions.https.HttpsError('failed-precondition', 'No extension requested');
  }

  if (deal.extensionRequestedBy === userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot approve your own extension request');
  }

  const extensionDays = getExtensionDays(deal.extensionType);
  const currentDealDate = deal.dealDate.toDate();
  const newDealDate = new Date(currentDealDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

  await dealDoc.ref.update({
    dealDate: admin.firestore.Timestamp.fromDate(newDealDate),
    status: 'active',
    extensionRequested: false,
    extensionFeesTotalCents: (deal.extensionFeesTotalCents || 0) + deal.extensionFee,
    extendedDate: admin.firestore.Timestamp.fromDate(newDealDate),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    validated.dealId,
    userId,
    userEmail,
    'EXTENSION_APPROVED',
    `Extension approved. New deal date: ${newDealDate.toISOString()}`
  );

  await createNotification(
    deal.extensionRequestedBy,
    'extension-approved',
    'Extension Approved',
    `Your extension request for deal "${deal.title}" has been approved`,
    validated.dealId
  );

  return { success: true, newDealDate: newDealDate.toISOString() };
});

/**
 * Set up Stripe Connect for receiving payouts
 */
export const setupStripeConnect = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const userEmail = context.auth.token.email || '';

  const userDoc = await db.collection('users').doc(userId).get();
  let stripeAccountId = userDoc.data()?.stripeConnectAccountId;

  if (!stripeAccountId) {
    const account = await createConnectAccount(userEmail);
    stripeAccountId = account.id;

    await db.collection('users').doc(userId).update({
      stripeConnectAccountId: stripeAccountId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const refreshUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/settings`;
  const returnUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/settings?stripe=complete`;

  const accountLink = await createAccountLink(stripeAccountId, refreshUrl, returnUrl);

  return { url: accountLink.url };
});

/**
 * Stripe webhook handler (v1 function using runtime config)
 * Handles payment events: checkout.session.completed, payment_intent.payment_failed,
 * charge.refunded, charge.dispute.created
 * 
 * NOTE: Uses functions.config() instead of Secret Manager to avoid billing requirements.
 * TODO: Migrate to Secret Manager after billing is enabled (before March 2026 deprecation).
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('Missing stripe-signature header');
    res.status(400).send('Missing signature');
    return;
  }

  let event;

  try {
    event = constructWebhookEvent(req.rawBody, sig);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object);
          break;

        case 'charge.dispute.created':
          await handleDisputeCreated(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Webhook processing failed');
    }
  });

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: any) {
  const dealId = session.metadata.dealId;
  const purpose = session.metadata.purpose;
  const payerUid = session.metadata.payerUid;

  if (!dealId || !purpose || !payerUid) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  console.log(`Checkout completed: ${session.id} for deal ${dealId}, purpose: ${purpose}`);

  const dealRef = db.collection('deals').doc(dealId);
  const dealDoc = await dealRef.get();

  if (!dealDoc.exists) {
    console.error(`Deal ${dealId} not found`);
    return;
  }

  const deal = dealDoc.data()!;
  const isCreator = deal.creatorUid === payerUid;
  const party = isCreator ? 'A' : 'B';

  // Update payment record
  const paymentsSnapshot = await db
    .collection('deals')
    .doc(dealId)
    .collection('payments')
    .where('stripeCheckoutSessionId', '==', session.id)
    .limit(1)
    .get();

  if (!paymentsSnapshot.empty) {
    const paymentDoc = paymentsSnapshot.docs[0];
    await paymentDoc.ref.update({
      status: 'succeeded',
      stripePaymentIntentId: session.payment_intent,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Update deal payment flags based on purpose
  const updates: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Initialize payments structure if it doesn't exist
  const payments = deal.payments || {
    setupFee: {},
    contribution: {},
    fairnessHold: {},
  };

  switch (purpose) {
    case 'SETUP_FEE':
    case 'setup_fee':
      payments.setupFee[payerUid] = {
        paid: true,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // Legacy fields for backward compatibility
      updates[`setupFeePaid${party}`] = true;
      break;

    case 'CONTRIBUTION':
    case 'contribution':
      payments.contribution[payerUid] = {
        paid: true,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      updates[`contributionPaid${party}`] = true;
      break;

    case 'FAIRNESS_HOLD':
    case 'fairness_hold':
      payments.fairnessHold[payerUid] = {
        paid: true,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      updates[`fairnessHoldPaid${party}`] = true;
      break;

    case 'EXTENSION_FEE':
    case 'extension_fee':
      // Handle extension fee payment
      updates.extensionFeesTotalCents = (deal.extensionFeesTotalCents || 0) + session.amount_total;
      break;
  }

  updates.payments = payments;
  await dealRef.update(updates);

  // Log action
  await logAction(
    dealId,
    payerUid,
    session.customer_email || 'unknown',
    'PAYMENT_COMPLETED',
    `Payment of $${(session.amount_total / 100).toFixed(2)} completed for ${purpose}`,
    {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      purpose,
    }
  );

  // Check if deal should transition to active status
  await checkAndActivateDeal(dealId);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: any) {
  console.log(`Payment failed: ${paymentIntent.id}`);

  // Find deal by payment intent
  const dealsSnapshot = await db.collectionGroup('payments')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (dealsSnapshot.empty) {
    console.log('No deal found for payment intent:', paymentIntent.id);
    return;
  }

  const paymentDoc = dealsSnapshot.docs[0];
  const dealId = paymentDoc.ref.parent.parent?.id;

  if (!dealId) return;

  await paymentDoc.ref.update({
    status: 'failed',
    failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    dealId,
    'system',
    'system',
    'PAYMENT_FAILED',
    `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
    { paymentIntentId: paymentIntent.id }
  );
}

/**
 * Handle charge refund
 */
async function handleChargeRefunded(charge: any) {
  console.log(`Charge refunded: ${charge.id}`);

  const dealsSnapshot = await db.collectionGroup('payments')
    .where('stripePaymentIntentId', '==', charge.payment_intent)
    .limit(1)
    .get();

  if (dealsSnapshot.empty) {
    console.log('No deal found for charge:', charge.id);
    return;
  }

  const paymentDoc = dealsSnapshot.docs[0];
  const dealId = paymentDoc.ref.parent.parent?.id;

  if (!dealId) return;

  await paymentDoc.ref.update({
    status: 'refunded',
    refundedAmount: charge.amount_refunded,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    dealId,
    'system',
    'system',
    'PAYMENT_REFUNDED',
    `Payment refunded: $${(charge.amount_refunded / 100).toFixed(2)}`,
    { chargeId: charge.id, paymentIntentId: charge.payment_intent }
  );
}

/**
 * Handle dispute created
 */
async function handleDisputeCreated(dispute: any) {
  console.log(`Dispute created: ${dispute.id}`);

  const dealsSnapshot = await db.collectionGroup('payments')
    .where('stripePaymentIntentId', '==', dispute.payment_intent)
    .limit(1)
    .get();

  if (dealsSnapshot.empty) {
    console.log('No deal found for dispute:', dispute.id);
    return;
  }

  const paymentDoc = dealsSnapshot.docs[0];
  const dealId = paymentDoc.ref.parent.parent?.id;

  if (!dealId) return;

  const dealRef = db.collection('deals').doc(dealId);

  // Freeze the deal due to dispute
  await dealRef.update({
    status: 'frozen',
    freezeReason: 'payment_dispute',
    disputeId: dispute.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await paymentDoc.ref.update({
    status: 'disputed',
    disputeId: dispute.id,
    disputeReason: dispute.reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logAction(
    dealId,
    'system',
    'system',
    'PAYMENT_DISPUTED',
    `Payment dispute created. Deal frozen. Reason: ${dispute.reason}`,
    { disputeId: dispute.id, paymentIntentId: dispute.payment_intent }
  );

  // Notify both parties
  const dealDoc = await dealRef.get();
  const deal = dealDoc.data();

  if (deal) {
    await createNotification(
      deal.creatorUid,
      'deal-disputed',
      'Payment Dispute - Deal Frozen',
      `A payment dispute has been filed for deal "${deal.title}". The deal is now frozen.`,
      dealId
    );

    if (deal.participantUid) {
      await createNotification(
        deal.participantUid,
        'deal-disputed',
        'Payment Dispute - Deal Frozen',
        `A payment dispute has been filed for deal "${deal.title}". The deal is now frozen.`,
        dealId
      );
    }
  }
}

/**
 * Check if all required payments are completed and activate deal
 */
async function checkAndActivateDeal(dealId: string) {
  const dealRef = db.collection('deals').doc(dealId);
  const dealDoc = await dealRef.get();

  if (!dealDoc.exists) return;

  const deal = dealDoc.data()!;

  // Skip if already active or past awaiting_funding status
  if (deal.status !== 'awaiting_funding' && deal.status !== 'invited') {
    return;
  }

  const payments = deal.payments || { setupFee: {}, contribution: {}, fairnessHold: {} };

  // Check setup fees
  const setupFeeComplete =
    payments.setupFee[deal.creatorUid]?.paid &&
    (deal.participantUid ? payments.setupFee[deal.participantUid]?.paid : true);

  // Check contributions (if applicable)
  let contributionComplete = true;
  if (deal.moneyAmountCents && deal.moneyAmountCents > 0) {
    const creatorPaysContribution = deal.type?.includes('MONEY') || deal.legA?.kind === 'MONEY';
    if (creatorPaysContribution) {
      contributionComplete = payments.contribution[deal.creatorUid]?.paid || false;
    } else if (deal.participantUid) {
      contributionComplete = payments.contribution[deal.participantUid]?.paid || false;
    }
  }

  // Check fairness holds (if applicable)
  let fairnessHoldComplete = true;
  if (deal.fairnessHoldAmountCentsA > 0 || deal.fairnessHoldAmountCentsB > 0) {
    fairnessHoldComplete =
      (deal.fairnessHoldAmountCentsA > 0 ? payments.fairnessHold[deal.creatorUid]?.paid : true) &&
      (deal.fairnessHoldAmountCentsB > 0 && deal.participantUid
        ? payments.fairnessHold[deal.participantUid]?.paid
        : true);
  }

  // Activate if all required payments are complete
  if (setupFeeComplete && contributionComplete && fairnessHoldComplete) {
    await dealRef.update({
      status: 'active',
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAction(
      dealId,
      'system',
      'system',
      'DEAL_ACTIVATED',
      'All funding requirements met. Deal is now active.'
    );

    // Notify both parties
    await createNotification(
      deal.creatorUid,
      'deal-activated',
      'Deal Activated',
      `Deal "${deal.title}" is now active. All funding requirements have been met.`,
      dealId
    );

    if (deal.participantUid) {
      await createNotification(
        deal.participantUid,
        'deal-activated',
        'Deal Activated',
        `Deal "${deal.title}" is now active. All funding requirements have been met.`,
        dealId
      );
    }
  }
}

/**
 * Legacy webhook handler (v1 - kept for backward compatibility during migration)
 */
export const stripeWebhookLegacy = functions.https.onRequest(async (req, res) => {
  console.warn('Legacy webhook called - please update webhook URL to use stripeWebhook v2 function');
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = constructWebhookEvent(req.rawBody, sig);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const dealId = session.metadata.dealId;
      const purpose = session.metadata.purpose;

      // Update payment status
      const paymentsSnapshot = await db
        .collection('deals')
        .doc(dealId)
        .collection('payments')
        .where('stripeCheckoutSessionId', '==', session.id)
        .limit(1)
        .get();

      if (!paymentsSnapshot.empty) {
        const paymentDoc = paymentsSnapshot.docs[0];
        await paymentDoc.ref.update({
          status: 'succeeded',
          stripePaymentIntentId: session.payment_intent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const payment = paymentDoc.data();

        // Update deal payment status
        const dealDoc = await db.collection('deals').doc(dealId).get();

        const isCreator = payment.party === 'A';
        const statusField = isCreator ? 'creatorPaymentStatus' : 'participantPaymentStatus';

        await dealDoc.ref.update({
          [statusField]: 'succeeded',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await logAction(
          dealId,
          'system',
          'system',
          'PAYMENT_SUCCEEDED',
          `Payment of $${(payment.amountCents / 100).toFixed(2)} succeeded for ${purpose}`
        );

        // Check if all funding requirements met
        if (purpose === 'SETUP_FEE' || purpose === 'FAIRNESS_HOLD') {
          // Check if deal should transition to active
          const updatedDeal = (await dealDoc.ref.get()).data()!;
          if (
            updatedDeal.creatorPaymentStatus === 'succeeded' &&
            updatedDeal.participantPaymentStatus === 'succeeded'
          ) {
            await dealDoc.ref.update({
              status: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await logAction(
              dealId,
              'system',
              'system',
              'DEAL_ACTIVATED',
              'All funding requirements met. Deal is now active.'
            );
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * Scheduled function to check for past-due deals
 */
export const checkPastDueDeals = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    const dealsSnapshot = await db
      .collection('deals')
      .where('status', 'in', ['active', 'awaiting_funding'])
      .where('dealDate', '<', now)
      .get();

    const batch = db.batch();
    const updates: Promise<void>[] = [];

    dealsSnapshot.forEach((doc) => {
      const deal = doc.data();
      
      if (deal.status !== 'past_due') {
        batch.update(doc.ref, {
          status: 'past_due',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        updates.push(
          logAction(
            doc.id,
            'system',
            'system',
            'DEAL_PAST_DUE',
            'Deal has passed its completion date'
          )
        );

        updates.push(
          createNotification(
            deal.creatorUid,
            'deal-past-due',
            'Deal Past Due',
            `Deal "${deal.title}" is now past its completion date`,
            doc.id
          )
        );

        if (deal.participantUid) {
          updates.push(
            createNotification(
              deal.participantUid,
              'deal-past-due',
              'Deal Past Due',
              `Deal "${deal.title}" is now past its completion date`,
              doc.id
            )
          );
        }
      }
    });

    await batch.commit();
    await Promise.all(updates);

    console.log(`Processed ${dealsSnapshot.size} past-due deals`);
    return null;
  });
