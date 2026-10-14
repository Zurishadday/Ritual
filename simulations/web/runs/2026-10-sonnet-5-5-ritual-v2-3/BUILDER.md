# What the builder said

`claude-sonnet-5-5` · success · 15 turns · $0.6028137000000001 · 39166 output tokens · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 0 guard block(s), sent back once to check before finishing

No pude ejecutar ninguna de estas comprobaciones. Bash y PowerShell fueron denegados en este modo («don't ask»), así que no pude arrancar el sitio ni correr `web-check.mjs`, y no voy a rodear esa restricción. No hay salida de pruebas ni capturas de pantalla, y no puedo dar nada por verificado.

Para correrlas tú, desde la carpeta del proyecto:
1. `node servidor.mjs`
2. `node "~\Documents\Ritual\scripts\web-check.mjs" http://localhost:3000`

Si me das permiso para usar la terminal, lo hago yo y corrijo cada ✕.

Resultado por comprobación (lo que puse en el código, no lo que vi funcionar):

- **32 · Que se vea lo que cambió:** no ejecutado. El formulario tiene una zona de estado `role="status"` que se pinta y recibe el foco tras enviar. No lo he visto en pantalla.
- **41 · Formato que ve el lector:** no ejecutado. Sin capturas de celular ni de escritorio, no he visto cómo se ven realmente la portada, las tarjetas y los acentos.
- **45 · Camino de error:** no ejecutado. Por código, cada campo muestra su error y conserva lo escrito; sin JavaScript el servidor devuelve el formulario con los errores.
- **46 · Costo por solicitud:** no ejecutado. Por código, `/admin` lee el archivo completo en cada visita, aunque solo pagina 50 mensajes. Con miles de mensajes será más lento y no lo medí.
- **49 · Regla general contra la específica:** no ejecutado. Revisé los estilos a ojo (`img{height:auto}` frente a `.portada img{height:100%}`), pero sin ver la página no lo doy por bueno.
- **WEB-2 · Bots:** no ejecutado. Por código hay campo trampa, límite por IP (8 cada 10 min) y límite global (100 por hora), y en la administración hay borrado en bloque y etiqueta «contiene enlace». No probé enviar mensajes en cantidad.
- **WEB-3 · Sin JavaScript:** no ejecutado. El envío tradicional está implementado (redirección a `gracias.html` o formulario devuelto con errores), pero no lo probé.
- **WEB-4 · Foco tras enviar:** no ejecutado. Por código no deshabilito el botón y el foco va al mensaje de estado o al primer campo con error. No lo comprobé con teclado.
- **WEB-5 · Intentos de contraseña:** no ejecutado. Por código se permiten 5 fallos por minuto por IP y después responde 429. No lo probé.
- **WEB-1 · Almacén dañado:** no ejecutado. Por código cada mensaje es una línea, las líneas dañadas se ignoran y se conservan, y escribir antepone un salto de línea. No simulé un archivo dañado.
