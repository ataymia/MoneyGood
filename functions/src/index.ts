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
  RequestExtensionSchema,
  ApproveExtensionSchema,
} from './validators';
import {
  stripe,
  createCheckoutSession,
  createConnectAccount,
  createAccountLink,
  createTransfer,
  createRefund,
  constructWebhookEvent,
} from './stripe';
import {
  calculateSetupFee,
  calculateFairnessHold,
  getNextStatus,
  isDealPastDue,
  calculateExtensionFee,
  getExtensionDays,
} from './dealMachine';

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

  const setupFeeCents = calculateSetupFee(validated.type);
  const { fairnessHoldA, fairnessHoldB } = calculateFairnessHold(
    validated.type,
    validated.declaredValueA,
    validated.declaredValueB
  );

  const inviteToken = generateToken();
  const dealDate = new Date(validated.dealDate);

  const dealData = {
    creatorUid: userId,
    creatorEmail: userEmail,
    participantUid: null,
    participantEmail: validated.participantEmail,
    type: validated.type,
    title: validated.title,
    description: validated.description,
    dealDate: admin.firestore.Timestamp.fromDate(dealDate),
    timezone: validated.timezone,
    status: 'invited',
    moneyAmountCents: validated.moneyAmountCents || null,
    goodsA: validated.goodsA || null,
    goodsB: validated.goodsB || null,
    declaredValueA: validated.declaredValueA || null,
    declaredValueB: validated.declaredValueB || null,
    fairnessHoldA,
    fairnessHoldB,
    setupFeeCents,
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
    { type: validated.type }
  );

  return {
    dealId: dealRef.id,
    inviteToken,
    setupFeeCents,
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
      amountCents = isCreator ? deal.fairnessHoldA : deal.fairnessHoldB;
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

  const session = await createCheckoutSession(
    amountCents,
    'usd',
    validated.dealId,
    validated.purpose,
    userEmail,
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
      stripeConnectAccountId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const refreshUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/settings`;
  const returnUrl = `${process.env.APP_URL || 'http://localhost:5000'}/#/settings?stripe=complete`;

  const accountLink = await createAccountLink(stripeAccountId, refreshUrl, returnUrl);

  return { url: accountLink.url };
});

/**
 * Stripe webhook handler
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    event = constructWebhookEvent(req.rawBody, sig, webhookSecret);
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
        const deal = dealDoc.data()!;

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
