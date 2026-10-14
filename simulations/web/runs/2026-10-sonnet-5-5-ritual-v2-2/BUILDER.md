# What the builder said

`claude-sonnet-5-5` · success · 24 turns · $0.5295415 · 33081 output tokens · Ritual: package lessons at the start, questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s), sent back once to check before finishing

No pude ejecutar ninguna de las comprobaciones. Este entorno está en modo «don't ask» y rechazó PowerShell y Bash cuando intenté levantar el servidor. El comando que pide el cierre (`web-check.mjs`) también necesita levantarlo, así que no lo intento de nuevo ni busco un rodeo. Si quieres que lo corra, necesito que me permitas ejecutar Node (o lo corres tú con `node servidor.mjs` y luego `node "~\Documents\Ritual\scripts\web-check.mjs" http://localhost:3000`).

Lo único que corrí fue `node --check servidor.mjs`, que dio OK. El resto de lo que sigue es lectura del código, no ejecución:

- **32 · Que se vea lo que cambió:** no comprobado. Al enviar, el estado aparece justo debajo del botón en una zona `role="status"`, pero no lo vi renderizado.
- **41 · Verificar en el formato que ve el lector:** no comprobado. No generé capturas de celular ni de escritorio, así que el aspecto de la página no está verificado.
- **45 · Camino de error:** no comprobado. El código valida nombre, correo y mensaje y conserva lo escrito, pero no lo ejecuté con campos vacíos, un correo mal escrito ni con doble clic.
- **46 · Lo que corre en cada petición:** no medido. La administración lee todo el archivo en cada visita y pagina de 50 en 50; con miles de mensajes habría que medirlo.
- **49 · Regla general contra reglas específicas:** no comprobado. Revisé a mano el CSS de errores (`.con-error` frente a `.campo input`), pero no lo vi en pantalla.
- **WEB-2 · Bots:** no comprobado. Existen el campo trampa, el límite de 5 mensajes por IP cada 10 minutos, la búsqueda y el borrado de marcados, pero no inundé el formulario.
- **WEB-3 · Sin JavaScript:** no comprobado. El envío normal a `/contacto` y la página de gracias o de errores del servidor están escritos, pero no los ejecuté con JS apagado.
- **WEB-4 · Foco tras enviar:** no comprobado. El botón no se deshabilita; en éxito el foco va al mensaje de estado y en error al primer campo inválido. Falta probarlo con teclado.
- **WEB-5 · Límite de intentos de clave:** no comprobado. El bloqueo tras 5 fallos por minuto por IP está en el código, pero no lo probé.
- **WEB-1 · Archivo dañado:** no comprobado. Hay un salto de línea previo si el archivo quedó cortado, y las líneas ilegibles se cuentan y avisan sin borrarse, pero no corrompí un archivo para verlo.

Hasta que alguien lo ejecute, no doy nada de esto por terminado.
