# Fixing what the review found

`claude-sonnet-5-5` · success · 15 turns · $0.17135089999999997 · 6803 output tokens

Apliqué los siete arreglos, pero no pude ejecutar nada para comprobarlos: Bash y PowerShell fueron denegados en este modo, así que ni siquiera corrí `node --check` sobre `servidor.mjs`.

- **Admin con scroll lateral a 375px:** `publico/admin.css` — el `h2` con el nombre ahora tiene `overflow-wrap: anywhere`, así un nombre largo sin espacios se parte.
- **«Visítanos» desalineado en escritorio:** `publico/estilos.css` — la regla `.franja > *` pasó a `.seccion.franja > *`, que ya supera en especificidad a `.seccion h2`.
- **Mensaje que manda a llamar por teléfono:** `servidor.mjs` — ahora dice «…o vuelve a intentarlo más tarde.», porque el sitio no tiene teléfono.
- **Recargar guardaba el mensaje dos veces sin JS:** `servidor.mjs` — el envío correcto, y también el del campo trampa, responde 303 a `/contacto?enviado=1`. `GET /contacto?enviado=1` muestra la página de gracias.
- **429/413/503 sin JS vaciaban el formulario:** `servidor.mjs` — `falla()` vuelve a pintar lo escrito. El límite de envíos se revisa después de leer el cuerpo, y en el 413 se recupera la parte ya recibida (primeros 16 KB).
- **Scroll lateral en el admin con nombre largo:** es el mismo fallo que el primer punto y queda cubierto con el mismo arreglo.
- **Una línea sin `fecha` daba 500 en `/admin`:** `servidor.mjs` — se valida la fecha y esa línea se muestra con «sin fecha» en lugar de lanzar `RangeError`.

Para comprobarlo, corre `node servidor.mjs` y revisa estos casos:
- **Pantallas:** abre `/` a 1280px para ver «Visítanos» alineado y `/admin` a 375px para ver que no hay scroll lateral.
- **Fecha:** añade `{"id":"a3","mensaje":"sin fecha"}` a `datos/mensajes.jsonl` y comprueba que `/admin` responde 200.
- **Sin JS:** envía el formulario y recarga la página de gracias para confirmar que se guarda una sola vez.
- **413:** manda un POST de 100 KB a `/contacto` y revisa que nombre y correo se conserven.
