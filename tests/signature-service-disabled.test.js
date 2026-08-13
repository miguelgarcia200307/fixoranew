const fs = require('node:fs');
const vm = require('node:vm');

describe('SignatureService when backend is not deployed', () => {
  it('does not issue a network request', async () => {
    let invocations = 0;
    const context = {
      CONFIG: { features: { remoteSignatures: false }, app: {}, supabase: {} },
      supabase: { invoke: async () => { invocations += 1; } },
      window: { location: { origin: 'https://example.github.io', href: 'https://example.github.io/fixora/ingresos.html' } },
      navigator: { onLine: true },
      document: {},
      URL,
      FileReader: function FileReader() {},
      setTimeout,
      clearTimeout
    };
    context.globalThis = context;
    vm.runInNewContext(fs.readFileSync('js/signatures.js', 'utf8'), context);

    await expect(context.window.SignatureService.list('entry-id'))
      .rejects.toThrow('aún no está desplegado');
    expect(invocations).toBe(0);
  });

  it('preserves a static-hosting subdirectory when building the QR URL', () => {
    const context = {
      CONFIG: { features: { remoteSignatures: true }, app: { publicUrl: '' }, supabase: {} },
      supabase: {},
      window: { location: { origin: 'https://example.github.io', href: 'https://example.github.io/fixora/ingresos.html' } },
      navigator: { onLine: true },
      document: {},
      URL,
      FileReader: function FileReader() {},
      setTimeout,
      clearTimeout
    };
    context.globalThis = context;
    vm.runInNewContext(fs.readFileSync('js/signatures.js', 'utf8'), context);

    expect(context.window.SignatureService.publicLink('A'.repeat(43)))
      .toBe(`https://example.github.io/fixora/firma.html?token=${'A'.repeat(43)}`);
  });
});
