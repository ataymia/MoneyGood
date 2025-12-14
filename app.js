import { auth, db, functions, onAuthStateChanged, signOut } from './firebase.js';
import { router } from './router.js';
import { store } from './store.js';
import { renderLogin, renderSignup } from './ui/auth.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderDealWizard } from './ui/dealWizard.js';
import { renderDealDetail } from './ui/dealDetail.js';
import { renderSettings } from './ui/settings.js';
import { renderNotifications } from './ui/notifications.js';
import { Navbar, showToast } from './ui/components.js';
import { doc, setDoc, serverTimestamp, getDoc } from './firebase.js';
import { acceptInvite } from './api.js';

// Make Firebase instances globally available
window.auth = auth;
window.db = db;
window.firebaseFunctions = functions;
window.store = store;

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
router.register('/deal/new', renderDealWizard, true);
router.register('/deal/:id', renderDealDetail, true);
router.register('/join/:token', renderJoinDeal, false);
router.register('/settings', renderSettings, true);
router.register('/notifications', renderNotifications, true);

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
          <div class="text-6xl mb-6">💰</div>
          <h1 class="text-5xl md:text-6xl font-bold mb-6">
            <span class="gradient-text">MoneyGood</span>
          </h1>
          <p class="text-xl md:text-2xl text-navy-700 dark:text-navy-300 mb-8">
            Secure two-party deals with collateral, payments, and dispute resolution
          </p>
          <div class="flex gap-4 justify-center flex-wrap">
            <a 
              href="#/signup" 
              class="btn-primary bg-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-emerald-700 transition shadow-glow"
            >
              Get Started Free
            </a>
            <a 
              href="#/login" 
              class="px-8 py-4 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-bold text-lg hover:bg-navy-50 dark:hover:bg-navy-800 transition"
            >
              Login
            </a>
          </div>
        </div>
      </section>
      
      <!-- Features Section -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12">
            Why Choose MoneyGood?
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">🔒</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Secure & Trustworthy</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Fairness Hold collateral ensures both parties act in good faith
              </p>
            </div>
            
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">💳</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Stripe Payments</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Secure payments via Stripe with automatic fund transfers
              </p>
            </div>
            
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">⚖️</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Dispute Resolution</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Freeze deals and resolve disputes with transparent audit logs
              </p>
            </div>
            
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">📅</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Deal Deadlines</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Set deal dates with automatic past-due tracking and extensions
              </p>
            </div>
            
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">🔔</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Real-time Updates</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Get notified about deal actions and status changes
              </p>
            </div>
            
            <div class="card text-center p-8">
              <div class="text-4xl mb-4">🎨</div>
              <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-3">Beautiful UI</h3>
              <p class="text-navy-600 dark:text-navy-400">
                Premium design with light/dark themes for the best experience
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <!-- How It Works -->
      <section class="container mx-auto px-4 py-20">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-navy-900 dark:text-white mb-12">
            How It Works
          </h2>
          
          <div class="space-y-8">
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Create a Deal</h3>
                <p class="text-navy-600 dark:text-navy-400">
                  Set up your deal with type (cash, goods, or both), amounts, and completion date
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Invite Partner</h3>
                <p class="text-navy-600 dark:text-navy-400">
                  Share the invite link with the other party to join the deal
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Fund the Deal</h3>
                <p class="text-navy-600 dark:text-navy-400">
                  Both parties pay setup fees and any required Fairness Hold collateral
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                4
              </div>
              <div>
                <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Complete & Confirm</h3>
                <p class="text-navy-600 dark:text-navy-400">
                  When ready, both parties agree on the outcome and funds are released
                </p>
              </div>
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
            Join MoneyGood today and experience secure two-party deals
          </p>
          <a 
            href="#/signup" 
            class="inline-block bg-white text-emerald-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            Create Your Free Account
          </a>
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="container mx-auto px-4 py-8 text-center text-navy-600 dark:text-navy-400">
        <p>&copy; 2024 MoneyGood. All rights reserved.</p>
      </footer>
    </div>
  `;
}

// Join deal page
async function renderJoinDeal(params) {
  const { token } = params;
  const { user } = store.getState();
  
  if (!user) {
    showToast('Please login to join a deal', 'warning');
    router.navigate('/login');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user })}
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 to-navy-50 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div class="text-6xl mb-4">💰</div>
        <h1 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">Joining Deal...</h1>
        <div class="flex justify-center">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;
  
  try {
    const result = await acceptInvite(token);
    showToast('Successfully joined the deal!', 'success');
    router.navigate(`/deal/${result.dealId}`);
  } catch (error) {
    console.error('Error joining deal:', error);
    showToast(error.message || 'Failed to join deal', 'error');
    router.navigate('/app');
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
