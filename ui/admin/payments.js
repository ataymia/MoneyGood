/**
 * Admin Payments & Refunds
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminTable, StatusBadge, SearchBar, FilterSelect, AdminSpinner, DetailDrawer, AdminConfirmModal } from './components.js';
import { adminIssueRefund } from '../../adminApi.js';
import { showToast, formatCurrency, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from '../../firebaseClient.js';

let currentFilters = { status: '' };
let paymentsCache = [];
let selectedPayment = null;

export async function renderAdminPayments() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'payments',
    children: AdminSpinner({ size: 'lg', message: 'Loading payments...' })
  });
  
  await loadPayments();
}

async function loadPayments() {
  try {
    // Try loading from top-level payments collection first
    let q = query(collection(window.db, 'payments'), orderBy('createdAt', 'desc'), limit(100));
    let snapshot = await getDocs(q);
    
    // If no top-level payments, aggregate from deals
    if (snapshot.empty) {
      const dealsQuery = query(collection(window.db, 'deals'), orderBy('createdAt', 'desc'), limit(100));
      const dealsSnapshot = await getDocs(dealsQuery);
      
      paymentsCache = dealsSnapshot.docs
        .filter(doc => doc.data().stripePaymentIntentId || doc.data().totalChargeCents)
        .map(doc => {
          const deal = doc.data();
          return {
            id: doc.id,
            dealId: doc.id,
            payerUid: deal.creatorUid,
            payerEmail: deal.creatorEmail,
            amountCents: deal.totalChargeCents || deal.principalCents,
            principalCents: deal.principalCents,
            startupFeeCents: deal.startupFeeCents,
            status: deal.status === 'cancelled' ? 'refunded' : 'paid',
            stripePaymentIntentId: deal.stripePaymentIntentId,
            refundedAmountCents: deal.refunds?.reduce((sum, r) => sum + (r.amountCents || 0), 0) || 0,
            createdAt: deal.createdAt,
          };
        });
    } else {
      paymentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    renderPaymentsContent(paymentsCache);
  } catch (error) {
    console.error('Error loading payments:', error);
    showToast('Failed to load payments', 'error');
  }
}

function renderPaymentsContent(payments) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const totalVolume = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const totalRefunded = payments.reduce((sum, p) => sum + (p.refundedAmountCents || 0), 0);
  
  const columns = [
    { key: 'payerEmail', label: 'Payer', render: (val) => `<span class="text-sm">${val || '-'}</span>` },
    { key: 'amountCents', label: 'Amount', render: (val) => `<span class="font-semibold text-emerald-600">${formatCurrency(val || 0)}</span>` },
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val || 'paid' }) },
    { key: 'refundedAmountCents', label: 'Refunded', render: (val) => val ? formatCurrency(val) : '-' },
    { key: 'createdAt', label: 'Date', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'id', label: '', render: (val, row) => `
      <div class="flex gap-2">
        <button onclick="viewPaymentDetails('${val}')" class="text-emerald-600 text-sm">Details</button>
        ${(row.amountCents - (row.refundedAmountCents || 0)) > 0 ? `
          <button onclick="showRefundModal('${val}')" class="text-red-600 text-sm">Refund</button>
        ` : ''}
      </div>
    `},
  ];
  
  adminContent.innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${formatCurrency(totalVolume)}</div>
        <div class="text-sm text-emerald-700">Total Volume</div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">${payments.length}</div>
        <div class="text-sm text-blue-700">Transactions</div>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${formatCurrency(totalRefunded)}</div>
        <div class="text-sm text-red-700">Refunded</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-purple-600">${formatCurrency(totalVolume - totalRefunded)}</div>
        <div class="text-sm text-purple-700">Net Revenue</div>
      </div>
    </div>
    
    ${AdminTable({ columns, rows: payments, emptyMessage: 'No payments found' })}
    
    ${DetailDrawer({ id: 'payment-drawer', title: 'Payment Details' })}
    
    <div id="refund-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/50">
      <div class="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-navy-900 dark:text-white mb-4">Issue Refund</h3>
        <div id="refund-modal-content"></div>
        <div class="flex gap-3 mt-6">
          <button onclick="closeAdminModal('refund-modal')" class="flex-1 px-4 py-2 rounded-lg border border-navy-200 text-navy-700 hover:bg-navy-50">
            Cancel
          </button>
          <button onclick="executeRefund()" class="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Process Refund
          </button>
        </div>
      </div>
    </div>
  `;
}

window.viewPaymentDetails = (paymentId) => {
  const payment = paymentsCache.find(p => p.id === paymentId);
  if (!payment) { showToast('Payment not found', 'error'); return; }
  
  const remaining = (payment.amountCents || 0) - (payment.refundedAmountCents || 0);
  
  updateDrawerContent('payment-drawer', `
    <div class="space-y-6">
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4 space-y-3">
        <div class="flex justify-between">
          <span class="text-navy-600">Amount</span>
          <span class="font-bold text-emerald-600 text-lg">${formatCurrency(payment.amountCents || 0)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600">Principal</span>
          <span>${formatCurrency(payment.principalCents || 0)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600">Startup Fee</span>
          <span>${formatCurrency(payment.startupFeeCents || 0)}</span>
        </div>
        <div class="flex justify-between border-t pt-2">
          <span class="text-navy-600">Refunded</span>
          <span class="text-red-600">${formatCurrency(payment.refundedAmountCents || 0)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600">Remaining</span>
          <span class="font-semibold">${formatCurrency(remaining)}</span>
        </div>
      </div>
      
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-navy-600">Payer</span>
          <span>${payment.payerEmail || '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600">Status</span>
          ${StatusBadge({ status: payment.status || 'paid' })}
        </div>
        <div class="flex justify-between">
          <span class="text-navy-600">Date</span>
          <span>${payment.createdAt?.toDate ? formatDate(payment.createdAt.toDate()) : '-'}</span>
        </div>
        ${payment.stripePaymentIntentId ? `
          <div class="flex justify-between">
            <span class="text-navy-600">Stripe ID</span>
            <span class="font-mono text-xs">${payment.stripePaymentIntentId}</span>
          </div>
        ` : ''}
        ${payment.dealId ? `
          <div class="flex justify-between">
            <span class="text-navy-600">Agreement</span>
            <a href="#/admin/agreements?id=${payment.dealId}" class="text-emerald-600">View →</a>
          </div>
        ` : ''}
      </div>
      
      ${remaining > 0 ? `
        <button onclick="showRefundModal('${payment.id}')" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Issue Refund
        </button>
      ` : ''}
    </div>
  `);
  openDrawer('payment-drawer');
};

window.showRefundModal = (paymentId) => {
  selectedPayment = paymentsCache.find(p => p.id === paymentId);
  if (!selectedPayment) return;
  
  const remaining = (selectedPayment.amountCents || 0) - (selectedPayment.refundedAmountCents || 0);
  const maxRefundable = Math.min(remaining, selectedPayment.principalCents || remaining);
  
  document.getElementById('refund-modal-content').innerHTML = `
    <div class="space-y-4">
      <div class="bg-gold-50 dark:bg-gold-900/20 border border-gold-400 rounded-lg p-3 text-sm">
        <strong class="text-gold-800">Note:</strong> Startup fee (${formatCurrency(selectedPayment.startupFeeCents || 0)}) is non-refundable per policy.
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Refund Amount (max: ${formatCurrency(maxRefundable)})</label>
        <input 
          type="number" 
          id="refund-amount" 
          max="${maxRefundable / 100}"
          value="${maxRefundable / 100}"
          step="0.01"
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Reason (required)</label>
        <textarea id="refund-reason" rows="2" class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">Type "REFUND" to confirm</label>
        <input 
          type="text" 
          id="refund-confirm" 
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"
        />
      </div>
    </div>
  `;
  
  showAdminModal('refund-modal');
};

window.executeRefund = async () => {
  if (!selectedPayment) return;
  
  const amountInput = document.getElementById('refund-amount')?.value;
  const reason = document.getElementById('refund-reason')?.value;
  const confirm = document.getElementById('refund-confirm')?.value;
  
  if (!reason) { showToast('Please provide a reason', 'error'); return; }
  if (confirm !== 'REFUND') { showToast('Please type REFUND to confirm', 'error'); return; }
  
  const amountCents = Math.round(parseFloat(amountInput) * 100);
  if (isNaN(amountCents) || amountCents <= 0) { showToast('Invalid amount', 'error'); return; }
  
  try {
    await adminIssueRefund(selectedPayment.id, amountCents, reason);
    showToast(`Refund of ${formatCurrency(amountCents)} processed`, 'success');
    closeAdminModal('refund-modal');
    closeDrawer('payment-drawer');
    loadPayments();
  } catch (error) {
    showToast(error.message || 'Failed to process refund', 'error');
  }
};
