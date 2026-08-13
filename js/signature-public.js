/* FIXORA - Public mobile electronic signature */
(async () => {
  'use strict';
  const root = document.getElementById('sign-app');
  const token = new URLSearchParams(location.search).get('token') || '';
  let requestInfo = null;
  let submitting = false;
  const strokes = [];
  let currentStroke = null;

  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const endpoint = `${CONFIG.supabase.url}/functions/v1/signature-public`;
  const call = async (body) => {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CONFIG.supabase.anonKey },
        body: JSON.stringify(body),
        cache: 'no-store'
      });
    } catch { throw new Error('No hay conexión. Verifica tu red e inténtalo nuevamente.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No fue posible completar la solicitud.');
    return data;
  };

  const showInvalid = (message = 'Este enlace ya no es válido. Solicita uno nuevo al establecimiento.') => {
    root.innerHTML = `<div class="sign-brand"><span class="sign-brand-mark">F</span> FIXORA</div>
      <div class="sign-state sign-state--error"><div class="sign-state-icon">!</div><h1>Enlace no disponible</h1><p>${escapeHtml(message)}</p></div>`;
  };

  if (!SignatureCore.isValidToken(token)) { showInvalid(); return; }
  try { requestInfo = await call({ action: 'inspect', token }); }
  catch (error) { showInvalid(error.message); return; }

  const title = requestInfo.signature_type === 'client' ? 'Firma del cliente' : 'Firma de quien recibe el equipo';
  root.innerHTML = `
    <div class="sign-brand"><span class="sign-brand-mark">F</span> FIXORA</div>
    <h1>${title}</h1>
    <p class="sign-subtitle">Comprobante de ingreso ${escapeHtml(requestInfo.ingreso_code)}</p>
    <p class="sign-instruction">Firme dentro del recuadro utilizando su dedo.</p>
    <div class="sign-canvas-shell" id="canvas-shell">
      <canvas id="signature-canvas" tabindex="0" aria-label="Área para trazar la firma"></canvas>
      <p class="sign-canvas-hint">Trace aquí su firma</p>
    </div>
    <div class="sign-tools"><button class="sign-btn sign-btn--secondary" id="clear-signature" type="button">Limpiar</button></div>
    <label class="sign-check"><input type="checkbox" id="signature-consent"><span>${escapeHtml(requestInfo.consent_text)}</span></label>
    <button class="sign-btn sign-btn--primary" id="submit-signature" type="button" disabled>Enviar firma</button>
    <p class="sign-message" id="sign-message" role="alert"></p>`;

  const canvas = document.getElementById('signature-canvas');
  const shell = document.getElementById('canvas-shell');
  const clearButton = document.getElementById('clear-signature');
  const submitButton = document.getElementById('submit-signature');
  const consent = document.getElementById('signature-consent');
  const message = document.getElementById('sign-message');
  let context = canvas.getContext('2d');

  const redraw = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = '#111827';
    context.lineWidth = Math.max(2.2, Math.min(rect.width, rect.height) * .009);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    strokes.forEach((stroke) => drawStroke(stroke, rect.width, rect.height));
  };

  const drawStroke = (stroke, width, height) => {
    if (!stroke.length) return;
    context.beginPath();
    const first = stroke[0];
    context.moveTo(first.x * width, first.y * height);
    if (stroke.length === 1) context.lineTo(first.x * width + .01, first.y * height + .01);
    for (let index = 1; index < stroke.length - 1; index += 1) {
      const point = stroke[index];
      const next = stroke[index + 1];
      context.quadraticCurveTo(point.x * width, point.y * height, (point.x + next.x) * width / 2, (point.y + next.y) * height / 2);
    }
    const last = stroke[stroke.length - 1];
    context.lineTo(last.x * width, last.y * height);
    context.stroke();
  };

  const pointFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  };

  const signatureMetrics = () => SignatureCore.metrics(strokes);

  const updateSubmit = () => {
    const metrics = signatureMetrics();
    const meaningful = SignatureCore.isMeaningful(strokes);
    submitButton.disabled = submitting || !consent.checked || !meaningful;
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (submitting || event.button > 0) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    currentStroke = [pointFromEvent(event)];
    strokes.push(currentStroke);
    shell.classList.add('has-strokes');
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!currentStroke || !canvas.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = currentStroke[currentStroke.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < .002) return;
    currentStroke.push(point);
    redraw();
  });
  const endStroke = (event) => {
    if (!currentStroke) return;
    event.preventDefault();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    currentStroke = null;
    updateSubmit();
  };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  consent.addEventListener('change', updateSubmit);
  clearButton.addEventListener('click', () => { strokes.length = 0; currentStroke = null; shell.classList.remove('has-strokes'); message.textContent = ''; redraw(); updateSubmit(); });

  let resizeFrame = null;
  new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(redraw); }).observe(shell);
  redraw();

  const croppedPng = async () => {
    redraw();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      if (pixels.data[(y * canvas.width + x) * 4 + 3] > 10) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
    if (maxX < 0) throw new Error('No se realizaron trazos.');
    const padding = Math.max(16, Math.round(Math.max(maxX - minX, maxY - minY) * .08));
    minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding); maxY = Math.min(canvas.height - 1, maxY + padding);
    const output = document.createElement('canvas');
    output.width = maxX - minX + 1; output.height = maxY - minY + 1;
    output.getContext('2d').drawImage(canvas, minX, minY, output.width, output.height, 0, 0, output.width, output.height);
    return output.toDataURL('image/png');
  };

  submitButton.addEventListener('click', async () => {
    if (submitting) return;
    const metrics = signatureMetrics();
    if (!SignatureCore.isMeaningful(strokes)) { message.textContent = 'El trazo es demasiado pequeño. Limpia el recuadro y firma nuevamente.'; return; }
    if (!consent.checked) { message.textContent = 'Debes aceptar la declaración antes de enviar.'; return; }
    submitting = true; updateSubmit(); clearButton.disabled = true; consent.disabled = true;
    submitButton.textContent = 'Enviando firma…'; message.className = 'sign-message sign-message--info'; message.textContent = 'Guardando de forma segura…';
    try {
      const result = await call({ action: 'submit', token, image: await croppedPng(), consent: true });
      root.innerHTML = `<div class="sign-brand"><span class="sign-brand-mark">F</span> FIXORA</div>
        <div class="sign-state sign-state--success"><div class="sign-state-icon">✓</div><h1>Firma enviada correctamente</h1><p>La firma fue asociada al comprobante de ingreso ${escapeHtml(result.ingreso_code)}. Ya puede cerrar esta página.</p></div>`;
    } catch (error) {
      submitting = false; clearButton.disabled = false; consent.disabled = false; submitButton.textContent = 'Enviar firma';
      message.className = 'sign-message'; message.textContent = error.message; updateSubmit();
    }
  });
})();
