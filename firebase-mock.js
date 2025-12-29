// Mock Firebase module for demo/development mode
// This allows the app to run without actual Firebase configuration

// Demo user data
const demoUser = {
  uid: 'demo-user-123',
  email: 'demo@moneygood.app',
  displayName: 'Demo User',
  emailVerified: true,
  metadata: {
    creationTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastSignInTime: new Date().toISOString()
  }
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

// Helper to convert Date to Firestore timestamp format
function toTimestamp(date) {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
    toDate: () => date
  };
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
      createdAt: toTimestamp(new Date()),
      updatedAt: toTimestamp(new Date())
    }
  },
  deals: {
    'deal-1': {
      id: 'deal-1',
      title: 'Website Development Project',
      description: 'Build a responsive e-commerce website with payment integration',
      type: 'both',
      dealType: 'both',
      dealAmount: 5000,
      goodsDescription: 'Complete website with admin panel',
      fairnessHoldAmount: 500,
      dealDate: toTimestamp(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      status: 'active',
      createdBy: 'demo-user-123',
      creatorUid: 'demo-user-123',
      creatorEmail: 'demo@moneygood.app',
      participantUid: 'partner-456',
      participantEmail: 'partner@example.com',
      participants: ['demo-user-123', 'partner-456'],
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
      createdAt: toTimestamp(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
      updatedAt: toTimestamp(new Date())
    },
    'deal-2': {
      id: 'deal-2',
      title: 'Laptop Purchase Agreement',
      description: 'MacBook Pro 16" with M3 chip - verified seller with escrow protection',
      type: 'goods',
      dealType: 'goods',
      goodsDescription: 'MacBook Pro 16", Space Gray, 32GB RAM, 1TB SSD, AppleCare+ included',
      fairnessHoldAmount: 300,
      dealDate: toTimestamp(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: 'pending_funding',
      createdBy: 'demo-user-123',
      creatorUid: 'demo-user-123',
      creatorEmail: 'demo@moneygood.app',
      participantUid: 'seller-789',
      participantEmail: 'seller@example.com',
      participants: ['demo-user-123', 'seller-789'],
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
      createdAt: toTimestamp(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      updatedAt: toTimestamp(new Date())
    },
    'deal-3': {
      id: 'deal-3',
      title: 'Business Strategy Consultation',
      description: 'Comprehensive business strategy consultation - 10 hours of expert analysis',
      type: 'cash',
      dealType: 'cash',
      dealAmount: 2000,
      fairnessHoldAmount: 200,
      dealDate: toTimestamp(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
      status: 'completed',
      createdBy: 'consultant-321',
      creatorUid: 'consultant-321',
      creatorEmail: 'consultant@example.com',
      participantUid: 'demo-user-123',
      participantEmail: 'demo@moneygood.app',
      participants: ['consultant-321', 'demo-user-123'],
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
        displayName: 'Expert Consultant',
        role: 'seller',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      outcome: 'success',
      frozen: false,
      completedAt: toTimestamp(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      createdAt: toTimestamp(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      updatedAt: toTimestamp(new Date())
    },
    'deal-4': {
      id: 'deal-4',
      title: 'Freelance Web Design Package',
      description: 'Custom website design with 3 revision rounds and source files',
      type: 'cash',
      dealType: 'cash',
      dealAmount: 1500,
      fairnessHoldAmount: 150,
      dealDate: toTimestamp(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
      status: 'active',
      createdBy: 'designer-555',
      creatorUid: 'designer-555',
      creatorEmail: 'designer@creative.com',
      participantUid: 'demo-user-123',
      participantEmail: 'demo@moneygood.app',
      participants: ['designer-555', 'demo-user-123'],
      partyA: {
        userId: 'designer-555',
        email: 'designer@creative.com',
        displayName: 'Creative Designer',
        role: 'seller',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      partyB: {
        userId: 'demo-user-123',
        email: 'demo@moneygood.app',
        displayName: 'Demo User',
        role: 'buyer',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      frozen: false,
      createdAt: toTimestamp(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
      updatedAt: toTimestamp(new Date())
    },
    'deal-5': {
      id: 'deal-5',
      title: 'Gaming PC Components Bundle',
      description: 'RTX 4080, AMD Ryzen 9, 32GB RAM, 2TB NVMe - brand new sealed',
      type: 'goods',
      dealType: 'goods',
      goodsDescription: 'Complete gaming PC components: NVIDIA RTX 4080, AMD Ryzen 9 7950X, 32GB DDR5 RAM, 2TB Gen4 NVMe SSD',
      fairnessHoldAmount: 400,
      dealDate: toTimestamp(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
      status: 'active',
      createdBy: 'demo-user-123',
      creatorUid: 'demo-user-123',
      creatorEmail: 'demo@moneygood.app',
      participantUid: 'gamer-999',
      participantEmail: 'gamer@pcbuild.com',
      participants: ['demo-user-123', 'gamer-999'],
      partyA: {
        userId: 'demo-user-123',
        email: 'demo@moneygood.app',
        displayName: 'Demo User',
        role: 'seller',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      partyB: {
        userId: 'gamer-999',
        email: 'gamer@pcbuild.com',
        displayName: 'PC Enthusiast',
        role: 'buyer',
        setupFeePaid: true,
        fairnessHoldPaid: true
      },
      frozen: false,
      createdAt: toTimestamp(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      updatedAt: toTimestamp(new Date())
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
      createdAt: toTimestamp(new Date(Date.now() - 2 * 60 * 60 * 1000))
    },
    'notif-2': {
      id: 'notif-2',
      userId: 'demo-user-123',
      type: 'deal_reminder',
      title: 'Deal Due Soon',
      message: 'Your deal "Laptop Purchase Agreement" is due in 7 days',
      dealId: 'deal-2',
      read: false,
      createdAt: toTimestamp(new Date(Date.now() - 24 * 60 * 60 * 1000))
    },
    'notif-3': {
      id: 'notif-3',
      userId: 'demo-user-123',
      type: 'deal_completed',
      title: 'Deal Completed Successfully',
      message: 'Your deal "Business Strategy Consultation" has been completed successfully',
      dealId: 'deal-3',
      read: true,
      createdAt: toTimestamp(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
    },
    'notif-4': {
      id: 'notif-4',
      userId: 'demo-user-123',
      type: 'deal_action',
      title: 'New Deal Invitation',
      message: 'Creative Designer invited you to join "Freelance Web Design Package"',
      dealId: 'deal-4',
      read: false,
      createdAt: toTimestamp(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
    },
    'notif-5': {
      id: 'notif-5',
      userId: 'demo-user-123',
      type: 'deal_reminder',
      title: 'Deal Starts Soon',
      message: 'Your deal "Gaming PC Components Bundle" starts in 3 days',
      dealId: 'deal-5',
      read: false,
      createdAt: toTimestamp(new Date(Date.now() - 12 * 60 * 60 * 1000))
    }
  }
};

export const db = {
  collection: () => ({ /* mock collection */ }),
  doc: () => ({ /* mock doc */ })
};

export function collection(db, ...pathSegments) {
  // Handle both collection(db, 'collectionName') and collection(db, 'parent', 'id', 'subcollection')
  if (pathSegments.length === 1) {
    return { _collectionName: pathSegments[0], _path: pathSegments };
  } else {
    // For subcollections like collection(db, 'users', userId, 'notifications')
    return { _collectionName: pathSegments[pathSegments.length - 1], _path: pathSegments, _isSubcollection: true };
  }
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
  const collectionPath = queryRef._path || queryRef._query?._path || [];
  const constraints = queryRef._constraints || [];
  
  let collectionData = {};
  
  // Handle subcollections
  if (collectionPath.length > 1 && queryRef._isSubcollection) {
    // For subcollections like ['users', 'demo-user-123', 'notifications']
    // Check if we have notifications for this user
    if (collectionPath[0] === 'users' && collectionPath[2] === 'notifications') {
      const userId = collectionPath[1];
      // Filter notifications by userId
      const allNotifications = mockData.notifications || {};
      collectionData = Object.fromEntries(
        Object.entries(allNotifications).filter(([id, notif]) => notif.userId === userId)
      );
    }
  } else {
    // Regular top-level collection
    collectionData = mockData[collectionName] || {};
  }
  
  // Filter data based on where clauses
  let filteredEntries = Object.entries(collectionData);
  
  constraints.forEach(constraint => {
    if (constraint._type === 'where') {
      const { field, operator, value } = constraint;
      filteredEntries = filteredEntries.filter(([id, data]) => {
        const fieldValue = data[field];
        switch (operator) {
          case '==':
            return fieldValue === value;
          case '!=':
            return fieldValue !== value;
          case '>':
            return fieldValue > value;
          case '>=':
            return fieldValue >= value;
          case '<':
            return fieldValue < value;
          case '<=':
            return fieldValue <= value;
          case 'array-contains':
            return Array.isArray(fieldValue) && fieldValue.includes(value);
          default:
            return true;
        }
      });
    }
  });
  
  // Sort data based on orderBy clauses
  constraints.forEach(constraint => {
    if (constraint._type === 'orderBy') {
      const { field, direction } = constraint;
      filteredEntries.sort(([aId, aData], [bId, bData]) => {
        const aValue = aData[field];
        const bValue = bData[field];
        
        // Handle timestamp objects
        const aTime = aValue?.seconds || aValue?.getTime?.() / 1000 || 0;
        const bTime = bValue?.seconds || bValue?.getTime?.() / 1000 || 0;
        
        if (direction === 'desc') {
          return bTime - aTime;
        }
        return aTime - bTime;
      });
    }
  });
  
  const docs = filteredEntries.map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true
  }));
  
  // Make the snapshot iterable with forEach
  const snapshot = {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: function(callback) {
      docs.forEach(callback);
    }
  };
  
  return snapshot;
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
  const id = 'mock-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
  
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
    _path: collectionRef._path,
    _isSubcollection: collectionRef._isSubcollection,
    _constraints: constraints 
  };
}

export function where(field, operator, value) {
  return { _type: 'where', field, operator, value };
}

export function orderBy(field, direction = 'asc') {
  return { _type: 'orderBy', field, direction };
}

export function onSnapshot(queryRef, callback, errorCallback) {
  // Immediately call with current data
  const collectionName = queryRef._collectionName || queryRef._query?._collectionName || queryRef._path?.[0];
  const collectionPath = queryRef._path || queryRef._query?._path || [];
  const constraints = queryRef._constraints || [];
  
  let collectionData = {};
  
  // Handle subcollections
  if (collectionPath.length > 1 && queryRef._isSubcollection) {
    // For subcollections like ['users', 'demo-user-123', 'notifications']
    if (collectionPath[0] === 'users' && collectionPath[2] === 'notifications') {
      const userId = collectionPath[1];
      // Filter notifications by userId
      const allNotifications = mockData.notifications || {};
      collectionData = Object.fromEntries(
        Object.entries(allNotifications).filter(([id, notif]) => notif.userId === userId)
      );
    }
  } else {
    collectionData = mockData[collectionName] || {};
  }
  
  // Apply constraints
  let filteredEntries = Object.entries(collectionData);
  
  constraints.forEach(constraint => {
    if (constraint._type === 'where') {
      const { field, operator, value } = constraint;
      filteredEntries = filteredEntries.filter(([id, data]) => {
        const fieldValue = data[field];
        switch (operator) {
          case '==':
            return fieldValue === value;
          case 'array-contains':
            return Array.isArray(fieldValue) && fieldValue.includes(value);
          default:
            return true;
        }
      });
    } else if (constraint._type === 'orderBy') {
      const { field, direction } = constraint;
      filteredEntries.sort(([aId, aData], [bId, bData]) => {
        const aValue = aData[field];
        const bValue = bData[field];
        const aTime = aValue?.seconds || aValue?.getTime?.() / 1000 || 0;
        const bTime = bValue?.seconds || bValue?.getTime?.() / 1000 || 0;
        
        if (direction === 'desc') {
          return bTime - aTime;
        }
        return aTime - bTime;
      });
    }
  });
  
  const docs = filteredEntries.map(([id, data]) => ({
    id,
    data: () => data,
    exists: () => true
  }));
  
  setTimeout(() => {
    callback({
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: function(cb) {
        docs.forEach(cb);
      }
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
        
      case 'refreshConnectStatus':
        return { 
          data: { 
            connected: true, 
            status: {
              detailsSubmitted: true,
              chargesEnabled: true,
              payoutsEnabled: true,
            },
            accountId: 'acct_mock123',
          } 
        };
        
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
