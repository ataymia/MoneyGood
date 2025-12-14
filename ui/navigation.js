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
        
        <nav class="space-y-2">
          <a href="#/app" class="nav-item ${currentPath === '/app' ? 'active' : ''}">
            <span class="text-xl">📊</span>
            <span>Dashboard</span>
          </a>
          <a href="#/deals" class="nav-item ${currentPath === '/deals' ? 'active' : ''}">
            <span class="text-xl">📋</span>
            <span>All Deals</span>
          </a>
          <a href="#/deal/new" class="nav-item ${currentPath.startsWith('/deal/new') ? 'active' : ''}">
            <span class="text-xl">➕</span>
            <span>Create Deal</span>
          </a>
          <a href="#/notifications" class="nav-item ${currentPath === '/notifications' ? 'active' : ''}">
            <span class="text-xl">🔔</span>
            <span>Notifications</span>
          </a>
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
      <a href="#/notifications" class="mobile-nav-item ${currentPath === '/notifications' ? 'active' : ''}">
        <span class="text-2xl">🔔</span>
        <span>Alerts</span>
      </a>
      <a href="#/settings" class="mobile-nav-item ${currentPath === '/settings' || currentPath === '/account' ? 'active' : ''}">
        <span class="text-2xl">⚙️</span>
        <span>More</span>
      </a>
    </div>
  `;
}
