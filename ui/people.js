// User Connections - Favorites & Recent Partners
import { Navbar, Card, showToast, Spinner, Input } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { 
  collection, query, where, orderBy, getDocs, getDoc, setDoc, updateDoc, doc, serverTimestamp, limit 
} from '../firebaseClient.js';
import { store } from '../store.js';
import { router } from '../router.js';

export async function renderPeople() {
  const { user } = store.getState();
  
  if (!user) {
    router.navigate('/login');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${renderSidebar(user)}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">People</h1>
                <p class="text-navy-600 dark:text-navy-400">Your connections and recent partners</p>
              </div>
            </div>
            
            <!-- Search -->
            <div class="mb-8">
              <div class="relative">
                <input 
                  type="text" 
                  id="people-search" 
                  placeholder="Search by name or email..."
                  class="w-full pl-10 pr-4 py-3 rounded-lg"
                  oninput="window.filterPeople(this.value)"
                />
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">🔍</span>
              </div>
            </div>
            
            <div id="people-container">
              <div class="flex items-center justify-center py-12">
                ${Spinner({ size: 'lg' })}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderMobileNav(user)}
    </div>
  `;
  
  await loadConnections(user.uid);
}

async function loadConnections(userId) {
  try {
    const connectionsRef = collection(window.db, 'users', userId, 'connections');
    const q = query(connectionsRef, orderBy('lastInteractedAt', 'desc'));
    
    const snapshot = await getDocs(q);
    const connections = [];
    snapshot.forEach(doc => connections.push({ id: doc.id, ...doc.data() }));
    
    // Separate favorites and recent
    const favorites = connections.filter(c => c.favorite);
    const recent = connections.filter(c => !c.favorite);
    
    // Store for filtering
    window._allConnections = connections;
    
    renderConnections(favorites, recent);
  } catch (error) {
    console.error('Error loading connections:', error);
    document.getElementById('people-container').innerHTML = `
      <div class="text-center py-12">
        <p class="text-navy-600 dark:text-navy-400">No connections yet. Create agreements to build your network!</p>
      </div>
    `;
  }
}

function renderConnections(favorites, recent) {
  const container = document.getElementById('people-container');
  
  if (favorites.length === 0 && recent.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">👥</div>
        <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-2">No connections yet</h2>
        <p class="text-navy-600 dark:text-navy-400 mb-6">
          Create agreements with others to build your network
        </p>
        <a 
          href="#/deal/new" 
          class="inline-block btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Create Agreement
        </a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    ${favorites.length > 0 ? `
      <div class="mb-8">
        <h2 class="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
          <span>⭐</span> Favorites
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="favorites-list">
          ${favorites.map(person => renderPersonCard(person, true)).join('')}
        </div>
      </div>
    ` : ''}
    
    ${recent.length > 0 ? `
      <div>
        <h2 class="text-xl font-bold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🕐</span> Recent Partners
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="recent-list">
          ${recent.map(person => renderPersonCard(person, false)).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderPersonCard(person, isFavorite) {
  const initials = getInitials(person.displayName || person.email);
  const lastInteracted = person.lastInteractedAt?.seconds 
    ? formatRelativeTime(person.lastInteractedAt)
    : 'Unknown';
  
  return `
    <div class="person-card card p-4 flex items-center gap-4" data-email="${person.email?.toLowerCase() || ''}" data-name="${person.displayName?.toLowerCase() || ''}">
      <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-navy-600 flex items-center justify-center text-white font-bold text-lg">
        ${initials}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-navy-900 dark:text-white truncate">
          ${person.displayName || 'Unknown'}
        </h3>
        <p class="text-sm text-navy-600 dark:text-navy-400 truncate">${person.email || ''}</p>
        <p class="text-xs text-navy-500 mt-1">Last: ${lastInteracted}</p>
      </div>
      <div class="flex items-center gap-2">
        <button 
          onclick="window.toggleFavorite('${person.otherUid}', ${!isFavorite})"
          class="p-2 hover:bg-navy-100 dark:hover:bg-navy-700 rounded-lg transition"
          title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
        >
          ${isFavorite ? '⭐' : '☆'}
        </button>
        <button 
          onclick="window.startAgreementWith('${person.otherUid}', '${person.email}')"
          class="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg transition"
          title="Start agreement"
        >
          ➕
        </button>
      </div>
    </div>
  `;
}

// Filter people
window.filterPeople = (searchTerm) => {
  const term = searchTerm.toLowerCase();
  const cards = document.querySelectorAll('.person-card');
  
  cards.forEach(card => {
    const email = card.dataset.email || '';
    const name = card.dataset.name || '';
    const matches = email.includes(term) || name.includes(term);
    card.style.display = matches ? 'flex' : 'none';
  });
};

// Toggle favorite
window.toggleFavorite = async (otherUid, setFavorite) => {
  const { user } = store.getState();
  if (!user) return;
  
  try {
    const connectionRef = doc(window.db, 'users', user.uid, 'connections', otherUid);
    await updateDoc(connectionRef, {
      favorite: setFavorite,
      updatedAt: serverTimestamp()
    });
    
    showToast(setFavorite ? 'Added to favorites' : 'Removed from favorites', 'success');
    
    // Reload connections
    await loadConnections(user.uid);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showToast('Failed to update', 'error');
  }
};

// Start agreement with person
window.startAgreementWith = (otherUid, email) => {
  store.saveToSession('dealWizard', {
    participantEmail: email
  });
  router.navigate('/deal/new');
};

// Helper to update connection on interaction
export async function updateConnection(currentUserId, otherUserId, otherUserData) {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) return;
  
  try {
    const connectionRef = doc(window.db, 'users', currentUserId, 'connections', otherUserId);
    const existing = await getDoc(connectionRef);
    
    if (existing.exists()) {
      await updateDoc(connectionRef, {
        lastInteractedAt: serverTimestamp(),
        ...(otherUserData.displayName && { displayName: otherUserData.displayName }),
        ...(otherUserData.email && { email: otherUserData.email })
      });
    } else {
      await setDoc(connectionRef, {
        otherUid: otherUserId,
        displayName: otherUserData.displayName || '',
        email: otherUserData.email || '',
        favorite: false,
        lastInteractedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating connection:', error);
  }
}

// Helper functions
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(timestamp) {
  if (!timestamp?.seconds) return 'Unknown';
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString();
}
