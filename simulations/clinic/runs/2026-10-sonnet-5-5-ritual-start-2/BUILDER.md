# What the builder said

`claude-sonnet-5-5` · success · 22 turns · $0.5552075 · 33773 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes)

El sitio de Fisio Andares está listo. Probé el servidor y la lógica con un script y las pruebas pasaron. Lo que corre en el navegador (`app.js`, `admin.js` y el diseño en el celular) no lo pude abrir aquí: solo comprobé que no tienen errores de sintaxis. Eso lo tienes que revisar tú.

**Cómo correrlo**
1. En la carpeta del proyecto: `node servidor.mjs`
2. Abre `http://localhost:3000` para el sitio y `http://localhost:3000/admin.html` para tu panel.
3. La contraseña del panel sale en la consola al arrancar. Se genera sola la primera vez y queda en `datos/clave.txt`. Para usar la tuya: `$env:ADMIN_PASSWORD="tu clave"` antes de arrancar.
4. Para ver el sitio en el celular, conéctalo a la misma wifi y abre `http://IP-de-tu-PC:3000`.
5. Para repetir mis pruebas: `node herramientas/probar.mjs`.

**Cómo probarlo tú**
- Envía el formulario con datos buenos: debe aparecer una confirmación con el día y la hora.
- Pruébalo con un sábado, o dejándolo vacío: debe marcar cada campo con su error.
- En `/admin.html`, entra con la contraseña. Verás la solicitud con las más nuevas primero, y podrás pulsar Confirmar, Cancelar o Dejar pendiente. Cada cambio muestra un aviso.
- Las solicitudes se guardan en `datos/citas.jsonl`.

**Datos de ejemplo que debes cambiar**
- **Contacto:** la dirección y el teléfono (Calle Ejemplo 123, 55 1234 5678) están en `public/index.html`, en el pie, en la sección de contacto y en `app.js`. En `gracias.html` está solo el teléfono.
- **Precios y duraciones:** son inventados ($600/50 min rodilla, $550/45 min espalda, $500/60 min masaje). Están en las tarjetas y en el selector del formulario.
- **Fotos:** son ilustraciones SVG con la etiqueta «Foto de ejemplo». Reemplázalas poniendo tus fotos en `public/img/` y cambiando las rutas en `index.html`.

**Cosas que decidí y quizá quieras cambiar**
- **Horario:** las citas se piden desde mañana hasta 90 días, de lunes a viernes, en horas de 9:00 a 17:00 cada 30 minutos. Para el mismo día se pide llamar.
- **Confirmación:** el mensaje al paciente dice que es una solicitud y que lo llamarás para confirmar.
- **Sin JavaScript:** si `app.js` no carga, el formulario se envía igual y muestra su página de gracias o de error.
- **Panel:** muestra por defecto las pendientes y confirmadas. Las canceladas quedan ocultas, pero se ven con el filtro. No hay botón de borrar, así que cancelar sirve para descartar spam.
- **Contra spam:** hay un campo trampa para bots, un límite de 5 solicitudes válidas cada 10 minutos por IP y un tope de 5000 registros.
- **Contraseña del panel:** a los 5 intentos fallidos en un minuto bloquea el acceso un rato.
- **Archivo dañado:** si una línea de `citas.jsonl` se daña, se ignora y el panel te avisa; las demás siguen funcionando.

**Antes de publicarlo en internet**
- Ponle HTTPS, por ejemplo con un proxy como Caddy o nginx. La cookie del panel no lleva `Secure`, porque en `localhost` no hay HTTPS.
- Detrás de un proxy, todas las visitas parecen venir de la misma IP, así que el límite por IP las contaría juntas.
