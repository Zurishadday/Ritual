# What the builder said

`claude-sonnet-5-5` · success · 20 turns · $0.2651426 · 17150 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)

La página de Taller Rueda Libre está escrita, pero **no la he ejecutado**: en esta sesión no se me permitió usar la terminal, así que no pude correr `node servidor.mjs` ni verificarla en un navegador. Pruébala con los pasos de abajo y avísame si algo falla.

## Archivos (en la carpeta de trabajo)

```
servidor.mjs          servidor Node sin dependencias
publico/
  index.html          portada, servicios, horarios/dirección, formulario
  estilos.css         diseño adaptable a celular
  app.js              envío del formulario
  img/*.svg           imágenes de ejemplo (portada, afinación, llantas, frenos)
datos/mensajes.json   se crea solo al recibir el primer mensaje
```

## Cómo probarlo

1. Abre una terminal en la carpeta del proyecto y ejecuta:
   ```
   node servidor.mjs
   ```
   Necesitas Node 18 o superior.
2. La consola imprime la URL, el usuario y la contraseña del administrador.
3. Abre `http://localhost:3000` y revisa la portada, los tres servicios y los horarios.
4. Envía un mensaje con el formulario. Debe aparecer «¡Gracias! Recibimos tu mensaje…».
5. Abre `http://localhost:3000/admin` e ingresa el usuario y la contraseña de la consola. Verás el mensaje, y el más reciente va primero.
6. Para ver cómo queda en el celular, usa las herramientas de desarrollador del navegador (F12, modo dispositivo). También puedes abrir `http://<IP-de-tu-PC>:3000` desde el celular en la misma red Wi-Fi.

Para fijar la contraseña y el puerto en PowerShell:
```
$env:ADMIN_PASS="tu-clave"; $env:PORT=8080; node servidor.mjs
```
Si no defines `ADMIN_PASS`, se genera una nueva cada vez que arrancas el servidor.

## Qué hace

- **Formulario:** valida nombre, correo y mensaje en el navegador y de nuevo en el servidor, con límites de tamaño. Funciona también sin JavaScript. Incluye un campo trampa contra bots y un límite de 5 envíos por IP cada 10 minutos.
- **Administración:** `/admin` pide usuario y contraseña. Tras 5 intentos fallidos en un minuto bloquea al que insiste. El contenido de los mensajes se escapa, así que nadie puede inyectar HTML.
- **Guardado:** los mensajes se escriben con escritura atómica. Si `mensajes.json` se daña, el servidor lo aparta con otro nombre y sigue funcionando.

## Pendientes y límites

- **Los textos, precios, horarios y dirección son de ejemplo** (afinación $250, llantas $120, frenos $180; «Calle Ejemplo 123»). Edítalos en `publico/index.html`.
- **Las fotos son ilustraciones SVG de ejemplo.** Para fotos reales, pon tus archivos `.jpg` en `publico/img/` y cambia los `src` en `index.html`.
- **No hay botón para borrar mensajes.** Si necesitas limpiar, edita `datos/mensajes.json` a mano. Puedo añadir el borrado desde `/admin` si lo quieres.
- **HTTPS:** el acceso a `/admin` usa autenticación básica, que no cifra la contraseña. Para publicarlo en internet, ponlo detrás de HTTPS (un proxy como Caddy o nginx, o el hosting).
