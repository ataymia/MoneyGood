import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '../firebase.js';
import { Navbar, Input, showToast } from './components.js';
import { router } from '../router.js';

export function renderLogin() {
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user: null })}
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 to-navy-50 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
          <p class="text-navy-600 dark:text-navy-400">Login to access your deals</p>
        </div>
        
        <form id="login-form" class="space-y-4">
          ${Input({ 
            id: 'email', 
            type: 'email', 
            label: 'Email', 
            placeholder: 'you@example.com', 
            required: true 
          })}
          
          ${Input({ 
            id: 'password', 
            type: 'password', 
            label: 'Password', 
            placeholder: '••••••••', 
            required: true 
          })}
          
          <button 
            type="submit" 
            class="w-full btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            Login
          </button>
        </form>
        
        <p class="mt-6 text-center text-sm text-navy-600 dark:text-navy-400">
          Don't have an account? 
          <a href="#/signup" class="text-emerald-600 font-semibold hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      await signInWithEmailAndPassword(window.auth, email, password);
      showToast('Login successful!', 'success');
      router.navigate('/app');
    } catch (error) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed. Please try again.', 'error');
    }
  });
}

export function renderSignup() {
  const content = document.getElementById('content');
  content.innerHTML = `
    ${Navbar({ user: null })}
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 to-navy-50 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold gradient-text mb-2">Create Account</h1>
          <p class="text-navy-600 dark:text-navy-400">Join MoneyGood today</p>
        </div>
        
        <form id="signup-form" class="space-y-4">
          ${Input({ 
            id: 'email', 
            type: 'email', 
            label: 'Email', 
            placeholder: 'you@example.com', 
            required: true 
          })}
          
          ${Input({ 
            id: 'password', 
            type: 'password', 
            label: 'Password', 
            placeholder: '••••••••', 
            required: true 
          })}
          
          ${Input({ 
            id: 'confirmPassword', 
            type: 'password', 
            label: 'Confirm Password', 
            placeholder: '••••••••', 
            required: true 
          })}
          
          <button 
            type="submit" 
            class="w-full btn-primary bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
          >
            Sign Up
          </button>
        </form>
        
        <p class="mt-6 text-center text-sm text-navy-600 dark:text-navy-400">
          Already have an account? 
          <a href="#/login" class="text-emerald-600 font-semibold hover:underline">Login</a>
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    try {
      await createUserWithEmailAndPassword(window.auth, email, password);
      showToast('Account created successfully!', 'success');
      router.navigate('/app');
    } catch (error) {
      console.error('Signup error:', error);
      showToast(error.message || 'Signup failed. Please try again.', 'error');
    }
  });
}
