// Mock Firebase module for demo/development mode
// This allows the app to run without actual Firebase configuration

// Demo user data
const demoUser = {
  uid: 'demo-user-123',
  email: 'demo@moneygood.app',
  displayName: 'Demo User',
  emailVerified: true
};

// Mock auth state
let currentUser = demoUser;
let authStateListeners = [];

// Mock Auth
export const auth = {
  currentUser: demoUser,
  onAuthStateChanged: (callback) => {
    authStateListeners.push(callback);
    // Immediately call with current user
    setTimeout(() => callback(currentUser), 100);
    return () => {
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
  }
};

export function onAuthStateChanged(auth, callback) {
  return auth.onAuthStateChanged(callback);
}

export async function signInWithEmailAndPassword(auth, email, password) {
  // Mock sign in - always succeeds
  currentUser = { ...demoUser, email };
  authStateListeners.forEach(cb => cb(currentUser));
  return { user: currentUser };
}

export async function createUserWithEmailAndPassword(auth, email, password) {
  // Mock sign up - always succeeds
  currentUser = { ...demoUser, email };
  authStateListeners.forEach(cb => cb(currentUser));
  return { user: currentUser };
}

export async function signOut(auth) {
  // Mock sign out
  currentUser = null;
  authStateListeners.forEach(cb => cb(null));
}

// Mock Firestore
const mockData = {
  users: {
    'demo-user-123': {
      uid: 'demo-user-123',
      email: 'demo@moneygood.app',
      displayName: 'Demo User',
      theme: 'light',
      emailNotifications: true,
      pushNotifications: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  deals: {
    'deal-1': {
      id: 'deal-1',
      title: 'Website Development Project',
      description: 'Build a responsive e-commerce website with payment integration',
      dealType: 'both',
      dealAmount: 5000,
      goodsDescription: 'Complete website with admin panel',
      fairnessHoldAmount: 500,
      dealDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      createdBy: 'demo-user-123',
      partyA: {
        userId: 'demo-user-123',
        email: 'demo@moneygood.app',
        displayName: 'Demo User',
        role: 'buyer',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      partyB: {
        userId: 'partner-456',
        email: 'partner@example.com',
        displayName: 'Partner User',
        role: 'seller',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      frozen: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    },
    'deal-2': {
      id: 'deal-2',
      title: 'Laptop Purchase',
      description: 'MacBook Pro 16" with M3 chip',
      dealType: 'goods',
      goodsDescription: 'MacBook Pro 16", Space Gray, 32GB RAM, 1TB SSD',
      fairnessHoldAmount: 300,
      dealDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending_funding',
      createdBy: 'demo-user-123',
      partyA: {
        userId: 'demo-user-123',
        email: 'demo@moneygood.app',
        displayName: 'Demo User',
        role: 'buyer',
        setupFeePaid: false,
        fairnessHoldPaid: false
      },
      partyB: {
        userId: 'seller-789',
        email: 'seller@example.com',
        displayName: 'Seller User',
        role: 'seller',
        setupFeePaid: false,
        fairnessHoldPaid: false
      },
      frozen: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    },
    'deal-3': {
      id: 'deal-3',
      title: 'Consulting Services',
      description: 'Business strategy consultation - 10 hours',
      dealType: 'cash',
      dealAmount: 2000,
      fairnessHoldAmount: 200,
      dealDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      createdBy: 'consultant-321',
      partyA: {
        userId: 'demo-user-123',
        email: 'demo@moneygood.app',
        displayName: 'Demo User',
        role: 'buyer',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      partyB: {
        userId: 'consultant-321',
        email: 'consultant@example.com',
        displayName: 'Consultant',
        role: 'seller',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      outcome: 'success',
      frozen: false,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  },
  notifications: {
    'notif-1': {
      id: 'notif-1',
      userId: 'demo-user-123',
      type: 'deal_action',
      title: 'Deal Funded',
      message: 'Partner User has paid their setup fee and fairness hold',
      dealId: 'deal-1',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    'notif-2': {
      id: 'notif-2',
      userId: 'demo-user-123',
      type: 'deal_reminder',
      title: 'Deal Due Soon',
      message: 'Your deal "Laptop Purchase" is due in 7 days',
      dealId: 'deal-2',
      read: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    'notif-3': {
      id: 'notif-3',
      userId: 'demo-user-123',
      type: 'deal_completed',
      title: 'Deal Completed',
      message: 'Your deal "Consulting Services" has been completed successfully',
      dealId: 'deal-3',
      read: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  }
};

export const db = {
  collection: () => ({ /* mock collection */ }),
  doc: () => ({ /* mock doc */ })
};

export function collection(db, collectionName) {
  return { _collectionName: collectionName };
}

export function doc(db, ...pathSegments) {
  return { _path: pathSegments };
}

export async function getDoc(docRef) {
  const [collection, id] = docRef._path;
  const data = mockData[collection]?.[id];
  return {
    exists: () => !!data,
    data: () => data,
    id: id
  };
}

export async function getDocs(queryRef) {
  const collectionName = queryRef._collectionName || queryRef._query?._collectionName;
  const collectionData = mockData[collectionName] || {};
  
  const docs = Object.entries(collectionData).map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true
  }));
  
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length
  };
}

export async function setDoc(docRef, data) {
  const [collection, id] = docRef._path;
  if (!mockData[collection]) {
    mockData[collection] = {};
  }
  mockData[collection][id] = { ...data, id };
  console.log('Mock setDoc:', collection, id, data);
}

export async function updateDoc(docRef, data) {
  const [collection, id] = docRef._path;
  if (mockData[collection]?.[id]) {
    mockData[collection][id] = { ...mockData[collection][id], ...data };
  }
  console.log('Mock updateDoc:', collection, id, data);
}

export async function addDoc(collectionRef, data) {
  const collectionName = collectionRef._collectionName;
  const id = 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  if (!mockData[collectionName]) {
    mockData[collectionName] = {};
  }
  
  mockData[collectionName][id] = { ...data, id };
  console.log('Mock addDoc:', collectionName, id, data);
  
  return { id, _path: [collectionName, id] };
}

export function query(collectionRef, ...constraints) {
  return { 
    _query: collectionRef,
    _collectionName: collectionRef._collectionName,
    _constraints: constraints 
  };
}

export function where(field, operator, value) {
  return { _type: 'where', field, operator, value };
}

export function orderBy(field, direction = 'asc') {
  return { _type: 'orderBy', field, direction };
}

export function onSnapshot(queryRef, callback) {
  // Immediately call with current data
  const collectionName = queryRef._collectionName || queryRef._query?._collectionName || queryRef._path?.[0];
  const collectionData = mockData[collectionName] || {};
  
  const docs = Object.entries(collectionData).map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true
  }));
  
  setTimeout(() => {
    callback({
      docs,
      empty: docs.length === 0,
      size: docs.length
    });
  }, 100);
  
  // Return unsubscribe function
  return () => {};
}

export function serverTimestamp() {
  return new Date();
}

// Mock Functions
export const functions = {};

export function httpsCallable(functions, name) {
  return async (data) => {
    console.log('Mock function call:', name, data);
    
    // Mock different function responses
    switch (name) {
      case 'createDeal':
        const dealId = 'deal-' + Date.now();
        const newDeal = {
          id: dealId,
          ...data,
          status: 'pending_invite',
          createdBy: currentUser?.uid || 'demo-user-123',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockData.deals[dealId] = newDeal;
        return { data: { dealId, inviteToken: 'mock-token-' + dealId } };
        
      case 'acceptInvite':
        return { data: { dealId: 'deal-1' } };
        
      case 'createCheckoutSession':
        return { data: { url: 'https://checkout.stripe.com/mock-session' } };
        
      case 'proposeOutcome':
      case 'confirmOutcome':
      case 'freezeDeal':
      case 'unfreezeDeal':
      case 'requestExtension':
      case 'approveExtension':
        return { data: { success: true } };
        
      case 'setupStripeConnect':
        return { data: { url: 'https://connect.stripe.com/mock-setup' } };
        
      default:
        return { data: { success: true } };
    }
  };
}

// Export state
export const firebaseReady = true;
export const firebaseError = null;

export function getFirebase() {
  return { auth, db, functions };
}

console.log('🎭 Mock Firebase initialized - Running in demo mode');
