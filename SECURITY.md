# Seguridad de FIXORA

## Modelo de seguridad

- El navegador usa únicamente la URL del proyecto y una clave **publishable/anon** de Supabase. Esta clave identifica el proyecto, pero no sustituye RLS ni es una clave privada.
- Las tablas de negocio tienen Row Level Security y aíslan los registros mediante el usuario autenticado (`auth.uid()`).
- Las solicitudes públicas de firma no consultan tablas directamente. Pasan por `signature-public`, que valida un token aleatorio de 32 bytes, temporal, revocable y de un solo uso.
- La firma se almacena en un bucket privado. La ruta, el tipo de archivo y el destino se construyen en la Edge Function.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en Edge Functions mediante secretos administrados por Supabase. Nunca debe aparecer en HTML, JavaScript del navegador, `.env` versionados o documentación pública.

## Antes de publicar

1. Revisa que `.env`, `supabase/.temp`, `tmp` y `node_modules` no estén incluidos.
2. Ejecuta `npm audit`, `npm test` y el escaneo local indicado en `README.md`.
3. Aplica las migraciones con `npx supabase db push` y despliega las funciones con la CLI.
4. Configura una URL HTTPS pública exacta en `CONFIG.app.publicUrl` o deja el valor vacío para inferir correctamente la carpeta del sitio.
5. Configura la URL pública en Supabase Authentication > URL Configuration si se usan confirmaciones, recuperación u OAuth.
6. Mantén privado el repositorio si contiene información operativa que no deseas exponer. Las credenciales de acceso de usuarios nunca deben quedar en archivos.

## Claves y rotación

Si se expone una clave privada o token CLI:

1. Revócalo inmediatamente en Supabase.
2. Genera una credencial nueva.
3. Revisa el historial del repositorio; eliminar el archivo actual no borra versiones anteriores.
4. Verifica los registros de actividad y despliega nuevamente las funciones si corresponde.

## Reporte de vulnerabilidades

No publiques tokens, contraseñas, documentos de clientes ni capturas con datos personales en incidencias públicas. Comunica el problema de forma privada al responsable de la instalación.

