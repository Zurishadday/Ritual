# Fisio Andares

Arrancar: `node servidor.mjs` y abrir http://127.0.0.1:3000 (panel en /admin).
Probar: `node pruebas.mjs` (usa datos temporales).

- Contraseña del panel: variable ADMIN_PASSWORD, o la que se genera sola en datos/clave-admin.txt (también se imprime al arrancar).
- Solicitudes: datos/solicitudes.json.
- PORT y HOST se pueden cambiar con variables de entorno (HOST=0.0.0.0 para abrirlo a la red).
- Textos, precios, dirección y teléfono: publico/index.html. Fotos: publico/img/.
