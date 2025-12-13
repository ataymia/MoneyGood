import { doc, getDoc, setDoc, updateDoc } from '../firebase.js';
import { Navbar, Card, Select, showToast } from './components.js';
import { setupStripeConnect } from '../api.js';
import { store } from '../store.js';

export async function renderSettings() {
  const { user, theme } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user })}
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 to-navy-50 dark:from-navy-900 dark:to-navy-800 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto">
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Settings</h1>
            <p class="text-navy-600 dark:text-navy-400">Manage your account preferences</p>
          </div>
          
          <div class="space-y-6">
            ${renderThemeSettings(theme)}
            ${renderStripeSettings(user)}
            ${renderNotificationSettings(user)}
            ${renderAccountInfo(user)}
          </div>
        </div>
      </div>
    </div>
  `;
  
  setupEventListeners();
  loadUserSettings(user.uid);
}

function renderThemeSettings(currentTheme) {
  return Card({ 
    title: 'Appearance',
    children: `
      <div class="space-y-4">
        <div>
          <label for="theme-select" class="block text-sm font-medium mb-2 text-navy-700 dark:text-navy-200">
            Theme
          </label>
          <select 
            id="theme-select" 
            class="w-full"
            onchange="handleThemeChange(this.value)"
          >
            <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="system" ${currentTheme === 'system' ? 'selected' : ''}>System</option>
          </select>
        </div>
        
        <div class="grid grid-cols-3 gap-4 mt-4">
          <div class="text-center p-4 bg-white dark:bg-navy-800 rounded-lg border-2 border-navy-200 dark:border-navy-700">
            <div class="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full"></div>
            <div class="text-xs font-semibold text-navy-900 dark:text-white">Primary</div>
          </div>
          <div class="text-center p-4 bg-white dark:bg-navy-800 rounded-lg border-2 border-navy-200 dark:border-navy-700">
            <div class="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-navy-600 to-navy-800 rounded-full"></div>
            <div class="text-xs font-semibold text-navy-900 dark:text-white">Secondary</div>
          </div>
          <div class="text-center p-4 bg-white dark:bg-navy-800 rounded-lg border-2 border-navy-200 dark:border-navy-700">
            <div class="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full"></div>
            <div class="text-xs font-semibold text-navy-900 dark:text-white">Accent</div>
          </div>
        </div>
      </div>
    `
  });
}

function renderStripeSettings(user) {
  return Card({ 
    title: 'Payment Settings',
    children: `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-navy-900 dark:text-white">Stripe Connect</div>
            <div class="text-sm text-navy-600 dark:text-navy-400">
              Set up your payout account to receive funds
            </div>
          </div>
          <div id="stripe-connect-status">
            <span class="text-sm text-navy-500">Loading...</span>
          </div>
        </div>
        
        <button 
          id="stripe-connect-btn"
          onclick="handleStripeConnect()"
          class="w-full btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Set Up Payouts
        </button>
        
        <div class="bg-navy-50 dark:bg-navy-900/50 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <span class="text-xl">ℹ️</span>
            <div class="text-sm text-navy-700 dark:text-navy-300">
              <strong>Why do I need this?</strong><br>
              Stripe Connect allows you to receive payouts when deals are completed in your favor. 
              This is required to participate in deals where you may receive funds.
            </div>
          </div>
        </div>
      </div>
    `
  });
}

function renderNotificationSettings(user) {
  return Card({ 
    title: 'Notifications',
    children: `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-navy-900 dark:text-white">Email Notifications</div>
            <div class="text-sm text-navy-600 dark:text-navy-400">
              Receive updates about your deals via email
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="email-notifications" 
              class="sr-only peer"
              onchange="handleNotificationToggle('email', this.checked)"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <div class="font-semibold text-navy-900 dark:text-white">Push Notifications</div>
            <div class="text-sm text-navy-600 dark:text-navy-400">
              Get real-time updates in your browser
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="push-notifications" 
              class="sr-only peer"
              onchange="handleNotificationToggle('push', this.checked)"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>
    `
  });
}

function renderAccountInfo(user) {
  return Card({ 
    title: 'Account Information',
    children: `
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Email:</span>
          <span class="font-semibold text-navy-900 dark:text-white">${user.email}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">User ID:</span>
          <span class="font-mono text-sm text-navy-900 dark:text-white">${user.uid}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600 dark:text-navy-400">Member Since:</span>
          <span class="text-navy-900 dark:text-white">${new Date(user.metadata.creationTime).toLocaleDateString()}</span>
        </div>
      </div>
    `
  });
}

async function loadUserSettings(userId) {
  try {
    const userDoc = await getDoc(doc(window.db, 'users', userId));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // Update notification toggles
      if (data.emailNotifications !== undefined) {
        document.getElementById('email-notifications').checked = data.emailNotifications;
      }
      if (data.pushNotifications !== undefined) {
        document.getElementById('push-notifications').checked = data.pushNotifications;
      }
      
      // Update Stripe status
      const statusEl = document.getElementById('stripe-connect-status');
      const btnEl = document.getElementById('stripe-connect-btn');
      
      if (data.stripeConnectAccountId) {
        statusEl.innerHTML = '<span class="text-sm text-emerald-600 font-semibold">✓ Connected</span>';
        btnEl.textContent = 'Manage Payout Account';
      } else {
        statusEl.innerHTML = '<span class="text-sm text-red-600 font-semibold">Not Connected</span>';
      }
    }
  } catch (error) {
    console.error('Error loading user settings:', error);
  }
}

function setupEventListeners() {
  // Theme change is handled inline
}

// Global handlers
window.handleThemeChange = async (theme) => {
  store.setTheme(theme);
  showToast(`Theme changed to ${theme}`, 'success');
  
  // Save to Firestore
  const { user } = store.getState();
  try {
    await updateDoc(doc(window.db, 'users', user.uid), {
      theme,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};

window.handleStripeConnect = async () => {
  try {
    showToast('Setting up Stripe Connect...', 'info');
    const result = await setupStripeConnect();
    window.location.href = result.url;
  } catch (error) {
    console.error('Error setting up Stripe:', error);
    showToast(error.message || 'Failed to set up Stripe Connect', 'error');
  }
};

window.handleNotificationToggle = async (type, enabled) => {
  const { user } = store.getState();
  
  try {
    const field = type === 'email' ? 'emailNotifications' : 'pushNotifications';
    await updateDoc(doc(window.db, 'users', user.uid), {
      [field]: enabled,
      updatedAt: new Date()
    });
    
    showToast(`${type} notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    console.error('Error updating notification settings:', error);
    showToast('Failed to update settings', 'error');
  }
};
