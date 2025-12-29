/**
 * Admin Templates Management
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminSpinner, AdminTable, AdminTabs, DetailDrawer, openDrawer, closeDrawer, updateDrawerContent, AdminConfirmModal, showAdminModal, closeAdminModal } from './components.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from '../../firebaseClient.js';

let templatesCache = [];
let selectedTemplate = null;
let activeCategory = 'email';

const TEMPLATE_CATEGORIES = [
  { id: 'email', label: 'Email' },
  { id: 'notification', label: 'In-App' },
  { id: 'sms', label: 'SMS' },
  { id: 'legal', label: 'Legal' },
];

export async function renderAdminTemplates() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'templates',
    children: AdminSpinner({ size: 'lg', message: 'Loading templates...' })
  });
  
  await loadTemplates();
}

async function loadTemplates() {
  try {
    const q = query(collection(window.db, 'templates'), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    templatesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderTemplatesContent();
  } catch (error) {
    console.error('Error loading templates:', error);
    showToast('Failed to load templates', 'error');
    renderTemplatesContent();
  }
}

function renderTemplatesContent() {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const filteredTemplates = activeCategory 
    ? templatesCache.filter(t => t.category === activeCategory)
    : templatesCache;
  
  const categoryCounts = TEMPLATE_CATEGORIES.map(cat => ({
    ...cat,
    count: templatesCache.filter(t => t.category === cat.id).length
  }));
  
  const columns = [
    { key: 'name', label: 'Template Name', render: (val) => `<span class="font-medium">${val}</span>` },
    { key: 'key', label: 'Key', render: (val) => `<code class="px-2 py-1 bg-navy-100 dark:bg-navy-700 rounded text-sm">${val}</code>` },
    { key: 'subject', label: 'Subject/Title', render: (val) => val?.substring(0, 40) || '-' },
    { key: 'updatedAt', label: 'Updated', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'updatedBy', label: 'By', render: (val) => val || '-' },
    { key: 'id', label: '', render: (val) => `
      <div class="flex gap-2">
        <button onclick="editTemplate('${val}')" class="text-emerald-600 text-sm">Edit</button>
        <button onclick="confirmDeleteTemplate('${val}')" class="text-red-600 text-sm">Delete</button>
      </div>
    `},
  ];
  
  adminContent.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      ${AdminTabs({
        tabs: categoryCounts.map(c => ({ id: c.id, label: c.label, count: c.count })),
        activeTab: activeCategory,
        onTabChange: 'handleTemplateTabChange'
      })}
      <button onclick="showNewTemplateModal()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
        <span>+</span> New Template
      </button>
    </div>
    
    ${AdminTable({ columns, rows: filteredTemplates, emptyMessage: 'No templates found' })}
    
    ${DetailDrawer({ id: 'template-drawer', title: 'Edit Template', width: 'max-w-2xl' })}
    
    <!-- New/Edit Template Modal -->
    <div id="template-modal" class="fixed inset-0 bg-black/50 hidden z-50 flex items-center justify-center overflow-y-auto">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 my-8 p-6">
        <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-4" id="template-modal-title">New Template</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Name</label>
              <input type="text" id="template-name" placeholder="Welcome Email" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Key (unique)</label>
              <input type="text" id="template-key" placeholder="welcome_email" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 font-mono" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Category</label>
              <select id="template-category" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700">
                ${TEMPLATE_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Subject/Title</label>
              <input type="text" id="template-subject" placeholder="Welcome to MoneyGood!" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Body</label>
            <textarea id="template-body" rows="10" placeholder="Template content with {{variables}}..." class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 font-mono text-sm"></textarea>
            <p class="text-xs text-navy-500 mt-1">Use {{variableName}} for dynamic content</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-navy-700 dark:text-navy-300 mb-1">Variables (JSON)</label>
            <input type="text" id="template-variables" placeholder='["userName", "dealId"]' class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-700 font-mono text-sm" />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button onclick="hideTemplateModal()" class="flex-1 px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg">
            Cancel
          </button>
          <button onclick="saveTemplate()" class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Save Template
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation -->
    <div id="delete-template-modal" class="fixed inset-0 bg-black/50 hidden z-50 flex items-center justify-center">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 class="text-xl font-bold text-navy-900 dark:text-white mb-4">Delete Template</h3>
        <p class="text-navy-600 dark:text-navy-400 mb-4">Are you sure you want to delete this template? This action cannot be undone.</p>
        <div class="flex gap-3">
          <button onclick="hideDeleteModal()" class="flex-1 px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg">
            Cancel
          </button>
          <button onclick="deleteSelectedTemplate()" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

window.handleTemplateTabChange = (category) => {
  activeCategory = category;
  renderTemplatesContent();
};

let editingTemplateId = null;
let deletingTemplateId = null;

window.showNewTemplateModal = () => {
  editingTemplateId = null;
  document.getElementById('template-modal-title').textContent = 'New Template';
  document.getElementById('template-name').value = '';
  document.getElementById('template-key').value = '';
  document.getElementById('template-category').value = activeCategory || 'email';
  document.getElementById('template-subject').value = '';
  document.getElementById('template-body').value = '';
  document.getElementById('template-variables').value = '';
  document.getElementById('template-modal').classList.remove('hidden');
};

window.hideTemplateModal = () => {
  document.getElementById('template-modal').classList.add('hidden');
};

window.editTemplate = async (templateId) => {
  const template = templatesCache.find(t => t.id === templateId);
  if (!template) return;
  
  editingTemplateId = templateId;
  document.getElementById('template-modal-title').textContent = 'Edit Template';
  document.getElementById('template-name').value = template.name || '';
  document.getElementById('template-key').value = template.key || templateId;
  document.getElementById('template-category').value = template.category || 'email';
  document.getElementById('template-subject').value = template.subject || '';
  document.getElementById('template-body').value = template.body || '';
  document.getElementById('template-variables').value = template.variables ? JSON.stringify(template.variables) : '';
  document.getElementById('template-modal').classList.remove('hidden');
};

window.saveTemplate = async () => {
  const name = document.getElementById('template-name')?.value?.trim();
  const key = document.getElementById('template-key')?.value?.trim();
  const category = document.getElementById('template-category')?.value;
  const subject = document.getElementById('template-subject')?.value?.trim();
  const body = document.getElementById('template-body')?.value;
  const variablesStr = document.getElementById('template-variables')?.value?.trim();
  
  if (!name || !key) {
    showToast('Name and key are required', 'error');
    return;
  }
  
  let variables = [];
  if (variablesStr) {
    try {
      variables = JSON.parse(variablesStr);
    } catch (e) {
      showToast('Invalid variables JSON', 'error');
      return;
    }
  }
  
  const templateData = {
    name,
    key,
    category,
    subject,
    body,
    variables,
    updatedAt: serverTimestamp(),
    updatedBy: window.auth?.currentUser?.email || 'admin',
  };
  
  if (!editingTemplateId) {
    templateData.createdAt = serverTimestamp();
  }
  
  try {
    const docId = editingTemplateId || key.replace(/[^a-z0-9_]/gi, '_');
    await setDoc(doc(window.db, 'templates', docId), templateData, { merge: true });
    showToast(editingTemplateId ? 'Template updated' : 'Template created', 'success');
    hideTemplateModal();
    await loadTemplates();
  } catch (error) {
    showToast(error.message || 'Failed to save template', 'error');
  }
};

window.confirmDeleteTemplate = (templateId) => {
  deletingTemplateId = templateId;
  document.getElementById('delete-template-modal').classList.remove('hidden');
};

window.hideDeleteModal = () => {
  document.getElementById('delete-template-modal').classList.add('hidden');
  deletingTemplateId = null;
};

window.deleteSelectedTemplate = async () => {
  if (!deletingTemplateId) return;
  
  try {
    await deleteDoc(doc(window.db, 'templates', deletingTemplateId));
    showToast('Template deleted', 'success');
    hideDeleteModal();
    await loadTemplates();
  } catch (error) {
    showToast(error.message || 'Failed to delete template', 'error');
  }
};
