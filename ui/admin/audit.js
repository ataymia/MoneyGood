/**
 * Admin Audit Log Viewer
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminSpinner, AdminTable, SearchBar, FilterSelect, DetailDrawer, openDrawer, updateDrawerContent } from './components.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, where, startAfter, doc, getDoc } from '../../firebaseClient.js';

let auditLogs = [];
let lastDoc = null;
let filters = {
  actionType: '',
  targetType: '',
  adminEmail: '',
  dateRange: '7d',
};

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'user_status_changed', label: 'User Status Change' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'admin_granted', label: 'Admin Granted' },
  { value: 'admin_revoked', label: 'Admin Revoked' },
  { value: 'deal_cancelled', label: 'Deal Cancelled' },
  { value: 'deal_note_added', label: 'Deal Note Added' },
  { value: 'listing_removed', label: 'Listing Removed' },
  { value: 'listing_restored', label: 'Listing Restored' },
  { value: 'refund_issued', label: 'Refund Issued' },
  { value: 'ticket_reply', label: 'Ticket Reply' },
  { value: 'case_created', label: 'Case Created' },
  { value: 'case_status_changed', label: 'Case Status Changed' },
  { value: 'notification_sent', label: 'Notification Sent' },
  { value: 'moderation_config_updated', label: 'Moderation Config Updated' },
];

const TARGET_TYPES = [
  { value: '', label: 'All Targets' },
  { value: 'user', label: 'Users' },
  { value: 'deal', label: 'Agreements' },
  { value: 'listing', label: 'Listings' },
  { value: 'ticket', label: 'Support Tickets' },
  { value: 'case', label: 'Cases' },
  { value: 'notification', label: 'Notifications' },
  { value: 'config', label: 'Config' },
];

const DATE_RANGES = [
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export async function renderAdminAudit() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'audit',
    children: AdminSpinner({ size: 'lg', message: 'Loading audit logs...' })
  });
  
  await loadAuditLogs();
}

async function loadAuditLogs(append = false) {
  try {
    const constraints = [orderBy('timestamp', 'desc'), limit(50)];
    
    // Apply filters
    if (filters.actionType) {
      constraints.unshift(where('actionType', '==', filters.actionType));
    }
    if (filters.targetType) {
      constraints.unshift(where('targetType', '==', filters.targetType));
    }
    
    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      constraints.unshift(where('timestamp', '>=', startDate));
    }
    
    // Pagination
    if (append && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    
    const q = query(collection(window.db, 'auditLogs'), ...constraints);
    const snapshot = await getDocs(q);
    
    const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (append) {
      auditLogs = [...auditLogs, ...newLogs];
    } else {
      auditLogs = newLogs;
    }
    
    if (snapshot.docs.length > 0) {
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    
    renderAuditContent();
  } catch (error) {
    console.error('Error loading audit logs:', error);
    showToast('Failed to load audit logs', 'error');
    renderAuditContent();
  }
}

function renderAuditContent() {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const columns = [
    { key: 'timestamp', label: 'Time', render: (val) => `
      <span class="text-sm">${val?.toDate ? formatDate(val.toDate()) : '-'}</span>
    `},
    { key: 'actionType', label: 'Action', render: (val) => `
      <span class="px-2 py-1 rounded text-xs font-medium ${getActionTypeClass(val)}">
        ${formatActionType(val)}
      </span>
    `},
    { key: 'targetType', label: 'Target', render: (val) => `
      <span class="text-sm">${val || '-'}</span>
    `},
    { key: 'targetId', label: 'Target ID', render: (val) => val ? `
      <span class="font-mono text-xs">${val.substring(0, 12)}...</span>
    ` : '-'},
    { key: 'adminEmail', label: 'Admin', render: (val) => `
      <span class="text-sm">${val || '-'}</span>
    `},
    { key: 'reason', label: 'Reason', render: (val) => val ? `
      <span class="text-sm text-navy-600 dark:text-navy-400 truncate block max-w-xs">${val.substring(0, 50)}${val.length > 50 ? '...' : ''}</span>
    ` : '-'},
    { key: 'id', label: '', render: (val) => `
      <button onclick="viewAuditDetails('${val}')" class="text-emerald-600 text-sm">Details →</button>
    `},
  ];
  
  adminContent.innerHTML = `
    <!-- Filters -->
    <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">Action Type</label>
          <select id="filter-action" onchange="applyAuditFilter('actionType', this.value)" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-sm">
            ${ACTION_TYPES.map(a => `<option value="${a.value}" ${filters.actionType === a.value ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">Target Type</label>
          <select id="filter-target" onchange="applyAuditFilter('targetType', this.value)" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-sm">
            ${TARGET_TYPES.map(t => `<option value="${t.value}" ${filters.targetType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">Date Range</label>
          <select id="filter-date" onchange="applyAuditFilter('dateRange', this.value)" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-sm">
            ${DATE_RANGES.map(d => `<option value="${d.value}" ${filters.dateRange === d.value ? 'selected' : ''}>${d.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-navy-700 dark:text-navy-300 mb-1">Admin Email</label>
          <input type="text" id="filter-admin" placeholder="Search admin..." value="${filters.adminEmail}" onchange="applyAuditFilter('adminEmail', this.value)" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 text-sm" />
        </div>
      </div>
      <div class="flex justify-between items-center mt-4">
        <p class="text-sm text-navy-500">${auditLogs.length} logs loaded</p>
        <div class="flex gap-2">
          <button onclick="resetAuditFilters()" class="px-3 py-1 text-sm border border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700">
            Reset Filters
          </button>
          <button onclick="exportAuditLogs()" class="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Export CSV
          </button>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      ${renderQuickStats()}
    </div>
    
    <!-- Table -->
    ${AdminTable({ columns, rows: auditLogs, emptyMessage: 'No audit logs found' })}
    
    ${auditLogs.length >= 50 ? `
      <div class="text-center mt-4">
        <button onclick="loadMoreAuditLogs()" class="px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700">
          Load More
        </button>
      </div>
    ` : ''}
    
    ${DetailDrawer({ id: 'audit-drawer', title: 'Audit Log Details' })}
  `;
}

function renderQuickStats() {
  const actionCounts = {};
  auditLogs.forEach(log => {
    const action = log.actionType || 'unknown';
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  });
  
  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  
  return topActions.map(([action, count]) => `
    <div class="bg-white dark:bg-navy-800 rounded-lg p-4 text-center">
      <div class="text-2xl font-bold text-navy-900 dark:text-white">${count}</div>
      <div class="text-xs text-navy-500">${formatActionType(action)}</div>
    </div>
  `).join('') || `
    <div class="col-span-4 text-center text-navy-500 py-4">No statistics available</div>
  `;
}

function getActionTypeClass(actionType) {
  const classes = {
    user_deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    deal_cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    listing_removed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    refund_issued: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300',
    admin_granted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    admin_revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    notification_sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return classes[actionType] || 'bg-navy-100 text-navy-700 dark:bg-navy-700 dark:text-navy-300';
}

function formatActionType(actionType) {
  return (actionType || 'unknown')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

window.applyAuditFilter = (key, value) => {
  filters[key] = value;
  lastDoc = null;
  loadAuditLogs();
};

window.resetAuditFilters = () => {
  filters = { actionType: '', targetType: '', adminEmail: '', dateRange: '7d' };
  lastDoc = null;
  loadAuditLogs();
};

window.loadMoreAuditLogs = () => {
  loadAuditLogs(true);
};

window.viewAuditDetails = async (logId) => {
  const log = auditLogs.find(l => l.id === logId);
  if (!log) return;
  
  updateDrawerContent('audit-drawer', `
    <div class="space-y-6">
      <div>
        <span class="px-2 py-1 rounded text-xs font-medium ${getActionTypeClass(log.actionType)}">
          ${formatActionType(log.actionType)}
        </span>
        <p class="text-sm text-navy-500 mt-2">${log.timestamp?.toDate ? formatDate(log.timestamp.toDate()) : '-'}</p>
      </div>
      
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4 space-y-2">
        <div class="flex justify-between">
          <span class="text-sm text-navy-500">Admin</span>
          <span class="text-sm font-medium text-navy-900 dark:text-white">${log.adminEmail}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-navy-500">Admin UID</span>
          <span class="text-sm font-mono text-navy-600 dark:text-navy-400">${log.adminUid}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-navy-500">Target Type</span>
          <span class="text-sm text-navy-900 dark:text-white">${log.targetType}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-navy-500">Target ID</span>
          <span class="text-sm font-mono text-navy-600 dark:text-navy-400">${log.targetId || '-'}</span>
        </div>
      </div>
      
      ${log.reason ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-2">Reason</h4>
          <p class="text-sm text-navy-600 dark:text-navy-400 bg-navy-50 dark:bg-navy-700/50 rounded-lg p-3">${log.reason}</p>
        </div>
      ` : ''}
      
      ${log.details ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-2">Details</h4>
          <pre class="text-xs text-navy-600 dark:text-navy-400 bg-navy-50 dark:bg-navy-700/50 rounded-lg p-3 overflow-x-auto">${JSON.stringify(log.details, null, 2)}</pre>
        </div>
      ` : ''}
      
      ${log.beforeSnapshot ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-2">Before Snapshot</h4>
          <pre class="text-xs text-navy-600 dark:text-navy-400 bg-navy-50 dark:bg-navy-700/50 rounded-lg p-3 overflow-x-auto">${JSON.stringify(log.beforeSnapshot, null, 2)}</pre>
        </div>
      ` : ''}
      
      ${log.afterSnapshot ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-2">After Snapshot</h4>
          <pre class="text-xs text-navy-600 dark:text-navy-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 overflow-x-auto">${JSON.stringify(log.afterSnapshot, null, 2)}</pre>
        </div>
      ` : ''}
      
      <!-- Quick Links -->
      <div class="pt-4 border-t border-navy-200 dark:border-navy-700">
        <h4 class="font-semibold text-navy-900 dark:text-white mb-2">Quick Links</h4>
        <div class="space-y-2">
          ${log.targetType === 'user' && log.targetId ? `
            <a href="#/admin/users?id=${log.targetId}" class="block text-emerald-600 text-sm">View User →</a>
          ` : ''}
          ${log.targetType === 'deal' && log.targetId ? `
            <a href="#/admin/agreements?id=${log.targetId}" class="block text-emerald-600 text-sm">View Agreement →</a>
          ` : ''}
          ${log.targetType === 'listing' && log.targetId ? `
            <a href="#/admin/marketplace?id=${log.targetId}" class="block text-emerald-600 text-sm">View Listing →</a>
          ` : ''}
          ${log.targetType === 'ticket' && log.targetId ? `
            <a href="#/admin/support?id=${log.targetId}" class="block text-emerald-600 text-sm">View Ticket →</a>
          ` : ''}
          ${log.targetType === 'case' && log.targetId ? `
            <a href="#/admin/cases?id=${log.targetId}" class="block text-emerald-600 text-sm">View Case →</a>
          ` : ''}
        </div>
      </div>
    </div>
  `);
  
  openDrawer('audit-drawer');
};

window.exportAuditLogs = () => {
  if (auditLogs.length === 0) {
    showToast('No logs to export', 'error');
    return;
  }
  
  const headers = ['Timestamp', 'Action Type', 'Target Type', 'Target ID', 'Admin Email', 'Reason'];
  const rows = auditLogs.map(log => [
    log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : '',
    log.actionType || '',
    log.targetType || '',
    log.targetId || '',
    log.adminEmail || '',
    (log.reason || '').replace(/"/g, '""'),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('CSV downloaded', 'success');
};
