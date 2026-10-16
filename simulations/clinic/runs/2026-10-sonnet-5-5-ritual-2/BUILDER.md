# What the builder said

`claude-sonnet-5-5` · success · 53 turns · $0.9880309000000002 · 44703 output tokens · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s), sent back once to check before finishing

Corregí dos fallos que salieron al revisar la página como la va a usar una persona, y queda una advertencia del verificador que explico abajo. Todos los servidores de prueba están cerrados y `datos/solicitudes.json` quedó vacío (`[]`).

## Qué cambié
- **Límite de envíos:** el límite de 5 envíos contaba también los rechazados, así que seis intentos con errores bloqueaban a la persona que después enviaba bien. Ahora hay dos límites. Los aceptados tienen tope de 5 cada 10 minutos, y los rechazados (errores o bots) tienen otro de 30, que no gasta el primero.
- **Scroll suave:** quité `scroll-behavior: smooth` del CSS. El scroll animado hacía que el verificador hiciera clic en un lugar equivocado, y tampoco respeta a quien prefiere menos movimiento. Puse un margen para que el menú fijo no tape los títulos al usar los enlaces internos.

## Una advertencia del verificador que no corrijo
Sigue marcando ✕ en el punto 49 y no lo cambié: su envío «bueno» por HTTP simple manda el texto «Ritual Check» en los campos de lista (tratamiento y hora), y mi servidor los rechaza con razón. Lo comprobé con mi propia prueba, que sí manda opciones válidas.

## Resultado por punto
- **32 · Cambios visibles:** con el verificador, la captura sin JavaScript muestra «¡Solicitud recibida!» y el teclado deja el foco en el aviso. Antes no mostraba nada nuevo por el scroll suave, que ya quité.
- **41 · Lo que ve quien lee:** el verificador no encontró scroll lateral en un móvil de 375 px. Revisé las capturas de escritorio y de móvil (portada, tarjetas y formulario se ven bien); no usé un navegador real.
- **45 · Camino de error:** las pruebas confirmaron los errores de fecha en sábado, estado inválido y contraseña mala. El verificador, con el correo `ritual@check`, dejó el foco en el campo del correo. El mensaje de error visible sin JavaScript no lo revisé en pantalla.
- **46 · Crecimiento:** `prueba-carga.mjs` midió 500 y 5000 solicitudes guardadas. La lista del panel tardó 15 y 31 ms (2 MB con 5000), un envío 17 y 23 ms, y 20 páginas a la vez 28 y 21 ms. No se nota la diferencia a ese tamaño. Cada envío reescribe todo el archivo JSON, así que con muchos miles conviene cambiarlo por una base de datos.
- **49 · Reglas generales contra específicas:** el scroll suave pisaba al clic y ya está corregido. En mi prueba, un envío bueno tras errores pasa (201). Tras 5 aceptados llega el freno (201, 429, 429). El ✕ restante es la advertencia de arriba.
- **WEB-2 · Bots:** 40 envíos en 496 ms toparon con freno, pero fueron rechazos 400 y 429 por las listas, no por el límite de aceptados. Mi prueba cubre ese límite: tras 5 aceptados responde 429. El campo trampa no guarda nada y los repetidos se guardan una sola vez. En el panel se filtra por estado y se elimina con el botón de cada solicitud.
- **WEB-3 · Sin JavaScript:** el envío normal redirige a «¡Solicitud recibida!» (el verificador ✓ y mi prueba).
- **WEB-4 · Foco:** al aceptar el foco queda en el aviso y al rechazar en el campo del correo (verificador ✓ en ambos casos con teclado). Tras confirmar o cancelar en el panel, el foco queda en el mismo botón; eso lo verifiqué por el código, no con teclado.
- **WEB-5 · Contraseña:** 7 contraseñas malas seguidas dieron 401 cinco veces y luego 429 (mi prueba).
- **WEB-1 · Archivo dañado:** `prueba-danado.mjs` estropeó el archivo a propósito. El servidor avisó en consola, aceptó la siguiente solicitud (201), la guardó en un archivo nuevo y conservó el roto aparte sin perder su contenido. No hay aviso en el panel: quien lo vea es quien mire la consola.

Las pruebas `prueba.mjs`, `prueba-danado.mjs` y `prueba-carga.mjs` quedaron en la carpeta. Las dos últimas reemplazan `datos/solicitudes.json`, así que ejecútalas solo con datos de prueba.
