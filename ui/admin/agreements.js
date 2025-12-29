/**
 * Admin Agreements Management
 * 
 * Agreement list, filters, detail view, admin actions
 */

import { AdminLayout, checkAdminAccess, renderUnauthorized, initAdminAccess } from './layout.js';
import { 
  AdminTable, StatusBadge, SearchBar, FilterSelect, AdminSpinner, 
  DetailDrawer, AdminConfirmModal, Pagination 
} from './components.js';
import { adminCancelDeal, adminAddDealNote, adminCreateCase } from '../../adminApi.js';
import { showToast, formatCurrency, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from '../../firebaseClient.js';

let currentFilters = { status: '', search: '' };
let dealsCache = [];
let selectedDeal = null;

export async function renderAdminAgreements() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) {
    renderUnauthorized();
    return;
  }
  
  const content = document.getElementById('content');
  if (!content) return;
  
  content.innerHTML = AdminLayout({
    activeSection: 'agreements',
    children: AdminSpinner({ size: 'lg', message: 'Loading agreements...' })
  });
  
  await loadDeals();
}

async function loadDeals() {
  try {
    const constraints = [orderBy('createdAt', 'desc'), limit(100)];
    
    if (currentFilters.status) {
      constraints.unshift(where('status', '==', currentFilters.status));
    }
    
    const q = query(collection(window.db, 'deals'), ...constraints);
    const snapshot = await getDocs(q);
    
    dealsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let filteredDeals = dealsCache;
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      filteredDeals = dealsCache.filter(deal => 
        deal.title?.toLowerCase().includes(search) ||
        deal.id.toLowerCase().includes(search) ||
        deal.creatorEmail?.toLowerCase().includes(search) ||
        deal.participantEmail?.toLowerCase().includes(search)
      );
    }
    
    renderDealsContent(filteredDeals);
  } catch (error) {
    console.error('Error loading deals:', error);
    showToast('Failed to load agreements', 'error');
  }
}

function renderDealsContent(deals) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const columns = [
    { key: 'title', label: 'Title', render: (val, row) => `
      <div>
        <div class="font-medium text-navy-900 dark:text-white">${val || 'Untitled'}</div>
        <div class="text-xs text-navy-500 font-mono">${row.id.substring(0, 8)}...</div>
      </div>
    `},
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val }) },
    { key: 'creatorEmail', label: 'Creator', render: (val) => `<span class="text-sm">${val || '-'}</span>` },
    { key: 'participantEmail', label: 'Participant', render: (val) => `<span class="text-sm">${val || 'Pending'}</span>` },
    { key: 'principalCents', label: 'Amount', render: (val) => val ? formatCurrency(val) : '-' },
    { key: 'createdAt', label: 'Created', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'id', label: '', render: (val) => `
      <button onclick="viewDealDetails('${val}')" class="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
        View →
      </button>
    `},
  ];
  
  // Calculate stats
  const statCounts = {
    total: deals.length,
    active: deals.filter(d => ['active', 'locked'].includes(d.status)).length,
    awaiting: deals.filter(d => d.status === 'awaiting_funding').length,
    completed: deals.filter(d => d.status === 'completed').length,
    cancelled: deals.filter(d => d.status === 'cancelled').length,
  };
  
  adminContent.innerHTML = `
    <!-- Filters -->
    <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          ${SearchBar({ placeholder: 'Search by title, ID, or email...', value: currentFilters.search, onSearch: 'handleDealSearch' })}
        </div>
        ${FilterSelect({
          label: 'Status',
          name: 'status',
          value: currentFilters.status,
          options: [
            { value: '', label: 'All Statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'invited', label: 'Invited' },
            { value: 'awaiting_funding', label: 'Awaiting Funding' },
            { value: 'locked', label: 'Locked' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'frozen', label: 'Frozen' },
          ],
          onChange: 'handleDealFilterChange'
        })}
        <div class="flex items-end">
          <button 
            onclick="exportDeals()"
            class="w-full px-4 py-2 bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-200 dark:hover:bg-navy-600 transition"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-5 gap-4 mb-6">
      <div class="bg-white dark:bg-navy-800 rounded-lg p-4 text-center border border-navy-200 dark:border-navy-700">
        <div class="text-2xl font-bold text-navy-900 dark:text-white">${statCounts.total}</div>
        <div class="text-sm text-navy-500">Total</div>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${statCounts.active}</div>
        <div class="text-sm text-emerald-700 dark:text-emerald-400">Active</div>
      </div>
      <div class="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gold-600">${statCounts.awaiting}</div>
        <div class="text-sm text-gold-700 dark:text-gold-400">Awaiting</div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">${statCounts.completed}</div>
        <div class="text-sm text-blue-700 dark:text-blue-400">Completed</div>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${statCounts.cancelled}</div>
        <div class="text-sm text-red-700 dark:text-red-400">Cancelled</div>
      </div>
    </div>
    
    <!-- Table -->
    ${AdminTable({ columns, rows: deals, emptyMessage: 'No agreements found' })}
    
    <!-- Detail Drawer -->
    ${DetailDrawer({ id: 'deal-drawer', title: 'Agreement Details' })}
    
    <!-- Cancel Modal -->
    <div id="cancel-deal-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/50">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Cancel Agreement</h3>
        <p class="text-navy-600 dark:text-navy-400 mb-4">
          This will cancel the agreement and refund any principal payments (startup fee is non-refundable).
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Reason (required):</label>
          <textarea id="cancel-reason" rows="3" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"></textarea>
        </div>
        <div class="flex gap-3">
          <button onclick="closeAdminModal('cancel-deal-modal')" class="flex-1 px-4 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50">
            Cancel
          </button>
          <button onclick="executeCancelDeal()" class="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

window.handleDealSearch = (value) => {
  currentFilters.search = value;
  loadDeals();
};

window.handleDealFilterChange = (name, value) => {
  currentFilters[name] = value;
  loadDeals();
};

window.viewDealDetails = async (dealId) => {
  try {
    const dealDoc = await getDoc(doc(window.db, 'deals', dealId));
    if (!dealDoc.exists()) {
      showToast('Agreement not found', 'error');
      return;
    }
    
    selectedDeal = { id: dealDoc.id, ...dealDoc.data() };
    
    // Fetch actions/timeline
    const actionsQuery = query(
      collection(window.db, 'deals', dealId, 'actions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const actionsSnapshot = await getDocs(actionsQuery);
    const actions = actionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const drawerContent = renderDealDetailContent(selectedDeal, actions);
    updateDrawerContent('deal-drawer', drawerContent);
    openDrawer('deal-drawer');
  } catch (error) {
    console.error('Error loading deal details:', error);
    showToast('Failed to load agreement details', 'error');
  }
};

function renderDealDetailContent(deal, actions) {
  const canCancel = !['completed', 'cancelled', 'refunded'].includes(deal.status);
  
  return `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h3 class="text-xl font-bold text-navy-900 dark:text-white">${deal.title || 'Untitled Agreement'}</h3>
        <div class="flex items-center gap-2 mt-2">
          ${StatusBadge({ status: deal.status })}
          <span class="text-navy-500 font-mono text-xs">${deal.id}</span>
        </div>
      </div>
      
      <!-- Participants -->
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Participants</h4>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-navy-600 dark:text-navy-400">Creator</span>
            <div>
              <span class="text-navy-900 dark:text-white">${deal.creatorEmail || '-'}</span>
              <a href="#/admin/users?id=${deal.creatorUid}" class="ml-2 text-emerald-600 text-xs">View →</a>
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-navy-600 dark:text-navy-400">Participant</span>
            <div>
              <span class="text-navy-900 dark:text-white">${deal.participantEmail || 'Pending'}</span>
              ${deal.participantUid ? `<a href="#/admin/users?id=${deal.participantUid}" class="ml-2 text-emerald-600 text-xs">View →</a>` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Financial Details -->
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Financial Details</h4>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-navy-600 dark:text-navy-400">Principal</span>
            <span class="font-semibold text-emerald-600">${deal.principalCents ? formatCurrency(deal.principalCents) : '-'}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-navy-600 dark:text-navy-400">Startup Fee</span>
            <span class="text-navy-900 dark:text-white">${deal.startupFeeCents ? formatCurrency(deal.startupFeeCents) : '-'}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-navy-600 dark:text-navy-400">Total Charge</span>
            <span class="text-navy-900 dark:text-white">${deal.totalChargeCents ? formatCurrency(deal.totalChargeCents) : '-'}</span>
          </div>
          ${deal.stripePaymentIntentId ? `
            <div class="pt-2 border-t border-navy-200 dark:border-navy-600 mt-2">
              <div class="flex justify-between text-sm">
                <span class="text-navy-600 dark:text-navy-400">Stripe PI</span>
                <span class="font-mono text-xs text-navy-900 dark:text-white">${deal.stripePaymentIntentId}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Dates -->
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Timeline</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Created</span>
            <span class="text-navy-900 dark:text-white">${deal.createdAt?.toDate ? formatDate(deal.createdAt.toDate()) : '-'}</span>
          </div>
          ${deal.lockedAt ? `
            <div class="flex justify-between">
              <span class="text-navy-600 dark:text-navy-400">Locked</span>
              <span class="text-navy-900 dark:text-white">${deal.lockedAt.toDate ? formatDate(deal.lockedAt.toDate()) : '-'}</span>
            </div>
          ` : ''}
          ${deal.completedAt ? `
            <div class="flex justify-between">
              <span class="text-navy-600 dark:text-navy-400">Completed</span>
              <span class="text-navy-900 dark:text-white">${deal.completedAt.toDate ? formatDate(deal.completedAt.toDate()) : '-'}</span>
            </div>
          ` : ''}
          ${deal.cancelledAt ? `
            <div class="flex justify-between">
              <span class="text-navy-600 dark:text-navy-400">Cancelled</span>
              <span class="text-navy-900 dark:text-white">${deal.cancelledAt.toDate ? formatDate(deal.cancelledAt.toDate()) : '-'}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Admin Actions -->
      ${canCancel ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Admin Actions</h4>
          <div class="space-y-2">
            <button onclick="showCancelDealModal('${deal.id}')" 
              class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              ❌ Cancel Agreement
            </button>
          </div>
        </div>
      ` : ''}
      
      <!-- Add Note -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Add Admin Note</h4>
        <textarea 
          id="deal-note-input"
          rows="2"
          placeholder="Add internal note..."
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"
        ></textarea>
        <button onclick="addDealNote('${deal.id}')" class="mt-2 w-full px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700">
          Add Note
        </button>
      </div>
      
      <!-- Activity Timeline -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Activity Log</h4>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${actions.length > 0 ? actions.map(action => `
            <div class="p-3 bg-navy-50 dark:bg-navy-700/50 rounded-lg text-sm">
              <div class="flex justify-between items-start">
                <span class="font-medium text-navy-900 dark:text-white">${action.type?.replace(/_/g, ' ') || 'Action'}</span>
                <span class="text-xs text-navy-500">${action.createdAt?.toDate ? formatDate(action.createdAt.toDate()) : ''}</span>
              </div>
              ${action.details ? `<p class="text-navy-600 dark:text-navy-400 mt-1">${action.details}</p>` : ''}
              <p class="text-xs text-navy-500 mt-1">${action.userEmail || 'System'}</p>
            </div>
          `).join('') : '<p class="text-navy-500 text-sm text-center">No activity yet</p>'}
        </div>
      </div>
      
      <!-- Create Case -->
      <div class="pt-4 border-t border-navy-200 dark:border-navy-700">
        <button onclick="createDealCase('${deal.id}', '${deal.title || 'Agreement'}')" 
          class="w-full px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700">
          📁 Create Investigation Case
        </button>
      </div>
    </div>
  `;
}

window.showCancelDealModal = (dealId) => {
  selectedDeal = dealsCache.find(d => d.id === dealId) || { id: dealId };
  showAdminModal('cancel-deal-modal');
};

window.executeCancelDeal = async () => {
  if (!selectedDeal) return;
  
  const reason = document.getElementById('cancel-reason')?.value;
  if (!reason) {
    showToast('Please provide a reason', 'error');
    return;
  }
  
  try {
    await adminCancelDeal(selectedDeal.id, reason);
    showToast('Agreement cancelled', 'success');
    closeAdminModal('cancel-deal-modal');
    closeDrawer('deal-drawer');
    loadDeals();
  } catch (error) {
    showToast(error.message || 'Failed to cancel agreement', 'error');
  }
};

window.addDealNote = async (dealId) => {
  const note = document.getElementById('deal-note-input')?.value;
  if (!note) {
    showToast('Please enter a note', 'error');
    return;
  }
  
  try {
    await adminAddDealNote(dealId, note);
    showToast('Note added', 'success');
    document.getElementById('deal-note-input').value = '';
    viewDealDetails(dealId);
  } catch (error) {
    showToast(error.message || 'Failed to add note', 'error');
  }
};

window.createDealCase = async (dealId, title) => {
  const deal = dealsCache.find(d => d.id === dealId);
  try {
    const result = await adminCreateCase({
      title: `Investigation: ${title}`,
      description: 'Agreement investigation case',
      priority: 'medium',
      linkedDealIds: [dealId],
      linkedUserIds: [deal?.creatorUid, deal?.participantUid].filter(Boolean),
    });
    showToast('Case created', 'success');
    window.location.hash = `#/admin/cases?id=${result.caseId}`;
  } catch (error) {
    showToast(error.message || 'Failed to create case', 'error');
  }
};

window.exportDeals = () => {
  const csv = dealsCache.map(d => 
    `"${d.title || ''}","${d.status}","${d.creatorEmail || ''}","${d.participantEmail || ''}","${d.principalCents || 0}","${d.createdAt?.toDate?.().toISOString() || ''}","${d.id}"`
  ).join('\n');
  
  const header = 'Title,Status,Creator,Participant,Amount (cents),Created,ID\n';
  const blob = new Blob([header + csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moneygood-agreements-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
