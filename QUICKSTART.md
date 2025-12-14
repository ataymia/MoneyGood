# MoneyGood - Quick Start Guide (Demo Mode)

## 🎭 Demo Mode is Active

The app is currently running in **demo mode** with mock Firebase. You can explore all features without any real Firebase configuration or transactions.

## 🚀 Getting Started

### 1. Start the Development Server

```bash
npm run dev:frontend
# or
python -m http.server 8000
```

### 2. Open Your Browser

Navigate to: `http://localhost:8000`

### 3. Login with Demo Credentials

**You can use ANY email and password combination!**

Examples:
- Email: `demo@moneygood.app` / Password: `password`
- Email: `test@example.com` / Password: `anything`
- Email: `your@email.com` / Password: `yourpass`

All credentials work because Firebase authentication is mocked.

## 📊 What You'll See

### Demo Data Included

1. **3 Sample Deals**:
   - ✅ Website Development Project (Active, $5,000)
   - ⏳ Laptop Purchase (Pending Funding)
   - ✔️ Consulting Services (Completed, $2,000)

2. **3 Sample Notifications**:
   - Deal funded notification
   - Deal reminder
   - Deal completed

3. **Demo User Profile**:
   - Name: Demo User
   - Email: demo@moneygood.app

### Available Pages

- **Landing Page** (`/`) - Marketing homepage
- **Login** (`#/login`) - Login form
- **Signup** (`#/signup`) - Registration form
- **Dashboard** (`#/app`) - Overview of your deals
- **All Deals** (`#/deals`) - List of all deals
- **Create Deal** (`#/deal/new`) - Deal creation wizard
- **Notifications** (`#/notifications`) - View notifications
- **Settings** (`#/settings`) - App preferences
- **Account** (`#/account`) - User profile settings

## 🔧 How Demo Mode Works

### What's Mocked

- **Firebase Auth**: Login/signup always succeeds
- **Firestore**: In-memory data storage with sample deals
- **Cloud Functions**: Mock API responses for all operations
- **Stripe**: Mock checkout URLs (no real payments)

### What Works

- ✅ Full UI navigation
- ✅ All pages render correctly
- ✅ Demo data displays
- ✅ Form interactions
- ✅ Dark/light theme switching
- ✅ Responsive mobile design

### What Doesn't Work

- ❌ Real user authentication
- ❌ Persistent data storage (resets on reload)
- ❌ Real Stripe payments
- ❌ Actual deal transactions
- ❌ Real-time notifications

## 🔄 Switching to Real Firebase

When ready to use actual Firebase, follow these steps:

1. **Configure Firebase** - Update credentials in `firebase.js`
2. **Update Imports** - See detailed instructions in [`DEMO_MODE.md`](./DEMO_MODE.md)
3. **Deploy Functions** - Deploy Firebase Cloud Functions
4. **Set up Stripe** - Configure Stripe API keys

Full instructions: [`DEMO_MODE.md`](./DEMO_MODE.md)

## 📸 Screenshots

The app includes:
- Beautiful gradient landing page
- Clean login/signup forms
- Interactive dashboard with deal cards
- Comprehensive deal management interface
- Settings and account management

## 🐛 Known Issues (Demo Mode)

1. **Tailwind Warning**: "tailwind is not defined" - This is expected when Tailwind CDN loads. The app still works fine.
2. **Data Persistence**: All data resets when you refresh the page. This is intentional for demo mode.
3. **Stripe Links**: Checkout URLs are mock URLs and won't actually process payments.

## 📚 Additional Documentation

- [`DEMO_MODE.md`](./DEMO_MODE.md) - Detailed demo mode documentation
- [`FIREBASE_CONFIG.md`](./FIREBASE_CONFIG.md) - Firebase setup guide
- [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) - Code architecture
- [`README.md`](./README.md) - Main project documentation

## 💡 Tips

1. **Explore Freely**: You can't break anything in demo mode
2. **Try Everything**: All features are functional
3. **Check Console**: Open browser DevTools to see mock Firebase logs
4. **Mobile View**: The app is fully responsive - try resizing your browser

## ✨ Enjoy MoneyGood!

The app is fully functional in demo mode. Explore, test, and verify all features work before configuring real Firebase.
