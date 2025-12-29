// Agreement Templates System
import { Navbar, Card, showToast } from './components.js';
import { renderSidebar, renderMobileNav } from './navigation.js';
import { store } from '../store.js';
import { router } from '../router.js';

// Template definitions
export const AGREEMENT_TEMPLATES = [
  {
    id: 'rent-split',
    name: 'Rent Split',
    icon: '🏠',
    category: 'financial',
    description: 'Share rent or housing costs with roommates',
    fields: ['amount', 'dueDate', 'frequency'],
    defaultTitle: 'Monthly Rent Split',
    defaultDescription: 'Agreeing to split rent costs equally. Payment due by the 1st of each month.',
    suggestedTerms: {
      type: 'MONEY_MONEY',
      legA: { kind: 'MONEY', description: 'My share of rent' },
      legB: { kind: 'MONEY', description: 'Their share of rent' }
    }
  },
  {
    id: 'service-completion',
    name: 'Service Completion',
    icon: '🛠️',
    category: 'services',
    description: 'Payment upon completion of a service or project',
    fields: ['serviceDescription', 'deliverables', 'deadline', 'payment'],
    defaultTitle: 'Service Agreement',
    defaultDescription: 'Payment will be released upon satisfactory completion of the agreed service and deliverables.',
    suggestedTerms: {
      type: 'MONEY_SERVICE',
      legA: { kind: 'MONEY', description: 'Payment for services' },
      legB: { kind: 'SERVICE', description: 'Professional services as agreed' }
    }
  },
  {
    id: 'payment-plan',
    name: 'Payment Plan',
    icon: '📅',
    category: 'financial',
    description: 'Structured payment schedule over time',
    fields: ['totalAmount', 'installments', 'schedule'],
    defaultTitle: 'Payment Plan Agreement',
    defaultDescription: 'Structured payment agreement with scheduled installments until the total is paid.',
    suggestedTerms: {
      type: 'MONEY_MONEY',
      legA: { kind: 'MONEY', description: 'Scheduled payment installment' },
      legB: { kind: 'MONEY', description: 'Acknowledgment of payment received' }
    }
  },
  {
    id: 'loan-payback',
    name: 'Loan Payback',
    icon: '💵',
    category: 'financial',
    description: 'Personal loan with repayment terms',
    fields: ['principal', 'interest', 'repaymentDate'],
    defaultTitle: 'Loan Repayment Agreement',
    defaultDescription: 'Agreement to repay the borrowed amount by the specified date with agreed terms.',
    suggestedTerms: {
      type: 'MONEY_MONEY',
      legA: { kind: 'MONEY', description: 'Loan repayment amount' },
      legB: { kind: 'MONEY', description: 'Original loan provided' }
    }
  },
  {
    id: 'goods-exchange',
    name: 'Goods Exchange',
    icon: '📦',
    category: 'trade',
    description: 'Trade items directly with another party',
    fields: ['itemOffered', 'itemWanted', 'exchangeDate'],
    defaultTitle: 'Goods Trade Agreement',
    defaultDescription: 'Direct exchange of goods between parties. Both items to be delivered as described.',
    suggestedTerms: {
      type: 'GOODS_GOODS',
      legA: { kind: 'GOODS', description: 'Item I am providing' },
      legB: { kind: 'GOODS', description: 'Item I am receiving' }
    }
  },
  {
    id: 'accountability-goal',
    name: 'Accountability Goal',
    icon: '🎯',
    category: 'personal',
    description: 'Commitment to achieve a personal or shared goal',
    fields: ['goal', 'deadline', 'verification', 'consequence'],
    defaultTitle: 'Accountability Agreement',
    defaultDescription: 'Mutual commitment to achieve the stated goal by the deadline with agreed verification.',
    suggestedTerms: {
      type: 'SERVICE_SERVICE',
      legA: { kind: 'SERVICE', description: 'My goal commitment' },
      legB: { kind: 'SERVICE', description: 'Accountability partner support' }
    }
  },
  {
    id: 'freelance-project',
    name: 'Freelance Project',
    icon: '💼',
    category: 'services',
    description: 'Freelance work with milestones and payments',
    fields: ['projectScope', 'milestones', 'payment', 'deadline'],
    defaultTitle: 'Freelance Project Agreement',
    defaultDescription: 'Freelance project with defined scope, milestones, and payment upon completion.',
    suggestedTerms: {
      type: 'MONEY_SERVICE',
      legA: { kind: 'MONEY', description: 'Project payment' },
      legB: { kind: 'SERVICE', description: 'Freelance deliverables' }
    }
  },
  {
    id: 'deposit-return',
    name: 'Deposit & Return',
    icon: '🔐',
    category: 'financial',
    description: 'Security deposit with return conditions',
    fields: ['depositAmount', 'item', 'returnConditions'],
    defaultTitle: 'Deposit Agreement',
    defaultDescription: 'Security deposit to be returned upon meeting the agreed conditions.',
    suggestedTerms: {
      type: 'MONEY_GOODS',
      legA: { kind: 'MONEY', description: 'Security deposit' },
      legB: { kind: 'GOODS', description: 'Item or access provided' }
    }
  }
];

// Category labels
const CATEGORIES = {
  financial: { label: 'Financial', icon: '💰' },
  services: { label: 'Services', icon: '🛠️' },
  trade: { label: 'Trade', icon: '🔄' },
  personal: { label: 'Personal', icon: '👤' }
};

export function renderTemplates() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex h-screen bg-navy-50 dark:bg-navy-900">
      ${user ? renderSidebar(user) : ''}
      <div class="flex-1 overflow-y-auto">
        ${Navbar({ user })}
        <div class="container mx-auto px-4 py-8">
          <div class="max-w-6xl mx-auto">
            <div class="text-center mb-12">
              <h1 class="text-4xl font-bold text-navy-900 dark:text-white mb-4">Agreement Templates</h1>
              <p class="text-xl text-navy-600 dark:text-navy-400 max-w-2xl mx-auto">
                Start with a template to create your agreement faster. Each template is customizable to fit your needs.
              </p>
            </div>
            
            <!-- Category Filter -->
            <div class="flex flex-wrap justify-center gap-3 mb-8">
              <button 
                onclick="window.filterTemplates('all')"
                class="category-filter active px-4 py-2 rounded-full text-sm font-medium transition-all"
                data-category="all"
              >
                All Templates
              </button>
              ${Object.entries(CATEGORIES).map(([key, { label, icon }]) => `
                <button 
                  onclick="window.filterTemplates('${key}')"
                  class="category-filter px-4 py-2 rounded-full text-sm font-medium transition-all"
                  data-category="${key}"
                >
                  ${icon} ${label}
                </button>
              `).join('')}
            </div>
            
            <!-- Templates Grid -->
            <div id="templates-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${AGREEMENT_TEMPLATES.map(template => renderTemplateCard(template, user)).join('')}
            </div>
            
            <!-- Custom Agreement Option -->
            <div class="mt-12 text-center">
              <div class="inline-block p-8 glass rounded-2xl">
                <div class="text-4xl mb-4">✨</div>
                <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-2">Need Something Different?</h3>
                <p class="text-navy-600 dark:text-navy-400 mb-4">Create a fully custom agreement from scratch</p>
                <a 
                  href="${user ? '#/deal/new' : '#/login'}"
                  class="inline-block btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Create Custom Agreement
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${user ? renderMobileNav(user) : ''}
    </div>
  `;
  
  // Add filter functionality
  window.filterTemplates = (category) => {
    const buttons = document.querySelectorAll('.category-filter');
    const cards = document.querySelectorAll('.template-card');
    
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    cards.forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = 'block';
        card.classList.add('animate-fade-in');
      } else {
        card.style.display = 'none';
      }
    });
  };
}

function renderTemplateCard(template, user) {
  return `
    <div 
      class="template-card card p-6 cursor-pointer group hover:border-emerald-500 transition-all"
      data-category="${template.category}"
      onclick="window.useTemplate('${template.id}')"
    >
      <div class="flex items-start gap-4">
        <div class="text-4xl group-hover:scale-110 transition-transform">${template.icon}</div>
        <div class="flex-1">
          <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-1 group-hover:text-emerald-600 transition-colors">
            ${template.name}
          </h3>
          <span class="inline-block px-2 py-0.5 bg-navy-100 dark:bg-navy-700 text-navy-600 dark:text-navy-300 rounded text-xs mb-2">
            ${CATEGORIES[template.category]?.label || template.category}
          </span>
          <p class="text-sm text-navy-600 dark:text-navy-400">${template.description}</p>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-navy-200 dark:border-navy-700 flex justify-between items-center">
        <span class="text-xs text-navy-500">
          ${template.fields.length} fields
        </span>
        <span class="text-emerald-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
          Use Template →
        </span>
      </div>
    </div>
  `;
}

// Use template function - saves to session and navigates
window.useTemplate = (templateId) => {
  const { user } = store.getState();
  
  if (!user) {
    showToast('Please log in to use templates', 'info');
    sessionStorage.setItem('pendingTemplate', templateId);
    router.navigate('/login');
    return;
  }
  
  const template = AGREEMENT_TEMPLATES.find(t => t.id === templateId);
  if (!template) return;
  
  // Save template data to session for deal wizard
  store.saveToSession('dealWizard', {
    fromTemplate: templateId,
    title: template.defaultTitle,
    description: template.defaultDescription,
    type: template.suggestedTerms.type,
    legA: template.suggestedTerms.legA,
    legB: template.suggestedTerms.legB
  });
  
  showToast(`Using "${template.name}" template`, 'success');
  router.navigate('/deal/new');
};

// Export for use in other modules
export function getTemplateById(id) {
  return AGREEMENT_TEMPLATES.find(t => t.id === id);
}
