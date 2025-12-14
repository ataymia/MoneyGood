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

export function Spinner({ size = 'md', className = '' }) {
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
              <a href="#/notifications" class="relative text-navy-700 dark:text-navy-300 hover:text-emerald-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export function LoadingSpinner({ size = 'md', className = '' }) {
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
