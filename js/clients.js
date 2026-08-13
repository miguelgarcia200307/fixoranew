/* FIXORA - Clients Module */

const Clients = {
  clients: [],
  currentPage: 1,
  searchQuery: '',
  sortField: 'created_at',
  sortDir: 'desc',

  async init() {
    if (!Auth.requireAuth()) return;

    Dashboard.renderSidebar();
    Dashboard.setupTheme();
    await this.loadClients();
    this.render();
    this.setupEventListeners();
    this.setupSearch();
  },

  async loadClients() {
    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      const result = await supabase.from('clients')
        .select('*')
        .eq('user_id', userId)
        .order(this.sortField, { ascending: this.sortDir === 'asc' });

      this.clients = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error('Error loading clients:', e);
      this.clients = [];
    }
  },

  render() {
    const container = document.getElementById('clients-grid');
    if (!container) return;

    let filtered = Utils.searchItems(this.clients, this.searchQuery, ['name', 'last_name', 'email', 'phone', 'company', 'document', 'nit']);
    filtered = Utils.sortItems(filtered, this.sortField, this.sortDir);

    const paginated = Utils.paginate(filtered, this.currentPage, 12);

    if (!paginated.items.length) {
      container.innerHTML = '';
      container.appendChild(Components.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        title: this.searchQuery ? 'No se encontraron clientes' : 'Sin clientes',
        description: this.searchQuery ? 'Intenta con otros términos de búsqueda' : 'Agrega tu primer cliente para comenzar',
        action: !this.searchQuery ? { label: 'Nuevo Cliente', onClick: () => this.openCreateModal() } : null
      }));
      return;
    }

    container.innerHTML = `<div class="grid grid-3">${paginated.items.map(client => this.renderClientCard(client)).join('')}</div>`;

    const paginationContainer = document.getElementById('clients-pagination');
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      paginationContainer.appendChild(Components.pagination(paginated.currentPage, paginated.totalPages, (page) => {
        this.currentPage = page;
        this.render();
      }));
    }

    document.getElementById('clients-count').textContent = `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''}`;
  },

  renderClientCard(client) {
    const fullName = `${Utils.sanitize(client.name || '')} ${Utils.sanitize(client.last_name || '')}`.trim();
    return `
      <div class="client-card" data-id="${client.id}">
        <div class="client-card-header">
          <div class="avatar" style="background: ${Utils.generateColor(client.name || '')}">${Utils.getInitials(client.name)}</div>
          <div>
            <div class="client-card-name">${fullName || 'Sin nombre'}</div>
            <div class="client-card-company">${Utils.sanitize(client.company || 'Sin empresa')}</div>
          </div>
        </div>
        <div style="margin-bottom: var(--space-3)">
          ${client.phone ? `<div class="text-xs text-secondary" style="margin-bottom:2px">${Utils.sanitize(client.phone)}</div>` : ''}
          ${client.email ? `<div class="text-xs text-tertiary">${Utils.sanitize(client.email)}</div>` : ''}
        </div>
        <div class="client-card-stats">
          <div class="client-card-stat">
            <div class="client-card-stat-value">${client.total_invoices || 0}</div>
            <div class="client-card-stat-label">Facturas</div>
          </div>
          <div class="client-card-stat">
            <div class="client-card-stat-value">${Utils.formatCurrency(client.total_purchased || 0)}</div>
            <div class="client-card-stat-label">Total</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3)">
          <button class="btn btn-secondary btn-sm flex-1" onclick="Clients.openEditModal('${client.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="Clients.deleteClient('${client.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  setupEventListeners() {
    document.getElementById('btn-new-client')?.addEventListener('click', () => this.openCreateModal());
  },

  setupSearch() {
    const input = document.getElementById('client-search-input');
    if (!input) return;
    input.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1;
      this.render();
    }, 250));
  },

  openCreateModal() {
    this._openModal('Nuevo Cliente', null);
  },

  openEditModal(clientId) {
    const client = this.clients.find(c => c.id === clientId);
    if (client) this._openModal('Editar Cliente', client);
  },

  _openModal(title, client) {
    const content = Utils.createElement('div', { className: 'grid-form' });

    const fields = [
      { id: 'name', label: 'Nombre', type: 'text', required: true, value: client?.name || '' },
      { id: 'last_name', label: 'Apellidos', type: 'text', value: client?.last_name || '' },
      { id: 'company', label: 'Empresa', type: 'text', value: client?.company || '' },
      { id: 'document', label: 'Documento', type: 'text', value: client?.document || '' },
      { id: 'nit', label: 'NIT', type: 'text', value: client?.nit || '' },
      { id: 'phone', label: 'Teléfono', type: 'tel', value: client?.phone || '' },
      { id: 'email', label: 'Correo', type: 'email', value: client?.email || '' },
      { id: 'address', label: 'Dirección', type: 'text', value: client?.address || '' },
      { id: 'city', label: 'Ciudad', type: 'text', value: client?.city || '' },
      { id: 'observations', label: 'Observaciones', type: 'textarea', value: client?.observations || '' }
    ];

    fields.forEach(field => {
      const group = Utils.createElement('div', { className: 'form-group' });
      if (field.id === 'observations') group.style.gridColumn = '1 / -1';

      const label = Utils.createElement('label', {
        className: `form-label ${field.required ? 'form-label-required' : ''}`,
        textContent: field.label
      });

      let input;
      if (field.type === 'textarea') {
        input = Utils.createElement('textarea', {
          className: 'form-input',
          id: `modal-${field.id}`,
          value: field.value
        });
      } else {
        input = Utils.createElement('input', {
          type: field.type || 'text',
          className: 'form-input',
          id: `modal-${field.id}`,
          value: field.value
        });
      }

      group.appendChild(label);
      group.appendChild(input);
      content.appendChild(group);
    });

    Components.modal({
      title,
      content,
      size: 'lg',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (m) => m.close() },
        {
          label: client ? 'Actualizar' : 'Crear',
          class: 'btn-primary',
          onClick: async (m) => {
            await this.saveClient(client?.id, m);
          }
        }
      ]
    });
  },

  async saveClient(clientId, modal) {
    const data = {
      name: document.getElementById('modal-name')?.value?.trim() || '',
      last_name: document.getElementById('modal-last_name')?.value?.trim() || '',
      company: document.getElementById('modal-company')?.value?.trim() || '',
      document: document.getElementById('modal-document')?.value?.trim() || '',
      nit: document.getElementById('modal-nit')?.value?.trim() || '',
      phone: document.getElementById('modal-phone')?.value?.trim() || '',
      email: document.getElementById('modal-email')?.value?.trim() || '',
      address: document.getElementById('modal-address')?.value?.trim() || '',
      city: document.getElementById('modal-city')?.value?.trim() || '',
      observations: document.getElementById('modal-observations')?.value?.trim() || ''
    };

    if (!data.name) {
      Components.toast({ type: 'warning', message: 'El nombre es obligatorio' });
      return;
    }

    const userId = Auth.getUserId();

    try {
      await Components.withLoading(clientId ? 'Actualizando cliente...' : 'Registrando cliente...', async () => {
        if (clientId) {
          await supabase.from('clients').eq('id', clientId).update({ ...data, updated_at: new Date().toISOString() });
        } else {
          await supabase.from('clients').insert({ ...data, user_id: userId, created_at: new Date().toISOString() });
        }
        await this.loadClients();
        this.render();
      });
    } catch (e) {
      console.error('Save client error:', e);
      Components.toast({ type: 'error', message: 'Error al guardar cliente' });
      return;
    }

    Components.toast({ type: 'success', message: clientId ? 'Cliente actualizado' : 'Cliente creado' });

    modal.close();
  },

  async deleteClient(clientId) {
    const confirmed = await Components.confirm({
      title: 'Eliminar cliente',
      message: '¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await Components.withLoading('Eliminando cliente...', async () => {
        const deletedClients = await supabase.from('clients').eq('id', clientId).delete();
        const wasDeleted = Array.isArray(deletedClients)
          ? deletedClients.some((client) => client.id === clientId)
          : Boolean(deletedClients);
        if (!wasDeleted) throw new Error('La base de datos no confirmó la eliminación del cliente');

        await this.loadClients();
        this.render();
      });

      Components.toast({ type: 'success', message: 'Cliente eliminado' });
    } catch (e) {
      console.error('Delete client error:', e);
      Components.toast({ type: 'error', message: e.message || 'Error al eliminar el cliente' });
    }
  }
};

window.Clients = Clients;
