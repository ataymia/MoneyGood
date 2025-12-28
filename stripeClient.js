/**
 * Stripe Client - Environment Variable Configuration
 * 
 * This module initializes Stripe using the publishable key from environment variables.
 * It provides lazy initialization and error handling for missing configuration.
 * 
 * Environment Variable Required (set in Cloudflare Pages):
 * - VITE_STRIPE_PUBLISHABLE_KEY (pk_test_... or pk_live_...)
 */

let stripeInstance = null;
let stripeError = null;
let stripeReady = false;

/**
 * Validate Stripe publishable key from environment
 */
function validateStripeKey() {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey === 'undefined' || publishableKey === '') {
    return {
      valid: false,
      message: 'Missing VITE_STRIPE_PUBLISHABLE_KEY environment variable'
    };
  }

  // Validate key format
  if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
    return {
      valid: false,
      message: 'Invalid Stripe publishable key format. Must start with pk_test_ or pk_live_'
    };
  }

  return { valid: true, key: publishableKey };
}

/**
 * Initialize Stripe instance (lazy initialization)
 * @returns {Stripe|null} Stripe instance or null if not configured
 */
export function getStripeInstance() {
  // Return cached instance if already initialized
  if (stripeInstance) {
    return stripeInstance;
  }

  // Return null if previous attempt failed
  if (stripeError) {
    return null;
  }

  // Validate and initialize
  const validation = validateStripeKey();

  if (!validation.valid) {
    stripeError = validation.message;
    console.error('❌ Stripe initialization failed:', validation.message);
    console.error('📋 Setup Instructions:');
    console.error('1. Go to Cloudflare Pages Dashboard → Your Project → Settings → Environment Variables');
    console.error('2. Add: VITE_STRIPE_PUBLISHABLE_KEY (get from Stripe Dashboard)');
    console.error('3. Use pk_test_... for testing or pk_live_... for production');
    console.error('4. Redeploy your site or restart the dev server');
    return null;
  }

  try {
    // Initialize Stripe (assumes Stripe.js is loaded via script tag)
    if (typeof Stripe === 'undefined') {
      stripeError = 'Stripe.js library not loaded. Add <script src="https://js.stripe.com/v3/"></script> to your HTML';
      console.error('❌', stripeError);
      return null;
    }

    stripeInstance = Stripe(validation.key);
    stripeReady = true;
    console.log('✅ Stripe initialized successfully from environment variables');
    return stripeInstance;
  } catch (error) {
    stripeError = `Stripe initialization failed: ${error.message}`;
    console.error('❌ Stripe initialization error:', error);
    return null;
  }
}

/**
 * Check if Stripe is configured and ready
 * @returns {boolean}
 */
export function isStripeReady() {
  return stripeReady || (getStripeInstance() !== null);
}

/**
 * Get Stripe error message if initialization failed
 * @returns {string|null}
 */
export function getStripeError() {
  return stripeError;
}

/**
 * Show user-friendly toast when Stripe is not configured
 * @param {Function} showToast - Toast notification function
 */
export function showStripeConfigError(showToast) {
  if (isStripeReady()) return;

  const errorMessage = stripeError || 'Stripe is not configured. Contact your administrator.';
  
  showToast(errorMessage, 'error', 5000);
  
  console.error('❌ Stripe Configuration Error:', errorMessage);
  console.error('Payment features are disabled until Stripe is properly configured.');
}

/**
 * Redirect to Stripe Checkout
 * @param {string} sessionId - Stripe Checkout Session ID
 * @returns {Promise<{error: Error}|void>}
 */
export async function redirectToCheckout(sessionId) {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    throw new Error(stripeError || 'Stripe is not initialized');
  }

  try {
    const result = await stripe.redirectToCheckout({ sessionId });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Stripe redirect error:', error);
    throw error;
  }
}

/**
 * Create a payment method with Stripe Elements
 * @param {object} cardElement - Stripe Card Element
 * @returns {Promise<{paymentMethod: object, error: Error}>}
 */
export async function createPaymentMethod(cardElement) {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    throw new Error(stripeError || 'Stripe is not initialized');
  }

  try {
    const result = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    return result;
  } catch (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }
}

/**
 * Confirm a payment with Stripe
 * @param {string} clientSecret - Payment Intent client secret
 * @param {object} cardElement - Stripe Card Element
 * @returns {Promise<{paymentIntent: object, error: Error}>}
 */
export async function confirmCardPayment(clientSecret, cardElement) {
  const stripe = getStripeInstance();
  
  if (!stripe) {
    throw new Error(stripeError || 'Stripe is not initialized');
  }

  try {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    return result;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
}

// Export for testing/debugging
export { stripeInstance, stripeError, stripeReady };
