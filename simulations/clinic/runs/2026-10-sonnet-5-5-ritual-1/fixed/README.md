# Fisio Andares

Sitio del consultorio: portada, tratamientos, formulario de cita y panel privado. Sin dependencias; solo Node 18+.

## Cómo probarlo

1. En esta carpeta: `node servidor.mjs`
2. Abre http://localhost:3000 — portada, tratamientos y formulario de cita.
3. Envía una solicitud (lunes a viernes, 9:00 a 17:30).
4. Abre http://localhost:3000/admin e ingresa la contraseña.
5. Revisa las solicitudes (las más nuevas primero) y márcalas como confirmadas o canceladas.

## Contraseña del panel

- La primera vez se genera una y se guarda en `datos/clave.txt`. Se imprime en la consola **cada vez** que arranca el servidor.
- Para fijar la tuya: `ADMIN_PASSWORD=tuClave node servidor.mjs` (en PowerShell: `$env:ADMIN_PASSWORD='tuClave'; node servidor.mjs`).
- Para cambiarla: edita `datos/clave.txt` y reinicia.

## Datos

- Las solicitudes están en `datos/citas.jsonl` (un registro por línea; haz copia de este archivo).
- Puerto distinto: variable `PORT`.
- Límites contra abuso: 10 solicitudes guardadas por IP cada 10 minutos y 100 en total por hora; los intentos inválidos no cuentan contra el cupo. En el panel, el botón «Eliminar las N de esta vista» borra en bloque.

## Prueba automática

`node prueba.mjs` (usa datos temporales y el puerto 3999).

## Para ponerlo en línea

Cambia el teléfono y la dirección en `publico/index.html` y `TELEFONO` en `servidor.mjs`, y sustituye las imágenes SVG de `publico/img/` por fotos reales. Sirve el sitio detrás de HTTPS.
