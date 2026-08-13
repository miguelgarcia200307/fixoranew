/* FIXORA - Dashboard */

const Dashboard = {
  stats: {
    invoices: 0,
    quotes: 0,
    clients: 0,
    revenue: 0,
    incomes: 0
  },

  async init() {
    if (!Auth.requireAuth()) return;

    this.renderSidebar();
    this.setupTheme();
    await this.loadStats();
    this.renderStats();
    this.renderRecentActivity();
    this.renderQuickActions();
    this.setupSearch();
  },

  renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    const navItems = [
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', label: 'Dashboard', href: 'dashboard.html', active: currentPath === 'dashboard.html' },
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: 'Facturas', href: 'historial.html?type=invoice' },
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', label: 'Cotizaciones', href: 'historial.html?type=quote' },
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>', label: 'Ingresos', href: 'ingresos.html', active: currentPath === 'ingresos.html' },
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Clientes', href: 'clientes.html' },
      { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', label: 'Configuración', href: 'configuracion.html' }
    ];

    const nav = sidebar.querySelector('.sidebar-nav');
    if (nav) {
      nav.innerHTML = `
        <div class="nav-section-title">Menú</div>
        ${navItems.map(item => `
          <a href="${item.href}" class="nav-item ${item.active ? 'active' : ''}">
            <span class="nav-item-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        `).join('')}
      `;
    }
  },

  setupTheme() {
    const theme = Utils.storage.get(CONFIG.theme.storageKey, CONFIG.theme.default);
    document.documentElement.setAttribute('data-theme', theme);
  },

  async loadStats() {
    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      const [invoices, quotes, clients, incomes] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact' }).eq('user_id', userId).eq('type', 'invoice'),
        supabase.from('documents').select('*', { count: 'exact' }).eq('user_id', userId).eq('type', 'quote'),
        supabase.from('clients').select('*', { count: 'exact' }).eq('user_id', userId),
        supabase.from('income_entries').select('id', { count: 'exact' }).eq('user_id', userId)
      ]);

      this.stats.invoices = Array.isArray(invoices) ? invoices.length : 0;
      this.stats.quotes = Array.isArray(quotes) ? quotes.length : 0;
      this.stats.clients = Array.isArray(clients) ? clients.length : 0;
      this.stats.incomes = Array.isArray(incomes) ? incomes.length : 0;
      this.stats.revenue = Array.isArray(invoices) ? invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0) : 0;
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  },

  renderStats() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="stat-card animate-fade-in-up delay-1">
        <div class="stat-icon primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Facturas</div>
          <div class="stat-value">${this.stats.invoices}</div>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up delay-2">
        <div class="stat-icon info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Cotizaciones</div>
          <div class="stat-value">${this.stats.quotes}</div>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up delay-3">
        <div class="stat-icon success">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Clientes</div>
          <div class="stat-value">${this.stats.clients}</div>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up delay-4">
        <div class="stat-icon warning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Ingresos</div>
          <div class="stat-value">${Utils.formatCurrency(this.stats.revenue)}</div>
        </div>
      </div>
      <div class="stat-card animate-fade-in-up delay-5">
        <div class="stat-icon info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Equipos recibidos</div>
          <div class="stat-value">${this.stats.incomes}</div>
        </div>
      </div>
    `;
  },

  async renderRecentActivity() {
    const container = document.getElementById('recent-documents');
    if (!container) return;

    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      const docs = await supabase.from('documents')
        .select('*, clients(name, last_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!docs || !docs.length) {
        container.innerHTML = '';
        container.appendChild(Components.emptyState({
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
          title: 'Sin documentos recientes',
          description: 'Crea tu primera factura o cotización para comenzar'
        }));
        return;
      }

      container.innerHTML = docs.map(doc => {
        const clientName = doc.clients ? `${doc.clients.name || ''} ${doc.clients.last_name || ''}`.trim() : 'Sin cliente';
        const isInvoice = doc.type === 'invoice';
        return `
          <a href="detalle.html?id=${doc.id}" class="recent-item">
            <div class="recent-item-icon" style="background: ${isInvoice ? 'var(--color-primary-50)' : 'var(--color-info-50)'}; color: ${isInvoice ? 'var(--color-primary)' : 'var(--color-info)'}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="recent-item-content">
              <div class="recent-item-title">${doc.number || 'Sin número'} - ${Utils.sanitize(clientName)}</div>
              <div class="recent-item-subtitle">${Utils.timeAgo(doc.created_at)}</div>
            </div>
            <div class="recent-item-amount">${Utils.formatCurrency(doc.total)}</div>
          </a>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = '<p class="text-secondary text-sm">Error al cargar documentos</p>';
    }
  },

  renderQuickActions() {
    const container = document.getElementById('quick-actions');
    if (!container) return;

    container.innerHTML = `
      <a href="factura.html" class="quick-action-btn">
        <div class="quick-action-icon" style="background: var(--color-primary-50); color: var(--color-primary);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <span class="quick-action-label">Nueva Factura</span>
      </a>
      <a href="cotizacion.html" class="quick-action-btn">
        <div class="quick-action-icon" style="background: var(--color-info-50); color: var(--color-info);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <span class="quick-action-label">Nueva Cotización</span>
      </a>
      <a href="ingresos.html" class="quick-action-btn">
        <div class="quick-action-icon" style="background: var(--color-info-50); color: var(--color-info);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
        </div>
        <span class="quick-action-label">Nuevo ingreso</span>
      </a>
      <a href="clientes.html" class="quick-action-btn">
        <div class="quick-action-icon" style="background: var(--color-success-50); color: var(--color-success);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        </div>
        <span class="quick-action-label">Nuevo Cliente</span>
      </a>
      <a href="historial.html" class="quick-action-btn">
        <div class="quick-action-icon" style="background: var(--color-warning-50); color: var(--color-warning);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <span class="quick-action-label">Historial</span>
      </a>
    `;
  },

  setupSearch() {
    const searchBtn = document.getElementById('global-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        if (window.GlobalSearch) GlobalSearch.open();
      });
    }
  }
};

window.Dashboard = Dashboard;
