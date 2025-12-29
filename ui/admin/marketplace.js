/**
 * Admin Marketplace Moderation
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminTable, StatusBadge, SearchBar, FilterSelect, AdminSpinner, DetailDrawer } from './components.js';
import { adminRemoveListing, adminRestoreListing } from '../../adminApi.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from '../../firebaseClient.js';

let currentFilters = { status: '', search: '' };
let listingsCache = [];

export async function renderAdminMarketplace() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'marketplace',
    children: AdminSpinner({ size: 'lg', message: 'Loading listings...' })
  });
  
  await loadListings();
}

async function loadListings() {
  try {
    const constraints = [orderBy('createdAt', 'desc'), limit(100)];
    if (currentFilters.status) {
      constraints.unshift(where('status', '==', currentFilters.status));
    }
    
    const q = query(collection(window.db, 'listings'), ...constraints);
    const snapshot = await getDocs(q);
    listingsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let filtered = listingsCache;
    if (currentFilters.search) {
      const search = currentFilters.search.toLowerCase();
      filtered = listingsCache.filter(l => 
        l.title?.toLowerCase().includes(search) ||
        l.description?.toLowerCase().includes(search) ||
        l.creatorEmail?.toLowerCase().includes(search)
      );
    }
    
    renderListingsContent(filtered);
  } catch (error) {
    console.error('Error loading listings:', error);
    showToast('Failed to load listings', 'error');
  }
}

function renderListingsContent(listings) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const columns = [
    { key: 'title', label: 'Title', render: (val, row) => `
      <div>
        <div class="font-medium">${val || 'Untitled'}</div>
        <div class="text-xs text-navy-500">${row.type || 'unknown'}</div>
      </div>
    `},
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val }) },
    { key: 'creatorEmail', label: 'Creator' },
    { key: 'createdAt', label: 'Created', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'adminRemoved', label: 'Flagged', render: (val) => val ? '🚩' : '' },
    { key: 'id', label: '', render: (val, row) => `
      <div class="flex gap-2">
        <button onclick="viewListingDetails('${val}')" class="text-emerald-600 text-sm">View</button>
        ${row.adminRemoved ? 
          `<button onclick="restoreListing('${val}')" class="text-blue-600 text-sm">Restore</button>` :
          `<button onclick="removeListing('${val}')" class="text-red-600 text-sm">Remove</button>`
        }
      </div>
    `},
  ];
  
  adminContent.innerHTML = `
    <div class="bg-white dark:bg-navy-800 rounded-lg shadow-sm border border-navy-200 dark:border-navy-700 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2">
          ${SearchBar({ placeholder: 'Search listings...', value: currentFilters.search, onSearch: 'handleListingSearch' })}
        </div>
        ${FilterSelect({
          label: 'Status',
          name: 'status',
          value: currentFilters.status,
          options: [
            { value: '', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'paired', label: 'Paired' },
            { value: 'closed', label: 'Closed' },
            { value: 'removed', label: 'Removed' },
          ],
          onChange: 'handleListingFilterChange'
        })}
      </div>
    </div>
    
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${listings.filter(l => l.status === 'open').length}</div>
        <div class="text-sm text-emerald-700">Open</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-purple-600">${listings.filter(l => l.status === 'paired').length}</div>
        <div class="text-sm text-purple-700">Paired</div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gray-600">${listings.filter(l => l.status === 'closed').length}</div>
        <div class="text-sm text-gray-700">Closed</div>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${listings.filter(l => l.adminRemoved).length}</div>
        <div class="text-sm text-red-700">Removed</div>
      </div>
    </div>
    
    ${AdminTable({ columns, rows: listings, emptyMessage: 'No listings found' })}
    ${DetailDrawer({ id: 'listing-drawer', title: 'Listing Details' })}
  `;
}

window.handleListingSearch = (value) => { currentFilters.search = value; loadListings(); };
window.handleListingFilterChange = (name, value) => { currentFilters[name] = value; loadListings(); };

window.viewListingDetails = async (listingId) => {
  try {
    const listingDoc = await getDoc(doc(window.db, 'listings', listingId));
    if (!listingDoc.exists()) { showToast('Listing not found', 'error'); return; }
    
    const listing = { id: listingDoc.id, ...listingDoc.data() };
    
    updateDrawerContent('listing-drawer', `
      <div class="space-y-6">
        <div>
          <h3 class="text-xl font-bold text-navy-900 dark:text-white">${listing.title || 'Untitled'}</h3>
          <div class="mt-2">${StatusBadge({ status: listing.status })}</div>
        </div>
        
        <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
          <h4 class="font-semibold mb-2">Description</h4>
          <p class="text-navy-700 dark:text-navy-300 text-sm">${listing.description || 'No description'}</p>
        </div>
        
        <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-navy-600">Type</span>
            <span class="font-medium">${listing.type || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-navy-600">Creator</span>
            <span>${listing.creatorEmail || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-navy-600">Created</span>
            <span>${listing.createdAt?.toDate ? formatDate(listing.createdAt.toDate()) : '-'}</span>
          </div>
          ${listing.linkedDealId ? `
            <div class="flex justify-between">
              <span class="text-navy-600">Linked Deal</span>
              <a href="#/admin/agreements?id=${listing.linkedDealId}" class="text-emerald-600">View →</a>
            </div>
          ` : ''}
        </div>
        
        <div class="space-y-2">
          ${listing.adminRemoved ? `
            <button onclick="restoreListing('${listing.id}')" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ✓ Restore Listing
            </button>
          ` : `
            <button onclick="removeListing('${listing.id}')" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              🚫 Remove Listing
            </button>
          `}
        </div>
      </div>
    `);
    openDrawer('listing-drawer');
  } catch (error) {
    showToast('Failed to load listing', 'error');
  }
};

window.removeListing = async (listingId) => {
  const reason = prompt('Reason for removal:');
  if (!reason) return;
  
  try {
    await adminRemoveListing(listingId, reason);
    showToast('Listing removed', 'success');
    closeDrawer('listing-drawer');
    loadListings();
  } catch (error) {
    showToast(error.message || 'Failed to remove listing', 'error');
  }
};

window.restoreListing = async (listingId) => {
  const reason = prompt('Reason for restoration:');
  if (!reason) return;
  
  try {
    await adminRestoreListing(listingId, reason);
    showToast('Listing restored', 'success');
    closeDrawer('listing-drawer');
    loadListings();
  } catch (error) {
    showToast(error.message || 'Failed to restore listing', 'error');
  }
};
