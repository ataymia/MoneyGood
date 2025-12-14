import { Navbar, Input, Select, Textarea, ProgressBar, showToast, Spinner } from './components.js';
import { createDeal } from '../api.js';
import { router } from '../router.js';
import { store } from '../store.js';

let currentStep = 1;
const totalSteps = 4;

export async function renderDealWizard() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      <div class="flex-1 overflow-y-auto py-8">
        <div class="container mx-auto px-4">
          <div class="max-w-3xl mx-auto">
            <div class="mb-8">
              <div class="flex items-center gap-4 mb-4">
                <button 
                  onclick="window.location.hash = '/app'" 
                  class="text-navy-600 dark:text-navy-400 hover:text-navy-900 dark:hover:text-white"
                >
                  ← Back
                </button>
              </div>
              <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Create New Deal</h1>
              <p class="text-navy-600 dark:text-navy-400">Set up a secure two-party transaction</p>
            </div>
            
            ${ProgressBar({ percent: (currentStep / totalSteps) * 100, className: 'mb-8' })}
            
            <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-xl p-8">
              <div id="wizard-step"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  renderStep(currentStep);
}

function renderStep(step) {
  const container = document.getElementById('wizard-step');
  
  switch(step) {
    case 1:
      renderStep1(container);
      break;
    case 2:
      renderStep2(container);
      break;
    case 3:
      renderStep3(container);
      break;
    case 4:
      renderStep4(container);
      break;
  }
}

function renderStep1(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 1: Basic Information</h2>
    
    <form id="step-form" class="space-y-4">
      ${Input({ 
        id: 'title', 
        label: 'Deal Title', 
        placeholder: 'e.g., Website Development Project', 
        required: true,
        value: store.getFromSession('dealWizard')?.title || ''
      })}
      
      ${Textarea({ 
        id: 'description', 
        label: 'Description', 
        placeholder: 'Describe what this deal is about...', 
        required: true,
        value: store.getFromSession('dealWizard')?.description || ''
      })}
      
      ${Input({ 
        id: 'participantEmail', 
        type: 'email',
        label: 'Other Party Email', 
        placeholder: 'partner@example.com', 
        required: true,
        value: store.getFromSession('dealWizard')?.participantEmail || ''
      })}
      
      <div class="flex justify-end gap-4 mt-6">
        <button 
          type="submit" 
          class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Next →
        </button>
      </div>
    </form>
  `;
  
  document.getElementById('step-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = store.getFromSession('dealWizard') || {};
    data.title = document.getElementById('title').value;
    data.description = document.getElementById('description').value;
    data.participantEmail = document.getElementById('participantEmail').value;
    store.saveToSession('dealWizard', data);
    currentStep = 2;
    renderStep(2);
  });
}

function renderStep2(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 2: Deal Type</h2>
    
    <form id="step-form" class="space-y-6">
      <div class="space-y-4">
        <label class="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-4">
          What type of exchange is this?
        </label>
        
        <div class="grid grid-cols-1 gap-4">
          ${renderDealTypeOption('CASH_CASH', '💵 Cash ↔ Cash', 'Both parties exchange money')}
          ${renderDealTypeOption('CASH_GOODS', '💵 Cash ↔ Goods/Service', 'One party pays, other delivers goods or services')}
          ${renderDealTypeOption('GOODS_GOODS', '📦 Goods ↔ Goods', 'Both parties exchange goods or services')}
        </div>
      </div>
      
      <div class="flex justify-between gap-4 mt-6">
        <button 
          type="button"
          onclick="currentStep = 1; renderStep(1);"
          class="px-6 py-3 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-700 transition"
        >
          ← Back
        </button>
        <button 
          type="submit" 
          class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Next →
        </button>
      </div>
    </form>
  `;
  
  // Pre-select if exists
  const savedData = store.getFromSession('dealWizard');
  if (savedData?.type) {
    document.querySelector(`input[value="${savedData.type}"]`).checked = true;
  }
  
  document.getElementById('step-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="dealType"]:checked')?.value;
    
    if (!type) {
      showToast('Please select a deal type', 'warning');
      return;
    }
    
    const data = store.getFromSession('dealWizard') || {};
    data.type = type;
    store.saveToSession('dealWizard', data);
    currentStep = 3;
    renderStep(3);
  });
}

function renderDealTypeOption(value, title, description) {
  return `
    <label class="flex items-start gap-4 p-4 border-2 border-navy-200 dark:border-navy-700 rounded-lg cursor-pointer hover:border-emerald-500 transition">
      <input type="radio" name="dealType" value="${value}" class="mt-1">
      <div>
        <div class="font-semibold text-navy-900 dark:text-white">${title}</div>
        <div class="text-sm text-navy-600 dark:text-navy-400">${description}</div>
      </div>
    </label>
  `;
}

function renderStep3(container) {
  const data = store.getFromSession('dealWizard') || {};
  const showGoods = data.type !== 'CASH_CASH';
  
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 3: Deal Terms</h2>
    
    <form id="step-form" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <h3 class="font-bold text-navy-900 dark:text-white">Your Side</h3>
          ${showGoods && data.type !== 'CASH_GOODS' ? `
            ${Textarea({ 
              id: 'goodsA', 
              label: 'What you provide', 
              placeholder: 'Describe goods or services...', 
              rows: 3,
              value: data.goodsA || ''
            })}
            ${Input({ 
              id: 'declaredValueA', 
              type: 'number',
              label: 'Declared Value (cents)', 
              placeholder: '10000',
              min: 0,
              value: data.declaredValueA || ''
            })}
          ` : `
            ${Input({ 
              id: 'moneyAmountCents', 
              type: 'number',
              label: 'Amount (cents)', 
              placeholder: '10000',
              min: 0,
              required: true,
              value: data.moneyAmountCents || ''
            })}
          `}
        </div>
        
        <div class="space-y-4">
          <h3 class="font-bold text-navy-900 dark:text-white">Other Party Side</h3>
          ${showGoods ? `
            ${Textarea({ 
              id: 'goodsB', 
              label: 'What they provide', 
              placeholder: 'Describe goods or services...', 
              rows: 3,
              value: data.goodsB || ''
            })}
            ${Input({ 
              id: 'declaredValueB', 
              type: 'number',
              label: 'Declared Value (cents)', 
              placeholder: '10000',
              min: 0,
              value: data.declaredValueB || ''
            })}
          ` : ''}
        </div>
      </div>
      
      ${showGoods ? `
        <div class="bg-gold-50 dark:bg-gold-900/20 border border-gold-400 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <div class="font-bold text-gold-900 dark:text-gold-300 mb-1">Fairness Hold Required</div>
              <div class="text-sm text-gold-800 dark:text-gold-400">
                Goods/services exchanges require a "Fairness Hold" cash collateral to ensure both parties act in good faith. 
                This will be calculated based on declared values.
              </div>
            </div>
          </div>
        </div>
      ` : ''}
      
      <div class="flex justify-between gap-4 mt-6">
        <button 
          type="button"
          onclick="currentStep = 2; renderStep(2);"
          class="px-6 py-3 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-700 transition"
        >
          ← Back
        </button>
        <button 
          type="submit" 
          class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Next →
        </button>
      </div>
    </form>
  `;
  
  document.getElementById('step-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = store.getFromSession('dealWizard') || {};
    
    if (showGoods && data.type !== 'CASH_GOODS') {
      formData.goodsA = document.getElementById('goodsA').value;
      formData.declaredValueA = parseInt(document.getElementById('declaredValueA').value) || 0;
    } else {
      formData.moneyAmountCents = parseInt(document.getElementById('moneyAmountCents').value) || 0;
    }
    
    if (showGoods) {
      formData.goodsB = document.getElementById('goodsB').value;
      formData.declaredValueB = parseInt(document.getElementById('declaredValueB').value) || 0;
    }
    
    store.saveToSession('dealWizard', formData);
    currentStep = 4;
    renderStep(4);
  });
}

function renderStep4(container) {
  const data = store.getFromSession('dealWizard') || {};
  
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 4: Deal Date & Review</h2>
    
    <form id="step-form" class="space-y-6">
      ${Input({ 
        id: 'dealDate', 
        type: 'datetime-local',
        label: 'Deal Completion Date', 
        required: true,
        value: data.dealDate || ''
      })}
      
      ${Input({ 
        id: 'timezone', 
        label: 'Timezone', 
        placeholder: 'America/New_York',
        value: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      })}
      
      <div class="bg-navy-50 dark:bg-navy-900/50 rounded-lg p-6 space-y-3">
        <h3 class="font-bold text-navy-900 dark:text-white mb-4">Deal Summary</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Title:</span>
            <span class="font-semibold text-navy-900 dark:text-white">${data.title}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Type:</span>
            <span class="font-semibold text-navy-900 dark:text-white">${formatDealType(data.type)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-navy-600 dark:text-navy-400">Other Party:</span>
            <span class="font-semibold text-navy-900 dark:text-white">${data.participantEmail}</span>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between gap-4 mt-6">
        <button 
          type="button"
          onclick="currentStep = 3; renderStep(3);"
          class="px-6 py-3 border-2 border-navy-300 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg font-semibold hover:bg-navy-50 dark:hover:bg-navy-700 transition"
        >
          ← Back
        </button>
        <button 
          type="submit" 
          id="create-deal-btn"
          class="btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Create Deal
        </button>
      </div>
    </form>
  `;
  
  document.getElementById('step-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('create-deal-btn');
    btn.disabled = true;
    btn.innerHTML = `${Spinner({ size: 'sm' })} Creating...`;
    
    try {
      const formData = store.getFromSession('dealWizard') || {};
      formData.dealDate = document.getElementById('dealDate').value;
      formData.timezone = document.getElementById('timezone').value;
      
      const result = await createDeal(formData);
      
      showToast('Deal created successfully!', 'success');
      store.removeFromStorage('dealWizard');
      router.navigate(`/deal/${result.dealId}`);
    } catch (error) {
      console.error('Error creating deal:', error);
      showToast(error.message || 'Failed to create deal', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Deal';
    }
  });
}

function formatDealType(type) {
  const types = {
    'CASH_CASH': 'Cash ↔ Cash',
    'CASH_GOODS': 'Cash ↔ Goods/Service',
    'GOODS_GOODS': 'Goods ↔ Goods'
  };
  return types[type] || type;
}

// Make renderStep available globally for navigation
window.currentStep = currentStep;
window.renderStep = renderStep;
