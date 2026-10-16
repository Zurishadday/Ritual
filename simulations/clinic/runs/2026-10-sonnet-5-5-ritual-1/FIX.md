# Fixing what the review found

`claude-sonnet-5-5` · success · 45 turns · $0.5104620999999999 · 22840 output tokens · 1 denied tool call(s)

Corregí los 12 problemas y `node prueba.mjs` pasa completo. No pude abrir Chrome aquí, así que el enlace del error, el foco y el ancho en 375 px los verifiqué por código y CSS, no en el navegador.

- **Botón «Volver y corregir» inerte (CSP, sin JS y con error):** ya no es `javascript:history.back()`, ahora es un enlace normal a `/#cita`, que la CSP no bloquea. La prueba comprueba que el HTML no contiene `javascript:`.
- **Camino de error sin JS:** el enlace funciona y los envíos inválidos ya no gastan el cupo, así que 12 inválidos seguidos de uno válido dan 201.
- **Crecimiento con 10 000 o 100 000 registros:** `GET /api/admin/citas` filtra por estado y pagina de 50 en 50 en el servidor, con totales y un botón «Ver más». Recorre un índice en orden de creación y mantiene contadores, sin ordenar todo en cada petición. El panel pinta como máximo una página. No volví a medir los tiempos con 10 000 registros.
- **Regla general contra la específica (CSP):** es el mismo caso del enlace `javascript:`, resuelto con el cambio de arriba.
- **Bots:** hay un tope global de 100 solicitudes guardadas por hora, un tope de 10 por IP que cuenta solo las guardadas y un tope amplio de 60 POST por IP. Una solicitud idéntica pendiente (mismo teléfono, tratamiento, día y hora) no se duplica. El panel tiene «Eliminar las N de esta vista» y el servidor una ruta de borrado en bloque con confirmación.
- **Fallback sin probar:** se probó la página de error del envío sin JS y su enlace de vuelta, que ahora es real.
- **Almacén dañado:** cada registro se escribe empezando en línea nueva, así que una línea cortada no arrastra al siguiente. Lo verifiqué con una línea dañada y un reinicio.
- **Nombre largo en el panel:** `.solicitud h3` lleva `overflow-wrap: anywhere`, igual que el `dd`.
- **Límite antes de validar:** ya no cuenta antes de validar; el tope estricto cuenta solo las solicitudes guardadas.
- **Foco ilegible:** el anillo pasó a `#14503f`, con contraste alto sobre blanco y crema, y a blanco sobre la barra verde y el pie.
- **Cuerpos con tipos raros:** `null`, arreglos, strings, `{toString:1}` y `['a','b']` dan 400 en vez de 500 o basura guardada. Lo mismo vale para `null` en el login.
- **README y contraseña:** agregué `README.md` con cómo correr, probar, la contraseña, los datos y los límites. La contraseña se imprime en cada arranque junto con la ruta de `datos/clave.txt`.

**Cómo probarlo:**
1. `node servidor.mjs`
2. Abre http://localhost:3000 y envía una cita de lunes a viernes.
3. Abre http://localhost:3000/admin con la contraseña que imprime la consola.
4. `node prueba.mjs` para la prueba automática.
