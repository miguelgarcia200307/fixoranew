import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('responsive technician workspace', () => {
  const portal = read('tecnico.html');
  const admin = read('tecnicos.html');
  const css = read('css/technicians.css');
  const auth = read('js/auth.js');

  it('uses a mobile viewport, touch navigation and accessible controls', () => {
    expect(portal).toContain('width=device-width,initial-scale=1,viewport-fit=cover');
    expect(portal).toContain('technician-bottom-nav');
    expect(portal).toContain('aria-label="Navegación principal"');
    expect(portal).toContain("Auth.guard('technician')");
  });

  it('provides phone, tablet and coarse-pointer layouts without table dependence', () => {
    expect(css).toContain('@media(max-width:768px)');
    expect(css).toContain('@media(max-width:480px)');
    expect(css).toContain('@media(hover:none) and (pointer:coarse)');
    expect(css).toContain('.technician-mobile-list{display:grid');
    expect(css).toContain('height:100dvh');
  });

  it('keeps all admin actions available in the mobile card view', () => {
    expect(admin).toContain('technician-mobile-list');
    expect(read('js/technicians-admin.js')).toContain('data-reset=');
    expect(read('js/technicians-admin.js')).toContain('data-toggle=');
    expect(read('js/technicians-admin.js')).toContain('data-assign=');
    expect(admin).toContain("Auth.guard('admin')");
  });

  it('opens an editable technician detail with access and permissions', () => {
    const adminScript = read('js/technicians-admin.js');
    expect(adminScript).toContain('data-open-technician=');
    expect(adminScript).toContain('openDetail(id)');
    expect(adminScript).toContain('No disponible por seguridad');
    expect(adminScript).toContain("action:'update'");
    expect(adminScript).toContain('can_view_commission_status');
  });

  it('shows reception photos, accessories and protected device credentials', () => {
    const portalScript = read('js/technician-portal.js');
    expect(portal).toContain('js/storage.js');
    expect(portalScript).toContain('income_entry_photos(*)');
    expect(portalScript).toContain('PIN o clave del equipo');
    expect(portalScript).toContain('tech-toggle-pin');
    expect(portalScript).toContain('Fotos de ingreso');
    expect(portalScript).toContain('openReceptionPhoto');
  });

  it('routes roles from the shared login and blocks inactive profiles', () => {
    expect(auth).toContain("profile?.role === 'technician' ? 'tecnico.html' : 'dashboard.html'");
    expect(auth).toContain('!profile.is_active');
    expect(read('login.html')).toContain('await Auth.landingPage()');
  });
});

describe('technician database security', () => {
  const migration = read('supabase/migrations/20260814000100_technician_mobile_system.sql');
  it('enforces active technicians and server-side assignment/status transitions', () => {
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('active_technician_id');
    expect(migration).toContain('assign_repair_technician');
    expect(migration).toContain('change_repair_status');
    expect(migration).toContain("p_new_status IN ('received','delivered','cancelled')");
  });
});

describe('private Storage URLs', () => {
  it('adds the Supabase Storage prefix to relative signed URLs', async () => {
    const source = read('js/storage.js').replace('window.Storage = Storage;', 'return Storage;');
    const factory = new Function('window', 'supabase', 'CONFIG', 'Auth', source);
    const client = { createSignedUrl: async () => '/object/sign/income-entry-photos/file.jpg?token=test' };
    const storage = factory({}, client, { supabase: { url: 'https://project.supabase.co' } }, {});
    await expect(storage.getSignedUrl('income-entry-photos', 'file.jpg'))
      .resolves.toBe('https://project.supabase.co/storage/v1/object/sign/income-entry-photos/file.jpg?token=test');
  });
});
