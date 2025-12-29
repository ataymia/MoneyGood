/**
 * Admin Shared Components
 * 
 * Common UI components used across admin modules.
 */

import { formatCurrency, formatDate } from './components.js';

// ============================================
// STATUS BADGES
// ============================================

export function StatusBadge({ status, type = 'default' }) {
  const colors = {
    // User statuses
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    deleted: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    
    // Deal statuses
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    awaiting_funding: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    locked: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    frozen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    
    // Listing statuses
    open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    paired: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    removed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    
    // Ticket statuses
    pending: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    
    // Case statuses
    in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    awaiting_user: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    
    // Priority levels
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    medium: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    
    // Default
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  
  const colorClass = colors[status] || colors.default;
  const displayStatus = status?.replace(/_/g, ' ') || 'Unknown';
  
  return `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}">
      ${displayStatus}
    </span>
  `;
}

export function PriorityBadge({ priority }) {
  return StatusBadge({ status: priority, type: 'priority' });
}

// ============================================
// DATA TABLE
// ============================================

export function AdminTable({ columns, rows, emptyMessage = 'No data found', onRowClick = null }) {
  if (!rows || rows.length === 0) {
    return `
      <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-8 text-center">
        <div class="text-navy-400 dark:text-navy-500 text-lg">
          ${emptyMessage}
        </div>
      </div>
    `;
  }
  
  const headerCells = columns.map(col => `
    <th class="px-4 py-3 text-left text-xs font-semibold text-navy-600 dark:text-navy-400 uppercase tracking-wider ${col.width || ''}">
      ${col.label}
    </th>
  `).join('');
  
  const bodyRows = rows.map((row, idx) => {
    const cells = columns.map(col => {
      const value = col.render ? col.render(row[col.key], row) : row[col.key];
      return `<td class="px-4 py-3 text-sm text-navy-900 dark:text-white">${value ?? '-'}</td>`;
    }).join('');
    
    const clickAttr = onRowClick ? `onclick="${onRowClick}('${row.id}')" style="cursor: pointer;"` : '';
    const hoverClass = onRowClick ? 'hover:bg-navy-50 dark:hover:bg-navy-700/50' : '';
    
    return `
      <tr class="border-b border-navy-100 dark:border-navy-700 ${hoverClass}" ${clickAttr}>
        ${cells}
      </tr>
    `;
  }).join('');
  
  return `
    <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-navy-50 dark:bg-navy-700/50">
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================
// KPI CARD
// ============================================

export function KPICard({ title, value, subtitle = '', icon = '', trend = null, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    gold: 'bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  
  const trendHtml = trend !== null ? `
    <span class="flex items-center text-sm ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}">
      ${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%
    </span>
  ` : '';
  
  return `
    <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-navy-200 dark:border-navy-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <span class="text-sm font-medium text-navy-600 dark:text-navy-400">${title}</span>
        ${icon ? `<span class="w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color] || colorClasses.emerald}">${icon}</span>` : ''}
      </div>
      <div class="flex items-end gap-3">
        <span class="text-3xl font-bold text-navy-900 dark:text-white">${value}</span>
        ${trendHtml}
      </div>
      ${subtitle ? `<p class="text-sm text-navy-500 dark:text-navy-400 mt-1">${subtitle}</p>` : ''}
    </div>
  `;
}

// ============================================
// SEARCH & FILTERS
// ============================================

export function SearchBar({ placeholder = 'Search...', value = '', onSearch = 'handleSearch' }) {
  return `
    <div class="relative">
      <input 
        type="text" 
        placeholder="${placeholder}"
        value="${value}"
        onkeyup="if(event.key==='Enter')${onSearch}(this.value)"
        class="w-full pl-10 pr-4 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-navy-900 dark:text-white placeholder-navy-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      <svg class="absolute left-3 top-2.5 w-5 h-5 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    </div>
  `;
}

export function FilterSelect({ label, options, value = '', onChange = 'handleFilterChange', name = '' }) {
  const optionsHtml = options.map(opt => 
    `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
  ).join('');
  
  return `
    <div>
      <label class="block text-xs font-medium text-navy-600 dark:text-navy-400 mb-1">${label}</label>
      <select 
        name="${name}"
        onchange="${onChange}('${name}', this.value)"
        class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-navy-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      >
        ${optionsHtml}
      </select>
    </div>
  `;
}

// ============================================
// CONFIRMATION MODAL
// ============================================

export function AdminConfirmModal({ 
  id = 'admin-confirm-modal',
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmClass = 'bg-red-600 hover:bg-red-700',
  requireTyping = null,  // If set, user must type this word to confirm
  onConfirm = 'handleConfirm',
}) {
  const typingHtml = requireTyping ? `
    <div class="mt-4">
      <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">
        Type "${requireTyping}" to confirm:
      </label>
      <input 
        type="text" 
        id="${id}-typing-input"
        class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-navy-900 dark:text-white"
        oninput="document.getElementById('${id}-confirm-btn').disabled = this.value !== '${requireTyping}'"
      />
    </div>
  ` : '';
  
  const disabledAttr = requireTyping ? 'disabled' : '';
  
  return `
    <div id="${id}" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/50">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-2">${title}</h3>
        <div class="text-navy-600 dark:text-navy-400">${message}</div>
        ${typingHtml}
        <div class="flex gap-3 mt-6">
          <button 
            onclick="closeAdminModal('${id}')"
            class="flex-1 px-4 py-2 rounded-lg border border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700 transition"
          >
            ${cancelText}
          </button>
          <button 
            id="${id}-confirm-btn"
            onclick="${onConfirm}()"
            ${disabledAttr}
            class="flex-1 px-4 py-2 rounded-lg text-white ${confirmClass} transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ${confirmText}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Modal helpers - attached to window for onclick handlers
window.showAdminModal = (modalId, data = {}) => showAdminModal(modalId, data);
window.closeAdminModal = (modalId) => closeAdminModal(modalId);

// ============================================
// DETAIL DRAWER
// ============================================

export function DetailDrawer({ id = 'detail-drawer', title = 'Details', content = '' }) {
  return `
    <div id="${id}" class="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-navy-800 shadow-2xl transform translate-x-full transition-transform duration-300 z-40">
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-navy-200 dark:border-navy-700">
          <h2 class="text-lg font-bold text-navy-900 dark:text-white">${title}</h2>
          <button 
            onclick="closeDrawer('${id}')"
            class="p-2 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-700 text-navy-600 dark:text-navy-400"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="${id}-content" class="flex-1 overflow-y-auto p-4">
          ${content}
        </div>
      </div>
    </div>
    <div id="${id}-overlay" class="fixed inset-0 bg-black/30 hidden z-30" onclick="closeDrawer('${id}')"></div>
  `;
}

// Drawer helpers - attached to window for onclick handlers
window.openDrawer = (drawerId) => openDrawer(drawerId);
window.closeDrawer = (drawerId) => closeDrawer(drawerId);
window.updateDrawerContent = (drawerId, content) => updateDrawerContent(drawerId, content);

// ============================================
// ACTION BUTTONS
// ============================================

export function ActionButton({ label, onClick, variant = 'primary', icon = '', size = 'md', disabled = false }) {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 hover:bg-navy-200 dark:hover:bg-navy-600',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-gold-600 text-white hover:bg-gold-700',
    outline: 'border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return `
    <button 
      onclick="${onClick}"
      ${disabled ? 'disabled' : ''}
      class="inline-flex items-center gap-2 rounded-lg font-medium transition ${variants[variant]} ${sizes[size]} ${disabledClass}"
    >
      ${icon}
      ${label}
    </button>
  `;
}

// ============================================
// LOADING STATE
// ============================================

export function AdminSpinner({ size = 'md', message = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return `
    <div class="flex flex-col items-center justify-center py-8">
      <svg class="${sizes[size]} animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${message ? `<p class="mt-2 text-navy-600 dark:text-navy-400">${message}</p>` : ''}
    </div>
  `;
}

// ============================================
// PAGINATION
// ============================================

export function Pagination({ currentPage = 1, totalPages = 1, onPageChange = 'handlePageChange' }) {
  if (totalPages <= 1) return '';
  
  const pages = [];
  const showEllipsis = totalPages > 7;
  
  if (showEllipsis) {
    // First page
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Last page
    if (!pages.includes(totalPages)) pages.push(totalPages);
  } else {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  }
  
  const pageButtons = pages.map(page => {
    if (page === '...') {
      return `<span class="px-3 py-1 text-navy-400">...</span>`;
    }
    const isActive = page === currentPage;
    return `
      <button 
        onclick="${onPageChange}(${page})"
        class="px-3 py-1 rounded-lg ${isActive 
          ? 'bg-emerald-600 text-white' 
          : 'text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700'}"
      >
        ${page}
      </button>
    `;
  }).join('');
  
  return `
    <div class="flex items-center justify-center gap-1 mt-4">
      <button 
        onclick="${onPageChange}(${currentPage - 1})"
        ${currentPage === 1 ? 'disabled' : ''}
        class="px-3 py-1 rounded-lg text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Prev
      </button>
      ${pageButtons}
      <button 
        onclick="${onPageChange}(${currentPage + 1})"
        ${currentPage === totalPages ? 'disabled' : ''}
        class="px-3 py-1 rounded-lg text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  `;
}

// ============================================
// EMPTY STATE
// ============================================

export function EmptyState({ icon = '📭', title = 'No data', message = '', action = null }) {
  const actionHtml = action ? `
    <button 
      onclick="${action.onClick}"
      class="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
    >
      ${action.label}
    </button>
  ` : '';
  
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-6xl mb-4">${icon}</div>
      <h3 class="text-lg font-semibold text-navy-900 dark:text-white mb-2">${title}</h3>
      ${message ? `<p class="text-navy-600 dark:text-navy-400 max-w-md">${message}</p>` : ''}
      ${actionHtml}
    </div>
  `;
}

// ============================================
// TABS
// ============================================

export function AdminTabs({ tabs, activeTab, onTabChange = 'handleTabChange' }) {
  const tabsHtml = tabs.map(tab => {
    const isActive = tab.id === activeTab;
    return `
      <button 
        onclick="${onTabChange}('${tab.id}')"
        class="px-4 py-2 rounded-lg font-medium transition ${isActive 
          ? 'bg-emerald-600 text-white' 
          : 'text-navy-600 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700'}"
      >
        ${tab.label}
        ${tab.count !== undefined ? `<span class="ml-1 text-xs opacity-75">(${tab.count})</span>` : ''}
      </button>
    `;
  }).join('');
  
  return `
    <div class="flex flex-wrap gap-2 mb-4">
      ${tabsHtml}
    </div>
  `;
}

// ============================================
// EXPORTED HELPER FUNCTIONS
// ============================================

export function showAdminModal(modalId, data = {}) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    window.currentModalData = data;
  }
}

export function closeAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    window.currentModalData = null;
  }
}

export function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const overlay = document.getElementById(`${drawerId}-overlay`);
  if (drawer) {
    drawer.classList.remove('translate-x-full');
    overlay?.classList.remove('hidden');
  }
}

export function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const overlay = document.getElementById(`${drawerId}-overlay`);
  if (drawer) {
    drawer.classList.add('translate-x-full');
    overlay?.classList.add('hidden');
  }
}

export function updateDrawerContent(drawerId, content) {
  const contentEl = document.getElementById(`${drawerId}-content`);
  if (contentEl) {
    contentEl.innerHTML = content;
  }
}
