# MoneyGood 💰

A production-ready static web application for secure two-party deals with collateral, Stripe payments, and dispute resolution. Built with Firebase (Auth, Firestore, Cloud Functions, Hosting) and vanilla JavaScript.

## Features

### 🔒 Secure Deals
- **Fairness Hold Collateral**: Any deal involving goods/services requires cash collateral (20% of declared value) to ensure both parties act in good faith
- **Multiple Deal Types**: Cash↔Cash, Cash↔Goods/Service, Goods↔Goods
- **Mutual Confirmation**: Both parties must agree on deal outcomes
- **Dispute Freeze**: Freeze deals and enter dispute resolution

### 💳 Stripe Integration
- **Stripe Checkout**: Secure payment processing
- **Stripe Connect**: Direct payouts to participants
- **Webhook Handlers**: Automated payment status updates
- **Multiple Payment Types**: Setup fees, contributions, fairness holds, extension fees

### 📅 Deal Management
- **Deal Dates**: Set completion deadlines with timezone support
- **Past Due Tracking**: Automatic status updates when deals pass deadline
- **Extensions**: Request and approve deal extensions with fees
- **Invite Links**: Share unique, expiring invite tokens

### 🎨 Beautiful UI
- **Premium Design**: Emerald/navy/gold color scheme
- **Light/Dark/System Theme**: Fully themed with persistent preferences
- **Responsive**: Mobile-first design
- **Real-time Updates**: Live status changes via Firestore
- **Audit Logs**: Complete action history for transparency

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

## Project Structure

```
/
├── firebase.json              # Firebase configuration
├── .firebaserc                # Firebase project settings
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── README.md                  # This file
│
├── /public                    # Static frontend (Firebase Hosting)
│   ├── index.html             # Main HTML
│   ├── styles.css             # Custom CSS + theme variables
│   ├── app.js                 # App entry point
│   ├── router.js              # SPA router
│   ├── firebase.js            # Firebase SDK initialization
│   ├── api.js                 # Cloud Functions API wrapper
│   ├── store.js               # State management + localStorage
│   └── /ui                    # UI modules
│       ├── components.js      # Reusable components
│       ├── auth.js            # Login/signup pages
│       ├── dashboard.js       # Main dashboard
│       ├── dealWizard.js      # Create deal flow
│       ├── dealDetail.js      # Deal detail page
│       └── settings.js        # Settings page
│
└── /functions                 # Cloud Functions
    ├── package.json           # Node dependencies
    ├── tsconfig.json          # TypeScript config
    └── /src
        ├── index.ts           # All callable functions + webhooks
        ├── stripe.ts          # Stripe helper functions
        ├── validators.ts      # Zod schemas
        └── dealMachine.ts     # Deal state machine logic
```

## Setup Instructions

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Stripe account
- Firebase project

### 1. Firebase Project Setup

```bash
# Login to Firebase
firebase login

# Create a new Firebase project (or use existing)
firebase projects:create moneygood-app

# Initialize Firebase in this directory
firebase use moneygood-app
```

### 2. Enable Firebase Services

In the [Firebase Console](https://console.firebase.google.com):
1. **Authentication**: Enable Email/Password provider
2. **Firestore**: Create database in production mode
3. **Functions**: Upgrade to Blaze (pay-as-you-go) plan
4. **Hosting**: Enable Firebase Hosting

### 3. Configure Environment Variables

#### Frontend Configuration
Update `public/firebase.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "moneygood-app.firebaseapp.com",
  projectId: "moneygood-app",
  storageBucket: "moneygood-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### Backend Configuration
Create `functions/.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://moneygood-app.web.app
```

### 4. Install Dependencies

```bash
# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 5. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 6. Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 7. Deploy Frontend to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 8. Stripe Webhook Setup

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a new webhook
2. Set endpoint URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret to `functions/.env` as `STRIPE_WEBHOOK_SECRET`

## Development

### Run Firebase Emulators

```bash
# Start emulators for Firestore, Functions, and Hosting
firebase emulators:start
```

Access the app at `http://localhost:5000`

### Test Cloud Functions Locally

```bash
cd functions
npm run serve
```

### Watch for Changes

For frontend development, use any static file server:

```bash
cd public
python -m http.server 8000
# or
npx serve
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

## Troubleshooting

### Common Issues

**Functions deployment fails**
```bash
# Ensure you're on Blaze plan
firebase projects:list

# Check functions logs
firebase functions:log
```

**Stripe webhook not receiving events**
- Verify webhook URL matches deployed function
- Check webhook secret in environment variables
- Review Stripe webhook delivery logs

**Firestore permission denied**
- Check security rules are deployed
- Verify user authentication status
- Ensure user is participant in deal

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [github.com/ataymia/MoneyGood/issues](https://github.com/ataymia/MoneyGood/issues)
- Email: support@moneygood.app

---

Built with ❤️ using Firebase and Stripe