# Dependencias distribuidas con el frontend

Esta carpeta contiene únicamente los bundles necesarios en tiempo de ejecución para que el hosting estático no dependa de `node_modules`:

- `html2pdf/html2pdf.bundle.min.js` — html2pdf.js 0.14.0, licencia MIT, copyright Erik Koopmans.
- `qrcode/qrcode.js` — qrcode-generator 1.4.4, licencia MIT, copyright Kazuhiko Arase.

Hashes SHA-256 de los archivos revisados:

```text
html2pdf.bundle.min.js  9563C45F032179C73454293A649929E60FC24C05A326E8AB2811CFA8F25C3607
qrcode.js               18AE399F81182BC9DE916E9C77B195DF20CC58D6F2D55A62B085A299F1BF1780
```

Las versiones originales se declaran en `package.json` y pueden regenerarse con `npm install` copiando nuevamente sus bundles desde `node_modules`.
