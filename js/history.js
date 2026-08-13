/* FIXORA - History Module */

const History = {
  documents: [],
  currentPage: 1,
  searchQuery: '',
  filterType: 'all',
  filterStatus: 'all',
  sortField: 'created_at',
  sortDir: 'desc',

  async init() {
    if (!Auth.requireAuth()) return;

    Dashboard.renderSidebar();
    Dashboard.setupTheme();

    const params = new URLSearchParams(window.location.search);
    this.filterType = params.get('type') || 'all';

    await this.loadDocuments();
    this.render();
    this.setupEventListeners();
    this.setupSearch();
    this.updateFilterTabs();
  },

  async loadDocuments() {
    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      let query = supabase.from('documents').select('*').eq('user_id', userId);
      if (this.filterType !== 'all') {
        query = query.eq('type', this.filterType);
      }

      const result = await query.order('created_at', { ascending: false });
      this.documents = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error('Error loading documents:', e);
      this.documents = [];
    }
  },

  updateFilterTabs() {
    document.querySelectorAll('.tab[data-filter]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === this.filterType);
    });
  },

  render() {
    const container = document.getElementById('history-table-container');
    if (!container) return;

    let filtered = [...this.documents];

    if (this.filterType !== 'all') {
      filtered = filtered.filter(d => d.type === this.filterType);
    }

    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === this.filterStatus);
    }

    if (this.searchQuery) {
      filtered = Utils.searchItems(filtered, this.searchQuery, [
        'number', 'client_data.name', 'client_data.last_name', 'client_data.email',
        'client_data.phone', 'client_data.company', 'client_data.document'
      ]);
    }

    filtered = Utils.sortItems(filtered, this.sortField, this.sortDir);

    const paginated = Utils.paginate(filtered, this.currentPage, 15);

    this.renderStats(filtered);

    if (!paginated.items.length) {
      container.innerHTML = '';
      container.appendChild(Components.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        title: this.searchQuery ? 'Sin resultados' : 'Sin documentos',
        description: this.searchQuery ? 'Intenta con otros términos' : 'Crea tu primer documento'
      }));
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th class="table-sortable" data-sort="number">Número</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th class="table-sortable" data-sort="total">Total</th>
              <th>Estado</th>
              <th class="table-sortable" data-sort="created_at">Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.items.map(doc => this.renderRow(doc)).join('')}
          </tbody>
        </table>
      </div>
    `;

    const paginationEl = document.getElementById('history-pagination');
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.appendChild(Components.pagination(paginated.currentPage, paginated.totalPages, (page) => {
        this.currentPage = page;
        this.render();
      }));
    }

    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.sortField === field) {
          this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortField = field;
          this.sortDir = 'asc';
        }
        this.render();
      });
    });
  },

  renderRow(doc) {
    const client = doc.client_data || {};
    const clientName = `${client.name || ''} ${client.last_name || ''}`.trim() || 'Sin cliente';
    const isInvoice = doc.type === 'invoice';
    const statusClasses = {
      draft: 'badge-neutral',
      sent: 'badge-info',
      paid: 'badge-success',
      cancelled: 'badge-danger',
      pending: 'badge-warning'
    };

    return `
      <tr>
        <td><strong>${Utils.sanitize(doc.number || '-')}</strong></td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div class="avatar avatar-sm" style="background:${Utils.generateColor(client.name || '')}">${Utils.getInitials(client.name)}</div>
            <div>
              <div class="text-sm font-medium">${Utils.sanitize(clientName)}</div>
              <div class="text-xs text-tertiary">${Utils.sanitize(client.company || '')}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${isInvoice ? 'badge-primary' : 'badge-info'}">${isInvoice ? 'Factura' : 'Cotización'}</span></td>
        <td><strong>${Utils.formatCurrency(doc.total)}</strong></td>
        <td><span class="badge ${statusClasses[doc.status] || 'badge-neutral'}">${Utils.capitalize(doc.status || 'draft')}</span></td>
        <td class="text-secondary">${Utils.formatDate(doc.created_at)}</td>
        <td>
          <div style="display:flex;gap:var(--space-1)">
            <button class="btn btn-ghost btn-sm btn-icon" data-tooltip="Ver" onclick="window.location.href='detalle.html?id=${doc.id}'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" data-tooltip="Editar" onclick="window.location.href='${isInvoice ? 'factura' : 'cotizacion'}.html?edit=${doc.id}'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" data-tooltip="Eliminar" onclick="History.deleteDocument('${doc.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderStats(filtered) {
    const statsEl = document.getElementById('history-stats');
    if (!statsEl) return;

    const invoices = filtered.filter(d => d.type === 'invoice');
    const quotes = filtered.filter(d => d.type === 'quote');
    const totalRevenue = invoices.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);

    statsEl.innerHTML = `
      <div class="history-stat">
        <div class="history-stat-value">${filtered.length}</div>
        <div class="history-stat-label">Total documentos</div>
      </div>
      <div class="history-stat">
        <div class="history-stat-value">${invoices.length}</div>
        <div class="history-stat-label">Facturas</div>
      </div>
      <div class="history-stat">
        <div class="history-stat-value">${quotes.length}</div>
        <div class="history-stat-label">Cotizaciones</div>
      </div>
      <div class="history-stat">
        <div class="history-stat-value">${Utils.formatCurrency(totalRevenue)}</div>
        <div class="history-stat-label">Ingresos totales</div>
      </div>
    `;
  },

  setupEventListeners() {
    document.querySelectorAll('.tab[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.filterType = tab.dataset.filter;
        this.currentPage = 1;
        this.updateFilterTabs();
        this.render();
      });
    });

    document.getElementById('status-filter')?.addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.currentPage = 1;
      this.render();
    });
  },

  setupSearch() {
    const input = document.getElementById('history-search');
    if (!input) return;
    input.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1;
      this.render();
    }, 250));
  },

  async deleteDocument(docId) {
    const confirmed = await Components.confirm({
      title: 'Eliminar documento',
      message: '¿Estás seguro? Esta acción no se puede deshacer.',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await Components.withLoading('Eliminando documento...', async () => {
        await supabase.from('documents').eq('id', docId).delete();
        await this.loadDocuments();
        this.render();
      });
    } catch (e) {
      Components.toast({ type: 'error', message: 'Error al eliminar' });
      return;
    }

    Components.toast({ type: 'success', message: 'Documento eliminado' });

  }
};

window.History = History;
