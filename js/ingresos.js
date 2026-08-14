/* FIXORA - Income Entry Module */

const INCOME_DEVICE_CATALOG = {
  desktop: {
    label: 'Computador de escritorio',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>',
    brands: ['HP', 'Lenovo', 'Dell', 'Asus', 'Acer', 'Apple', 'MSI', 'Samsung', 'Huawei', 'Microsoft', 'Toshiba', 'Gateway', 'Otra'],
    accessories: ['Cable de poder', 'Monitor', 'Teclado', 'Mouse', 'Adaptador Wi-Fi', 'Parlantes', 'Cables adicionales', 'Otro'],
    photoGuides: ['Frontal', 'Posterior', 'Lateral izquierdo', 'Lateral derecho', 'Serial', 'Daño visible'],
    specs: ['processor', 'ram', 'storageUnits', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay', 'chargerState']
  },
  laptop: {
    label: 'Portátil',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10H4V6z"/><path d="M2 18h20"/><path d="M8 20h8"/></svg>',
    brands: ['HP', 'Lenovo', 'Dell', 'Asus', 'Acer', 'Apple', 'MSI', 'Samsung', 'Huawei', 'Microsoft', 'Toshiba', 'Gateway', 'Otra'],
    accessories: ['Cargador', 'Cable de poder', 'Bolso', 'Estuche', 'Mouse', 'Teclado externo', 'Base refrigerante', 'Adaptador', 'Memoria USB', 'Disco externo', 'Otro'],
    photoGuides: ['Tapa', 'Pantalla y teclado', 'Parte inferior', 'Laterales', 'Serial', 'Cargador', 'Daño visible'],
    specs: ['processor', 'ram', 'storageUnits', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay', 'batteryState', 'chargerState']
  },
  phone: {
    label: 'Celular',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    brands: ['Samsung', 'Apple', 'Xiaomi', 'Redmi', 'Motorola', 'Huawei', 'Honor', 'Oppo', 'Realme', 'Vivo', 'OnePlus', 'Google', 'Nokia', 'Tecno', 'Infinix', 'ZTE', 'Alcatel', 'Otra'],
    accessories: ['Cargador', 'Cable USB', 'Estuche o forro', 'Vidrio templado', 'Audífonos', 'Caja', 'Adaptador', 'SIM', 'Memoria microSD', 'Lápiz digital', 'Otro'],
    photoGuides: ['Frente', 'Parte trasera', 'Lateral izquierdo', 'Lateral derecho', 'Pantalla encendida', 'IMEI/serial', 'Daño visible'],
    specs: ['storageCapacity', 'powerOn', 'screenState', 'touchState', 'cameraState', 'chargingState', 'batteryState', 'operator', 'hasSim', 'hasMicroSd']
  },
  tablet: {
    label: 'Tablet',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
    brands: ['Samsung', 'Apple', 'Xiaomi', 'Redmi', 'Huawei', 'Honor', 'Lenovo', 'Amazon', 'Microsoft', 'Otra'],
    accessories: ['Cargador', 'Cable USB', 'Estuche o forro', 'Vidrio templado', 'Audífonos', 'Caja', 'Adaptador', 'SIM', 'Memoria microSD', 'Lápiz digital', 'Otro'],
    photoGuides: ['Frente', 'Parte trasera', 'Lateral izquierdo', 'Lateral derecho', 'Pantalla encendida', 'IMEI/serial', 'Daño visible'],
    specs: ['storageCapacity', 'powerOn', 'screenState', 'touchState', 'cameraState', 'chargingState', 'batteryState', 'operator', 'hasSim', 'hasMicroSd']
  },
  smartwatch: {
    label: 'Smartwatch',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="3" width="8" height="6" rx="2"/><rect x="8" y="15" width="8" height="6" rx="2"/><circle cx="12" cy="12" r="4"/></svg>',
    brands: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Amazfit', 'Garmin', 'Fitbit', 'Honor', 'Google', 'Otra'],
    accessories: ['Cargador', 'Cable', 'Correa', 'Caja', 'Protector', 'Adaptador', 'Otro'],
    photoGuides: ['Frente', 'Parte trasera', 'Correa', 'Cargador', 'Daño visible'],
    specs: ['powerOn', 'screenState', 'touchState', 'chargingState', 'batteryState', 'strapType', 'strapCondition']
  },
  console: {
    label: 'Consola',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8h12a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="12" r="1"/></svg>',
    brands: ['Sony PlayStation', 'Microsoft Xbox', 'Nintendo', 'Valve', 'Otra'],
    accessories: ['Cargador', 'Cable de poder', 'Control', 'Base', 'HDMI', 'Otro'],
    photoGuides: ['Frontal', 'Posterior', 'Lateral', 'Serial', 'Daño visible'],
    specs: ['processor', 'ram', 'storageUnits', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay']
  },
  printer: {
    label: 'Impresora',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V4h12v5"/><path d="M6 18h12v2H6z"/><rect x="4" y="9" width="16" height="9" rx="2"/></svg>',
    brands: ['HP', 'Epson', 'Canon', 'Brother', 'Xerox', 'Samsung', 'Lexmark', 'Kyocera', 'Ricoh', 'Otra'],
    accessories: ['Cable de poder', 'Cable USB', 'Cartuchos', 'Tóner', 'Bandeja', 'Adaptador', 'Otro'],
    photoGuides: ['Frontal', 'Posterior', 'Laterales', 'Serial', 'Daño visible'],
    specs: ['powerOn', 'imageDisplay']
  },
  monitor: {
    label: 'Monitor',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4"/><path d="M8 20h8"/></svg>',
    brands: ['HP', 'Dell', 'Samsung', 'LG', 'AOC', 'Asus', 'Acer', 'BenQ', 'Philips', 'Otra'],
    accessories: ['Cable de poder', 'Cable HDMI', 'Cable VGA', 'Base', 'Adaptador', 'Otro'],
    photoGuides: ['Frontal', 'Posterior', 'Laterales', 'Serial', 'Daño visible'],
    specs: ['powerOn', 'imageDisplay']
  },
  other: {
    label: 'Otro dispositivo',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
    brands: ['Otra'],
    accessories: ['Otro'],
    photoGuides: ['Frontal', 'Posterior', 'Lateral', 'Serial', 'Daño visible'],
    specs: ['genericNotes']
  }
};

const INCOME_DEVICE_ORDER = ['desktop', 'laptop', 'phone', 'tablet', 'smartwatch', 'console', 'printer', 'monitor', 'other'];

const INCOME_PHYSICAL_STATES = [
  'Golpes',
  'Rayones',
  'Partes quebradas',
  'Tornillos faltantes',
  'Pantalla rota',
  'Humedad visible',
  'Equipo desarmado',
  'Piezas sueltas',
  'Carcasa abierta',
  'Signos de manipulación previa',
  'Buen estado físico',
  'Otro'
];

const INCOME_STEP_IDS = ['client', 'device', 'details', 'accessories', 'photos', 'review'];

const INCOME_DEVICE_SPEC_LABELS = {
  processor: 'Procesador',
  ram: 'Memoria RAM',
  storageType: 'Tipo de almacenamiento',
  storageCapacity: 'Capacidad',
  operatingSystem: 'Sistema operativo',
  powerOn: '¿Enciende?',
  imageDisplay: '¿Da imagen?',
  batteryState: 'Estado de batería',
  chargerState: 'Estado del cargador',
  screenState: 'Estado de pantalla',
  touchState: 'Estado táctil',
  cameraState: 'Estado de cámaras',
  chargingState: 'Estado de carga',
  operator: 'Operador',
  hasSim: '¿Tiene SIM?',
  hasMicroSd: '¿Tiene microSD?',
  strapType: 'Tipo de correa',
  strapCondition: 'Estado de la correa',
  genericNotes: 'Observaciones técnicas'
};

const INCOME_SPEC_OPTIONS = {
  storageType: ['HDD', 'SSD SATA', 'SSD NVMe', 'eMMC', 'Otro', 'Desconocido'],
  storageCapacity: ['64 GB', '128 GB', '240 GB', '256 GB', '480 GB', '500 GB', '512 GB', '1 TB', '2 TB', 'Otra', 'Desconocida'],
  operatingSystem: ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Sin sistema', 'Desconocido'],
  powerOn: ['Sí', 'No', 'No se verificó'],
  imageDisplay: ['Sí', 'No', 'No se verificó'],
  batteryState: ['Buena', 'Regular', 'Mala', 'No aplica', 'No se verificó'],
  chargerState: ['Se entrega', 'No se entrega', 'No aplica', 'No se verificó'],
  screenState: ['Buena', 'Regular', 'Mala', 'Rota', 'No se verificó'],
  touchState: ['Funciona', 'No funciona', 'No se verificó'],
  cameraState: ['Funciona', 'No funciona', 'No se verificó'],
  chargingState: ['Funciona', 'Intermitente', 'No carga', 'No se verificó'],
  hasSim: ['Sí', 'No', 'No se verificó'],
  hasMicroSd: ['Sí', 'No', 'No se verificó'],
  strapType: ['Silicona', 'Metal', 'Cuero', 'Nailon', 'Otro'],
  strapCondition: ['Buena', 'Regular', 'Mala', 'No se verificó']
};

const INCOME_SPECS_BY_DEVICE = {
  desktop: ['processor', 'ram', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay', 'chargerState', 'genericNotes'],
  laptop: ['processor', 'ram', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay', 'batteryState', 'chargerState', 'genericNotes'],
  phone: ['storageCapacity', 'powerOn', 'screenState', 'touchState', 'cameraState', 'chargingState', 'batteryState', 'operator', 'hasSim', 'hasMicroSd', 'genericNotes'],
  tablet: ['storageCapacity', 'powerOn', 'screenState', 'touchState', 'cameraState', 'chargingState', 'batteryState', 'operator', 'hasSim', 'hasMicroSd', 'genericNotes'],
  smartwatch: ['powerOn', 'screenState', 'touchState', 'chargingState', 'batteryState', 'strapType', 'strapCondition', 'genericNotes'],
  console: ['processor', 'ram', 'storageType', 'storageCapacity', 'operatingSystem', 'powerOn', 'imageDisplay', 'genericNotes'],
  printer: ['powerOn', 'imageDisplay', 'genericNotes'],
  monitor: ['powerOn', 'imageDisplay', 'genericNotes'],
  other: ['genericNotes']
};

const INCOME_DEFAULT_SPECS = () => ({
  processor: '',
  ram: '',
  storageType: '',
  storageCapacity: '',
  operatingSystem: '',
  powerOn: '',
  imageDisplay: '',
  batteryState: '',
  chargerState: '',
  screenState: '',
  touchState: '',
  cameraState: '',
  chargingState: '',
  operator: '',
  hasSim: '',
  hasMicroSd: '',
  strapType: '',
  strapCondition: '',
  genericNotes: '',
  storageUnits: []
});

const INCOME_EMPTY_DEVICE = () => ({
  device_type: '',
  device_custom_type: '',
  brand: '',
  brand_custom: '',
  model: '',
  color: '',
  serial: '',
  serial_status: 'visible',
  imei1: '',
  imei2: '',
  unlock_code_hint: '',
  unlock_code_protected: false,
  problem_reported: '',
  physical_condition: [],
  physical_notes: '',
  identification_notes: '',
  accessories_without: false,
  specs: INCOME_DEFAULT_SPECS()
});

const INCOME_EMPTY_WIZARD = () => ({
  mode: 'create',
  stepIndex: 0,
  client: null,
  clientQuery: '',
  clientResults: [],
  device: INCOME_EMPTY_DEVICE(),
  accessories: [],
  photos: [],
  removedPhotoIds: [],
  confirmSave: false,
  saving: false,
  progress: 0,
  title: 'Nuevo ingreso',
  entryId: null,
  technician_id: null
});

const incomeUtils = {
  deviceLabel(type) {
    return INCOME_DEVICE_CATALOG[type]?.label || 'Dispositivo';
  },

  stepLabel(index) {
    const labels = ['Cliente', 'Dispositivo', 'Problema', 'Accesorios', 'Fotografías', 'Revisión'];
    return labels[index] || '';
  },

  maskValue(value, visible = 4) {
    const text = String(value || '').trim();
    if (!text) return '-';
    if (text.length <= visible) return text;
    return `${text.slice(0, 2)}${'•'.repeat(Math.max(text.length - visible - 2, 2))}${text.slice(-visible)}`;
  },

  getDeviceCatalog(type) {
    return INCOME_DEVICE_CATALOG[type] || INCOME_DEVICE_CATALOG.other;
  },

  isMobileDevice(type) {
    return ['phone', 'tablet', 'smartwatch'].includes(type);
  },

  isComputerDevice(type) {
    return ['desktop', 'laptop', 'console', 'printer', 'monitor'].includes(type);
  },

  cloneDeep(value) {
    return JSON.parse(JSON.stringify(value));
  }
};

const Ingresos = {
  entries: [],
  filteredEntries: [],
  searchQuery: '',
  filterDevice: 'all',
  filterStatus: 'all',
  wizard: INCOME_EMPTY_WIZARD(),
  wizardModal: null,
  detailModal: null,
  detailOpening: false,
  config: null,
  technicians: [],

  async init() {
    if (!Auth.requireAuth()) return;

    Dashboard.renderSidebar();
    Dashboard.setupTheme();
    await this.loadConfig();
    await this.loadTechnicians();
    await this.loadEntries();
    this.render();
    this.setupEventListeners();
    this.setupSearch();
    this.openEntryFromQuery();
  },

  async loadTechnicians() {
    try {
      const result = await supabase.from('technicians').select('id,full_name,specialty,is_active').eq('business_id', Auth.getUserId()).eq('is_active', true).order('full_name');
      this.technicians = Array.isArray(result) ? result : [];
    } catch { this.technicians = []; }
  },

  async loadConfig() {
    try {
      const userId = Auth.getUserId();
      const configs = await supabase.from('business_config').select('*').eq('user_id', userId).limit(1);
      this.config = Array.isArray(configs) && configs.length ? configs[0] : { business_name: 'Mi negocio' };
    } catch {
      this.config = { business_name: 'Mi negocio' };
    }
  },

  async loadEntries() {
    try {
      const userId = Auth.getUserId();
      if (!userId) return;

      const result = await supabase.from('income_entries')
        .select('*, clients(id,name,last_name,phone,company,email,address,document), income_entry_accessories(*), income_entry_photos(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(150);

      this.entries = Array.isArray(result) ? result.map((entry) => this.normalizeEntry(entry)) : [];
      await this.prefetchMainPhotoUrls();
    } catch (e) {
      console.error('Error loading income entries:', e);
      this.entries = [];
    }
  },

  normalizeEntry(entry) {
    const accessories = Array.isArray(entry.income_entry_accessories) ? [...entry.income_entry_accessories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];
    const photos = Array.isArray(entry.income_entry_photos) ? [...entry.income_entry_photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];
    const mainPhoto = photos.find((photo) => photo.is_primary) || photos[0] || null;

    return {
      ...entry,
      client: entry.clients || null,
      accessories,
      photos,
      mainPhoto,
      specs: entry.specs || {},
      physical_condition: Array.isArray(entry.physical_condition) ? entry.physical_condition : []
    };
  },

  async hydratePhotoUrls(entry) {
    if (!entry) return entry;
    const photos = Array.isArray(entry.photos) ? entry.photos : [];
    const hydratedPhotos = await Promise.all(photos.map(async (photo) => {
      if (!photo?.file_path) return { ...photo, signedUrl: '' };
      try {
        const objectUrl = await Storage.getAuthenticatedObjectUrl(CONFIG.storage.buckets.incomePhotos, photo.file_path);
        return { ...photo, signedUrl: objectUrl || '' };
      } catch {
        try {
          const signedUrl = await Storage.getSignedUrl(CONFIG.storage.buckets.incomePhotos, photo.file_path, 3600);
          return { ...photo, signedUrl: signedUrl || '' };
        } catch {
          return { ...photo, signedUrl: '' };
        }
      }
    }));
    const mainPhoto = hydratedPhotos.find((photo) => photo.is_primary) || hydratedPhotos[0] || null;
    return {
      ...entry,
      photos: hydratedPhotos,
      mainPhoto,
      mainPhotoUrl: mainPhoto?.signedUrl || ''
    };
  },

  async prefetchMainPhotoUrls() {
    const entriesWithPhotos = this.entries.filter((entry) => entry.mainPhoto?.file_path);
    await Promise.all(entriesWithPhotos.slice(0, 40).map(async (entry) => {
      try {
        entry.mainPhotoUrl = await Storage.getAuthenticatedObjectUrl(CONFIG.storage.buckets.incomePhotos, entry.mainPhoto.file_path);
      } catch {
        try {
          entry.mainPhotoUrl = await Storage.getSignedUrl(CONFIG.storage.buckets.incomePhotos, entry.mainPhoto.file_path, 3600);
        } catch {
          entry.mainPhotoUrl = '';
        }
      }
    }));
  },

  render() {
    this.applyFilters();
    this.renderStats();
    this.renderList();
  },

  applyFilters() {
    let filtered = [...this.entries];

    if (this.searchQuery) {
      filtered = Utils.searchItems(filtered, this.searchQuery, [
        'code',
        'client.name',
        'client.last_name',
        'client.phone',
        'client.company',
        'device_type',
        'device_custom_type',
        'brand',
        'brand_custom',
        'model',
        'serial',
        'imei1',
        'imei2'
      ]);
    }

    if (this.filterDevice !== 'all') {
      filtered = filtered.filter((entry) => entry.device_type === this.filterDevice);
    }

    if (this.filterStatus !== 'all') {
      filtered = filtered.filter((entry) => entry.status === this.filterStatus);
    }

    this.filteredEntries = filtered;
  },

  renderStats() {
    const container = document.getElementById('income-stats');
    if (!container) return;

    const total = this.entries.length;
    const active = this.entries.filter((entry) => entry.status !== 'delivered' && entry.status !== 'cancelled').length;
    const thisMonth = this.entries.filter((entry) => {
      const created = new Date(entry.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;
    const withPhotos = this.entries.filter((entry) => (entry.photos || []).length > 0).length;

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Ingresos registrados</div>
          <div class="stat-value">${total}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Activos</div>
          <div class="stat-value">${active}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21V11"/><path d="M4 21V3"/><path d="M4 13h16"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Este mes</div>
          <div class="stat-value">${thisMonth}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">Con fotos</div>
          <div class="stat-value">${withPhotos}</div>
        </div>
      </div>
    `;
  },

  renderList() {
    const container = document.getElementById('income-list');
    if (!container) return;

    const countEl = document.getElementById('income-count');
    if (countEl) {
      countEl.textContent = `${this.filteredEntries.length} ingreso${this.filteredEntries.length === 1 ? '' : 's'}`;
    }

    if (!this.filteredEntries.length) {
      container.innerHTML = '';
      container.appendChild(Components.emptyState({
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/></svg>',
        title: this.searchQuery ? 'No encontramos ingresos' : 'Sin ingresos todavía',
        description: this.searchQuery ? 'Prueba con otro código, cliente, serial o IMEI.' : 'Crea el primer ingreso de equipos para empezar.',
        action: { label: 'Nuevo ingreso', onClick: () => this.openWizard() }
      }));
      return;
    }

    container.innerHTML = `
      <div class="income-grid">
        ${this.filteredEntries.map((entry) => this.renderEntryCard(entry)).join('')}
      </div>
    `;

    container.querySelectorAll('[data-income-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const entry = this.entries.find((item) => item.id === card.dataset.incomeId);
        if (entry) this.openDetail(entry);
      });
    });
  },

  renderEntryCard(entry) {
    const client = entry.client || {};
    const clientName = `${client.name || ''} ${client.last_name || ''}`.trim() || 'Sin cliente';
    const deviceLabel = incomeUtils.deviceLabel(entry.device_type);
    const serial = entry.serial || entry.imei1 || entry.imei2 || entry.serial_status;
    const photoSrc = entry.mainPhotoUrl || '';

    return `
      <article class="income-card" data-income-id="${entry.id}">
        <div class="income-card-media">
          ${photoSrc ? `<img src="${photoSrc}" alt="Foto principal">` : `<div class="income-card-placeholder">${INCOME_DEVICE_CATALOG[entry.device_type]?.icon || INCOME_DEVICE_CATALOG.other.icon}</div>`}
        </div>
        <div class="income-card-body">
          <div class="income-card-top">
            <div>
              <div class="income-card-code">${Utils.sanitize(entry.code || '-')}</div>
              <div class="income-card-client">${Utils.sanitize(clientName)}</div>
            </div>
            <span class="badge ${entry.status === 'delivered' ? 'badge-success' : entry.status === 'cancelled' ? 'badge-danger' : 'badge-info'}">${this.getStatusLabel(entry.status)}</span>
          </div>
          <div class="income-card-meta">
            ${client.phone ? `<span>${Utils.sanitize(client.phone)}</span>` : ''}
            <span>${Utils.sanitize(deviceLabel)}</span>
            ${entry.brand || entry.brand_custom ? `<span>${Utils.sanitize(entry.brand_custom || entry.brand || '')}${entry.model ? ` · ${Utils.sanitize(entry.model)}` : ''}</span>` : ''}
            ${serial ? `<span>${Utils.sanitize(serial)}</span>` : ''}
            <span>${Utils.formatDateTime(entry.created_at)}</span>
          </div>
          <div class="income-card-problem">${Utils.sanitize(Utils.truncate(entry.problem_reported || 'Sin problema registrado', 140))}</div>
        </div>
      </article>
    `;
  },

  getStatusLabel(status) {
    const labels = {
      received: 'Recibido',
      in_review: 'En revisión',
      repairing: 'En reparación',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return labels[status] || 'Recibido';
  },

  setupEventListeners() {
    document.getElementById('btn-new-income')?.addEventListener('click', () => this.openWizard());
    document.getElementById('income-device-filter')?.addEventListener('change', (e) => {
      this.filterDevice = e.target.value;
      this.render();
    });
    document.getElementById('income-status-filter')?.addEventListener('change', (e) => {
      this.filterStatus = e.target.value;
      this.render();
    });
  },

  setupSearch() {
    const input = document.getElementById('income-search');
    if (!input) return;
    input.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this.render();
    }, 250));
  },

  async openEntryFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const entry = this.entries.find((item) => item.id === id);
    if (entry) {
      this.openDetail(entry);
      return;
    }

    try {
      const userId = Auth.getUserId();
      const result = await supabase.from('income_entries')
        .select('*, clients(id,name,last_name,phone,company,email,address,document), income_entry_accessories(*), income_entry_photos(*)')
        .eq('user_id', userId)
        .eq('id', id)
        .limit(1);
      const item = Array.isArray(result) && result.length ? this.normalizeEntry(result[0]) : null;
      if (item) {
        this.entries.unshift(item);
        await this.prefetchMainPhotoUrls();
        this.render();
        this.openDetail(item);
      }
    } catch (e) {
      console.error('Error opening entry from query:', e);
    }
  },

  buildWizardTitle() {
    return this.wizard.mode === 'edit' ? 'Editar ingreso' : 'Nuevo ingreso';
  },

  openWizard(entry = null, mode = 'create') {
    this.wizard = INCOME_EMPTY_WIZARD();
    this.wizard.mode = mode;
    this.wizard.title = mode === 'edit' ? 'Editar ingreso' : 'Nuevo ingreso';
    if (entry) {
      this.fillWizardFromEntry(entry);
    }

    const content = Utils.createElement('div', { className: 'income-wizard-root' });
    content.innerHTML = this.renderWizardMarkup();

    this.wizardModal = Components.modal({
      title: this.buildWizardTitle(),
      content,
      size: 'full',
      actions: [],
      className: 'income-wizard-modal'
    });

    this.bindWizardEvents();
    this.renderWizardStep();
  },

  fillWizardFromEntry(entry) {
    this.wizard.mode = 'edit';
    this.wizard.entryId = entry.id;
    this.wizard.technician_id = entry.technician_id || null;
    this.wizard.client = entry.client || null;
    this.wizard.device = {
      device_type: entry.device_type || '',
      device_custom_type: entry.device_custom_type || '',
      brand: entry.brand || '',
      brand_custom: entry.brand_custom || '',
      model: entry.model || '',
      color: entry.color || '',
      serial: entry.serial || '',
      serial_status: entry.serial_status || 'visible',
      imei1: entry.imei1 || '',
      imei2: entry.imei2 || '',
      unlock_code_hint: entry.unlock_code_hint || '',
      unlock_code_protected: !!entry.unlock_code_protected,
      problem_reported: entry.problem_reported || '',
      physical_condition: Array.isArray(entry.physical_condition) ? [...entry.physical_condition] : [],
      physical_notes: entry.physical_notes || '',
      identification_notes: entry.identification_notes || '',
      accessories_without: !!entry.accessories_without,
      specs: { ...INCOME_DEFAULT_SPECS(), ...(entry.specs || {}) }
    };
    this.wizard.accessories = (entry.accessories || []).map((item) => ({
      id: item.id || Utils.generateId(),
      accessory_type: item.accessory_type || 'preset',
      name: item.name || '',
      custom_name: item.custom_name || '',
      quantity: item.quantity || 1,
      condition: item.condition || '',
      notes: item.notes || '',
      sort_order: item.sort_order || 0
    }));
    this.wizard.photos = (entry.photos || []).map((photo) => ({
      id: photo.id,
      existing: true,
      file_path: photo.file_path,
      angle: photo.angle || '',
      description: photo.description || '',
      sort_order: photo.sort_order || 0,
      is_primary: !!photo.is_primary,
      file_size: photo.file_size || 0,
      mime_type: photo.mime_type || '',
      width: photo.width || null,
      height: photo.height || null,
      signedUrl: entry.mainPhoto?.id === photo.id ? entry.mainPhotoUrl || '' : '',
      removed: false
    }));
    this.wizard.confirmSave = true;
    this.wizard.stepIndex = 0;
  },

  renderWizardMarkup() {
    return `
      <div class="income-wizard">
        <div class="income-wizard-stepper">
          ${INCOME_STEP_IDS.map((id, index) => `
            <button class="income-step ${index === this.wizard.stepIndex ? 'active' : ''} ${index < this.wizard.stepIndex ? 'completed' : ''}" data-step="${index}">
              <span class="income-step-index">${index + 1}</span>
              <span class="income-step-label">${incomeUtils.stepLabel(index)}</span>
            </button>
          `).join('')}
        </div>
        <div class="income-wizard-main" id="income-wizard-main"></div>
        <div class="income-wizard-footer">
          <div class="income-wizard-footer-left">
            <button class="btn btn-ghost" id="income-wizard-cancel">Cancelar</button>
          </div>
          <div class="income-wizard-footer-right">
            <button class="btn btn-secondary" id="income-wizard-back">Atrás</button>
            <button class="btn btn-primary" id="income-wizard-next">Continuar</button>
          </div>
        </div>
      </div>
    `;
  },

  bindWizardEvents() {
    const root = this.wizardModal?.body || document;
    root.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetStep = Number(btn.dataset.step || 0);
        if (targetStep < this.wizard.stepIndex) {
          this.wizard.stepIndex = targetStep;
          this.renderWizardStep();
        }
      });
    });

    root.querySelector('#income-wizard-cancel')?.addEventListener('click', () => this.wizardModal?.close());
    root.querySelector('#income-wizard-back')?.addEventListener('click', () => {
      if (this.wizard.stepIndex > 0) {
        this.persistWizardFromDom();
        this.wizard.stepIndex -= 1;
        this.renderWizardStep();
      }
    });
    root.querySelector('#income-wizard-next')?.addEventListener('click', () => this.handleWizardNext());
  },

  renderWizardStep() {
    const main = this.wizardModal?.body?.querySelector('#income-wizard-main');
    if (!main) return;

    const step = INCOME_STEP_IDS[this.wizard.stepIndex];
    main.innerHTML = this.renderStepContent(step);
    this.updateWizardControls();
    this.bindStepEvents(step);
    this.renderWizardStepperState();
  },

  renderWizardStepperState() {
    const root = this.wizardModal?.body;
    if (!root) return;
    root.querySelectorAll('.income-step').forEach((btn) => {
      const index = Number(btn.dataset.step || 0);
      btn.classList.toggle('active', index === this.wizard.stepIndex);
      btn.classList.toggle('completed', index < this.wizard.stepIndex);
    });
  },

  updateWizardControls() {
    const back = this.wizardModal?.body?.querySelector('#income-wizard-back');
    const next = this.wizardModal?.body?.querySelector('#income-wizard-next');
    if (back) back.style.visibility = this.wizard.stepIndex === 0 ? 'hidden' : 'visible';
    if (next) next.textContent = this.wizard.stepIndex === INCOME_STEP_IDS.length - 1 ? 'Registrar ingreso' : 'Continuar';
  },

  renderStepContent(step) {
    if (step === 'client') return this.renderClientStep();
    if (step === 'device') return this.renderDeviceStep();
    if (step === 'details') return this.renderDetailsStep();
    if (step === 'accessories') return this.renderAccessoriesStep();
    if (step === 'photos') return this.renderPhotosStep();
    return this.renderReviewStep();
  },

  renderClientStep() {
    const client = this.wizard.client;
    const query = this.wizard.clientQuery || '';
    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Buscar cliente por teléfono, nombre o correo</h3>
          <p class="card-subtitle">El teléfono es la forma principal de encontrar el cliente.</p>
          <div class="search-bar mt-4" style="max-width:none">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="tel" class="form-input" id="income-client-search" placeholder="Buscar cliente por teléfono, nombre o correo" value="${Utils.escapeHtml(query)}">
          </div>
          <div id="income-client-results" class="income-client-results"></div>
        </div>
        <div class="card mt-4" id="income-client-summary" style="${client ? '' : 'display:none'}">
          <h4 class="card-title mb-3">Cliente seleccionado</h4>
          <div class="income-client-summary-grid">
            <div><span>Nombre</span><strong id="income-client-summary-name"></strong></div>
            <div><span>Teléfono</span><strong id="income-client-summary-phone"></strong></div>
            <div><span>Correo</span><strong id="income-client-summary-email"></strong></div>
            <div><span>Empresa</span><strong id="income-client-summary-company"></strong></div>
            <div class="income-full-span"><span>Dirección</span><strong id="income-client-summary-address"></strong></div>
          </div>
          <div class="mt-4 flex gap-3 flex-wrap">
            <button class="btn btn-secondary" id="income-change-client">Cambiar cliente</button>
            <button class="btn btn-outline" id="income-open-client-modal">Registrar nuevo cliente</button>
          </div>
        </div>
      </div>
    `;
  },

  renderDeviceStep() {
    const device = this.wizard.device;
    const catalog = INCOME_DEVICE_CATALOG[device.device_type] || null;
    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Tipo de dispositivo</h3>
          <div class="income-device-grid mt-4">
            ${INCOME_DEVICE_ORDER.map((type) => `
              <button class="income-device-card ${device.device_type === type ? 'active' : ''}" data-device-type="${type}">
                <span class="income-device-card-icon">${INCOME_DEVICE_CATALOG[type].icon}</span>
                <span class="income-device-card-label">${INCOME_DEVICE_CATALOG[type].label}</span>
              </button>
            `).join('')}
          </div>
          ${device.device_type === 'other' ? `
            <div class="form-group mt-4">
              <label class="form-label form-label-required">Tipo personalizado</label>
              <input type="text" class="form-input" id="income-device-custom-type" value="${Utils.escapeHtml(device.device_custom_type || '')}" placeholder="Escribe el tipo de equipo">
            </div>
          ` : ''}
        </div>
        ${catalog ? `
          <div class="card mt-4">
            <h4 class="card-title">Marca</h4>
            <div class="income-chip-wrap mt-4" id="income-brand-chips">
              ${catalog.brands.map((brand) => `
                <button class="chip ${device.brand === brand ? 'chip-primary' : ''}" data-brand="${Utils.escapeHtml(brand)}">${Utils.escapeHtml(brand)}</button>
              `).join('')}
            </div>
            ${device.brand === 'Otra' || device.brand_custom ? `
              <div class="form-group mt-4">
                <label class="form-label form-label-required">Marca personalizada</label>
                <input type="text" class="form-input" id="income-brand-custom" value="${Utils.escapeHtml(device.brand_custom || '')}" placeholder="Escribe la marca">
              </div>
            ` : ''}
          </div>
        ` : ''}
        <div class="card mt-4">
          <h4 class="card-title">Datos generales del equipo</h4>
          <div class="grid-form mt-4">
            <div class="form-group">
              <label class="form-label">Modelo</label>
              <input type="text" class="form-input" id="income-model" value="${Utils.escapeHtml(device.model || '')}" placeholder="Modelo">
            </div>
            <div class="form-group">
              <label class="form-label">Color</label>
              <input type="text" class="form-input" id="income-color" value="${Utils.escapeHtml(device.color || '')}" placeholder="Color">
            </div>
            <div class="form-group">
              <label class="form-label">Serial</label>
              <input type="text" class="form-input" id="income-serial" value="${Utils.escapeHtml(device.serial || '')}" placeholder="Serial">
            </div>
            <div class="form-group">
              <label class="form-label">Estado del serial</label>
              <select class="form-select" id="income-serial-status">
                <option value="visible" ${device.serial_status === 'visible' ? 'selected' : ''}>Visible</option>
                <option value="not_visible" ${device.serial_status === 'not_visible' ? 'selected' : ''}>No visible</option>
                <option value="not_applicable" ${device.serial_status === 'not_applicable' ? 'selected' : ''}>No aplica</option>
                <option value="pending" ${device.serial_status === 'pending' ? 'selected' : ''}>Pendiente por verificar</option>
              </select>
            </div>
            ${incomeUtils.isMobileDevice(device.device_type) ? `
              <div class="form-group">
                <label class="form-label">${device.device_type === 'phone' ? 'IMEI 1' : 'Identificador 1'}</label>
                <input type="text" class="form-input" id="income-imei1" inputmode="numeric" value="${Utils.escapeHtml(device.imei1 || '')}" placeholder="IMEI o identificador">
              </div>
              <div class="form-group">
                <label class="form-label">IMEI 2 / opcional</label>
                <input type="text" class="form-input" id="income-imei2" inputmode="numeric" value="${Utils.escapeHtml(device.imei2 || '')}" placeholder="IMEI secundario">
              </div>
            ` : ''}
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Observaciones de identificación</label>
              <textarea class="form-input" id="income-identification-notes" rows="3" placeholder="Cualquier detalle útil para identificar el equipo">${Utils.escapeHtml(device.identification_notes || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Código de bloqueo, patrón o contraseña</label>
              <input type="text" class="form-input" id="income-unlock-code" value="${Utils.escapeHtml(device.unlock_code_hint || '')}" placeholder="Código, patrón o contraseña">
              <div class="form-help">Se guardará y mostrará completo en el detalle del ingreso.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderDetailsStep() {
    const device = this.wizard.device;
    const specKeys = INCOME_SPECS_BY_DEVICE[device.device_type] || ['genericNotes'];
    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Problema y estado de recepción</h3>
          <div class="grid-form mt-4">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label" for="income-technician">Técnico responsable</label>
              <select class="form-select" id="income-technician">
                <option value="">Sin asignar</option>
                ${this.technicians.map((technician) => `<option value="${technician.id}" ${this.wizard.technician_id === technician.id ? 'selected' : ''}>${Utils.escapeHtml(technician.full_name)} — ${Utils.escapeHtml(technician.specialty)}</option>`).join('')}
              </select>
              <div class="form-help">Puedes asignarlo ahora o hacerlo después desde la bandeja de Técnicos.</div>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label form-label-required">¿Por qué ingresa el equipo?</label>
              <textarea class="form-input" id="income-problem" rows="4" placeholder="Describe exactamente lo que manifiesta el cliente.">${Utils.escapeHtml(device.problem_reported || '')}</textarea>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Problemas frecuentes</label>
              <div class="income-chip-wrap">
                ${['No enciende', 'Se apaga', 'No carga', 'Pantalla rota', 'Lento', 'Se mojó', 'Se congela', 'Solicita mantenimiento'].map((problem) => `
                  <button class="chip" data-problem-chip="${Utils.escapeHtml(problem)}">${Utils.escapeHtml(problem)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Estado físico observado</label>
              <div class="income-chip-wrap">
                ${INCOME_PHYSICAL_STATES.map((state) => `
                  <button class="chip ${device.physical_condition.includes(state) ? 'chip-primary' : ''}" data-physical-state="${Utils.escapeHtml(state)}">${Utils.escapeHtml(state)}</button>
                `).join('')}
              </div>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Observaciones de recepción</label>
              <textarea class="form-input" id="income-physical-notes" rows="3" placeholder="Ejemplo: pantalla quebrada, tornillos faltantes...">${Utils.escapeHtml(device.physical_notes || '')}</textarea>
            </div>
          </div>
        </div>

        ${this.renderSpecsSection(specKeys)}
      </div>
    `;
  },

  renderSpecsSection(specKeys) {
    if (!specKeys || !specKeys.length) return '';
    const device = this.wizard.device;
    const specs = device.specs || INCOME_DEFAULT_SPECS();

    const fields = specKeys.map((key) => {
      if (key === 'storageUnits') {
        const rows = Array.isArray(specs.storageUnits) && specs.storageUnits.length ? specs.storageUnits : [{ id: Utils.generateId(), type: '', capacity: '' }];
        return `
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Almacenamiento</label>
            <div id="income-storage-list" class="income-storage-list">
              ${rows.map((row, index) => `
                <div class="income-storage-row" data-storage-row="${index}">
                  <input type="text" class="form-input" data-storage-field="type" value="${Utils.escapeHtml(row.type || '')}" placeholder="Tipo">
                  <input type="text" class="form-input" data-storage-field="capacity" value="${Utils.escapeHtml(row.capacity || '')}" placeholder="Capacidad">
                  <button class="btn btn-ghost btn-sm" data-remove-storage="${index}">Quitar</button>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-outline btn-sm mt-3" id="income-add-storage">Agregar almacenamiento</button>
          </div>
        `;
      }

      if (key === 'genericNotes') {
        return `
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">${INCOME_DEVICE_SPEC_LABELS[key]}</label>
            <textarea class="form-input" id="income-spec-${key}" rows="3" placeholder="Observaciones técnicas">${Utils.escapeHtml(specs[key] || '')}</textarea>
          </div>
        `;
      }

      const options = INCOME_SPEC_OPTIONS[key] || [];
      return `
        <div class="form-group">
          <label class="form-label">${INCOME_DEVICE_SPEC_LABELS[key] || key}</label>
          ${options.length ? `
            <select class="form-select" id="income-spec-${key}">
              <option value="">Seleccionar</option>
              ${options.map((option) => `<option value="${Utils.escapeHtml(option)}" ${specs[key] === option ? 'selected' : ''}>${Utils.escapeHtml(option)}</option>`).join('')}
            </select>
          ` : `
            <input type="text" class="form-input" id="income-spec-${key}" value="${Utils.escapeHtml(specs[key] || '')}">
          `}
        </div>
      `;
    }).join('');

    return `
      <div class="card mt-4">
        <h3 class="card-title">Especificaciones del equipo</h3>
        <div class="grid-form mt-4">${fields}</div>
      </div>
    `;
  },

  renderAccessoriesStep() {
    const device = this.wizard.device;
    const catalog = INCOME_DEVICE_CATALOG[device.device_type] || INCOME_DEVICE_CATALOG.other;
    const accessories = this.wizard.accessories;
    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Accesorios</h3>
          <p class="card-subtitle">Selecciona con chips o marca que se recibe sin accesorios.</p>
          <label class="income-no-accessories">
            <input type="checkbox" id="income-without-accessories" ${device.accessories_without ? 'checked' : ''}>
            <span>Se recibe sin accesorios</span>
          </label>
          <div class="income-chip-wrap mt-4 ${device.accessories_without ? 'is-disabled' : ''}" id="income-accessory-chips">
            ${catalog.accessories.map((accessory) => `
              <button class="chip ${accessories.some((item) => item.name === accessory || item.custom_name === accessory) ? 'chip-primary' : ''}" data-accessory="${Utils.escapeHtml(accessory)}">${Utils.escapeHtml(accessory)}</button>
            `).join('')}
          </div>
          <div class="mt-4">
            <button class="btn btn-outline btn-sm" id="income-add-custom-accessory" ${device.accessories_without ? 'disabled' : ''}>Agregar accesorio personalizado</button>
          </div>
        </div>
        <div class="card mt-4">
          <h4 class="card-title">Accesorios seleccionados</h4>
          <div class="income-selected-accessories mt-4" id="income-selected-accessories">
            ${accessories.length ? accessories.map((item, index) => this.renderAccessoryRow(item, index)).join('') : '<div class="text-secondary text-sm">Aún no has agregado accesorios.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  renderAccessoryRow(item, index) {
    return `
      <div class="income-accessory-row" data-accessory-index="${index}">
        <div class="income-accessory-row-head">
          <strong>${Utils.sanitize(item.custom_name || item.name || 'Accesorio')}</strong>
          <button class="btn btn-ghost btn-sm" data-remove-accessory="${index}">Eliminar</button>
        </div>
        <div class="grid-form">
          ${item.accessory_type === 'custom' || !item.name ? `
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label form-label-required">Nombre del accesorio</label>
              <input type="text" class="form-input" data-accessory-field="custom_name" value="${Utils.escapeHtml(item.custom_name || '')}" placeholder="Escribe el accesorio">
            </div>
          ` : ''}
          <div class="form-group">
            <label class="form-label">Cantidad</label>
            <input type="number" min="1" class="form-input" data-accessory-field="quantity" value="${item.quantity || 1}">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <input type="text" class="form-input" data-accessory-field="condition" value="${Utils.escapeHtml(item.condition || '')}" placeholder="Ej: bueno, regular">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Observación</label>
            <input type="text" class="form-input" data-accessory-field="notes" value="${Utils.escapeHtml(item.notes || '')}" placeholder="Observación breve">
          </div>
        </div>
      </div>
    `;
  },

  renderPhotosStep() {
    const suggestions = this.getPhotoSuggestions();
    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Fotografías del equipo</h3>
          <p class="card-subtitle">Puedes tomar fotos o elegirlas desde la galería.</p>
          <div class="income-photo-actions">
            <button class="btn btn-primary" id="income-camera-btn">Tomar foto</button>
            <button class="btn btn-secondary" id="income-gallery-btn">Elegir de la galería</button>
            <button class="btn btn-outline" id="income-add-more-photos">Agregar más fotografías</button>
          </div>
          <div class="income-photo-guides mt-4">
            ${suggestions.map((item) => `<span class="chip">${Utils.sanitize(item)}</span>`).join('')}
          </div>
          <input type="file" id="income-photo-camera" accept="image/*" capture="environment" multiple hidden>
          <input type="file" id="income-photo-gallery" accept="image/*" multiple hidden>
          <div class="income-photo-grid mt-4" id="income-photo-grid">
            ${this.wizard.photos.length ? this.wizard.photos.map((photo, index) => this.renderPhotoCard(photo, index)).join('') : '<div class="income-photo-empty">Todavía no has cargado fotografías.</div>'}
          </div>
        </div>
      </div>
    `;
  },

  renderPhotoCard(photo, index) {
    const url = photo.preview || photo.signedUrl || '';
    return `
      <div class="income-photo-card ${photo.removed ? 'is-removed' : ''}" data-photo-index="${index}">
        <div class="income-photo-thumb">
          ${url ? `<img src="${url}" alt="Fotografía">` : '<div class="income-photo-empty-thumb">Sin vista previa</div>'}
        </div>
        <div class="income-photo-meta">
          <input type="text" class="form-input" data-photo-field="angle" value="${Utils.escapeHtml(photo.angle || '')}" placeholder="Ángulo">
          <textarea class="form-input" data-photo-field="description" rows="2" placeholder="Descripción">${Utils.escapeHtml(photo.description || '')}</textarea>
          <label class="form-checkbox">
            <input type="checkbox" data-photo-field="is_primary" ${photo.is_primary ? 'checked' : ''}>
            <span class="text-sm">Principal</span>
          </label>
          <button class="btn btn-ghost btn-sm" data-remove-photo="${index}">${photo.existing ? 'Quitar' : 'Eliminar'}</button>
        </div>
      </div>
    `;
  },

  renderReviewStep() {
    const client = this.wizard.client;
    const device = this.wizard.device;
    const catalog = INCOME_DEVICE_CATALOG[device.device_type] || INCOME_DEVICE_CATALOG.other;
    const selectedBrand = device.brand === 'Otra' ? device.brand_custom : device.brand;
    const serial = device.serial || device.imei1 || device.imei2 || device.serial_status;
    const accessories = device.accessories_without ? ['Se recibe sin accesorios'] : this.wizard.accessories.map((item) => item.custom_name || item.name).filter(Boolean);

    return `
      <div class="income-step-panel">
        <div class="card">
          <h3 class="card-title">Revisión final</h3>
          <div class="income-summary-grid mt-4">
            <div><span>Cliente</span><strong>${Utils.sanitize(client ? `${client.name || ''} ${client.last_name || ''}`.trim() : 'Sin cliente')}</strong></div>
            <div><span>Teléfono</span><strong>${Utils.sanitize(client?.phone || '-')}</strong></div>
            <div><span>Equipo</span><strong>${Utils.sanitize(catalog.label)}</strong></div>
            <div><span>Marca</span><strong>${Utils.sanitize(selectedBrand || '-')}</strong></div>
            <div><span>Modelo</span><strong>${Utils.sanitize(device.model || '-')}</strong></div>
            <div><span>Serial / IMEI</span><strong>${Utils.sanitize(incomeUtils.maskValue(serial || '-'))}</strong></div>
            <div class="income-full-span"><span>Problema</span><strong>${Utils.sanitize(Utils.truncate(device.problem_reported || '-', 200))}</strong></div>
            <div class="income-full-span"><span>Estado físico</span><strong>${Utils.sanitize((device.physical_condition || []).join(', ') || '-')}</strong></div>
            <div class="income-full-span"><span>Accesorios</span><strong>${Utils.sanitize(accessories.join(', ') || '-')}</strong></div>
            <div class="income-full-span"><span>Fotografías</span><strong>${this.wizard.photos.filter((photo) => !photo.removed).length}</strong></div>
          </div>
          <div class="mt-4">
            <label class="form-checkbox">
              <input type="checkbox" id="income-confirm-save" ${this.wizard.confirmSave ? 'checked' : ''}>
              <span class="text-sm">Confirmo que la información es correcta y autorizo el registro</span>
            </label>
          </div>
        </div>
      </div>
    `;
  },

  bindStepEvents(step) {
    const root = this.wizardModal?.body?.querySelector('#income-wizard-main');
    if (!root) return;

    if (step === 'client') this.bindClientStepEvents(root);
    if (step === 'device') this.bindDeviceStepEvents(root);
    if (step === 'details') this.bindDetailsStepEvents(root);
    if (step === 'accessories') this.bindAccessoriesStepEvents(root);
    if (step === 'photos') this.bindPhotosStepEvents(root);
    if (step === 'review') this.bindReviewStepEvents(root);
  },

  bindClientStepEvents(root) {
    const input = root.querySelector('#income-client-search');
    const results = root.querySelector('#income-client-results');
    if (!input || !results) return;

    const search = Utils.debounce(async (value) => {
      this.wizard.clientQuery = value;
      if (!value || value.trim().length < 2) {
        results.innerHTML = '<div class="income-empty-hint">Empieza a escribir para buscar clientes.</div>';
        return;
      }

      const query = value.trim();
      try {
        const userId = Auth.getUserId();
        const clients = await supabase.from('clients')
          .select('id,name,last_name,phone,company,email,address')
          .eq('user_id', userId)
          .or(`phone.ilike.%${query}%,name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(8);

        this.wizard.clientResults = Array.isArray(clients) ? clients : [];
        if (!this.wizard.clientResults.length) {
          results.innerHTML = `
            <div class="income-empty-hint">
              <strong>No encontramos un cliente con estos datos</strong>
              <div class="mt-2">Puedes registrar uno nuevo sin salir del flujo.</div>
              <button class="btn btn-primary btn-sm mt-3" id="income-register-new-client">Registrar nuevo cliente</button>
            </div>
          `;
          results.querySelector('#income-register-new-client')?.addEventListener('click', () => this.openQuickClientModal(query));
          return;
        }

        results.innerHTML = this.wizard.clientResults.map((client) => `
          <button class="income-client-result" data-client-id="${client.id}">
            <div class="income-client-result-main">
              <strong>${Utils.sanitize(`${client.name || ''} ${client.last_name || ''}`.trim() || 'Sin nombre')}</strong>
              <span>${Utils.sanitize(client.phone || client.email || client.company || '')}</span>
            </div>
            <div class="income-client-result-meta">${Utils.sanitize(client.address || '')}</div>
          </button>
        `).join('');

        results.querySelectorAll('[data-client-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const client = this.wizard.clientResults.find((item) => item.id === btn.dataset.clientId);
            if (client) {
              this.wizard.client = client;
              this.renderWizardStep();
            }
          });
        });
      } catch (error) {
        console.error('Client search error:', error);
        results.innerHTML = '<div class="income-empty-hint">Error al buscar clientes.</div>';
      }
    }, 300);

    input.addEventListener('input', (e) => search(e.target.value));
    if (this.wizard.client) {
      this.populateClientSummary(root);
    }
    if (this.wizard.client) {
      root.querySelector('#income-change-client')?.addEventListener('click', () => {
        this.wizard.client = null;
        this.renderWizardStep();
      });
      root.querySelector('#income-open-client-modal')?.addEventListener('click', () => this.openQuickClientModal(this.wizard.clientQuery));
    }
    if (!this.wizard.clientQuery) {
      results.innerHTML = '<div class="income-empty-hint">Empieza a escribir para buscar clientes.</div>';
    }
  },

  populateClientSummary(root) {
    const client = this.wizard.client;
    if (!client) return;
    const summary = root.querySelector('#income-client-summary');
    if (!summary) return;
    summary.style.display = 'block';
    root.querySelector('#income-client-summary-name').textContent = `${client.name || ''} ${client.last_name || ''}`.trim() || '-';
    root.querySelector('#income-client-summary-phone').textContent = client.phone || '-';
    root.querySelector('#income-client-summary-email').textContent = client.email || '-';
    root.querySelector('#income-client-summary-company').textContent = client.company || '-';
    root.querySelector('#income-client-summary-address').textContent = client.address || '-';
  },

  bindDeviceStepEvents(root) {
    root.querySelectorAll('[data-device-type]').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextType = button.dataset.deviceType;
        const changed = await this.changeDeviceType(nextType);
        if (changed) this.renderWizardStep();
      });
    });

    root.querySelector('#income-device-custom-type')?.addEventListener('input', (e) => {
      this.wizard.device.device_custom_type = e.target.value;
    });
    root.querySelectorAll('[data-brand]').forEach((button) => {
      button.addEventListener('click', () => {
        const brand = button.dataset.brand;
        this.wizard.device.brand = brand;
        if (brand !== 'Otra') this.wizard.device.brand_custom = '';
        this.renderWizardStep();
      });
    });
    root.querySelector('#income-brand-custom')?.addEventListener('input', (e) => {
      this.wizard.device.brand_custom = e.target.value;
    });
    root.querySelector('#income-model')?.addEventListener('input', (e) => { this.wizard.device.model = e.target.value; });
    root.querySelector('#income-color')?.addEventListener('input', (e) => { this.wizard.device.color = e.target.value; });
    root.querySelector('#income-serial')?.addEventListener('input', (e) => { this.wizard.device.serial = e.target.value; });
    root.querySelector('#income-serial-status')?.addEventListener('change', (e) => { this.wizard.device.serial_status = e.target.value; });
    root.querySelector('#income-imei1')?.addEventListener('input', (e) => { this.wizard.device.imei1 = e.target.value; });
    root.querySelector('#income-imei2')?.addEventListener('input', (e) => { this.wizard.device.imei2 = e.target.value; });
    root.querySelector('#income-identification-notes')?.addEventListener('input', (e) => { this.wizard.device.identification_notes = e.target.value; });
    root.querySelector('#income-unlock-code')?.addEventListener('input', (e) => { this.wizard.device.unlock_code_hint = e.target.value; });
  },

  async changeDeviceType(nextType) {
    const current = this.wizard.device.device_type;
    if (current === nextType) return true;

    const hasData = this.deviceHasConflictData();
    if (hasData) {
      const confirmed = await Components.confirm({
        title: 'Cambiar tipo de dispositivo',
        message: 'Cambiar el tipo limpiará algunos campos incompatibles. ¿Deseas continuar?',
        type: 'warning'
      });
      if (!confirmed) return false;
    }

    this.wizard.device = INCOME_EMPTY_DEVICE();
    this.wizard.device.device_type = nextType;
    return true;
  },

  deviceHasConflictData() {
    const device = this.wizard.device;
    return Boolean(
      device.model ||
      device.color ||
      device.serial ||
      device.imei1 ||
      device.imei2 ||
      device.problem_reported ||
      device.physical_notes ||
      (device.physical_condition || []).length ||
      (device.specs && Object.values(device.specs).some((value) => Array.isArray(value) ? value.length : Boolean(value)))
    );
  },

  bindDetailsStepEvents(root) {
    root.querySelector('#income-problem')?.addEventListener('input', (e) => {
      this.wizard.device.problem_reported = e.target.value;
    });

    root.querySelectorAll('[data-problem-chip]').forEach((button) => {
      button.addEventListener('click', () => {
        const chip = button.dataset.problemChip;
        this.wizard.device.problem_reported = this.wizard.device.problem_reported ? `${this.wizard.device.problem_reported.trim()} · ${chip}` : chip;
        this.renderWizardStep();
      });
    });

    root.querySelectorAll('[data-physical-state]').forEach((button) => {
      button.addEventListener('click', () => {
        const state = button.dataset.physicalState;
        const list = this.wizard.device.physical_condition || [];
        const idx = list.indexOf(state);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(state);
        this.renderWizardStep();
      });
    });

    root.querySelector('#income-physical-notes')?.addEventListener('input', (e) => { this.wizard.device.physical_notes = e.target.value; });

    const specKeys = INCOME_SPECS_BY_DEVICE[this.wizard.device.device_type] || ['genericNotes'];
    specKeys.forEach((key) => {
      if (key === 'storageUnits') {
        root.querySelector('#income-add-storage')?.addEventListener('click', (e) => {
          e.preventDefault();
          this.wizard.device.specs.storageUnits = Array.isArray(this.wizard.device.specs.storageUnits) ? this.wizard.device.specs.storageUnits : [];
          this.wizard.device.specs.storageUnits.push({ id: Utils.generateId(), type: '', capacity: '' });
          this.renderWizardStep();
        });

        root.querySelectorAll('[data-storage-row]').forEach((row) => {
          const index = Number(row.dataset.storageRow);
          row.querySelectorAll('[data-storage-field]').forEach((input) => {
            input.addEventListener('input', () => {
              const field = input.dataset.storageField;
              this.wizard.device.specs.storageUnits[index][field] = input.value;
            });
          });
          row.querySelector('[data-remove-storage]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.wizard.device.specs.storageUnits.splice(index, 1);
            this.renderWizardStep();
          });
        });
        return;
      }

      const el = root.querySelector(`#income-spec-${key}`);
      if (el) {
        el.addEventListener('input', () => { this.wizard.device.specs[key] = el.value; });
        el.addEventListener('change', () => { this.wizard.device.specs[key] = el.value; });
      }
    });
  },

  bindAccessoriesStepEvents(root) {
    root.querySelector('#income-without-accessories')?.addEventListener('change', (e) => {
      this.wizard.device.accessories_without = e.target.checked;
      if (e.target.checked) this.wizard.accessories = [];
      this.renderWizardStep();
    });

    if (this.wizard.device.accessories_without) return;

    root.querySelectorAll('[data-accessory]').forEach((button) => {
      button.addEventListener('click', () => {
        const name = button.dataset.accessory;
        const exists = this.wizard.accessories.find((item) => item.name === name || item.custom_name === name);
        if (exists) {
          this.wizard.accessories = this.wizard.accessories.filter((item) => item !== exists);
        } else {
          this.wizard.accessories.push({
            id: Utils.generateId(),
            accessory_type: name === 'Otro' ? 'custom' : 'preset',
            name: name === 'Otro' ? '' : name,
            custom_name: name === 'Otro' ? '' : '',
            quantity: 1,
            condition: '',
            notes: '',
            sort_order: this.wizard.accessories.length
          });
        }
        this.renderWizardStep();
      });
    });

    root.querySelector('#income-add-custom-accessory')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.wizard.accessories.push({
        id: Utils.generateId(),
        accessory_type: 'custom',
        name: '',
        custom_name: '',
        quantity: 1,
        condition: '',
        notes: '',
        sort_order: this.wizard.accessories.length
      });
      this.renderWizardStep();
    });

    root.querySelectorAll('[data-accessory-index]').forEach((row) => {
      const index = Number(row.dataset.accessoryIndex);
      row.querySelector('[data-remove-accessory]')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.wizard.accessories.splice(index, 1);
        this.renderWizardStep();
      });
      row.querySelectorAll('[data-accessory-field]').forEach((input) => {
        input.addEventListener('input', () => {
          const field = input.dataset.accessoryField;
          if (field === 'quantity') {
            this.wizard.accessories[index][field] = Math.max(1, parseInt(input.value || '1', 10));
          } else {
            this.wizard.accessories[index][field] = input.value;
          }
        });
      });
    });
  },

  bindPhotosStepEvents(root) {
    root.querySelector('#income-camera-btn')?.addEventListener('click', () => this.openCameraCapture());
    root.querySelector('#income-gallery-btn')?.addEventListener('click', () => root.querySelector('#income-photo-gallery')?.click());
    root.querySelector('#income-add-more-photos')?.addEventListener('click', () => root.querySelector('#income-photo-gallery')?.click());
    root.querySelector('#income-photo-camera')?.addEventListener('change', (e) => this.addPhotosFromInput(e.target.files));
    root.querySelector('#income-photo-gallery')?.addEventListener('change', (e) => this.addPhotosFromInput(e.target.files));

    root.querySelectorAll('[data-photo-index]').forEach((card) => {
      const index = Number(card.dataset.photoIndex);
      card.querySelectorAll('[data-photo-field]').forEach((input) => {
        input.addEventListener('input', () => {
          const field = input.dataset.photoField;
          if (field === 'is_primary') {
            if (input.checked) {
              this.wizard.photos.forEach((photo, idx) => { photo.is_primary = idx === index; });
            } else {
              this.wizard.photos[index].is_primary = false;
            }
          } else {
            this.wizard.photos[index][field] = input.value;
          }
        });
      });
      card.querySelector('[data-remove-photo]')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const photo = this.wizard.photos[index];
        if (photo?.existing && !photo.removed) {
          const confirmed = await Components.confirm({
            title: 'Eliminar fotografía',
            message: 'Esta acción eliminará la referencia guardada y el archivo asociado.',
            type: 'danger'
          });
          if (!confirmed) return;
        }

        if (photo?.existing) {
          photo.removed = true;
          this.wizard.removedPhotoIds.push(photo.id);
        } else if (photo?.preview) {
          URL.revokeObjectURL(photo.preview);
          this.wizard.photos.splice(index, 1);
        }
        this.renderWizardStep();
      });
    });
  },

  async openCameraCapture() {
    if (!navigator.mediaDevices?.getUserMedia) {
      Components.toast({
        type: 'warning',
        message: 'Tu navegador no permite abrir la cámara directamente. Usa Elegir de la galería.'
      });
      this.wizardModal?.body?.querySelector('#income-photo-gallery')?.click();
      return;
    }

    const content = Utils.createElement('div', { className: 'income-camera-modal' });
    content.innerHTML = `
      <div class="income-camera-wrap">
        <video id="income-camera-preview" autoplay playsinline muted></video>
        <canvas id="income-camera-canvas" hidden></canvas>
      </div>
      <div class="income-camera-actions">
        <button class="btn btn-secondary" id="income-camera-switch">Reintentar cámara</button>
        <button class="btn btn-primary" id="income-camera-shoot">Tomar foto</button>
      </div>
      <div class="income-camera-status" id="income-camera-status">Solicitando acceso a la cámara...</div>
    `;

    const modal = Components.modal({
      title: 'Tomar foto',
      content,
      size: 'lg',
      actions: [],
      className: 'income-camera-modal-shell'
    });

    const video = modal.body.querySelector('#income-camera-preview');
    const canvas = modal.body.querySelector('#income-camera-canvas');
    const status = modal.body.querySelector('#income-camera-status');
    const shootBtn = modal.body.querySelector('#income-camera-shoot');
    const switchBtn = modal.body.querySelector('#income-camera-switch');

    let stream = null;
    let facingMode = 'environment';

    const stopStream = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    };

    const startStream = async () => {
      stopStream();
      status.textContent = 'Activando cámara...';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        video.srcObject = stream;
        await video.play();
        status.textContent = facingMode === 'environment' ? 'Cámara lista. Usa el botón para tomar la foto.' : 'Cámara frontal lista.';
      } catch (error) {
        console.error('Camera open error:', error);
        status.textContent = 'No se pudo abrir la cámara. Usa la galería como respaldo.';
        Components.toast({
          type: 'error',
          message: 'No pudimos abrir la cámara. Verifica permisos o intenta con la galería.'
        });
      }
    };

    const captureFrame = async () => {
      if (!video.videoWidth || !video.videoHeight) {
        Components.toast({ type: 'warning', message: 'La cámara aún no está lista.' });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        Components.toast({ type: 'error', message: 'No se pudo capturar la fotografía.' });
        return;
      }

      const file = new File([blob], `captura-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      stopStream();
      modal.close();
      await this.addPhotosFromInput([file]);
    };

    shootBtn?.addEventListener('click', captureFrame);
    switchBtn?.addEventListener('click', async () => {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      await startStream();
    });

    modal.overlay.addEventListener('click', (e) => {
      if (e.target === modal.overlay) {
        stopStream();
      }
    });

    const originalClose = modal.close;
    modal.close = () => {
      stopStream();
      originalClose();
    };

    await startStream();
  },

  bindReviewStepEvents(root) {
    root.querySelector('#income-confirm-save')?.addEventListener('change', (e) => {
      this.wizard.confirmSave = e.target.checked;
    });
  },

  persistWizardFromDom() {
    const root = this.wizardModal?.body?.querySelector('#income-wizard-main');
    if (!root) return;

    const setValue = (selector, setter) => {
      const el = root.querySelector(selector);
      if (el) setter(el.value);
    };

    if (this.wizard.stepIndex === 1 || this.wizard.stepIndex === 0) {
      setValue('#income-device-custom-type', (value) => { this.wizard.device.device_custom_type = value; });
      setValue('#income-brand-custom', (value) => { this.wizard.device.brand_custom = value; });
      setValue('#income-model', (value) => { this.wizard.device.model = value; });
      setValue('#income-color', (value) => { this.wizard.device.color = value; });
      setValue('#income-serial', (value) => { this.wizard.device.serial = value; });
      setValue('#income-imei1', (value) => { this.wizard.device.imei1 = value; });
      setValue('#income-imei2', (value) => { this.wizard.device.imei2 = value; });
      setValue('#income-identification-notes', (value) => { this.wizard.device.identification_notes = value; });
      setValue('#income-unlock-code', (value) => { this.wizard.device.unlock_code_hint = value; });
      setValue('#income-serial-status', (value) => { this.wizard.device.serial_status = value; });
    }

    if (this.wizard.stepIndex === 2) {
      setValue('#income-technician', (value) => { this.wizard.technician_id = value || null; });
      setValue('#income-problem', (value) => { this.wizard.device.problem_reported = value; });
      setValue('#income-physical-notes', (value) => { this.wizard.device.physical_notes = value; });
    }
  },

  async handleWizardNext() {
    this.persistWizardFromDom();
    const valid = await this.validateStep(this.wizard.stepIndex);
    if (!valid) return;

    if (this.wizard.stepIndex < INCOME_STEP_IDS.length - 1) {
      this.wizard.stepIndex += 1;
      this.renderWizardStep();
      return;
    }

    await this.saveWizard();
  },

  async validateStep(stepIndex) {
    const device = this.wizard.device;

    if (stepIndex === 0) {
      if (!this.wizard.client) {
        Components.toast({ type: 'warning', message: 'Debes seleccionar un cliente.' });
        return false;
      }
    }

    if (stepIndex === 1) {
      if (!device.device_type) {
        Components.toast({ type: 'warning', message: 'Debes elegir un tipo de dispositivo.' });
        return false;
      }
      if (device.device_type === 'other' && !device.device_custom_type.trim()) {
        Components.toast({ type: 'warning', message: 'Debes escribir el tipo de dispositivo personalizado.' });
        return false;
      }
      const catalog = INCOME_DEVICE_CATALOG[device.device_type];
      if (!catalog) {
        Components.toast({ type: 'warning', message: 'Tipo de dispositivo inválido.' });
        return false;
      }
      const brand = device.brand === 'Otra' ? device.brand_custom.trim() : device.brand;
      if (!brand) {
        Components.toast({ type: 'warning', message: 'Debes seleccionar una marca.' });
        return false;
      }
      if (device.imei1 && !/^\d{15}$/.test(device.imei1.replace(/\s+/g, ''))) {
        Components.toast({ type: 'warning', message: 'El IMEI 1 debe tener 15 dígitos.' });
        return false;
      }
      if (device.imei2 && !/^\d{15}$/.test(device.imei2.replace(/\s+/g, ''))) {
        Components.toast({ type: 'warning', message: 'El IMEI 2 debe tener 15 dígitos.' });
        return false;
      }
    }

    if (stepIndex === 2) {
      if (!device.problem_reported.trim()) {
        Components.toast({ type: 'warning', message: 'Debes describir el problema reportado.' });
        return false;
      }
    }

    if (stepIndex === 3) {
      if (!device.accessories_without && !this.wizard.accessories.length) {
        Components.toast({ type: 'warning', message: 'Selecciona accesorios o marca que se recibe sin accesorios.' });
        return false;
      }
    }

    if (stepIndex === 5) {
      if (!this.wizard.confirmSave) {
        Components.toast({ type: 'warning', message: 'Debes confirmar la revisión final.' });
        return false;
      }
    }

    return true;
  },

  async saveWizard() {
    if (this.wizard.saving) return;
    this.wizard.saving = true;
    this.wizard.progress = 0;
    let entryId = null;
    let loadingToken = null;

    try {
      const valid = await this.validateBeforeSave();
      if (!valid) {
        this.wizard.saving = false;
        return;
      }

      loadingToken = Components.showLoading(this.wizard.mode === 'edit'
        ? 'Actualizando ingreso del equipo...'
        : 'Registrando ingreso del equipo...');

      const userId = Auth.getUserId();
      const clientId = this.wizard.client?.id || null;

      const payload = {
        client_id: clientId,
        device_type: this.wizard.device.device_type,
        device_custom_type: this.wizard.device.device_custom_type || '',
        brand: this.wizard.device.brand || '',
        brand_custom: this.wizard.device.brand === 'Otra' ? this.wizard.device.brand_custom.trim() : '',
        model: this.wizard.device.model || '',
        color: this.wizard.device.color || '',
        serial: this.wizard.device.serial || '',
        serial_status: this.wizard.device.serial_status || 'visible',
        imei1: this.wizard.device.imei1 || '',
        imei2: this.wizard.device.imei2 || '',
        problem_reported: this.wizard.device.problem_reported || '',
        physical_condition: this.wizard.device.physical_condition || [],
        physical_notes: this.wizard.device.physical_notes || '',
        identification_notes: this.wizard.device.identification_notes || '',
        unlock_code_hint: this.wizard.device.unlock_code_hint || '',
        unlock_code_protected: !!this.wizard.device.unlock_code_protected,
        specs: this.wizard.device.specs || INCOME_DEFAULT_SPECS(),
        accessories_without: !!this.wizard.device.accessories_without,
        status: 'received'
      };

      let entry = null;
      if (this.wizard.mode === 'edit' && this.wizard.entryId) {
        await supabase.from('income_entries').eq('id', this.wizard.entryId).update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by: userId
        });
        entry = await this.fetchEntryById(this.wizard.entryId);
      } else {
        const inserted = await supabase.from('income_entries').insert({
          ...payload,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        entry = Array.isArray(inserted) ? this.normalizeEntry(inserted[0]) : null;
      }

      if (!entry) {
        throw new Error('No se pudo crear el ingreso.');
      }

      entryId = entry.id;
      await this.syncAccessories(entryId, userId);
      await this.syncPhotos(entryId, userId);
      if ((entry.technician_id || null) !== (this.wizard.technician_id || null)) {
        await supabase.rpc('assign_repair_technician', {
          p_income_entry_id: entryId,
          p_technician_id: this.wizard.technician_id || null,
          p_reason: this.wizard.mode === 'edit' ? 'Cambio desde el detalle del ingreso' : 'Asignación durante el ingreso'
        });
      }

      Components.toast({
        type: 'success',
        title: 'Ingreso registrado',
        message: `${entry.code || 'ING'} guardado correctamente`
      });

      this.wizardModal?.close();
      await this.loadEntries();
      this.render();
      this.openDetail(this.entries.find((item) => item.id === entryId) || entry);
    } catch (error) {
      console.error('Save income error:', error);
      if (entryId && this.wizard.mode === 'create') {
        await this.cleanupFailedEntry(entryId);
      }
      Components.toast({
        type: 'error',
        title: 'No se pudo guardar',
        message: error.message || 'Ocurrió un error al registrar el ingreso.'
      });
    } finally {
      if (loadingToken) Components.hideLoading(loadingToken);
      this.wizard.saving = false;
    }
  },

  async validateBeforeSave() {
    if (!this.wizard.client?.id) {
      Components.toast({ type: 'warning', message: 'Selecciona un cliente antes de registrar.' });
      return false;
    }

    if (!this.wizard.device.device_type) {
      Components.toast({ type: 'warning', message: 'Selecciona un tipo de dispositivo.' });
      return false;
    }

    const brand = this.wizard.device.brand === 'Otra' ? this.wizard.device.brand_custom.trim() : this.wizard.device.brand;
    if (!brand) {
      Components.toast({ type: 'warning', message: 'Selecciona una marca.' });
      return false;
    }

    if (!this.wizard.device.problem_reported.trim()) {
      Components.toast({ type: 'warning', message: 'Describe el problema reportado.' });
      return false;
    }

    const hasIdentifier = Boolean(
      (this.wizard.device.serial && this.wizard.device.serial.trim()) ||
      (this.wizard.device.imei1 && this.wizard.device.imei1.trim()) ||
      ['not_visible', 'not_applicable', 'pending'].includes(this.wizard.device.serial_status)
    );

    if (!hasIdentifier) {
      Components.toast({
        type: 'warning',
        message: 'Agrega un serial o IMEI, o marca el serial como no visible / no aplica / pendiente.'
      });
      return false;
    }

    if (!this.wizard.device.accessories_without && !this.wizard.accessories.length) {
      Components.toast({ type: 'warning', message: 'Selecciona accesorios o marca que se recibe sin accesorios.' });
      return false;
    }

    if (this.wizard.device.imei1 && !/^\d{15}$/.test(this.wizard.device.imei1.replace(/\s+/g, ''))) {
      Components.toast({ type: 'warning', message: 'El IMEI 1 debe tener 15 dígitos.' });
      return false;
    }

    if (this.wizard.device.imei2 && !/^\d{15}$/.test(this.wizard.device.imei2.replace(/\s+/g, ''))) {
      Components.toast({ type: 'warning', message: 'El IMEI 2 debe tener 15 dígitos.' });
      return false;
    }

    return true;
  },

  async syncAccessories(entryId, userId) {
    await supabase.from('income_entry_accessories').eq('income_entry_id', entryId).delete();

    if (this.wizard.device.accessories_without) return;

    const rows = this.wizard.accessories.map((item, index) => ({
      user_id: userId,
      income_entry_id: entryId,
      accessory_type: item.accessory_type || 'preset',
      name: item.name || '',
      custom_name: item.custom_name || '',
      quantity: Math.max(1, parseInt(item.quantity || 1, 10)),
      condition: item.condition || '',
      notes: item.notes || '',
      sort_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (rows.length) {
      await supabase.from('income_entry_accessories').insert(rows);
    }
  },

  async syncPhotos(entryId, userId) {
    const existing = this.wizard.photos.filter((photo) => photo.existing && !photo.removed);
    const removed = this.wizard.photos.filter((photo) => photo.existing && photo.removed);
    this.wizard._uploadedPhotoPaths = [];
    const remaining = this.wizard.photos.filter((photo) => !photo.removed);
    if (remaining.length && !remaining.some((photo) => photo.is_primary)) {
      remaining[0].is_primary = true;
    }

    for (const photo of removed) {
      try {
        await supabase.from('income_entry_photos').eq('id', photo.id).delete();
        if (photo.file_path) await supabase.deleteObject(CONFIG.storage.buckets.incomePhotos, photo.file_path);
      } catch (error) {
        console.warn('Failed to delete photo:', error);
      }
    }

    for (let i = 0; i < existing.length; i += 1) {
      const photo = existing[i];
      await supabase.from('income_entry_photos').eq('id', photo.id).update({
        angle: photo.angle || '',
        description: photo.description || '',
        sort_order: i,
        is_primary: !!photo.is_primary
      });
    }

    const newPhotos = this.wizard.photos.filter((photo) => !photo.existing && photo.file);
    for (let i = 0; i < newPhotos.length; i += 1) {
      const photo = newPhotos[i];
      const uploaded = await Storage.uploadIncomePhoto(photo.file, userId, entryId);
      if (!uploaded.url) {
        throw new Error(uploaded.error || 'No se pudo subir una fotografía.');
      }
      this.wizard._uploadedPhotoPaths.push(uploaded.path);

      await supabase.from('income_entry_photos').insert({
        user_id: userId,
        income_entry_id: entryId,
        file_path: uploaded.path,
        angle: photo.angle || '',
        description: photo.description || '',
        sort_order: existing.length + i,
        is_primary: !!photo.is_primary,
        file_size: photo.file.size || 0,
        mime_type: photo.file.type || '',
        created_at: new Date().toISOString()
      });

      photo.signedUrl = uploaded.url;
      photo.file_path = uploaded.path;
      photo.existing = true;
      photo.file = null;
      this.wizard.progress = Math.round(((i + 1) / Math.max(1, newPhotos.length)) * 100);
    }

    const uploadedEntry = await this.fetchEntryById(entryId);
    if (uploadedEntry) {
      Object.assign(this.entries.find((item) => item.id === entryId) || {}, uploadedEntry);
    }
  },

  async cleanupFailedEntry(entryId) {
    const uploadedPaths = this.wizard._uploadedPhotoPaths || [];

    try {
      const photos = await supabase.from('income_entry_photos')
        .select('id,file_path')
        .eq('income_entry_id', entryId);

      if (Array.isArray(photos)) {
        for (const photo of photos) {
          if (photo.file_path) {
            try {
              await supabase.deleteObject(CONFIG.storage.buckets.incomePhotos, photo.file_path);
            } catch {
              /* ignore */
            }
          }
        }
      }

      for (const path of uploadedPaths) {
        try {
          await supabase.deleteObject(CONFIG.storage.buckets.incomePhotos, path);
        } catch {
          /* ignore */
        }
      }

      await supabase.from('income_entry_accessories').eq('income_entry_id', entryId).delete();
      await supabase.from('income_entry_photos').eq('income_entry_id', entryId).delete();
      await supabase.from('income_entries').eq('id', entryId).delete();
    } catch (error) {
      console.warn('Failed to clean failed income entry:', error);
    }
  },

  async fetchEntryById(entryId) {
    const userId = Auth.getUserId();
    const result = await supabase.from('income_entries')
      .select('*, clients(id,name,last_name,phone,company,email,address,document), income_entry_accessories(*), income_entry_photos(*)')
      .eq('user_id', userId)
      .eq('id', entryId)
      .limit(1);
    const entry = Array.isArray(result) && result.length ? this.normalizeEntry(result[0]) : null;
    return this.hydratePhotoUrls(entry);
  },

  async openPhotoViewer(photo, index = 0, photos = []) {
    if (!photo) return;

    const viewer = Components.modal({
      title: `${photo.angle || 'Fotografía'} · Zoom`,
      size: 'full',
      className: 'income-photo-viewer-modal',
      content: `
        <div class="income-photo-viewer" data-photo-viewer>
          <div class="income-photo-viewer-topbar">
            <div>
              <div class="income-photo-viewer-title">${Utils.sanitize(photo.angle || 'Fotografía')}</div>
              <div class="income-photo-viewer-subtitle">${Utils.sanitize(photo.description || 'Sin descripción')}</div>
            </div>
            <div class="income-photo-viewer-actions">
              <button class="btn btn-outline btn-sm" type="button" data-viewer-zoom-out>-</button>
              <button class="btn btn-outline btn-sm" type="button" data-viewer-reset>Ajustar</button>
              <button class="btn btn-outline btn-sm" type="button" data-viewer-zoom-in>+</button>
            </div>
          </div>
          <div class="income-photo-viewer-stage" data-viewer-stage>
            <img src="${Utils.escapeHtml(photo.signedUrl || '')}" alt="${Utils.escapeHtml(photo.angle || 'Fotografía')}" data-viewer-image draggable="false">
          </div>
          <div class="income-photo-viewer-hint">Usa la rueda del mouse para acercar y arrastra la imagen cuando esté ampliada.</div>
          ${photos.length > 1 ? `
            <div class="income-photo-viewer-thumbs">
              ${photos.map((item, thumbIndex) => `
                <button class="income-photo-viewer-thumb ${thumbIndex === index ? 'active' : ''}" type="button" data-viewer-thumb="${thumbIndex}">
                  <img src="${Utils.escapeHtml(item.signedUrl || '')}" alt="${Utils.escapeHtml(item.angle || 'Foto')}">
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
    });

    const root = viewer.body.querySelector('[data-photo-viewer]');
    const stage = root?.querySelector('[data-viewer-stage]');
    const image = root?.querySelector('[data-viewer-image]');
    const zoomOutBtn = root?.querySelector('[data-viewer-zoom-out]');
    const zoomInBtn = root?.querySelector('[data-viewer-zoom-in]');
    const resetBtn = root?.querySelector('[data-viewer-reset]');
    const titleEl = root?.querySelector('.income-photo-viewer-title');
    const subtitleEl = root?.querySelector('.income-photo-viewer-subtitle');
    const thumbButtons = root ? [...root.querySelectorAll('[data-viewer-thumb]')] : [];

    if (!root || !stage || !image) return;

    let scale = 1;
    let fitScale = 1;
    let translateX = 0;
    let translateY = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startTranslateX = 0;
    let startTranslateY = 0;

    const clampScale = (value) => Math.min(4, Math.max(0.1, Number(value) || 1));

    const getAnchorPoint = (source) => {
      const rect = stage.getBoundingClientRect();
      const x = source?.clientX != null ? source.clientX : rect.left + rect.width / 2;
      const y = source?.clientY != null ? source.clientY : rect.top + rect.height / 2;
      return {
        x: x - rect.left - rect.width / 2,
        y: y - rect.top - rect.height / 2
      };
    };

    const applyTransform = () => {
      image.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
      image.style.cursor = scale > fitScale ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';
    };

    const fitView = () => {
      const stageWidth = Math.max(1, stage.clientWidth);
      const stageHeight = Math.max(1, stage.clientHeight);
      const imageWidth = Math.max(1, image.naturalWidth || image.clientWidth || stageWidth);
      const imageHeight = Math.max(1, image.naturalHeight || image.clientHeight || stageHeight);
      fitScale = clampScale(Math.min(stageWidth / imageWidth, stageHeight / imageHeight));
      scale = fitScale;
      translateX = 0;
      translateY = 0;
      applyTransform();
    };

    const zoomAtPoint = (nextScale, sourcePoint) => {
      const next = Math.max(clampScale(nextScale), fitScale);
      const anchor = getAnchorPoint(sourcePoint);
      if (scale !== 0) {
        const ratio = next / scale;
        translateX = anchor.x + (translateX - anchor.x) * ratio;
        translateY = anchor.y + (translateY - anchor.y) * ratio;
      }
      scale = next;
      applyTransform();
    };

    zoomInBtn?.addEventListener('click', () => zoomAtPoint(scale + 0.25));
    zoomOutBtn?.addEventListener('click', () => zoomAtPoint(scale - 0.25));
    resetBtn?.addEventListener('click', fitView);

    stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      zoomAtPoint(scale + (direction * 0.12), event);
    }, { passive: false });

    stage.addEventListener('pointerdown', (event) => {
      if (scale <= fitScale) return;
      dragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      stage.setPointerCapture?.(event.pointerId);
      image.style.cursor = 'grabbing';
    });

    stage.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      translateX = startTranslateX + (event.clientX - dragStartX);
      translateY = startTranslateY + (event.clientY - dragStartY);
      applyTransform();
    });

    const endDrag = (event) => {
      dragging = false;
      if (event?.pointerId != null) stage.releasePointerCapture?.(event.pointerId);
      applyTransform();
    };

    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    image.addEventListener('dblclick', () => {
      if (scale > fitScale) {
        fitView();
      } else {
        zoomAtPoint(Math.max(fitScale * 2, fitScale + 0.25));
      }
    });

    thumbButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextIndex = Number(button.dataset.viewerThumb || 0);
        const nextPhoto = photos[nextIndex];
        if (!nextPhoto) return;
        image.src = nextPhoto.signedUrl || '';
        image.alt = nextPhoto.angle || 'Fotografía';
        if (titleEl) titleEl.textContent = nextPhoto.angle || 'Fotografía';
        if (subtitleEl) subtitleEl.textContent = nextPhoto.description || 'Sin descripción';
        root.querySelectorAll('.income-photo-viewer-thumb').forEach((thumb) => {
          thumb.classList.toggle('active', Number(thumb.dataset.viewerThumb) === nextIndex);
        });
        fitView();
      });
    });

    if (image.complete && image.naturalWidth) {
      requestAnimationFrame(() => fitView());
    } else {
      image.addEventListener('load', () => requestAnimationFrame(() => fitView()), { once: true });
    }
  },

  async openDetail(entry) {
    if (!entry || this.detailOpening) return;
    if (this.detailModal?.overlay?.isConnected) return;

    this.detailModal = null;
    this.detailOpening = true;
    const loadingToken = Components.showLoading('Cargando detalles del ingreso...');

    try {
      const fresh = entry?.id ? await this.fetchEntryById(entry.id) : entry;
      if (!fresh) throw new Error('No se pudo encontrar el ingreso seleccionado.');

    let signatureState = { requests: [], signatures: [] };
    try { signatureState = await SignatureService.list(fresh.id); } catch { /* Keep detail available during transient API failures. */ }
    const signatureStatus = (type) => {
      if ((signatureState.signatures || []).some((item) => item.signature_type === type && item.is_current)) return 'signed';
      return (signatureState.requests || []).find((item) => item.signature_type === type)?.status || 'none';
    };
    const signatureLabel = (status) => ({ signed: 'Firmada', pending: 'Pendiente', expired: 'Vencida', none: 'Sin firma', revoked: 'Sin firma', superseded: 'Sin firma' })[status] || 'Sin firma';

    const photos = fresh.photos || [];
    const galleryItems = await Promise.all(photos.map(async (photo, index) => {
      const url = photo?.signedUrl || (photo?.file_path ? await Storage.getAuthenticatedObjectUrl(CONFIG.storage.buckets.incomePhotos, photo.file_path).catch(async () => Storage.getSignedUrl(CONFIG.storage.buckets.incomePhotos, photo.file_path, 3600).catch(() => '')) : '');
      return { ...photo, url, index };
    }));
    const galleryHtml = galleryItems.map((photo) => `
      <button class="income-gallery-item" type="button" data-gallery-photo="${photo.index}">
        ${photo.url ? `<img src="${photo.url}" alt="Foto">` : '<div class="income-gallery-empty">Sin imagen</div>'}
        <div class="income-gallery-meta">
          <strong>${Utils.sanitize(photo.angle || 'Sin ?ngulo')}</strong>
          <span>${Utils.sanitize(photo.description || '')}</span>
        </div>
      </button>
    `);

    const client = fresh.client || {};
    const accessories = fresh.accessories || [];
    const unlockCode = fresh.unlock_code_hint || '-';

    let detailModal = null;
    detailModal = Components.modal({
      title: `${fresh.code || 'Ingreso'} · Detalle`,
      size: 'full',
      onClose: () => {
        if (this.detailModal === detailModal) this.detailModal = null;
      },
      content: `
        <div class="income-detail">
          <div class="income-detail-header card">
            <div>
              <div class="income-detail-code">${Utils.sanitize(fresh.code || '-')}</div>
              <div class="income-detail-subtitle">${Utils.sanitize(`${client.name || ''} ${client.last_name || ''}`.trim() || 'Sin cliente')}</div>
            </div>
            <div class="income-detail-actions">
              <button class="btn btn-secondary" id="income-detail-edit">Editar</button>
              <button class="btn btn-outline" id="income-detail-new">Nuevo ingreso</button>
              <button class="btn btn-outline" id="income-detail-signature" type="button"
                ${SignatureService.isEnabled() ? '' : 'disabled aria-disabled="true"'}
                title="${SignatureService.isEnabled() ? 'Solicitar firma electrónica' : 'Firma no disponible hasta desplegar el servicio en Supabase'}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 21c3-4 4-8 7-11 2-2 4-1 3 2-1 3-4 5-2 6 2 1 4-3 5-2 1 1 0 3 2 3 1 0 2-1 3-2"/><path d="M14 5l2-2 5 5-2 2"/></svg>
                Firma
              </button>
              <button class="btn btn-primary" id="income-detail-pdf">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
                Generar PDF
              </button>
            </div>
          </div>

          <div class="income-signature-summary" aria-label="Estado de firmas electrónicas">
            <div><span>Cliente</span><strong id="income-signature-status-client" class="signature-status signature-status--${SignatureManager.statusClass(signatureStatus('client'))}">${signatureLabel(signatureStatus('client'))}</strong></div>
            <div><span>Quien recibe</span><strong id="income-signature-status-receiver" class="signature-status signature-status--${SignatureManager.statusClass(signatureStatus('receiver'))}">${signatureLabel(signatureStatus('receiver'))}</strong></div>
          </div>

          <div class="grid grid-2 mt-4">
            <div class="card">
              <h4 class="card-title mb-3">Cliente</h4>
              <div class="income-detail-block">
                <div><span>Nombre</span><strong>${Utils.sanitize(`${client.name || ''} ${client.last_name || ''}`.trim() || '-')}</strong></div>
                <div><span>Teléfono</span><strong>${Utils.sanitize(client.phone || '-')}</strong></div>
                <div><span>Correo</span><strong>${Utils.sanitize(client.email || '-')}</strong></div>
                <div><span>Empresa</span><strong>${Utils.sanitize(client.company || '-')}</strong></div>
                <div class="income-full-span"><span>Dirección</span><strong>${Utils.sanitize(client.address || '-')}</strong></div>
              </div>
            </div>
            <div class="card">
              <h4 class="card-title mb-3">Equipo</h4>
              <div class="income-detail-block">
                <div><span>Tipo</span><strong>${Utils.sanitize(incomeUtils.deviceLabel(fresh.device_type))}</strong></div>
                <div><span>Marca</span><strong>${Utils.sanitize(fresh.brand_custom || fresh.brand || '-')}</strong></div>
                <div><span>Modelo</span><strong>${Utils.sanitize(fresh.model || '-')}</strong></div>
                <div><span>Color</span><strong>${Utils.sanitize(fresh.color || '-')}</strong></div>
                <div class="income-full-span"><span>Serial / IMEI</span><strong>${Utils.sanitize([fresh.serial, fresh.imei1, fresh.imei2].filter(Boolean).join(' · ') || fresh.serial_status)}</strong></div>
              </div>
            </div>
          </div>

          <div class="card mt-4">
            <h4 class="card-title mb-3">Código de desbloqueo</h4>
            <div class="income-unlock-code-box">
              <div class="income-unlock-code-value">${Utils.sanitize(unlockCode)}</div>
              <button class="btn btn-outline btn-sm" type="button" id="income-copy-unlock-code" ${unlockCode === '-' ? 'disabled' : ''}>Copiar código</button>
            </div>
          </div>

          <div class="grid grid-2 mt-4">
            <div class="card">
              <h4 class="card-title mb-3">Problema y estado</h4>
              <div class="income-detail-block">
                <div class="income-full-span"><span>Problema reportado</span><strong>${Utils.sanitize(fresh.problem_reported || '-')}</strong></div>
                <div class="income-full-span"><span>Estado físico</span><strong>${Utils.sanitize((fresh.physical_condition || []).join(', ') || '-')}</strong></div>
                <div class="income-full-span"><span>Observaciones</span><strong>${Utils.sanitize(fresh.physical_notes || '-')}</strong></div>
              </div>
            </div>
            <div class="card">
              <h4 class="card-title mb-3">Especificaciones</h4>
              <div class="income-spec-summary">
                ${this.renderSpecSummary(fresh)}
              </div>
            </div>
          </div>

          <div class="grid grid-2 mt-4">
            <div class="card">
              <h4 class="card-title mb-3">Accesorios</h4>
              ${accessories.length ? `
                <div class="income-accessory-summary">
                  ${accessories.map((item) => `
                    <div class="income-accessory-summary-item">
                      <strong>${Utils.sanitize(item.custom_name || item.name || 'Accesorio')}</strong>
                      <span>${Utils.sanitize(`Cantidad: ${item.quantity || 1}${item.condition ? ` · ${item.condition}` : ''}`)}</span>
                      ${item.notes ? `<span>${Utils.sanitize(item.notes)}</span>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : '<p class="text-secondary">Sin accesorios.</p>'}
            </div>
            <div class="card">
              <h4 class="card-title mb-3">Fotografías</h4>
              <div class="income-gallery-grid">
                ${galleryHtml.join('')}
              </div>
            </div>
          </div>
        </div>
      `,
      actions: [
        { label: 'Cerrar', class: 'btn-secondary', onClick: (modal) => modal.close() }
      ]
    });

    this.detailModal = detailModal;

    detailModal.body.querySelectorAll('[data-gallery-photo]').forEach((button) => {
      button.addEventListener('click', () => {
        const photoIndex = Number(button.dataset.galleryPhoto || 0);
        const photo = galleryItems[photoIndex];
        if (photo) this.openPhotoViewer(photo, photoIndex, galleryItems);
      });
    });
    detailModal.body.querySelector('#income-copy-unlock-code')?.addEventListener('click', async () => {
      if (!unlockCode || unlockCode === '-') return;
      try {
        await navigator.clipboard.writeText(unlockCode);
        Components.toast({ type: 'success', message: 'C?digo copiado al portapapeles.' });
      } catch {
        Components.toast({ type: 'warning', message: 'No se pudo copiar el c?digo.' });
      }
    });

      detailModal.body.querySelector('#income-detail-edit')?.addEventListener('click', () => {
        this.openWizard(fresh, 'edit');
      });
      detailModal.body.querySelector('#income-detail-new')?.addEventListener('click', () => {
        this.openWizard();
      });
      detailModal.body.querySelector('#income-detail-signature')?.addEventListener('click', (event) => {
        if (!SignatureService.isEnabled()) return;
        SignatureManager.open(fresh, event.currentTarget, async (entryId, type) => {
          const state = await SignatureService.list(entryId);
          const signed = (state.signatures || []).find((item) => item.signature_type === type && item.is_current);
          if (signed) {
            const badge = detailModal.body.querySelector(`#income-signature-status-${type}`);
            if (badge) { badge.textContent = 'Firmada'; badge.className = 'signature-status signature-status--signed'; }
          }
          const updated = await this.fetchEntryById(entryId);
          const index = this.entries.findIndex((item) => item.id === entryId);
          if (updated && index >= 0) this.entries[index] = updated;
          if (PDFGenerator._activeModal && PDFGenerator._currentIncome?.id === entryId) {
            await PDFGenerator.previewIncome(updated || fresh, this.config || {});
          }
        });
      });
      detailModal.body.querySelector('#income-detail-pdf')?.addEventListener('click', () => {
        PDFGenerator.previewIncome(fresh, this.config || {});
      });
    } catch (error) {
      console.error('Error opening income detail:', error);
      Components.toast({
        type: 'error',
        title: 'No se pudo abrir el ingreso',
        message: error.message || 'OcurriÃ³ un error al cargar los detalles.'
      });
    } finally {
      this.detailOpening = false;
      Components.hideLoading(loadingToken);
    }
  },

  renderSpecSummary(entry) {
    const specs = entry.specs || {};
    const keys = Object.keys(specs).filter((key) => key !== 'storageUnits' && key !== 'genericNotes');
    const storageUnits = Array.isArray(specs.storageUnits) ? specs.storageUnits : [];
    const items = keys
      .filter((key) => specs[key])
      .map((key) => `<div><span>${Utils.sanitize(INCOME_DEVICE_SPEC_LABELS[key] || key)}</span><strong>${Utils.sanitize(String(specs[key]))}</strong></div>`);

    storageUnits.forEach((row, index) => {
      items.push(`<div><span>Almacenamiento ${index + 1}</span><strong>${Utils.sanitize(`${row.type || ''} ${row.capacity || ''}`.trim())}</strong></div>`);
    });

    if (specs.genericNotes) {
      items.push(`<div class="income-full-span"><span>Observaciones técnicas</span><strong>${Utils.sanitize(specs.genericNotes)}</strong></div>`);
    }

    if (!items.length) return '<p class="text-secondary">Sin especificaciones adicionales.</p>';
    return items.join('');
  },

  getPhotoSuggestions() {
    return (INCOME_DEVICE_CATALOG[this.wizard.device.device_type]?.photoGuides || INCOME_DEVICE_CATALOG.other.photoGuides);
  },

  async addPhotosFromInput(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const validFiles = [];
    for (const file of files) {
      const validation = Storage.validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
      });
      if (!validation.valid) {
        Components.toast({ type: 'warning', message: validation.error });
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    await Components.withLoading(
      validFiles.length === 1 ? 'Procesando fotografía...' : `Procesando ${validFiles.length} fotografías...`,
      async () => {
        for (const file of validFiles) {
          const preview = await Storage.generatePreview(file);
          this.wizard.photos.push({
            id: Utils.generateId(),
            existing: false,
            file,
            preview,
            angle: '',
            description: '',
            sort_order: this.wizard.photos.length,
            is_primary: this.wizard.photos.length === 0
          });
        }
      });

    this.renderWizardStep();
  },

  async openQuickClientModal(prefill = '') {
    const content = Utils.createElement('div', { className: 'grid-form' });
    const fields = [
      { id: 'name', label: 'Nombre', value: '' },
      { id: 'last_name', label: 'Apellidos', value: '' },
      { id: 'company', label: 'Empresa', value: '' },
      { id: 'phone', label: 'Teléfono', value: prefill || this.wizard.clientQuery || '' },
      { id: 'email', label: 'Correo', value: '' },
      { id: 'address', label: 'Dirección', value: '' },
      { id: 'city', label: 'Ciudad', value: '' }
    ];

    fields.forEach((field) => {
      const group = Utils.createElement('div', { className: 'form-group' });
      const label = Utils.createElement('label', { className: 'form-label', textContent: field.label });
      const input = Utils.createElement('input', {
        type: field.id === 'phone' ? 'tel' : field.id === 'email' ? 'email' : 'text',
        className: 'form-input',
        id: `income-client-${field.id}`,
        value: field.value || ''
      });
      group.appendChild(label);
      group.appendChild(input);
      content.appendChild(group);
    });

    Components.modal({
      title: 'Registrar nuevo cliente',
      content,
      size: 'lg',
      actions: [
        { label: 'Cancelar', class: 'btn-secondary', onClick: (modal) => modal.close() },
        {
          label: 'Guardar cliente',
          class: 'btn-primary',
          onClick: async (modal) => {
            const data = {
              name: document.getElementById('income-client-name')?.value?.trim() || '',
              last_name: document.getElementById('income-client-last_name')?.value?.trim() || '',
              company: document.getElementById('income-client-company')?.value?.trim() || '',
              phone: document.getElementById('income-client-phone')?.value?.trim() || '',
              email: document.getElementById('income-client-email')?.value?.trim() || '',
              address: document.getElementById('income-client-address')?.value?.trim() || '',
              city: document.getElementById('income-client-city')?.value?.trim() || ''
            };

            if (!data.name || !data.phone) {
              Components.toast({ type: 'warning', message: 'El nombre y el teléfono son obligatorios.' });
              return;
            }

            if (!Utils.isValidPhone(data.phone)) {
              Components.toast({ type: 'warning', message: 'El teléfono no parece válido.' });
              return;
            }

            try {
              await Components.withLoading('Registrando cliente...', async () => {
                const userId = Auth.getUserId();
                const duplicate = await supabase.from('clients')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('phone', data.phone)
                  .limit(1);

                if (Array.isArray(duplicate) && duplicate.length) {
                  const duplicateError = new Error('Ya existe un cliente con ese teléfono.');
                  duplicateError.code = 'DUPLICATE_CLIENT';
                  throw duplicateError;
                }

                const saved = await supabase.from('clients').insert({
                  ...data,
                  user_id: userId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                const client = Array.isArray(saved) ? saved[0] : saved;
                this.wizard.client = client;
                this.wizard.clientQuery = data.phone;
              });

              modal.close();
              this.renderWizardStep();
              Components.toast({ type: 'success', message: 'Cliente registrado correctamente.' });
            } catch (error) {
              console.error('Client create error:', error);
              Components.toast({
                type: error.code === 'DUPLICATE_CLIENT' ? 'warning' : 'error',
                message: error.message || 'No se pudo registrar el cliente.'
              });
            }
          }
        }
      ]
    });
  }
};

window.Ingresos = Ingresos;
