# What the builder said

`claude-sonnet-5-5` · success · 15 turns · $0.3076847 · 20321 output tokens

La página de Fisio Andares está lista y la probé por la API del servidor: las solicitudes se guardan, la página de administración exige contraseña y las validaciones funcionan. No la abrí en un navegador, así que no vi cómo se ve en el celular.

**Cómo probarla**
1. En la carpeta del proyecto, ejecuta `node servidor.mjs`.
2. Abre `http://localhost:3000` para ver la página pública y envía una solicitud de prueba desde el formulario.
3. Abre `http://localhost:3000/admin` para ver tus solicitudes. La contraseña aparece en la consola al arrancar. Se genera sola la primera vez y queda guardada en `datos/clave.txt`. Si prefieres elegirla tú, ejecuta con la variable `ADMIN_PASSWORD`.
4. Para verla en el celular, conéctalo a la misma red wifi y abre `http://IP-DE-TU-PC:3000`.

**Qué hace**
- **Portada y tratamientos:** hay una portada con foto y frase, y tres tarjetas con foto, duración y precio.
- **Formulario de cita:** pide nombre, teléfono, correo, tratamiento, día, hora y un comentario opcional. El servidor revisa los datos y rechaza fines de semana, fechas pasadas y horas fuera de las 9:00 a 17:00.
- **Solicitudes:** se guardan en `datos/citas.json`.
- **Página de administración:**
  - Muestra las solicitudes de la más nueva a la más antigua.
  - Cada una se puede marcar como confirmada, cancelada o pendiente.
  - Tras 5 intentos fallidos de contraseña se bloquea el acceso 15 minutos desde esa conexión.
- **Contacto:** aparecen la dirección y el teléfono. Al tocar el teléfono desde un celular, marca.

**Cambia estos datos de ejemplo**
- **Dirección y teléfono:** están en `public/index.html`, en la sección de contacto.
- **Precios y duraciones:** puse $550 por 45 min (rodilla), $500 por 45 min (espalda) y $650 por 60 min (masaje), en pesos mexicanos. Los inventé, así que corrígelos en `public/index.html`.
- **Fotos:** son ilustraciones de ejemplo en `public/img/`. Para usar fotos reales, reemplaza esos archivos o cambia las rutas en el HTML.
- **Horas de cita:** la última cita que se puede pedir empieza a las 17:00, para que la sesión más larga (1 hora) termine a las 18:00.

**Antes de publicarla en internet**
- La página funciona con `http`, sin cifrar. Ponla detrás de HTTPS, por ejemplo con un proxy inverso o el servicio donde la alojes, porque si no la contraseña viajaría sin protección.
- Respalda `datos/citas.json`.
