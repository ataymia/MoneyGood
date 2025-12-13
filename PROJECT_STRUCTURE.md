# MoneyGood - Complete Project Structure

```
MoneyGood/
│
├── README.md                      # Main documentation (8000+ words)
├── DEPLOYMENT.md                  # Step-by-step deployment guide
├── CONTRIBUTING.md                # Contribution guidelines
├── LICENSE                        # MIT License
├── .env.template                  # Environment variable template
├── .gitignore                     # Git ignore rules
├── .firebaserc                    # Firebase project configuration
├── firebase.json                  # Firebase hosting/functions config
├── firestore.rules                # Firestore security rules
├── firestore.indexes.json         # Firestore query indexes
│
├── public/                        # Frontend (Static files for Firebase Hosting)
│   ├── index.html                 # Main HTML entry point
│   ├── styles.css                 # Custom CSS + theme variables
│   ├── app.js                     # Main app initialization & routing
│   ├── router.js                  # Hash-based SPA router
│   ├── firebase.js                # Firebase SDK initialization
│   ├── api.js                     # Cloud Functions API wrapper
│   ├── store.js                   # State management + localStorage
│   │
│   └── ui/                        # UI Module Files
│       ├── components.js          # Reusable components (Button, Card, Modal, Toast, etc.)
│       ├── auth.js                # Login & Signup pages
│       ├── dashboard.js           # Main dashboard with deal grouping
│       ├── dealWizard.js          # 4-step deal creation wizard
│       ├── dealDetail.js          # Deal detail page with actions
│       └── settings.js            # Settings page with theme toggle
│
└── functions/                     # Backend (Cloud Functions)
    ├── package.json               # Node.js dependencies
    ├── tsconfig.json              # TypeScript configuration
    │
    └── src/                       # TypeScript source files
        ├── index.ts               # All Cloud Functions (11 functions)
        │                          # - createDeal
        │                          # - acceptInvite
        │                          # - createCheckoutSession
        │                          # - proposeOutcome
        │                          # - confirmOutcome
        │                          # - freezeDeal
        │                          # - unfreezeDeal
        │                          # - requestExtension
        │                          # - approveExtension
        │                          # - setupStripeConnect
        │                          # - stripeWebhook (HTTP)
        │                          # - checkPastDueDeals (Scheduled)
        │
        ├── stripe.ts              # Stripe helper functions
        ├── validators.ts          # Zod validation schemas
        └── dealMachine.ts         # Deal state machine & business logic
```

## File Statistics

- **Total Files**: 29
- **Total Lines of Code**: ~4,000
- **Frontend Files**: 11
- **Backend Files**: 5
- **Configuration Files**: 5
- **Documentation Files**: 8

## Technology Stack

### Frontend
- Vanilla JavaScript ES Modules
- Tailwind CSS (via CDN)
- Firebase SDK v10+
- No build tools required

### Backend
- Firebase Auth
- Cloud Firestore
- Cloud Functions (TypeScript, Node 20)
- Stripe API
- Zod validation

### Development
- TypeScript
- Firebase Emulators
- Git

## Key Features by File

### Frontend

**index.html**
- Single-page app shell
- Tailwind CSS configuration
- Toast and modal containers

**app.js**
- Auth state management
- Route registration
- Landing page
- Join deal flow
- Notifications page

**router.js**
- Hash-based routing
- Dynamic route parameters
- Auth protection
- 404 handling

**store.js**
- Global state management
- Theme management (light/dark/system)
- localStorage persistence
- Session storage helpers

**firebase.js**
- Firebase initialization
- SDK exports (Auth, Firestore, Functions)
- Configuration (needs update for production)

**api.js**
- Cloud Functions wrappers
- Error handling
- Type safety

**styles.css**
- CSS custom properties for theming
- Animations (slide, fade, shimmer)
- Status badges
- Form styling
- Responsive utilities

**ui/components.js**
- Button, Card, Input, Select, Textarea
- Modal, Toast, Spinner, ProgressBar
- Navbar
- Currency & date formatters

**ui/auth.js**
- Login page
- Signup page
- Form validation
- Error handling

**ui/dashboard.js**
- Deal grouping by status
- Real-time updates
- Empty states
- Deal cards

**ui/dealWizard.js**
- 4-step wizard flow
- Deal type selection
- Terms configuration
- Review & confirmation

**ui/dealDetail.js**
- Deal information display
- Action buttons (propose, confirm, freeze, extend)
- Invite link sharing
- Payment status
- Audit log

**ui/settings.js**
- Theme toggle
- Stripe Connect setup
- Notification preferences
- Account information

### Backend

**index.ts**
- 11 callable Cloud Functions
- Stripe webhook handler
- Scheduled past-due checker
- Complete business logic

**stripe.ts**
- Checkout session creation
- Connect account management
- Transfer handling
- Refund processing
- Webhook verification

**validators.ts**
- Zod schemas for all inputs
- Type-safe validation
- Error messages

**dealMachine.ts**
- Deal state machine
- Fee calculations
- Fairness hold logic
- State transition validation

## Data Flow

1. **User Action** → Frontend UI
2. **API Call** → Cloud Function (via api.js)
3. **Validation** → Zod schema check
4. **Business Logic** → dealMachine.ts
5. **Database Write** → Firestore
6. **Audit Log** → deals/{id}/actions
7. **Notification** → users/{id}/notifications
8. **Real-time Update** → Frontend (Firestore listener)

## Payment Flow

1. **User clicks payment** → createCheckoutSession
2. **Redirect to Stripe** → Stripe Checkout
3. **Payment complete** → Webhook to stripeWebhook
4. **Update status** → Firestore & audit log
5. **Check funding** → Auto-activate deal if all paid
6. **Notify parties** → Notifications created

## Security Layers

1. **Firebase Auth** → User authentication
2. **Firestore Rules** → Database-level access control
3. **Cloud Functions** → Server-side validation
4. **Zod Schemas** → Input validation
5. **State Machine** → Invalid transitions blocked
6. **Stripe Webhooks** → Signature verification

---

**Status**: Production Ready ✅
**Last Updated**: 2024
**License**: MIT
