/* FIXORA - App Configuration */

const CONFIG = {
  supabase: {
    url: 'https://mxnczsqyhdiosoysxahj.supabase.co',
    anonKey: 'sb_publishable_LlV5K3fx5QSf90X566Xb-Q_Qxsw1a_4'
  },

  app: {
    name: 'FIXORA',
    version: '1.0.0',
    description: 'Sistema de Cotizaciones y Facturas',
    // Define la URL HTTPS pública en producción. Vacío usa window.location.origin.
    publicUrl: '',
    timeZone: 'America/Bogota'
  },

  features: {
    // Activar únicamente después de aplicar la migración y desplegar ambas Edge Functions.
    remoteSignatures: true
  },

  storage: {
    buckets: {
      logo: 'business-logo',
      signature: 'signatures',
      stamps: 'stamps',
      documents: 'generated-documents',
      avatars: 'avatars',
      incomePhotos: 'income-entry-photos'
    }
  },

  pagination: {
    defaultLimit: 12,
    maxLimit: 100
  },

  invoice: {
    prefix: 'FAC',
    startNumber: 1,
    format: 'FAC-{number}'
  },

  quote: {
    prefix: 'COT',
    startNumber: 1,
    format: 'COT-{number}'
  },

  autosave: {
    enabled: true,
    interval: 30000
  },

  toast: {
    duration: 4000,
    maxVisible: 5
  },

  theme: {
    storageKey: 'fixora-theme',
    default: 'auto'
  },

  session: {
    storageKey: 'fixora-session'
  }
};

window.CONFIG = CONFIG;
