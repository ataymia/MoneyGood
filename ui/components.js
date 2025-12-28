// Reusable UI components

export function Button({ 
  text, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  icon = null,
  fullWidth = false,
  className = '' 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 btn-primary',
    secondary: 'bg-navy-600 hover:bg-navy-700 text-white focus:ring-navy-500',
    outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:ring-emerald-500',
    ghost: 'text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-800 focus:ring-navy-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${disabledClasses} ${className}`;
  
  return `
    <button 
      class="${classes}" 
      ${disabled ? 'disabled' : ''}
      onclick="${onClick}"
    >
      ${icon ? `<span class="mr-2">${icon}</span>` : ''}
      ${text}
    </button>
  `;
}

export function Card({ title, children, className = '', footer = null, status = null }) {
  return `
    <div class="card rounded-lg p-6 ${className}">
      ${title ? `
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-navy-900 dark:text-white">${title}</h3>
          ${status ? `<span class="status-badge status-${status}">${status.replace('_', ' ')}</span>` : ''}
        </div>
      ` : ''}
      <div class="card-content">
        ${children}
      </div>
      ${footer ? `
        <div class="card-footer mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
          ${footer}
        </div>
      ` : ''}
    </div>
  `;
}

export function Input({ 
  id, 
  type = 'text', 
  label, 
  placeholder = '', 
  value = '', 
  required = false,
  min = null,
  max = null,
  step = null,
  className = '' 
}) {
  const attrs = [
    `id="${id}"`,
    `name="${id}"`,
    `type="${type}"`,
    `placeholder="${placeholder}"`,
    `value="${value}"`,
    required ? 'required' : '',
    min !== null ? `min="${min}"` : '',
    max !== null ? `max="${max}"` : '',
    step !== null ? `step="${step}"` : ''
  ].filter(Boolean).join(' ');
  
  return `
    <div class="mb-4 ${className}">
      ${label ? `<label for="${id}" class="block text-sm font-medium mb-2 text-navy-700 dark:text-navy-200">${label}${required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
      <input ${attrs} class="w-full" />
    </div>
  `;
}

export function Select({ id, label, options, value = '', required = false, className = '' }) {
  return `
    <div class="mb-4 ${className}">
      ${label ? `<label for="${id}" class="block text-sm font-medium mb-2 text-navy-700 dark:text-navy-200">${label}${required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
      <select id="${id}" name="${id}" ${required ? 'required' : ''} class="w-full">
        <option value="">Select...</option>
        ${options.map(opt => `
          <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
            ${opt.label}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

export function Textarea({ id, label, placeholder = '', value = '', rows = 4, required = false, className = '' }) {
  return `
    <div class="mb-4 ${className}">
      ${label ? `<label for="${id}" class="block text-sm font-medium mb-2 text-navy-700 dark:text-navy-200">${label}${required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
      <textarea 
        id="${id}" 
        name="${id}" 
        rows="${rows}" 
        placeholder="${placeholder}" 
        ${required ? 'required' : ''}
        class="w-full"
      >${value}</textarea>
    </div>
  `;
}

export function Modal({ id, title, content, onClose }) {
  return `
    <div id="${id}" class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onclick="if(event.target === this) ${onClose}()">
      <div class="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-navy-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        <div class="sticky top-0 bg-white dark:bg-navy-800 border-b border-navy-200 dark:border-navy-700 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-bold text-navy-900 dark:text-white">${title}</h2>
          <button 
            onclick="${onClose}()" 
            class="text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div class="p-6">
          ${content}
        </div>
      </div>
    </div>
  `;
}

export function showModal(title, content) {
  const id = 'modal-' + Date.now();
  const closeModal = () => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('animate-fade-out');
      setTimeout(() => modal.remove(), 300);
    }
  };
  
  window[`closeModal_${id}`] = closeModal;
  
  const modalHTML = Modal({ 
    id, 
    title, 
    content, 
    onClose: `window.closeModal_${id}` 
  });
  
  const container = document.getElementById('modal-container');
  container.insertAdjacentHTML('beforeend', modalHTML);
  
  return closeModal;
}

export function Toast({ message, type = 'info', duration = 3000 }) {
  const id = 'toast-' + Date.now();
  
  const types = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-gold-500 text-white',
    info: 'bg-navy-600 text-white'
  };
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  const toast = `
    <div id="${id}" class="flex items-center gap-3 ${types[type]} px-4 py-3 rounded-lg shadow-lg animate-slide-in">
      <span class="text-xl">${icons[type]}</span>
      <span class="flex-1">${message}</span>
      <button onclick="document.getElementById('${id}').remove()" class="text-xl leading-none hover:opacity-75">×</button>
    </div>
  `;
  
  const container = document.getElementById('toast-container');
  container.insertAdjacentHTML('beforeend', toast);
  
  setTimeout(() => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.remove('animate-slide-in');
      element.classList.add('animate-slide-out');
      setTimeout(() => element.remove(), 300);
    }
  }, duration);
}

export function showToast(message, type = 'info', duration = 3000) {
  Toast({ message, type, duration });
}

export function Spinner({ size = 'md', className = '' } = {}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return `
    <div class="spinner ${sizes[size]} ${className}"></div>
  `;
}

export function ProgressBar({ percent, className = '' }) {
  return `
    <div class="progress-bar ${className}">
      <div class="progress-fill" style="width: ${percent}%"></div>
    </div>
  `;
}

export function Navbar({ user }) {
  return `
    <nav class="glass sticky top-0 z-40 border-b border-navy-200 dark:border-navy-700">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <a href="#/" class="flex items-center gap-2 text-2xl font-bold">
            <span>💰</span>
            <span class="gradient-text">MoneyGood</span>
          </a>
          
          ${user ? `
            <div class="flex items-center gap-4">
              <a href="#/marketplace" class="text-navy-700 dark:text-navy-300 hover:text-emerald-600">Marketplace</a>
              <a href="#/notifications" class="relative text-navy-700 dark:text-navy-300 hover:text-emerald-600">
                <svg class="w-6 h-6" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <span id="notification-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"></span>
              </a>
              <a href="#/app" class="text-navy-700 dark:text-navy-300 hover:text-emerald-600">Dashboard</a>
              <a href="#/settings" class="text-navy-700 dark:text-navy-300 hover:text-emerald-600">Settings</a>
              <button 
                onclick="window.handleLogout()" 
                class="text-navy-700 dark:text-navy-300 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-4">
              <a href="#/marketplace" class="text-navy-700 dark:text-navy-300 hover:text-emerald-600">Marketplace</a>
              <a href="#/login" class="text-navy-700 dark:text-navy-300 hover:text-emerald-600">Login</a>
              <a href="#/signup" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Sign Up</a>
            </div>
          `}
        </div>
      </div>
    </nav>
  `;
}

export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function LoadingSpinner({ size = 'md', className = '' } = {}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return `
    <div class="flex justify-center items-center ${className}">
      <div class="spinner ${sizes[size] || sizes.md}"></div>
    </div>
  `;
}
// Deal Status Timeline Stepper
export function DealStatusTimeline({ currentStatus }) {
  const statuses = [
    { key: 'invited', label: 'Invited', icon: '📬' },
    { key: 'awaiting_funding', label: 'Funding', icon: '💳' },
    { key: 'active', label: 'Active', icon: '✅' },
    { key: 'outcome_proposed', label: 'Proposed', icon: '📝' },
    { key: 'confirmed', label: 'Confirmed', icon: '✓' },
    { key: 'completed', label: 'Complete', icon: '🎉' }
  ];
  
  // Handle special statuses
  if (currentStatus === 'cancelled') {
    return `
      <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
        <span class="text-2xl">🚫</span>
        <p class="text-sm font-semibold text-red-700 dark:text-red-300 mt-2">Agreement Cancelled</p>
      </div>
    `;
  }
  
  if (currentStatus === 'frozen') {
    return `
      <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
        <span class="text-2xl">❄️</span>
        <p class="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-2">Agreement Frozen (Dispute)</p>
      </div>
    `;
  }
  
  // Find current step index
  const currentIndex = statuses.findIndex(s => s.key === currentStatus);
  
  return `
    <div class="mb-6 overflow-x-auto">
      <div class="flex items-center justify-between min-w-max md:min-w-0 gap-2 px-2">
        ${statuses.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          
          let statusClass = '';
          if (isPast) statusClass = 'bg-emerald-600 text-white border-emerald-600';
          else if (isCurrent) statusClass = 'bg-gold-500 text-white border-gold-500 ring-4 ring-gold-200 dark:ring-gold-900';
          else statusClass = 'bg-navy-100 dark:bg-navy-800 text-navy-400 dark:text-navy-500 border-navy-300 dark:border-navy-700';
          
          return `
            <div class="flex flex-col items-center flex-1 relative">
              ${index > 0 ? `
                <div class="absolute top-4 right-1/2 w-full h-0.5 ${isPast ? 'bg-emerald-600' : 'bg-navy-200 dark:bg-navy-700'}" style="transform: translateX(50%);"></div>
              ` : ''}
              <div class="relative z-10 w-10 h-10 rounded-full border-2 ${statusClass} flex items-center justify-center text-lg mb-2 transition-all">
                ${status.icon}
              </div>
              <span class="text-xs font-medium text-navy-700 dark:text-navy-300 text-center whitespace-nowrap">${status.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Skeleton Loaders
export function SkeletonCard({ count = 1 } = {}) {
  return Array(count).fill(0).map(() => `
    <div class="card p-6 animate-pulse">
      <div class="flex items-center justify-between mb-4">
        <div class="h-6 bg-navy-200 dark:bg-navy-700 rounded w-1/3"></div>
        <div class="h-6 bg-navy-200 dark:bg-navy-700 rounded w-20"></div>
      </div>
      <div class="space-y-3">
        <div class="h-4 bg-navy-200 dark:bg-navy-700 rounded w-full"></div>
        <div class="h-4 bg-navy-200 dark:bg-navy-700 rounded w-5/6"></div>
        <div class="h-4 bg-navy-200 dark:bg-navy-700 rounded w-4/6"></div>
      </div>
      <div class="mt-6 flex gap-4">
        <div class="h-10 bg-navy-200 dark:bg-navy-700 rounded w-32"></div>
        <div class="h-10 bg-navy-200 dark:bg-navy-700 rounded w-32"></div>
      </div>
    </div>
  `).join('');
}

export function SkeletonList({ count = 3 } = {}) {
  return Array(count).fill(0).map(() => `
    <div class="card p-4 animate-pulse flex items-center gap-4">
      <div class="w-12 h-12 bg-navy-200 dark:bg-navy-700 rounded-full"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-navy-200 dark:bg-navy-700 rounded w-3/4"></div>
        <div class="h-3 bg-navy-200 dark:bg-navy-700 rounded w-1/2"></div>
      </div>
    </div>
  `).join('');
}

// Funding Checklist Component
export function FundingChecklist({ deal, isCreator, userId }) {
  const items = [];
  
  // Setup fees
  items.push({
    label: 'Setup Fee (You)',
    completed: isCreator ? deal.setupFeePaidA : deal.setupFeePaidB,
    amount: deal.setupFeeAmountCents || 0,
    purpose: 'setup_fee',
    required: true
  });
  
  items.push({
    label: 'Setup Fee (Other Party)',
    completed: isCreator ? deal.setupFeePaidB : deal.setupFeePaidA,
    amount: deal.setupFeeAmountCents || 0,
    purpose: null, // Can't pay for other party
    required: true
  });
  
  // Contribution (if money involved)
  if (deal.moneyAmountCents && deal.moneyAmountCents > 0) {
    const creatorPaysContribution = deal.type?.includes('MONEY') || deal.legA?.kind === 'MONEY';
    
    if (isCreator && creatorPaysContribution) {
      items.push({
        label: 'Your Contribution',
        completed: deal.contributionPaidA,
        amount: deal.moneyAmountCents,
        purpose: 'contribution',
        required: true
      });
    } else if (!isCreator && !creatorPaysContribution) {
      items.push({
        label: 'Your Contribution',
        completed: deal.contributionPaidB,
        amount: deal.moneyAmountCents,
        purpose: 'contribution',
        required: true
      });
    }
  }
  
  // Fairness holds (if goods/services involved)
  if (deal.fairnessHoldAmountCentsA > 0) {
    items.push({
      label: 'Fairness Hold (You)',
      completed: isCreator ? deal.fairnessHoldPaidA : deal.fairnessHoldPaidB,
      amount: isCreator ? deal.fairnessHoldAmountCentsA : deal.fairnessHoldAmountCentsB,
      purpose: 'fairness_hold',
      required: true
    });
  }
  
  const allCompleted = items.every(item => !item.required || item.completed);
  
  return `
    <div class="card p-6">
      <h3 class="font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
        <span>${allCompleted ? '✅' : '📋'}</span>
        <span>Funding Checklist</span>
      </h3>
      
      ${allCompleted ? `
        <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg mb-4">
          <p class="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
            ✓ All payment steps completed
          </p>
        </div>
      ` : ''}
      
      <div class="space-y-3">
        ${items.map(item => `
          <div class="flex items-center justify-between p-3 ${item.completed ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-navy-50 dark:bg-navy-800'} rounded-lg">
            <div class="flex items-center gap-3">
              <div class="text-lg">${item.completed ? '✅' : '⏳'}</div>
              <div>
                <div class="font-medium text-navy-900 dark:text-white text-sm">${item.label}</div>
                <div class="text-xs text-navy-600 dark:text-navy-400">${formatCurrency(item.amount)}</div>
              </div>
            </div>
            ${item.purpose && !item.completed ? `
              <button 
                onclick="window.handlePayment('${deal.id}', '${item.purpose}')" 
                class="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition"
              >
                Pay Now
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      
      <div class="mt-4 p-3 bg-navy-50 dark:bg-navy-800 rounded-lg">
        <p class="text-xs text-navy-600 dark:text-navy-400">
          <strong>Note:</strong> Payments are processed securely by Stripe. Setup fees support platform operations. Fairness holds ensure commitment.
        </p>
      </div>
    </div>
  `;
}

// Confetti Animation (CSS-based)
export function showConfetti() {
  const confettiHTML = `
    <div id="confetti-container" class="fixed inset-0 pointer-events-none z-50">
      ${Array(50).fill(0).map((_, i) => `
        <div class="confetti" style="
          left: ${Math.random() * 100}%;
          animation-delay: ${Math.random() * 3}s;
          background-color: ${['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]};
        "></div>
      `).join('')}
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', confettiHTML);
  
  setTimeout(() => {
    const container = document.getElementById('confetti-container');
    if (container) container.remove();
  }, 5000);
}