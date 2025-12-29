/**
 * Admin Cases (Investigations)
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminTable, StatusBadge, PriorityBadge, AdminSpinner, DetailDrawer, AdminTabs, AdminConfirmModal, showAdminModal, closeAdminModal, openDrawer, closeDrawer, updateDrawerContent } from './components.js';
import { adminCreateCase, adminAddCaseNote, adminUpdateCaseStatus, adminGetStats } from '../../adminApi.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, onSnapshot } from '../../firebaseClient.js';

let currentFilters = { status: 'open' };
let casesCache = [];
let selectedCase = null;

export async function renderAdminCases() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'cases',
    children: AdminSpinner({ size: 'lg', message: 'Loading cases...' })
  });
  
  await loadCases();
}

async function loadCases() {
  try {
    const constraints = [orderBy('createdAt', 'desc'), limit(100)];
    if (currentFilters.status) {
      constraints.unshift(where('status', '==', currentFilters.status));
    }
    
    const q = query(collection(window.db, 'cases'), ...constraints);
    const snapshot = await getDocs(q);
    casesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderCasesContent(casesCache);
  } catch (error) {
    console.error('Error loading cases:', error);
    showToast('Failed to load cases', 'error');
  }
}

function renderCasesContent(cases) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const openCount = casesCache.filter(c => c.status === 'open').length;
  const inProgressCount = casesCache.filter(c => c.status === 'in_progress').length;
  const closedCount = casesCache.filter(c => c.status === 'closed' || c.status === 'resolved').length;
  
  const columns = [
    { key: 'id', label: 'Case ID', render: (val) => `<span class="font-mono text-sm">${val.substring(0, 8)}</span>` },
    { key: 'title', label: 'Title', render: (val) => `<span class="font-medium">${val}</span>` },
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val }) },
    { key: 'priority', label: 'Priority', render: (val) => PriorityBadge({ priority: val || 'medium' }) },
    { key: 'assignedTo', label: 'Assigned', render: (val) => val ? `<span class="text-sm">${val}</span>` : '<span class="text-navy-400">Unassigned</span>' },
    { key: 'linkedDealIds', label: 'Links', render: (val, row) => {
      const counts = [];
      if (row.linkedDealIds?.length) counts.push(`${row.linkedDealIds.length} deals`);
      if (row.linkedUserIds?.length) counts.push(`${row.linkedUserIds.length} users`);
      if (row.linkedTicketIds?.length) counts.push(`${row.linkedTicketIds.length} tickets`);
      return counts.length ? counts.join(', ') : '-';
    }},
    { key: 'createdAt', label: 'Created', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'id', label: '', render: (val) => `
      <button onclick="viewCaseDetails('${val}')" class="text-emerald-600 text-sm">View →</button>
    `},
  ];
  
  adminContent.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      ${AdminTabs({
        tabs: [
          { id: 'open', label: 'Open', count: openCount },
          { id: 'in_progress', label: 'In Progress', count: inProgressCount },
          { id: 'closed', label: 'Closed', count: closedCount },
          { id: '', label: 'All' },
        ],
        activeTab: currentFilters.status,
        onTabChange: 'handleCaseTabChange'
      })}
      <button onclick="showNewCaseModal()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
        <span>+</span> New Case
      </button>
    </div>
    
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${openCount}</div>
        <div class="text-sm text-red-700">Open</div>
      </div>
      <div class="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gold-600">${inProgressCount}</div>
        <div class="text-sm text-gold-700">In Progress</div>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${closedCount}</div>
        <div class="text-sm text-emerald-700">Closed</div>
      </div>
    </div>
    
    ${AdminTable({ columns, rows: cases, emptyMessage: 'No cases found' })}
    ${DetailDrawer({ id: 'case-drawer', title: 'Case Details' })}
    
    <!-- New Case Modal -->
    <div id="new-case-modal" class="fixed inset-0 bg-black/50 hidden z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-4">Create New Case</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Title</label>
            <input type="text" id="new-case-title" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Description</label>
            <textarea id="new-case-description" rows="3" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Priority</label>
              <select id="new-case-priority" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Related Deal ID</label>
              <input type="text" id="new-case-deal" placeholder="Optional" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button onclick="hideNewCaseModal()" class="flex-1 px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg">
            Cancel
          </button>
          <button onclick="createNewCase()" class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Create Case
          </button>
        </div>
      </div>
    </div>
  `;
}

window.handleCaseTabChange = (status) => {
  currentFilters.status = status;
  loadCases();
};

window.showNewCaseModal = () => {
  document.getElementById('new-case-modal').classList.remove('hidden');
};

window.hideNewCaseModal = () => {
  document.getElementById('new-case-modal').classList.add('hidden');
};

window.createNewCase = async () => {
  const title = document.getElementById('new-case-title')?.value;
  const description = document.getElementById('new-case-description')?.value;
  const priority = document.getElementById('new-case-priority')?.value;
  const dealId = document.getElementById('new-case-deal')?.value;
  
  if (!title) { showToast('Title is required', 'error'); return; }
  
  try {
    const result = await adminCreateCase({
      title,
      description: description || '',
      priority,
      linkedDealIds: dealId ? [dealId] : [],
      linkedUserIds: [],
      linkedTicketIds: [],
    });
    showToast('Case created', 'success');
    hideNewCaseModal();
    loadCases();
    viewCaseDetails(result.caseId);
  } catch (error) {
    showToast(error.message || 'Failed to create case', 'error');
  }
};

window.viewCaseDetails = async (caseId) => {
  try {
    const caseDoc = await getDoc(doc(window.db, 'cases', caseId));
    if (!caseDoc.exists()) { showToast('Case not found', 'error'); return; }
    
    selectedCase = { id: caseDoc.id, ...caseDoc.data() };
    
    // Fetch notes/timeline
    const notesQuery = query(
      collection(window.db, 'cases', caseId, 'notes'),
      orderBy('createdAt', 'desc')
    );
    const notesSnapshot = await getDocs(notesQuery);
    const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderCaseDetailContent(selectedCase, notes);
    openDrawer('case-drawer');
  } catch (error) {
    showToast('Failed to load case', 'error');
  }
};

function renderCaseDetailContent(caseData, notes) {
  updateDrawerContent('case-drawer', `
    <div class="space-y-6">
      <div>
        <div class="flex items-center gap-2 mb-2">
          ${StatusBadge({ status: caseData.status })}
          ${PriorityBadge({ priority: caseData.priority || 'medium' })}
        </div>
        <h3 class="text-lg font-bold text-navy-900 dark:text-white">${caseData.title}</h3>
        <p class="text-sm text-navy-500 mt-2">${caseData.description || 'No description'}</p>
      </div>
      
      <!-- Linked Items -->
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Linked Items</h4>
        <div class="space-y-2 text-sm">
          ${caseData.linkedDealIds?.length ? `
            <div>
              <span class="text-navy-500">Deals:</span>
              ${caseData.linkedDealIds.map(id => `
                <a href="#/admin/agreements?id=${id}" class="text-emerald-600 ml-2">${id.substring(0, 8)}</a>
              `).join('')}
            </div>
          ` : ''}
          ${caseData.linkedUserIds?.length ? `
            <div>
              <span class="text-navy-500">Users:</span>
              ${caseData.linkedUserIds.map(id => `
                <a href="#/admin/users?id=${id}" class="text-emerald-600 ml-2">${id.substring(0, 8)}</a>
              `).join('')}
            </div>
          ` : ''}
          ${caseData.linkedTicketIds?.length ? `
            <div>
              <span class="text-navy-500">Tickets:</span>
              ${caseData.linkedTicketIds.map(id => `
                <a href="#/admin/support?id=${id}" class="text-emerald-600 ml-2">${id.substring(0, 8)}</a>
              `).join('')}
            </div>
          ` : ''}
          ${!caseData.linkedDealIds?.length && !caseData.linkedUserIds?.length && !caseData.linkedTicketIds?.length ? '<p class="text-navy-400">No linked items</p>' : ''}
        </div>
      </div>
      
      <!-- Status Update -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Update Status</h4>
        <div class="flex gap-2">
          ${['open', 'in_progress', 'resolved', 'closed'].map(status => `
            <button 
              onclick="updateCaseStatus('${caseData.id}', '${status}')"
              class="px-3 py-1 rounded-lg text-sm ${caseData.status === status ? 'bg-emerald-600 text-white' : 'border border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-700'}"
            >
              ${status.replace('_', ' ')}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Notes/Timeline -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Notes & Timeline</h4>
        <div class="space-y-3 max-h-60 overflow-y-auto">
          ${notes.length > 0 ? notes.map(note => `
            <div class="p-3 bg-navy-50 dark:bg-navy-700/50 rounded-lg">
              <div class="text-xs text-navy-500 mb-1">${note.addedByEmail || 'Admin'} • ${note.createdAt?.toDate ? formatDate(note.createdAt.toDate()) : ''}</div>
              <p class="text-sm text-navy-900 dark:text-white">${note.content}</p>
            </div>
          `).join('') : '<p class="text-navy-500 text-sm text-center">No notes yet</p>'}
        </div>
      </div>
      
      <!-- Add Note -->
      <div>
        <textarea 
          id="case-note"
          rows="3"
          placeholder="Add a note..."
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"
        ></textarea>
        <button onclick="addCaseNote('${caseData.id}')" class="w-full mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Add Note
        </button>
      </div>
      
      <!-- Meta -->
      <div class="pt-4 border-t border-navy-200 dark:border-navy-700 text-sm text-navy-500">
        <p>Created: ${caseData.createdAt?.toDate ? formatDate(caseData.createdAt.toDate()) : '-'}</p>
        ${caseData.assignedTo ? `<p>Assigned to: ${caseData.assignedTo}</p>` : ''}
        ${caseData.resolvedAt ? `<p>Resolved: ${formatDate(caseData.resolvedAt.toDate())}</p>` : ''}
      </div>
    </div>
  `);
}

window.updateCaseStatus = async (caseId, status) => {
  try {
    await adminUpdateCaseStatus(caseId, status, `Status changed to ${status}`);
    showToast(`Case marked as ${status}`, 'success');
    viewCaseDetails(caseId);
  } catch (error) {
    showToast(error.message || 'Failed to update status', 'error');
  }
};

window.addCaseNote = async (caseId) => {
  const content = document.getElementById('case-note')?.value;
  if (!content) { showToast('Please enter a note', 'error'); return; }
  
  try {
    await adminAddCaseNote(caseId, content);
    showToast('Note added', 'success');
    document.getElementById('case-note').value = '';
    viewCaseDetails(caseId);
  } catch (error) {
    showToast(error.message || 'Failed to add note', 'error');
  }
};
