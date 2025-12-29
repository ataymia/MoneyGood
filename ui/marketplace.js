import { Navbar, showToast, Spinner, SkeletonList, formatCurrency, formatRelativeTime } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, serverTimestamp } from '../firebaseClient.js';
import { store } from '../store.js';
import { router } from '../router.js';

// Marketplace categories
const MARKETPLACE_CATEGORIES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'payments', label: 'Payments', icon: '💵' },
  { id: 'services', label: 'Services', icon: '🛠️' },
  { id: 'goods', label: 'Goods', icon: '📦' },
  { id: 'accountability', label: 'Accountability', icon: '🎯' },
  { id: 'other', label: 'Other', icon: '✨' }
];

export async function renderMarketplace() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${user ? renderSidebar(user) : ''}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div>
                <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Marketplace</h1>
                <p class="text-navy-600 dark:text-navy-400">Browse open agreement offers</p>
              </div>
              <a 
                href="#/marketplace/new" 
                class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition btn-press"
              >
                + Create Listing
              </a>
            </div>
            
            <!-- Category Filters -->
            <div class="flex flex-wrap gap-2 mb-6">
              ${MARKETPLACE_CATEGORIES.map(cat => `
                <button 
                  onclick="window.filterMarketplace('${cat.id}')"
                  class="category-filter px-4 py-2 rounded-full text-sm font-medium transition-all ${cat.id === 'all' ? 'active' : ''}"
                  data-category="${cat.id}"
                >
                  ${cat.icon} ${cat.label}
                </button>
              `).join('')}
            </div>
            
            <!-- Listings Grid -->
            <div id="listings-container">
              ${SkeletonList({ count: 6 })}
            </div>
          </div>
        </div>
      </div>
      ${user ? renderMobileNav(user) : ''}
    </div>
  `;
  
  // Setup filter function
  window.filterMarketplace = (category) => {
    const buttons = document.querySelectorAll('.category-filter');
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.category === category));
    
    const cards = document.querySelectorAll('.listing-card');
    cards.forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  };
  
  loadListings();
}

async function loadListings() {
  try {
    const listingsRef = collection(window.db, 'listings');
    const q = query(
      listingsRef,
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const listings = [];
    snapshot.forEach(doc => listings.push({ id: doc.id, ...doc.data() }));
    
    renderListings(listings);
  } catch (error) {
    console.error('Error loading listings:', error);
    showToast('Failed to load listings', 'error');
    document.getElementById('listings-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😕</div>
        <h3 class="empty-state-title">Couldn't load listings</h3>
        <p class="empty-state-description">Please try refreshing the page</p>
      </div>
    `;
  }
}

function renderListings(listings) {
  const container = document.getElementById('listings-container');
  
  if (listings.length === 0) {
    container.innerHTML = `
      <div class="empty-state card">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No open listings yet</h3>
        <p class="empty-state-description">Be the first to create a listing!</p>
        <a href="#/marketplace/new" class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition btn-press">
          Create Listing
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${listings.map(listing => `
        <div 
          class="listing-card card p-6 cursor-pointer hover-lift group" 
          data-category="${listing.category || 'other'}"
          onclick="window.location.hash = '/marketplace/${listing.id}'"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-1 group-hover:text-emerald-600 transition">${listing.title}</h3>
              <p class="text-sm text-navy-600 dark:text-navy-400 line-clamp-2">${listing.description}</p>
            </div>
            <span class="status-badge status-${listing.status} ml-4">${listing.status}</span>
          </div>
          
          <div class="flex items-center gap-4 text-sm text-navy-600 dark:text-navy-400">
            <span class="flex items-center gap-1">
              <span>📊</span>
              <span>${formatDealType(listing.type)}</span>
            </span>
            <span class="flex items-center gap-1">
              <span>⏰</span>
              <span>${formatRelativeTime(listing.createdAt)}</span>
            </span>
            ${listing.tags && listing.tags.length > 0 ? `
              <span class="flex items-center gap-1">
                ${listing.tags.slice(0, 2).map(tag => `
                  <span class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                    ${tag}
                  </span>
                `).join('')}
              </span>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export async function renderListingDetail(params) {
  const { id: listingId } = params;
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      <div class="flex-1 overflow-y-auto py-8">
        <div class="container mx-auto px-4">
          <div class="max-w-4xl mx-auto">
            <div id="listing-container">
              <div class="flex items-center justify-center py-12">
                ${Spinner({ size: 'lg' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadListingDetail(listingId, user);
}

async function loadListingDetail(listingId, user) {
  try {
    const listingDoc = await getDoc(doc(window.db, 'listings', listingId));
    
    if (!listingDoc.exists()) {
      showToast('Listing not found', 'error');
      window.location.hash = '/marketplace';
      return;
    }
    
    const listing = { id: listingDoc.id, ...listingDoc.data() };
    renderListingDetailContent(listing, user);
  } catch (error) {
    console.error('Error loading listing:', error);
    showToast('Failed to load listing', 'error');
  }
}

function renderListingDetailContent(listing, user) {
  const container = document.getElementById('listing-container');
  const isOwner = user && listing.createdByUid === user.uid;
  const canJoin = user && !isOwner && listing.status === 'open';
  
  container.innerHTML = `
    <div class="mb-6">
      <button 
        onclick="window.location.hash = '/marketplace'" 
        class="text-emerald-600 hover:text-emerald-700 font-semibold mb-4"
      >
        ← Back to Marketplace
      </button>
      
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">${listing.title}</h1>
          <div class="flex items-center gap-4 text-sm text-navy-600 dark:text-navy-400">
            <span>${formatRelativeTime(listing.createdAt)}</span>
            <span>•</span>
            <span>${formatDealType(listing.type)}</span>
          </div>
        </div>
        <span class="status-badge status-${listing.status}">${listing.status}</span>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="card p-6">
          <h3 class="font-bold text-navy-900 dark:text-white mb-3">Description</h3>
          <p class="text-navy-700 dark:text-navy-300 whitespace-pre-wrap">${listing.description}</p>
        </div>
        
        ${listing.legA && listing.legB ? `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-4">Terms</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div class="font-semibold text-emerald-900 dark:text-emerald-300 mb-2">Creator Side</div>
                <p class="text-sm text-emerald-800 dark:text-emerald-400">${formatLegSummary(listing.legA)}</p>
              </div>
              <div class="p-4 bg-gold-50 dark:bg-gold-900/20 rounded-lg">
                <div class="font-semibold text-gold-900 dark:text-gold-300 mb-2">Joiner Side</div>
                <p class="text-sm text-gold-800 dark:text-gold-400">${formatLegSummary(listing.legB)}</p>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${listing.tags && listing.tags.length > 0 ? `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-3">Tags</h3>
            <div class="flex flex-wrap gap-2">
              ${listing.tags.map(tag => `
                <span class="px-3 py-1 bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-300 rounded-full text-sm">
                  ${tag}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="space-y-6">
        ${canJoin ? `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-4">Join This Agreement</h3>
            <p class="text-sm text-navy-600 dark:text-navy-400 mb-4">
              Clicking "Join" will create a new agreement from this listing with you as the participant.
            </p>
            <button 
              onclick="window.handleJoinListing('${listing.id}')" 
              class="btn-primary bg-emerald-600 text-white w-full px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Join Agreement
            </button>
          </div>
        ` : !user ? `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-4">Login Required</h3>
            <p class="text-sm text-navy-600 dark:text-navy-400 mb-4">
              You must be logged in to join this agreement.
            </p>
            <a 
              href="#/login" 
              class="btn-primary bg-emerald-600 text-white block text-center w-full px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Login
            </a>
          </div>
        ` : isOwner ? `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-4">Your Listing</h3>
            <p class="text-sm text-navy-600 dark:text-navy-400">
              This is your listing. Wait for others to join.
            </p>
          </div>
        ` : `
          <div class="card p-6">
            <h3 class="font-bold text-navy-900 dark:text-white mb-4">Status</h3>
            <p class="text-sm text-navy-600 dark:text-navy-400">
              This listing is ${listing.status}.
            </p>
          </div>
        `}
        
        <div class="card p-6">
          <h3 class="font-bold text-navy-900 dark:text-white mb-4">Info</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-navy-600 dark:text-navy-400">Type:</span>
              <span class="font-semibold text-navy-900 dark:text-white">${formatDealType(listing.type)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-navy-600 dark:text-navy-400">Posted:</span>
              <span class="font-semibold text-navy-900 dark:text-white">${formatRelativeTime(listing.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Handle joining a listing
window.handleJoinListing = async function(listingId) {
  const { user } = store.getState();
  
  if (!user) {
    showToast('Please login to join', 'warning');
    router.navigate('/login');
    return;
  }
  
  try {
    // Get listing data
    const listingDoc = await getDoc(doc(window.db, 'listings', listingId));
    if (!listingDoc.exists()) {
      showToast('Listing not found', 'error');
      return;
    }
    
    const listing = listingDoc.data();
    
    // Import createDeal from api
    const { createDeal } = await import('../api.js');
    
    // Create a deal from the listing
    const dealData = {
      title: listing.title,
      description: listing.description,
      participantEmail: user.email, // Current user is joining
      type: listing.type,
      dealDate: listing.dealDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: listing.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      legA: listing.legA,
      legB: listing.legB,
      // Legacy fields
      moneyAmountCents: listing.moneyAmountCents,
      goodsA: listing.goodsA,
      goodsB: listing.goodsB,
      declaredValueA: listing.declaredValueA,
      declaredValueB: listing.declaredValueB,
    };
    
    showToast('Creating agreement from listing...', 'info');
    const result = await createDeal(dealData);
    
    showToast('Agreement created! Redirecting...', 'success');
    setTimeout(() => {
      router.navigate(`/deal/${result.dealId}`);
    }, 1000);
    
  } catch (error) {
    console.error('Error joining listing:', error);
    showToast(error.message || 'Failed to join listing', 'error');
  }
};

function formatDealType(type) {
  const types = {
    'CASH_CASH': 'Money ↔ Money',
    'CASH_GOODS': 'Money ↔ Goods',
    'GOODS_GOODS': 'Goods ↔ Goods',
    'MONEY_MONEY': 'Money ↔ Money',
    'MONEY_GOODS': 'Money ↔ Goods',
    'MONEY_SERVICE': 'Money ↔ Service',
    'GOODS_SERVICE': 'Goods ↔ Service',
    'SERVICE_SERVICE': 'Service ↔ Service',
  };
  return types[type] || type;
}

function formatLegSummary(leg) {
  if (!leg) return '';
  
  if (leg.kind === 'MONEY') {
    return `$${((leg.moneyAmountCents || 0) / 100).toFixed(2)} payment`;
  }
  
  if (leg.kind === 'GOODS') {
    return `${leg.description || 'Goods'} (value: $${((leg.declaredValueCents || 0) / 100).toFixed(2)})`;
  }
  
  if (leg.kind === 'SERVICE') {
    return `${leg.description || 'Service'} (value: $${((leg.declaredValueCents || 0) / 100).toFixed(2)})`;
  }
  
  return '';
}
