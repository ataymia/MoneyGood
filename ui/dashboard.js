// Use mock Firebase for demo mode - switch back to '../firebase.js' when ready
import { collection, query, where, orderBy, getDocs, onSnapshot } from '../firebaseClient.js';
import { Navbar, Card, formatCurrency, formatDate, showToast, Spinner } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { getUserActivityFeed, renderActivityFeed } from './events.js';
import { router } from '../router.js';
import { store } from '../store.js';

// Quick Actions configuration
const QUICK_ACTIONS = [
  { icon: '➕', label: 'New Agreement', href: '#/deal/new' },
  { icon: '📋', label: 'Templates', href: '#/templates' },
  { icon: '🛒', label: 'Marketplace', href: '#/marketplace' },
  { icon: '👥', label: 'People', href: '#/people' },
  { icon: '🔔', label: 'Notifications', href: '#/notifications' },
];

export async function renderDashboard() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${renderSidebar(user)}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <!-- Welcome Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">
              Welcome back${user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
            </h1>
            <p class="text-navy-600 dark:text-navy-400">Here's what's happening with your agreements</p>
          </div>
          
          <!-- Quick Actions -->
          <div class="mb-8">
            <h2 class="text-lg font-semibold text-navy-900 dark:text-white mb-4">Quick Actions</h2>
            <div class="flex gap-3 overflow-x-auto pb-2">
              ${QUICK_ACTIONS.map(action => `
                <a href="${action.href}" class="quick-action hover-lift btn-press flex-shrink-0">
                  <span class="quick-action-icon">${action.icon}</span>
                  <span class="quick-action-label">${action.label}</span>
                </a>
              `).join('')}
            </div>
          </div>
          
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Deals Section (2 cols) -->
            <div class="lg:col-span-2">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-navy-900 dark:text-white">Your Agreements</h2>
                <a href="#/deals" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">View all →</a>
              </div>
              <div id="deals-container" class="space-y-4">
                <div class="flex items-center justify-center py-12">
                  ${Spinner({ size: 'lg' })}
                </div>
              </div>
            </div>
            
            <!-- Activity Feed (1 col) -->
            <div class="lg:col-span-1">
              <div class="card p-6">
                <h2 class="text-lg font-semibold text-navy-900 dark:text-white mb-4">Activity Feed</h2>
                <div id="activity-feed">
                  <div class="flex items-center justify-center py-8">
                    ${Spinner({ size: 'md' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderMobileNav(user)}
    </div>
  `;

  // Load data in parallel
  Promise.all([
    loadDeals(user.uid),
    loadActivityFeed(user.uid)
  ]);
}

async function loadActivityFeed(userId) {
  try {
    const activities = await getUserActivityFeed(userId, 10);
    const container = document.getElementById('activity-feed');
    if (container) {
      container.innerHTML = renderActivityFeed(activities, 8);
    }
  } catch (error) {
    console.error('Error loading activity feed:', error);
    const container = document.getElementById('activity-feed');
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8 text-navy-500">
          <p class="text-sm">No recent activity</p>
        </div>
      `;
    }
  }
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
      <div class="empty-state card">
        <div class="empty-state-icon">📝</div>
        <h3 class="empty-state-title">No agreements yet</h3>
        <p class="empty-state-description">Create your first agreement or explore the marketplace</p>
        <div class="flex gap-3 justify-center">
          <a href="#/deal/new" class="btn-primary bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition btn-press">
            Create Agreement
          </a>
          <a href="#/templates" class="px-4 py-2 rounded-lg font-semibold border border-navy-200 dark:border-navy-600 text-navy-700 dark:text-white hover:border-emerald-500 transition btn-press">
            Browse Templates
          </a>
        </div>
      </div>
    `;
    return;
  }
  
  // Show max 6 deals on dashboard
  const allDeals = [
    ...groups.needsAction,
    ...groups.active,
    ...groups.pastDue,
    ...groups.frozen
  ].slice(0, 6);
  
  container.innerHTML = `
    ${groups.needsAction.length > 0 ? `
      <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p class="text-sm text-red-700 dark:text-red-300 font-medium">
          ⚠️ ${groups.needsAction.length} agreement${groups.needsAction.length > 1 ? 's need' : ' needs'} your attention
        </p>
      </div>
    ` : ''}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${allDeals.map(deal => renderDealCard(deal, userId)).join('')}
    </div>
    ${deals.length > 6 ? `
      <div class="text-center mt-4">
        <a href="#/deals" class="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
          View all ${deals.length} agreements →
        </a>
      </div>
    ` : ''}
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
