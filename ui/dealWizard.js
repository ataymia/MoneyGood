import { Navbar, Input, Select, Textarea, ProgressBar, showToast, Spinner } from './components.js';
import { createDeal } from '../api.js';
import { router } from '../router.js';
import { store } from '../store.js';
import { validateDealLanguage, getBlockedLanguageMessage } from '../blocked-language.js';

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
              <h1 class="text-3xl font-bold text-navy-900 dark:text-white mb-2">Create New Agreement</h1>
              <p class="text-navy-600 dark:text-navy-400">Set up a conditional agreement with clear terms</p>
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
        label: 'Agreement Title', 
        placeholder: 'e.g., Website Development Project', 
        required: true,
        value: store.getFromSession('dealWizard')?.title || ''
      })}
      
      ${Textarea({ 
        id: 'description', 
        label: 'Description', 
        placeholder: 'Describe what this agreement is about...', 
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
      
      <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <p class="text-sm text-emerald-800 dark:text-emerald-300">
          <strong>Note:</strong> Avoid wagering or betting language. This platform supports conditional agreements only.
        </p>
      </div>
      
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
    
    // Validate language
    const validation = validateDealLanguage(data);
    if (!validation.valid) {
      showToast(getBlockedLanguageMessage(), 'error', 5000);
      showToast(`Blocked terms: ${validation.errors.join(', ')}`, 'warning', 5000);
      return;
    }
    
    store.saveToSession('dealWizard', data);
    currentStep = 2;
    renderStep(2);
  });
}

function renderStep2(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 2: Agreement Type</h2>
    
    <form id="step-form" class="space-y-6">
      <div class="space-y-4">
        <label class="block text-sm font-medium text-navy-700 dark:text-navy-200 mb-4">
          What type of exchange is this?
        </label>
        
        <div class="grid grid-cols-1 gap-4">
          ${renderDealTypeOption('MONEY_MONEY', '💵 Money ↔ Money', 'Both parties have conditional money commitments')}
          ${renderDealTypeOption('MONEY_GOODS', '💵📦 Money ↔ Goods', 'One party pays, other delivers goods')}
          ${renderDealTypeOption('MONEY_SERVICE', '💵🛠️ Money ↔ Service', 'One party pays, other provides services')}
          ${renderDealTypeOption('GOODS_GOODS', '📦 Goods ↔ Goods', 'Both parties exchange goods')}
          ${renderDealTypeOption('GOODS_SERVICE', '📦🛠️ Goods ↔ Service', 'Exchange goods for services')}
          ${renderDealTypeOption('SERVICE_SERVICE', '🛠️ Service ↔ Service', 'Both parties provide services')}
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
    const radio = document.querySelector(`input[value="${savedData.type}"]`);
    if (radio) radio.checked = true;
  }
  
  document.getElementById('step-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="dealType"]:checked')?.value;
    
    if (!type) {
      showToast('Please select an agreement type', 'warning');
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
    <label class="flex items-start gap-4 p-4 border-2 border-navy-200 dark:border-navy-700 rounded-lg cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition">
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
  
  // Determine leg kinds based on type
  const typeMap = {
    'MONEY_MONEY': { legAKind: 'MONEY', legBKind: 'MONEY' },
    'MONEY_GOODS': { legAKind: 'MONEY', legBKind: 'GOODS' },
    'MONEY_SERVICE': { legAKind: 'MONEY', legBKind: 'SERVICE' },
    'GOODS_GOODS': { legAKind: 'GOODS', legBKind: 'GOODS' },
    'GOODS_SERVICE': { legAKind: 'GOODS', legBKind: 'SERVICE' },
    'SERVICE_SERVICE': { legAKind: 'SERVICE', legBKind: 'SERVICE' },
  };
  
  const kinds = typeMap[data.type] || { legAKind: 'MONEY', legBKind: 'MONEY' };
  
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 3: Agreement Terms</h2>
    
    <form id="step-form" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <h3 class="font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <span>Your Side</span>
            <span class="text-sm font-normal text-navy-600 dark:text-navy-400">(Side A)</span>
          </h3>
          ${renderLegFields('A', kinds.legAKind, data.legA)}
        </div>
        
        <div class="space-y-4">
          <h3 class="font-bold text-navy-900 dark:text-white flex items-center gap-2">
            <span>Other Party</span>
            <span class="text-sm font-normal text-navy-600 dark:text-navy-400">(Side B)</span>
          </h3>
          ${renderLegFields('B', kinds.legBKind, data.legB)}
        </div>
      </div>
      
      <div class="p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800 rounded-lg">
        <div class="flex items-start gap-3">
          <span class="text-2xl">💡</span>
          <div class="text-sm text-gold-800 dark:text-gold-300">
            <strong>Fairness Holds:</strong> For goods/services, a refundable collateral may be required to ensure good faith commitment.
            <br><strong>Standalone Agreement:</strong> This agreement is independent and cannot be linked or paired with opposing positions.
          </div>
        </div>
      </div>
      
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
    
    // Collect leg A data
    formData.legA = {
      kind: kinds.legAKind,
      description: document.getElementById('descriptionA')?.value || '',
      declaredValueCents: parseInt(document.getElementById('declaredValueA')?.value) || undefined,
      moneyAmountCents: parseInt(document.getElementById('moneyAmountA')?.value) || undefined,
    };
    
    // Collect leg B data
    formData.legB = {
      kind: kinds.legBKind,
      description: document.getElementById('descriptionB')?.value || '',
      declaredValueCents: parseInt(document.getElementById('declaredValueB')?.value) || undefined,
      moneyAmountCents: parseInt(document.getElementById('moneyAmountB')?.value) || undefined,
    };
    
    // Validate language in descriptions
    const validation = validateDealLanguage({
      legA: formData.legA,
      legB: formData.legB
    });
    
    if (!validation.valid) {
      showToast(getBlockedLanguageMessage(), 'error', 5000);
      showToast(`Blocked terms: ${validation.errors.join(', ')}`, 'warning', 5000);
      return;
    }
    
    // Set legacy fields for backward compatibility
    if (formData.legA.kind === 'MONEY') {
      formData.moneyAmountCents = formData.legA.moneyAmountCents;
    }
    if (formData.legA.kind !== 'MONEY') {
      formData.goodsA = formData.legA.description;
      formData.declaredValueA = formData.legA.declaredValueCents;
    }
    if (formData.legB.kind !== 'MONEY') {
      formData.goodsB = formData.legB.description;
      formData.declaredValueB = formData.legB.declaredValueCents;
    }
    
    store.saveToSession('dealWizard', formData);
    currentStep = 4;
    renderStep(4);
  });
}

function renderLegFields(side, kind, existingData = {}) {
  const id = side;
  
  if (kind === 'MONEY') {
    return Input({ 
      id: `moneyAmount${id}`, 
      type: 'number',
      label: 'Amount (cents)', 
      placeholder: '10000 (= $100.00)',
      min: 0,
      required: true,
      value: existingData.moneyAmountCents || ''
    });
  }
  
  if (kind === 'GOODS') {
    return `
      ${Textarea({ 
        id: `description${id}`, 
        label: 'Goods Description', 
        placeholder: 'Describe the goods to be provided...', 
        rows: 3,
        required: true,
        value: existingData.description || ''
      })}
      ${Input({ 
        id: `declaredValue${id}`, 
        type: 'number',
        label: 'Declared Value (cents)', 
        placeholder: '10000 (= $100.00)',
        min: 0,
        required: true,
        value: existingData.declaredValueCents || ''
      })}
    `;
  }
  
  if (kind === 'SERVICE') {
    return `
      ${Textarea({ 
        id: `description${id}`, 
        label: 'Service Description', 
        placeholder: 'Describe the service to be provided...', 
        rows: 3,
        required: true,
        value: existingData.description || ''
      })}
      ${Input({ 
        id: `declaredValue${id}`, 
        type: 'number',
        label: 'Declared Value (cents)', 
        placeholder: '10000 (= $100.00)',
        min: 0,
        required: true,
        value: existingData.declaredValueCents || ''
      })}
    `;
  }
  
  return '';
}

function renderStep4(container) {
  const data = store.getFromSession('dealWizard') || {};
  
  container.innerHTML = `
    <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-6">Step 4: Date & Review</h2>
    
    <form id="step-form" class="space-y-6">
      ${Input({ 
        id: 'dealDate', 
        type: 'datetime-local',
        label: 'Agreement Completion Date', 
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
        <h3 class="font-bold text-navy-900 dark:text-white mb-4">Agreement Summary</h3>
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
          ${data.legA ? `
            <div class="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
              <div class="font-semibold mb-2 text-navy-900 dark:text-white">Your Side:</div>
              <div class="text-navy-600 dark:text-navy-400">${formatLegSummary(data.legA)}</div>
            </div>
            <div class="mt-2">
              <div class="font-semibold mb-2 text-navy-900 dark:text-white">Other Party:</div>
              <div class="text-navy-600 dark:text-navy-400">${formatLegSummary(data.legB)}</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
        <p class="text-sm text-emerald-800 dark:text-emerald-300">
          <strong>✓ Ready to create:</strong> This standalone agreement will be sent to the other party for acceptance. 
          Both parties must complete funding steps before the agreement becomes active.
        </p>
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
          Create Agreement
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
      
      showToast('Agreement created successfully!', 'success');
      store.removeFromStorage('dealWizard');
      
      // Show confetti if available
      if (window.showConfetti) {
        window.showConfetti();
      }
      
      router.navigate(`/deal/${result.dealId}`);
    } catch (error) {
      console.error('Error creating agreement:', error);
      showToast(error.message || 'Failed to create agreement', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Agreement';
    }
  });
}

function formatDealType(type) {
  const types = {
    'CASH_CASH': 'Money ↔ Money',
    'CASH_GOODS': 'Money ↔ Goods',
    'GOODS_GOODS': 'Goods ↔ Goods',
    'MONEY_MONEY': 'Money ↔ Money',
    'MONEY_GOODS': 'Money ↔ Goods',
    'MONEY_SERVICE': 'Money ↔ Service',
    'GOODS_GOODS': 'Goods ↔ Goods',
    'GOODS_SERVICE': 'Goods ↔ Service',
    'SERVICE_SERVICE': 'Service ↔ Service',
  };
  return types[type] || type;
}

function formatLegSummary(leg) {
  if (!leg) return '';
  
  if (leg.kind === 'MONEY') {
    return `$${((leg.moneyAmountCents || 0) / 100).toFixed(2)} payment`;
  }
  
  if (leg.kind === 'GOODS') {
    return `${leg.description || 'Goods'} (value: $${((leg.declaredValueCents || 0) / 100).toFixed(2)})`;
  }
  
  if (leg.kind === 'SERVICE') {
    return `${leg.description || 'Service'} (value: $${((leg.declaredValueCents || 0) / 100).toFixed(2)})`;
  }
  
  return '';
}

window.renderStep = renderStep;
