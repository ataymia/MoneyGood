/**
 * Admin Support Inbox
 */

import { AdminLayout, initAdminAccess, renderUnauthorized } from './layout.js';
import { AdminTable, StatusBadge, PriorityBadge, SearchBar, FilterSelect, AdminSpinner, DetailDrawer, AdminTabs } from './components.js';
import { adminReplyToTicket, adminCreateCase } from '../../adminApi.js';
import { showToast, formatDate } from '../components.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, addDoc, serverTimestamp } from '../../firebaseClient.js';

let currentFilters = { status: 'open' };
let ticketsCache = [];
let selectedTicket = null;

export async function renderAdminSupport() {
  const isAdmin = await initAdminAccess();
  if (!isAdmin) { renderUnauthorized(); return; }
  
  const content = document.getElementById('content');
  content.innerHTML = AdminLayout({
    activeSection: 'support',
    children: AdminSpinner({ size: 'lg', message: 'Loading tickets...' })
  });
  
  await loadTickets();
}

async function loadTickets() {
  try {
    const constraints = [orderBy('createdAt', 'desc'), limit(100)];
    if (currentFilters.status) {
      constraints.unshift(where('status', '==', currentFilters.status));
    }
    
    const q = query(collection(window.db, 'supportTickets'), ...constraints);
    const snapshot = await getDocs(q);
    ticketsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderTicketsContent(ticketsCache);
  } catch (error) {
    console.error('Error loading tickets:', error);
    showToast('Failed to load tickets', 'error');
  }
}

function renderTicketsContent(tickets) {
  const adminContent = document.getElementById('admin-content');
  if (!adminContent) return;
  
  const openCount = ticketsCache.filter(t => t.status === 'open').length;
  const pendingCount = ticketsCache.filter(t => t.status === 'pending').length;
  const resolvedCount = ticketsCache.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  
  const columns = [
    { key: 'category', label: 'Category', render: (val) => `
      <span class="px-2 py-1 rounded text-xs font-medium bg-navy-100 dark:bg-navy-700 text-navy-700 dark:text-navy-300">
        ${val || 'general'}
      </span>
    `},
    { key: 'userEmail', label: 'User' },
    { key: 'description', label: 'Description', render: (val) => `
      <span class="text-sm truncate block max-w-xs">${val?.substring(0, 60) || ''}...</span>
    `},
    { key: 'status', label: 'Status', render: (val) => StatusBadge({ status: val }) },
    { key: 'priority', label: 'Priority', render: (val) => PriorityBadge({ priority: val || 'medium' }) },
    { key: 'createdAt', label: 'Created', render: (val) => val?.toDate ? formatDate(val.toDate()) : '-' },
    { key: 'id', label: '', render: (val) => `
      <button onclick="viewTicketDetails('${val}')" class="text-emerald-600 text-sm">View →</button>
    `},
  ];
  
  adminContent.innerHTML = `
    ${AdminTabs({
      tabs: [
        { id: 'open', label: 'Open', count: openCount },
        { id: 'pending', label: 'Pending', count: pendingCount },
        { id: 'resolved', label: 'Resolved', count: resolvedCount },
        { id: '', label: 'All' },
      ],
      activeTab: currentFilters.status,
      onTabChange: 'handleTicketTabChange'
    })}
    
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-red-600">${openCount}</div>
        <div class="text-sm text-red-700">Needs Response</div>
      </div>
      <div class="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-gold-600">${pendingCount}</div>
        <div class="text-sm text-gold-700">Awaiting User</div>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-emerald-600">${resolvedCount}</div>
        <div class="text-sm text-emerald-700">Resolved</div>
      </div>
    </div>
    
    ${AdminTable({ columns, rows: tickets, emptyMessage: 'No tickets found' })}
    ${DetailDrawer({ id: 'ticket-drawer', title: 'Support Ticket' })}
  `;
}

window.handleTicketTabChange = (status) => {
  currentFilters.status = status;
  loadTickets();
};

window.viewTicketDetails = async (ticketId) => {
  try {
    const ticketDoc = await getDoc(doc(window.db, 'supportTickets', ticketId));
    if (!ticketDoc.exists()) { showToast('Ticket not found', 'error'); return; }
    
    selectedTicket = { id: ticketDoc.id, ...ticketDoc.data() };
    
    // Fetch messages
    const messagesQuery = query(
      collection(window.db, 'supportTickets', ticketId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderTicketDetailContent(selectedTicket, messages);
    openDrawer('ticket-drawer');
  } catch (error) {
    showToast('Failed to load ticket', 'error');
  }
};

function renderTicketDetailContent(ticket, messages) {
  updateDrawerContent('ticket-drawer', `
    <div class="space-y-6">
      <div>
        <div class="flex items-center gap-2 mb-2">
          ${StatusBadge({ status: ticket.status })}
          ${PriorityBadge({ priority: ticket.priority || 'medium' })}
        </div>
        <p class="text-sm text-navy-500">Category: ${ticket.category || 'general'}</p>
      </div>
      
      <div class="bg-navy-50 dark:bg-navy-700/50 rounded-lg p-4">
        <div class="text-sm text-navy-600 mb-2">From: ${ticket.userEmail}</div>
        <p class="text-navy-900 dark:text-white">${ticket.description}</p>
        <div class="text-xs text-navy-500 mt-2">${ticket.createdAt?.toDate ? formatDate(ticket.createdAt.toDate()) : ''}</div>
        ${ticket.dealId ? `<a href="#/admin/agreements?id=${ticket.dealId}" class="text-emerald-600 text-sm block mt-2">Related Agreement →</a>` : ''}
      </div>
      
      <!-- Messages Thread -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Conversation</h4>
        <div class="space-y-3 max-h-60 overflow-y-auto">
          ${messages.length > 0 ? messages.map(msg => `
            <div class="p-3 rounded-lg ${msg.senderType === 'admin' ? 'bg-emerald-50 dark:bg-emerald-900/20 ml-4' : 'bg-navy-50 dark:bg-navy-700/50 mr-4'}">
              <div class="text-xs text-navy-500 mb-1">
                ${msg.senderType === 'admin' ? `Admin (${msg.senderEmail || 'Support'})` : ticket.userEmail}
                ${msg.isInternal ? ' [Internal Note]' : ''}
              </div>
              <p class="text-sm text-navy-900 dark:text-white">${msg.message}</p>
              <div class="text-xs text-navy-400 mt-1">${msg.createdAt?.toDate ? formatDate(msg.createdAt.toDate()) : ''}</div>
            </div>
          `).join('') : '<p class="text-navy-500 text-sm text-center">No messages yet</p>'}
        </div>
      </div>
      
      <!-- Reply Form -->
      <div>
        <h4 class="font-semibold text-navy-900 dark:text-white mb-3">Reply</h4>
        <textarea 
          id="ticket-reply"
          rows="3"
          placeholder="Type your response..."
          class="w-full px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800"
        ></textarea>
        <div class="flex items-center gap-3 mt-2">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" id="internal-note" class="rounded">
            Internal note
          </label>
          <select id="ticket-status" class="flex-1 px-3 py-2 rounded-lg border border-navy-200 dark:border-navy-600 bg-white dark:bg-navy-800 text-sm">
            <option value="">Keep status</option>
            <option value="pending">Pending (awaiting user)</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button onclick="sendTicketReply('${ticket.id}')" class="w-full mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Send Reply
        </button>
      </div>
      
      <!-- Quick Actions -->
      <div class="pt-4 border-t border-navy-200 dark:border-navy-700 space-y-2">
        <button onclick="createTicketCase('${ticket.id}')" class="w-full px-4 py-2 border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700">
          📁 Create Investigation Case
        </button>
        ${ticket.userUid ? `
          <a href="#/admin/users?id=${ticket.userUid}" class="block w-full px-4 py-2 text-center border-2 border-navy-200 dark:border-navy-600 text-navy-700 dark:text-navy-300 rounded-lg hover:bg-navy-50 dark:hover:bg-navy-700">
            👤 View User Profile
          </a>
        ` : ''}
      </div>
    </div>
  `);
}

window.sendTicketReply = async (ticketId) => {
  const message = document.getElementById('ticket-reply')?.value;
  const isInternal = document.getElementById('internal-note')?.checked;
  const status = document.getElementById('ticket-status')?.value;
  
  if (!message) { showToast('Please enter a message', 'error'); return; }
  
  try {
    await adminReplyToTicket(ticketId, message, status || null, isInternal);
    showToast(isInternal ? 'Internal note added' : 'Reply sent', 'success');
    document.getElementById('ticket-reply').value = '';
    viewTicketDetails(ticketId); // Refresh
  } catch (error) {
    showToast(error.message || 'Failed to send reply', 'error');
  }
};

window.createTicketCase = async (ticketId) => {
  const ticket = selectedTicket;
  try {
    const result = await adminCreateCase({
      title: `Support Ticket: ${ticket.category || 'general'}`,
      description: ticket.description,
      priority: ticket.priority || 'medium',
      linkedTicketIds: [ticketId],
      linkedUserIds: ticket.userUid ? [ticket.userUid] : [],
      linkedDealIds: ticket.dealId ? [ticket.dealId] : [],
    });
    showToast('Case created', 'success');
    window.location.hash = `#/admin/cases?id=${result.caseId}`;
  } catch (error) {
    showToast(error.message || 'Failed to create case', 'error');
  }
};
