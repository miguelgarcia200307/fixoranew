import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('secure public repair tracking', () => {
  let service;
  beforeEach(() => {
    const sandbox = {
      window: {}, location: { origin: 'https://example.test' },
      CONFIG: { app: { publicUrl: 'https://example.test/fixoranew' } },
      document: {}, navigator: {}, crypto: globalThis.crypto,
      supabase: { invoke: () => {} }
    };
    vm.runInNewContext(read('js/repair-status-service.js'), sandbox);
    service = sandbox.window.TrackingService;
  });

  it('normalizes Colombian phones without duplicating the country prefix', () => {
    expect(service.normalizePhone('300 123-4567', 'Colombia')).toBe('573001234567');
    expect(service.normalizePhone('+57 (300) 123-4567', 'Colombia')).toBe('573001234567');
    expect(service.normalizePhone('123', 'Colombia')).toBe('');
    expect(service.normalizePhone('', 'Colombia')).toBe('');
  });

  it('rejects unknown template variables and safely renders known ones', () => {
    expect(service.validateTemplate('Hola {{cliente_nombre}} {{desconocida}}').unknown).toEqual(['desconocida']);
    expect(service.validateTemplate('{{motivo_ingreso}} {{enlace_seguimiento}}')).toMatchObject({ valid: true, hasLink: true });
    expect(service.renderTemplate('{{codigo_ingreso}}: {{estado_actual}}', { codigo_ingreso: 'ING-1', estado_actual: 'Recibido' })).toBe('ING-1: Recibido');
    expect(service.defaults.intake).toContain('Hemos recibido y registrado tu equipo');
    expect(service.defaults.intake).toContain('{{fecha_ingreso}}');
  });

  it('renders the requested modal actions once and removes only the three obsolete modal actions', () => {
    const source = read('js/ingresos.js');
    const start = source.indexOf('<div class="income-detail-header card">');
    const end = source.indexOf('<div class="income-signature-summary"', start);
    const header = source.slice(start, end);
    const expected = ['edit', 'delete', 'tracking', 'signature', 'whatsapp', 'pdf'];

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expected.forEach((action) => expect(header.match(new RegExp(`id="income-detail-${action}"`, 'g'))).toHaveLength(1));
    ['progress', 'new', 'mobile-photos'].forEach((action) => expect(header).not.toContain(`id="income-detail-${action}"`));
    expect(header).toContain('Enviar por WhatsApp');
    expect(header).toContain('aria-label="Enviar información del ingreso por WhatsApp"');
    expect(source).toContain("this.sendDetailWhatsApp(fresh, event.currentTarget)");
  });

  it('keeps removed modal capabilities available in their proper workflows', () => {
    const incomes = read('js/ingresos.js'), technician = read('js/technician-portal.js');
    expect(incomes).toContain("getElementById('btn-new-income')");
    expect(incomes).toContain('id="income-remote-photo-btn"');
    expect(technician).toContain('Registrar avance');
  });

  it('keeps the modal action bar usable across desktop, tablet and mobile widths', () => {
    const css = read('css/style.css');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('@media (max-width: 390px)');
    expect(css).toContain('min-height: 44px');
  });

  it('offers editable intake template preview and default restoration', () => {
    const config = read('js/config.js');
    expect(config).toContain('id="cfg-restore-intake-template"');
    expect(config).toContain('id="cfg-tracking-intake-preview"');
    expect(config).toContain('intake.value = TrackingService.defaults.intake');
  });

  it('ships all required token-scoped Edge Functions and a private bucket migration', () => {
    ['create-tracking-link','get-public-tracking','regenerate-tracking-link','revoke-tracking-link','publish-repair-update'].forEach((name) => {
      expect(fs.existsSync(path.join(root, 'supabase/functions', name, 'index.ts'))).toBe(true);
    });
    const migration = read('supabase/migrations/20260819000300_public_repair_tracking.sql');
    expect(migration).toContain("VALUES ('repair-progress','repair-progress',false");
    expect(migration).toContain('repair_tracking_one_active_idx');
    expect(migration).toContain('token_hash text NOT NULL UNIQUE');
    expect(migration).not.toMatch(/CREATE POLICY[^;]+using\s*\(\s*true\s*\)/i);
  });

  it('keeps public tracking token out of localStorage, caches and referrers', () => {
    const page = read('seguimiento.html'), publicJs = read('js/tracking-public.js'), worker = read('service-worker.js');
    expect(page).toContain('noindex, nofollow, noarchive');
    expect(page).toContain('name="referrer" content="no-referrer"');
    expect(publicJs).not.toContain('localStorage');
    expect(publicJs).not.toMatch(/service[_-]?role/i);
    expect(worker).toContain("endsWith('/seguimiento.html')");
  });

  it('separates public descriptions from internal notes and restricts technician delivery', () => {
    const migration = read('supabase/migrations/20260819000300_public_repair_tracking.sql');
    expect(migration).toContain('public_description text NOT NULL');
    expect(migration).toContain('internal_note text NOT NULL');
    expect(migration).toContain("p_status_code IN ('received','assigned','ready_for_delivery','delivered','cancelled')");
    expect(read('js/technician-portal.js')).toContain('Guardar y notificar por WhatsApp');
  });
});
