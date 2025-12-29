// Events System - Activity Feed & Audit Log
import { 
  collection, addDoc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp, limit as firestoreLimit
} from '../firebaseClient.js';
import { store } from '../store.js';

// Event types
export const EVENT_TYPES = {
  // Agreement lifecycle
  AGREEMENT_CREATED: 'agreement_created',
  AGREEMENT_UPDATED: 'agreement_updated',
  INVITE_SENT: 'invite_sent',
  INVITE_ACCEPTED: 'invite_accepted',
  AGREEMENT_CONFIRMED: 'agreement_confirmed',
  AGREEMENT_COMPLETED: 'agreement_completed',
  AGREEMENT_CANCELLED: 'agreement_cancelled',
  AGREEMENT_FROZEN: 'agreement_frozen',
  
  // Funding
  FUNDING_INITIATED: 'funding_initiated',
  FUNDING_COMPLETED: 'funding_completed',
  PAYMENT_RELEASED: 'payment_released',
  
  // Communication
  MESSAGE_SENT: 'message_sent',
  
  // Marketplace
  LISTING_CREATED: 'listing_created',
  LISTING_MATCHED: 'listing_matched',
  LISTING_CLOSED: 'listing_closed',
  
  // Outcome
  OUTCOME_PROPOSED: 'outcome_proposed',
  OUTCOME_CONFIRMED: 'outcome_confirmed',
  OUTCOME_DISPUTED: 'outcome_disputed'
};

// Event icons
const EVENT_ICONS = {
  [EVENT_TYPES.AGREEMENT_CREATED]: '📝',
  [EVENT_TYPES.AGREEMENT_UPDATED]: '✏️',
  [EVENT_TYPES.INVITE_SENT]: '📨',
  [EVENT_TYPES.INVITE_ACCEPTED]: '✅',
  [EVENT_TYPES.AGREEMENT_CONFIRMED]: '🤝',
  [EVENT_TYPES.AGREEMENT_COMPLETED]: '🎉',
  [EVENT_TYPES.AGREEMENT_CANCELLED]: '❌',
  [EVENT_TYPES.AGREEMENT_FROZEN]: '❄️',
  [EVENT_TYPES.FUNDING_INITIATED]: '💳',
  [EVENT_TYPES.FUNDING_COMPLETED]: '💰',
  [EVENT_TYPES.PAYMENT_RELEASED]: '💸',
  [EVENT_TYPES.MESSAGE_SENT]: '💬',
  [EVENT_TYPES.LISTING_CREATED]: '📋',
  [EVENT_TYPES.LISTING_MATCHED]: '🔗',
  [EVENT_TYPES.LISTING_CLOSED]: '🔒',
  [EVENT_TYPES.OUTCOME_PROPOSED]: '📊',
  [EVENT_TYPES.OUTCOME_CONFIRMED]: '✔️',
  [EVENT_TYPES.OUTCOME_DISPUTED]: '⚠️'
};

// Event labels (user-friendly)
const EVENT_LABELS = {
  [EVENT_TYPES.AGREEMENT_CREATED]: 'Agreement created',
  [EVENT_TYPES.AGREEMENT_UPDATED]: 'Agreement updated',
  [EVENT_TYPES.INVITE_SENT]: 'Invitation sent',
  [EVENT_TYPES.INVITE_ACCEPTED]: 'Invitation accepted',
  [EVENT_TYPES.AGREEMENT_CONFIRMED]: 'Agreement confirmed',
  [EVENT_TYPES.AGREEMENT_COMPLETED]: 'Agreement completed',
  [EVENT_TYPES.AGREEMENT_CANCELLED]: 'Agreement cancelled',
  [EVENT_TYPES.AGREEMENT_FROZEN]: 'Agreement frozen',
  [EVENT_TYPES.FUNDING_INITIATED]: 'Payment initiated',
  [EVENT_TYPES.FUNDING_COMPLETED]: 'Funding completed',
  [EVENT_TYPES.PAYMENT_RELEASED]: 'Payment released',
  [EVENT_TYPES.MESSAGE_SENT]: 'Message sent',
  [EVENT_TYPES.LISTING_CREATED]: 'Listing created',
  [EVENT_TYPES.LISTING_MATCHED]: 'Listing matched',
  [EVENT_TYPES.LISTING_CLOSED]: 'Listing closed',
  [EVENT_TYPES.OUTCOME_PROPOSED]: 'Outcome proposed',
  [EVENT_TYPES.OUTCOME_CONFIRMED]: 'Outcome confirmed',
  [EVENT_TYPES.OUTCOME_DISPUTED]: 'Outcome disputed'
};

/**
 * Log an event for an agreement
 */
export async function logEvent(agreementId, type, actorUid, text = '', meta = {}) {
  try {
    const eventsRef = collection(window.db, 'agreements', agreementId, 'events');
    await addDoc(eventsRef, {
      type,
      actorUid,
      text: text || EVENT_LABELS[type] || type,
      meta,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

/**
 * Log a global user event (for activity feed)
 */
export async function logUserEvent(userId, type, text = '', meta = {}) {
  try {
    const eventsRef = collection(window.db, 'users', userId, 'activityFeed');
    await addDoc(eventsRef, {
      type,
      text: text || EVENT_LABELS[type] || type,
      meta,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging user event:', error);
  }
}

/**
 * Get events for an agreement
 */
export async function getAgreementEvents(agreementId, limitCount = 50) {
  try {
    const eventsRef = collection(window.db, 'agreements', agreementId, 'events');
    const q = query(eventsRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
    const snapshot = await getDocs(q);
    
    const events = [];
    snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    return events;
  } catch (error) {
    console.error('Error fetching agreement events:', error);
    return [];
  }
}

/**
 * Get activity feed for a user
 */
export async function getUserActivityFeed(userId, limitCount = 20) {
  try {
    // Get user's deals first
    const dealsRef = collection(window.db, 'deals');
    
    const creatorQuery = query(
      dealsRef,
      where('creatorUid', '==', userId),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const participantQuery = query(
      dealsRef,
      where('participantUid', '==', userId),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const [creatorSnap, participantSnap] = await Promise.all([
      getDocs(creatorQuery),
      getDocs(participantQuery)
    ]);
    
    // Collect all deal IDs
    const dealIds = new Set();
    const dealMap = new Map();
    
    creatorSnap.forEach(doc => {
      dealIds.add(doc.id);
      dealMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    participantSnap.forEach(doc => {
      dealIds.add(doc.id);
      dealMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    // Build activity feed from deals
    const activities = [];
    
    for (const [dealId, deal] of dealMap) {
      // Add deal creation as activity
      if (deal.createdAt) {
        activities.push({
          id: `${dealId}-created`,
          type: EVENT_TYPES.AGREEMENT_CREATED,
          text: `Agreement "${deal.title || 'Untitled'}" created`,
          dealId,
          dealTitle: deal.title,
          createdAt: deal.createdAt
        });
      }
      
      // Add status changes as activities
      if (deal.status === 'completed' && deal.completedAt) {
        activities.push({
          id: `${dealId}-completed`,
          type: EVENT_TYPES.AGREEMENT_COMPLETED,
          text: `Agreement "${deal.title || 'Untitled'}" completed`,
          dealId,
          dealTitle: deal.title,
          createdAt: deal.completedAt
        });
      }
      
      // Try to fetch recent events for this deal
      try {
        const eventsRef = collection(window.db, 'deals', dealId, 'events');
        const eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'), firestoreLimit(5));
        const eventsSnap = await getDocs(eventsQuery);
        
        eventsSnap.forEach(eventDoc => {
          const event = eventDoc.data();
          activities.push({
            id: `${dealId}-${eventDoc.id}`,
            type: event.type,
            text: event.text,
            dealId,
            dealTitle: deal.title,
            createdAt: event.createdAt
          });
        });
      } catch (err) {
        // Events subcollection may not exist yet
      }
    }
    
    // Sort by date descending
    activities.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    
    // Return top N activities
    return activities.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
}

/**
 * Render activity feed HTML
 */
export function renderActivityFeed(activities, maxItems = 10) {
  if (!activities || activities.length === 0) {
    return `
      <div class="text-center py-8 text-navy-500 dark:text-navy-400">
        <div class="text-4xl mb-2">📭</div>
        <p>No recent activity</p>
      </div>
    `;
  }
  
  const items = activities.slice(0, maxItems);
  
  return `
    <div class="space-y-3">
      ${items.map(activity => renderActivityItem(activity)).join('')}
    </div>
    ${activities.length > maxItems ? `
      <div class="mt-4 text-center">
        <a href="#/deals" class="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
          View all activity →
        </a>
      </div>
    ` : ''}
  `;
}

function renderActivityItem(activity) {
  const icon = EVENT_ICONS[activity.type] || '📌';
  const timeAgo = formatTimeAgo(activity.createdAt);
  
  return `
    <div 
      class="flex items-start gap-3 p-3 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-800/50 transition cursor-pointer group"
      onclick="${activity.dealId ? `window.location.hash='/deal/${activity.dealId}'` : ''}"
    >
      <div class="flex-shrink-0 w-8 h-8 bg-navy-100 dark:bg-navy-700 rounded-full flex items-center justify-center text-sm">
        ${icon}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-navy-900 dark:text-white truncate group-hover:text-emerald-600 transition">
          ${activity.text}
        </p>
        <p class="text-xs text-navy-500 dark:text-navy-400 mt-0.5">${timeAgo}</p>
      </div>
      ${activity.dealId ? `
        <span class="text-navy-400 group-hover:text-emerald-600 transition">→</span>
      ` : ''}
    </div>
  `;
}

function formatTimeAgo(timestamp) {
  if (!timestamp?.seconds) return '';
  
  const now = new Date();
  const date = new Date(timestamp.seconds * 1000);
  const diff = now - date;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}
