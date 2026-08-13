/* FIXORA - PDF Generator */

const PDFGenerator = {
  _activeModal: null,
  _escHandler: null,
  _busy: false,

  _escape(value) {
    return Utils.escapeHtml(value == null ? '' : String(value));
  },

  _hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '-';
  },

  _valueOr(value, fallback = '') {
    if (Array.isArray(value)) {
      const joined = value.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
      return joined || fallback;
    }
    return this._hasValue(value) ? String(value).trim() : fallback;
  },

  _joinParts(parts, separator = ' · ') {
    return parts.map((part) => this._valueOr(part, '')).filter(Boolean).join(separator);
  },

  _rgba(color, alpha = 0.08) {
    const hex = String(color || '').trim();
    const match = hex.match(/^#?([0-9a-f]{6})$/i);
    if (!match) return `rgba(31, 79, 255, ${alpha})`;
    const raw = match[1];
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  _chunkArray(items = [], size = 1) {
    const safeSize = Math.max(1, Number(size) || 1);
    const chunks = [];
    for (let i = 0; i < items.length; i += safeSize) {
      chunks.push(items.slice(i, i + safeSize));
    }
    return chunks;
  },

  _splitTextToChunks(text, maxChars = 1200) {
    const content = String(text || '').trim();
    if (!content) return [];
    const paragraphs = content.split(/\n\s*\n/g).map((block) => block.trim()).filter(Boolean);
    const chunks = [];
    let current = [];
    let currentSize = 0;

    paragraphs.forEach((paragraph) => {
      const nextSize = currentSize + paragraph.length + 2;
      if (current.length && nextSize > maxChars) {
        chunks.push(current);
        current = [paragraph];
        currentSize = paragraph.length;
        return;
      }
      current.push(paragraph);
      currentSize = nextSize;
    });

    if (current.length) chunks.push(current);
    return chunks.length ? chunks : [[content]];
  },

  _normalizeBusinessConfig(config = {}) {
    return {
      business_name: config.business_name || config.businessName || 'FIXORA',
      slogan: config.slogan || '',
      nit: config.nit || config.document || '',
      address: config.address || '',
      city: config.city || '',
      department: config.department || '',
      phone: config.phone || '',
      whatsapp: config.whatsapp || '',
      email: config.email || '',
      website: config.website || config.instagram || config.facebook || config.tiktok || '',
      logo_url: config.logo_url || '',
      color_primary: config.color_primary || '#1f4fff',
      footer_message: config.footer_message || '',
      policies: config.policies || '',
      conditions: config.conditions || ''
    };
  },

  _normalizeClient(client = {}) {
    return {
      name: client.name || '',
      last_name: client.last_name || '',
      company: client.company || '',
      document: client.document || client.nit || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      observations: client.observations || ''
    };
  },

  _normalizeIncomeEntry(entry = {}) {
    const receivedAt = entry.received_at || entry.created_at || new Date().toISOString();
    return {
      ...entry,
      received_at: receivedAt,
      received_date: Utils.formatDate(receivedAt),
      received_time: Utils.formatDate(receivedAt, 'HH:mm'),
      client: this._normalizeClient(entry.client || entry.clients || {}),
      photos: Array.isArray(entry.photos) ? [...entry.photos].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [],
      accessories: Array.isArray(entry.accessories) ? [...entry.accessories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [],
      specs: entry.specs || {},
      physical_condition: Array.isArray(entry.physical_condition) ? entry.physical_condition : []
    };
  },

  _displayNameFromProfile(profile = {}) {
    return this._joinParts([
      profile.full_name || profile.name || profile.display_name || '',
      profile.last_name || ''
    ]) || this._valueOr(profile.email, '');
  },

  _incomeDeviceLabel(type) {
    const labels = {
      desktop: 'Computador de escritorio',
      laptop: 'Portátil',
      phone: 'Celular',
      tablet: 'Tablet',
      smartwatch: 'Smartwatch',
      console: 'Consola',
      printer: 'Impresora',
      monitor: 'Monitor',
      other: 'Otro dispositivo'
    };
    return labels[type] || 'Dispositivo';
  },

  _incomeStatusLabel(status) {
    const labels = {
      received: 'Recibido',
      in_review: 'En revisión',
      repairing: 'En reparación',
      ready: 'Listo',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return labels[status] || (status ? String(status).replace(/_/g, ' ') : 'Recibido');
  },

  _serialText(entry) {
    if (entry.serial_status === 'not_applicable') return 'No aplica';
    if (entry.serial_status === 'not_visible') return 'No visible';
    if (entry.serial_status === 'pending') return 'No verificado';
    return this._valueOr(entry.serial, 'No registrado');
  },

  _receivedByName(entry) {
    return this._valueOr(entry.received_by_full_name || entry.received_by_display_name || entry.received_by_name, 'No registrado');
  },

  _renderField(label, value, options = {}) {
    const resolved = this._valueOr(value, options.fallback || '');
    if (!resolved && !options.allowEmpty) return '';
    const classes = ['receipt-field'];
    if (options.wide) classes.push('receipt-field--wide');
    if (options.muted && !this._hasValue(value)) classes.push('receipt-field--muted');
    return `
      <div class="${classes.join(' ')}">
        <span class="receipt-field-label">${this._escape(label)}</span>
        <strong class="receipt-field-value">${this._escape(resolved || options.fallback || '')}</strong>
      </div>
    `;
  },

  _renderGrid(fields = [], columns = 2, className = '') {
    const content = fields.filter(Boolean).join('');
    if (!content) return '';
    return `<div class="receipt-grid ${className}" style="--receipt-columns:${columns}">${content}</div>`;
  },

  _renderSpecsGrid(entry = {}) {
    const specs = entry.specs || {};
    const keys = (INCOME_SPECS_BY_DEVICE[entry.device_type] || INCOME_SPECS_BY_DEVICE.other || []).filter(Boolean);
    const fields = [];

    keys.forEach((key) => {
      if (key === 'genericNotes') {
        if (this._hasValue(specs.genericNotes)) {
          fields.push(this._renderField(INCOME_DEVICE_SPEC_LABELS[key] || key, specs.genericNotes, { wide: true }));
        }
        return;
      }

      if (key === 'storageUnits') return;

      const value = this._valueOr(specs[key], '');
      if (!value) return;
      fields.push(this._renderField(INCOME_DEVICE_SPEC_LABELS[key] || key, value));
    });

    const storageUnits = Array.isArray(specs.storageUnits) ? specs.storageUnits.filter((unit) => this._hasValue(unit?.type) || this._hasValue(unit?.capacity)) : [];
    if (storageUnits.length) {
      fields.push(`
        <div class="receipt-field receipt-field--wide">
          <span class="receipt-field-label">Almacenamiento</span>
          <div class="receipt-storage-list">
            ${storageUnits.map((unit, index) => `
              <div class="receipt-storage-row">
                <span class="receipt-storage-index">${index + 1}</span>
                <span>${this._escape(this._valueOr(unit.type, 'No registrado'))}</span>
                <strong>${this._escape(this._valueOr(unit.capacity, 'No registrado'))}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `);
    }

    if (this._hasValue(specs.genericNotes)) {
      fields.push(this._renderField(INCOME_DEVICE_SPEC_LABELS.genericNotes, specs.genericNotes, { wide: true }));
    }

    if (!fields.length) {
      return '<p class="receipt-empty">Sin especificaciones registradas.</p>';
    }

    const columns = fields.length <= 2 ? 2 : fields.length <= 4 ? 4 : 3;
    return this._renderGrid(fields, columns, 'receipt-specs-grid');
  },

  _renderAccessoriesTable(entry = {}) {
    const accessories = Array.isArray(entry.accessories) ? entry.accessories : [];
    if (entry.accessories_without || !accessories.length) {
      return '<p class="receipt-empty">El equipo fue recibido sin accesorios adicionales.</p>';
    }

    const rows = accessories.map((item) => [
      this._escape(this._valueOr(item.custom_name || item.name, 'Accesorio')),
      this._escape(this._valueOr(item.quantity, '1')),
      this._escape(this._valueOr(item.condition, 'No registrado')),
      this._hasValue(item.notes) ? this._escape(item.notes) : '<span class="receipt-muted">-</span>'
    ]);

    return `
      <div class="receipt-table-wrap">
        <table class="receipt-table">
          <thead>
            <tr>
              <th>Accesorio</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  _renderPolicyBlock(title, text) {
    const content = String(text || '').trim();
    if (!content) return '';
    const paragraphs = content.split(/\n\s*\n/g).map((item) => item.trim()).filter(Boolean);
    return `
      <article class="receipt-policy-card">
        <h3>${this._escape(title)}</h3>
        <div class="receipt-policy-content">
          ${paragraphs.map((paragraph) => {
            const lines = paragraph.split(/\n/).map((line) => line.trim()).filter(Boolean);
            if (lines.length > 1) {
              return `<ul>${lines.map((line) => `<li>${this._escape(line)}</li>`).join('')}</ul>`;
            }
            return `<p>${this._escape(lines[0] || '')}</p>`;
          }).join('')}
        </div>
      </article>
    `;
  },

  _renderReceiptHeader(entry, config, pageNumber, totalPages, pageTitle) {
    const statusLabel = this._incomeStatusLabel(entry.status);
    const receivedBy = this._receivedByName(entry);
    const receivedStamp = this._valueOr(`${entry.received_date || ''} ${entry.received_time || ''}`.trim(), 'No registrado');
    const contactBits = [config.phone, config.whatsapp, config.email, config.city].filter(Boolean);

    return `
      <header class="receipt-header">
        <div class="receipt-brand">
          <div class="receipt-logo">
            ${config.logo_url ? `<img src="${this._escape(config.logo_url)}" alt="Logo">` : `<span>${this._escape((config.business_name || 'FIXORA').slice(0, 12))}</span>`}
          </div>
          <div class="receipt-brand-text">
            <div class="receipt-business-name">${this._escape(config.business_name || 'FIXORA')}</div>
            ${config.slogan ? `<div class="receipt-business-slogan">${this._escape(config.slogan)}</div>` : ''}
            ${contactBits.length ? `<div class="receipt-business-contact">${contactBits.map((bit) => `<span>${this._escape(bit)}</span>`).join('')}</div>` : ''}
          </div>
        </div>
        <div class="receipt-doc">
          <div class="receipt-doc-title">${this._escape(pageTitle)}</div>
          <div class="receipt-doc-code">${this._escape(entry.code || 'Sin código')}</div>
          <div class="receipt-doc-meta">
            <span><strong>Fecha:</strong> ${this._escape(this._valueOr(entry.received_date, 'No registrada'))}</span>
            <span><strong>Hora:</strong> ${this._escape(this._valueOr(entry.received_time, 'No registrada'))}</span>
            <span><strong>Estado:</strong> ${this._escape(statusLabel)}</span>
            <span><strong>Recibido por:</strong> ${this._escape(receivedBy)}</span>
          </div>
        </div>
      </header>
      <div class="receipt-summary">
        ${[
          ['N° ingreso', this._valueOr(entry.code, 'Sin código')],
          ['Recepción', receivedStamp],
          ['Estado', statusLabel],
          ['Responsable', receivedBy]
        ].map(([label, value]) => `
          <div class="receipt-summary-item">
            <span>${this._escape(label)}</span>
            <strong>${this._escape(value)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="receipt-page-spacer" aria-hidden="true"></div>
    `;
  },

  _renderReceiptPageShell({ entry, config, pageNumber, totalPages, pageKind, pageTitle, content, footerNote = '' }) {
    const footerContact = [config.phone, config.whatsapp, config.email].filter(Boolean).join(' · ');
    const nowLabel = Utils.formatDateTime(new Date());

    return `
      <section class="receipt-page receipt-page--${pageKind}">
        ${this._renderReceiptHeader(entry, config, pageNumber, totalPages, pageTitle)}
        <main class="receipt-body">${content}</main>
        <footer class="receipt-footer">
          <div class="receipt-footer-left">
            <strong>${this._escape(config.business_name || 'FIXORA')}</strong>
            <span>${this._escape(this._valueOr(entry.code, 'Sin código'))}</span>
            ${footerContact ? `<span>${this._escape(footerContact)}</span>` : ''}
          </div>
          <div class="receipt-footer-center">
            Documento generado por Fixora.
            ${footerNote ? `<span>${this._escape(footerNote)}</span>` : ''}
          </div>
          <div class="receipt-footer-right">
            <span>Página ${pageNumber} de ${totalPages}</span>
            <span>${this._escape(nowLabel)}</span>
          </div>
        </footer>
      </section>
    `;
  },

  _renderIncomeHTML(entryInput, configInput = {}) {
    const entry = this._normalizeIncomeEntry(entryInput || {});
    const config = this._normalizeBusinessConfig(configInput || {});
    const clientName = this._joinParts([entry.client.name, entry.client.last_name]) || 'Sin cliente';
    const photos = Array.isArray(entry.photos) ? entry.photos.filter(Boolean) : [];
    const policyText = String(config.policies || '').trim();
    const conditionText = String(config.conditions || '').trim();

    const mainContent = `
      <section class="receipt-section receipt-section--dual">
        <article class="receipt-card">
          <h2>Datos del cliente</h2>
          ${this._renderGrid([
            this._renderField('Nombre completo', clientName, { fallback: 'No registrado', wide: true }),
            this._renderField('Documento', entry.client.document, { fallback: 'No registrado' }),
            this._renderField('Teléfono', entry.client.phone, { fallback: 'No registrado' }),
            this._renderField('Correo electrónico', entry.client.email, { fallback: 'No registrado', wide: true }),
            this._renderField('Dirección', entry.client.address, { fallback: 'No registrado' }),
            this._renderField('Ciudad', entry.client.city, { fallback: 'No registrado' }),
            this._renderField('Empresa', entry.client.company, { fallback: '', wide: true })
          ], 2, 'receipt-client-grid')}
        </article>

        <article class="receipt-card">
          <h2>Datos del equipo</h2>
          ${this._renderGrid([
            this._renderField('Tipo de dispositivo', this._joinParts([this._incomeDeviceLabel(entry.device_type), entry.device_custom_type ? `(${entry.device_custom_type})` : '']), { fallback: 'No registrado', wide: true }),
            this._renderField('Marca', this._joinParts([entry.brand, entry.brand_custom]), { fallback: 'No registrado' }),
            this._renderField('Modelo', entry.model, { fallback: 'No registrado' }),
            this._renderField('Color', entry.color, { fallback: 'No registrado' }),
            this._renderField('Serial', this._serialText(entry), { fallback: 'No registrado' }),
            this._renderField('IMEI', this._joinParts([entry.imei1, entry.imei2]), { wide: true }),
            this._renderField('Condición física', (entry.physical_condition || []).join(', '), { fallback: 'No registrado', wide: true }),
            this._renderField('Observaciones físicas', entry.physical_notes, { fallback: '', wide: true }),
            this._renderField('Código / patrón / PIN', this._hasValue(entry.unlock_code_hint) ? (entry.unlock_code_protected ? 'Oculto según configuración de seguridad' : entry.unlock_code_hint) : '', { fallback: '', wide: true })
          ], 2, 'receipt-device-grid')}
        </article>
      </section>

      <section class="receipt-section receipt-section--dual">
        <article class="receipt-card">
          <h2>Problema reportado</h2>
          <p class="receipt-paragraph">${this._escape(String(entry.problem_reported || 'No registrado'))}</p>
        </article>
        <article class="receipt-card">
          <h2>Estado y observaciones de recepción</h2>
          <div class="receipt-observation-stack">
            ${this._renderField('Estado de ingreso', this._incomeStatusLabel(entry.status), { fallback: 'Recibido' })}
            ${this._renderField('Observaciones técnicas', entry.identification_notes, { fallback: '', wide: true })}
            ${this._renderField('Daños visibles', (entry.physical_condition || []).join(', '), { fallback: 'No registrado', wide: true })}
            ${this._renderField('Condiciones especiales', entry.physical_notes, { fallback: '', wide: true })}
          </div>
        </article>
      </section>

      <section class="receipt-section">
        <article class="receipt-card">
          <h2>Especificaciones técnicas</h2>
          ${this._renderSpecsGrid(entry)}
        </article>
      </section>

      <section class="receipt-section">
        <article class="receipt-card">
          <h2>Accesorios recibidos</h2>
          ${this._renderAccessoriesTable(entry)}
        </article>
      </section>
    `;

    const photoChunks = photos.length ? this._chunkArray(photos, photos.length <= 3 ? photos.length : 4) : [];
    const photoPages = photoChunks.map((chunk, chunkIndex) => {
      const columns = chunk.length === 1 ? 1 : (chunk.length === 2 ? 2 : (chunk.length === 3 ? 3 : 2));
      const pageContent = `
        <section class="receipt-section">
          <article class="receipt-card receipt-card--tight">
            <h2>Evidencias fotográficas</h2>
            <div class="receipt-photo-grid receipt-photo-grid--${columns}">
              ${chunk.map((photo, index) => {
                const globalIndex = (chunkIndex * 4) + index + 1;
                const imageUrl = this._valueOr(photo.signedUrl || photo.url || photo.preview, '');
                const orientation = (Number(photo.width) || 0) > (Number(photo.height) || 0) ? 'landscape' : (Number(photo.height) || 0) > (Number(photo.width) || 0) ? 'portrait' : 'square';
                return `
                  <article class="receipt-photo-card receipt-photo-card--${orientation}">
                    <div class="receipt-photo-media">
                      ${imageUrl ? `<img src="${this._escape(imageUrl)}" alt="${this._escape(photo.angle || photo.title || `Evidencia ${globalIndex}`)}" crossorigin="anonymous">` : '<div class="receipt-photo-missing">Imagen no disponible</div>'}
                    </div>
                    <div class="receipt-photo-meta">
                      <div class="receipt-photo-index">Evidencia ${globalIndex}</div>
                      <strong>${this._escape(photo.angle || photo.title || `Evidencia ${globalIndex}`)}</strong>
                      ${this._hasValue(photo.description) ? `<p>${this._escape(photo.description)}</p>` : '<p class="receipt-muted">Sin descripción.</p>'}
                      ${photo.created_at ? `<span>${this._escape(Utils.formatDateTime(photo.created_at))}</span>` : ''}
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </article>
        </section>
      `;
      return { pageKind: 'photos', pageTitle: 'Evidencias fotográficas', content: pageContent };
    });

    const hasPolicies = this._hasValue(policyText);
    const hasConditions = this._hasValue(conditionText);
    const moderatePolicies = (policyText.length + conditionText.length) <= 1800;
    const finalPages = [];

    if (hasPolicies && hasConditions && moderatePolicies) {
      finalPages.push({
        pageKind: 'final',
        pageTitle: 'Políticas, condiciones y firmas',
        content: `
          <section class="receipt-section receipt-section--dual receipt-section--final">
            <article class="receipt-card">
              <h2>Políticas</h2>
              ${this._renderPolicyBlock('Políticas', policyText)}
            </article>
            <article class="receipt-card">
              <h2>Condiciones</h2>
              ${this._renderPolicyBlock('Condiciones', conditionText)}
            </article>
          </section>
          ${this._renderSignaturesBlock(entry, config, clientName)}
        `
      });
    } else {
      if (hasPolicies) {
        this._splitTextToChunks(policyText, 1100).forEach((chunk) => {
          finalPages.push({
            pageKind: 'final',
            pageTitle: 'Políticas',
            content: `
              <section class="receipt-section">
                <article class="receipt-card">
                  <h2>Políticas</h2>
                  ${this._renderPolicyBlock('Políticas', chunk.join('\n\n'))}
                </article>
              </section>
            `
          });
        });
      }

      if (hasConditions) {
        this._splitTextToChunks(conditionText, 1100).forEach((chunk) => {
          finalPages.push({
            pageKind: 'final',
            pageTitle: 'Condiciones',
            content: `
              <section class="receipt-section">
                <article class="receipt-card">
                  <h2>Condiciones</h2>
                  ${this._renderPolicyBlock('Condiciones', chunk.join('\n\n'))}
                </article>
              </section>
            `
          });
        });
      }

      if (!finalPages.length) {
        finalPages.push({
          pageKind: 'final',
          pageTitle: 'Firmas y conformidad',
          content: ''
        });
      }

      finalPages[finalPages.length - 1].content += this._renderSignaturesBlock(entry, config, clientName);
    }

    const pages = [
      { pageKind: 'main', pageTitle: 'Resumen de ingreso', content: mainContent },
      ...photoPages,
      ...finalPages
    ];

    const totalPages = pages.length;
    const htmlPages = pages.map((page, index) => this._renderReceiptPageShell({
      entry,
      config,
      pageNumber: index + 1,
      totalPages,
      pageKind: page.pageKind,
      pageTitle: page.pageTitle,
      content: page.content,
      footerNote: config.footer_message || ''
    })).join('');

    const styles = `
      <style>
        :root {
          --receipt-primary: ${config.color_primary || '#1f4fff'};
          --receipt-primary-soft: ${this._rgba(config.color_primary || '#1f4fff', 0.08)};
          --receipt-border: #dbe3ef;
          --receipt-text: #1f2937;
          --receipt-muted: #667085;
          --receipt-surface: #ffffff;
          --receipt-panel: #f8fafc;
          --receipt-page-bg: #edf2f7;
          --receipt-radius: 12px;
        }
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: var(--receipt-page-bg);
          color: var(--receipt-text);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { overflow-x: hidden; }
        .receipt-document {
          width: 100%;
          background: var(--receipt-page-bg);
        }
        .receipt-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 14px;
          padding: 12mm 11mm 10mm;
          background: var(--receipt-surface);
          border: 1px solid rgba(148, 163, 184, 0.20);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.10);
          page-break-after: always;
          break-after: page;
        }
        .receipt-page:last-child {
          margin-bottom: 0;
          page-break-after: auto;
          break-after: auto;
        }
        .receipt-header {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 16px;
          align-items: start;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--receipt-border);
        }
        .receipt-brand {
          display: grid;
          grid-template-columns: 18mm 1fr;
          gap: 10px;
          align-items: start;
        }
        .receipt-logo {
          width: 18mm;
          height: 18mm;
          border-radius: 10px;
          border: 1px solid var(--receipt-border);
          background: linear-gradient(180deg, var(--receipt-primary-soft), #fff);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .receipt-logo img { width: 100%; height: 100%; object-fit: contain; }
        .receipt-logo span {
          font-size: 8pt;
          font-weight: 800;
          color: var(--receipt-primary);
          text-align: center;
          line-height: 1.05;
          padding: 2px;
        }
        .receipt-business-name {
          font-size: 18pt;
          line-height: 1.05;
          font-weight: 900;
          color: var(--receipt-primary);
        }
        .receipt-business-slogan {
          margin-top: 2px;
          font-size: 9pt;
          color: var(--receipt-muted);
        }
        .receipt-business-contact {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px 10px;
          font-size: 8pt;
          color: var(--receipt-muted);
        }
        .receipt-business-contact span {
          padding-right: 10px;
          border-right: 1px solid rgba(148, 163, 184, 0.45);
        }
        .receipt-business-contact span:last-child {
          border-right: 0;
          padding-right: 0;
        }
        .receipt-doc {
          text-align: right;
          display: grid;
          gap: 4px;
        }
        .receipt-doc-title {
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 800;
          color: var(--receipt-primary);
        }
        .receipt-doc-code {
          font-size: 18pt;
          font-weight: 900;
          color: var(--receipt-text);
        }
        .receipt-doc-meta {
          display: grid;
          gap: 3px;
          font-size: 8pt;
          color: var(--receipt-muted);
        }
        .receipt-doc-meta strong { color: var(--receipt-text); font-weight: 700; }
        .receipt-summary {
          margin-top: 10px;
          padding: 8px;
          border: 1px solid var(--receipt-border);
          border-radius: 12px;
          background: #fff;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(38mm, 1fr));
          gap: 8px;
        }
        .receipt-summary-item {
          padding: 7px 8px;
          border-radius: 10px;
          background: var(--receipt-panel);
          border: 1px solid rgba(148, 163, 184, 0.16);
          min-height: 18mm;
        }
        .receipt-summary-item span {
          display: block;
          font-size: 7.5pt;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--receipt-muted);
        }
        .receipt-summary-item strong {
          display: block;
          margin-top: 4px;
          font-size: 10pt;
          color: var(--receipt-text);
          line-height: 1.3;
        }
        .receipt-page-spacer { height: 2mm; }
        .receipt-body {
          margin-top: 8px;
          display: grid;
          gap: 10px;
        }
        .receipt-section { display: grid; gap: 10px; }
        .receipt-section--dual { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .receipt-card {
          border: 1px solid var(--receipt-border);
          border-radius: var(--receipt-radius);
          padding: 10px 11px;
          background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .receipt-card--tight { padding-bottom: 12px; }
        .receipt-card h2 {
          margin: 0 0 8px;
          font-size: 10.5pt;
          font-weight: 900;
          color: var(--receipt-primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .receipt-grid {
          display: grid;
          grid-template-columns: repeat(var(--receipt-columns, 2), minmax(0, 1fr));
          gap: 7px;
        }
        .receipt-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .receipt-field--wide { grid-column: 1 / -1; }
        .receipt-field-label {
          font-size: 7.8pt;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--receipt-muted);
        }
        .receipt-field-value {
          font-size: 9pt;
          font-weight: 700;
          line-height: 1.38;
          color: var(--receipt-text);
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .receipt-field--muted .receipt-field-value {
          color: var(--receipt-muted);
          font-weight: 600;
        }
        .receipt-paragraph {
          margin: 0;
          font-size: 9pt;
          line-height: 1.55;
          color: var(--receipt-text);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .receipt-observation-stack {
          display: grid;
          gap: 8px;
        }
        .receipt-specs-grid { grid-template-columns: repeat(var(--receipt-columns, 3), minmax(0, 1fr)); }
        .receipt-storage-list {
          display: grid;
          gap: 6px;
          margin-top: 4px;
        }
        .receipt-storage-row {
          display: grid;
          grid-template-columns: 10mm 1.1fr 0.9fr;
          gap: 6px;
          align-items: center;
          padding: 6px 8px;
          border-radius: 10px;
          background: var(--receipt-panel);
          font-size: 9pt;
        }
        .receipt-storage-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 8mm;
          height: 8mm;
          border-radius: 999px;
          background: var(--receipt-primary-soft);
          color: var(--receipt-primary);
          font-weight: 800;
          font-size: 8pt;
        }
        .receipt-storage-row strong { text-align: right; }
        .receipt-table-wrap { width: 100%; overflow: hidden; }
        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }
        .receipt-table th,
        .receipt-table td {
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          padding: 7px 6px;
          vertical-align: top;
          text-align: left;
        }
        .receipt-table th {
          font-size: 7.8pt;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--receipt-muted);
          background: #f8fafc;
        }
        .receipt-table tbody tr:last-child td { border-bottom: 0; }
        .receipt-muted { color: var(--receipt-muted); }
        .receipt-empty { margin: 0; font-size: 9pt; color: var(--receipt-muted); font-style: italic; }
        .receipt-photo-grid { display: grid; gap: 9px; }
        .receipt-photo-grid--1 { grid-template-columns: minmax(0, 1fr); }
        .receipt-photo-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .receipt-photo-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .receipt-photo-card {
          border: 1px solid var(--receipt-border);
          border-radius: var(--receipt-radius);
          overflow: hidden;
          background: #fff;
          break-inside: avoid;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
        }
        .receipt-photo-media {
          background: #f8fafc;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
          min-height: 48mm;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }
        .receipt-photo-card--portrait .receipt-photo-media { min-height: 58mm; }
        .receipt-photo-card--landscape .receipt-photo-media { min-height: 42mm; }
        .receipt-photo-media img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
        }
        .receipt-photo-missing { font-size: 9pt; color: var(--receipt-muted); }
        .receipt-photo-meta {
          padding: 9px 10px 10px;
          display: grid;
          gap: 4px;
        }
        .receipt-photo-index {
          font-size: 7.8pt;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--receipt-primary);
          font-weight: 800;
        }
        .receipt-photo-meta strong {
          font-size: 10pt;
          line-height: 1.28;
        }
        .receipt-photo-meta p,
        .receipt-photo-meta span {
          margin: 0;
          font-size: 8pt;
          color: var(--receipt-muted);
          line-height: 1.4;
        }
        .receipt-policy-card {
          display: grid;
          gap: 8px;
        }
        .receipt-policy-card h3 {
          margin: 0;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--receipt-primary);
        }
        .receipt-policy-content {
          font-size: 9pt;
          line-height: 1.6;
          color: var(--receipt-text);
        }
        .receipt-policy-content p { margin: 0 0 8px; }
        .receipt-policy-content ul {
          margin: 0 0 8px;
          padding-left: 16px;
        }
        .receipt-signatures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .receipt-signature {
          display: flex;
          flex-direction: column;
          gap: 5px;
          border: 1px solid var(--receipt-border);
          border-radius: var(--receipt-radius);
          padding: 10px 11px;
          background: #fff;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .receipt-signature-space {
          min-height: 28mm;
          height: 28mm;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }
        .receipt-signature-image {
          display: block;
          width: auto;
          height: auto;
          max-width: 92%;
          max-height: 26mm;
          object-fit: contain;
        }
        .receipt-signature-line {
          border-top: 1px solid #111827;
          margin-top: -1mm;
        }
        .receipt-signature strong {
          margin-top: 4px;
          font-size: 10pt;
        }
        .receipt-signature span {
          font-size: 8pt;
          color: var(--receipt-muted);
          line-height: 1.35;
        }
        .receipt-final-note {
          margin: 0;
          font-size: 9pt;
          color: var(--receipt-muted);
          font-style: italic;
          line-height: 1.45;
        }
        .receipt-footer {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--receipt-border);
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          align-items: start;
          font-size: 7.8pt;
          color: var(--receipt-muted);
        }
        .receipt-footer-left,
        .receipt-footer-center,
        .receipt-footer-right {
          display: grid;
          gap: 2px;
        }
        .receipt-footer-left strong,
        .receipt-footer-center { color: var(--receipt-text); }
        .receipt-footer-center { text-align: center; }
        .receipt-footer-right { text-align: right; }
        @media print {
          html, body { background: #fff; }
          .receipt-page {
            box-shadow: none;
            margin: 0;
            border: 0;
          }
        }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprobante ${this._escape(entry.code || '')}</title>
        ${styles}
      </head>
      <body>
        <div class="receipt-document" data-receipt-document>
          ${htmlPages}
        </div>
      </body>
      </html>
    `;
  },

  _renderSignaturesBlock(entry, config, clientName) {
    const clientSignature = entry.electronic_signatures?.client || null;
    const receiverSignature = entry.electronic_signatures?.receiver || null;
    const signatureImage = (signature, alt) => signature?.image_data_url
      ? `<img class="receipt-signature-image" src="${this._escape(signature.image_data_url)}" alt="${this._escape(alt)}">`
      : '';
    const signedDate = (signature) => signature?.signed_at
      ? (window.SignatureService?.formatDateTime(signature.signed_at) || Utils.formatDate(signature.signed_at, 'DD/MM/YYYY HH:mm'))
      : '';
    return `
      <section class="receipt-section receipt-section--final">
        <article class="receipt-card">
          <h2>Declaración de conformidad</h2>
          <p class="receipt-paragraph receipt-paragraph--compact">
            El cliente declara que la información consignada en este comprobante corresponde al estado del equipo y a los elementos entregados al momento de la recepción.
          </p>
        </article>
        <div class="receipt-signatures">
          <article class="receipt-signature">
            <div class="receipt-signature-space">${signatureImage(clientSignature, 'Firma electrónica del cliente')}</div>
            <div class="receipt-signature-line"></div>
            <strong>Firma del cliente</strong>
            <span>Nombre: ${this._escape(clientName)}</span>
            <span>Documento: ${this._escape(this._valueOr(entry.client.document, 'No registrado'))}</span>
            ${signedDate(clientSignature) ? `<span>Firmada: ${this._escape(signedDate(clientSignature))}</span>` : ''}
          </article>
          <article class="receipt-signature">
            <div class="receipt-signature-space">${signatureImage(receiverSignature, 'Firma electrónica de quien recibe el equipo')}</div>
            <div class="receipt-signature-line"></div>
            <strong>Firma de quien recibe</strong>
            <span>Nombre: ${this._escape(this._receivedByName(entry))}</span>
            <span>Cargo / documento: ${this._escape(this._valueOr(entry.received_by_display_name, 'No registrado'))}</span>
            <span>Fecha: ${this._escape(this._valueOr(entry.received_date, 'No registrada'))}</span>
            ${signedDate(receiverSignature) ? `<span>Firmada: ${this._escape(signedDate(receiverSignature))}</span>` : ''}
          </article>
        </div>
        ${this._hasValue(config.footer_message) ? `<article class="receipt-card receipt-card--note"><p class="receipt-final-note">${this._escape(config.footer_message)}</p></article>` : ''}
      </section>
    `;
  },

  async _fetchIncomeContext(entry) {
    let normalized = this._normalizeIncomeEntry(entry || {});
    const receivedById = normalized.received_by || entry?.received_by || '';
    if (receivedById) {
      try {
        const profile = await supabase.from('profiles').select('*').eq('id', receivedById).single();
        const profileName = this._displayNameFromProfile(profile || {});
        if (profileName) {
          normalized.received_by_full_name = profileName;
          normalized.received_by_display_name = profileName;
        }
      } catch {
        // Keep fallback below.
      }
    }
    if (!normalized.received_by_full_name) {
      const current = Auth.getUser?.() || null;
      const currentName = current ? this._displayNameFromProfile(current) : '';
      if (currentName) {
        normalized.received_by_full_name = currentName;
        normalized.received_by_display_name = currentName;
      }
    }
    if (!normalized.received_by_full_name) {
      normalized.received_by_full_name = 'No registrado';
      normalized.received_by_display_name = 'No registrado';
    }
    if (window.SignatureService && normalized.id) {
      try { normalized = await SignatureService.hydrateEntry(normalized); } catch { /* Keep document generation available on transient API failures. */ }
    }
    return normalized;
  },

  async _createFrameFromHtml(html) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '-100000px';
      frame.style.top = '0';
      frame.style.width = '210mm';
      frame.style.height = '297mm';
      frame.style.border = '0';
      frame.style.pointerEvents = 'none';
      document.body.appendChild(frame);

      const cleanup = () => {
        try { frame.remove(); } catch { /* ignore */ }
      };

      frame.onload = async () => {
        try {
          const doc = frame.contentDocument || frame.contentWindow.document;
          const images = Array.from(doc.images || []);
          await Promise.all(images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            });
          }));
          if (doc.fonts?.ready) await doc.fonts.ready;
          resolve(frame);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  },

  async _buildIncomePdfBlob(entry, config) {
    const fresh = await this._fetchIncomeContext(entry);
    const normalizedConfig = this._normalizeBusinessConfig(config);
    const html = this._renderIncomeHTML(fresh, normalizedConfig);
    const frame = await this._createFrameFromHtml(html);
    let exportContainer = null;
    try {
      const doc = frame.contentDocument || frame.contentWindow.document;
      const receiptDocument = doc.querySelector('[data-receipt-document]');
      const pages = Array.from(receiptDocument?.querySelectorAll('.receipt-page') || []);
      if (!receiptDocument || !pages.length) throw new Error('No se pudo preparar el comprobante');
      if (!window.html2pdf) {
        throw new Error('La librería PDF no está disponible');
      }

      // html2canvas no puede pintar de forma fiable un nodo que pertenece a un
      // iframe. Lo clonamos con sus estilos calculados en el documento principal
      // para capturar exactamente la misma plantilla que muestra la vista previa.
      const exportSource = this._cloneWithComputedStyles(receiptDocument, frame.contentWindow);
      exportContainer = document.createElement('div');
      exportContainer.setAttribute('data-receipt-export-source', 'income');
      exportContainer.style.position = 'fixed';
      exportContainer.style.left = '-100000px';
      exportContainer.style.top = '0';
      exportContainer.style.width = '210mm';
      exportContainer.style.background = '#edf2f7';
      exportContainer.style.pointerEvents = 'none';
      exportContainer.style.zIndex = '-1';
      exportContainer.appendChild(exportSource);
      document.body.appendChild(exportContainer);

      await this._waitForImages(exportSource);
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const exportPages = Array.from(exportSource.querySelectorAll('.receipt-page'));
      const pdfOptions = {
        margin: 0,
        image: { type: 'png', quality: 1 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: [] }
      };

      let pdf = null;
      for (let pageIndex = 0; pageIndex < exportPages.length; pageIndex += 1) {
        const page = exportPages[pageIndex];
        page.style.margin = '0';
        page.style.breakAfter = 'auto';
        page.style.pageBreakAfter = 'auto';

        const pageWorker = window.html2pdf().set(pdfOptions).from(page).toCanvas();
        const canvas = await pageWorker.get('canvas');
        const pageSize = await pageWorker.get('pageSize');

        // html2pdf redondea las medidas A4 en píxeles y puede interpretar una
        // página exacta como 1 página + una franja vacía. Normalizar la relación
        // A4 antes de ensamblar evita ese desbordamiento sin alterar la plantilla.
        const normalizedCanvas = document.createElement('canvas');
        normalizedCanvas.width = canvas.width;
        normalizedCanvas.height = Math.floor(canvas.width * pageSize.inner.ratio);
        const context = normalizedCanvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, normalizedCanvas.width, normalizedCanvas.height);
        context.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          normalizedCanvas.width,
          normalizedCanvas.height
        );

        if (!pdf) {
          const firstPageWorker = window.html2pdf().set(pdfOptions).from(normalizedCanvas).toPdf();
          pdf = await firstPageWorker.get('pdf');
        } else {
          pdf.addPage('a4', 'portrait');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(
            normalizedCanvas.toDataURL('image/png'),
            'PNG',
            0,
            0,
            pdfWidth,
            pdfHeight
          );
        }
      }

      if (!pdf || pdf.internal.getNumberOfPages() !== exportPages.length) {
        throw new Error('No se pudo generar el número correcto de páginas');
      }

      const blob = pdf.output('blob');

      return { blob, fresh, normalizedConfig, html };
    } finally {
      try { exportContainer?.remove(); } catch { /* ignore */ }
      try { frame.remove(); } catch { /* ignore */ }
    }
  },

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  },

  async _openBlobInPrintWindow(blob) {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.left = '-100000px';
    frame.style.top = '0';
    frame.style.width = '210mm';
    frame.style.height = '297mm';
    frame.style.border = '0';
    frame.src = url;
    document.body.appendChild(frame);

    return new Promise((resolve) => {
      frame.onload = () => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch {
          // Fall back to leaving the PDF open.
        }
        setTimeout(() => {
          try { frame.remove(); } catch { /* ignore */ }
          URL.revokeObjectURL(url);
          resolve();
        }, 8000);
      };
    });
  },

  _filenameForIncome(entry, client) {
    const clientName = this._joinParts([client?.name, client?.last_name]) || 'cliente';
    const safeClient = clientName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `Ingreso-${String(entry.code || 'SIN-CODIGO').replace(/[^a-zA-Z0-9-]+/g, '-')}-${safeClient || 'cliente'}.pdf`;
  },

  _closeModal() {
    if (!this._activeModal) return;
    const overlay = this._activeModal;
    overlay.classList.remove('pdf-modal-overlay--active');
    document.body.style.overflow = '';
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    setTimeout(() => overlay.remove(), 260);
    this._activeModal = null;
  },

  _createIconBtn(label, svg, onClick, className = 'pdf-modal-btn') {
    const btn = Utils.createElement('button', { className, title: label, 'aria-label': label, type: 'button' });
    btn.appendChild(Utils.createElement('span', { className: 'pdf-modal-btn-icon', innerHTML: svg }));
    btn.appendChild(Utils.createElement('span', { className: 'pdf-modal-btn-label', textContent: label }));
    btn.addEventListener('click', onClick);
    return btn;
  },

  async previewIncome(entry, config = {}) {
    if (this._busy) return;
    this._busy = true;
    const loadingToken = Components.showLoading('Preparando vista previa del ingreso...');

    const overlay = Utils.createElement('div', { className: 'pdf-modal-overlay' });
    const modal = Utils.createElement('div', { className: 'pdf-modal pdf-modal--income' });
    const header = Utils.createElement('div', { className: 'pdf-modal-header' });
    const headerInfo = Utils.createElement('div', { className: 'pdf-modal-header-info' });
    headerInfo.appendChild(Utils.createElement('h2', { className: 'pdf-modal-title', textContent: 'Vista previa del comprobante de ingreso' }));
    headerInfo.appendChild(Utils.createElement('span', { className: 'pdf-modal-subtitle', textContent: entry.code || '' }));
    header.appendChild(headerInfo);

    const ICONS = {
      close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
      share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
      download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    };

    header.appendChild(this._createIconBtn('Cerrar', ICONS.close, () => this._closeModal(), 'pdf-modal-btn pdf-modal-btn--close'));
    modal.appendChild(header);

    const content = Utils.createElement('div', { className: 'pdf-modal-content' });
    const preview = Utils.createElement('div', { className: 'pdf-income-preview' }, [
      Utils.createElement('div', { className: 'pdf-income-loading', textContent: 'Preparando comprobante...' })
    ]);
    content.appendChild(preview);
    modal.appendChild(content);

    const footer = Utils.createElement('div', { className: 'pdf-modal-footer' });
    const left = Utils.createElement('div', { className: 'pdf-modal-footer-group' });
    const right = Utils.createElement('div', { className: 'pdf-modal-footer-group' });
    left.appendChild(this._createIconBtn('Cerrar', ICONS.close, () => this._closeModal(), 'pdf-modal-btn pdf-modal-btn--secondary'));
    right.appendChild(this._createIconBtn('Imprimir', ICONS.print, () => this.printIncome(entry, config), 'pdf-modal-btn pdf-modal-btn--secondary'));
    right.appendChild(this._createIconBtn('Compartir', ICONS.share, () => this.shareIncome(entry, config), 'pdf-modal-btn pdf-modal-btn--secondary'));
    right.appendChild(this._createIconBtn('Descargar PDF', ICONS.download, () => this.downloadIncome(entry, config), 'pdf-modal-btn pdf-modal-btn--primary'));
    footer.appendChild(left);
    footer.appendChild(right);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._activeModal = overlay;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('pdf-modal-overlay--active'));

    this._escHandler = (event) => { if (event.key === 'Escape') this._closeModal(); };
    document.addEventListener('keydown', this._escHandler);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) this._closeModal(); });

    try {
      const fresh = await this._fetchIncomeContext(entry);
      const normalizedConfig = this._normalizeBusinessConfig(config);
      const html = this._renderIncomeHTML(fresh, normalizedConfig);
      preview.innerHTML = '<iframe class="pdf-modal-iframe" title="Vista previa del comprobante"></iframe>';
      const frame = preview.querySelector('iframe');
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      this._currentIncome = fresh;
      this._currentIncomeConfig = normalizedConfig;
    } catch (error) {
      preview.innerHTML = '<div class="pdf-income-loading pdf-income-loading--error">No se pudo preparar el comprobante.</div>';
      Components.toast({ type: 'error', message: error.message || 'No se pudo preparar el comprobante' });
    } finally {
      Components.hideLoading(loadingToken);
      this._busy = false;
    }
  },

  async downloadIncome(entry, config = {}) {
    const loadingToken = Components.showLoading('Generando PDF del ingreso...');
    try {
      const { blob, fresh } = await this._buildIncomePdfBlob(entry, config);
      this._downloadBlob(blob, this._filenameForIncome(fresh, fresh.client));
      Components.toast({ type: 'success', message: `PDF generado correctamente: ${fresh.code || 'ingreso'}` });
    } catch (error) {
      Components.toast({ type: 'error', message: error.message || 'No se pudo generar el PDF' });
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  async printIncome(entry, config = {}) {
    const loadingToken = Components.showLoading('Preparando documento para imprimir...');
    try {
      const { blob } = await this._buildIncomePdfBlob(entry, config);
      await this._openBlobInPrintWindow(blob);
      Components.toast({ type: 'success', message: 'Documento preparado para impresión.' });
    } catch (error) {
      Components.toast({ type: 'error', message: error.message || 'No se pudo preparar la impresión' });
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  async shareIncome(entry, config = {}) {
    const loadingToken = Components.showLoading('Preparando PDF para compartir...');
    try {
      const { blob, fresh } = await this._buildIncomePdfBlob(entry, config);
      const filename = this._filenameForIncome(fresh, fresh.client);
      const file = new File([blob], filename, { type: 'application/pdf' });
      const clientName = this._joinParts([fresh.client.name, fresh.client.last_name]) || 'cliente';
      const message = `Hola, ${clientName}. Adjuntamos el comprobante de ingreso ${fresh.code || ''}.`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Comprobante ${fresh.code || ''}`, text: message, files: [file] });
        Components.toast({ type: 'success', message: 'Compartido correctamente.' });
        return;
      }

      const phone = this._valueOr(fresh.client.whatsapp || fresh.client.phone, '').replace(/\D/g, '');
      const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      this._downloadBlob(blob, filename);
      Components.toast({ type: 'info', message: 'WhatsApp abierto. El PDF se descargó para adjuntarlo manualmente.' });
    } catch (error) {
      Components.toast({ type: 'error', message: error.message || 'No se pudo compartir el comprobante' });
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  _filenameForDocument(type, doc, client = {}) {
    const label = type === 'invoice' ? 'Factura' : 'Cotizacion';
    const number = this._valueOr(doc?.number, 'SIN-NUMERO');
    const clientName = this._joinParts([client.name, client.last_name]) || client.company || 'cliente';
    const safePart = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${label}-${safePart(number) || 'SIN-NUMERO'}-${safePart(clientName) || 'cliente'}.pdf`;
  },

  _cloneWithComputedStyles(source, sourceWindow) {
    const clone = source.cloneNode(true);
    const sourceElements = [source, ...source.querySelectorAll('*')];
    const cloneElements = [clone, ...clone.querySelectorAll('*')];

    sourceElements.forEach((sourceElement, index) => {
      const cloneElement = cloneElements[index];
      if (!cloneElement?.style) return;

      const computed = sourceWindow.getComputedStyle(sourceElement);
      for (let i = 0; i < computed.length; i++) {
        const property = computed[i];
        const value = computed.getPropertyValue(property);
        if (value) {
          cloneElement.style.setProperty(property, value, computed.getPropertyPriority(property));
        }
      }
    });

    return clone;
  },

  async _waitForImages(root) {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }));
  },

  async _buildDocumentPdfBlob(type, doc, client, items, config = {}) {
    if (!window.html2pdf) {
      throw new Error('La librería PDF no está disponible');
    }

    const html = this.generateHTML(type, doc, client || {}, items || [], config || {});
    const frame = await this._createFrameFromHtml(html);
    let exportContainer = null;
    try {
      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      const source = frameDoc.querySelector('.page');
      if (!source) throw new Error('No se pudo preparar el documento');

      const exportSource = this._cloneWithComputedStyles(source, frame.contentWindow);
      exportContainer = document.createElement('div');
      exportContainer.setAttribute('data-document-export-source', type);
      exportContainer.style.position = 'fixed';
      exportContainer.style.left = '-100000px';
      exportContainer.style.top = '0';
      exportContainer.style.width = '210mm';
      exportContainer.style.background = '#ffffff';
      exportContainer.style.pointerEvents = 'none';
      exportContainer.style.zIndex = '-1';
      exportContainer.appendChild(exportSource);
      document.body.appendChild(exportContainer);

      await this._waitForImages(exportSource);
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      return await window.html2pdf()
        .set({
          margin: 0,
          filename: this._filenameForDocument(type, doc, client),
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: Math.min(3, window.devicePixelRatio || 2),
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            windowWidth: Math.ceil(exportSource.scrollWidth || exportContainer.scrollWidth),
            windowHeight: Math.ceil(exportSource.scrollHeight || exportContainer.scrollHeight)
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
          },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(exportSource)
        .outputPdf('blob');
    } finally {
      try { exportContainer?.remove(); } catch { /* ignore */ }
      try { frame.remove(); } catch { /* ignore */ }
    }
  },

  async preview(type, doc, client = {}, items = [], config = {}) {
    const loadingToken = Components.showLoading(`Preparando vista previa de ${type === 'invoice' ? 'la factura' : 'la cotización'}...`);
    try {
      if (this._activeModal) this._closeModal();

      const isInvoice = type === 'invoice';
      const overlay = Utils.createElement('div', { className: 'pdf-modal-overlay' });
      const modal = Utils.createElement('div', { className: 'pdf-modal' });
      const header = Utils.createElement('div', { className: 'pdf-modal-header' });
      const headerInfo = Utils.createElement('div', { className: 'pdf-modal-header-info' });
      headerInfo.appendChild(Utils.createElement('h2', {
        className: 'pdf-modal-title',
        textContent: `Vista previa de ${isInvoice ? 'factura' : 'cotización'}`
      }));
      headerInfo.appendChild(Utils.createElement('span', {
        className: 'pdf-modal-subtitle',
        textContent: doc?.number || 'Documento sin número'
      }));
      header.appendChild(headerInfo);

      const closeIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      const downloadIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      header.appendChild(this._createIconBtn('Cerrar', closeIcon, () => this._closeModal(), 'pdf-modal-btn pdf-modal-btn--close'));
      modal.appendChild(header);

      const content = Utils.createElement('div', { className: 'pdf-modal-content' });
      const preview = Utils.createElement('div', { className: 'pdf-income-preview' });
      const frame = Utils.createElement('iframe', {
        className: 'pdf-modal-iframe',
        title: `Vista previa de ${isInvoice ? 'factura' : 'cotización'}`
      });
      preview.appendChild(frame);
      content.appendChild(preview);
      modal.appendChild(content);

      const footer = Utils.createElement('div', { className: 'pdf-modal-footer' });
      const left = Utils.createElement('div', { className: 'pdf-modal-footer-group' });
      const right = Utils.createElement('div', { className: 'pdf-modal-footer-group' });
      left.appendChild(this._createIconBtn('Cerrar', closeIcon, () => this._closeModal(), 'pdf-modal-btn pdf-modal-btn--secondary'));
      right.appendChild(this._createIconBtn(
        'Descargar PDF',
        downloadIcon,
        () => this.download(type, doc, client, items, config),
        'pdf-modal-btn pdf-modal-btn--primary'
      ));
      footer.appendChild(left);
      footer.appendChild(right);
      modal.appendChild(footer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      this._activeModal = overlay;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => overlay.classList.add('pdf-modal-overlay--active'));

      this._escHandler = (event) => {
        if (event.key === 'Escape') this._closeModal();
      };
      document.addEventListener('keydown', this._escHandler);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) this._closeModal();
      });

      const frameDoc = frame.contentDocument || frame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(this.generateHTML(type, doc, client, items, config));
      frameDoc.close();
    } catch (error) {
      Components.toast({ type: 'error', message: error.message || 'No se pudo mostrar la vista previa' });
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  async download(type, doc, client = {}, items = [], config = {}) {
    const loadingToken = Components.showLoading(`Generando PDF de ${type === 'invoice' ? 'la factura' : 'la cotización'}...`);
    try {
      const blob = await this._buildDocumentPdfBlob(type, doc, client, items, config);
      this._downloadBlob(blob, this._filenameForDocument(type, doc, client));
      Components.toast({ type: 'success', message: 'PDF generado correctamente' });
    } catch (error) {
      console.error('PDF generation error:', error);
      Components.toast({ type: 'error', message: error.message || 'No se pudo generar el PDF' });
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  generateBlob(type, doc, client, items, config) {
    return new Blob([this.generateHTML(type, doc, client, items, config)], { type: 'text/html;charset=utf-8' });
  },

  generateHTML(type, doc, client, items, config) {
    const isInvoice = type === 'invoice';
    const title = isInvoice ? 'FACTURA' : 'COTIZACIÓN';
    const totals = Utils.calculateDocumentTotals(items, {
      applyIva: doc.apply_iva,
      applyRetention: doc.apply_retention,
      ivaRate: config.iva_rate || 19
    });
    const subtotal = totals.subtotal;
    const totalDiscount = totals.discount;
    const iva = totals.iva;
    const retention = totals.retention;
    const total = totals.total;
    const itemsHTML = items.map((item, i) => `
      <tr>
        <td style="text-align:center;padding:8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>${Utils.escapeHtml(item.name || '')}</strong>${item.description ? `<br><span style="color:#6b7280;font-size:8pt">${Utils.escapeHtml(item.description)}</span>` : ''}</td>
        <td style="text-align:center;padding:8px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
        <td style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">${Utils.formatCurrency(item.unit_price, config)}</td>
        <td style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">${Utils.formatCurrency(item.discount || 0, config)}</td>
        <td style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${Utils.formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)) - parseFloat(item.discount || 0), config)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${title} ${doc.number || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.5; }
          .page { padding: 15mm; max-width: 210mm; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid ${config.color_primary || '#6366f1'}; }
          .business-info h2 { font-size: 16pt; font-weight: 700; color: ${config.color_primary || '#6366f1'}; margin-bottom: 4px; }
          .business-info p { font-size: 8pt; color: #6b7280; margin-bottom: 2px; }
          .doc-badge { display: inline-block; padding: 4px 12px; background: ${config.color_primary || '#6366f1'}; color: white; border-radius: 4px; font-size: 10pt; font-weight: 700; letter-spacing: 1px; }
          .title-section { text-align: center; margin: 20px 0; }
          .title-section h1 { font-size: 22pt; font-weight: 800; color: ${config.color_primary || '#6366f1'}; text-transform: uppercase; letter-spacing: 3px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { padding: 12px; background: #f8fafc; border-radius: 8px; }
          .info-box h4 { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }
          .info-box p { font-size: 9pt; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #374151; letter-spacing: 0.5px; }
          .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
          .totals-table { width: 260px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9pt; color: #4b5563; }
          .totals-row.total { font-size: 12pt; font-weight: 800; color: #1a1a1a; border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer p { font-size: 7pt; color: #9ca3af; margin-bottom: 4px; }
          .footer .message { font-size: 8pt; color: #6b7280; font-style: italic; margin-bottom: 8px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 10mm; } }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="business-info">
              ${config.logo_url ? `<img src="${config.logo_url}" style="height:50px;margin-bottom:8px;object-fit:contain;" alt="Logo">` : ''}
              <h2>${Utils.escapeHtml(config.business_name || 'Mi Negocio')}</h2>
              ${config.slogan ? `<p style="font-style:italic">${Utils.escapeHtml(config.slogan)}</p>` : ''}
              ${config.nit ? `<p>NIT: ${Utils.escapeHtml(config.nit)}</p>` : ''}
              ${config.address ? `<p>${Utils.escapeHtml(config.address)}</p>` : ''}
              ${config.city ? `<p>${Utils.escapeHtml(config.city)}${config.department ? ', ' + Utils.escapeHtml(config.department) : ''}</p>` : ''}
              ${config.phone ? `<p>Tel: ${Utils.escapeHtml(config.phone)}</p>` : ''}
              ${config.email ? `<p>${Utils.escapeHtml(config.email)}</p>` : ''}
            </div>
            <div style="text-align:right">
              <div class="doc-badge">${title}</div>
              <div style="margin-top:12px;font-size:9pt">
                <p style="font-weight:600;color:#1a1a1a">${Utils.escapeHtml(doc.number || '-')}</p>
                <p style="color:#6b7280">Fecha: ${Utils.formatDate(doc.created_at)}</p>
                <p style="color:#6b7280">Estado: ${Utils.capitalize(doc.status || 'draft')}</p>
              </div>
            </div>
          </div>
          <div class="title-section"><h1>${title}</h1></div>
          <div class="info-grid">
            <div class="info-box">
              <h4>Datos del cliente</h4>
              <p><strong>${Utils.escapeHtml((client.name || '') + ' ' + (client.last_name || ''))}</strong></p>
              ${client.company ? `<p>${Utils.escapeHtml(client.company)}</p>` : ''}
              ${client.document || client.nit ? `<p>Doc: ${Utils.escapeHtml(client.document || client.nit)}</p>` : ''}
              ${client.phone ? `<p>Tel: ${Utils.escapeHtml(client.phone)}</p>` : ''}
              ${client.email ? `<p>${Utils.escapeHtml(client.email)}</p>` : ''}
              ${client.address ? `<p>${Utils.escapeHtml(client.address)}</p>` : ''}
            </div>
            <div class="info-box">
              <h4>Resumen</h4>
              <p>Subtotal: ${Utils.formatCurrency(subtotal, config)}</p>
              <p>Descuento: -${Utils.formatCurrency(totalDiscount, config)}</p>
              ${doc.apply_iva ? `<p>IVA (${config.iva_rate || 19}%): ${Utils.formatCurrency(iva, config)}</p>` : ''}
              ${doc.apply_retention ? `<p>Retención: -${Utils.formatCurrency(retention, config)}</p>` : ''}
              <p style="font-weight:800;font-size:11pt;margin-top:6px;color:${config.color_primary || '#6366f1'}">Total: ${Utils.formatCurrency(total, config)}</p>
            </div>
          </div>
          <table>
            <thead><tr><th style="text-align:center;width:40px">#</th><th>Descripción</th><th style="text-align:center;width:60px">Cant.</th><th style="text-align:right;width:100px">Precio</th><th style="text-align:right;width:80px">Desc.</th><th style="text-align:right;width:110px">Subtotal</th></tr></thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <div class="totals">
            <div class="totals-table">
              <div class="totals-row"><span>Subtotal</span><span>${Utils.formatCurrency(subtotal, config)}</span></div>
              <div class="totals-row"><span>Descuento</span><span>-${Utils.formatCurrency(totalDiscount, config)}</span></div>
              ${doc.apply_iva ? `<div class="totals-row"><span>IVA (${config.iva_rate || 19}%)</span><span>${Utils.formatCurrency(iva, config)}</span></div>` : ''}
              ${doc.apply_retention ? `<div class="totals-row"><span>Retención</span><span>-${Utils.formatCurrency(retention, config)}</span></div>` : ''}
              <div class="totals-row total"><span>TOTAL</span><span>${Utils.formatCurrency(total, config)}</span></div>
            </div>
          </div>
          ${doc.observations ? `<div style="margin-bottom:20px"><h4 style="font-size:8pt;text-transform:uppercase;color:#6b7280;margin-bottom:4px">Observaciones</h4><p style="font-size:9pt;color:#374151;background:#f8fafc;padding:10px;border-radius:6px">${Utils.escapeHtml(doc.observations)}</p></div>` : ''}
          <div class="footer">
            ${config.footer_message ? `<p class="message">${Utils.escapeHtml(config.footer_message)}</p>` : ''}
            ${config.policies ? `<p>${Utils.escapeHtml(config.policies)}</p>` : ''}
            ${config.conditions ? `<p>${Utils.escapeHtml(config.conditions)}</p>` : ''}
            <p>${Utils.escapeHtml(config.business_name || '')} - ${Utils.escapeHtml(config.address || '')} ${config.phone ? '- Tel: ' + Utils.escapeHtml(config.phone) : ''}</p>
            <p style="margin-top:4px;font-size:6pt;color:#d1d5db">Generado por FIXORA · ${Utils.formatDateTime(new Date())}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
};

window.PDFGenerator = PDFGenerator;
