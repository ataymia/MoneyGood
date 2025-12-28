import { Navbar, Input, Textarea, showToast, Spinner } from './components.js';
import { addDoc, collection, serverTimestamp } from '../firebaseClient.js';
import { store } from '../store.js';
import { router } from '../router.js';
import { validateDealLanguage, getBlockedLanguageMessage } from '../blocked-language.js';

export async function renderMarketplaceNew() {
  const { user } = store.getState();
  
  if (!user) {
    showToast('Please login to create a listing', 'warning');
    router.navigate('/login');
    return;
  }
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      <div class="flex-1 overflow-y-auto py-8">
        <div class="container mx-auto px-4">
          <div class="max-w-3xl mx-auto">
            <div class="mb-8">
              <button 
                onclick="window.location.hash = '/marketplace'" 
                class="text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white mb-4"
              >
                ← Back to Marketplace
              </button>
              <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Create Marketplace Listing</h1>
              <p class="text-navy-600 dark:text-navy-400">Post your agreement for others to join</p>
            </div>
            
            <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-8">
              <form id="listing-form" class="space-y-6">
                ${Input({ 
                  id: 'title', 
                  label: 'Listing Title', 
                  placeholder: 'e.g., Website Development Agreement', 
                  required: true
                })}
                
                ${Textarea({ 
                  id: 'description', 
                  label: 'Description', 
                  placeholder: 'Describe what this agreement is about...', 
                  rows: 6,
                  required: true
                })}
                
                <div>
                  <label class="block text-sm font-medium mb-2 text-navy-700 dark:text-navy-200">
                    Agreement Type <span class="text-red-500">*</span>
                  </label>
                  <select id="type" name="type" required class="w-full">
                    <option value="">Select type...</option>
                    <option value="MONEY_MONEY">💵 Money ↔ Money</option>
                    <option value="MONEY_GOODS">💵📦 Money ↔ Goods</option>
                    <option value="MONEY_SERVICE">💵🛠️ Money ↔ Service</option>
                    <option value="GOODS_GOODS">📦 Goods ↔ Goods</option>
                    <option value="GOODS_SERVICE">📦🛠️ Goods ↔ Service</option>
                    <option value="SERVICE_SERVICE">🛠️ Service ↔ Service</option>
                  </select>
                </div>
                
                ${Input({ 
                  id: 'tags', 
                  label: 'Tags (comma-separated)', 
                  placeholder: 'e.g., web-dev, freelance, design'
                })}
                
                <div class="p-4 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-200 dark:border-gold-800">
                  <p class="text-sm text-gold-800 dark:text-gold-300">
                    <strong>Note:</strong> After posting, others can "join" your listing to create an agreement with you. 
                    You can configure specific terms after someone joins.
                  </p>
                </div>
                
                <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p class="text-sm text-emerald-800 dark:text-emerald-300">
                    <strong>Safety Reminder:</strong> Avoid wagering or betting language. This platform supports conditional agreements only.
                  </p>
                </div>
                
                <div class="flex justify-end gap-4">
                  <button 
                    type="button"
                    onclick="window.location.hash = '/marketplace'"
                    class="px-6 py-3 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-700 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    id="create-listing-btn"
                    class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                  >
                    Post Listing
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('listing-form').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const btn = document.getElementById('create-listing-btn');
  btn.disabled = true;
  btn.innerHTML = `${Spinner({ size: 'sm' })} Posting...`;
  
  try {
    const { user } = store.getState();
    
    const formData = {
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      type: document.getElementById('type').value,
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
    };
    
    // Validate language
    const validation = validateDealLanguage(formData);
    if (!validation.valid) {
      showToast(getBlockedLanguageMessage(), 'error', 5000);
      showToast(`Blocked terms: ${validation.errors.join(', ')}`, 'warning', 5000);
      btn.disabled = false;
      btn.textContent = 'Post Listing';
      return;
    }
    
    // Create listing in Firestore
    const listingsRef = collection(window.db, 'listings');
    const listing = {
      ...formData,
      status: 'open',
      createdByUid: user.uid,
      createdByEmail: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(listingsRef, listing);
    
    showToast('Listing posted successfully!', 'success');
    router.navigate(`/marketplace/${docRef.id}`);
  } catch (error) {
    console.error('Error creating listing:', error);
    showToast(error.message || 'Failed to create listing', 'error');
    btn.disabled = false;
    btn.textContent = 'Post Listing';
  }
}
