# What the builder said

`claude-sonnet-5-5` · success · 19 turns · $0.6914925999999999 · 38420 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes)

La página y el servidor están listos, pero no los abrí en un navegador, así que no vi cómo se ven en el celular. Solo corrí una prueba automática de 26 comprobaciones contra el servidor, y todas pasaron. No probé lo que hace el JavaScript en pantalla: ajustar las horas según el tratamiento, mostrar los errores y marcar las citas desde tu panel.

## Cómo probarlo
1. En la carpeta del proyecto, ejecuta `node servidor.mjs`.
2. Abre http://localhost:3000. Ahí está la portada, los tratamientos, el formulario y la dirección.
3. Pide una cita de prueba. Intenta también un sábado, una hora que no alcance antes de las 18:00 y un correo mal escrito.
4. Abre http://localhost:3000/admin.html. La contraseña sale en la consola al arrancar. Se genera una vez y queda en `datos/clave.txt`. Si prefieres otra, arranca con `ADMIN_PASSWORD=la_tuya`.
5. En el panel verás las solicitudes con las más nuevas primero. Cada una se puede confirmar, cancelar, dejar pendiente o eliminar.
6. Para ver cómo queda en el celular, abre `http://<IP de tu PC>:3000` desde el mismo wifi, o usa el modo móvil de las herramientas de desarrollo del navegador.
7. `node prueba.mjs` repite las comprobaciones automáticas con datos temporales. No toca tus citas.

## Qué contiene
- **Servidor:** `servidor.mjs`, sin dependencias.
- **Páginas:** `publico/index.html` (el sitio) y `publico/admin.html` (tu panel).
- **Citas:** se guardan en `datos/citas.jsonl`, una por línea.
- **Imágenes:** son ilustraciones SVG de ejemplo en `publico/img/`. Para poner fotos reales, cambia las rutas `src` en `index.html`.

## Cosas que decidí yo
- **Duraciones y precios:** rodilla 60 min a $700, espalda 50 min a $600, masaje 45 min a $500. Son inventados, cámbialos en las tarjetas y en `data-min` del formulario.
- **Horas del formulario:** son cada 30 minutos. Las horas que no alcanzan antes de las 18:00 se deshabilitan según el tratamiento, y el servidor también las rechaza.
- **Datos de contacto:** la dirección y el teléfono (55 0000 0000) son falsos. Los cambias en `index.html`. El teléfono también aparece en `app.js` y en `servidor.mjs`, en los mensajes de error.
- **Sin JavaScript:** el formulario se puede enviar igual y el servidor responde con una página con el resultado.
- **Spam:** hay un campo oculto que atrapa bots, un límite de 6 solicitudes por IP cada 10 minutos, y un botón «Borrar todas las canceladas» en tu panel.
- **Contraseña:** después de 5 intentos fallidos en un minuto, el acceso se bloquea un rato.
- **Datos dañados:** si una línea de `citas.jsonl` se daña, se aparta en `datos/citas.corruptas.log` y las demás siguen funcionando.
- **Sesión:** dura 8 horas y se pierde al reiniciar el servidor.
- **Si lo publicas:** hazlo detrás de HTTPS.
