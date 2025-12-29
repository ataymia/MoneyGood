/**
 * Admin Notifications (Broadcast & Targeted)
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminSpinner, AdminTable, StatusBadge, AdminTabs } from './components.js';
import { adminSendNotification } from '../../adminApi.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, where } from '../../firebaseClient.js';

let recentNotifications = [];
let activeTab = 'broadcast';

export async function renderAdminNotifications() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'notifications',
    children: AdminSpinner({ size: 'lg', message: 'Loading...' })
  });
  
  await loadRecentNotifications();
}

async function loadRecentNotifications() {
  try {
    // Load from auditLogs for notification actions
    const q = query(
      collection(window.db, 'auditLogs'),
      where('actionType', '==', 'notification_sent'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    recentNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderNotificationsContent();
  } catch (error) {
    console.error('Error loading notifications:', error);
    renderNotificationsContent();
  }
}

function renderNotificationsContent() {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  adminContent.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Send Notification Panel -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Send Notification</h3>
        
        ${AdminTabs({
          tabs: [
            { id: 'broadcast', label: 'Broadcast' },
            { id: 'targeted', label: 'Targeted' },
          ],
          activeTab: activeTab,
          onTabChange: 'handleNotifTabChange'
        })}
        
        <div class="space-y-4 mt-4">
          <!-- Targeted recipients (hidden for broadcast) -->
          <div id="targeted-fields" class="${activeTab === 'broadcast' ? 'hidden' : ''}">
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Target Type</label>
            <select id="target-type" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 mb-3">
              <option value="user">Specific User</option>
              <option value="deal_participants">Deal Participants</option>
              <option value="status">Users by Status</option>
            </select>
            
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Target ID(s)</label>
            <input 
              type="text" 
              id="target-ids"
              placeholder="User ID, Deal ID, or Status (active/paused)"
              class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700"
            />
            <p class="text-xs text-navy-500 mt-1">For multiple users, comma-separate IDs</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Notification Type</label>
            <select id="notif-type" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700">
              <option value="info">ℹ️ Info</option>
              <option value="success">✅ Success</option>
              <option value="warning">⚠️ Warning</option>
              <option value="error">🚨 Error</option>
              <option value="announcement">📢 Announcement</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Title</label>
            <input 
              type="text" 
              id="notif-title"
              placeholder="Notification title"
              class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Message</label>
            <textarea 
              id="notif-message"
              rows="4"
              placeholder="Notification message..."
              class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700"
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Action Link (optional)</label>
            <input 
              type="text" 
              id="notif-link"
              placeholder="e.g., #/dashboard or https://..."
              class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700"
            />
          </div>
          
          <div class="pt-4 border-t border-navy-200 dark:border-navy-700">
            <div class="flex items-center gap-2 mb-4">
              <input type="checkbox" id="confirm-send" class="rounded">
              <label for="confirm-send" class="text-sm text-navy-700 dark:text-navy-300">
                I confirm I want to send this notification to ${activeTab === 'broadcast' ? 'ALL users' : 'targeted users'}
              </label>
            </div>
            <button 
              onclick="sendNotification()"
              class="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Send Notification
            </button>
          </div>
        </div>
      </div>
      
      <!-- Recent Notifications -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Recent Notifications Sent</h3>
        <div class="space-y-3 max-h-[500px] overflow-y-auto">
          ${recentNotifications.length > 0 ? recentNotifications.map(notif => `
            <div class="p-3 bg-navy-50 dark:bg-navy-700/50 rounded-lg">
              <div class="flex justify-between items-start mb-1">
                <span class="font-medium text-navy-900 dark:text-white text-sm">
                  ${notif.details?.title || 'Notification'}
                </span>
                <span class="text-xs text-navy-500">${notif.timestamp?.toDate ? formatDate(notif.timestamp.toDate()) : ''}</span>
              </div>
              <p class="text-sm text-navy-600 dark:text-navy-400">${notif.details?.message?.substring(0, 100) || ''}</p>
              <div class="flex gap-2 mt-2 text-xs">
                <span class="px-2 py-0.5 rounded bg-navy-200 dark:bg-navy-600 text-navy-700 dark:text-navy-300">
                  ${notif.details?.scope || 'broadcast'}
                </span>
                ${notif.details?.recipientCount ? `<span class="text-navy-500">${notif.details.recipientCount} recipients</span>` : ''}
              </div>
            </div>
          `).join('') : '<p class="text-navy-500 text-center py-8">No notifications sent yet</p>'}
        </div>
      </div>
    </div>
    
    <!-- Template Section -->
    <div class="mt-8 bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Quick Templates</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onclick="useTemplate('maintenance')" class="p-3 border-2 border-navy-200 dark:border-navy-600 rounded-lg text-left hover:bg-navy-50 dark:hover:bg-navy-700">
          <span class="text-lg">🔧</span>
          <p class="font-medium text-navy-900 dark:text-white text-sm mt-1">Maintenance</p>
          <p class="text-xs text-navy-500">Scheduled downtime</p>
        </button>
        <button onclick="useTemplate('feature')" class="p-3 border-2 border-navy-200 dark:border-navy-600 rounded-lg text-left hover:bg-navy-50 dark:hover:bg-navy-700">
          <span class="text-lg">🚀</span>
          <p class="font-medium text-navy-900 dark:text-white text-sm mt-1">New Feature</p>
          <p class="text-xs text-navy-500">Announce updates</p>
        </button>
        <button onclick="useTemplate('reminder')" class="p-3 border-2 border-navy-200 dark:border-navy-600 rounded-lg text-left hover:bg-navy-50 dark:hover:bg-navy-700">
          <span class="text-lg">⏰</span>
          <p class="font-medium text-navy-900 dark:text-white text-sm mt-1">Reminder</p>
          <p class="text-xs text-navy-500">Payment or action</p>
        </button>
        <button onclick="useTemplate('policy')" class="p-3 border-2 border-navy-200 dark:border-navy-600 rounded-lg text-left hover:bg-navy-50 dark:hover:bg-navy-700">
          <span class="text-lg">📋</span>
          <p class="font-medium text-navy-900 dark:text-white text-sm mt-1">Policy Update</p>
          <p class="text-xs text-navy-500">Terms or rules</p>
        </button>
      </div>
    </div>
  `;
}

window.handleNotifTabChange = (tab) => {
  activeTab = tab;
  const targetedFields = document.getElementById('targeted-fields');
  if (targetedFields) {
    targetedFields.classList.toggle('hidden', tab === 'broadcast');
  }
};

window.sendNotification = async () => {
  const confirmed = document.getElementById('confirm-send')?.checked;
  if (!confirmed) {
    showToast('Please confirm you want to send this notification', 'error');
    return;
  }
  
  const title = document.getElementById('notif-title')?.value;
  const message = document.getElementById('notif-message')?.value;
  const type = document.getElementById('notif-type')?.value || 'info';
  const link = document.getElementById('notif-link')?.value || null;
  
  if (!title || !message) {
    showToast('Title and message are required', 'error');
    return;
  }
  
  let targetUserIds = null;
  if (activeTab === 'targeted') {
    const targetType = document.getElementById('target-type')?.value;
    const targetIds = document.getElementById('target-ids')?.value;
    
    if (!targetIds) {
      showToast('Please specify target IDs', 'error');
      return;
    }
    
    // For now, just pass as user IDs - backend can interpret
    targetUserIds = targetIds.split(',').map(id => id.trim()).filter(Boolean);
    
    if (targetUserIds.length === 0) {
      showToast('Please provide valid target IDs', 'error');
      return;
    }
  }
  
  try {
    const result = await adminSendNotification(
      title,
      message,
      type,
      targetUserIds,
      link
    );
    showToast(`Notification sent to ${result.recipientCount || 'all'} users`, 'success');
    
    // Reset form
    document.getElementById('notif-title').value = '';
    document.getElementById('notif-message').value = '';
    document.getElementById('notif-link').value = '';
    document.getElementById('confirm-send').checked = false;
    
    // Reload recent
    await loadRecentNotifications();
  } catch (error) {
    showToast(error.message || 'Failed to send notification', 'error');
  }
};

const templates = {
  maintenance: {
    type: 'warning',
    title: 'Scheduled Maintenance',
    message: 'MoneyGood will undergo scheduled maintenance on [DATE] from [TIME] to [TIME]. During this time, the platform may be temporarily unavailable. We apologize for any inconvenience.',
  },
  feature: {
    type: 'announcement',
    title: 'New Feature Available!',
    message: 'We\'re excited to announce [FEATURE NAME]! [Brief description of the feature and how it benefits users]. Check it out now!',
    link: '#/dashboard',
  },
  reminder: {
    type: 'info',
    title: 'Friendly Reminder',
    message: 'This is a reminder that [payment/action] is due on [DATE]. Please ensure you [take necessary action] to avoid any issues.',
  },
  policy: {
    type: 'info',
    title: 'Policy Update',
    message: 'We\'ve updated our [Terms of Service/Privacy Policy/Fee Schedule]. The changes will take effect on [DATE]. Please review the updates at your earliest convenience.',
    link: '#/settings',
  },
};

window.useTemplate = (templateKey) => {
  const template = templates[templateKey];
  if (!template) return;
  
  document.getElementById('notif-type').value = template.type;
  document.getElementById('notif-title').value = template.title;
  document.getElementById('notif-message').value = template.message;
  document.getElementById('notif-link').value = template.link || '';
  
  showToast('Template loaded - customize and send', 'success');
};
