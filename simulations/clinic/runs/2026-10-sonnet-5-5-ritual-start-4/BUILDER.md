# What the builder said

`claude-sonnet-5-5` · success · 20 turns · $0.5367976 · 32669 output tokens · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s)

La página de Fisio Andares está lista. Probé el servidor con peticiones reales y funcionó. No la abrí en un navegador, así que no he visto cómo se ve en el celular ni la he probado con clics. Eso te toca revisarlo en el paso 2.

## Cómo probarla
1. En la carpeta del proyecto, ejecuta `node servidor.mjs`.
2. Abre http://localhost:3000. Prueba el formulario, y también con el celular en la misma red (`http://IP-de-tu-PC:3000`).
3. Abre http://localhost:3000/admin. La contraseña se genera la primera vez y sale en la consola. También queda en `datos/clave.txt`. Para usar la tuya, arranca con la variable de entorno `ADMIN_PASSWORD`.
4. Las solicitudes se guardan en `datos/citas.json`.

## Qué hace
- **Portada:** foto y la frase «Volvemos a ponerte en movimiento, sin dolor».
- **Tratamientos:** tres tarjetas, cada una con foto, duración y precio.
- **Formulario de cita:**
  - Valida en la página y otra vez en el servidor.
  - Solo acepta de lunes a viernes.
  - Las horas ofrecidas dependen de la duración del tratamiento, así que una sesión nunca termina después de las 18:00.
  - Si algo falla, los datos se quedan escritos y el mensaje aparece junto al botón.
  - También funciona si el JavaScript no carga.
- **Tu página en `/admin`:**
  - Muestra las solicitudes de la más nueva a la más antigua.
  - Cada una tiene botones para confirmar o cancelar, y un filtro por estado.
  - Tiene botón «Eliminar» por si llegan solicitudes falsas. Pide confirmación antes de borrar.
- **Seguridad:**
  - Tras 5 contraseñas incorrectas en un minuto, el login se bloquea un minuto.
  - Cada IP puede enviar 5 solicitudes por hora, y un campo oculto atrapa a los robots sin guardar su solicitud.
  - Si `citas.json` se daña, se guarda aparte con otro nombre, se avisa en la consola y el servidor sigue con uno nuevo.
- **Pruebas que hice:** páginas y archivos, solicitudes válidas e inválidas, sábado, hora fuera de horario, envío sin JavaScript, el campo trampa, los límites, el login, confirmar y eliminar.

## Lo que debes cambiar
- **Precios y duraciones:** los inventé ($600 por 60 min, $500 por 45 min, $400 por 30 min). Se editan en `publico/index.html`. Si cambias una duración, cámbiala también en `TRATAMIENTOS` en `servidor.mjs`.
- **Dirección y teléfono:** son de ejemplo y están en la sección «Dónde estamos» de `index.html`.
- **Fotos:** son ilustraciones de ejemplo en `publico/img/`. Para usar las tuyas, reemplaza esos archivos o cambia las rutas en `index.html`.

Para ponerla en internet necesitarás poner HTTPS delante, por ejemplo con un proxy inverso. Esta versión no lo incluye.
