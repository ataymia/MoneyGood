/**
 * Admin Users Management
 * 
 * User list, search, filters, detail panel, status actions
 */

import { AdminLayout, checkAdminAccess, renderUnauthorized, initAdminAccess } from './layout.js';
import { 
  AdminTable, StatusBadge, SearchBar, FilterSelect, AdminSpinner, 
  DetailDrawer, ActionButton, AdminConfirmModal, Pagination, EmptyState 
} from './components.js';
import { 
  adminSetUserStatus, adminDeleteUser, adminAddUserNote, 
  adminCreateCase, adminGrantAccess, adminRevokeAccess 
} from '../../adminApi.js';
import { showToast, formatCurrency, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, startAfter } from '../../firebaseClient.js';

// State
let currentFilters = { status: '', search: '' };
let currentPage = 1;
let usersCache = [];
let selectedUser = null;

export async function renderAdminUsers() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) {
    renderUnauthorized();
    return;
  }
  
  const content = document.getElementById('content');
  if (!content) return;
  
  content.innerHTML = AdminLayout({
    activeSection: 'users',
    children: AdminSpinner({ size: 'lg', message: 'Loading users...' })
  });
  
  await loadUsers();
}

async function loadUsers() {
  try {
    const constraints = [orderBy('createdAt', 'desc'), limit(50)];
    
    if (currentFilters.status) {
      constraints.unshift(where('status', '==', currentFilters.status));
    }
    
    const q = query(collection(window.db, 'users'), ...constraints);
    const snapshot = await getDocs(q);
    
    usersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply client-side search filter
    let filteredUsers = usersCache;
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      filteredUsers = usersCache.filter(user => 
        user.email?.toLowerCase().includes(search) ||
        user.displayName?.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search)
      );
    }
    
    renderUsersContent(filteredUsers);
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Failed to load users', 'error');
  }
}

function renderUsersContent(users) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const columns = [
    { key: 'email', label: 'Email', render: (val, row) => `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          ${val?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div class="font-medium">${val || 'No email'}</div>
          <div class="text-xs text-navy-500">${row.displayName || ''}</div>
        </div>
      </div>
    `},
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val || 'active' }) },
    { key: 'createdAt', label: 'Joined', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'isAdmin', label: 'Role', render: (val) => val ? 
      '<span class="text-emerald-600 font-medium">Admin</span>' : 
      '<span class="text-navy-400">User</span>' 
    },
    { key: 'id', label: 'Actions', render: (val, row) => `
      <button 
        onclick="viewUserDetails('${val}')"
        class="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
      >
        View →
      </button>
    `},
  ];
  
  adminContent.innerHTML = `
    <!-- Filters -->
    <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-2">
          ${SearchBar({ placeholder: 'Search by email, name, or ID...', value: currentFilters.search, onSearch: 'handleUserSearch' })}
        </div>
        ${FilterSelect({
          label: 'Status',
          name: 'status',
          value: currentFilters.status,
          options: [
            { value: '', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'deleted', label: 'Deleted' },
          ],
          onChange: 'handleUserFilterChange'
        })}
        <div class="flex items-end">
          <button 
            onclick="exportUsers()"
            class="w-full px-4 py-2 bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-200 dark:hover:bg-navy-600 transition"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${users.filter(u => !u.status || u.status === 'active').length}</div>
        <div class="text-sm text-emerald-700 dark:text-emerald-400">Active</div>
      </div>
      <div class="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gold-600">${users.filter(u => u.status === 'paused').length}</div>
        <div class="text-sm text-gold-700 dark:text-gold-400">Paused</div>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${users.filter(u => u.status === 'suspended').length}</div>
        <div class="text-sm text-red-700 dark:text-red-400">Suspended</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-purple-600">${users.filter(u => u.isAdmin).length}</div>
        <div class="text-sm text-purple-700 dark:text-purple-400">Admins</div>
      </div>
    </div>
    
    <!-- Table -->
    ${AdminTable({ columns, rows: users, emptyMessage: 'No users found', onRowClick: 'viewUserDetails' })}
    
    <!-- Detail Drawer -->
    ${DetailDrawer({ id: 'user-drawer', title: 'User Details' })}
    
    <!-- Confirmation Modal -->
    ${AdminConfirmModal({
      id: 'user-action-modal',
      title: 'Confirm Action',
      message: '<div id="user-action-message"></div>',
      confirmText: 'Confirm',
      onConfirm: 'executeUserAction'
    })}
  `;
}

// Global handlers
window.handleUserSearch = (value) => {
  currentFilters.search = value;
  loadUsers();
};

window.handleUserFilterChange = (name, value) => {
  currentFilters[name] = value;
  loadUsers();
};

window.viewUserDetails = async (userId) => {
  try {
    const userDoc = await getDoc(doc(window.db, 'users', userId));
    if (!userDoc.exists()) {
      showToast('User not found', 'error');
      return;
    }
    
    selectedUser = { id: userDoc.id, ...userDoc.data() };
    
    // Fetch user's deals
    const dealsQuery = query(
      collection(window.db, 'deals'),
      where('creatorUid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const dealsSnapshot = await getDocs(dealsQuery);
    const userDeals = dealsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch admin notes
    const notesQuery = query(
      collection(window.db, 'users', userId, 'adminNotes'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const notesSnapshot = await getDocs(notesQuery);
    const adminNotes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const drawerContent = renderUserDetailContent(selectedUser, userDeals, adminNotes);
    updateDrawerContent('user-drawer', drawerContent);
    openDrawer('user-drawer');
  } catch (error) {
    console.error('Error loading user details:', error);
    showToast('Failed to load user details', 'error');
  }
};

function renderUserDetailContent(user, deals, notes) {
  const status = user.status || 'active';
  
  return `
    <div class="space-y-6">
      <!-- User Info -->
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl">
          ${user.email?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h3 class="text-lg font-bold text-navy-900 dark:text-white">${user.displayName || 'No Name'}</h3>
          <p class="text-navy-600 dark:text-navy-400">${user.email}</p>
          <div class="mt-1">${StatusBadge({ status })}</div>
        </div>
      </div>
      
      <!-- Details -->
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-navy-600 dark:text-navy-400">User ID</span>
          <span class="font-mono text-navy-900 dark:text-white text-xs">${user.id}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-navy-600 dark:text-navy-400">Joined</span>
          <span class="text-navy-900 dark:text-white">${user.createdAt?.toDate ? formatDate(user.createdAt.toDate()) : '-'}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-navy-600 dark:text-navy-400">Last Login</span>
          <span class="text-navy-900 dark:text-white">${user.lastLoginAt?.toDate ? formatDate(user.lastLoginAt.toDate()) : '-'}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-navy-600 dark:text-navy-400">Role</span>
          <span class="text-navy-900 dark:text-white">${user.isAdmin ? 'Administrator' : 'User'}</span>
        </div>
      </div>
      
      <!-- Status Actions -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Account Actions</h4>
        <div class="grid grid-cols-2 gap-2">
          ${status !== 'active' ? `
            <button onclick="confirmUserAction('${user.id}', 'active', 'Reactivate')" 
              class="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              ✓ Reactivate
            </button>
          ` : ''}
          ${status !== 'paused' ? `
            <button onclick="confirmUserAction('${user.id}', 'paused', 'Pause')" 
              class="px-3 py-2 bg-gold-600 text-white rounded-lg text-sm hover:bg-gold-700">
              ⏸ Pause
            </button>
          ` : ''}
          ${status !== 'suspended' ? `
            <button onclick="confirmUserAction('${user.id}', 'suspended', 'Suspend')" 
              class="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              🚫 Suspend
            </button>
          ` : ''}
          <button onclick="confirmUserAction('${user.id}', 'deleted', 'Delete')" 
            class="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
            🗑 Soft Delete
          </button>
        </div>
      </div>
      
      <!-- Admin Actions -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Admin Access</h4>
        <div class="flex gap-2">
          ${!user.isAdmin ? `
            <button onclick="grantAdminAccess('${user.id}')" 
              class="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              🔑 Grant Admin
            </button>
          ` : `
            <button onclick="revokeAdminAccess('${user.id}')" 
              class="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
              🔒 Revoke Admin
            </button>
          `}
        </div>
      </div>
      
      <!-- Recent Deals -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Recent Agreements (${deals.length})</h4>
        ${deals.length > 0 ? `
          <div class="space-y-2">
            ${deals.map(deal => `
              <a href="#/admin/agreements?id=${deal.id}" class="block p-3 bg-navy-50 dark:bg-navy-700/50 rounded-lg hover:bg-navy-100 dark:hover:bg-navy-700">
                <div class="flex justify-between items-center">
                  <span class="font-medium text-navy-900 dark:text-white text-sm">${deal.title || 'Untitled'}</span>
                  ${StatusBadge({ status: deal.status })}
                </div>
                <div class="text-xs text-navy-500 mt-1">${deal.createdAt?.toDate ? formatDate(deal.createdAt.toDate()) : ''}</div>
              </a>
            `).join('')}
          </div>
        ` : '<p class="text-navy-500 text-sm">No agreements yet</p>'}
      </div>
      
      <!-- Add Note -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Add Admin Note</h4>
        <textarea 
          id="user-note-input"
          rows="3"
          placeholder="Add internal note about this user..."
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-navy-900 dark:text-white"
        ></textarea>
        <button 
          onclick="addUserNote('${user.id}')"
          class="mt-2 w-full px-4 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700"
        >
          Add Note
        </button>
      </div>
      
      <!-- Admin Notes -->
      ${notes.length > 0 ? `
        <div>
          <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Admin Notes</h4>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${notes.map(note => `
              <div class="p-3 bg-gold-50 dark:bg-gold-900/20 rounded-lg text-sm">
                <p class="text-navy-900 dark:text-white">${note.note}</p>
                <p class="text-xs text-navy-500 mt-1">${note.adminEmail} • ${note.createdAt?.toDate ? formatDate(note.createdAt.toDate()) : ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Create Case -->
      <div class="pt-4 border-t border-navy-200 dark:border-navy-700">
        <button 
          onclick="createUserCase('${user.id}', '${user.email}')"
          class="w-full px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700"
        >
          📁 Create Investigation Case
        </button>
      </div>
    </div>
  `;
}

// Action handlers
let pendingAction = null;

window.confirmUserAction = (userId, status, actionLabel) => {
  pendingAction = { userId, status };
  
  const messages = {
    active: 'This will reactivate the user account and restore full access.',
    paused: 'This will temporarily pause the account. User will see "account on hold" message.',
    suspended: 'This will suspend the account and revoke all access. User cannot sign in.',
    deleted: 'This will soft-delete the account. User data is preserved but access is revoked.',
  };
  
  document.getElementById('user-action-message').innerHTML = `
    <p class="mb-3">${messages[status]}</p>
    <label class="block text-sm font-medium mb-1">Reason (required):</label>
    <textarea id="action-reason" rows="2" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"></textarea>
  `;
  
  showAdminModal('user-action-modal');
};

window.executeUserAction = async () => {
  if (!pendingAction) return;
  
  const reason = document.getElementById('action-reason')?.value;
  if (!reason) {
    showToast('Please provide a reason', 'error');
    return;
  }
  
  try {
    await adminSetUserStatus(pendingAction.userId, pendingAction.status, reason);
    showToast('User status updated', 'success');
    closeAdminModal('user-action-modal');
    closeDrawer('user-drawer');
    loadUsers();
  } catch (error) {
    showToast(error.message || 'Failed to update user', 'error');
  }
  
  pendingAction = null;
};

window.addUserNote = async (userId) => {
  const note = document.getElementById('user-note-input')?.value;
  if (!note) {
    showToast('Please enter a note', 'error');
    return;
  }
  
  try {
    await adminAddUserNote(userId, note);
    showToast('Note added', 'success');
    document.getElementById('user-note-input').value = '';
    viewUserDetails(userId); // Refresh
  } catch (error) {
    showToast(error.message || 'Failed to add note', 'error');
  }
};

window.grantAdminAccess = async (userId) => {
  if (!confirm('Grant admin access to this user?')) return;
  
  try {
    await adminGrantAccess(userId);
    showToast('Admin access granted. User must sign out and back in.', 'success');
    viewUserDetails(userId);
  } catch (error) {
    showToast(error.message || 'Failed to grant admin access', 'error');
  }
};

window.revokeAdminAccess = async (userId) => {
  if (!confirm('Revoke admin access from this user?')) return;
  
  try {
    await adminRevokeAccess(userId);
    showToast('Admin access revoked', 'success');
    viewUserDetails(userId);
  } catch (error) {
    showToast(error.message || 'Failed to revoke admin access', 'error');
  }
};

window.createUserCase = async (userId, email) => {
  try {
    const result = await adminCreateCase({
      title: `Investigation: ${email}`,
      description: 'User investigation case',
      priority: 'medium',
      linkedUserIds: [userId],
    });
    showToast('Case created', 'success');
    window.location.hash = `#/admin/cases?id=${result.caseId}`;
  } catch (error) {
    showToast(error.message || 'Failed to create case', 'error');
  }
};

window.exportUsers = () => {
  const csv = usersCache.map(u => 
    `"${u.email}","${u.displayName || ''}","${u.status || 'active'}","${u.createdAt?.toDate?.().toISOString() || ''}","${u.id}"`
  ).join('\n');
  
  const header = 'Email,Name,Status,Created,ID\n';
  const blob = new Blob([header + csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moneygood-users-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
