// Terms & Policy Placeholder Page
import { Navbar } from './components.js';
import { store } from '../store.js';

export function renderTerms() {
  const { user } = store.getState();
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="min-h-screen bg-navy-50 dark:bg-navy-900">
      ${Navbar({ user })}
      <div class="container mx-auto px-4 py-12">
        <div class="max-w-3xl mx-auto">
          <h1 class="text-4xl font-bold text-navy-900 dark:text-white mb-8">Terms of Service & Policy</h1>
          
          <div class="card p-8 mb-8">
            <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">Platform Purpose</h2>
            <p class="text-navy-600 dark:text-navy-400 mb-4">
              MoneyGood is a tool for creating and tracking conditional agreements between parties. 
              The platform facilitates transparent commitments with mutual confirmation.
            </p>
            <p class="text-navy-600 dark:text-navy-400">
              Each agreement is standalone and independent. The platform does not pair agreements 
              as opposing positions or facilitate wagering activities.
            </p>
          </div>
          
          <div class="card p-8 mb-8">
            <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">User Responsibilities</h2>
            <ul class="space-y-3 text-navy-600 dark:text-navy-400">
              <li class="flex items-start gap-3">
                <span class="text-emerald-500">✓</span>
                <span>Users are responsible for the content and terms of their agreements</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-emerald-500">✓</span>
                <span>All parties must mutually confirm outcomes before completion</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-emerald-500">✓</span>
                <span>Disputes should be resolved through the platform's freeze mechanism</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-emerald-500">✓</span>
                <span>Users must comply with all applicable local laws and regulations</span>
              </li>
            </ul>
          </div>
          
          <div class="card p-8 mb-8">
            <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">Content Policy</h2>
            <p class="text-navy-600 dark:text-navy-400 mb-4">
              Certain types of content and language are restricted on the platform to maintain 
              its focus on legitimate conditional agreements:
            </p>
            <ul class="space-y-2 text-navy-600 dark:text-navy-400">
              <li>• Agreements must focus on commitments between parties</li>
              <li>• Language suggesting opposing positions or paired outcomes is restricted</li>
              <li>• Content is automatically reviewed for compliance</li>
            </ul>
          </div>
          
          <div class="card p-8 mb-8">
            <h2 class="text-2xl font-bold text-navy-900 dark:text-white mb-4">Payment Processing</h2>
            <p class="text-navy-600 dark:text-navy-400">
              Payments are processed securely through Stripe. The platform charges a small 
              service fee for agreement facilitation. All financial transactions are subject 
              to Stripe's terms of service.
            </p>
          </div>
          
          <div class="card p-8 bg-navy-100 dark:bg-navy-800">
            <h2 class="text-xl font-bold text-navy-900 dark:text-white mb-4">Contact</h2>
            <p class="text-navy-600 dark:text-navy-400">
              For questions about these terms or to report issues, please contact support 
              through the platform or email support@moneygood.app (placeholder).
            </p>
          </div>
          
          <p class="text-center text-sm text-navy-500 mt-8">
            Last updated: December 2024
          </p>
        </div>
      </div>
    </div>
  `;
}
