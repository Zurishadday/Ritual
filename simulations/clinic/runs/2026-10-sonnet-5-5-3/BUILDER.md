# What the builder said

`claude-sonnet-5-5` · success · 13 turns · $0.3143408 · 20566 output tokens

La página de Fisio Andares está lista y funciona. Probé el servidor con un script (ya lo borré, y también los datos de prueba), y los 19 chequeos dieron lo esperado. Cubrí citas válidas e inválidas, el login, el orden de las solicitudes, cambiar el estado y el bloqueo tras intentos fallidos. No miré el diseño en un navegador ni en un celular real.

## Cómo probarlo

1. En la carpeta del proyecto ejecuta `node servidor.mjs`. Necesitas Node 18 o más nuevo.
2. Abre http://localhost:3000. Envía una cita de prueba desde el formulario.
3. Abre http://localhost:3000/admin. En el primer arranque el servidor genera una contraseña, la imprime en la consola y la guarda en `datos/clave-admin.txt`. Si prefieres elegirla tú, arranca con `ADMIN_PASSWORD=tuclave`.
4. En el panel verás las solicitudes con las más nuevas primero. Cada una tiene botones para **Confirmar**, **Cancelar** o **Volver a pendiente**, y hay filtros por estado.
5. Para verlo en el celular, arranca con `HOST=0.0.0.0 node servidor.mjs` y abre `http://IP-DE-TU-PC:3000`. Por defecto el servidor solo acepta conexiones de tu propia computadora.

Las solicitudes se guardan en `datos/solicitudes.json`.

## Qué hay en cada parte

- **Portada, tratamientos, formulario y contacto:** están en `publico/index.html`.
- **Formulario:** el servidor revisa todo, no solo el navegador. Solo acepta lunes a viernes, sin fechas pasadas, con horas cada 30 minutos entre 9:00 y 17:00. La última cita es a las 17:00 porque la sesión más larga dura 60 minutos y así termina a las 18:00.
- **Seguridad del panel:** la contraseña va en una cookie de sesión que dura 8 horas. Tras 5 intentos fallidos se bloquea el acceso 15 minutos. El formulario público acepta como máximo 10 envíos por hora desde la misma conexión.
- **Mensajes de usuarios:** los textos que escriben los pacientes se muestran de forma segura en el panel.

## Cosas que debes cambiar

- **Precios y duraciones:** son inventados. Quedé en $600 por 60 min (rodilla), $500 por 45 min (espalda) y $450 por 45 min (masaje). Cámbialos en `index.html`, y si cambias una duración, revisa la hora máxima de cita.
- **Dirección y teléfono:** son de ejemplo. Edita la sección «Dónde estamos» en `index.html`, y también el número en el enlace `tel:`.
- **Fotos:** son dibujos de ejemplo en `publico/img/`. Para poner las tuyas, reemplaza los archivos o cambia las rutas en `index.html`, por ejemplo a `.jpg`. El servidor ya sirve `.jpg` y `.png`.

## Antes de publicarlo en internet

Ponlo detrás de HTTPS, por ejemplo con un proxy inverso. Sin HTTPS, la contraseña viaja sin cifrar. Cuando lo hagas, añade el atributo `Secure` a la cookie en `servidor.mjs`.

Tampoco hay aviso al correo cuando llega una cita, así que tienes que entrar al panel para verlas. Si quieres, lo agrego después.
