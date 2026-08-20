/* FIXORA - Business Configuration */

const Config = {
  config: null,
  currentSection: 'general',

  async init() {
    if (!Auth.requireAuth()) return;

    Dashboard.renderSidebar();
    Dashboard.setupTheme();
    await this.loadConfig();
    this.renderNav();
    this.renderSection('general');
    this.setupEventListeners();
  },

  async loadConfig() {
    try {
      const userId = Auth.getUserId();
      const result = await supabase.from('business_config').select('*').eq('user_id', userId).limit(1);
      this.config = Array.isArray(result) && result.length ? result[0] : {
        user_id: userId,
        business_name: '',
        slogan: '',
        nit: '',
        document: '',
        address: '',
        city: '',
        department: '',
        country: '',
        postal_code: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        schedule: '',
        description: '',
        color_primary: '#6366f1',
        color_secondary: '#0ea5e9',
        currency: 'COP',
        currency_prefix: '$',
        date_format: 'DD/MM/YYYY',
        timezone: 'America/Bogota',
        prefix_invoice: 'FAC',
        prefix_quote: 'COT',
        start_number_invoice: 1,
        start_number_quote: 1,
        iva_rate: 19,
        footer_message: '',
        policies: '',
        conditions: ''
      };
    } catch {
      this.config = { user_id: Auth.getUserId() };
    }
  },

  renderNav() {
    const nav = document.getElementById('config-nav');
    if (!nav) return;

    const sections = [
      { id: 'general', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'General' },
      { id: 'contact', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91"/></svg>', label: 'Contacto' },
      { id: 'branding', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', label: 'Branding' },
      { id: 'documents', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', label: 'Documentos' },
      { id: 'taxes', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', label: 'Impuestos' },
      { id: 'tracking', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>', label: 'Seguimiento y WhatsApp' },
      { id: 'footer', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'Pie de página' }
    ];

    nav.innerHTML = sections.map(s => `
      <button class="config-nav-item ${s.id === this.currentSection ? 'active' : ''}" data-section="${s.id}">
        ${s.icon}
        <span>${s.label}</span>
      </button>
    `).join('');

    nav.querySelectorAll('.config-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentSection = btn.dataset.section;
        nav.querySelectorAll('.config-nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderSection(this.currentSection);
      });
    });
  },

  renderSection(section) {
    const content = document.getElementById('config-content');
    if (!content) return;

    const c = this.config;

    const sections = {
      general: `
        <h3 class="config-section-title">Información General</h3>
        <p class="config-section-desc">Datos básicos de tu negocio</p>
        <div class="grid-form">
          <div class="form-group">
            <label class="form-label form-label-required">Nombre del negocio</label>
            <input type="text" class="form-input" id="cfg-business-name" value="${Utils.escapeHtml(c.business_name || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Eslogan</label>
            <input type="text" class="form-input" id="cfg-slogan" value="${Utils.escapeHtml(c.slogan || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">NIT</label>
            <input type="text" class="form-input" id="cfg-nit" value="${Utils.escapeHtml(c.nit || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Documento</label>
            <input type="text" class="form-input" id="cfg-document" value="${Utils.escapeHtml(c.document || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" class="form-input" id="cfg-address" value="${Utils.escapeHtml(c.address || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Ciudad</label>
            <input type="text" class="form-input" id="cfg-city" value="${Utils.escapeHtml(c.city || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Departamento</label>
            <input type="text" class="form-input" id="cfg-department" value="${Utils.escapeHtml(c.department || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">País</label>
            <input type="text" class="form-input" id="cfg-country" value="${Utils.escapeHtml(c.country || 'Colombia')}">
          </div>
          <div class="form-group">
            <label class="form-label">Código Postal</label>
            <input type="text" class="form-input" id="cfg-postal-code" value="${Utils.escapeHtml(c.postal_code || '')}">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Descripción</label>
            <textarea class="form-input" id="cfg-description" rows="3">${Utils.escapeHtml(c.description || '')}</textarea>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Horario</label>
            <input type="text" class="form-input" id="cfg-schedule" value="${Utils.escapeHtml(c.schedule || '')}" placeholder="Lun - Vie: 8:00 AM - 6:00 PM">
          </div>
        </div>
      `,

      contact: `
        <h3 class="config-section-title">Información de Contacto</h3>
        <p class="config-section-desc">Datos de contacto de tu negocio</p>
        <div class="grid-form">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="tel" class="form-input" id="cfg-phone" value="${Utils.escapeHtml(c.phone || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp</label>
            <input type="tel" class="form-input" id="cfg-whatsapp" value="${Utils.escapeHtml(c.whatsapp || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input type="email" class="form-input" id="cfg-email" value="${Utils.escapeHtml(c.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Página Web</label>
            <input type="url" class="form-input" id="cfg-website" value="${Utils.escapeHtml(c.website || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Instagram</label>
            <input type="text" class="form-input" id="cfg-instagram" value="${Utils.escapeHtml(c.instagram || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Facebook</label>
            <input type="text" class="form-input" id="cfg-facebook" value="${Utils.escapeHtml(c.facebook || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">TikTok</label>
            <input type="text" class="form-input" id="cfg-tiktok" value="${Utils.escapeHtml(c.tiktok || '')}">
          </div>
        </div>
      `,

      branding: `
        <h3 class="config-section-title">Identidad Visual</h3>
        <p class="config-section-desc">Logo y colores de tu negocio</p>
        <div class="grid-form">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Logo del negocio</label>
            <div class="logo-upload">
              <div class="logo-preview" id="logo-preview">
                ${c.logo_url ? `<img src="${c.logo_url}" alt="Logo">` : '<div class="logo-preview-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><div class="text-xs text-tertiary mt-1">Logo</div></div>'}
              </div>
              <div>
                <button class="btn btn-secondary btn-sm" id="btn-upload-logo">Subir Logo</button>
                <input type="file" id="logo-file-input" accept="image/*" style="display:none">
                <div class="text-xs text-tertiary mt-2">PNG, JPG o SVG. Max 2MB.</div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Color Principal</label>
            <div class="color-picker-group">
              <input type="color" class="color-picker-input" id="cfg-color-primary" value="${c.color_primary || '#6366f1'}">
              <input type="text" class="form-input" id="cfg-color-primary-text" value="${c.color_primary || '#6366f1'}" style="width:120px">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Color Secundario</label>
            <div class="color-picker-group">
              <input type="color" class="color-picker-input" id="cfg-color-secondary" value="${c.color_secondary || '#0ea5e9'}">
              <input type="text" class="form-input" id="cfg-color-secondary-text" value="${c.color_secondary || '#0ea5e9'}" style="width:120px">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Moneda</label>
            <select class="form-select" id="cfg-currency">
              <option value="COP" ${c.currency === 'COP' ? 'selected' : ''}>COP - Peso Colombiano</option>
              <option value="USD" ${c.currency === 'USD' ? 'selected' : ''}>USD - Dólar</option>
              <option value="EUR" ${c.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
              <option value="MXN" ${c.currency === 'MXN' ? 'selected' : ''}>MXN - Peso Mexicano</option>
              <option value="ARS" ${c.currency === 'ARS' ? 'selected' : ''}>ARS - Peso Argentino</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prefijo de Moneda</label>
            <input type="text" class="form-input" id="cfg-currency-prefix" value="${Utils.escapeHtml(c.currency_prefix || '$')}">
          </div>
          <div class="form-group">
            <label class="form-label">Formato de Fecha</label>
            <select class="form-select" id="cfg-date-format">
              <option value="DD/MM/YYYY" ${c.date_format === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
              <option value="MM/DD/YYYY" ${c.date_format === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
              <option value="YYYY-MM-DD" ${c.date_format === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Zona Horaria</label>
            <select class="form-select" id="cfg-timezone">
              <option value="America/Bogota" ${c.timezone === 'America/Bogota' ? 'selected' : ''}>Bogotá (COT)</option>
              <option value="America/Mexico_City" ${c.timezone === 'America/Mexico_City' ? 'selected' : ''}>México (CST)</option>
              <option value="America/Argentina/Buenos_Aires" ${c.timezone === 'America/Argentina/Buenos_Aires' ? 'selected' : ''}>Buenos Aires (ART)</option>
              <option value="America/New_York" ${c.timezone === 'America/New_York' ? 'selected' : ''}>Nueva York (EST)</option>
              <option value="Europe/Madrid" ${c.timezone === 'Europe/Madrid' ? 'selected' : ''}>Madrid (CET)</option>
            </select>
          </div>
        </div>
      `,

      documents: `
        <h3 class="config-section-title">Configuración de Documentos</h3>
        <p class="config-section-desc">Formato y numeración de documentos</p>
        <div class="grid-form">
          <div class="form-group">
            <label class="form-label">Prefijo Factura</label>
            <input type="text" class="form-input" id="cfg-prefix-invoice" value="${Utils.escapeHtml(c.prefix_invoice || 'FAC')}">
          </div>
          <div class="form-group">
            <label class="form-label">Número Inicial Factura</label>
            <input type="number" class="form-input" id="cfg-start-invoice" value="${c.start_number_invoice || 1}" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Prefijo Cotización</label>
            <input type="text" class="form-input" id="cfg-prefix-quote" value="${Utils.escapeHtml(c.prefix_quote || 'COT')}">
          </div>
          <div class="form-group">
            <label class="form-label">Número Inicial Cotización</label>
            <input type="number" class="form-input" id="cfg-start-quote" value="${c.start_number_quote || 1}" min="1">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <div class="alert alert-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <div>Los números se generan automáticamente. Ejemplo: <strong>${c.prefix_invoice || 'FAC'}-${String(c.start_number_invoice || 1).padStart(6, '0')}</strong></div>
            </div>
          </div>
        </div>
      `,

      taxes: `
        <h3 class="config-section-title">Impuestos</h3>
        <p class="config-section-desc">Configuración de impuestos y retenciones</p>
        <div class="grid-form">
          <div class="form-group">
            <label class="form-label">Tarifa IVA (%)</label>
            <input type="number" class="form-input" id="cfg-iva-rate" value="${c.iva_rate || 19}" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Retención (%)</label>
            <input type="number" class="form-input" id="cfg-retention-rate" value="${c.retention_rate || 2.5}" min="0" max="100" step="0.1">
          </div>
        </div>
      `,

      tracking: `
        <h3 class="config-section-title">Seguimiento y WhatsApp</h3>
        <p class="config-section-desc">Información pública y mensajes preparados para el cliente.</p>
        <div class="grid-form">
          <div class="form-group" style="grid-column:1/-1">
            <div class="tracking-template-heading">
              <label class="form-label" for="cfg-tracking-intake">Plantilla de ingreso por WhatsApp</label>
              <button class="btn btn-secondary btn-sm" id="cfg-restore-intake-template" type="button">Restaurar predeterminada</button>
            </div>
            <textarea class="form-input tracking-template" id="cfg-tracking-intake" rows="14">${Utils.escapeHtml(c.tracking_intake_template || TrackingService.defaults.intake)}</textarea>
            <small class="form-help">Variables disponibles: {{cliente_nombre}}, {{negocio_nombre}}, {{codigo_ingreso}}, {{fecha_ingreso}}, {{dispositivo}}, {{motivo_ingreso}}, {{estado_actual}}, {{enlace_seguimiento}}.</small>
          </div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Vista previa del mensaje de ingreso</label><pre class="tracking-template-preview" id="cfg-tracking-intake-preview" aria-live="polite"></pre></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Plantilla de actualización</label><textarea class="form-input tracking-template" id="cfg-tracking-update" rows="9">${Utils.escapeHtml(c.tracking_update_template || TrackingService.defaults.update)}</textarea></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Plantilla de equipo terminado</label><textarea class="form-input tracking-template" id="cfg-tracking-finished" rows="8">${Utils.escapeHtml(c.tracking_finished_template || TrackingService.defaults.finished)}</textarea></div>
          <div class="form-group"><label class="form-label">Conservación después de entregar</label><select class="form-select" id="cfg-tracking-retention"><option value="" ${c.tracking_retention_days==null?'selected':''}>Sin vencimiento automático</option>${[30,90,180].map(d=>`<option value="${d}" ${Number(c.tracking_retention_days)===d?'selected':''}>${d} días</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Teléfono público de contacto</label><input class="form-input" id="cfg-tracking-phone" type="tel" value="${Utils.escapeHtml(c.tracking_contact_phone || c.whatsapp || c.phone || '')}"></div>
          <div class="form-group"><label><input type="checkbox" id="cfg-tracking-model" ${c.tracking_show_model!==false?'checked':''}> Mostrar modelo</label></div>
          <div class="form-group"><label><input type="checkbox" id="cfg-tracking-serial" ${c.tracking_show_masked_serial?'checked':''}> Mostrar serial enmascarado</label></div>
          <div class="form-group"><label><input type="checkbox" id="cfg-tracking-photos" ${c.tracking_show_photos!==false?'checked':''}> Mostrar fotografías públicas</label></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Texto del pie público</label><input class="form-input" id="cfg-tracking-footer" maxlength="300" value="${Utils.escapeHtml(c.tracking_footer || 'Seguimiento seguro proporcionado por Fixora.')}"></div>
          <div class="alert alert-info" id="tracking-template-status" style="grid-column:1/-1">Validando plantillas…</div>
        </div>
      `,

      footer: `
        <h3 class="config-section-title">Pie de Página</h3>
        <p class="config-section-desc">Texto que aparecerá en la parte inferior de los documentos</p>
        <div class="grid-form">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Mensaje para clientes</label>
            <textarea class="form-input" id="cfg-footer-message" rows="3">${Utils.escapeHtml(c.footer_message || '')}</textarea>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Políticas</label>
            <textarea class="form-input" id="cfg-policies" rows="3">${Utils.escapeHtml(c.policies || '')}</textarea>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Condiciones</label>
            <textarea class="form-input" id="cfg-conditions" rows="3">${Utils.escapeHtml(c.conditions || '')}</textarea>
          </div>
        </div>
      `
    };

    content.innerHTML = sections[section] || '';
    this.setupSectionListeners(section);
  },

  setupSectionListeners(section) {
    if (section === 'tracking') {
      const status = document.getElementById('tracking-template-status');
      const intake = document.getElementById('cfg-tracking-intake');
      const preview = document.getElementById('cfg-tracking-intake-preview');
      const previewData = {
        cliente_nombre: 'María López',
        negocio_nombre: this.config?.business_name || 'Fixora',
        codigo_ingreso: 'ING-000123',
        fecha_ingreso: new Date().toLocaleDateString('es-CO'),
        dispositivo: 'Portátil Lenovo IdeaPad',
        tipo_dispositivo: 'Portátil',
        marca: 'Lenovo',
        modelo: 'IdeaPad',
        motivo_ingreso: 'No enciende',
        servicio_solicitado: 'No enciende',
        estado_actual: 'Recibido',
        descripcion_actualizacion: '',
        enlace_seguimiento: `${String(CONFIG.app.publicUrl || location.origin).replace(/\/$/, '')}/seguimiento.html?token=…`,
        telefono_negocio: this.config?.tracking_contact_phone || this.config?.whatsapp || this.config?.phone || ''
      };
      const validate = () => {
        const checks = [...document.querySelectorAll('.tracking-template')].map((field) => TrackingService.validateTemplate(field.value));
        const invalid = checks.find((item) => !item.valid), missing = checks.find((item) => !item.hasLink);
        status.className = `alert ${invalid || missing ? 'alert-warning' : 'alert-info'}`;
        status.textContent = invalid ? `Variable no reconocida: ${invalid.unknown.join(', ')}` : missing ? 'Advertencia: una plantilla no contiene {{enlace_seguimiento}}.' : 'Plantillas válidas y con enlace de seguimiento.';
        const intakeCheck = TrackingService.validateTemplate(intake?.value || '');
        preview.textContent = intakeCheck.valid ? TrackingService.renderTemplate(intake.value, previewData) : 'Corrige las variables no reconocidas para ver la vista previa.';
      };
      document.querySelectorAll('.tracking-template').forEach((field) => field.addEventListener('input', validate));
      document.getElementById('cfg-restore-intake-template')?.addEventListener('click', () => {
        intake.value = TrackingService.defaults.intake;
        intake.dispatchEvent(new Event('input'));
      });
      validate();
    }
    if (section === 'branding') {
      document.getElementById('cfg-color-primary')?.addEventListener('input', (e) => {
        document.getElementById('cfg-color-primary-text').value = e.target.value;
      });
      document.getElementById('cfg-color-primary-text')?.addEventListener('input', (e) => {
        document.getElementById('cfg-color-primary').value = e.target.value;
      });
      document.getElementById('cfg-color-secondary')?.addEventListener('input', (e) => {
        document.getElementById('cfg-color-secondary-text').value = e.target.value;
      });
      document.getElementById('cfg-color-secondary-text')?.addEventListener('input', (e) => {
        document.getElementById('cfg-color-secondary').value = e.target.value;
      });

      const uploadBtn = document.getElementById('btn-upload-logo');
      const fileInput = document.getElementById('logo-file-input');
      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const validation = Storage.validateFile(file);
          if (!validation.valid) {
            Components.toast({ type: 'error', message: validation.error });
            return;
          }
          try {
            await Components.withLoading('Procesando logotipo...', async () => {
              const preview = await Storage.generatePreview(file);
              document.getElementById('logo-preview').innerHTML = `<img src="${preview}" alt="Logo">`;
              this.config.logo_url = preview;
            });
            Components.toast({ type: 'success', message: 'Logo cargado' });
          } catch (err) {
            Components.toast({ type: 'error', message: 'Error al cargar logo' });
          }
        });
      }
    }
  },

  setupEventListeners() {
    document.getElementById('btn-save-config')?.addEventListener('click', () => this.save());
  },

  collectData() {
    const getValue = (id) => document.getElementById(id)?.value || '';
    const existing = this.config || {};
    return {
      business_name: getValue('cfg-business-name') || existing.business_name || '',
      slogan: getValue('cfg-slogan') || existing.slogan || '',
      nit: getValue('cfg-nit') || existing.nit || '',
      document: getValue('cfg-document') || existing.document || '',
      address: getValue('cfg-address') || existing.address || '',
      city: getValue('cfg-city') || existing.city || '',
      department: getValue('cfg-department') || existing.department || '',
      country: getValue('cfg-country') || existing.country || '',
      postal_code: getValue('cfg-postal-code') || existing.postal_code || '',
      phone: getValue('cfg-phone') || existing.phone || '',
      whatsapp: getValue('cfg-whatsapp') || existing.whatsapp || '',
      email: getValue('cfg-email') || existing.email || '',
      website: getValue('cfg-website') || existing.website || '',
      instagram: getValue('cfg-instagram') || existing.instagram || '',
      facebook: getValue('cfg-facebook') || existing.facebook || '',
      tiktok: getValue('cfg-tiktok') || existing.tiktok || '',
      schedule: getValue('cfg-schedule') || existing.schedule || '',
      description: getValue('cfg-description') || existing.description || '',
      color_primary: getValue('cfg-color-primary-text') || getValue('cfg-color-primary') || existing.color_primary || '#6366f1',
      color_secondary: getValue('cfg-color-secondary-text') || getValue('cfg-color-secondary') || existing.color_secondary || '#0ea5e9',
      currency: getValue('cfg-currency') || existing.currency || 'COP',
      currency_prefix: getValue('cfg-currency-prefix') || existing.currency_prefix || '$',
      date_format: getValue('cfg-date-format') || existing.date_format || 'DD/MM/YYYY',
      timezone: getValue('cfg-timezone') || existing.timezone || 'America/Bogota',
      prefix_invoice: getValue('cfg-prefix-invoice') || existing.prefix_invoice || 'FAC',
      prefix_quote: getValue('cfg-prefix-quote') || existing.prefix_quote || 'COT',
      start_number_invoice: parseInt(getValue('cfg-start-invoice')) || existing.start_number_invoice || 1,
      start_number_quote: parseInt(getValue('cfg-start-quote')) || existing.start_number_quote || 1,
      iva_rate: parseFloat(getValue('cfg-iva-rate')) ?? existing.iva_rate ?? 19,
      retention_rate: parseFloat(getValue('cfg-retention-rate')) ?? existing.retention_rate ?? 2.5,
      footer_message: getValue('cfg-footer-message') || existing.footer_message || '',
      policies: getValue('cfg-policies') || existing.policies || '',
      conditions: getValue('cfg-conditions') || existing.conditions || '',
      logo_url: this.config?.logo_url || '',
      tracking_intake_template: getValue('cfg-tracking-intake') || existing.tracking_intake_template || TrackingService.defaults.intake,
      tracking_update_template: getValue('cfg-tracking-update') || existing.tracking_update_template || TrackingService.defaults.update,
      tracking_finished_template: getValue('cfg-tracking-finished') || existing.tracking_finished_template || TrackingService.defaults.finished,
      tracking_retention_days: getValue('cfg-tracking-retention') ? Number(getValue('cfg-tracking-retention')) : (existing.tracking_retention_days ?? null),
      tracking_show_model: document.getElementById('cfg-tracking-model')?.checked ?? existing.tracking_show_model ?? true,
      tracking_show_masked_serial: document.getElementById('cfg-tracking-serial')?.checked ?? existing.tracking_show_masked_serial ?? false,
      tracking_show_photos: document.getElementById('cfg-tracking-photos')?.checked ?? existing.tracking_show_photos ?? true,
      tracking_contact_phone: getValue('cfg-tracking-phone') || existing.tracking_contact_phone || '',
      tracking_footer: getValue('cfg-tracking-footer') || existing.tracking_footer || 'Seguimiento seguro proporcionado por Fixora.'
    };
  },

  async save() {
    const userId = Auth.getUserId();
    if (!userId) return;

    const data = this.collectData();
    const templateChecks = [data.tracking_intake_template, data.tracking_update_template, data.tracking_finished_template].map((value) => TrackingService.validateTemplate(value));
    const invalidTemplate = templateChecks.find((item) => !item.valid);
    if (invalidTemplate) { Components.toast({ type: 'error', message: `Variables no reconocidas: ${invalidTemplate.unknown.join(', ')}` }); return; }
    if (templateChecks.some((item) => !item.hasLink) && !await Components.confirm({ title: 'Plantilla sin enlace', message: 'Una plantilla no contiene {{enlace_seguimiento}}. El cliente no recibirá el acceso en ese mensaje.', confirmLabel: 'Guardar de todos modos' })) return;
    data.updated_at = new Date().toISOString();

    try {
      await Components.withLoading('Guardando configuración...', async () => {
        if (this.config?.id) {
          await supabase.from('business_config').eq('id', this.config.id).update(data);
        } else {
          data.user_id = userId;
          data.created_at = new Date().toISOString();
          await supabase.from('business_config').insert(data);
          const result = await supabase.from('business_config').select('*').eq('user_id', userId).limit(1);
          if (Array.isArray(result) && result.length) this.config = result[0];
        }
      });
    } catch (e) {
      console.error('Config save error:', e);
      Components.toast({ type: 'error', message: 'Error al guardar configuración' });
      return;
    }

    Object.assign(this.config, data);
    Components.toast({ type: 'success', title: 'Guardado', message: 'Configuración actualizada correctamente' });
  }
};

window.Config = Config;
