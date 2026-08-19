import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('remote photo capture security and integration', () => {
  it('ships all public/admin endpoints without exposing the service role in browser files', () => {
    const endpoints = [
      'create-photo-capture-session', 'get-photo-capture-session', 'request-photo-upload',
      'confirm-photo-upload', 'complete-photo-capture-session', 'delete-session-photo',
      'revoke-photo-capture-session'
    ];
    endpoints.forEach((name) => expect(fs.existsSync(path.join(root, 'supabase/functions', name, 'index.ts'))).toBe(true));
    expect(read('js/photo-capture-public.js')).not.toMatch(/service[_-]?role/i);
    expect(read('js/photo-capture-admin.js')).not.toMatch(/service[_-]?role/i);
  });

  it('uses a private existing bucket, hashed tokens and a draft attachment RPC', () => {
    const migration = read('supabase/migrations/20260819000100_remote_photo_capture.sql');
    const edge = read('supabase/functions/_shared/photo-capture.ts');
    expect(migration).toContain('attach_draft_photos_to_ingreso');
    expect(migration).toContain('photo_capture_sessions');
    expect(edge).toContain('token_hash:await sha256(token)');
    expect(edge).toContain('income-entry-photos');
    expect(edge).not.toMatch(/storage\.buckets.*public\s*=\s*true/i);
  });

  it('keeps the GitHub Pages public URL centralized and does not cache capability tokens', () => {
    expect(read('js/app-config.js')).toContain("publicUrl: 'https://miguelgarcia200307.github.io/fixoranew'");
    expect(read('js/photo-capture-admin.js')).toContain('/fotos.html?token=');
    expect(read('service-worker.js')).toContain("searchParams.has('token')");
  });
});
