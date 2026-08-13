/* FIXORA - UI Components */

const Components = {
  /* ============================================
     TOAST NOTIFICATIONS
     ============================================ */
  _toastContainer: null,
  _loadingOperations: new Map(),
  _loadingSequence: 0,

  initToasts() {
    if (this._toastContainer) return;
    this._toastContainer = Utils.createElement('div', { className: 'toast-container', id: 'toast-container' });
    document.body.appendChild(this._toastContainer);
  },

  toast(options = {}) {
    this.initToasts();

    const {
      type = 'info',
      title = '',
      message = '',
      duration = CONFIG.toast.duration,
      closable = true
    } = typeof options === 'string' ? { message: options } : options;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = Utils.createElement('div', { className: `toast toast-${type}`, style: { position: 'relative' } }, [
      Utils.createElement('div', { className: 'toast-icon', innerHTML: icons[type] || icons.info }),
      Utils.createElement('div', { className: 'toast-content' }, [
        title ? Utils.createElement('div', { className: 'toast-title', textContent: title }) : null,
        message ? Utils.createElement('div', { className: 'toast-message', textContent: message }) : null
      ].filter(Boolean)),
      closable ? Utils.createElement('button', {
        className: 'toast-close',
        innerHTML: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        onClick: () => this.removeToast(toast)
      }) : null
    ]);

    this._toastContainer.appendChild(toast);

    const existing = this._toastContainer.children;
    if (existing.length > CONFIG.toast.maxVisible) {
      this.removeToast(existing[0]);
    }

    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }

    return toast;
  },

  removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  },

  /* ============================================
     MODAL
     ============================================ */
  modal(options = {}) {
    const {
      title = '',
      content = '',
      size = '',
      actions = [],
      closable = true,
      onClose = null,
      className = ''
    } = options;

    const overlay = Utils.createElement('div', { className: 'modal-overlay' });

    const sizeClass = size ? `modal-${size}` : '';

    const modal = Utils.createElement('div', { className: `modal ${sizeClass} ${className}` });
    let escHandler = null;
    let closed = false;
    let controller = null;

    const close = () => {
      if (closed) return;
      closed = true;
      if (escHandler) document.removeEventListener('keydown', escHandler);
      this.closeModal(overlay, onClose);
    };

    if (title || closable) {
      const header = Utils.createElement('div', { className: 'modal-header' });
      if (title) {
        header.appendChild(Utils.createElement('h3', { className: 'modal-title', textContent: title }));
      }
      if (closable) {
        const closeBtn = Utils.createElement('button', {
          className: 'modal-close',
          innerHTML: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        });
        closeBtn.addEventListener('click', close);
        header.appendChild(closeBtn);
      }
      modal.appendChild(header);
    }

    const body = Utils.createElement('div', { className: 'modal-body' });
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
    modal.appendChild(body);

    controller = { overlay, modal, body, close };

    if (actions.length) {
      const footer = Utils.createElement('div', { className: 'modal-footer' });
      actions.forEach(action => {
        const btn = Utils.createElement('button', {
          className: `btn ${action.class || 'btn-secondary'}`,
          textContent: action.label
        });
        if (action.onClick) btn.addEventListener('click', () => action.onClick(controller));
        if (action.id) btn.id = action.id;
        footer.appendChild(btn);
      });
      modal.appendChild(footer);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('active'));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && closable) close();
    });

    escHandler = (e) => {
      if (e.key === 'Escape' && closable) {
        close();
      }
    };
    document.addEventListener('keydown', escHandler);

    return controller;
  },

  closeModal(overlay, onClose) {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  },

  confirm(options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Confirmar',
        message = '¿Estás seguro?',
        confirmLabel = 'Confirmar',
        cancelLabel = 'Cancelar',
        type = 'danger',
        icon = ''
      } = options;

      const typeClasses = {
        danger: 'btn-danger',
        warning: 'btn-primary',
        info: 'btn-primary',
        success: 'btn-success'
      };

      const content = Utils.createElement('div', { style: { textAlign: 'center', padding: '8px 0' } });

      if (icon) {
        const iconEl = Utils.createElement('div', {
          innerHTML: icon,
          style: { display: 'flex', justifyContent: 'center', marginBottom: '16px', color: `var(--color-${type})` }
        });
        content.appendChild(iconEl);
      }

      content.appendChild(Utils.createElement('p', { textContent: message, style: { fontSize: 'var(--text-base)', color: 'var(--text-secondary)', textAlign: 'center' } }));

      const modal = this.modal({
        title,
        content,
        size: 'sm',
        closable: true,
        actions: [
          { label: cancelLabel, class: 'btn-secondary', onClick: (m) => { m.close(); resolve(false); } },
          { label: confirmLabel, class: typeClasses[type] || 'btn-primary', onClick: (m) => { m.close(); resolve(true); } }
        ],
        onClose: () => resolve(false)
      });
    });
  },

  /* ============================================
     DROPDOWN
     ============================================ */
  dropdown(trigger, items, options = {}) {
    const { align = 'right', width = 200 } = options;

    const existing = trigger.parentNode.querySelector('.dropdown-menu');
    if (existing) { existing.remove(); return; }

    Utils.$$('.dropdown-menu').forEach(m => m.remove());

    const menu = Utils.createElement('div', {
      className: 'dropdown-menu',
      style: { [align]: 0, minWidth: `${width}px` }
    });

    items.forEach(item => {
      if (item.divider) {
        menu.appendChild(Utils.createElement('div', { className: 'dropdown-divider' }));
        return;
      }

      const btn = Utils.createElement('button', {
        className: `dropdown-item ${item.danger ? 'danger' : ''}`,
        dataset: item.dataset || {}
      });

      if (item.icon) {
        btn.appendChild(Utils.createElement('span', { innerHTML: item.icon, style: { width: '16px', height: '16px', display: 'flex', flexShrink: '0' } }));
      }
      btn.appendChild(Utils.createElement('span', { textContent: item.label }));

      if (item.onClick) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.remove();
          item.onClick(item);
        });
      }

      menu.appendChild(btn);
    });

    trigger.parentNode.style.position = 'relative';
    trigger.parentNode.appendChild(menu);

    requestAnimationFrame(() => menu.classList.add('open'));

    const closeDropdown = (e) => {
      if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };

    setTimeout(() => document.addEventListener('click', closeDropdown), 10);
  },

  /* ============================================
     TOOLTIP
     ============================================ */
  tooltip(element, text) {
    element.setAttribute('data-tooltip', text);
  },

  /* ============================================
     LOADING OVERLAY
     ============================================ */
  showLoading(message = 'Cargando...') {
    const token = `loading-${++this._loadingSequence}`;
    this._loadingOperations.set(token, { message: String(message || 'Procesando...') });

    let loader = document.getElementById('app-loading-overlay');
    if (!loader) {
      loader = Utils.createElement('div', {
        id: 'app-loading-overlay',
        className: 'modal-overlay app-operation-overlay',
        role: 'status',
        'aria-live': 'polite',
        'aria-busy': 'true'
      });
      const content = Utils.createElement('div', { className: 'app-loader-content app-operation-loader' }, [
        Utils.createElement('div', { className: 'app-operation-loader-spinner' }, [
          Utils.createElement('div', { className: 'spinner spinner-xl' })
        ]),
        Utils.createElement('div', { className: 'app-operation-loader-title', textContent: 'Un momento' }),
        Utils.createElement('div', { className: 'app-loader-text', textContent: message }),
        Utils.createElement('div', { className: 'app-operation-loader-hint', textContent: 'No cierres esta ventana mientras termina el proceso.' })
      ]);
      loader.appendChild(content);
      document.body.appendChild(loader);
    }

    delete loader.dataset.closing;
    const messageElement = loader.querySelector('.app-loader-text');
    if (messageElement) messageElement.textContent = String(message || 'Procesando...');
    document.body.setAttribute('aria-busy', 'true');
    // Make blocking operations visible in the same event that starts them.
    // Waiting for the next animation frame leaves a short window for repeat clicks.
    loader.classList.add('active');
    return token;
  },

  hideLoading(token = null) {
    if (token) this._loadingOperations.delete(token);
    else this._loadingOperations.clear();

    const loader = document.getElementById('app-loading-overlay');
    if (!loader) return;

    if (this._loadingOperations.size) {
      const activeOperations = Array.from(this._loadingOperations.values());
      const current = activeOperations[activeOperations.length - 1];
      const messageElement = loader.querySelector('.app-loader-text');
      if (messageElement) messageElement.textContent = current.message;
      return;
    }

    document.body.removeAttribute('aria-busy');
    loader.dataset.closing = 'true';
    loader.classList.remove('active');
    setTimeout(() => {
      if (!this._loadingOperations.size && loader.dataset.closing === 'true') loader.remove();
    }, 250);
  },

  async withLoading(message, operation) {
    const token = this.showLoading(message);
    try {
      return await operation();
    } finally {
      this.hideLoading(token);
    }
  },

  /* ============================================
     RIPPLE EFFECT
     ============================================ */
  addRipple(element) {
    element.classList.add('ripple-container');
    element.addEventListener('click', (e) => {
      const rect = element.getBoundingClientRect();
      const ripple = Utils.createElement('span', {
        className: 'ripple',
        style: {
          left: `${e.clientX - rect.left}px`,
          top: `${e.clientY - rect.top}px`
        }
      });
      element.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  },

  /* ============================================
     SKELETON LOADER
     ============================================ */
  skeleton(type = 'text', count = 1) {
    const types = {
      text: 'skeleton skeleton-text',
      'text-sm': 'skeleton skeleton-text-sm',
      circle: 'skeleton skeleton-circle',
      card: 'skeleton skeleton-card',
      rect: 'skeleton skeleton-rect'
    };

    const container = Utils.createElement('div', { className: 'skeleton-group' });
    for (let i = 0; i < count; i++) {
      container.appendChild(Utils.createElement('div', { className: types[type] || types.text }));
    }
    return container;
  },

  /* ============================================
     EMPTY STATE
     ============================================ */
  emptyState(options = {}) {
    const { icon = '', title = 'Sin resultados', description = '', action = null } = options;

    const el = Utils.createElement('div', { className: 'empty-state' });

    if (icon) {
      el.appendChild(Utils.createElement('div', { className: 'empty-state-icon', innerHTML: icon }));
    }

    el.appendChild(Utils.createElement('h3', { className: 'empty-state-title', textContent: title }));

    if (description) {
      el.appendChild(Utils.createElement('p', { className: 'empty-state-description', textContent: description }));
    }

    if (action) {
      const btn = Utils.createElement('button', { className: 'btn btn-primary', textContent: action.label });
      btn.addEventListener('click', action.onClick);
      el.appendChild(btn);
    }

    return el;
  },

  /* ============================================
     PAGINATION
     ============================================ */
  pagination(currentPage, totalPages, onPageChange) {
    const container = Utils.createElement('div', { className: 'pagination' });

    const prevBtn = Utils.createElement('button', {
      className: 'pagination-btn',
      disabled: !currentPage || currentPage <= 1,
      innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>'
    });
    prevBtn.addEventListener('click', () => { if (currentPage > 1) onPageChange(currentPage - 1); });
    container.appendChild(prevBtn);

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    if (startPage > 1) {
      container.appendChild(this._pageBtn(1, currentPage, onPageChange));
      if (startPage > 2) {
        container.appendChild(Utils.createElement('span', { className: 'pagination-btn', textContent: '...', style: { border: 'none', cursor: 'default' } }));
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      container.appendChild(this._pageBtn(i, currentPage, onPageChange));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        container.appendChild(Utils.createElement('span', { className: 'pagination-btn', textContent: '...', style: { border: 'none', cursor: 'default' } }));
      }
      container.appendChild(this._pageBtn(totalPages, currentPage, onPageChange));
    }

    const nextBtn = Utils.createElement('button', {
      className: 'pagination-btn',
      disabled: !currentPage || currentPage >= totalPages,
      innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
    });
    nextBtn.addEventListener('click', () => { if (currentPage < totalPages) onPageChange(currentPage + 1); });
    container.appendChild(nextBtn);

    return container;
  },

  _pageBtn(page, current, onChange) {
    const btn = Utils.createElement('button', {
      className: `pagination-btn ${page === current ? 'active' : ''}`,
      textContent: String(page)
    });
    btn.addEventListener('click', () => onChange(page));
    return btn;
  }
};

window.Components = Components;
