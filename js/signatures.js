/* FIXORA - Remote electronic signature workflow */

const SignatureService = {
  isEnabled() {
    return CONFIG.features?.remoteSignatures === true;
  },

  async admin(action, payload = {}) {
    if (!this.isEnabled()) {
      throw new Error('El servicio de firma electrónica aún no está desplegado en Supabase.');
    }
    try {
      return await supabase.invoke('signature-admin', { action, ...payload });
    } catch (error) {
      if (!navigator.onLine) throw new Error('No hay conexión. Verifica tu red e inténtalo de nuevo.');
      if (error?.status === 401 || error?.status === 403) throw new Error('No tienes permisos para realizar esta acción.');
      throw new Error(error?.details?.error || error?.message || 'Fallo temporal de Supabase. Inténtalo nuevamente.');
    }
  },

  list(ingresoId) {
    return this.admin('list', { ingreso_id: ingresoId });
  },

  create(ingresoId, signatureType, regenerate = false) {
    return this.admin('create', {
      ingreso_id: ingresoId,
      signature_type: signatureType,
      regenerate,
      expiration_minutes: 30
    });
  },

  revoke(requestId) {
    return this.admin('revoke', { request_id: requestId });
  },

  publicAppUrl() {
    const configured = String(CONFIG.app.publicUrl || '').trim().replace(/\/$/, '');
    if (configured) return configured;
    const currentDirectory = new URL('./', window.location.href);
    return currentDirectory.href.replace(/\/$/, '');
  },

  publicLink(token) {
    return `${this.publicAppUrl()}/firma.html?token=${encodeURIComponent(token)}`;
  },

  isLocalhost() {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(this.publicAppUrl()).hostname);
  },

  formatDateTime(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('es-CO', {
        timeZone: CONFIG.app.timeZone || 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(value));
    } catch { return Utils.formatDate(value, 'DD/MM/YYYY HH:mm'); }
  },

  async urlToDataUrl(url) {
    if (!url) return '';
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar la imagen de firma.');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen de firma.'));
      reader.readAsDataURL(blob);
    });
  },

  async hydrateEntry(entry) {
    if (!entry?.id) return entry;
    const state = await this.list(entry.id);
    const signatures = {};
    await Promise.all((state.signatures || []).map(async (signature) => {
      try {
        signatures[signature.signature_type] = {
          ...signature,
          image_data_url: await this.urlToDataUrl(signature.image_url)
        };
      } catch {
        signatures[signature.signature_type] = signature;
      }
    }));
    return { ...entry, electronic_signatures: signatures, signature_state: state };
  }
};

const SignatureManager = {
  modal: null,
  pollTimer: null,
  activeRequest: null,
  activeType: null,
  entry: null,
  trigger: null,
  onSigned: null,

  labels: {
    client: 'Firma del cliente',
    receiver: 'Firma de quien recibe el equipo'
  },

  stopPolling() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  },

  close() {
    this.stopPolling();
    const trigger = this.trigger;
    this.modal?.close();
    this.modal = null;
    this.restoreBodyScroll();
    setTimeout(() => trigger?.focus(), 320);
  },

  lockBodyScroll() {
    if (!document.body.dataset.signaturePreviousOverflow) document.body.dataset.signaturePreviousOverflow = document.body.style.overflow || 'unset';
    document.body.style.overflow = 'hidden';
  },

  restoreBodyScroll() {
    const previous = document.body.dataset.signaturePreviousOverflow;
    if (previous !== undefined) {
      document.body.style.overflow = previous === 'unset' ? '' : previous;
      delete document.body.dataset.signaturePreviousOverflow;
    }
  },

  statusFor(state, type) {
    if ((state.signatures || []).some((item) => item.signature_type === type && item.is_current)) return 'signed';
    const latest = (state.requests || []).find((item) => item.signature_type === type);
    return latest?.status || 'none';
  },

  statusLabel(status) {
    return ({ none: 'Sin firma', pending: 'Solicitud activa', signed: 'Firmada', expired: 'Vencida', revoked: 'Revocada', superseded: 'Reemplazada' })[status] || 'Sin firma';
  },

  statusClass(status) {
    return ['signed', 'pending', 'expired'].includes(status) ? status : 'none';
  },

  async open(entry, trigger, onSigned) {
    this.stopPolling();
    this.entry = entry;
    this.trigger = trigger || document.activeElement;
    this.onSigned = onSigned;
    const loading = Components.showLoading('Consultando las firmas del ingreso...');
    try {
      const state = await SignatureService.list(entry.id);
      this.renderSelection(state);
    } catch (error) {
      Components.toast({ type: 'error', message: error.message });
    } finally {
      Components.hideLoading(loading);
    }
  },

  renderSelection(state) {
    if (this.modal) this.modal.close();
    const client = this.entry.client || this.entry.clients || {};
    const clientName = [client.name, client.last_name].filter(Boolean).join(' ') || 'Cliente no registrado';
    const currentUser = Auth.getUser?.() || {};
    const receiverName = currentUser.user_metadata?.full_name || currentUser.email || 'Usuario que recibió el equipo';
    const card = (type, name, detail) => {
      const status = this.statusFor(state, type);
      const signature = (state.signatures || []).find((item) => item.signature_type === type && item.is_current);
      return `
        <article class="signature-option-card" data-signature-card="${type}">
          <div class="signature-option-icon" aria-hidden="true">${type === 'client' ? 'C' : 'R'}</div>
          <div class="signature-option-content">
            <div class="signature-option-heading">
              <strong>${Utils.sanitize(this.labels[type])}</strong>
              <span class="signature-status signature-status--${this.statusClass(status)}">${this.statusLabel(status)}</span>
            </div>
            <span>${Utils.sanitize(name)}</span>
            <small>${Utils.sanitize(detail || 'Sin identificación registrada')}</small>
            ${signature ? `<small>Firmada: ${Utils.sanitize(SignatureService.formatDateTime(signature.signed_at))}</small>` : ''}
          </div>
          <div class="signature-option-actions">
            ${signature?.image_url ? `<button class="btn btn-secondary" type="button" data-view-signature="${Utils.escapeHtml(signature.image_url)}">Ver firma</button>` : ''}
            <button class="btn ${status === 'signed' ? 'btn-outline' : 'btn-primary'}" type="button" data-request-signature="${type}">
              ${status === 'signed' ? 'Solicitar reemplazo' : 'Solicitar firma'}
            </button>
          </div>
        </article>`;
    };
    let selectionModal = null;
    this.modal = Components.modal({
      title: 'Solicitar firma electrónica',
      size: 'lg',
      className: 'signature-modal',
      content: `<div class="signature-options" aria-live="polite">
        <p class="text-secondary">Selecciona el espacio exacto del comprobante que debe firmarse.</p>
        ${card('client', clientName, client.document || '')}
        ${card('receiver', receiverName, currentUser.user_metadata?.role || '')}
      </div>`,
      actions: [{ label: 'Cerrar', class: 'btn-secondary', onClick: () => this.close() }],
      onClose: () => {
        if (!this.modal || this.modal === selectionModal) {
          if (this.modal === selectionModal) this.modal = null;
          this.stopPolling(); this.restoreBodyScroll(); setTimeout(() => this.trigger?.focus(), 50);
        }
      }
    });
    selectionModal = this.modal;
    this.lockBodyScroll();
    this.modal.modal.setAttribute('role', 'dialog');
    this.modal.modal.setAttribute('aria-modal', 'true');
    const title = this.modal.modal.querySelector('.modal-title');
    if (title) { title.id = 'signature-modal-title'; this.modal.modal.setAttribute('aria-labelledby', title.id); }
    this.modal.body.querySelectorAll('[data-request-signature]').forEach((button) => {
      button.addEventListener('click', () => this.request(button.dataset.requestSignature, state));
    });
    this.modal.body.querySelectorAll('[data-view-signature]').forEach((button) => {
      button.addEventListener('click', () => window.open(button.dataset.viewSignature, '_blank', 'noopener,noreferrer'));
    });
    setTimeout(() => this.modal?.body.querySelector('[data-request-signature]')?.focus(), 30);
  },

  async request(type, state) {
    const signed = this.statusFor(state, type) === 'signed';
    if (signed) {
      const confirmed = await Components.confirm({
        title: 'Solicitar reemplazo de firma',
        message: 'La firma anterior se conservará para auditoría y solo dejará de estar vigente cuando se reciba la nueva.',
        confirmLabel: 'Continuar',
        type: 'warning'
      });
      if (!confirmed) return;
    }
    const loading = Components.showLoading('Creando solicitud segura...');
    try {
      const result = await SignatureService.create(this.entry.id, type, false);
      this.activeType = type;
      this.activeRequest = result.request;
      this.renderQr(result.request, result.token, result.reused);
    } catch (error) {
      Components.toast({ type: 'error', message: error.message });
    } finally {
      Components.hideLoading(loading);
    }
  },

  renderQr(request, token, reused) {
    this.stopPolling();
    const link = SignatureService.publicLink(token);
    let qrMarkup = '';
    try {
      const qr = qrcode(0, 'M');
      qr.addData(link);
      qr.make();
      qrMarkup = qr.createSvgTag({ scalable: true, margin: 4, title: `QR para ${this.labels[request.signature_type]}` });
    } catch {
      Components.toast({ type: 'error', message: 'No se pudo generar el código QR.' });
    }
    this.modal.body.innerHTML = `
      <div class="signature-qr-view" aria-live="polite">
        <div class="signature-request-summary">
          <span>Comprobante</span><strong>${Utils.sanitize(request.ingreso_code || this.entry.code)}</strong>
          <span>Tipo</span><strong>${Utils.sanitize(this.labels[request.signature_type])}</strong>
          <span>Firmante esperado</span><strong>${Utils.sanitize(request.expected_signer_name || 'No registrado')}</strong>
        </div>
        <div class="signature-qr-code">${qrMarkup}</div>
        <label class="form-label" for="signature-public-link">Enlace público seguro</label>
        <div class="signature-link-row">
          <input class="form-input" id="signature-public-link" value="${Utils.escapeHtml(link)}" readonly>
          <button class="btn btn-outline" type="button" id="signature-copy-link">Copiar enlace</button>
        </div>
        <div id="signature-copy-feedback" class="signature-copy-feedback" role="status"></div>
        <div class="signature-request-meta">
          <span class="signature-status signature-status--pending">Solicitud activa</span>
          <span>Expira: <strong>${Utils.sanitize(SignatureService.formatDateTime(request.expires_at))}</strong></span>
          <span id="signature-countdown"></span>
        </div>
        ${SignatureService.isLocalhost() ? '<div class="signature-warning">Esta aplicación usa localhost. Un celular externo no podrá abrir el enlace; configura CONFIG.app.publicUrl con una dirección accesible.</div>' : ''}
        <div class="signature-waiting" id="signature-waiting"><span class="spinner spinner-sm"></span> Esperando la firma desde el dispositivo móvil…</div>
        ${reused ? '<p class="text-secondary signature-reused">Se reutilizó la solicitud activa existente.</p>' : ''}
        <div class="signature-qr-actions">
          <button class="btn btn-secondary" type="button" id="signature-back">Volver</button>
          <button class="btn btn-outline" type="button" id="signature-revoke">Revocar</button>
          <button class="btn btn-outline" type="button" id="signature-regenerate">Regenerar enlace</button>
          <button class="btn btn-secondary" type="button" id="signature-close">Cerrar</button>
        </div>
      </div>`;
    this.modal.body.querySelector('#signature-copy-link')?.addEventListener('click', () => this.copyLink(link));
    this.modal.body.querySelector('#signature-close')?.addEventListener('click', () => this.close());
    this.modal.body.querySelector('#signature-back')?.addEventListener('click', async () => this.renderSelection(await SignatureService.list(this.entry.id)));
    this.modal.body.querySelector('#signature-revoke')?.addEventListener('click', () => this.revoke());
    this.modal.body.querySelector('#signature-regenerate')?.addEventListener('click', () => this.regenerate());
    this.updateCountdown(request.expires_at);
    this.startPolling(request.id);
  },

  async copyLink(link) {
    const feedback = this.modal?.body.querySelector('#signature-copy-feedback');
    try {
      await navigator.clipboard.writeText(link);
      if (feedback) feedback.textContent = 'Enlace copiado correctamente.';
    } catch {
      const input = this.modal?.body.querySelector('#signature-public-link');
      input?.select();
      if (feedback) feedback.textContent = 'Selecciona y copia el enlace manualmente.';
    }
  },

  updateCountdown(expiresAt) {
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const el = this.modal?.body.querySelector('#signature-countdown');
      if (!el) return;
      const remaining = Math.max(0, target - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      el.textContent = remaining ? `Tiempo restante: ${minutes}:${String(seconds).padStart(2, '0')}` : 'Enlace vencido';
      if (remaining) setTimeout(tick, 1000);
    };
    tick();
  },

  async regenerate() {
    const confirmed = await Components.confirm({
      title: 'Regenerar enlace',
      message: 'El enlace anterior será revocado inmediatamente y dejará de funcionar.',
      confirmLabel: 'Regenerar',
      type: 'warning'
    });
    if (!confirmed) return;
    const loading = Components.showLoading('Regenerando enlace seguro...');
    try {
      const result = await SignatureService.create(this.entry.id, this.activeType, true);
      this.activeRequest = result.request;
      this.renderQr(result.request, result.token, false);
    } catch (error) {
      Components.toast({ type: 'error', message: error.message });
    } finally { Components.hideLoading(loading); }
  },

  async revoke() {
    const confirmed = await Components.confirm({
      title: 'Revocar solicitud',
      message: 'El enlace dejará de funcionar inmediatamente y no podrá utilizarse para firmar.',
      confirmLabel: 'Revocar',
      type: 'warning'
    });
    if (!confirmed) return;
    try {
      await SignatureService.revoke(this.activeRequest.id);
      this.stopPolling();
      this.renderSelection(await SignatureService.list(this.entry.id));
      Components.toast({ type: 'success', message: 'Solicitud revocada.' });
    } catch (error) { Components.toast({ type: 'error', message: error.message }); }
  },

  startPolling(requestId) {
    this.stopPolling();
    const check = async () => {
      try {
        const state = await SignatureService.list(this.entry.id);
        const request = (state.requests || []).find((item) => item.id === requestId);
        if (request?.status === 'signed') {
          this.stopPolling();
          const waiting = this.modal?.body.querySelector('#signature-waiting');
          if (waiting) waiting.innerHTML = `<strong>Firma recibida</strong> · ${Utils.sanitize(SignatureService.formatDateTime(request.signed_at))}`;
          Components.toast({ type: 'success', message: 'Firma recibida correctamente.' });
          await this.onSigned?.(this.entry.id, request.signature_type);
          return;
        }
        if (!request || request.status !== 'pending') {
          this.stopPolling();
          const waiting = this.modal?.body.querySelector('#signature-waiting');
          if (waiting) waiting.textContent = request?.status === 'expired' ? 'El enlace venció. Regenera la solicitud.' : 'La solicitud ya no está activa.';
          return;
        }
      } catch {
        // A transient polling failure must not close the modal.
      }
      this.pollTimer = setTimeout(check, 5000);
    };
    this.pollTimer = setTimeout(check, 3000);
  }
};

window.SignatureService = SignatureService;
window.SignatureManager = SignatureManager;
