# What the builder said

`claude-sonnet-5-5` · success · 14 turns · $0.38315049999999995 · 24374 output tokens · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s), sent back once to check before finishing

No pude ejecutar nada de lo que pide esta verificación. Bash y PowerShell están denegados en este modo («don't ask»), así que ni arranqué el sitio ni corrí `web-check.mjs`. No hay capturas ni resultados que revisar, y no doy el trabajo por verificado.

Cada línea indica qué haría para comprobarlo y qué sé hasta ahora. Todo lo que sé viene de leer el código.

- **32 · Que se vea lo que pasó:** no ejecutado. El código muestra un mensaje verde o rojo junto al botón y le da foco, pero no lo vi en pantalla.
- **41 · Formato que ve el lector:** no ejecutado. No vi la página en el celular ni en escritorio ni el contraste sobre la portada; faltan las capturas.
- **45 · Camino de error:** no ejecutado. Por lectura, el formulario conserva lo escrito y marca el campo con error. Corregí que los errores de captura contaran para el límite de envíos, pero ese cambio tampoco está probado.
- **46 · Lo que corre en cada petición:** no medido. El administrador lee el archivo completo en cada visita a `/admin`, con tope de 5000 mensajes y 50 por página; no cronometré cuánto tarda con el buzón lleno.
- **49 · Regla general contra reglas específicas:** no ejecutado. Revisé la hoja de estilos por lectura y no encontré choques, pero no lo comprobé en el navegador.
- **WEB-2 · Bots:** no ejecutado. Hay un campo trampa, un límite de 5 envíos por IP cada 10 minutos, tope de 5000 mensajes y borrado individual o total en `/admin`; no probé inundando el formulario.
- **WEB-3 · Respaldo sin JavaScript:** no ejecutado. Existe `POST /contacto` con página de «Gracias» y de error con el formulario prellenado, sin probar con JavaScript desactivado.
- **WEB-4 · Foco tras enviar:** no ejecutado. El botón no se deshabilita (un indicador evita el doble envío) y el foco va al estado o al primer campo con error; no lo probé con teclado.
- **WEB-5 · Intentos de clave:** no ejecutado. El código bloquea tras 5 fallos por minuto por IP, pero no lancé intentos para ver el bloqueo.
- **WEB-1 · Archivo dañado:** no ejecutado. Cada escritura empieza con salto de línea y la lectura omite líneas dañadas con aviso; no corrompí el archivo para confirmarlo.

Si me permites ejecutar comandos, arranco `node servidor.mjs`, corro `web-check.mjs`, reviso las capturas y corrijo lo que marque con ✕.
