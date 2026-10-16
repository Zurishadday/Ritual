# What the builder said

`claude-sonnet-5-5` · success · 25 turns · $0.6513833999999998 · 39074 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)

La página de Fisio Andares está lista. Corre con `node servidor.mjs`. Probé el servidor con un script (`prueba.mjs`) y pasa todo. **No abrí las páginas en un navegador**, así que no he visto cómo se ven en el celular. Eso lo tienes que revisar tú.

## Cómo probarlo

1. En la carpeta del proyecto, ejecuta `node servidor.mjs`.
2. Abre `http://localhost:3000`. Ahí están la portada, los tratamientos, el formulario y la dirección.
3. Llena el formulario y envíalo. Debería salir un mensaje verde debajo del botón.
4. Para ver tus solicitudes, abre `http://localhost:3000/admin.html`.
5. La contraseña aparece en la consola la primera vez que arrancas el servidor. También queda en `datos/contrasena-admin.txt`, y ahí puedes cambiarla. Si prefieres, define la variable `CONTRASENA_ADMIN`.
6. Para ver la página en tu celular, arranca con `HOST=0.0.0.0` y abre `http://IP-de-tu-compu:3000`.
7. Para repetir mis pruebas, ejecuta `node prueba.mjs`. Usa datos temporales y no toca tus solicitudes reales.

## Qué hace

- **Panel:** las solicitudes salen de la más nueva a la más vieja. Cada una tiene botones para confirmar, cancelar o eliminar, y hay filtros por estado. Las solicitudes se guardan en `datos/citas.jsonl`.
- **Reglas del formulario:** no deja elegir sábados ni domingos. Tampoco deja una hora en la que la sesión terminaría después de las 18:00, por ejemplo rodilla (60 min) a las 17:30. El servidor revisa lo mismo, así que no basta con saltarse el navegador.
- **Sin JavaScript:** si `cita.js` no carga, el formulario se envía igual y el servidor responde con una página de confirmación o de error.
- **Contra robots:** el formulario tiene un campo oculto que atrapa robots, y cada IP puede enviar 5 solicitudes cada 10 minutos. Si llegan muchas falsas, las eliminas desde el panel.
- **Contra adivinar la contraseña:** después de 5 contraseñas malas en un minuto desde la misma IP, el panel bloquea los intentos durante un rato, incluso si la siguiente contraseña es la correcta.
- **Archivo dañado:** si una línea de `citas.jsonl` se daña, las demás solicitudes se siguen mostrando y el panel te avisa. La siguiente cita se guarda con normalidad.

## Lo que tienes que cambiar

- **Datos inventados:** la dirección (Calle Ejemplo 123), el teléfono (55 1234 5678), los precios en pesos mexicanos y las duraciones (60, 45 y 30 min) son de ejemplo. Los precios y teléfonos están en `publico/index.html`. El teléfono también está en `servidor.mjs` y `publico/cita.js`, y las duraciones están en `servidor.mjs`, así que hay que cambiarlos en los tres archivos.
- **Fotos:** son ilustraciones SVG de ejemplo en `publico/img/`. Para poner fotos reales, reemplaza esos archivos, o cambia la extensión en el `src` del HTML si usas JPG.
- **Si lo publicas en internet:** ponlo detrás de HTTPS, por ejemplo con un proxy inverso.
