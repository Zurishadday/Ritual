# What the builder said

`claude-sonnet-5-5` · success · 19 turns · $0.25821760000000005 · 15772 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)

El sitio está escrito, pero **no lo he podido ejecutar**. Este entorno me bloqueó Bash y PowerShell, así que ni siquiera hice una revisión de sintaxis. Es probable que haya algún error pequeño. Si al correrlo falla algo, pégame el mensaje y lo corrijo.

## Cómo probarlo

1. Abre una terminal en la carpeta del proyecto, `<build folder>`. Necesitas Node 18 o superior.
2. Ejecuta `node servidor.mjs`.
3. Abre `http://localhost:3000`.
4. Revisa la portada y los tres servicios con sus precios. Revisa también los horarios y la dirección, y que en el celular se acomoden en una columna. Puedes simularlo con F12 y el modo móvil.
5. Envía un mensaje desde el formulario. Debe aparecer «¡Gracias!».
6. Abre `http://localhost:3000/admin`. El usuario es `admin`. La contraseña aparece en la consola al arrancar, y es distinta en cada arranque.
7. Para fijar tu propia contraseña, en PowerShell: `$env:ADMIN_PASSWORD="tu-clave"; node servidor.mjs`.

## Qué incluye

- **Portada y servicios:** la portada tiene una imagen grande y la frase «Tu bici, lista para rodar libre». Cada servicio tiene su imagen.
- **Imágenes de ejemplo:** son dibujos SVG en `public/img/`. Puedes reemplazarlas por fotos reales con el mismo nombre de archivo, o cambiar la ruta en `index.html` y en `styles.css`.
- **Contenido inventado:** los precios ($250, $120, $180), los horarios y la dirección son de ejemplo. Edítalos en `public/index.html`.
- **Mensajes:** se guardan en `datos/mensajes.jsonl`, uno por línea. Se crea solo al recibir el primero.
- **Administración:** `/admin` está protegida con usuario y contraseña. Muestra los mensajes del más nuevo al más viejo y tiene un botón para borrar cada uno.

## Protecciones que agregué sin que las pidieras

- Máximo 5 mensajes por minuto desde la misma IP.
- Un campo oculto que atrapa bots: si lo llenan, el mensaje se descarta sin avisarles.
- Después de 5 contraseñas incorrectas en `/admin`, esa IP queda bloqueada 15 minutos.
- El borrado solo funciona desde la propia página de administración.
- El formulario también funciona si JavaScript no carga.

## Pendientes

- La contraseña viaja por HTTP simple. Para publicar el sitio en internet necesitas HTTPS, por ejemplo con un proxy inverso como Caddy o Nginx.
- Los límites por IP se reinician cada vez que reinicias el servidor.
