// Firebase Client - Production mode uses environment variables
// For demo mode, use firebase-mock.js
import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  getFirebaseFunctions, 
  firebaseReady, 
  firebaseError,
  showFirebaseConfigError,
  onAuthStateChanged, 
  signOut,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from './firebaseClient.js';
import { router } from './router.js';
import { store } from './store.js';
import { renderLogin, renderSignup } from './ui/auth.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderDealWizard } from './ui/dealWizard.js';
import { renderDealDetail } from './ui/dealDetail.js';
import { renderSettings } from './ui/settings.js';
import { renderNotifications } from './ui/notifications.js';
import { renderDealsList } from './ui/dealsList.js';
import { renderAccount } from './ui/account.js';
import { renderMarketplace, renderListingDetail } from './ui/marketplace.js';
import { renderMarketplaceNew } from './ui/marketplaceNew.js';
import { renderTemplates } from './ui/templates.js';
import { renderPeople } from './ui/people.js';
import { renderTerms } from './ui/terms.js';
import { Navbar, showToast } from './ui/components.js';
import { acceptInvite } from './api.js';

// Show blocking error UI if Firebase env vars are missing
if (!firebaseReady) {
  showFirebaseConfigError();
  throw new Error(firebaseError || 'Firebase not configured');
}

// Get Firebase instances (will throw if not ready)
const auth = getFirebaseAuth();
const db = getFirebaseDb();
const functions = getFirebaseFunctions();

// Make Firebase instances and state globally available
window.auth = auth;
window.db = db;
window.firebaseFunctions = functions;
window.store = store;
window.firebaseReady = firebaseReady;
window.firebaseError = firebaseError;


// Initialize auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
      store.setState({ user });
      
      // Create/update user document
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            theme: store.state.theme,
            emailNotifications: true,
            pushNotifications: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error creating user document:', error);
      }
    } else {
      store.setState({ user: null });
    }
    
    // Trigger initial route
    router.handleRoute();
  });

// Register routes
router.register('/', renderLanding, false);
router.register('/login', renderLogin, false);
router.register('/signup', renderSignup, false);
router.register('/app', renderDashboard, true);
router.register('/deals', renderDealsList, true);
router.register('/deal/new', renderDealWizard, true);
router.register('/deal/:id', renderDealDetail, true);
router.register('/join/:token', renderJoinDeal, false);
router.register('/marketplace', renderMarketplaceGated, false);
router.register('/marketplace/new', renderMarketplaceNew, true);
router.register('/marketplace/:id', renderListingDetailGated, false);
router.register('/notifications', renderNotifications, true);
router.register('/settings', renderSettings, true);
router.register('/account', renderAccount, true);
router.register('/templates', renderTemplates, false);
router.register('/people', renderPeople, true);
router.register('/terms', renderTerms, false);

// Marketplace auth gating wrapper
function renderMarketplaceGated(params) {
  const { user } = store.getState();
  if (!user) {
    sessionStorage.setItem('returnTo', '/marketplace');
    showToast('Please log in to access the marketplace', 'info');
    router.navigate('/login');
    return;
  }
  return renderMarketplace(params);
}

function renderListingDetailGated(params) {
  const { user } = store.getState();
  if (!user) {
    sessionStorage.setItem('returnTo', `/marketplace/${params.id}`);
    showToast('Please log in to view listing details', 'info');
    router.navigate('/login');
    return;
  }
  return renderListingDetail(params);
}

// Landing page
function renderLanding() {
  const { user } = store.getState();
  
  if (user) {
    router.navigate('/app');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user: null })}

    <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-navy-50 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900 relative overflow-hidden">
      <!-- Animated Background Blobs -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>
      
      <!-- Hero Section -->
      <section class="relative container mx-auto px-4 pt-20 pb-16">
        <div class="max-w-4xl mx-auto text-center">
          <div class="text-7xl mb-6 animate-bounce-slow">💰</div>
          <h1 class="text-5xl md:text-7xl font-bold mb-6">
            <span class="gradient-text">MoneyGood</span>
          </h1>
          <p class="text-xl md:text-2xl text-navy-700 dark:text-navy-300 mb-8 max-w-2xl mx-auto">
            A tool for creating and tracking agreements between people
          </p>
          <div class="flex gap-4 justify-center flex-wrap">
            <a 
              href="#/signup" 
              class="btn-primary bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 hover:scale-105 transition-all shadow-glow"
            >
              Create Agreement
            </a>
            <a 
              href="#/login" 
              onclick="sessionStorage.setItem('returnTo', '/marketplace')"
              class="glass-card px-8 py-4 rounded-xl font-bold text-lg text-navy-700 dark:text-white hover:scale-105 transition-all border border-navy-200 dark:border-navy-600"
            >
              Explore Marketplace
            </a>
          </div>
          <div class="mt-6 flex gap-4 justify-center flex-wrap text-sm">
            <a href="#/login" class="text-emerald-600 hover:text-emerald-700 font-semibold">Login</a>
            <span class="text-navy-400">•</span>
            <a href="#/templates" class="text-emerald-600 hover:text-emerald-700 font-semibold">Browse Templates</a>
          </div>
        </div>
      </section>
      
      <!-- Value Props - Glass Cards -->
      <section class="relative container mx-auto px-4 py-16">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-all duration-300">
              <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">💵</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Money Agreements</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                Conditional payments with clear terms and mutual confirmation
              </p>
            </div>
            
            <div class="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-all duration-300">
              <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">📦</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Goods & Services</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                Exchange items or services with structured accountability
              </p>
            </div>
            
            <div class="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-all duration-300">
              <div class="text-5xl mb-4 group-hover:scale-110 transition-transform">🤝</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Mutual Trust</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                Both parties confirm outcomes with full transparency
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- How It Works - Compact -->
      <section class="relative container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12">
            How It Works
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div class="step-item">
              <div class="w-12 h-12 mx-auto bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg mb-3">1</div>
              <p class="font-semibold text-navy-900 dark:text-white">Create</p>
              <p class="text-xs text-navy-600 dark:text-navy-400">Set terms</p>
            </div>
            <div class="hidden md:flex items-center justify-center text-navy-300">→</div>
            <div class="step-item">
              <div class="w-12 h-12 mx-auto bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg mb-3">2</div>
              <p class="font-semibold text-navy-900 dark:text-white">Invite</p>
              <p class="text-xs text-navy-600 dark:text-navy-400">Share link</p>
            </div>
            <div class="hidden md:flex items-center justify-center text-navy-300">→</div>
            <div class="step-item">
              <div class="w-12 h-12 mx-auto bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg mb-3">3</div>
              <p class="font-semibold text-navy-900 dark:text-white">Fund</p>
              <p class="text-xs text-navy-600 dark:text-navy-400">If needed</p>
            </div>
            <div class="hidden md:flex items-center justify-center text-navy-300">→</div>
            <div class="step-item">
              <div class="w-12 h-12 mx-auto bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg mb-3">4</div>
              <p class="font-semibold text-navy-900 dark:text-white">Confirm</p>
              <p class="text-xs text-navy-600 dark:text-navy-400">Both agree</p>
            </div>
            <div class="hidden md:flex items-center justify-center text-navy-300">→</div>
            <div class="step-item">
              <div class="w-12 h-12 mx-auto bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg mb-3">5</div>
              <p class="font-semibold text-navy-900 dark:text-white">Complete</p>
              <p class="text-xs text-navy-600 dark:text-navy-400">Done!</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Features Grid -->
      <section class="relative container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div class="p-4">
              <div class="text-3xl mb-2">📋</div>
              <p class="font-semibold text-navy-900 dark:text-white text-sm">Audit Log</p>
            </div>
            <div class="p-4">
              <div class="text-3xl mb-2">✅</div>
              <p class="font-semibold text-navy-900 dark:text-white text-sm">Mutual Confirm</p>
            </div>
            <div class="p-4">
              <div class="text-3xl mb-2">❄️</div>
              <p class="font-semibold text-navy-900 dark:text-white text-sm">Dispute Freeze</p>
            </div>
            <div class="p-4">
              <div class="text-3xl mb-2">💳</div>
              <p class="font-semibold text-navy-900 dark:text-white text-sm">Stripe Payments</p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- CTA Section -->
      <section class="relative container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 border border-emerald-200 dark:border-emerald-800">
          <h2 class="text-3xl md:text-4xl font-bold mb-4 text-navy-900 dark:text-white">
            Ready to Get Started?
          </h2>
          <p class="text-lg mb-8 text-navy-600 dark:text-navy-400">
            Create your first agreement in minutes
          </p>
          <div class="flex gap-4 justify-center flex-wrap">
            <a 
              href="#/signup" 
              class="btn-primary bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 hover:scale-105 transition-all shadow-glow"
            >
              Get Started Free
            </a>
            <a 
              href="#/templates" 
              class="px-8 py-4 rounded-xl font-bold text-lg text-navy-700 dark:text-white border-2 border-navy-200 dark:border-navy-600 hover:border-emerald-500 hover:scale-105 transition-all"
            >
              Browse Templates
            </a>
          </div>
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="relative container mx-auto px-4 py-8 text-center text-navy-600 dark:text-navy-400">
        <div class="flex justify-center gap-6 mb-4 text-sm">
          <a href="#/templates" class="hover:text-emerald-600 transition">Templates</a>
          <a href="#/terms" class="hover:text-emerald-600 transition">Terms & Policy</a>
        </div>
        <p class="text-sm">&copy; ${new Date().getFullYear()} MoneyGood. All rights reserved.</p>
        <p class="text-xs mt-2 text-navy-500">Use responsibly. See <a href="#/terms" class="underline hover:text-emerald-600">Terms</a>.</p>
      </footer>
    </div>
  `;
}

// Join deal page
async function renderJoinDeal(params) {
  const { token } = params;
  const { user } = store.getState();
  
  if (!user) {
    // Save intended destination
    sessionStorage.setItem('joinToken', token);
    showToast('Please login to join this agreement', 'warning');
    router.navigate('/login');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user })}
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 to-navy-50 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div class="text-center">
          <div class="text-6xl mb-4 animate-bounce-slow">🤝</div>
          <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Join Agreement</h1>
          <p class="text-navy-600 dark:text-navy-400 mb-6">Reviewing invitation details...</p>
          <div class="flex justify-center">
            ${Spinner({ size: 'lg' })}
          </div>
        </div>
        
        <div id="join-preview" class="mt-6"></div>
      </div>
    </div>
  `;
  
  try {
    // TODO: In real implementation, fetch deal preview by token first
    // For now, just accept the invite
    const result = await acceptInvite(token);
    
    // Show success state
    document.getElementById('join-preview').innerHTML = `
      <div class="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
        <div class="text-4xl mb-3">✅</div>
        <p class="font-bold text-emerald-900 dark:text-emerald-300 mb-2">Successfully Joined!</p>
        <p class="text-sm text-emerald-800 dark:text-emerald-400">Redirecting to agreement details...</p>
      </div>
    `;
    
    showToast('Successfully joined the agreement!', 'success');
    setTimeout(() => {
      router.navigate(`/deal/${result.dealId}`);
    }, 1500);
  } catch (error) {
    console.error('Error joining agreement:', error);
    
    // Determine error reason
    let reason = 'invalid_token';
    let message = 'This invite link is invalid or has already been used.';
    
    if (error.message?.includes('expired')) {
      reason = 'expired';
      message = 'This invite link has expired. Please ask the sender for a new invitation.';
    } else if (error.message?.includes('already')) {
      message = 'This invitation has already been accepted.';
    } else if (error.message?.includes('own')) {
      message = 'You cannot join your own agreement.';
    }
    
    document.getElementById('join-preview').innerHTML = `
      <div class="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
        <div class="text-4xl mb-3">🔗</div>
        <p class="font-bold text-red-900 dark:text-red-300 mb-2">Unable to Join Agreement</p>
        <p class="text-sm text-red-800 dark:text-red-400 mb-4">${message}</p>
        <div class="space-y-2">
          <button 
            onclick="window.location.hash = '/dashboard'" 
            class="block w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go to Dashboard
          </button>
          <button 
            onclick="window.location.hash = '/deal/new'" 
            class="block w-full px-4 py-2 border border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-800"
          >
            Create New Agreement
          </button>
        </div>
      </div>
    `;
    
    showToast(message, 'error');
  }
}

// Notifications page handled by ui/notifications.js

// Global logout handler
window.handleLogout = async () => {
  try {
    await signOut(auth);
    showToast('Logged out successfully', 'success');
    router.navigate('/');
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Failed to logout', 'error');
  }
};

// Initialize app
console.log('MoneyGood app initialized');
