import { doc, getDoc, collection, query, orderBy, getDocs } from '../firebase.js';
import { Navbar, Card, formatCurrency, formatDate, showToast, showModal, Spinner } from './components.js';
import { 
  createCheckoutSession, 
  proposeOutcome, 
  confirmOutcome, 
  freezeDeal, 
  requestExtension 
} from '../api.js';
import { store } from '../store.js';

export async function renderDealDetail(params) {
  const { id: dealId } = params;
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      <div class="flex-1 overflow-y-auto py-8">
        <div class="container mx-auto px-4">
          <div id="deal-container" class="max-w-5xl mx-auto">
            <div class="flex items-center justify-center py-12">
              ${Spinner({ size: 'lg' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadDeal(dealId, user.uid);
}

async function loadDeal(dealId, userId) {
  try {
    const dealDoc = await getDoc(doc(window.db, 'deals', dealId));
    
    if (!dealDoc.exists()) {
      showToast('Deal not found', 'error');
      window.location.hash = '/app';
      return;
    }
    
    const deal = { id: dealDoc.id, ...dealDoc.data() };
    
    // Load actions (audit log)
    const actionsRef = collection(window.db, 'deals', dealId, 'actions');
    const actionsQuery = query(actionsRef, orderBy('createdAt', 'desc'));
    const actionsSnapshot = await getDocs(actionsQuery);
    const actions = [];
    actionsSnapshot.forEach(doc => actions.push({ id: doc.id, ...doc.data() }));
    
    renderDealContent(deal, actions, userId);
  } catch (error) {
    console.error('Error loading deal:', error);
    showToast('Failed to load deal', 'error');
  }
}

function renderDealContent(deal, actions, userId) {
  const isCreator = deal.creatorUid === userId;
  const container = document.getElementById('deal-container');
  
  const inviteUrl = `${window.location.origin}#/join/${deal.inviteToken}`;
  
  container.innerHTML = `
    <div class="mb-6">
      <button 
        onclick="window.location.hash = '/app'" 
        class="text-emerald-600 hover:text-emerald-700 font-semibold mb-4"
      >
        ← Back to Dashboard
      </button>
      
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">${deal.title || 'Untitled Deal'}</h1>
          <p class="text-navy-600 dark:text-navy-400">${deal.description || ''}</p>
        </div>
        <span class="status-badge status-${deal.status}">${deal.status.replace('_', ' ')}</span>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        ${renderDealInfo(deal, isCreator)}
        ${renderDealActions(deal, isCreator, userId)}
        ${renderAuditLog(actions)}
      </div>
      
      <div class="space-y-6">
        ${renderInviteCard(deal, inviteUrl)}
        ${renderPaymentStatus(deal)}
      </div>
    </div>
  `;
  
  // Store deal in window for action handlers
  window.currentDeal = deal;
  window.currentUserId = userId;
}

function renderDealInfo(deal, isCreator) {
  const dealDate = deal.dealDate?.seconds 
    ? new Date(deal.dealDate.seconds * 1000).toLocaleString()
    : 'Not set';
  
  return Card({ 
    title: 'Deal Information',
    children: `
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Type:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${formatDealType(deal.type)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Your Role:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${isCreator ? 'Creator' : 'Participant'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Creator:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${deal.creatorEmail}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Participant:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${deal.participantEmail || 'Pending'}</span>
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
        ${deal.fairnessHoldAmount ? `
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Fairness Hold:</span>
            <span class="font-semibold text-gold-600">${formatCurrency(deal.fairnessHoldAmount)}</span>
          </div>
        ` : ''}
      </div>
    `
  });
}

function renderDealActions(deal, isCreator, userId) {
  let actions = '';
  
  if (deal.status === 'awaiting_funding') {
    actions += `
      <button 
        onclick="handlePayment('${deal.id}', 'SETUP_FEE')"
        class="w-full btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition mb-3"
      >
        Pay Setup Fee
      </button>
    `;
  }
  
  if (deal.status === 'active' || deal.status === 'past_due') {
    actions += `
      <div class="grid grid-cols-2 gap-3 mb-3">
        <button 
          onclick="handleProposeOutcome('${deal.id}', 'RELEASE_TO_CREATOR')"
          class="btn-primary bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Release to Creator
        </button>
        <button 
          onclick="handleProposeOutcome('${deal.id}', 'RELEASE_TO_PARTICIPANT')"
          class="btn-primary bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Release to Participant
        </button>
      </div>
      <button 
        onclick="handleProposeOutcome('${deal.id}', 'REFUND_BOTH')"
        class="w-full px-4 py-2 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-700 transition mb-3"
      >
        Refund Both Parties
      </button>
    `;
  }
  
  if (deal.proposedOutcome && !deal.outcomeConfirmed) {
    actions += `
      <div class="bg-gold-50 dark:bg-gold-900/20 border border-gold-400 rounded-lg p-4 mb-3">
        <div class="font-semibold text-gold-900 dark:text-gold-300 mb-2">
          Pending Outcome: ${deal.proposedOutcome}
        </div>
        <button 
          onclick="handleConfirmOutcome('${deal.id}')"
          class="w-full btn-primary bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Confirm Outcome
        </button>
      </div>
    `;
  }
  
  if (deal.status !== 'frozen' && deal.status !== 'completed') {
    actions += `
      <button 
        onclick="handleFreeze('${deal.id}')"
        class="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
      >
        Freeze Deal (Dispute)
      </button>
    `;
  }
  
  if (deal.status === 'past_due') {
    actions += `
      <button 
        onclick="handleRequestExtension('${deal.id}')"
        class="w-full px-4 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition mt-3"
      >
        Request Extension
      </button>
    `;
  }
  
  if (!actions) {
    actions = '<p class="text-center text-navy-600 dark:text-navy-400">No actions available</p>';
  }
  
  return Card({ 
    title: 'Actions',
    children: actions
  });
}

function renderInviteCard(deal, inviteUrl) {
  if (deal.participantUid) {
    return '';
  }
  
  return Card({ 
    title: 'Invite Link',
    children: `
      <p class="text-sm text-navy-600 dark:text-navy-400 mb-3">
        Share this link with the other party to join the deal
      </p>
      <div class="flex gap-2">
        <input 
          type="text" 
          value="${inviteUrl}" 
          readonly 
          class="flex-1 text-sm"
          id="invite-url-input"
        />
        <button 
          onclick="copyInviteLink()"
          class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Copy
        </button>
      </div>
    `
  });
}

function renderPaymentStatus(deal) {
  return Card({ 
    title: 'Payment Status',
    children: `
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Setup Fee:</span>
          <span class="font-semibold ${deal.setupFeeCents ? 'text-emerald-600' : 'text-navy-400'}">
            ${deal.setupFeeCents ? formatCurrency(deal.setupFeeCents) : 'Pending'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Creator Payment:</span>
          <span class="font-semibold ${deal.creatorPaymentStatus === 'succeeded' ? 'text-emerald-600' : 'text-navy-400'}">
            ${deal.creatorPaymentStatus || 'Pending'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Participant Payment:</span>
          <span class="font-semibold ${deal.participantPaymentStatus === 'succeeded' ? 'text-emerald-600' : 'text-navy-400'}">
            ${deal.participantPaymentStatus || 'Pending'}
          </span>
        </div>
      </div>
    `
  });
}

function renderAuditLog(actions) {
  if (actions.length === 0) {
    return '';
  }
  
  return Card({ 
    title: 'Activity Log',
    children: `
      <div class="space-y-3">
        ${actions.map(action => `
          <div class="flex items-start gap-3 pb-3 border-b border-navy-200 dark:border-navy-700 last:border-0">
            <div class="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
            <div class="flex-1">
              <div class="font-semibold text-navy-900 dark:text-white text-sm">${action.type}</div>
              <div class="text-sm text-navy-600 dark:text-navy-400">${action.details || ''}</div>
              <div class="text-xs text-navy-500 dark:text-navy-500 mt-1">
                ${formatDate(new Date(action.createdAt?.seconds * 1000).toISOString())}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `
  });
}

function formatDealType(type) {
  const types = {
    'CASH_CASH': 'Cash ↔ Cash',
    'CASH_GOODS': 'Cash ↔ Goods/Service',
    'GOODS_GOODS': 'Goods ↔ Goods'
  };
  return types[type] || type;
}

// Action handlers (global scope for onclick)
window.copyInviteLink = async () => {
  const input = document.getElementById('invite-url-input');
  const text = input.value;
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Invite link copied!', 'success');
    } else {
      // Fallback for older browsers
      input.select();
      document.execCommand('copy');
      showToast('Invite link copied!', 'success');
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy link. Please copy manually.', 'error');
  }
};

window.handlePayment = async (dealId, purpose) => {
  try {
    showToast('Creating checkout session...', 'info');
    const result = await createCheckoutSession(dealId, purpose);
    window.location.href = result.url;
  } catch (error) {
    showToast(error.message || 'Failed to create checkout session', 'error');
  }
};

window.handleProposeOutcome = async (dealId, outcome) => {
  try {
    await proposeOutcome(dealId, outcome);
    showToast('Outcome proposed successfully', 'success');
    window.location.reload();
  } catch (error) {
    showToast(error.message || 'Failed to propose outcome', 'error');
  }
};

window.handleConfirmOutcome = async (dealId) => {
  try {
    await confirmOutcome(dealId);
    showToast('Outcome confirmed! Processing...', 'success');
    window.location.reload();
  } catch (error) {
    showToast(error.message || 'Failed to confirm outcome', 'error');
  }
};

window.handleFreeze = async (dealId) => {
  const reason = prompt('Please provide a reason for freezing this deal:');
  if (!reason) return;
  
  try {
    await freezeDeal(dealId, reason);
    showToast('Deal frozen successfully', 'success');
    window.location.reload();
  } catch (error) {
    showToast(error.message || 'Failed to freeze deal', 'error');
  }
};

window.handleRequestExtension = async (dealId) => {
  try {
    await requestExtension(dealId, 'standard');
    showToast('Extension requested', 'success');
    window.location.reload();
  } catch (error) {
    showToast(error.message || 'Failed to request extension', 'error');
  }
};
