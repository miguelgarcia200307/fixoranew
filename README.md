# FIXORA

Aplicación web estática para gestión de clientes, facturación, cotizaciones, ingresos de equipos y firma electrónica remota. El frontend usa HTML, CSS y JavaScript puro; persistencia, autenticación, Storage y funciones seguras se ejecutan en Supabase.

## Funcionalidades

- Dashboard, clientes, facturas, cotizaciones e historial.
- Ingreso de equipos con accesorios, fotografías y comprobante PDF.
- Firma electrónica remota mediante QR para cliente y receptor.
- Tokens temporales, revocables y de un solo uso.
- Firmas en bucket privado y trazabilidad del evento.
- Diseño responsive, modo claro/oscuro y soporte PWA parcial.

## Estructura

```text
assets/                    Iconos PWA
css/                       Estilos y diseño responsive
database/schema.sql        Esquema base histórico para una instalación nueva
img/                       Logos de la aplicación
js/                        Lógica del frontend
supabase/functions/        Edge Functions administrativas y públicas
supabase/migrations/       Migraciones versionadas
tests/                     Pruebas unitarias
vendor/                    Bundles necesarios en hosting estático
*.html                     Páginas de la aplicación
DEPLOYMENT.md              Guía de publicación
SECURITY.md                Modelo y lista de seguridad
```

`node_modules`, `tmp` y `supabase/.temp` son locales y están excluidos por `.gitignore`. El sitio publicado no depende de `node_modules`; los bundles necesarios están en `vendor`.

## Requisitos para desarrollo

- Node.js 20 o superior.
- Una cuenta y proyecto de Supabase.
- Supabase CLI mediante `npx supabase`.

## Instalación local

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:5500`. No abras los HTML directamente con `file://`, porque varias APIs del navegador requieren un origen HTTP.

## Configuración

La configuración pública está en `js/app-config.js`:

```js
supabase: {
  url: 'https://PROYECTO.supabase.co',
  anonKey: 'sb_publishable_...'
},
app: {
  publicUrl: '',
  timeZone: 'America/Bogota'
}
```

La clave `sb_publishable_...` puede estar en el navegador: la seguridad depende de Auth, RLS y las Edge Functions. Nunca coloques allí `service_role`, `sb_secret_...`, contraseñas ni tokens de la CLI.

`publicUrl` vacío infiere el directorio actual y funciona bajo una subcarpeta de GitHub Pages. Para producción se recomienda indicar la URL HTTPS exacta, sin `/` final.

## Base de datos y funciones

Para el proyecto Supabase ya existente:

```powershell
npx supabase login
npx supabase link --project-ref ID_DEL_PROYECTO
npx supabase db push
npx supabase functions deploy signature-admin --no-verify-jwt
npx supabase functions deploy signature-public --no-verify-jwt
```

Para una instalación completamente nueva, crea primero el esquema base de `database/schema.sql` y después aplica las migraciones. No expongas la Service Role Key; Supabase la inyecta automáticamente en sus funciones alojadas.

## Comprobaciones antes de copiar o publicar

```powershell
npm ci
npm test
npm audit
npx deno check supabase/functions/signature-admin/index.ts supabase/functions/signature-public/index.ts
npx supabase db push --dry-run
```

Comprueba además que el contenido publicable no incluya secretos:

```powershell
rg -n -i --hidden -g '!node_modules/**' -g '!vendor/**' -g '!tmp/**' -g '!supabase/.temp/**' "sb_secret_|sbp_|service_role_key|supabase_access_token|begin private key"
```

La mención de `SUPABASE_SERVICE_ROLE_KEY` dentro del código de las Edge Functions es esperada; es una lectura del entorno seguro, no el valor de la clave.

## Publicación

Consulta `DEPLOYMENT.md`. El hosting debe servir archivos estáticos por HTTPS. Después de publicar, configura la Site URL y Redirect URLs de Supabase si se usan confirmaciones por correo, recuperación de contraseña u OAuth.

## Seguridad

Consulta `SECURITY.md`. Las reglas principales son:

- Mantener RLS activo.
- No habilitar escritura pública directa en tablas o Storage de firmas.
- No publicar `.env`, `supabase/.temp`, perfiles del navegador, exportaciones ni datos de clientes.
- Rotar inmediatamente cualquier credencial privada expuesta.

## Licencias de terceros

Los bundles de `vendor` conservan sus avisos de licencia MIT. Consulta `vendor/README.md`.
