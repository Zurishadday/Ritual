# Taller Rueda Libre

Sitio web sin frameworks y servidor Node sin dependencias (Node 18 o superior).

## Correr

    node servidor.mjs

- Sitio: http://127.0.0.1:3000
- Administración: http://127.0.0.1:3000/admin (usuario `admin`)

La contraseña se genera al arrancar y se imprime en la terminal. Para fijar una:

    # PowerShell
    $env:ADMIN_PASSWORD = "tu-clave-larga"; node servidor.mjs

Otras variables: `PORT` (3000) y `HOST` (127.0.0.1; usa `0.0.0.0` para aceptar conexiones de otros equipos).

## Estructura

- `servidor.mjs`: servidor, API del formulario y administración.
- `publico/`: página, estilos, scripts e imágenes (`img/` son de ejemplo; reemplázalas por tus fotos manteniendo los nombres o edita `index.html`).
- `admin.html`: página de administración (solo se sirve con contraseña).
- `datos/mensajes.json`: mensajes guardados (se crea al recibir el primero).

## Para personalizar

Edita en `publico/index.html`: precios, horarios, dirección y teléfono (ahora son de ejemplo).

## Antes de publicarlo en internet

El servidor usa HTTP simple. La contraseña de administración viaja sin cifrar si no hay HTTPS, así que ponlo detrás de un proxy con HTTPS (por ejemplo Caddy o nginx) o en un hosting que lo provea.
