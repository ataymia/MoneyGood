import { Navbar, Card, Spinner, showToast, formatCurrency, formatRelativeTime } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { router } from '../router.js';
import { store } from '../store.js';
// Use mock Firebase for demo mode - switch back to '../firebase.js' when ready
import { collection, query, where, orderBy, getDocs } from '../firebaseClient.js';

export async function renderDealsList() {
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
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Deals</h1>
            <p class="text-navy-600 dark:text-navy-400">View and manage all your deals</p>
          </div>
          
          <!-- Filters and Search -->
          <div class="bg-white dark:bg-navy-800 rounded-lg p-4 mb-6 shadow">
            <div class="flex flex-col md:flex-row gap-4">
              <!-- Search -->
              <div class="flex-1">
                <input 
                  type="text" 
                  id="search-deals" 
                  placeholder="Search by title or participant..."
                  class="w-full px-4 py-2 border border-navy-300 dark:border-navy-600 rounded-lg"
                  oninput="window.filterDeals()"
                />
              </div>
              
              <!-- Filter Tabs -->
              <div class="flex gap-2 flex-wrap">
                <button onclick="window.filterDealsByStatus('all')" class="filter-btn px-4 py-2 rounded-lg bg-emerald-600 text-white" data-status="all">
                  All
                </button>
                <button onclick="window.filterDealsByStatus('needs_action')" class="filter-btn px-4 py-2 rounded-lg bg-navy-200 dark:bg-navy-700 text-navy-900 dark:text-white" data-status="needs_action">
                  Needs Action
                </button>
                <button onclick="window.filterDealsByStatus('active')" class="filter-btn px-4 py-2 rounded-lg bg-navy-200 dark:bg-navy-700 text-navy-900 dark:text-white" data-status="active">
                  Active
                </button>
                <button onclick="window.filterDealsByStatus('past_due')" class="filter-btn px-4 py-2 rounded-lg bg-navy-200 dark:bg-navy-700 text-navy-900 dark:text-white" data-status="past_due">
                  Past Due
                </button>
                <button onclick="window.filterDealsByStatus('completed')" class="filter-btn px-4 py-2 rounded-lg bg-navy-200 dark:bg-navy-700 text-navy-900 dark:text-white" data-status="completed">
                  Completed
                </button>
              </div>
              
              <!-- Sort -->
              <select id="sort-deals" onchange="window.sortDeals()" class="px-4 py-2 border border-navy-300 dark:border-navy-600 rounded-lg">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="deal_date_soon">Deal Date (Soonest)</option>
                <option value="deal_date_far">Deal Date (Latest)</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
              </select>
            </div>
          </div>
          
          <!-- Deals List -->
          <div id="deals-container" class="space-y-4">
            <div class="flex justify-center py-12">
              ${Spinner({ size: 'lg' })}
            </div>
          </div>
        </div>
      </div>
      ${renderMobileNav(user)}
    </div>
  `;
  
  // Load deals
  await loadDeals(user.uid);
}

async function loadDeals(userId) {
  try {
    if (!window.firebaseReady) {
      document.getElementById('deals-container').innerHTML = `
        <div class="text-center py-12">
          <p class="text-navy-600 dark:text-navy-400">Firebase is not configured. Cannot load deals.</p>
        </div>
      `;
      return;
    }

    const dealsQuery = query(
      collection(db, 'deals'),
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(dealsQuery);
    const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Store deals globally for filtering
    window.allDeals = deals;
    window.filteredDeals = deals;
    
    renderDealsGrid(deals);
  } catch (error) {
    console.error('Error loading deals:', error);
    document.getElementById('deals-container').innerHTML = `
      <div class="text-center py-12">
        <p class="text-red-600 dark:text-red-400">Error loading deals: ${error.message}</p>
      </div>
    `;
  }
}

function renderDealsGrid(deals) {
  const container = document.getElementById('deals-container');
  
  if (deals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">📋</div>
        <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">No deals found</h3>
        <p class="text-navy-600 dark:text-navy-400 mb-6">Get started by creating your first deal</p>
        <a href="#/deal/new" class="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Create Deal
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = deals.map(deal => renderDealCard(deal)).join('');
}

function renderDealCard(deal) {
  const statusClass = `status-${deal.status}`;
  const dealDate = deal.dealDate ? new Date(deal.dealDate).toLocaleDateString() : 'Not set';
  const isPastDue = deal.dealDate && new Date(deal.dealDate) < new Date() && !['completed', 'cancelled'].includes(deal.status);
  
  return `
    <a href="#/deal/${deal.id}" class="block">
      <div class="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-1">${deal.title || 'Untitled Deal'}</h3>
            <p class="text-sm text-navy-600 dark:text-navy-400">${deal.type?.replace('_', ' + ') || 'Unknown Type'}</p>
          </div>
          <span class="status-badge ${statusClass}">${deal.status?.replace('_', ' ') || 'Unknown'}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p class="text-xs text-navy-500 dark:text-navy-400 mb-1">Total Amount</p>
            <p class="text-lg font-bold text-navy-900 dark:text-white">
              ${deal.totalAmount ? formatCurrency(deal.totalAmount) : 'N/A'}
            </p>
          </div>
          <div>
            <p class="text-xs text-navy-500 dark:text-navy-400 mb-1">Deal Date</p>
            <p class="text-lg font-bold ${isPastDue ? 'text-red-600' : 'text-navy-900 dark:text-white'}">
              ${dealDate}
              ${isPastDue ? ' <span class="text-xs">(Past Due)</span>' : ''}
            </p>
          </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
          <div class="text-navy-600 dark:text-navy-400">
            Created ${formatRelativeTime(deal.createdAt?.toDate?.() || new Date())}
          </div>
          <div class="text-emerald-600 font-semibold">
            View Details →
          </div>
        </div>
      </div>
    </a>
  `;
}

// Global filter and sort functions
window.filterDealsByStatus = (status) => {
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.status === status) {
      btn.className = 'filter-btn px-4 py-2 rounded-lg bg-emerald-600 text-white';
    } else {
      btn.className = 'filter-btn px-4 py-2 rounded-lg bg-navy-200 dark:bg-navy-700 text-navy-900 dark:text-white';
    }
  });
  
  // Filter deals
  if (status === 'all') {
    window.filteredDeals = window.allDeals;
  } else if (status === 'needs_action') {
    window.filteredDeals = window.allDeals.filter(deal => 
      ['draft', 'invited', 'awaiting_funding'].includes(deal.status)
    );
  } else {
    window.filteredDeals = window.allDeals.filter(deal => deal.status === status);
  }
  
  // Apply search filter
  window.filterDeals();
};

window.filterDeals = () => {
  const searchTerm = document.getElementById('search-deals')?.value.toLowerCase() || '';
  
  let filtered = window.filteredDeals || window.allDeals || [];
  
  if (searchTerm) {
    filtered = filtered.filter(deal => 
      (deal.title || '').toLowerCase().includes(searchTerm) ||
      (deal.type || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply sort
  window.sortDeals(filtered);
};

window.sortDeals = (dealsToSort) => {
  const sortBy = document.getElementById('sort-deals')?.value || 'newest';
  const deals = dealsToSort || window.filteredDeals || window.allDeals || [];
  
  let sorted = [...deals];
  
  switch (sortBy) {
    case 'newest':
      sorted.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      break;
    case 'oldest':
      sorted.sort((a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0));
      break;
    case 'deal_date_soon':
      sorted.sort((a, b) => {
        const dateA = a.dealDate ? new Date(a.dealDate) : new Date('2099-12-31');
        const dateB = b.dealDate ? new Date(b.dealDate) : new Date('2099-12-31');
        return dateA - dateB;
      });
      break;
    case 'deal_date_far':
      sorted.sort((a, b) => {
        const dateA = a.dealDate ? new Date(a.dealDate) : new Date('1970-01-01');
        const dateB = b.dealDate ? new Date(b.dealDate) : new Date('1970-01-01');
        return dateB - dateA;
      });
      break;
    case 'amount_high':
      sorted.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
      break;
    case 'amount_low':
      sorted.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
      break;
  }
  
  renderDealsGrid(sorted);
};
