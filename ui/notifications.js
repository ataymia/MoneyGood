import { db, collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from '../firebase.js';
import { router } from '../router.js';
import { store } from '../store.js';
import { Navbar, Button, Card, LoadingSpinner } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';

export async function renderNotifications() {
  const { user } = store.getState();
  
  if (!user) {
    router.navigate('/login');
    return;
  }

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${renderSidebar(user)}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
              <h1 class="text-3xl font-bold text-navy-900 dark:text-white">Notifications</h1>
              <button 
                onclick="markAllAsRead()"
                class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition"
              >
                Mark all as read
              </button>
            </div>

            <!-- Notifications List -->
            <div id="notifications-container">
              ${LoadingSpinner()}
            </div>
          </div>
        </div>
      </div>
      ${renderMobileNav(user)}
    </div>
  `;

  // Listen to notifications in real-time
  loadNotifications(user.uid);
}

function loadNotifications(userId) {
  const container = document.getElementById('notifications-container');
  
  const notificationsRef = collection(db, 'users', userId, 'notifications');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    if (notifications.length === 0) {
      container.innerHTML = renderEmptyState();
      return;
    }

    // Group notifications by read status
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    container.innerHTML = `
      ${unread.length > 0 ? `
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-navy-900 dark:text-white mb-4">
            Unread (${unread.length})
          </h2>
          <div class="space-y-3">
            ${unread.map(n => renderNotificationCard(n, userId)).join('')}
          </div>
        </div>
      ` : ''}

      ${read.length > 0 ? `
        <div>
          <h2 class="text-lg font-semibold text-navy-600 dark:text-navy-400 mb-4">
            Read (${read.length})
          </h2>
          <div class="space-y-3 opacity-60">
            ${read.map(n => renderNotificationCard(n, userId)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }, (error) => {
    console.error('Error loading notifications:', error);
    container.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p class="text-red-800 dark:text-red-300">
          Failed to load notifications. Please try again.
        </p>
      </div>
    `;
  });

  // Store unsubscribe function
  window.notificationsUnsubscribe = unsubscribe;
}

function renderNotificationCard(notification, userId) {
  const icon = getNotificationIcon(notification.type);
  const timestamp = notification.createdAt?.toDate ? 
    formatTimestamp(notification.createdAt.toDate()) : 
    'Just now';

  return `
    <div 
      class="card p-4 ${!notification.read ? 'border-l-4 border-emerald-600' : ''} cursor-pointer hover:shadow-lg transition"
      onclick="handleNotificationClick('${userId}', '${notification.id}', '${notification.dealId || ''}', ${notification.read})"
    >
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 text-3xl">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4 mb-1">
            <h3 class="font-semibold text-navy-900 dark:text-white">
              ${notification.title}
            </h3>
            ${!notification.read ? `
              <span class="flex-shrink-0 w-2 h-2 bg-emerald-600 rounded-full mt-2"></span>
            ` : ''}
          </div>
          <p class="text-navy-600 dark:text-navy-400 text-sm mb-2">
            ${notification.message}
          </p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-navy-500 dark:text-navy-500">
              ${timestamp}
            </span>
            ${notification.dealId ? `
              <button 
                onclick="event.stopPropagation(); handleNotificationClick('${userId}', '${notification.id}', '${notification.dealId}', ${notification.read})"
                class="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                View Deal →
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-12 text-center">
      <div class="text-6xl mb-4">🔔</div>
      <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-2">
        No notifications yet
      </h2>
      <p class="text-navy-600 dark:text-navy-400 mb-6">
        You'll see updates about your deals here
      </p>
      <a 
        href="#/app" 
        class="inline-block btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
      >
        Go to Dashboard
      </a>
    </div>
  `;
}

function getNotificationIcon(type) {
  const icons = {
    'DEAL_INVITE': '📨',
    'DEAL_FUNDED': '💰',
    'DEAL_ACTIVE': '✅',
    'DEAL_PAST_DUE': '⏰',
    'OUTCOME_PROPOSED': '📋',
    'OUTCOME_CONFIRMED': '✅',
    'DEAL_COMPLETED': '🎉',
    'DEAL_FROZEN': '❄️',
    'EXTENSION_REQUESTED': '📅',
    'EXTENSION_APPROVED': '✅',
    'PAYMENT_RECEIVED': '💳',
    'ACTION_REQUIRED': '⚠️',
  };
  return icons[type] || '📢';
}

function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Global function to handle notification clicks
window.handleNotificationClick = async function(userId, notificationId, dealId, isRead) {
  // Mark as read if unread
  if (!isRead) {
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Navigate to deal if applicable
  if (dealId) {
    router.navigate(`/deal/${dealId}`);
  }
};

// Global function to mark all as read
window.markAllAsRead = async function() {
  const { user } = store.getState();
  if (!user) return;

  try {
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    
    const snapshot = await getDocs(q);
    const updates = [];
    
    snapshot.forEach((docSnap) => {
      const notifRef = doc(db, 'users', user.uid, 'notifications', docSnap.id);
      updates.push(updateDoc(notifRef, { read: true }));
    });

    await Promise.all(updates);
    
    if (updates.length > 0) {
      import('./components.js').then(({ showToast }) => {
        showToast(`Marked ${updates.length} notification${updates.length > 1 ? 's' : ''} as read`, 'success');
      });
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    import('./components.js').then(({ showToast }) => {
      showToast('Failed to mark notifications as read', 'error');
    });
  }
};

// Cleanup on route change
window.addEventListener('hashchange', () => {
  if (window.notificationsUnsubscribe) {
    window.notificationsUnsubscribe();
    window.notificationsUnsubscribe = null;
  }
});

