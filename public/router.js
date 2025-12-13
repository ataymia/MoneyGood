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
    
    // Check auth requirement
    if (this.authRequired.has(route)) {
      const user = window.store?.getState()?.user;
      if (!user) {
        this.navigate('/login');
        return;
      }
    }

    // Find and execute handler
    const handler = this.routes.get(route);
    if (handler) {
      this.currentRoute = route;
      await handler(params);
    } else {
      // Try to match dynamic routes
      const dynamicHandler = this.findDynamicRoute(hash);
      if (dynamicHandler) {
        await dynamicHandler.handler(dynamicHandler.params);
      } else {
        this.navigate('/');
      }
    }
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
        return { handler, params };
      }
    }
    
    return null;
  }

  getParam(key) {
    return this.currentParams?.[key];
  }
}

export const router = new Router();
