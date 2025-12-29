/**
 * Admin Moderation Config
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminSpinner, AdminTable, AdminConfirmModal, showAdminModal, closeAdminModal } from './components.js';
import { adminUpdateModerationConfig } from '../../adminApi.js';
import { showToast, formatDate } from '../components.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../../firebaseClient.js';

let moderationConfig = {
  blockedTerms: [],
  flaggedTerms: [],
  autoBlockEnabled: true,
  autoFlagEnabled: true,
  minDescriptionLength: 10,
  maxDescriptionLength: 2000,
};

export async function renderAdminModeration() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'moderation',
    children: AdminSpinner({ size: 'lg', message: 'Loading config...' })
  });
  
  await loadModerationConfig();
}

async function loadModerationConfig() {
  try {
    const configDoc = await getDoc(doc(window.db, 'moderationConfig', 'default'));
    if (configDoc.exists()) {
      moderationConfig = { ...moderationConfig, ...configDoc.data() };
    }
    renderModerationContent();
  } catch (error) {
    console.error('Error loading config:', error);
    showToast('Failed to load moderation config', 'error');
  }
}

function renderModerationContent() {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  adminContent.innerHTML = `
    <div class="max-w-4xl space-y-8">
      <!-- Settings -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Moderation Settings</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-navy-900 dark:text-white">Auto-Block Listings</p>
              <p class="text-sm text-navy-500">Automatically block listings containing blocked terms</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${moderationConfig.autoBlockEnabled ? 'checked' : ''} onchange="toggleAutoBlock(this.checked)" class="sr-only peer">
              <div class="w-11 h-6 bg-navy-200 peer-focus:outline-none rounded-full peer dark:bg-navy-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-navy-900 dark:text-white">Auto-Flag Listings</p>
              <p class="text-sm text-navy-500">Flag listings with flagged terms for review</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${moderationConfig.autoFlagEnabled ? 'checked' : ''} onchange="toggleAutoFlag(this.checked)" class="sr-only peer">
              <div class="w-11 h-6 bg-navy-200 peer-focus:outline-none rounded-full peer dark:bg-navy-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-navy-200 dark:border-navy-700">
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Min Description Length</label>
              <input type="number" id="min-desc-length" value="${moderationConfig.minDescriptionLength}" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Max Description Length</label>
              <input type="number" id="max-desc-length" value="${moderationConfig.maxDescriptionLength}" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
            </div>
          </div>
          <button onclick="saveLengthSettings()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Save Length Settings
          </button>
        </div>
      </div>
      
      <!-- Blocked Terms -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-lg font-bold text-navy-900 dark:text-white">Blocked Terms</h3>
            <p class="text-sm text-navy-500">Listings containing these terms will be auto-blocked</p>
          </div>
          <button onclick="showAddTermModal('blocked')" class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            + Add Term
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          ${moderationConfig.blockedTerms.length > 0 ? moderationConfig.blockedTerms.map(term => `
            <span class="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
              ${term}
              <button onclick="removeTerm('blocked', '${term}')" class="text-red-500 hover:text-red-700">×</button>
            </span>
          `).join('') : '<p class="text-navy-500 text-sm">No blocked terms</p>'}
        </div>
      </div>
      
      <!-- Flagged Terms -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="text-lg font-bold text-navy-900 dark:text-white">Flagged Terms</h3>
            <p class="text-sm text-navy-500">Listings containing these terms will be flagged for review</p>
          </div>
          <button onclick="showAddTermModal('flagged')" class="px-3 py-1 bg-gold-500 text-white rounded-lg text-sm hover:bg-gold-600">
            + Add Term
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          ${moderationConfig.flaggedTerms.length > 0 ? moderationConfig.flaggedTerms.map(term => `
            <span class="inline-flex items-center gap-2 px-3 py-1 bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 rounded-full text-sm">
              ${term}
              <button onclick="removeTerm('flagged', '${term}')" class="text-gold-500 hover:text-gold-700">×</button>
            </span>
          `).join('') : '<p class="text-navy-500 text-sm">No flagged terms</p>'}
        </div>
      </div>
      
      <!-- Flagged Queue -->
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Flagged Listings Queue</h3>
        <div id="flagged-queue">
          <p class="text-navy-500 text-center py-8">Loading flagged items...</p>
        </div>
      </div>
    </div>
    
    <!-- Add Term Modal -->
    <div id="add-term-modal" class="fixed inset-0 bg-black/50 hidden z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-4">Add <span id="term-type-label">Blocked</span> Term</h3>
        <input 
          type="text" 
          id="new-term-input"
          placeholder="Enter term..."
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 mb-4"
        />
        <div class="flex gap-3">
          <button onclick="hideAddTermModal()" class="flex-1 px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg">
            Cancel
          </button>
          <button onclick="addNewTerm()" class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Add Term
          </button>
        </div>
      </div>
    </div>
  `;
  
  loadFlaggedQueue();
}

async function loadFlaggedQueue() {
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import('../../firebaseClient.js');
    const q = query(
      collection(window.db, 'moderationFlags'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    const flags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const queueEl = document.getElementById('flagged-queue');
    if (!queueEl) return;
    
    if (flags.length === 0) {
      queueEl.innerHTML = '<p class="text-navy-500 text-center py-8">🎉 No pending flags</p>';
      return;
    }
    
    queueEl.innerHTML = `
      <div class="space-y-3">
        ${flags.map(flag => `
          <div class="flex items-center justify-between p-3 bg-navy-50 dark:bg-navy-700/50 rounded-lg">
            <div>
              <p class="font-medium text-navy-900 dark:text-white">${flag.listingId?.substring(0, 12) || flag.dealId?.substring(0, 12) || 'Unknown'}...</p>
              <p class="text-sm text-navy-500">Reason: ${flag.reason || 'Matched flagged term'}</p>
              <p class="text-xs text-navy-400">${flag.createdAt?.toDate ? formatDate(flag.createdAt.toDate()) : ''}</p>
            </div>
            <div class="flex gap-2">
              <button onclick="approveFlaggedItem('${flag.id}', '${flag.listingId || flag.dealId}')" class="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm">Approve</button>
              <button onclick="rejectFlaggedItem('${flag.id}', '${flag.listingId || flag.dealId}')" class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error loading flagged queue:', error);
  }
}

let pendingTermType = 'blocked';

window.showAddTermModal = (type) => {
  pendingTermType = type;
  document.getElementById('term-type-label').textContent = type === 'blocked' ? 'Blocked' : 'Flagged';
  document.getElementById('add-term-modal').classList.remove('hidden');
};

window.hideAddTermModal = () => {
  document.getElementById('add-term-modal').classList.add('hidden');
  document.getElementById('new-term-input').value = '';
};

window.addNewTerm = async () => {
  const term = document.getElementById('new-term-input')?.value?.trim().toLowerCase();
  if (!term) { showToast('Please enter a term', 'error'); return; }
  
  const listKey = pendingTermType === 'blocked' ? 'blockedTerms' : 'flaggedTerms';
  if (moderationConfig[listKey].includes(term)) {
    showToast('Term already exists', 'error'); return;
  }
  
  try {
    const updatedList = [...moderationConfig[listKey], term];
    await adminUpdateModerationConfig({ [listKey]: updatedList });
    moderationConfig[listKey] = updatedList;
    showToast('Term added', 'success');
    hideAddTermModal();
    renderModerationContent();
  } catch (error) {
    showToast(error.message || 'Failed to add term', 'error');
  }
};

window.removeTerm = async (type, term) => {
  const listKey = type === 'blocked' ? 'blockedTerms' : 'flaggedTerms';
  try {
    const updatedList = moderationConfig[listKey].filter(t => t !== term);
    await adminUpdateModerationConfig({ [listKey]: updatedList });
    moderationConfig[listKey] = updatedList;
    showToast('Term removed', 'success');
    renderModerationContent();
  } catch (error) {
    showToast(error.message || 'Failed to remove term', 'error');
  }
};

window.toggleAutoBlock = async (enabled) => {
  try {
    await adminUpdateModerationConfig({ autoBlockEnabled: enabled });
    moderationConfig.autoBlockEnabled = enabled;
    showToast(`Auto-block ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    showToast(error.message || 'Failed to update', 'error');
  }
};

window.toggleAutoFlag = async (enabled) => {
  try {
    await adminUpdateModerationConfig({ autoFlagEnabled: enabled });
    moderationConfig.autoFlagEnabled = enabled;
    showToast(`Auto-flag ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    showToast(error.message || 'Failed to update', 'error');
  }
};

window.saveLengthSettings = async () => {
  const min = parseInt(document.getElementById('min-desc-length')?.value) || 10;
  const max = parseInt(document.getElementById('max-desc-length')?.value) || 2000;
  
  if (min > max) {
    showToast('Min cannot be greater than max', 'error'); return;
  }
  
  try {
    await adminUpdateModerationConfig({ minDescriptionLength: min, maxDescriptionLength: max });
    moderationConfig.minDescriptionLength = min;
    moderationConfig.maxDescriptionLength = max;
    showToast('Settings saved', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to save', 'error');
  }
};

window.approveFlaggedItem = async (flagId, itemId) => {
  try {
    await setDoc(doc(window.db, 'moderationFlags', flagId), { status: 'approved' }, { merge: true });
    showToast('Item approved', 'success');
    loadFlaggedQueue();
  } catch (error) {
    showToast('Failed to approve', 'error');
  }
};

window.rejectFlaggedItem = async (flagId, itemId) => {
  try {
    const { adminRemoveListing } = await import('../../adminApi.js');
    await adminRemoveListing(itemId, 'Failed moderation review');
    await setDoc(doc(window.db, 'moderationFlags', flagId), { status: 'rejected' }, { merge: true });
    showToast('Item removed', 'success');
    loadFlaggedQueue();
  } catch (error) {
    showToast('Failed to remove', 'error');
  }
};
