// Shared navigation components for consistent UI across pages

export function renderSidebar(user) {
  const currentPath = window.location.hash.slice(1) || '/';
  
  return `
    <aside class="hidden md:block w-64 bg-white dark:bg-navy-800 border-r border-navy-200 dark:border-navy-700">
      <div class="p-6">
        <a href="#/" class="flex items-center gap-2 text-2xl font-bold mb-8">
          <span>💰</span>
          <span class="gradient-text">MoneyGood</span>
        </a>
        
        <nav class="space-y-1">
          <a href="#/app" class="nav-item ${currentPath === '/app' ? 'active' : ''}">
            <span class="text-xl">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="#/deals" class="nav-item ${currentPath === '/deals' ? 'active' : ''}">
            <span class="text-xl">📋</span>
            <span>Agreements</span>
          </a>
          <a href="#/deal/new" class="nav-item ${currentPath.startsWith('/deal/new') ? 'active' : ''}">
            <span class="text-xl">➕</span>
            <span>Create New</span>
          </a>
          <a href="#/templates" class="nav-item ${currentPath === '/templates' ? 'active' : ''}">
            <span class="text-xl">📑</span>
            <span>Templates</span>
          </a>
          <a href="#/marketplace" class="nav-item ${currentPath.startsWith('/marketplace') ? 'active' : ''}">
            <span class="text-xl">🛒</span>
            <span>Marketplace</span>
          </a>
          
          <div class="border-t border-navy-200 dark:border-navy-700 my-3"></div>
          
          <a href="#/people" class="nav-item ${currentPath === '/people' ? 'active' : ''}">
            <span class="text-xl">👥</span>
            <span>People</span>
          </a>
          <a href="#/notifications" class="nav-item ${currentPath === '/notifications' ? 'active' : ''}">
            <span class="text-xl">🔔</span>
            <span>Notifications</span>
          </a>
          
          <div class="border-t border-navy-200 dark:border-navy-700 my-3"></div>
          
          <a href="#/settings" class="nav-item ${currentPath === '/settings' ? 'active' : ''}">
            <span class="text-xl">⚙️</span>
            <span>Settings</span>
          </a>
          <a href="#/account" class="nav-item ${currentPath === '/account' ? 'active' : ''}">
            <span class="text-xl">👤</span>
            <span>Account</span>
          </a>
        </nav>
      </div>
    </aside>
  `;
}

export function renderMobileNav(user) {
  const currentPath = window.location.hash.slice(1) || '/';
  
  return `
    <div class="mobile-nav md:hidden">
      <a href="#/app" class="mobile-nav-item ${currentPath === '/app' ? 'active' : ''}">
        <span class="text-2xl">📊</span>
        <span>Home</span>
      </a>
      <a href="#/deals" class="mobile-nav-item ${currentPath === '/deals' ? 'active' : ''}">
        <span class="text-2xl">📋</span>
        <span>Deals</span>
      </a>
      <a href="#/deal/new" class="mobile-nav-item ${currentPath.startsWith('/deal/new') ? 'active' : ''}">
        <span class="text-2xl">➕</span>
        <span>New</span>
      </a>
      <a href="#/marketplace" class="mobile-nav-item ${currentPath.startsWith('/marketplace') ? 'active' : ''}">
        <span class="text-2xl">🛒</span>
        <span>Market</span>
      </a>
      <a href="#/people" class="mobile-nav-item ${currentPath === '/people' ? 'active' : ''}">
        <span class="text-2xl">👥</span>
        <span>People</span>
      </a>
    </div>
  `;
}
