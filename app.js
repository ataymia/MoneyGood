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
router.register('/marketplace', renderMarketplace, false);
router.register('/marketplace/new', renderMarketplaceNew, true);
router.register('/marketplace/:id', renderListingDetail, false);
router.register('/notifications', renderNotifications, true);
router.register('/settings', renderSettings, true);
router.register('/account', renderAccount, true);

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

    <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-navy-50 to-gold-50 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900">
      <!-- Hero Section -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-4xl mx-auto text-center">
          <div class="text-6xl mb-6 animate-bounce-slow">💰</div>
          <h1 class="text-5xl md:text-6xl font-bold mb-6">
            <span class="gradient-text">MoneyGood</span>
          </h1>
          <p class="text-xl md:text-2xl text-navy-700 dark:text-navy-300 mb-8">
            Conditional agreements and commitments with mutual confirmation
          </p>
          <div class="flex gap-4 justify-center flex-wrap">
            <a 
              href="#/deal/new" 
              class="btn-primary bg-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-emerald-700 hover:scale-105 transition-all shadow-glow"
            >
              Create an Agreement
            </a>
            <a 
              href="#/marketplace" 
              class="btn-primary bg-gold-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gold-700 hover:scale-105 transition-all shadow-glow"
            >
              Explore Marketplace
            </a>
          </div>
          <div class="mt-6 flex gap-4 justify-center flex-wrap">
            <a 
              href="#/signup" 
              class="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Sign Up
            </a>
            <span class="text-navy-400">•</span>
            <a 
              href="#/login" 
              class="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Login
            </a>
          </div>
        </div>
      </section>
      
      <!-- Interactive Agreement Types -->
      <section class="container mx-auto px-4 py-12">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-4">
            What can you create?
          </h2>
          <p class="text-center text-navy-600 dark:text-navy-400 mb-12 max-w-2xl mx-auto">
            MoneyGood supports flexible conditional agreements involving money, goods, and services
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="interactive-tile card p-8 text-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div class="text-5xl mb-4">💵</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Money ↔ Money</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                Conditional payment agreements with mutual confirmation
              </p>
            </div>
            
            <div class="interactive-tile card p-8 text-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div class="text-5xl mb-4">💵📦</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Money ↔ Goods/Services</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                One party pays, other provides goods or services upon terms
              </p>
            </div>
            
            <div class="interactive-tile card p-8 text-center cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div class="text-5xl mb-4">📦🤝</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Goods ↔ Goods/Services</h3>
              <p class="text-navy-600 dark:text-navy-400 text-sm">
                Trade goods or services directly with structured terms
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- How It Works Timeline -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12">
            How It Works
          </h2>
          
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-emerald-200 dark:bg-emerald-800 hidden md:block"></div>
            
            <div class="space-y-12">
              <div class="flex items-start gap-6 timeline-step">
                <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-lg">
                  1
                </div>
                <div class="flex-1 card p-6">
                  <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Create or Join</h3>
                  <p class="text-navy-600 dark:text-navy-400">
                    Set up your agreement with clear terms, or browse the marketplace to join existing opportunities
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-6 timeline-step">
                <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-lg">
                  2
                </div>
                <div class="flex-1 card p-6">
                  <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Invite/Accept</h3>
                  <p class="text-navy-600 dark:text-navy-400">
                    Share the invite link or accept an existing agreement. Both parties review terms.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-6 timeline-step">
                <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-lg">
                  3
                </div>
                <div class="flex-1 card p-6">
                  <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Fund (if needed)</h3>
                  <p class="text-navy-600 dark:text-navy-400">
                    Complete required payment steps via Stripe. Setup fees and optional fairness holds.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-6 timeline-step">
                <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-lg">
                  4
                </div>
                <div class="flex-1 card p-6">
                  <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Mutual Confirmation</h3>
                  <p class="text-navy-600 dark:text-navy-400">
                    Both parties confirm fulfillment. Dispute freeze available if needed.
                  </p>
                </div>
              </div>
              
              <div class="flex items-start gap-6 timeline-step">
                <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl z-10 shadow-lg">
                  5
                </div>
                <div class="flex-1 card p-6">
                  <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Complete</h3>
                  <p class="text-navy-600 dark:text-navy-400">
                    Agreement marked complete. Full audit log maintained for transparency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- Safety Rails Section -->
      <section class="container mx-auto px-4 py-12 bg-white dark:bg-navy-800 bg-opacity-50">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-4">
            Safety & Transparency
          </h2>
          <p class="text-center text-navy-600 dark:text-navy-400 mb-12 max-w-2xl mx-auto">
            Every agreement is standalone and independent, with built-in safety features
          </p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center p-6">
              <div class="text-4xl mb-3">📋</div>
              <h3 class="font-bold text-navy-900 dark:text-white mb-2">Audit Log</h3>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                Every action tracked with timestamps
              </p>
            </div>
            
            <div class="text-center p-6">
              <div class="text-4xl mb-3">✅</div>
              <h3 class="font-bold text-navy-900 dark:text-white mb-2">Mutual Confirmation</h3>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                Both parties must agree on outcomes
              </p>
            </div>
            
            <div class="text-center p-6">
              <div class="text-4xl mb-3">❄️</div>
              <h3 class="font-bold text-navy-900 dark:text-white mb-2">Dispute Freeze</h3>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                Pause agreement if issues arise
              </p>
            </div>
            
            <div class="text-center p-6">
              <div class="text-4xl mb-3">🛡️</div>
              <h3 class="font-bold text-navy-900 dark:text-white mb-2">Language Policy</h3>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                Blocked language prevents wagering terms
              </p>
            </div>
          </div>
          
          <div class="mt-8 p-6 bg-emerald-50 dark:bg-navy-900 rounded-lg border-l-4 border-emerald-600">
            <p class="text-sm text-navy-700 dark:text-navy-300">
              <strong>Important:</strong> MoneyGood supports standalone conditional agreements only. 
              Agreements are independent and never paired as opposing positions. 
              Payments are processed securely by Stripe.
            </p>
          </div>
        </div>
      </section>
      
      <!-- Examples Section -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12">
            Example Agreements
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="card p-6 border-l-4 border-emerald-600">
              <div class="text-3xl mb-3">💵</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Conditional Payment</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll pay $100 if X happens" — Clear conditions with mutual confirmation
              </p>
            </div>
            
            <div class="card p-6 border-l-4 border-gold-600">
              <div class="text-3xl mb-3">📦</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Trade Agreement</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll trade my PS5 for a service by Friday" — Goods and services exchange
              </p>
            </div>
            
            <div class="card p-6 border-l-4 border-navy-600">
              <div class="text-3xl mb-3">✅</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Proof-Based</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll pay upon proof of completion" — Evidence-based fulfillment
              </p>
            </div>
            
            <div class="card p-6 border-l-4 border-emerald-600">
              <div class="text-3xl mb-3">🛠️</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Service Agreement</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll provide 5 hours of consulting for $500" — Service for payment
              </p>
            </div>
            
            <div class="card p-6 border-l-4 border-gold-600">
              <div class="text-3xl mb-3">📅</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Time-Based</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll complete project by deadline or refund" — Deadline commitments
              </p>
            </div>
            
            <div class="card p-6 border-l-4 border-navy-600">
              <div class="text-3xl mb-3">🤝</div>
              <h4 class="font-bold text-navy-900 dark:text-white mb-2">Direct Exchange</h4>
              <p class="text-sm text-navy-600 dark:text-navy-400">
                "I'll trade camera gear for laptop" — Direct goods exchange
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- CTA Section -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-4xl mx-auto text-center bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-12 text-white shadow-2xl">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p class="text-xl mb-8 opacity-90">
            Create your first conditional agreement today
          </p>
          <div class="flex gap-4 justify-center flex-wrap">
            <a 
              href="#/signup" 
              class="inline-block bg-white text-emerald-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              Create Free Account
            </a>
            <a 
              href="#/marketplace" 
              class="inline-block bg-emerald-800 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-emerald-900 transition shadow-lg"
            >
              Browse Marketplace
            </a>
          </div>
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="container mx-auto px-4 py-8 text-center text-navy-600 dark:text-navy-400">
        <p>&copy; 2024 MoneyGood. All rights reserved.</p>
        <p class="text-sm mt-2">Conditional agreements platform • Not for wagering or paired outcomes</p>
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
    
    document.getElementById('join-preview').innerHTML = `
      <div class="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
        <div class="text-4xl mb-3">❌</div>
        <p class="font-bold text-red-900 dark:text-red-300 mb-2">Failed to Join</p>
        <p class="text-sm text-red-800 dark:text-red-400 mb-4">${error.message || 'Invalid or expired invitation'}</p>
        <button 
          onclick="window.location.hash = '/app'" 
          class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Go to Dashboard
        </button>
      </div>
    `;
    
    showToast(error.message || 'Failed to join agreement', 'error');
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
