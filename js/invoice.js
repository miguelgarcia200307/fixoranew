/* FIXORA - Document Editor (Invoices & Quotes) */

const DocumentEditor = {
  type: 'invoice',
  document: null,
  client: null,
  items: [],
  config: null,
  autosaveTimer: null,
  isDirty: false,
  _lastMissingIdentifier: null,

  async init(docType = 'invoice') {
    if (!Auth.requireAuth()) return;

    this.type = docType;
    await this.loadConfig();
    this.setupTypeSelector();
    this.renderSidebar();
    this.setupTheme();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.resetDocument();
    this.renderItems();
    this.updateTotals();
    this.setupClientRegistrationButton();
  },

  async loadConfig() {
    try {
      const userId = Auth.getUserId();
      const configs = await supabase.from('business_config').select('*').eq('user_id', userId).limit(1);
      this.config = Array.isArray(configs) && configs.length ? configs[0] : {
        business_name: 'Mi Negocio',
        nit: '',
        address: '',
        phone: '',
        email: '',
        city: '',
        prefix_invoice: 'FAC',
        prefix_quote: 'COT',
        start_number_invoice: 1,
        start_number_quote: 1,
        iva_rate: 19,
        currency: 'COP',
        currency_prefix: '$',
        color_primary: '#6366f1'
      };
    } catch {
      this.config = {
        business_name: 'Mi Negocio',
        prefix_invoice: 'FAC',
        prefix_quote: 'COT',
        start_number_invoice: 1,
        start_number_quote: 1,
        iva_rate: 19,
        currency: 'COP',
        currency_prefix: '$'
      };
    }
  },

  resetDocument() {
    const prefix = this.type === 'invoice' ? this.config.prefix_invoice : this.config.prefix_quote;
    this.document = {
      id: Utils.generateUUID(),
      type: this.type,
      number: '',
      status: 'draft',
      created_at: new Date().toISOString(),
      observations: '',
      subtotal: 0,
      discount: 0,
      iva: 0,
      retention: 0,
      total: 0,
      apply_iva: false,
      apply_retention: false
    };
    this.client = null;
    this.items = [this.createEmptyItem()];
    this.isDirty = false;
    this._lastPhonePrompt = null;
    this._lastMissingIdentifier = null;
  },

  createEmptyItem() {
    return {
      id: Utils.generateId(),
      type: 'product',
      name: '',
      description: '',
      quantity: 1,
      unit: 'unidad',
      unit_price: 0,
      discount: 0,
      subtotal: 0
    };
  },

  setupTypeSelector() {
    const selector = document.getElementById('type-selector');
    if (!selector) return;

    selector.innerHTML = `
      <button class="document-type-btn ${this.type === 'invoice' ? 'active' : ''}" data-type="invoice">
        <div class="document-type-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div class="document-type-btn-title">Factura</div>
        <div class="document-type-btn-desc">Documento de venta</div>
      </button>
      <button class="document-type-btn ${this.type === 'quote' ? 'active' : ''}" data-type="quote">
        <div class="document-type-btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="document-type-btn-title">Cotización</div>
        <div class="document-type-btn-desc">Presupuesto</div>
      </button>
    `;

    selector.querySelectorAll('.document-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.type = btn.dataset.type;
        selector.querySelectorAll('.document-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateTitle();
      });
    });
  },

  updateTitle() {
    const title = document.getElementById('page-title');
    if (title) {
      title.textContent = this.type === 'invoice' ? 'Nueva Factura' : 'Nueva Cotización';
    }
    const subtitle = document.getElementById('page-subtitle');
    if (subtitle) {
      subtitle.textContent = this.type === 'invoice' ? 'Crea una factura para tu cliente' : 'Crea una cotización para tu cliente';
    }
  },

  setupEventListeners() {
    document.getElementById('doc-observations')?.addEventListener('input', (e) => {
      this.document.observations = e.target.value;
      this.markDirty();
    });

    document.getElementById('apply-iva')?.addEventListener('change', (e) => {
      this.document.apply_iva = e.target.checked;
      this.updateTotals();
    });

    document.getElementById('apply-retention')?.addEventListener('change', (e) => {
      this.document.apply_retention = e.target.checked;
      this.updateTotals();
    });

    document.getElementById('btn-save')?.addEventListener('click', () => this.save());
    document.getElementById('btn-preview')?.addEventListener('click', () => this.previewPDF());
    document.getElementById('btn-download')?.addEventListener('click', () => this.downloadPDF());
    document.getElementById('btn-new')?.addEventListener('click', () => this.newDocument());
    document.getElementById('add-item-btn')?.addEventListener('click', () => this.addItem());

    document.getElementById('client-document')?.addEventListener('blur', (e) => {
      this.handleClientDocumentLookup(e.target.value);
    });

    document.getElementById('client-phone')?.addEventListener('blur', (e) => {
      this.handleClientPhoneLookup(e.target.value);
    });

    const realtimeDocumentLookup = Utils.debounce((value) => this.handleClientDocumentRealtime(value), 350);
    const realtimePhoneLookup = Utils.debounce((value) => this.handleClientPhoneRealtime(value), 350);

    document.getElementById('client-document')?.addEventListener('input', (e) => {
      realtimeDocumentLookup(e.target.value);
    });

    document.getElementById('client-phone')?.addEventListener('input', (e) => {
      realtimePhoneLookup(e.target.value);
    });

    document.getElementById('client-document')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleClientDocumentLookup(e.target.value);
      }
    });

    document.getElementById('client-phone')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleClientPhoneLookup(e.target.value);
      }
    });

    this.setupClientSearch();
  },

  setupClientSearch() {
    const searchInput = document.getElementById('client-search');
    const suggestionsEl = document.getElementById('client-suggestions');
    if (!searchInput || !suggestionsEl) return;

    const renderSuggestions = (clients) => {
      if (!clients || !clients.length) {
        suggestionsEl.innerHTML = '<div class="global-search-empty">No se encontraron clientes</div>';
        suggestionsEl.classList.add('active');
        return;
      }

      suggestionsEl.innerHTML = clients.map(c => {
        const displayName = `${Utils.sanitize(c.name || '')} ${Utils.sanitize(c.last_name || '')}`.trim() || 'Sin nombre';
        const secondary = Utils.sanitize(c.company || c.document || c.email || c.phone || '');
        return `
          <div class="client-suggestion-item" data-client-id="${c.id}">
            <div class="avatar avatar-sm" style="background: ${Utils.generateColor(c.name || '')}">${Utils.getInitials(c.name)}</div>
            <div>
              <div class="client-suggestion-name">${displayName}</div>
              <div class="client-suggestion-info">${secondary}</div>
            </div>
          </div>
        `;
      }).join('');

      suggestionsEl.classList.add('active');

      suggestionsEl.querySelectorAll('.client-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const clientId = item.dataset.clientId;
          const client = clients.find(c => c.id === clientId);
          if (client) this.selectClient(client);
          suggestionsEl.classList.remove('active');
          searchInput.value = '';
        });
      });
    };

    const search = Utils.debounce(async (query) => {
      if (!query || query.length < 2) {
        suggestionsEl.classList.remove('active');
        return;
      }

      try {
        const userId = Auth.getUserId();
        const clients = await supabase.from('clients')
          .select('*')
          .eq('user_id', userId)
          .or(`name.ilike.%${query}%,last_name.ilike.%${query}%,document.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
          .limit(5);

        renderSuggestions(clients);
      } catch (e) {
        console.error('Client search error:', e);
      }
    }, 250);

    searchInput.addEventListener('input', (e) => search(e.target.value));
    document.addEventListener('click', (e) => {
      if (!suggestionsEl.contains(e.target) && e.target !== searchInput) {
        suggestionsEl.classList.remove('active');
      }
    });
  },

  selectClient(client) {
    this.client = client;
    this.markDirty();
    this._lastPhonePrompt = null;
    this._lastMissingIdentifier = null;
    this.updateRegistrationHint(false);

    const fields = {
      'client-name': client.name || '',
      'client-lastname': client.last_name || '',
      'client-company': client.company || '',
      'client-document': client.document || '',
      'client-nit': client.nit || '',
      'client-phone': client.phone || '',
      'client-email': client.email || '',
      'client-address': client.address || '',
      'client-city': client.city || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });

    Components.toast({ type: 'success', title: 'Cliente seleccionado', message: `${client.name} ${client.last_name || ''}`.trim() });
  },

  async handleClientDocumentLookup(documentValue) {
    const documentNumber = (documentValue || '').trim();
    if (!documentNumber) return;

    try {
      const userId = Auth.getUserId();
      const clients = await supabase.from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('document', documentNumber)
        .limit(1);

      if (clients && clients.length) {
        this.selectClient(clients[0]);
        this.updateRegistrationHint(false);
        return;
      }
      this.setMissingClientState(`document:${documentNumber}`);
    } catch (e) {
      console.error('Client document lookup error:', e);
    }
  },

  async handleClientPhoneLookup(phoneValue) {
    const phoneRaw = (phoneValue || '').trim();
    if (!phoneRaw) return;

    const phoneDigits = phoneRaw.replace(/\D/g, '');
    if (phoneDigits.length < 7) return;

    try {
      const userId = Auth.getUserId();
      const clients = await supabase.from('clients')
        .select('*')
        .eq('user_id', userId)
        .or(`phone.eq.${phoneRaw},phone.eq.${phoneDigits},phone.ilike.%${phoneRaw}%,phone.ilike.%${phoneDigits}%`)
        .limit(1);

      if (clients && clients.length) {
        this.selectClient(clients[0]);
        this.updateRegistrationHint(false);
        return;
      }
      this.setMissingClientState(`phone:${phoneDigits || phoneRaw}`);
    } catch (e) {
      console.error('Client phone lookup error:', e);
    }
  },

  async handleClientDocumentRealtime(documentValue) {
    const documentNumber = (documentValue || '').trim();
    if (documentNumber.length < 5) return;

    try {
      const userId = Auth.getUserId();
      const clients = await supabase.from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('document', documentNumber)
        .limit(1);

      if (clients && clients.length) {
        this.selectClient(clients[0]);
      }
    } catch (e) {
      console.error('Realtime document lookup error:', e);
    }
  },

  async handleClientPhoneRealtime(phoneValue) {
    const phoneRaw = (phoneValue || '').trim();
    if (!phoneRaw) return;

    const phoneDigits = phoneRaw.replace(/\D/g, '');
    if (phoneDigits.length < 7) return;

    try {
      const userId = Auth.getUserId();
      const clients = await supabase.from('clients')
        .select('*')
        .eq('user_id', userId)
        .or(`phone.eq.${phoneRaw},phone.eq.${phoneDigits},phone.ilike.%${phoneRaw}%,phone.ilike.%${phoneDigits}%`)
        .limit(1);

      if (clients && clients.length) {
        this.selectClient(clients[0]);
        this.updateRegistrationHint(false);
        return;
      }
      this.setMissingClientState(`phone:${phoneDigits}`);
    } catch (e) {
      console.error('Realtime phone lookup error:', e);
    }
  },

  setupClientRegistrationButton() {
    const btn = document.getElementById('btn-register-client');
    if (!btn || btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => this.saveInlineClient());
  },

  setMissingClientState(identifier) {
    if (!identifier) return;
    this._lastMissingIdentifier = identifier;
    this.updateRegistrationHint(true, identifier);
  },

  updateRegistrationHint(show, identifier = '') {
    const hint = document.getElementById('client-registration-hint');
    const btn = document.getElementById('btn-register-client');

    if (hint) {
      hint.style.display = show ? 'block' : 'none';
      if (show) {
        const label = identifier.startsWith('phone:') ? 'telefono' : 'cedula';
        hint.textContent = `Este cliente no esta registrado por ${label}. Completa los datos abajo y usa el boton para guardarlo.`;
      }
    }

    if (btn) {
      btn.disabled = !show;
    }
  },

  async saveInlineClient() {
    const data = {
      name: document.getElementById('client-name')?.value?.trim() || '',
      last_name: document.getElementById('client-lastname')?.value?.trim() || '',
      company: document.getElementById('client-company')?.value?.trim() || '',
      document: document.getElementById('client-document')?.value?.trim() || '',
      nit: document.getElementById('client-nit')?.value?.trim() || '',
      phone: document.getElementById('client-phone')?.value?.trim() || '',
      email: document.getElementById('client-email')?.value?.trim() || '',
      address: document.getElementById('client-address')?.value?.trim() || '',
      city: document.getElementById('client-city')?.value?.trim() || ''
    };

    if (!data.name) {
      Components.toast({ type: 'warning', message: 'El nombre es obligatorio' });
      return;
    }

    if (!data.document && !data.phone) {
      Components.toast({ type: 'warning', message: 'Debes ingresar al menos documento o telefono' });
      return;
    }

    try {
      await Components.withLoading('Registrando cliente...', async () => {
        const userId = Auth.getUserId();
        const saved = await supabase.from('clients').insert({
          ...data,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        const client = Array.isArray(saved) ? saved[0] : saved;
        if (client) this.selectClient(client);
        this.updateRegistrationHint(false);
      });
      Components.toast({ type: 'success', title: 'Cliente registrado', message: 'El cliente se guardo correctamente' });
    } catch (e) {
      console.error('Register client error:', e);
      Components.toast({ type: 'error', message: 'No se pudo registrar el cliente' });
    }
  },

  openRegisterClientModal(documentNumber = '', phoneValue = '') {
    const content = Utils.createElement('div', { className: 'grid-form' });

    const fields = [
      { id: 'name', label: 'Nombre', type: 'text', required: true, value: document.getElementById('client-name')?.value || '' },
      { id: 'last_name', label: 'Apellidos', type: 'text', value: document.getElementById('client-lastname')?.value || '' },
      { id: 'company', label: 'Empresa', type: 'text', value: document.getElementById('client-company')?.value || '' },
      { id: 'document', label: 'Documento', type: 'text', required: true, value: documentNumber || document.getElementById('client-document')?.value || '' },
      { id: 'nit', label: 'NIT', type: 'text', value: document.getElementById('client-nit')?.value || '' },
      { id: 'phone', label: 'Teléfono', type: 'tel', value: phoneValue || document.getElementById('client-phone')?.value || '' },
      { id: 'email', label: 'Correo', type: 'email', value: document.getElementById('client-email')?.value || '' },
      { id: 'address', label: 'Dirección', type: 'text', value: document.getElementById('client-address')?.value || '' },
      { id: 'city', label: 'Ciudad', type: 'text', value: document.getElementById('client-city')?.value || '' }
    ];

    fields.forEach(field => {
      const group = Utils.createElement('div', { className: 'form-group' });

      const label = Utils.createElement('label', {
        className: `form-label ${field.required ? 'form-label-required' : ''}`,
        textContent: field.label
      });

      const input = Utils.createElement('input', {
        type: field.type || 'text',
        className: 'form-input',
        id: `register-${field.id}`,
        value: field.value || ''
      });

      group.appendChild(label);
      group.appendChild(input);
      content.appendChild(group);
    });

    Components.modal({
      title: 'Registrar Cliente',
      content,
      size: 'lg',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (m) => m.close() },
        {
          label: 'Guardar cliente',
          class: 'btn-primary',
          onClick: async (m) => {
            const data = {
              name: document.getElementById('register-name')?.value?.trim() || '',
              last_name: document.getElementById('register-last_name')?.value?.trim() || '',
              company: document.getElementById('register-company')?.value?.trim() || '',
              document: document.getElementById('register-document')?.value?.trim() || '',
              nit: document.getElementById('register-nit')?.value?.trim() || '',
              phone: document.getElementById('register-phone')?.value?.trim() || '',
              email: document.getElementById('register-email')?.value?.trim() || '',
              address: document.getElementById('register-address')?.value?.trim() || '',
              city: document.getElementById('register-city')?.value?.trim() || ''
            };

            if (!data.name || !data.document) {
              Components.toast({ type: 'warning', message: 'El nombre y el documento son obligatorios' });
              return;
            }

            try {
              await Components.withLoading('Registrando cliente...', async () => {
                const userId = Auth.getUserId();
                const saved = await supabase.from('clients').insert({
                  ...data,
                  user_id: userId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

                const client = Array.isArray(saved) ? saved[0] : saved;
                if (client) this.selectClient(client);
              });

              Components.toast({ type: 'success', title: 'Cliente registrado', message: 'El cliente se guardó correctamente' });
              m.close();
            } catch (e) {
              console.error('Register client error:', e);
              Components.toast({ type: 'error', message: 'No se pudo registrar el cliente' });
            }
          }
        }
      ]
    });
  },

  renderItems() {
    const container = document.getElementById('items-container');
    if (!container) return;

    container.innerHTML = '';

    this.items.forEach((item, index) => {
      const row = Utils.createElement('div', { className: 'document-item-row', dataset: { id: item.id } }, [
        Utils.createElement('div', { className: 'item-number', textContent: String(index + 1), style: { color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', textAlign: 'center' } }),
        this._createItemField(item, 'name', 'Nombre', 'text', { gridColumn: 'span 1' }),
        this._createItemField(item, 'quantity', 'Cant.', 'number', { min: '1', style: { textAlign: 'right' } }),
        this._createItemField(item, 'unit_price', 'Precio', 'number', { min: '0', style: { textAlign: 'right' } }),
        this._createItemField(item, 'discount', 'Desc.', 'number', { min: '0', style: { textAlign: 'right' } }),
        Utils.createElement('div', { className: 'item-total', textContent: Utils.formatCurrency(item.subtotal, this.config), style: { textAlign: 'right', fontWeight: '600', fontSize: 'var(--text-sm)' } }),
        Utils.createElement('div', { className: 'document-item-actions' }, [
          Utils.createElement('button', {
            innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
            dataset: { tooltip: 'Duplicar' },
            onClick: () => this.duplicateItem(item.id)
          }),
          Utils.createElement('button', {
            className: 'delete',
            innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
            dataset: { tooltip: 'Eliminar' },
            onClick: () => this.removeItem(item.id)
          })
        ])
      ]);

      container.appendChild(row);
    });
  },

  _createItemField(item, field, placeholder, type, extraAttrs = {}) {
    const input = Utils.createElement('input', {
      type,
      className: 'form-input',
      value: item[field] || '',
      placeholder,
      dataset: { itemField: field, itemId: item.id },
      ...extraAttrs
    });

    if (type === 'number') {
      input.step = field === 'quantity' ? '1' : '0.01';
    }

    input.addEventListener('input', (e) => {
      const val = type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
      item[field] = val;
      this.calculateItem(item);
      this.updateItemTotal(item.id);
      this.updateTotals();
      this.markDirty();
    });

    return input;
  },

  calculateItem(item) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const discount = parseFloat(item.discount) || 0;
    item.subtotal = Utils.roundTo(qty * price - discount, 2);
  },

  updateItemTotal(itemId) {
    const row = document.querySelector(`[data-id="${itemId}"]`);
    if (!row) return;
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    const totalEl = row.querySelector('.item-total');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(item.subtotal, this.config);
  },

  addItem() {
    this.items.push(this.createEmptyItem());
    this.renderItems();
    this.markDirty();

    const lastInput = document.querySelector(`[data-item-id="${this.items[this.items.length - 1].id}"][data-item-field="name"]`);
    if (lastInput) lastInput.focus();
  },

  duplicateItem(itemId) {
    const idx = this.items.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const clone = { ...this.items[idx], id: Utils.generateId() };
    this.items.splice(idx + 1, 0, clone);
    this.renderItems();
    this.markDirty();
  },

  removeItem(itemId) {
    if (this.items.length <= 1) {
      Components.toast({ type: 'warning', message: 'Debe haber al menos un ítem' });
      return;
    }
    this.items = this.items.filter(i => i.id !== itemId);
    this.renderItems();
    this.updateTotals();
    this.markDirty();
  },

  updateTotals() {
    const totals = Utils.calculateDocumentTotals(this.items, {
      applyIva: this.document.apply_iva,
      applyRetention: this.document.apply_retention,
      ivaRate: this.config.iva_rate || 19
    });

    this.document.subtotal = totals.subtotal;
    this.document.discount = totals.discount;
    this.document.iva = totals.iva;
    this.document.retention = totals.retention;
    this.document.total = totals.total;

    const subtotal = totals.subtotal;
    const totalDiscount = totals.discount;
    const iva = totals.iva;
    const retention = totals.retention;

    const totalsContainer = document.getElementById('document-totals');
    if (totalsContainer) {
      totalsContainer.innerHTML = `
        <div class="document-totals-row">
          <span>Subtotal</span>
          <span>${Utils.formatCurrency(subtotal, this.config)}</span>
        </div>
        <div class="document-totals-row">
          <span>Descuento</span>
          <span>-${Utils.formatCurrency(totalDiscount, this.config)}</span>
        </div>
        ${this.document.apply_iva ? `
          <div class="document-totals-row">
            <span>IVA (${this.config.iva_rate || 19}%)</span>
            <span>${Utils.formatCurrency(iva, this.config)}</span>
          </div>
        ` : ''}
        ${this.document.apply_retention ? `
          <div class="document-totals-row">
            <span>Retención (2.5%)</span>
            <span>-${Utils.formatCurrency(retention, this.config)}</span>
          </div>
        ` : ''}
        <div class="document-totals-row total">
          <span>Total</span>
          <span>${Utils.formatCurrency(this.document.total, this.config)}</span>
        </div>
      `;
    }
  },

  markDirty() {
    this.isDirty = true;
    this.updateAutosaveIndicator('unsaved');
  },

  updateAutosaveIndicator(status) {
    const indicator = document.getElementById('autosave-indicator');
    if (!indicator) return;

    if (status === 'saving') {
      indicator.className = 'autosave-indicator saving';
      indicator.innerHTML = '<span class="autosave-dot"></span> Guardando...';
    } else if (status === 'saved') {
      indicator.className = 'autosave-indicator saved';
      indicator.innerHTML = '<span class="autosave-dot"></span> Guardado';
    } else {
      indicator.className = 'autosave-indicator';
      indicator.innerHTML = '<span class="autosave-dot"></span> Sin guardar';
    }
  },

  async save() {
    let loadingToken = null;
    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      loadingToken = Components.showLoading(`Guardando ${this.type === 'invoice' ? 'factura' : 'cotización'}...`);
      this.updateAutosaveIndicator('saving');

      this.document.user_id = userId;
      this.document.client_data = this.getClientData();
      this.document.items_data = this.items;
      this.document.updated_at = new Date().toISOString();

      if (!Utils.isUUID(this.document.id)) {
        this.document.id = Utils.generateUUID();
      }

      if (!this.document.number) {
        this.document.number = await this.generateNumber();
      }

      const existing = await supabase.from('documents').select('id').eq('id', this.document.id).single().maybeSingle();

      if (existing) {
        await supabase.from('documents').eq('id', this.document.id).update({
          client_data: this.document.client_data,
          items_data: this.document.items_data,
          observations: this.document.observations,
          subtotal: this.document.subtotal,
          discount: this.document.discount,
          iva: this.document.iva,
          retention: this.document.retention,
          total: this.document.total,
          apply_iva: this.document.apply_iva,
          apply_retention: this.document.apply_retention,
          status: this.document.status,
          updated_at: this.document.updated_at
        });
      } else {
        await supabase.from('documents').insert({
          id: this.document.id,
          user_id: userId,
          type: this.type,
          number: this.document.number,
          status: this.document.status,
          client_data: this.document.client_data,
          items_data: this.document.items_data,
          observations: this.document.observations,
          subtotal: this.document.subtotal,
          discount: this.document.discount,
          iva: this.document.iva,
          retention: this.document.retention,
          total: this.document.total,
          apply_iva: this.document.apply_iva,
          apply_retention: this.document.apply_retention,
          created_at: this.document.created_at,
          updated_at: this.document.updated_at
        });
      }

      this.isDirty = false;
      this.updateAutosaveIndicator('saved');
      Components.toast({ type: 'success', title: 'Guardado', message: `${this.type === 'invoice' ? 'Factura' : 'Cotización'} guardada correctamente` });
    } catch (e) {
      console.error('Save error:', e);
      this.updateAutosaveIndicator('unsaved');
      Components.toast({ type: 'error', title: 'Error', message: 'No se pudo guardar' });
    } finally {
      if (loadingToken) Components.hideLoading(loadingToken);
    }
  },

  getClientData() {
    return {
      name: document.getElementById('client-name')?.value || '',
      last_name: document.getElementById('client-lastname')?.value || '',
      company: document.getElementById('client-company')?.value || '',
      document: document.getElementById('client-document')?.value || '',
      nit: document.getElementById('client-nit')?.value || '',
      phone: document.getElementById('client-phone')?.value || '',
      email: document.getElementById('client-email')?.value || '',
      address: document.getElementById('client-address')?.value || '',
      city: document.getElementById('client-city')?.value || ''
    };
  },

  async generateNumber() {
    const prefix = this.type === 'invoice' ? this.config.prefix_invoice : this.config.prefix_quote;
    const startNum = this.type === 'invoice' ? (this.config.start_number_invoice || 1) : (this.config.start_number_quote || 1);

    try {
      const userId = Auth.getUserId();
      const docs = await supabase.from('documents')
        .select('number')
        .eq('user_id', userId)
        .eq('type', this.type)
        .order('created_at', { ascending: false })
        .limit(1);

      if (docs && docs.length && docs[0].number) {
        const lastNum = parseInt(docs[0].number.split('-')[1]) || 0;
        return Utils.generateConsecutive(prefix, lastNum + 1);
      }
    } catch (e) {
      console.error('Number generation error:', e);
    }

    return Utils.generateConsecutive(prefix, startNum);
  },

  setupKeyboardShortcuts() {
    Utils.registerShortcut('ctrl+s', () => this.save());
    Utils.registerShortcut('ctrl+p', () => this.previewPDF());
    Utils.initShortcuts();
  },

  renderSidebar() {
    Dashboard.renderSidebar();
  },

  setupTheme() {
    Dashboard.setupTheme();
  },

  async previewPDF() {
    if (this.isDirty) await this.save();
    await PDFGenerator.preview(this.type, this.document, this.client || this.getClientData(), this.items, this.config);
  },

  async downloadPDF() {
    if (this.isDirty) await this.save();
    await PDFGenerator.download(this.type, this.document, this.client || this.getClientData(), this.items, this.config);
  },

  newDocument() {
    if (this.isDirty) {
      Components.confirm({
        title: 'Documento sin guardar',
        message: 'Tienes cambios sin guardar. ¿Deseas continuar?',
        type: 'warning'
      }).then(confirmed => {
        if (confirmed) {
          this.resetDocument();
          this.renderItems();
          this.updateTotals();
          this.clearClientFields();
          this._lastPhonePrompt = null;
        }
      });
    } else {
      this.resetDocument();
      this.renderItems();
      this.updateTotals();
      this.clearClientFields();
      this._lastPhonePrompt = null;
    }
  },

  clearClientFields() {
    ['client-name', 'client-lastname', 'client-company', 'client-document', 'client-nit', 'client-phone', 'client-email', 'client-address', 'client-city'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  },

  async loadDocument(docId) {
    try {
      const doc = await supabase.from('documents').select('*').eq('id', docId).single();
      if (!doc) {
        Components.toast({ type: 'error', message: 'Documento no encontrado' });
        return false;
      }

      this.type = doc.type;
      this.document = doc;
      this.items = doc.items_data || [this.createEmptyItem()];
      this.client = doc.client_data || null;

      if (doc.client_data) {
        Object.entries(doc.client_data).forEach(([key, value]) => {
          const fieldMap = {
            name: 'client-name', last_name: 'client-lastname', company: 'client-company',
            document: 'client-document', nit: 'client-nit', phone: 'client-phone',
            email: 'client-email', address: 'client-address', city: 'client-city'
          };
          const el = document.getElementById(fieldMap[key]);
          if (el) el.value = value || '';
        });
      }

      if (doc.observations) {
        const obs = document.getElementById('doc-observations');
        if (obs) obs.value = doc.observations;
      }

      this.renderItems();
      this.updateTotals();
      return true;
    } catch (e) {
      console.error('Load document error:', e);
      return false;
    }
  }
};

window.DocumentEditor = DocumentEditor;
