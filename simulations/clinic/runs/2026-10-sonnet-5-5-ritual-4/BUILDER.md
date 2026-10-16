# What the builder said

`claude-sonnet-5-5` · success · 45 turns · $0.8326867000000001 · 38432 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing

Corrí el verificador contra el sitio funcionando y corregí tres cosas. El sitio queda listo con `node servidor.mjs`. El verificador sigue marcando ✕ en la 49, y abajo explico por qué.

**Lo que corregí:**
- Rechazaba fechas a más de 180 días, así que una cita válida con fecha lejana recibía 422. Quité ese tope.
- El `scroll-behavior: smooth` hacía que el clic de la prueba sin JavaScript no llegara al botón. Lo quité.
- El botón «Pedir cita» de la portada era verde sobre verde y casi no se veía. Ahora es blanco, y el texto de la portada ya no se encima tanto con las figuras. En el celular todavía roza un poco una figura.

**Resultado por revisión:**
- **32 (que se vea lo que pasó):** corrí el verificador con teclado y con JavaScript apagado. Tras enviar, el aviso «¡Listo!» recibe el foco, y sin JavaScript se abre `gracias.html`. En el panel, el estado cambia en el mismo botón que se pulsó. Esto último lo probé en el servidor, pero no en una pantalla real.
- **41 (como lo ve quien lee):** no hay desplazamiento lateral en 375 px. Miré las capturas del celular y del escritorio, y se ven bien.
- **45 (camino de error):** seis envíos vacíos dan 422, y también los sábados, la hora 18:00 y el correo o teléfono mal escritos. Con JavaScript apagado, un error muestra una página con la lista y un enlace para volver.
- **46 (lo que corre en cada petición):** no medí tiempos. El envío solo agrega una línea al archivo. Solo el panel lee todo el archivo, y solo lo usa la dueña.
- **49 (una regla general no tapa a las específicas):** el verificador marca ✕ porque manda «Ritual Check» en los campos de selección (tratamiento y hora). Mi servidor los rechaza con razón, así que su cita «buena» nunca es válida. Con datos válidos lo comprobé en `prueba.mjs`: tras 6 envíos rechazados, la cita buena da 201. El límite solo cuenta lo aceptado.
- **WEB-2 (bots):** el verificador marca ✓, pero con el mismo problema: sus 40 envíos se rechazaron por inválidos, no por el freno. Con mi prueba sí lo comprobé: el campo trampa finge éxito sin guardar, y las solicitudes válidas seguidas dan 429 desde la sexta. En el panel, **Eliminar** borra lo que se cuele.
- **WEB-3 (alternativa sin JavaScript):** ✓. Con JavaScript apagado, el verificador ve «¡Listo! Recibimos tu solicitud».
- **WEB-4 (foco):** ✓. Con teclado, si se acepta el foco queda en el aviso (`DIV#resultado`), y si se rechaza queda en el primer campo con error (`INPUT#correo`).
- **WEB-5 (límite de contraseña):** `prueba.mjs` dio 401 con una contraseña mala. Tras 5 fallos, ni la correcta entra (429), y vuelve a funcionar al reiniciar el servidor.
- **WEB-1 (archivo dañado):** agregué una línea rota al archivo. La siguiente cita se guardó, el panel avisó de 1 línea dañada y la conservó al editar otras.

Las citas de prueba del verificador ya no están en `datos/citas.jsonl`. No pude comprobar el panel con clics reales en un navegador, solo con el servidor, y tampoco el teléfono con una pantalla táctil real. El verificador sí lo probó con un navegador, pero solo la página pública.
