# Publicación de FIXORA

## Contenido que se publica

El frontend es estático. Deben publicarse los HTML de la raíz y las carpetas `assets`, `css`, `img`, `js` y `vendor`. No publiques `node_modules`, `tmp`, `supabase/.temp`, archivos `.env` ni credenciales.

## Configuración de producción

En `js/app-config.js`:

```js
supabase: {
  url: 'https://PROYECTO.supabase.co',
  anonKey: 'sb_publishable_...'
},
app: {
  publicUrl: 'https://usuario.github.io/repositorio'
}
```

La clave publishable es apta para el navegador siempre que RLS permanezca activado. No uses una clave `service_role` o `sb_secret_...` en este archivo.

Si `publicUrl` queda vacío, FIXORA infiere el directorio actual. Esto permite probar GitHub Pages bajo una ruta como `/repositorio/`, pero en producción es preferible fijar la URL exacta.

## Supabase

```powershell
npx supabase login
npx supabase link --project-ref ID_DEL_PROYECTO
npx supabase db push
npx supabase functions deploy signature-admin --no-verify-jwt
npx supabase functions deploy signature-public --no-verify-jwt
```

`verify_jwt` queda desactivado en el gateway para permitir CORS `OPTIONS`; `signature-admin` valida el Bearer token dentro de la función con `auth.getUser()`.

En Authentication > URL Configuration configura la URL HTTPS publicada como Site URL y agrega sus rutas permitidas si utilizas correos de confirmación, recuperación u OAuth.

## GitHub Pages

Publica la raíz del proyecto. El archivo `.nojekyll` evita procesamiento innecesario y las rutas del manifiesto/QR son compatibles con subcarpetas. GitHub Pages es adecuado para pruebas o una instalación pequeña; revisa sus condiciones antes de usarlo como alojamiento de un servicio comercial.

## Verificación posterior

1. Abre login, dashboard e ingresos con HTTPS.
2. Crea una solicitud de firma y escanea el QR desde datos móviles.
3. Confirma que la URL contiene `/firma.html?token=...` bajo el directorio correcto.
4. Envía una firma y comprueba el comprobante, la impresión y el PDF.
5. Confirma que un token usado o vencido ya no funcione.

