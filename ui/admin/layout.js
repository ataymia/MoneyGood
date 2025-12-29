/**
 * Admin Layout
 * 
 * Main layout component for the admin portal with sidebar navigation.
 */

import { store } from '../../store.js';
import { showToast } from '../components.js';

// Admin navigation items
const adminNavItems = [
  { id: 'overview', label: 'Overview', icon: '📊', path: '/admin' },
  { id: 'users', label: 'Users', icon: '👥', path: '/admin/users' },
  { id: 'agreements', label: 'Agreements', icon: '📝', path: '/admin/agreements' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪', path: '/admin/marketplace' },
  { id: 'payments', label: 'Payments', icon: '💳', path: '/admin/payments' },
  { id: 'support', label: 'Support Inbox', icon: '📬', path: '/admin/support' },
  { id: 'cases', label: 'Cases', icon: '🔍', path: '/admin/cases' },
  { id: 'moderation', label: 'Moderation', icon: '🛡️', path: '/admin/moderation' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/admin/notifications' },
  { id: 'templates', label: 'Templates', icon: '📋', path: '/admin/templates' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  { id: 'audit', label: 'Audit Log', icon: '📜', path: '/admin/audit' },
];

export function AdminLayout({ activeSection = 'overview', children = '' }) {
  const { user } = store.getState();
  
  const navItemsHtml = adminNavItems.map(item => {
    const isActive = item.id === activeSection;
    return `
      <a 
        href="#${item.path}"
        class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
          isActive 
            ? 'bg-emerald-600 text-white' 
            : 'text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-700'
        }"
      >
        <span class="text-lg">${item.icon}</span>
        <span class="font-medium">${item.label}</span>
      </a>
    `;
  }).join('');
  
  return `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      <!-- Sidebar -->
      <aside class="w-64 bg-white dark:bg-navy-800 border-r border-navy-200 dark:border-navy-700 flex flex-col">
        <!-- Logo -->
        <div class="p-4 border-b border-navy-200 dark:border-navy-700">
          <a href="#/" class="flex items-center gap-2">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <div class="font-bold text-navy-900 dark:text-white">MoneyGood</div>
              <div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Admin Console</div>
            </div>
          </a>
        </div>
        
        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          ${navItemsHtml}
        </nav>
        
        <!-- User Info -->
        <div class="p-4 border-t border-navy-200 dark:border-navy-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">
                ${user?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-navy-900 dark:text-white truncate">
                ${user?.displayName || user?.email || 'Admin'}
              </div>
              <div class="text-xs text-emerald-600 dark:text-emerald-400">Administrator</div>
            </div>
            <a 
              href="#/dashboard"
              class="p-2 text-navy-400 hover:text-navy-600 dark:hover:text-navy-300 transition"
              title="Exit Admin"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </a>
          </div>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <!-- Top Bar -->
        <header class="sticky top-0 z-10 bg-white dark:bg-navy-800 border-b border-navy-200 dark:border-navy-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold text-navy-900 dark:text-white capitalize">
              ${activeSection === 'overview' ? 'Dashboard Overview' : activeSection}
            </h1>
            <div class="flex items-center gap-4">
              <button 
                onclick="toggleDarkMode()"
                class="p-2 rounded-lg text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700 transition"
                title="Toggle Theme"
              >
                <svg class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
                <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </button>
              <a 
                href="#/dashboard"
                class="px-4 py-2 bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-200 dark:hover:bg-navy-600 transition font-medium"
              >
                Exit to App →
              </a>
            </div>
          </div>
        </header>
        
        <!-- Page Content -->
        <div class="p-6">
          <div id="admin-content">
            ${children}
          </div>
        </div>
      </main>
    </div>
  `;
}

/**
 * Admin Route Guard
 * 
 * Checks if user has admin access, shows unauthorized page if not.
 */
export function checkAdminAccess() {
  const { user } = store.getState();
  
  if (!user) {
    window.location.hash = '#/login';
    return false;
  }
  
  // Check for admin custom claim
  // The claim is available after sign-in via getIdTokenResult
  const isAdmin = user.isAdmin || window.isAdminUser;
  
  if (!isAdmin) {
    return false;
  }
  
  return true;
}

/**
 * Render unauthorized page for non-admins
 */
export function renderUnauthorized() {
  const content = document.getElementById('content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div class="text-center max-w-md">
        <div class="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white mb-4">Access Denied</h1>
        <p class="text-navy-300 mb-8">
          You don't have permission to access the admin area.
        </p>
        <a 
          href="#/dashboard"
          class="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  `;
}

/**
 * Initialize admin access check
 * 
 * Fetches user's ID token to check for admin claim
 */
export async function initAdminAccess() {
  const { user } = store.getState();
  
  if (!user) {
    window.isAdminUser = false;
    return false;
  }
  
  try {
    // Get fresh ID token with claims
    const auth = window.auth;
    if (auth?.currentUser) {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      window.isAdminUser = tokenResult.claims.admin === true;
      return window.isAdminUser;
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
  }
  
  window.isAdminUser = false;
  return false;
}

// Dark mode toggle (for admin area)
window.toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
};

// Initialize dark mode from localStorage
if (typeof window !== 'undefined') {
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode === 'true' || (!savedDarkMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}
