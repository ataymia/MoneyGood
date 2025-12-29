/**
 * Admin Overview Dashboard
 * 
 * KPI tiles, trend charts, recent activity stream
 */

import { AdminLayout, checkAdminAccess, renderUnauthorized, initAdminAccess } from './layout.js';
import { KPICard, AdminSpinner, AdminTable, StatusBadge } from './components.js';
import { adminGetStats } from '../../adminApi.js';
import { showToast, formatCurrency, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs } from '../../firebaseClient.js';

export async function renderAdminOverview() {
  // Check admin access
  const isAdmin = await initAdminAccess();
  if (!isAdmin) {
    renderUnauthorized();
    return;
  }
  
  const content = document.getElementById('content');
  if (!content) return;
  
  // Show loading state
  content.innerHTML = AdminLayout({
    activeSection: 'overview',
    children: AdminSpinner({ size: 'lg', message: 'Loading dashboard...' })
  });
  
  try {
    // Fetch stats
    const stats = await adminGetStats();
    
    // Fetch recent audit logs
    const auditLogs = await fetchRecentAuditLogs();
    
    // Render dashboard
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
      adminContent.innerHTML = renderDashboardContent(stats, auditLogs);
    }
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
    
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
      adminContent.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">⚠️</div>
          <h3 class="text-lg font-semibold text-navy-900 dark:text-white mb-2">Error Loading Dashboard</h3>
          <p class="text-navy-600 dark:text-navy-400 mb-4">${error.message}</p>
          <button 
            onclick="window.location.reload()"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Retry
          </button>
        </div>
      `;
    }
  }
}

async function fetchRecentAuditLogs() {
  try {
    const q = query(
      collection(window.db, 'auditLogs'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

function renderDashboardContent(stats, auditLogs) {
  return `
    <!-- KPI Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      ${KPICard({
        title: 'Total Users',
        value: stats.users?.total?.toLocaleString() || '0',
        subtitle: `+${stats.users?.last7d || 0} this week`,
        icon: '👥',
        color: 'blue'
      })}
      ${KPICard({
        title: 'Active Agreements',
        value: (stats.deals?.byStatus?.locked || 0) + (stats.deals?.byStatus?.active || 0),
        subtitle: `${stats.deals?.total || 0} total`,
        icon: '📝',
        color: 'emerald'
      })}
      ${KPICard({
        title: 'Revenue (30d)',
        value: formatCurrency(stats.payments?.last30dCents || 0),
        subtitle: `${formatCurrency(stats.payments?.todayCents || 0)} today`,
        icon: '💰',
        color: 'gold'
      })}
      ${KPICard({
        title: 'Open Tickets',
        value: stats.support?.openTickets || 0,
        subtitle: 'Awaiting response',
        icon: '🎫',
        color: stats.support?.openTickets > 5 ? 'red' : 'purple'
      })}
    </div>
    
    <!-- Secondary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      ${renderMiniKPI('New Users (7d)', stats.users?.last7d || 0, '📈')}
      ${renderMiniKPI('New Users (30d)', stats.users?.last30d || 0, '📊')}
      ${renderMiniKPI('Open Listings', stats.listings?.byStatus?.open || 0, '🏪')}
      ${renderMiniKPI('Cancelled Deals', stats.deals?.byStatus?.cancelled || 0, '❌')}
      ${renderMiniKPI('Refunds', stats.payments?.refundCount || 0, '↩️')}
      ${renderMiniKPI('Frozen Deals', stats.deals?.byStatus?.frozen || 0, '🧊')}
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Deal Status Distribution -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-navy-200 dark:border-navy-700 p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Agreement Status Distribution</h3>
        ${renderStatusChart(stats.deals?.byStatus || {})}
      </div>
      
      <!-- Recent Activity -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-navy-200 dark:border-navy-700 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-navy-900 dark:text-white">Recent Admin Activity</h3>
          <a href="#/admin/audit" class="text-sm text-emerald-600 hover:text-emerald-700">View All →</a>
        </div>
        ${renderActivityStream(auditLogs)}
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="mt-8 bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-navy-200 dark:border-navy-700 p-6">
      <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        ${renderQuickAction('View Users', '#/admin/users', '👥')}
        ${renderQuickAction('Review Tickets', '#/admin/support', '🎫')}
        ${renderQuickAction('Moderation Queue', '#/admin/moderation', '🛡️')}
        ${renderQuickAction('Send Notification', '#/admin/notifications', '📢')}
      </div>
    </div>
  `;
}

function renderMiniKPI(label, value, icon) {
  return `
    <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-4">
      <div class="flex items-center gap-2 mb-1">
        <span>${icon}</span>
        <span class="text-xs text-navy-500 dark:text-navy-400">${label}</span>
      </div>
      <div class="text-xl font-bold text-navy-900 dark:text-white">${value}</div>
    </div>
  `;
}

function renderStatusChart(statusCounts) {
  const statuses = [
    { key: 'draft', label: 'Draft', color: 'bg-gray-400' },
    { key: 'invited', label: 'Invited', color: 'bg-blue-400' },
    { key: 'awaiting_funding', label: 'Awaiting Funding', color: 'bg-gold-400' },
    { key: 'locked', label: 'Locked', color: 'bg-purple-400' },
    { key: 'active', label: 'Active', color: 'bg-emerald-400' },
    { key: 'completed', label: 'Completed', color: 'bg-emerald-600' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-400' },
    { key: 'frozen', label: 'Frozen', color: 'bg-cyan-400' },
  ];
  
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  
  const bars = statuses.map(status => {
    const count = statusCounts[status.key] || 0;
    const percentage = Math.round((count / total) * 100);
    
    if (count === 0) return '';
    
    return `
      <div class="flex items-center gap-3 mb-2">
        <div class="w-24 text-sm text-navy-600 dark:text-navy-400">${status.label}</div>
        <div class="flex-1 h-6 bg-navy-100 dark:bg-navy-700 rounded-full overflow-hidden">
          <div class="${status.color} h-full rounded-full flex items-center justify-end pr-2" style="width: ${Math.max(percentage, 5)}%">
            <span class="text-xs text-white font-medium">${count}</span>
          </div>
        </div>
        <div class="w-12 text-right text-sm text-navy-500 dark:text-navy-400">${percentage}%</div>
      </div>
    `;
  }).filter(Boolean).join('');
  
  return bars || '<p class="text-navy-500 dark:text-navy-400">No agreements yet</p>';
}

function renderActivityStream(auditLogs) {
  if (!auditLogs || auditLogs.length === 0) {
    return '<p class="text-navy-500 dark:text-navy-400 text-center py-4">No recent activity</p>';
  }
  
  const items = auditLogs.map(log => {
    const actionIcons = {
      'SET_USER_STATUS': '👤',
      'SOFT_DELETE_USER': '🗑️',
      'HARD_DELETE_USER': '💀',
      'ADMIN_CANCEL_DEAL': '❌',
      'REMOVE_LISTING': '🚫',
      'RESTORE_LISTING': '✅',
      'ISSUE_REFUND': '💰',
      'REPLY_TO_TICKET': '💬',
      'CREATE_CASE': '📁',
      'SEND_NOTIFICATION': '📢',
      'GRANT_ADMIN_ACCESS': '🔑',
      'REVOKE_ADMIN_ACCESS': '🔒',
      default: '📝'
    };
    
    const icon = actionIcons[log.actionType] || actionIcons.default;
    const time = log.createdAt?.toDate ? formatDate(log.createdAt.toDate()) : 'Unknown';
    
    return `
      <div class="flex items-start gap-3 py-2 border-b border-navy-100 dark:border-navy-700 last:border-0">
        <span class="text-lg">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-navy-900 dark:text-white truncate">
            ${formatActionType(log.actionType)}
          </div>
          <div class="text-xs text-navy-500 dark:text-navy-400">
            ${log.adminEmail || 'System'} • ${time}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  return `<div class="max-h-80 overflow-y-auto">${items}</div>`;
}

function formatActionType(actionType) {
  const labels = {
    'SET_USER_STATUS': 'Updated user status',
    'SOFT_DELETE_USER': 'Soft deleted user',
    'HARD_DELETE_USER': 'Hard deleted user',
    'ADD_USER_NOTE': 'Added user note',
    'ADMIN_CANCEL_DEAL': 'Cancelled agreement',
    'ADD_DEAL_NOTE': 'Added agreement note',
    'REMOVE_LISTING': 'Removed listing',
    'RESTORE_LISTING': 'Restored listing',
    'ISSUE_REFUND': 'Issued refund',
    'REPLY_TO_TICKET': 'Replied to ticket',
    'CREATE_CASE': 'Created case',
    'ADD_CASE_NOTE': 'Added case note',
    'UPDATE_CASE_STATUS': 'Updated case status',
    'SEND_NOTIFICATION': 'Sent notification',
    'UPDATE_MODERATION_CONFIG': 'Updated moderation config',
    'ADMIN_BOOTSTRAP': 'Bootstrapped admin',
    'GRANT_ADMIN_ACCESS': 'Granted admin access',
    'REVOKE_ADMIN_ACCESS': 'Revoked admin access',
  };
  
  return labels[actionType] || actionType.replace(/_/g, ' ').toLowerCase();
}

function renderQuickAction(label, href, icon) {
  return `
    <a 
      href="${href}"
      class="flex flex-col items-center gap-2 p-4 rounded-lg bg-navy-50 dark:bg-navy-700/50 hover:bg-navy-100 dark:hover:bg-navy-700 transition"
    >
      <span class="text-3xl">${icon}</span>
      <span class="text-sm font-medium text-navy-700 dark:text-navy-300">${label}</span>
    </a>
  `;
}
