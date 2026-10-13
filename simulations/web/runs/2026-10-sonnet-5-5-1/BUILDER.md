# What the builder said

`claude-sonnet-5-5` · success · 13 turns · $0.28334859999999995

La página y el servidor están escritos, pero **no pude ejecutarlos**: en esta sesión se denegó el acceso a la terminal, así que no está probado.

## Qué hay

En `~\AppData\Local\Temp\ritual-sim-web-4X4PYl`:

| Archivo | Para qué |
|---|---|
| `servidor.mjs` | Servidor Node sin dependencias: sirve el sitio, recibe el formulario y protege la administración |
| `publico/index.html`, `estilos.css`, `app.js` | La página (portada, servicios, horarios y dirección, formulario), adaptada a celular |
| `admin.html`, `publico/admin.js` | Página de administración con la lista de mensajes y botón para eliminar |
| `publico/img/*.svg` | Imágenes de ejemplo (portada y las tres fotos de servicios) |
| `datos/mensajes.json` | Se crea solo al llegar el primer mensaje |
| `LEEME.md` | Instrucciones |

## Cómo probarlo

1. Abre una terminal en esa carpeta y ejecuta:
   ```
   node servidor.mjs
   ```
   Necesitas Node 18 o superior.
2. En la terminal verás la dirección y una **contraseña generada** para la administración.
3. Abre http://127.0.0.1:3000, llena el formulario y envíalo. Debe aparecer «¡Gracias! Recibimos tu mensaje…».
4. Abre http://127.0.0.1:3000/admin con usuario `admin` y la contraseña de la terminal. Debes ver tu mensaje y poder eliminarlo.
5. Para ver la versión móvil, abre las herramientas del navegador (F12) y activa el modo dispositivo, o entra desde tu celular a la IP de tu PC. Para eso arranca con `HOST=0.0.0.0`.

Para fijar tu propia contraseña en PowerShell:
```
$env:ADMIN_PASSWORD = "tu-clave-larga"; node servidor.mjs
```

## Cosas que decidí y debes revisar

- **Datos de ejemplo:** los precios ($250, $120, $180 MXN), horarios, dirección y teléfono son inventados. Edítalos en `publico/index.html`.
- **Imágenes:** son ilustraciones SVG. Para usar tus fotos, cámbialas en `publico/img/` o ajusta las rutas en `index.html`.
- **Seguridad:** el formulario tiene límite de 5 mensajes por minuto por IP, un campo trampa contra bots y validación en el servidor. La administración usa contraseña y todo el texto de los mensajes se muestra como texto, no como HTML.
- **HTTPS:** el servidor habla HTTP simple. Si lo publicas en internet, ponlo detrás de HTTPS, o la contraseña viajará sin cifrar.
- **Escuchar solo en local:** por defecto atiende únicamente en tu equipo (`127.0.0.1`). Para publicarlo hay que cambiar `HOST`.

Si me das permiso para usar la terminal, lo arranco y verifico el flujo completo (formulario, guardado y administración) antes de que lo pruebes.
