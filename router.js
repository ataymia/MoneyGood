// Simple SPA hash router

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.authRequired = new Set();
    
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  register(path, handler, requiresAuth = false) {
    this.routes.set(path, handler);
    if (requiresAuth) {
      this.authRequired.add(path);
    }
  }

  navigate(path) {
    window.location.hash = path;
  }

  back() {
    window.history.back();
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    
    // Parse route and params
    const { route, params } = this.parseRoute(hash);
    
    // Try to match exact route first
    let handler = this.routes.get(route);
    let matchedRoute = route;
    
    // If no exact match, try dynamic routes
    if (!handler) {
      const dynamicMatch = this.findDynamicRoute(hash);
      if (dynamicMatch) {
        handler = dynamicMatch.handler;
        matchedRoute = dynamicMatch.route;
        Object.assign(params, dynamicMatch.params);
      }
    }
    
    // If still no match, show 404
    if (!handler) {
      this.render404();
      return;
    }
    
    // Check auth requirement
    if (this.authRequired.has(matchedRoute)) {
      const user = window.store?.getState()?.user;
      if (!user) {
        this.navigate('/login');
        return;
      }
    }

    // Execute handler
    this.currentRoute = matchedRoute;
    this.currentParams = params;
    await handler(params);
  }
  
  render404() {
    const content = document.getElementById('content');
    if (!content) return;
    
    content.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-navy-900 to-navy-800 flex items-center justify-center p-4">
        <div class="text-center">
          <div class="text-8xl mb-6">🔍</div>
          <h1 class="text-4xl font-bold text-white mb-4">Page Not Found</h1>
          <p class="text-xl text-navy-300 mb-8">
            The page you're looking for doesn't exist.
          </p>
          <a 
            href="#/" 
            class="inline-block px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold"
          >
            Go Home
          </a>
        </div>
      </div>
    `;
  }

  parseRoute(hash) {
    const parts = hash.split('?');
    const path = parts[0];
    const queryString = parts[1];
    
    const params = {};
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      });
    }

    return { route: path, params };
  }

  findDynamicRoute(hash) {
    const segments = hash.split('/').filter(s => s);
    
    for (const [route, handler] of this.routes) {
      const routeSegments = route.split('/').filter(s => s);
      
      if (segments.length !== routeSegments.length) continue;
      
      const params = {};
      let match = true;
      
      for (let i = 0; i < routeSegments.length; i++) {
        if (routeSegments[i].startsWith(':')) {
          const paramName = routeSegments[i].slice(1);
          params[paramName] = segments[i];
        } else if (routeSegments[i] !== segments[i]) {
          match = false;
          break;
        }
      }
      
      if (match) {
        return { handler, params, route };
      }
    }
    
    return null;
  }

  getParam(key) {
    return this.currentParams?.[key];
  }
}

export const router = new Router();
