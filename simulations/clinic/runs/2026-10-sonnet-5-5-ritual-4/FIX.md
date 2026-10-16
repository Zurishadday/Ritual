# Fixing what the review found

`claude-sonnet-5-5` · success · 45 turns · $0.6145713000000002 · 27014 output tokens · 1 denied tool call(s)

Corregí los nueve problemas. `node prueba.mjs` pasa ahora 43 de 43 comprobaciones, y ya no toca tu carpeta `datos/`. El diseño en 375 px lo medí solo en una maqueta del panel con Chrome sin ventana, no en el sitio real con la contraseña puesta.

- **Desborde en celular:** `admin.css` ahora parte los nombres largos sin espacios y la rejilla ya no se ensancha. En una maqueta del panel a 375 px, con un nombre de 80 letras sin espacios, el borde derecho más lejano quedó en 359 px, dentro del ancho de la pantalla. Esa maqueta usa el CSS real, no el panel con datos reales.
- **Lista que crece con el contenido:** el servidor lee `citas.jsonl` una sola vez al arrancar y la lista sale de 50 en 50, con «Mostrar más». Con 50 000 citas, 20 consultas simultáneas tardan 27 ms y cambiar un estado 43 ms (antes 1 839 ms para las 20 consultas). Medí solo el servidor, no el tiempo de pintado en el navegador.
- **Bots:** hay un tope de 40 solicitudes por hora entre todas las IP, que se cambia con `LIMITE_GLOBAL_HORA`. El panel suma filtro por estado, búsqueda por texto y «Eliminar todas las que coinciden» (pide confirmación y exige un filtro).
- **Línea dañada con forma rara:** una cita que no tiene todos sus campos válidos, como `{"id":"weird","creada":null}`, se cuenta como dañada, se avisa en el panel y se conserva en el archivo. Cada tarjeta se pinta aparte, así que una mala ya no deja las demás sin mostrar.
- **Solicitudes perdidas por una carrera:** primero se lee el cuerpo de la petición y después se cambia y guarda sin pausas en medio. La prueba con un PATCH lento y un POST que llega mientras tanto ahora conserva ambos.
- **Texto largo del visitante:** queda cubierto por el mismo arreglo del primer punto, también para el mensaje de confirmación.
- **Fechas y horas imposibles:** se rechaza una hora de hoy que ya pasó y cualquier fecha a más de 6 meses, con el mismo control en el navegador. La fecha 9999-12-31 da 422. La prueba de la hora pasada solo corre un día de semana a partir de las 10:00, y hoy sí corrió.
- **Prueba que movía los datos reales:** `prueba.mjs` usa una carpeta temporal (`DATOS_DIR`) que borra al terminar o si la interrumpes. No renombra nada de `datos/`.
- **Abrir desde el celular:** hay un `README.md` nuevo con los pasos, por ejemplo `$env:HOST="0.0.0.0"; node servidor.mjs` en PowerShell. Con esa variable la consola imprime la dirección `http://192.168.x.x:3000` para escribir en el celular. Por defecto sigue escuchando solo en el equipo.

Una limitación: ahora no debes editar `citas.jsonl` a mano con el servidor corriendo, porque se lee al arrancar. Quedó anotado en el README.
