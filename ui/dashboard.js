// Use mock Firebase for demo mode - switch back to '../firebase.js' when ready
import { collection, query, where, orderBy, getDocs, onSnapshot } from '../firebase-mock.js';
import { Navbar, Card, formatCurrency, formatDate, showToast, Spinner } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { router } from '../router.js';
import { store } from '../store.js';

export async function renderDashboard() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${renderSidebar(user)}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Dashboard</h1>
              <p class="text-navy-600 dark:text-navy-400">Manage your deals and transactions</p>
            </div>
            <button 
              onclick="window.location.hash = '/deal/new'" 
              class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition shadow-glow"
            >
              + New Deal
            </button>
          </div>
          
          <div id="deals-container" class="space-y-8">
            <div class="flex items-center justify-center py-12">
              ${Spinner({ size: 'lg' })}
            </div>
          </div>
        </div>
      </div>
      ${renderMobileNav(user)}
    </div>
  `;

  loadDeals(user.uid);
}

async function loadDeals(userId) {
  try {
    const dealsRef = collection(window.db, 'deals');
    
    // Query for deals where user is creator or participant
    const creatorQuery = query(
      dealsRef,
      where('creatorUid', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const participantQuery = query(
      dealsRef,
      where('participantUid', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const [creatorSnapshot, participantSnapshot] = await Promise.all([
      getDocs(creatorQuery),
      getDocs(participantQuery)
    ]);
    
    const deals = [];
    creatorSnapshot.forEach(doc => deals.push({ id: doc.id, ...doc.data() }));
    participantSnapshot.forEach(doc => {
      if (!deals.find(d => d.id === doc.id)) {
        deals.push({ id: doc.id, ...doc.data() });
      }
    });
    
    // Sort deals by created date
    deals.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    
    store.setState({ deals });
    renderDealsGrouped(deals, userId);
  } catch (error) {
    console.error('Error loading deals:', error);
    showToast('Failed to load deals', 'error');
    document.getElementById('deals-container').innerHTML = `
      <div class="text-center py-12 text-navy-600 dark:text-navy-400">
        <p>Failed to load deals. Please try again.</p>
      </div>
    `;
  }
}

function renderDealsGrouped(deals, userId) {
  const groups = {
    needsAction: [],
    active: [],
    pastDue: [],
    frozen: [],
    completed: []
  };
  
  deals.forEach(deal => {
    const needsAction = checkNeedsAction(deal, userId);
    
    if (needsAction) {
      groups.needsAction.push(deal);
    } else if (deal.status === 'past_due') {
      groups.pastDue.push(deal);
    } else if (deal.status === 'frozen') {
      groups.frozen.push(deal);
    } else if (deal.status === 'completed' || deal.status === 'cancelled') {
      groups.completed.push(deal);
    } else {
      groups.active.push(deal);
    }
  });
  
  const container = document.getElementById('deals-container');
  
  if (deals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">💰</div>
        <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-2">No deals yet</h2>
        <p class="text-navy-600 dark:text-navy-400 mb-6">Create your first deal to get started</p>
        <button 
          onclick="window.location.hash = '/deal/new'" 
          class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Create Deal
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    ${renderDealSection('Needs Action', groups.needsAction, userId, 'red')}
    ${renderDealSection('Active Deals', groups.active, userId, 'emerald')}
    ${renderDealSection('Past Due', groups.pastDue, userId, 'orange')}
    ${renderDealSection('Frozen', groups.frozen, userId, 'purple')}
    ${renderDealSection('Completed', groups.completed, userId, 'gray')}
  `;
}

function renderDealSection(title, deals, userId, color) {
  if (deals.length === 0) return '';
  
  const colorClasses = {
    red: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    gray: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
  };
  
  return `
    <div class="mb-8">
      <h2 class="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
        <span class="w-2 h-8 bg-${color}-500 rounded"></span>
        ${title}
        <span class="text-sm font-normal text-navy-600 dark:text-navy-400">(${deals.length})</span>
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${deals.map(deal => renderDealCard(deal, userId)).join('')}
      </div>
    </div>
  `;
}

function renderDealCard(deal, userId) {
  const isCreator = deal.creatorUid === userId;
  const role = isCreator ? 'Creator' : 'Participant';
  const otherParty = isCreator ? deal.participantEmail || 'Pending' : deal.creatorEmail;
  
  const dealDate = deal.dealDate?.seconds 
    ? new Date(deal.dealDate.seconds * 1000).toLocaleDateString()
    : 'Not set';
  
  return `
    <div 
      class="card cursor-pointer" 
      onclick="window.location.hash = '/deal/${deal.id}'"
    >
      <div class="flex items-start justify-between mb-3">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white">${deal.title || 'Untitled Deal'}</h3>
        <span class="status-badge status-${deal.status}">${deal.status.replace('_', ' ')}</span>
      </div>
      
      <p class="text-sm text-navy-600 dark:text-navy-400 mb-3 line-clamp-2">
        ${deal.description || 'No description'}
      </p>
      
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Type:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${formatDealType(deal.type)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Role:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${role}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Other Party:</span>
          <span class="font-semibold text-navy-900 dark:text-white truncate ml-2">${otherParty}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Deal Date:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${dealDate}</span>
        </div>
        ${deal.moneyAmountCents ? `
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Amount:</span>
            <span class="font-semibold text-emerald-600">${formatCurrency(deal.moneyAmountCents)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function checkNeedsAction(deal, userId) {
  const isCreator = deal.creatorUid === userId;
  
  // Needs to accept invite
  if (deal.status === 'invited' && !isCreator) {
    return true;
  }
  
  // Needs to fund
  if (deal.status === 'awaiting_funding') {
    return true;
  }
  
  // Has pending outcome proposal
  if (deal.proposedOutcome && !deal.outcomeConfirmed) {
    return true;
  }
  
  return false;
}

function formatDealType(type) {
  const types = {
    'CASH_CASH': 'Cash ↔ Cash',
    'CASH_GOODS': 'Cash ↔ Goods',
    'GOODS_GOODS': 'Goods ↔ Goods'
  };
  return types[type] || type;
}
