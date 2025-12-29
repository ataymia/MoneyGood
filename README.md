# MoneyGood 💰

A production-ready static web application for secure two-party deals with collateral, Stripe payments, and dispute resolution. Frontend deployed on **Cloudflare Pages**, backend powered by **Firebase** (Auth, Firestore, Cloud Functions) with **Stripe + Stripe Connect** integration. Built with vanilla JavaScript ES modules.

## 🚀 Quick Setup

**New to MoneyGood?** Follow the complete setup guide:

📘 **[STRIPE_FIREBASE_SETUP.md](./STRIPE_FIREBASE_SETUP.md)** — Complete step-by-step guide for:
- Firebase configuration with environment variables
- Stripe integration (Checkout + Webhooks)
- Cloudflare Pages deployment
- Local development setup
- Security best practices

This guide walks you through configuring Firebase, Stripe, and deploying the complete application with proper secrets management.

---

## Features

### 🔒 Secure Deals
- **Fairness Hold Collateral**: Any deal involving goods/services requires cash collateral (20% of declared value) to ensure both parties act in good faith
- **Multiple Deal Types**: Money↔Money, Money↔Goods, Money↔Service, Goods↔Goods, Goods↔Service, Service↔Service
- **Legs Model**: Flexible agreement structure where each side (legA/legB) can be MONEY, GOODS, or SERVICE
- **Mutual Confirmation**: Both parties must agree on deal outcomes
- **Dispute Freeze**: Freeze deals and enter dispute resolution
- **Blocked Language Filter**: Prevents wagering, betting, and opposing position terminology

### 💳 Stripe Integration
- **Stripe Checkout**: Secure payment processing
- **Stripe Connect**: Direct payouts to participants
- **Webhook Handlers**: Automated payment status updates
- **Multiple Payment Types**: Setup fees, contributions, fairness holds, extension fees

### 🏪 Marketplace
- **Public Listings**: Browse available deals in a public marketplace
- **Create Listings**: Post deals that anyone can join
- **Join Deals**: One-click joining with automatic deal creation
- **Language Validation**: All listings checked for blocked language

### 💬 Per-Deal Chat
- **Real-time Messaging**: Chat within each deal
- **Message Validation**: Blocked language filtering on all messages
- **Participant-Only**: Only deal participants can view and send messages
- **No Global Chat**: Communication is strictly per-deal to maintain focus

### 📅 Deal Management
- **Deal Dates**: Set completion deadlines with timezone support
- **Past Due Tracking**: Automatic status updates when deals pass deadline
- **Extensions**: Request and approve deal extensions with fees
- **Invite Links**: Share unique, expiring invite tokens
- **Status Timeline**: Visual stepper showing deal progress

### 🎨 Beautiful UI
- **Premium Design**: Emerald/navy/gold color scheme
- **Interactive Elements**: Hover effects, animations, confetti on completions
- **Light/Dark/System Theme**: Fully themed with persistent preferences
- **Responsive**: Mobile-first design
- **Real-time Updates**: Live status changes via Firestore
- **Audit Logs**: Complete action history for transparency
- **Skeleton Loaders**: Smooth loading states
- **Funding Checklist**: Visual payment progress tracker

### 🔔 Notifications
- **In-app Notifications**: Deal updates, actions required, completions
- **Email & Push**: Configurable notification preferences
- **Status Dashboard**: Organized by Needs Action, Active, Past Due, Frozen, Completed

## Tech Stack

### Frontend
- **Vanilla JavaScript ES Modules**: No framework overhead
- **Tailwind CSS**: Utility-first styling via CDN
- **Firebase SDK v10+**: Modular imports
- **SPA Router**: Hash-based routing

### Backend
- **Firebase Auth**: Email/password authentication
- **Cloud Firestore**: NoSQL database with security rules
- **Cloud Functions**: TypeScript Node 20 runtime
- **Stripe API**: Payment processing and webhooks

### Development
- **TypeScript**: Type-safe Cloud Functions
- **Zod**: Runtime schema validation
- **ESLint**: Code quality

## Safety & Compliance

### 🚫 Blocked Language Policy
MoneyGood enforces a strict language policy to prevent wagering, betting, and gambling-related activities:

- **Pattern-Based Filtering**: Automatic detection of wagering terminology (bet, wager, odds, gamble, etc.)
- **Opposing Position Detection**: Prevents agreements with opposing outcomes (A wins vs B wins)
- **Paired Agreement Prevention**: No language suggesting linked or versus-style agreements
- **Client & Server Validation**: Checked on both frontend (UX) and backend (security)

**Where It's Enforced:**
- Deal titles and descriptions
- Marketplace listing titles and descriptions
- Per-deal chat messages
- Leg descriptions

**Standalone Agreements Only:**
All agreements must be independent and standalone. No automatic triggers, external event dependencies, linked agreements, or opposing outcomes are permitted.

### ✅ Allowed Agreement Types
- Money for goods delivery
- Money for service completion
- Goods exchange for other goods
- Service exchange for other services
- Collaborative agreements with mutual outcomes

### ❌ Blocked Agreement Types
- Wagers on external events
- Betting on outcomes
- Opposing position agreements ("A wins" vs "B wins")
- Linked or paired agreements
- Any gambling-related activities

## Project Structure

```
/
├── firebase.json              # Firebase configuration
├── .firebaserc                # Firebase project settings
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── README.md                  # This file
│
├── index.html                 # Main HTML (frontend in root for Cloudflare Pages)
├── styles.css                 # Custom CSS + theme variables + animations
├── app.js                     # App entry point with landing page
├── router.js                  # SPA hash router
├── firebase.js                # Firebase SDK initialization
├── api.js                     # Cloud Functions API wrapper
├── store.js                   # State management + localStorage
├── blocked-language.js        # Wagering/betting language filter
├── _headers                   # Cloudflare Pages headers configuration
├── _routes.json               # Cloudflare Pages routing config (static asset exclusion)
│
├── /ui                        # UI modules
│   ├── components.js          # Reusable components (timeline, checklist, skeletons, etc.)
│   ├── auth.js                # Login/signup pages
│   ├── dashboard.js           # Main dashboard
│   ├── dealWizard.js          # Create deal flow with legs model
│   ├── dealDetail.js          # Deal detail page with tabs (Details/Chat/Activity)
│   ├── dealsList.js           # Deal listing view
│   ├── marketplace.js         # Public marketplace feed
│   ├── marketplaceNew.js      # Create marketplace listings
│   ├── navigation.js          # Navigation components
│   ├── notifications.js       # Notifications panel
│   ├── settings.js            # Settings page
│   └── account.js             # Account management
│
└── /firebase-functions        # Firebase Cloud Functions (NOT Cloudflare Pages Functions)
    ├── package.json           # Node dependencies
    ├── tsconfig.json          # TypeScript config
    └── /src
        ├── index.ts           # All callable functions + webhooks
        ├── stripe.ts          # Stripe helper functions
        ├── validators.ts      # Zod schemas with legs model
        ├── dealMachine.ts     # Deal state machine logic
        ├── fees.ts            # Fee calculations
        ├── notifications.ts   # Notification helpers
        └── dealMachine.ts     # State machine with outcome_proposed/confirmed
```

**Note on Routing:** This app uses **hash-based routing** (`#/app`, `#/deal/123`) which works perfectly with static hosting on Cloudflare Pages without needing server-side redirects. All navigation is client-side via the hash router.

**Note on Functions:** The `/firebase-functions` directory contains Firebase Cloud Functions (backend), NOT Cloudflare Pages Functions. This directory is named to avoid confusion with Cloudflare's build system.

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Stripe account (for payments)
- Cloudflare account (for hosting frontend)
- Firebase project (for backend)

### Complete Setup Guide

**👉 Follow [STRIPE_FIREBASE_SETUP.md](./STRIPE_FIREBASE_SETUP.md) for detailed setup instructions.**

The guide covers:
1. Firebase project setup (Auth, Firestore, Functions)
2. Stripe account configuration (API keys, webhooks)
3. Cloudflare Pages environment variables
4. Firebase Cloud Functions deployment with secrets
5. Testing and troubleshooting

### Quick Start Summary

1. **Set Firebase environment variables in Cloudflare Pages:**
   ```
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   VITE_STRIPE_PUBLISHABLE_KEY
   ```

2. **Set Firebase runtime config for Cloud Functions:**
   ```bash
   firebase functions:config:set stripe.secret="sk_test_..."
   firebase functions:config:set stripe.webhook_secret="whsec_..."
   ```

   **Note:** Using runtime config to avoid billing requirements. This is scheduled for deprecation in March 2026 but works without enabling billing. Consider migrating to Secret Manager or environment variables before then.

3. **Deploy Firebase Functions:**
   ```bash
   cd firebase-functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

4. **Configure Stripe webhook** pointing to your deployed `stripeWebhook` function URL

5. **Deploy frontend** to Cloudflare Pages (automatically triggered on push to main branch)

### Initial Setup (Legacy - use setup guide above instead)

1. **Configure Firebase Credentials** (See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) or [STRIPE_FIREBASE_SETUP.md](./STRIPE_FIREBASE_SETUP.md))
   ```bash
   # NO LONGER NEEDED: Frontend now uses environment variables
   # See STRIPE_FIREBASE_SETUP.md for proper configuration
   ```

2. **Install Dependencies**
   ```bash
   cd firebase-functions
   npm install
   ```

3. **Configure Backend Environment Variables**
   ```bash
   # Set Stripe keys for Firebase Functions
   firebase functions:config:set \
     stripe.secret_key="sk_test_YOUR_KEY" \
     stripe.webhook_secret="whsec_YOUR_SECRET"
   ```

4. **Deploy Backend**
   ```bash
   firebase deploy --only functions,firestore
   ```

5. **Deploy Frontend** (Choose one option below)

## Deployment Options

MoneyGood supports three deployment options:

1. **Cloudflare Pages** (recommended) - Frontend on Cloudflare, backend on Firebase
2. **GitHub Pages** - Frontend on GitHub Pages, backend on Firebase
3. **Firebase Hosting** - Full-stack Firebase deployment

### Option 1: Cloudflare Pages Deployment (Recommended)

See **[CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)** for complete step-by-step instructions.

**Why Cloudflare Pages?**
- Unlimited bandwidth on free tier
- Global CDN with 200+ locations
- Better DDoS protection
- Free SSL certificates
- Fast deployment times

**Cloudflare Pages Settings:**
```
Framework preset: None
Build command: (leave empty)
Build output directory: / (root)
Root directory: (leave empty or /)
```

**Important Configuration Files:**
- `_routes.json` - Defines which paths are static assets vs dynamic routes
- `_headers` - Sets security and caching headers
- Hash-based routing (`#/app`, `#/deal/123`) - No server-side redirects needed

**Backend Note:**
The `/firebase-functions` directory contains Firebase Cloud Functions for the backend (Auth, Firestore, Stripe). This is NOT Cloudflare Pages Functions - Cloudflare only serves the static frontend.

### Option 2: GitHub Pages Deployment

GitHub Pages deployment is automatically configured via GitHub Actions. When you push to the `main` branch, the site is automatically deployed from the root directory.

**Quick Setup:**
1. Go to your repository → Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Push to `main` branch to trigger deployment
4. Your site will be live at `https://yourusername.github.io/MoneyGood/`

**Important:** You still need to:
- Configure Firebase backend (Auth, Firestore, Functions)
- Update `firebase.js` with your Firebase credentials
- Add your GitHub Pages domain to Firebase authorized domains

### Option 3: Firebase Hosting Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for Firebase Hosting instructions.

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/ataymia/MoneyGood.git
cd MoneyGood

# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### 2. Firebase Project Setup

```bash
# Create a new Firebase project or use existing
firebase projects:create moneygood-app

# Set project for this directory
firebase use moneygood-app
```

### 3. Enable Firebase Services

In the [Firebase Console](https://console.firebase.google.com):

1. **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Email/Password** provider

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in **production mode**
   - Choose a location (e.g., us-central1)

3. **Upgrade to Blaze Plan**:
   - Go to Project Settings → Usage and billing
   - Upgrade to **Blaze (pay-as-you-go)** plan
   - Required for Cloud Functions

### 4. Configure Firebase Credentials

#### Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Settings (gear icon) → Project Settings
3. Scroll to "Your apps" → Click on Web app (or create one)
4. Copy the `firebaseConfig` object

#### Update Frontend Configuration

Edit `firebase.js` in the root directory and replace placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // ← Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**⚠️ Important**: The placeholder values will show a configuration error page until replaced.

### 5. Configure Stripe

#### Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Go to Dashboard → Developers → API keys
3. Copy your **Secret Key** (use test key `sk_test_...` for development)

#### Enable Stripe Connect

1. Go to Dashboard → Connect → Get started
2. Complete Stripe Connect setup
3. Note your Connect settings

#### Create Backend Environment File

Create `functions/.env`:

```env
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
APP_URL=https://your-site.pages.dev
```

**Note**: Use test keys for development, live keys for production.

### 6. Deploy Firebase Backend

#### Install Dependencies

```bash
cd functions
npm install
cd ..
```

#### Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

This sets up security rules and database indexes.

#### Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Note**: First deployment may take 5-10 minutes. Note the function URLs from the output.

### 7. Configure Stripe Webhook

After deploying functions, set up the Stripe webhook:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your Cloud Function URL:
   ```
   https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
   (Find exact URL in Firebase Console → Functions → stripeWebhook)
4. Select event to listen: `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **webhook signing secret** (starts with `whsec_`)
7. Update `functions/.env` with the secret:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
   ```
8. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

### 8. Deploy Frontend

Choose one of the deployment options:

#### Option A: Deploy to Cloudflare Pages (Recommended)

See **[CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)** for detailed instructions.

Quick steps:
1. Push code to GitHub
2. Go to [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/)
3. Click **Create a project** → **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: Leave empty
   - **Build output directory**: `public`
6. Click **Save and Deploy**
7. Your site will be live at: `https://your-project.pages.dev`

**Don't forget**: Add your Cloudflare domain to Firebase Authentication authorized domains!

#### Option B: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your site will be live at: `https://your-project.web.app`

### 9. Test Your Deployment

1. Visit your hosted URL
2. Create a test account
3. Create a test deal
4. Use [Stripe test cards](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future date for expiry, any 3 digits for CVC, any 5 digits for ZIP

## Local Development

### Run With Firebase Emulators

Best for testing the full stack locally:

```bash
# Start emulators for Auth, Firestore, and Functions
firebase emulators:start

# Access the app at:
# - Frontend: http://localhost:5000
# - Emulator UI: http://localhost:4000
```

### Run Frontend Only

For quick frontend development:

```bash
cd public

# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: PHP
php -S localhost:8000

# Access at: http://localhost:8000
```

**Note**: When running frontend only, you'll need deployed Firebase Functions for backend operations.

### Watch Cloud Functions

For function development:

```bash
cd functions

# Build and watch for changes
npm run build -- --watch

# Or use Firebase emulators
cd ..
firebase emulators:start --only functions
```

### Test Stripe Webhooks Locally

Use Stripe CLI to forward webhook events:

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

# Forward events to local functions
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook

# Test with:
stripe trigger checkout.session.completed
```

## Data Models

### Users Collection (`users/{uid}`)
```typescript
{
  uid: string
  email: string
  displayName?: string
  theme: 'light' | 'dark' | 'system'
  stripeConnectAccountId?: string
  emailNotifications: boolean
  pushNotifications: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Deals Collection (`deals/{dealId}`)
```typescript
{
  creatorUid: string
  participantUid?: string
  type: 'CASH_CASH' | 'CASH_GOODS' | 'GOODS_GOODS'
  status: 'draft' | 'invited' | 'awaiting_funding' | 'active' | 'past_due' | 'frozen' | 'completed' | 'cancelled'
  title: string
  description: string
  dealDate: Timestamp
  timezone: string
  moneyAmountCents?: number
  goodsA?: string
  goodsB?: string
  declaredValueA?: number
  declaredValueB?: number
  fairnessHoldA: number
  fairnessHoldB: number
  setupFeeCents: number
  inviteToken: string
  inviteExpiresAt: Timestamp
  proposedOutcome?: string
  outcomeConfirmed: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Actions Subcollection (`deals/{dealId}/actions/{actionId}`)
```typescript
{
  actorUid: string
  userEmail: string
  type: string
  details: string
  metadata?: object
  createdAt: Timestamp
}
```

### Payments Subcollection (`deals/{dealId}/payments/{paymentId}`)
```typescript
{
  party: 'A' | 'B' | 'PLATFORM'
  purpose: 'SETUP_FEE' | 'CONTRIBUTION' | 'FAIRNESS_HOLD' | 'EXTENSION_FEE'
  amountCents: number
  currency: string
  stripeCheckoutSessionId: string
  stripePaymentIntentId?: string
  status: 'pending' | 'succeeded' | 'failed'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Cloud Functions

### Callable Functions
- `createDeal`: Create a new deal with validation
- `acceptInvite`: Join a deal via invite token
- `createCheckoutSession`: Generate Stripe checkout URL
- `proposeOutcome`: Suggest deal resolution
- `confirmOutcome`: Approve proposed outcome
- `freezeDeal`: Enter dispute mode
- `unfreezeDeal`: Resolve dispute
- `requestExtension`: Request deal date extension
- `approveExtension`: Approve extension request
- `setupStripeConnect`: Initiate Stripe Connect onboarding

### HTTP Functions
- `stripeWebhook`: Handle Stripe webhook events

### Scheduled Functions
- `checkPastDueDeals`: Runs every 15 minutes to mark overdue deals

## Security

### Firestore Rules
- Users can only read/write their own user documents
- Deals readable only by participants
- Direct deal status updates blocked (must use Cloud Functions)
- Payment and action records are read-only from client

### Cloud Functions
- All functions require authentication
- Zod schema validation on all inputs
- Permission checks for deal participation
- State machine prevents invalid transitions

## Deployment

### Production Deployment

```bash
# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: cd functions && npm ci && npm run build
      - uses: w9jds/firebase-action@master
        with:
          args: deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Monitoring

### Firebase Console
- **Firestore**: Monitor database usage
- **Functions**: View execution logs
- **Hosting**: Check traffic stats
- **Authentication**: Track user signups

### Stripe Dashboard
- Monitor payments and transfers
- View webhook delivery status
- Track Connect account onboarding

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────┐
│         Cloudflare Pages / Firebase          │
│              (Static Frontend)               │
│  • HTML/CSS/JS (vanilla ES modules)         │
│  • SPA with hash routing                    │
│  • Real-time Firestore listeners            │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│           Firebase Services                  │
│  ┌──────────────────────────────────────┐  │
│  │  Authentication (Email/Password)      │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Firestore (NoSQL Database)          │  │
│  │  • users/, deals/, payments/         │  │
│  │  • Real-time sync                    │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Cloud Functions (Node 20)           │  │
│  │  • Callable functions (API)          │  │
│  │  • HTTP webhooks                     │  │
│  │  • Scheduled functions (cron)        │  │
│  └──────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│             Stripe Services                  │
│  • Checkout (payments)                      │
│  • Connect (payouts)                        │
│  • Webhooks (events)                        │
└─────────────────────────────────────────────┘
```

### Security Model

**Frontend**: 
- Public static assets (HTML/CSS/JS)
- Firebase SDK for client-side Auth and Firestore reads
- All sensitive writes go through Cloud Functions

**Firestore Rules**:
- Users can only read/write their own user document
- Deals readable only by creator and participant
- Status, payments, and sensitive fields server-controlled
- Direct client writes to sensitive fields blocked

**Cloud Functions**:
- All functions require authentication
- Zod schema validation on inputs
- Permission checks for deal participation
- State machine prevents invalid transitions

### Data Flow Examples

**Creating a Deal**:
1. User fills form in frontend
2. Frontend calls `createDeal()` Cloud Function
3. Function validates data, calculates fees
4. Function creates deal document in Firestore
5. Function logs action and creates notification
6. Frontend receives deal ID
7. Firestore listener updates UI in real-time

**Payment Processing**:
1. User clicks "Pay" button
2. Frontend calls `createCheckoutSession()` Cloud Function
3. Function creates Stripe Checkout session
4. Function stores payment record
5. User redirected to Stripe Checkout
6. User completes payment
7. Stripe sends webhook to Cloud Function
8. Function marks payment as succeeded
9. Function updates deal status if fully funded
10. Frontend real-time listeners update UI

## Troubleshooting

### Common Issues

**Issue: Can't see the site / Configuration error page**

**Symptoms**: Site loads but shows a configuration warning page

**Solution**: You're using placeholder Firebase credentials. Update `firebase.js` with your actual Firebase config:

1. Go to Firebase Console → Project Settings → Your apps → Web app
2. Copy your Firebase configuration
3. Replace placeholder values in `firebase.js`
4. Redeploy your site

**Issue: Functions deployment fails**

**Solution**:
```bash
# Ensure you're on Blaze plan
firebase projects:list

# Check for build errors
cd functions
npm run build

# Check functions logs
firebase functions:log

# Deploy with debug
firebase deploy --only functions --debug
```

**Issue: Stripe webhook not receiving events**

**Solution**:
- Verify webhook URL matches deployed function URL
- Check webhook secret in `functions/.env`
- Review Stripe Dashboard → Webhooks → delivery logs
- Test webhook signature validation
- Ensure functions are deployed: `firebase deploy --only functions`

**Issue: Firestore permission denied**

**Solution**:
- Check security rules are deployed: `firebase deploy --only firestore:rules`
- Verify user is authenticated
- Ensure user is creator or participant in the deal
- Check browser console for detailed error messages

**Issue: Authentication doesn't work on Cloudflare**

**Solution**:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Cloudflare Pages domain (e.g., `your-project.pages.dev`)
3. If using custom domain, add that too
4. Wait a few minutes for changes to propagate

**Issue: Dark mode not working**

**Solution**:
- Check browser console for errors
- Verify theme is saved in localStorage
- Go to Settings and toggle theme manually
- Clear browser cache and reload

**Issue: Payments fail silently**

**Solutions**:
1. Check Stripe webhook is configured correctly
2. Verify webhook secret in `functions/.env`
3. Check Cloud Function logs: `firebase functions:log`
4. Test with Stripe CLI: `stripe listen --forward-to YOUR_FUNCTION_URL`
5. Verify Stripe keys are correct (test vs live)

**Issue: Deal status not updating**

**Solutions**:
1. Check Cloud Functions logs for errors
2. Verify Firestore security rules allow function writes
3. Check browser console for Firestore listener errors
4. Ensure deal funding is complete before expecting status changes

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [github.com/ataymia/MoneyGood/issues](https://github.com/ataymia/MoneyGood/issues)
- Email: support@moneygood.app

---

Built with ❤️ using Firebase and Stripe