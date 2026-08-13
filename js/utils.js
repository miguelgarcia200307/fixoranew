/* FIXORA - Utility Functions */

const Utils = {
  /* ============================================
     DOM HELPERS
     ============================================ */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') el.className = value;
      else if (key === 'innerHTML') el.innerHTML = value;
      else if (key === 'textContent') el.textContent = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, value);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  },

  /* ============================================
     FORMATTING
     ============================================ */
  formatCurrency(amount, config = {}) {
    const currency = config.currency || 'COP';
    const prefix = config.prefix || '$';
    const number = parseFloat(amount) || 0;

    if (currency === 'COP' || currency === 'USD' || currency === 'EUR') {
      return `${prefix} ${number.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }

    return `${prefix} ${number.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('MMM', months[d.getMonth()])
      .replace('MMMM', fullMonths[d.getMonth()]);
  },

  formatDateTime(date) {
    return this.formatDate(date, 'DD/MM/YYYY HH:mm');
  },

  timeAgo(date) {
    const now = new Date();
    const d = new Date(date);
    const seconds = Math.floor((now - d) / 1000);

    const intervals = [
      { label: 'año', seconds: 31536000 },
      { label: 'mes', seconds: 2592000 },
      { label: 'semana', seconds: 604800 },
      { label: 'día', seconds: 86400 },
      { label: 'hora', seconds: 3600 },
      { label: 'minuto', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count > 0) {
        return `hace ${count} ${interval.label}${count > 1 ? 's' : ''}`;
      }
    }

    return 'hace un momento';
  },

  formatNumber(num) {
    return (parseFloat(num) || 0).toLocaleString('es-CO');
  },

  formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    if (cleaned.length === 7) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    return phone;
  },

  /* ============================================
     GENERATION
     ============================================ */
  generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  },

  generateUUID() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  },

  isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  },

  generateConsecutive(prefix, number, minLength = 6) {
    const numStr = String(number).padStart(minLength, '0');
    return `${prefix}-${numStr}`;
  },

  generateColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 55%)`;
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  /* ============================================
     VALIDATION
     ============================================ */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidPhone(phone) {
    return /^[\d\s\-\+\(\)]{7,15}$/.test(phone);
  },

  isValidNIT(nit) {
    return /^[\d\-]{6,20}$/.test(nit);
  },

  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  },

  /* ============================================
     SEARCH / FILTER
     ============================================ */
  normalizeText(text) {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  fuzzyMatch(text, query) {
    const normalizedText = this.normalizeText(text);
    const normalizedQuery = this.normalizeText(query);
    return normalizedText.includes(normalizedQuery);
  },

  searchItems(items, query, fields = []) {
    if (!query || !query.trim()) return items;
    const q = query.trim();
    return items.filter(item =>
      fields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return this.fuzzyMatch(String(value || ''), q);
      })
    );
  },

  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /* ============================================
     SORT & PAGINATE
     ============================================ */
  sortItems(items, column, direction = 'asc') {
    return [...items].sort((a, b) => {
      let valA = column.split('.').reduce((obj, key) => obj?.[key], a);
      let valB = column.split('.').reduce((obj, key) => obj?.[key], b);

      if (typeof valA === 'string') valA = this.normalizeText(valA);
      if (typeof valB === 'string') valB = this.normalizeText(valB);

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  paginate(items, page = 1, limit = 12) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      items: items.slice(start, end),
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      currentPage: page,
      hasNext: end < items.length,
      hasPrev: page > 1
    };
  },

  /* ============================================
     LOCAL STORAGE
     ============================================ */
  storage: {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch { /* quota exceeded */ }
    },

    remove(key) {
      localStorage.removeItem(key);
    }
  },

  /* ============================================
     KEYBOARD SHORTCUTS
     ============================================ */
  shortcuts: new Map(),

  registerShortcut(combo, callback, description = '') {
    this.shortcuts.set(combo, { callback, description });
  },

  initShortcuts() {
    document.addEventListener('keydown', (e) => {
      const key = [];
      if (e.ctrlKey || e.metaKey) key.push('ctrl');
      if (e.shiftKey) key.push('shift');
      if (e.altKey) key.push('alt');

      const keyName = e.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(keyName)) {
        key.push(keyName);
      }

      const combo = key.join('+');
      const shortcut = this.shortcuts.get(combo);

      if (shortcut) {
        e.preventDefault();
        shortcut.callback(e);
      }
    });
  },

  /* ============================================
     MISC
     ============================================ */
  copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  },

  async downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  },

  truncate(str, length = 50) {
    if (!str || str.length <= length) return str;
    return str.slice(0, length) + '...';
  },

  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const val = typeof key === 'function' ? key(item) : item[key];
      (groups[val] = groups[val] || []).push(item);
      return groups;
    }, {});
  },

  calculateIVA(subtotal, rate = 19) {
    return Math.round(subtotal * (rate / 100));
  },

  calculateRetention(subtotal, rate = 2.5) {
    return Math.round(subtotal * (rate / 100));
  },

  roundTo(value, decimals = 0) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  calculateDocumentTotals(items, options = {}) {
    const { applyIva = false, applyRetention = false, ivaRate = 19 } = options;

    const subtotal = items.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
    }, 0);

    const totalDiscount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.discount) || 0);
    }, 0);

    const baseForTaxes = subtotal - totalDiscount;
    const iva = applyIva ? Utils.calculateIVA(baseForTaxes, ivaRate) : 0;
    const retention = applyRetention ? Utils.calculateRetention(baseForTaxes) : 0;
    const total = baseForTaxes + iva - retention;

    return {
      subtotal: Utils.roundTo(subtotal, 2),
      discount: Utils.roundTo(totalDiscount, 2),
      iva: Utils.roundTo(iva, 2),
      retention: Utils.roundTo(retention, 2),
      total: Utils.roundTo(total, 2)
    };
  }
};

window.Utils = Utils;
