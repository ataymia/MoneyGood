// Simple state management and local storage helpers

class Store {
  constructor() {
    this.state = {
      user: null,
      theme: this.getTheme(),
      deals: [],
      notifications: [],
      loading: false
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Theme management
  getTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  setTheme(theme) {
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
    this.setState({ theme });
  }

  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  // Local storage helpers
  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  getFromStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Failed to get from storage:', e);
      return null;
    }
  }

  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to remove from storage:', e);
    }
  }

  // Session storage for temporary data
  saveToSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to session:', e);
    }
  }

  getFromSession(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Failed to get from session:', e);
      return null;
    }
  }
}

export const store = new Store();

// Apply theme on load
store.applyTheme(store.state.theme);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (store.state.theme === 'system') {
    store.applyTheme('system');
  }
});
