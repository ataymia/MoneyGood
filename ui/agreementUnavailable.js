/**
 * Agreement Unavailable Component
 * 
 * Displays a consistent UI when an agreement cannot be shown because:
 * - Deal ID not found
 * - Deal cancelled/deleted/inactive
 * - Invite token invalid/expired/revoked  
 * - User lacks access (not a participant)
 */

import { Navbar } from './components.js';
import { store } from '../store.js';
import { router } from '../router.js';

/**
 * Render the "Agreement Unavailable" page
 * 
 * @param {Object} options - Display options
 * @param {string} options.reason - The reason code (not_found, cancelled, expired, no_access)
 * @param {string} [options.title] - Custom title override
 * @param {string} [options.message] - Custom message override
 */
export function renderAgreementUnavailable(options = {}) {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  
  // Default messages based on reason
  const messages = {
    not_found: {
      title: 'This agreement is no longer available',
      message: 'The agreement you\'re looking for doesn\'t exist or has been removed.',
      icon: '🔍',
    },
    cancelled: {
      title: 'Agreement Cancelled',
      message: 'This agreement has been cancelled and is no longer active.',
      icon: '❌',
    },
    expired: {
      title: 'Link Expired',
      message: 'This invite link has expired. Please ask the sender for a new invitation.',
      icon: '⏰',
    },
    invalid_token: {
      title: 'Invalid Link',
      message: 'This invite link is invalid or has already been used.',
      icon: '🔗',
    },
    no_access: {
      title: 'Access Denied',
      message: 'You don\'t have access to this agreement.',
      icon: '🔒',
    },
    deleted: {
      title: 'Agreement Deleted',
      message: 'This agreement has been permanently deleted.',
      icon: '🗑️',
    },
    error: {
      title: 'Something went wrong',
      message: 'We couldn\'t load this agreement. Please try again later.',
      icon: '⚠️',
    },
  };

  const reason = options.reason || 'not_found';
  const config = messages[reason] || messages.not_found;
  const title = options.title || config.title;
  const message = options.message || config.message;
  const icon = config.icon;

  content.innerHTML = `
    <div class="flex flex-col min-h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      
      <div class="flex-1 flex items-center justify-center p-4">
        <div class="max-w-md w-full text-center">
          <!-- Icon -->
          <div class="text-6xl mb-6">${icon}</div>
          
          <!-- Title -->
          <h1 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">
            ${title}
          </h1>
          
          <!-- Message -->
          <p class="text-navy-600 dark:text-navy-400 mb-8">
            ${message}
          </p>
          
          <!-- Explanation (if cancelled) -->
          ${reason === 'cancelled' ? `
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8 text-left">
              <p class="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> If you had already paid, your agreement amount has been refunded. 
                The startup fee is non-refundable.
              </p>
            </div>
          ` : ''}
          
          <!-- Actions -->
          <div class="space-y-3">
            <button 
              onclick="window.router && window.router.navigate('/dashboard')"
              class="w-full py-3 px-6 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Go to Dashboard
            </button>
            
            <button 
              onclick="window.router && window.router.navigate('/deal/new')"
              class="w-full py-3 px-6 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-800 transition"
            >
              Create New Agreement
            </button>
            
            ${!user ? `
              <button 
                onclick="window.router && window.router.navigate('/login')"
                class="w-full py-3 px-6 text-navy-600 dark:text-navy-400 hover:text-navy-800 dark:hover:text-navy-200 font-medium transition"
              >
                Sign In
              </button>
            ` : ''}
          </div>
          
          <!-- Help link -->
          <p class="mt-8 text-sm text-navy-500 dark:text-navy-500">
            Need help? 
            <a href="mailto:support@moneygood.io" class="text-emerald-600 hover:text-emerald-700">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Make router available globally for onclick handlers
  window.router = router;
}

/**
 * Render inline error card (for embedding in existing pages)
 */
export function renderUnavailableCard(options = {}) {
  const reason = options.reason || 'not_found';
  
  const titles = {
    not_found: 'Agreement Not Found',
    cancelled: 'Agreement Cancelled',
    expired: 'Invite Expired',
    invalid_token: 'Invalid Link',
    no_access: 'Access Denied',
    error: 'Error Loading Agreement',
  };
  
  const title = options.title || titles[reason] || titles.not_found;
  const message = options.message || 'This agreement is no longer available.';
  
  return `
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <div class="text-4xl mb-4">⚠️</div>
      <h3 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">${title}</h3>
      <p class="text-sm text-red-600 dark:text-red-400 mb-4">${message}</p>
      <button 
        onclick="window.router && window.router.navigate('/dashboard')"
        class="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition"
      >
        Go to Dashboard
      </button>
    </div>
  `;
}

export default {
  renderAgreementUnavailable,
  renderUnavailableCard,
};
