const CACHE_NAME = 'fixora-v17';
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './factura.html',
  './cotizacion.html',
  './clientes.html',
  './historial.html',
  './ingresos.html',
  './firma.html',
  './detalle.html',
  './configuracion.html',
  './404.html',
  './manifest.json',
  './img/logo.png',
  './img/logologin.png',
  './css/variables.css',
  './css/animations.css',
  './css/components.css',
  './css/style.css',
  './css/responsive.css',
  './css/signature-public.css',
  './js/app-config.js',
  './js/config.js',
  './js/supabase.js',
  './js/utils.js',
  './js/components.js',
  './js/storage.js',
  './js/auth.js',
  './js/app.js',
  './js/dashboard.js',
  './js/invoice.js',
  './js/clients.js',
  './js/history.js',
  './js/ingresos.js',
  './js/signatures.js',
  './js/signature-core.js',
  './js/signature-public.js',
  './js/search.js',
  './js/pdf.js',
  './js/quote.js',
  './vendor/html2pdf/html2pdf.bundle.min.js',
  './vendor/qrcode/qrcode.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          if (requestUrl.pathname.endsWith('/firma.html')) {
            return caches.match(new URL('./firma.html', self.registration.scope), { ignoreSearch: true });
          }
          return caches.match(new URL('./index.html', self.registration.scope));
        }
        return new Response('Sin conexion', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
    )
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncPendingDocuments());
  }
});

async function syncPendingDocuments() {
  try {
    const db = await openDB();
    const pending = await db.getAll('pending-sync');
    for (const doc of pending) {
      try {
        await fetch(`${self.registration.scope}api/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doc)
        });
        await db.delete('pending-sync', doc.id);
      } catch (e) {
        console.log('Sync failed, will retry later');
      }
    }
  } catch (e) {
    console.log('Sync error:', e);
  }
}
