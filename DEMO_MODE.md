# Demo Mode Documentation

## Overview

The application is currently running in **Demo Mode** with a mock Firebase implementation. This allows the app to function fully without requiring Firebase configuration or creating real transactions.

## What's Changed

1. **firebase-mock.js**: A new mock Firebase module that simulates all Firebase services (Auth, Firestore, Functions)
2. **Import Changes**: All files now import from `firebase-mock.js` instead of `firebase.js`
3. **Demo Data**: Pre-populated with sample deals, users, and notifications

## Demo Features

### Authentication
- **Any email/password combination works** for both login and signup
- Demo user: `demo@moneygood.app` (or any email)
- No real Firebase Authentication is used

### Data
- **3 sample deals** with different statuses (active, pending_funding, completed)
- **3 sample notifications**
- **1 demo user** profile
- All data is stored in memory and resets on page reload

### Functions
- All Firebase Cloud Functions are mocked
- API calls log to console but don't perform real operations
- Stripe checkout URLs are mock URLs

## Switching Back to Firebase

When you're ready to use real Firebase:

### 1. Configure Firebase

Update `firebase.js` with your actual Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 2. Update Import Statements

Replace all instances of `firebase-mock.js` with `firebase.js`:

**Files to update:**
- `app.js` (line 2 and 13)
- `api.js` (line 2)
- `ui/auth.js` (line 2)
- `ui/dashboard.js` (line 2)
- `ui/dealDetail.js` (line 2)
- `ui/dealsList.js` (line 2)
- `ui/notifications.js` (line 2)
- `ui/settings.js` (line 2)
- `ui/account.js` (line 6)

**Find and replace:**
```bash
# From project root:
find . -name "*.js" -type f -exec sed -i "s/firebase-mock\.js/firebase.js/g" {} \;
```

Or manually change each file:
```javascript
// FROM:
import { ... } from '../firebase-mock.js';

// TO:
import { ... } from '../firebase.js';
```

### 3. Restore Firebase Auth Functions (account.js only)

In `ui/account.js`, replace the mock functions with real Firebase imports:

```javascript
// FROM:
const updateProfile = async (user, data) => { console.log('Mock updateProfile:', data); };
const updatePassword = async (user, password) => { console.log('Mock updatePassword'); };
const deleteUser = async (user) => { console.log('Mock deleteUser'); };

// TO:
import { updateProfile, updatePassword, deleteUser } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
```

### 4. Update Demo Banner

In `app.js`, change the banner from demo mode to Firebase config warning if needed:

```javascript
// Replace showDemoModeBanner() with showFirebaseConfigBanner()
${showFirebaseConfigBanner()}
```

## Testing Demo Mode

1. Start the development server:
   ```bash
   npm run dev:frontend
   ```

2. Open http://localhost:8000

3. Click "Get Started Free" or "Login"

4. Use any email/password to login (e.g., `test@example.com` / `password`)

5. Explore the dashboard with sample deals

## Demo Data Details

### Sample Deals

1. **Website Development Project** (Active)
   - Type: Both (cash + goods)
   - Amount: $5,000
   - Status: Active, both parties funded

2. **Laptop Purchase** (Pending Funding)
   - Type: Goods only
   - Description: MacBook Pro 16"
   - Status: Awaiting funding

3. **Consulting Services** (Completed)
   - Type: Cash only
   - Amount: $2,000
   - Status: Successfully completed

### Limitations

- Data resets on page reload
- No real Stripe integration
- No real Firebase Authentication
- No persistent storage
- Mock functions only log to console

## Support

For issues or questions about switching back to Firebase, see:
- [FIREBASE_CONFIG.md](./FIREBASE_CONFIG.md) for detailed Firebase setup
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for architecture overview
