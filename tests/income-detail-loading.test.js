const fs = require('node:fs');
const vm = require('node:vm');

describe('Income detail loading', () => {
  it('shows one loader and opens only one modal while the detail is loading', async () => {
    let resolveEntry;
    const pendingEntry = new Promise((resolve) => { resolveEntry = resolve; });
    const loadingTokens = [];
    const hiddenTokens = [];
    const modals = [];

    const context = {
      window: {},
      document: {},
      navigator: { clipboard: { writeText: async () => {} } },
      console,
      setTimeout,
      clearTimeout,
      URLSearchParams,
      Auth: { getUserId: () => 'user-id' },
      Utils: {
        sanitize: (value) => String(value ?? ''),
        formatDateTime: (value) => String(value ?? '')
      },
      Components: {
        showLoading: (message) => {
          const token = `loading-${loadingTokens.length + 1}`;
          loadingTokens.push({ token, message });
          return token;
        },
        hideLoading: (token) => hiddenTokens.push(token),
        toast: () => {},
        modal: (options) => {
          const controller = {
            overlay: { isConnected: true },
            body: { querySelectorAll: () => [], querySelector: () => null },
            close: () => options.onClose?.()
          };
          modals.push(controller);
          return controller;
        }
      },
      SignatureService: {
        list: async () => ({ requests: [], signatures: [] }),
        isEnabled: () => false
      },
      SignatureManager: { statusClass: () => 'none', open: () => {} },
      PDFGenerator: {},
      Storage: {},
      CONFIG: { storage: { buckets: {} } }
    };
    context.globalThis = context;
    vm.runInNewContext(fs.readFileSync('js/ingresos.js', 'utf8'), context);

    const ingresos = context.window.Ingresos;
    ingresos.fetchEntryById = () => pendingEntry;

    const firstOpen = ingresos.openDetail({ id: 'entry-1' });
    const duplicateOpen = ingresos.openDetail({ id: 'entry-1' });

    expect(loadingTokens).toEqual([
      { token: 'loading-1', message: 'Cargando detalles del ingreso...' }
    ]);
    expect(ingresos.detailOpening).toBe(true);

    resolveEntry({
      id: 'entry-1',
      code: 'ING-001',
      client: {},
      photos: [],
      accessories: [],
      specs: {},
      physical_condition: []
    });
    await Promise.all([firstOpen, duplicateOpen]);

    expect(modals).toHaveLength(1);
    expect(hiddenTokens).toEqual(['loading-1']);
    expect(ingresos.detailOpening).toBe(false);

    await ingresos.openDetail({ id: 'entry-1' });
    expect(loadingTokens).toHaveLength(1);
    expect(modals).toHaveLength(1);
  });
});
