// Firebase Functions API wrapper
import { httpsCallable } from './firebaseClient.js';
import { redirectToCheckout } from './stripeClient.js';

// Cloud Functions API wrapper 

export async function createDeal(data) {
  const callable = httpsCallable(window.firebaseFunctions, 'createDeal');
  const result = await callable(data);
  return result.data;
}

export async function acceptInvite(token) {
  const callable = httpsCallable(window.firebaseFunctions, 'acceptInvite');
  const result = await callable({ token });
  return result.data;
}

export async function createCheckoutSession(dealId, purpose) {
  const callable = httpsCallable(window.firebaseFunctions, 'createCheckoutSession');
  const result = await callable({ dealId, purpose });
  
  // Automatically redirect to Stripe Checkout
  if (result.data && result.data.url) {
    window.location.href = result.data.url;
  }
  
  return result.data;
}

export async function proposeOutcome(dealId, outcome) {
  const callable = httpsCallable(window.firebaseFunctions, 'proposeOutcome');
  const result = await callable({ dealId, outcome });
  return result.data;
}

export async function confirmOutcome(dealId) {
  const callable = httpsCallable(window.firebaseFunctions, 'confirmOutcome');
  const result = await callable({ dealId });
  return result.data;
}

export async function freezeDeal(dealId, reason) {
  const callable = httpsCallable(window.firebaseFunctions, 'freezeDeal');
  const result = await callable({ dealId, reason });
  return result.data;
}

export async function unfreezeDeal(dealId) {
  const callable = httpsCallable(window.firebaseFunctions, 'unfreezeDeal');
  const result = await callable({ dealId });
  return result.data;
}

export async function cancelDeal(dealId, reason = '') {
  const callable = httpsCallable(window.firebaseFunctions, 'cancelDeal');
  const result = await callable({ dealId, reason });
  return result.data;
}

export async function requestExtension(dealId, extensionType) {
  const callable = httpsCallable(window.firebaseFunctions, 'requestExtension');
  const result = await callable({ dealId, extensionType });
  return result.data;
}

export async function approveExtension(dealId) {
  const callable = httpsCallable(window.firebaseFunctions, 'approveExtension');
  const result = await callable({ dealId });
  return result.data;
}

export async function setupStripeConnect() {
  const callable = httpsCallable(window.firebaseFunctions, 'setupStripeConnect');
  const result = await callable({});
  return result.data;
}

// Error handling wrapper
export async function callFunction(fn, ...args) {
  try {
    return await fn(...args);
  } catch (error) {
    console.error('Function call error:', error);
    throw new Error(error.message || 'An error occurred. Please try again.');
  }
}
