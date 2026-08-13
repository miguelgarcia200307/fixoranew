/* FIXORA - Global Search */

const GlobalSearch = {
  isOpen: false,
  overlay: null,
  results: [],
  selectedIndex: 0,

  init() {
    this.overlay = document.getElementById('global-search-overlay');
    if (!this.overlay) return;

    const input = this.overlay.querySelector('.global-search-input');
    if (input) {
      input.addEventListener('input', Utils.debounce((e) => this.search(e.target.value), 200));
      input.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },

  open() {
    if (!this.overlay) return;
    this.isOpen = true;
    this.overlay.classList.add('active');
    const input = this.overlay.querySelector('.global-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    this.renderEmpty();
  },

  close() {
    if (!this.overlay) return;
    this.isOpen = false;
    this.overlay.classList.remove('active');
    this.results = [];
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  async search(query) {
    const resultsContainer = this.overlay.querySelector('.global-search-results');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
      this.renderEmpty();
      return;
    }

    resultsContainer.innerHTML = '<div style="padding:var(--space-6);text-align:center"><div class="spinner"></div></div>';

    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      const [docs, clients, incomes] = await Promise.all([
        supabase.from('documents').select('*').eq('user_id', userId)
          .or(`number.ilike.%${query}%,client_data->>name.ilike.%${query}%,client_data->>last_name.ilike.%${query}%`)
          .limit(5),
        supabase.from('clients').select('*').eq('user_id', userId)
          .or(`name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,company.ilike.%${query}%`)
          .limit(5),
        supabase.from('income_entries').select('*, clients(name,last_name,phone,company)')
          .eq('user_id', userId)
          .or(`code.ilike.%${query}%,device_type.ilike.%${query}%,device_custom_type.ilike.%${query}%,brand.ilike.%${query}%,brand_custom.ilike.%${query}%,model.ilike.%${query}%,serial.ilike.%${query}%,imei1.ilike.%${query}%,imei2.ilike.%${query}%`)
          .limit(5)
      ]);

      this.results = [];

      if (Array.isArray(docs)) {
        docs.forEach(doc => {
          const client = doc.client_data || {};
          this.results.push({
            type: 'document',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
            iconBg: doc.type === 'invoice' ? 'var(--color-primary-50)' : 'var(--color-info-50)',
            iconColor: doc.type === 'invoice' ? 'var(--color-primary)' : 'var(--color-info)',
            title: `${doc.number || 'Sin número'} - ${client.name || ''} ${client.last_name || ''}`.trim(),
            subtitle: `${doc.type === 'invoice' ? 'Factura' : 'Cotización'} · ${Utils.formatCurrency(doc.total)}`,
            url: `detalle.html?id=${doc.id}`
          });
        });
      }

      if (Array.isArray(clients)) {
        clients.forEach(client => {
          this.results.push({
            type: 'client',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            iconBg: 'var(--color-success-50)',
            iconColor: 'var(--color-success)',
            title: `${client.name || ''} ${client.last_name || ''}`.trim(),
            subtitle: `${client.company || client.email || client.phone || 'Sin datos'}`,
            url: 'clientes.html'
          });
        });
      }

      if (Array.isArray(incomes)) {
        incomes.forEach(entry => {
          const client = entry.clients || {};
          this.results.push({
            type: 'income',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>`,
            iconBg: 'var(--color-info-50)',
            iconColor: 'var(--color-info)',
            title: `${entry.code || 'Sin código'} - ${client.name || ''} ${client.last_name || ''}`.trim(),
            subtitle: `${entry.device_type || 'Equipo'} · ${entry.brand_custom || entry.brand || ''} ${entry.model || ''}`.trim(),
            url: `ingresos.html?id=${entry.id}`
          });
        });
      }

      this.selectedIndex = 0;
      this.renderResults();
    } catch (e) {
      console.error('Search error:', e);
      resultsContainer.innerHTML = '<div class="global-search-empty">Error al buscar</div>';
    }
  },

  renderResults() {
    const container = this.overlay.querySelector('.global-search-results');
    if (!container) return;

    if (!this.results.length) {
      container.innerHTML = '<div class="global-search-empty">No se encontraron resultados</div>';
      return;
    }

    container.innerHTML = this.results.map((result, i) => `
      <a href="${result.url}" class="global-search-result ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
        <div class="global-search-result-icon" style="background:${result.iconBg};color:${result.iconColor}">${result.icon}</div>
        <div>
          <div class="global-search-result-title">${Utils.sanitize(result.title)}</div>
          <div class="global-search-result-subtitle">${Utils.sanitize(result.subtitle)}</div>
        </div>
      </a>
    `).join('');

    container.querySelectorAll('.global-search-result').forEach(el => {
      el.addEventListener('click', () => this.close());
    });
  },

  renderEmpty() {
    const container = this.overlay.querySelector('.global-search-results');
    if (container) {
      container.innerHTML = '<div class="global-search-empty">Escribe para buscar documentos, clientes y más</div>';
    }
  },

  handleKeyboard(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1);
      this.renderResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderResults();
    } else if (e.key === 'Enter' && this.results[this.selectedIndex]) {
      e.preventDefault();
      window.location.href = this.results[this.selectedIndex].url;
      this.close();
    }
  }
};

window.GlobalSearch = GlobalSearch;
