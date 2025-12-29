// Firebase and API imports
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from '../firebaseClient.js';
import { Navbar, Card, formatCurrency, formatDate, showToast, showModal, Spinner, DealStatusTimeline, FundingChecklist, showConfetti } from './components.js';
import { 
  createCheckoutSession, 
  proposeOutcome, 
  confirmOutcome, 
  freezeDeal, 
  requestExtension,
  cancelDeal 
} from '../api.js';
import { store } from '../store.js';
import { containsBlockedLanguage, getBlockedLanguageMessage } from '../blocked-language.js';
import { isStripeReady, showStripeConfigError } from '../stripeClient.js';
import { renderAgreementUnavailable, renderUnavailableCard } from './agreementUnavailable.js';
import { formatCurrency as formatCurrencyFromCents } from '../feeConfig.js';

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
      // Show unavailable page for not found
      renderAgreementUnavailable({ reason: 'not_found' });
      return;
    }
    
    const deal = { id: dealDoc.id, ...dealDoc.data() };
    
    // Check if deal is cancelled
    if (deal.status === 'cancelled') {
      renderAgreementUnavailable({ 
        reason: 'cancelled',
        message: `This agreement was cancelled${deal.cancelledAt ? ' on ' + formatDate(deal.cancelledAt) : ''}.`
      });
      return;
    }
    
    // Check if user has access (is participant)
    const isParticipant = deal.creatorUid === userId || deal.participantUid === userId;
    if (!isParticipant && deal.status !== 'invited') {
      renderAgreementUnavailable({ reason: 'no_access' });
      return;
    }
    
    // Load actions (audit log)
    const actionsRef = collection(window.db, 'deals', dealId, 'actions');
    const actionsQuery = query(actionsRef, orderBy('createdAt', 'desc'));
    const actionsSnapshot = await getDocs(actionsQuery);
    const actions = [];
    actionsSnapshot.forEach(doc => actions.push({ id: doc.id, ...doc.data() }));
    
    // Load chat messages
    const messagesRef = collection(window.db, 'deals', dealId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = [];
    messagesSnapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
    
    renderDealContent(deal, actions, messages, userId);
  } catch (error) {
    console.error('Error loading agreement:', error);
    
    // Check for permission denied
    if (error.code === 'permission-denied') {
      renderAgreementUnavailable({ reason: 'no_access' });
      return;
    }
    
    renderAgreementUnavailable({ 
      reason: 'error',
      message: 'We couldn\'t load this agreement. Please try again later.'
    });
  }
}

function renderDealContent(deal, actions, messages, userId) {
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
      
      ${DealStatusTimeline({ currentStatus: deal.status })}
      
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">${deal.title || 'Untitled Agreement'}</h1>
          <p class="text-navy-600 dark:text-navy-400">${deal.description || ''}</p>
        </div>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="mb-6 border-b border-navy-200 dark:border-navy-700">
      <div class="flex gap-4">
        <button 
          onclick="switchTab('details')" 
          id="tab-details"
          class="tab-button active px-4 py-2 font-semibold border-b-2 border-emerald-600 text-emerald-600"
        >
          Details
        </button>
        <button 
          onclick="switchTab('chat')" 
          id="tab-chat"
          class="tab-button px-4 py-2 font-semibold border-b-2 border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white"
        >
          Chat ${messages.length > 0 ? `<span class="ml-1 text-xs bg-emerald-600 text-white rounded-full px-2">${messages.length}</span>` : ''}
        </button>
        <button 
          onclick="switchTab('activity')" 
          id="tab-activity"
          class="tab-button px-4 py-2 font-semibold border-b-2 border-transparent text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white"
        >
          Activity
        </button>
      </div>
    </div>
    
    <!-- Tab Content -->
    <div id="tab-content-details" class="tab-content">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          ${renderDealInfo(deal, isCreator)}
          ${renderDealActions(deal, isCreator, userId)}
        </div>
        
        <div class="space-y-6">
          ${renderInviteCard(deal, inviteUrl)}
          ${FundingChecklist({ deal, isCreator, userId })}
        </div>
      </div>
    </div>
    
    <div id="tab-content-chat" class="tab-content hidden">
      ${renderChatTab(deal, messages, userId)}
    </div>
    
    <div id="tab-content-activity" class="tab-content hidden">
      ${renderAuditLog(actions)}
    </div>
  `;
  
  // Store deal and messages for handlers
  window.currentDeal = deal;
  window.currentMessages = messages;
  window.currentUserId = userId;
}

function renderDealInfo(deal, isCreator) {
  const dealDate = deal.dealDate?.seconds 
    ? new Date(deal.dealDate.seconds * 1000).toLocaleString()
    : 'Not set';
  
  return Card({ 
    title: 'Agreement Information',
    children: `
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Type:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${formatDealType(deal.type)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Your Role:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${isCreator ? 'Creator (Side A)' : 'Participant (Side B)'}</span>
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
          <span class="text-navy-600 dark:text-navy-400">Date:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${dealDate}</span>
        </div>
        ${deal.moneyAmountCents ? `
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Amount:</span>
            <span class="font-semibold text-emerald-600">${formatCurrency(deal.moneyAmountCents)}</span>
          </div>
        ` : ''}
        ${deal.fairnessHoldAmountCentsA > 0 || deal.fairnessHoldAmountCentsB > 0 ? `
          <div class="mt-3 pt-3 border-t border-navy-200 dark:border-navy-700">
            <div class="font-semibold text-navy-900 dark:text-white mb-2 text-sm">Fairness Holds:</div>
            ${deal.fairnessHoldAmountCentsA > 0 ? `
              <div class="flex justify-between">
                <span class="text-navy-600 dark:text-navy-400">Side A (Creator):</span>
                <span class="font-semibold text-gold-600">${formatCurrency(deal.fairnessHoldAmountCentsA)}</span>
              </div>
            ` : ''}
            ${deal.fairnessHoldAmountCentsB > 0 ? `
              <div class="flex justify-between">
                <span class="text-navy-600 dark:text-navy-400">Side B (Participant):</span>
                <span class="font-semibold text-gold-600">${formatCurrency(deal.fairnessHoldAmountCentsB)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${deal.legA && deal.legB ? `
          <div class="mt-3 pt-3 border-t border-navy-200 dark:border-navy-700">
            <div class="font-semibold text-navy-900 dark:text-white mb-2 text-sm">Leg Details:</div>
            <div class="space-y-2">
              <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs">
                <div class="font-semibold text-emerald-800 dark:text-emerald-300">Side A:</div>
                <div class="text-emerald-700 dark:text-emerald-400">${formatLegSummary(deal.legA)}</div>
              </div>
              <div class="p-2 bg-gold-50 dark:bg-gold-900/20 rounded text-xs">
                <div class="font-semibold text-gold-800 dark:text-gold-300">Side B:</div>
                <div class="text-gold-700 dark:text-gold-400">${formatLegSummary(deal.legB)}</div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div class="mt-4 p-3 bg-navy-50 dark:bg-navy-800 rounded-lg text-xs text-navy-600 dark:text-navy-400">
        <strong>Note:</strong> This is a standalone agreement. Payments processed by Stripe. Both parties must mutually confirm fulfillment.
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
  
  // Cancel button for creator on pre-lock statuses
  if (isCreator && (deal.status === 'invited' || deal.status === 'awaiting_funding')) {
    const hasPaid = deal.setupFeeCents > 0 || deal.creatorPaymentStatus === 'succeeded';
    actions += `
      <button 
        onclick="handleCancelDeal('${deal.id}', ${hasPaid})"
        class="w-full px-4 py-2 mt-3 border-2 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
      >
        Cancel Agreement
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

// Chat Tab
function renderChatTab(deal, messages, userId) {
  return `
    <div class="card p-6">
      <h3 class="font-bold text-navy-900 dark:text-white mb-4">Agreement Chat</h3>
      
      <div id="chat-messages" class="space-y-3 max-h-96 overflow-y-auto mb-4 p-4 bg-navy-50 dark:bg-navy-900 rounded-lg">
        ${messages.length === 0 ? `
          <div class="text-center text-navy-600 dark:text-navy-400 py-8">
            <div class="text-4xl mb-2">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ` : messages.map(msg => renderChatMessage(msg, userId)).join('')}
      </div>
      
      <form id="chat-form" class="flex gap-2">
        <input 
          type="text" 
          id="chat-input" 
          placeholder="Type your message..." 
          class="flex-1"
          required
        />
        <button 
          type="submit" 
          class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold"
        >
          Send
        </button>
      </form>
      
      <div class="mt-3 text-xs text-navy-600 dark:text-navy-400">
        <strong>Note:</strong> Messages are monitored for blocked language. Keep conversations professional and agreement-focused.
      </div>
    </div>
  `;
}

function renderChatMessage(msg, currentUserId) {
  const isOwn = msg.senderUid === currentUserId;
  const timestamp = msg.createdAt?.seconds 
    ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString()
    : 'Just now';
  
  return `
    <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
      <div class="max-w-xs ${isOwn ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-navy-100 dark:bg-navy-800'} rounded-lg p-3">
        <div class="text-xs text-navy-600 dark:text-navy-400 mb-1">${isOwn ? 'You' : 'Other Party'} • ${timestamp}</div>
        <div class="text-sm text-navy-900 dark:text-white whitespace-pre-wrap">${msg.text}</div>
      </div>
    </div>
  `;
}

// Tab Switching
window.switchTab = function(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active', 'border-emerald-600', 'text-emerald-600');
    btn.classList.add('border-transparent', 'text-navy-600', 'dark:text-navy-400');
  });
  
  document.getElementById(`tab-${tabName}`).classList.add('active', 'border-emerald-600', 'text-emerald-600');
  document.getElementById(`tab-${tabName}`).classList.remove('border-transparent', 'text-navy-600', 'dark:text-navy-400');
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');
  
  // Scroll chat to bottom if chat tab
  if (tabName === 'chat') {
    setTimeout(() => {
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }
};

// Chat form handler
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'chat-form') {
    e.preventDefault();
    
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Check for blocked language
    const check = containsBlockedLanguage(text);
    if (check.blocked) {
      showToast(getBlockedLanguageMessage(), 'error', 5000);
      showToast(`Blocked terms: ${check.matches.join(', ')}`, 'warning', 5000);
      return;
    }
    
    try {
      const deal = window.currentDeal;
      const userId = window.currentUserId;
      
      const messagesRef = collection(window.db, 'deals', deal.id, 'messages');
      await addDoc(messagesRef, {
        text,
        senderUid: userId,
        createdAt: serverTimestamp()
      });
      
      input.value = '';
      showToast('Message sent', 'success');
      
      // Reload messages
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    }
  }
});


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
  // Check if Stripe is configured
  if (!isStripeReady()) {
    showStripeConfigError(showToast);
    return;
  }
  
  try {
    showToast('Creating checkout session...', 'info');
    
    // Map frontend purpose to backend expected format
    const purposeMap = {
      'setup_fee': 'SETUP_FEE',
      'contribution': 'CONTRIBUTION',
      'fairness_hold': 'FAIRNESS_HOLD'
    };
    
    const backendPurpose = purposeMap[purpose] || purpose.toUpperCase();
    
    // createCheckoutSession will automatically redirect to Stripe
    await createCheckoutSession(dealId, backendPurpose);
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
    
    // Show confetti on completion
    if (typeof showConfetti === 'function') {
      showConfetti();
    }
    
    setTimeout(() => window.location.reload(), 1000);
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

window.handleCancelDeal = async (dealId, hasPaid) => {
  // Build confirmation message based on payment status
  let message = `<div class="text-left space-y-3">
    <p>Are you sure you want to cancel this agreement?</p>`;
  
  if (hasPaid) {
    message += `
    <div class="bg-gold-50 dark:bg-gold-900/20 border border-gold-400 rounded-lg p-3 text-sm">
      <strong class="text-gold-800 dark:text-gold-300">Refund Policy:</strong>
      <ul class="mt-2 ml-4 list-disc text-gold-700 dark:text-gold-400">
        <li>Your <strong>principal amount</strong> will be refunded</li>
        <li>The <strong>startup fee is non-refundable</strong> (covers processing costs)</li>
      </ul>
    </div>`;
  } else {
    message += `
    <p class="text-sm text-navy-600 dark:text-navy-400">
      No payments have been made yet. This agreement will be cancelled with no charges.
    </p>`;
  }
  
  message += `</div>`;
  
  // Show confirmation modal
  showModal({
    title: 'Cancel Agreement',
    message,
    confirmText: 'Yes, Cancel',
    cancelText: 'Keep Agreement',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: async () => {
      try {
        showToast('Cancelling agreement...', 'info');
        await cancelDeal(dealId);
        showToast('Agreement cancelled successfully', 'success');
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1500);
      } catch (error) {
        showToast(error.message || 'Failed to cancel agreement', 'error');
      }
    }
  });
};
