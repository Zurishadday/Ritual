# What the builder said

`claude-sonnet-5-5` · success · 55 turns · $1.3354319000000001 · 65292 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, writing-and-docs, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing

El chequeo de Ritual dejó un ✕ sin resolver, el del paso 49, y es una limitación del script, no del sitio. Con la corrección del scroll animado, WEB-3 ya pasa.

El script rellena mis menús `tratamiento` y `hora` con el texto «Ritual Check». Mi servidor lo rechaza con 400, y eso es lo correcto. Por la misma razón, el «freno» de WEB-2 que reporta (40 envíos rechazados con 400) tampoco cuenta como prueba del límite. Lo cubrí con pruebas propias, que se ven abajo.

Hice dos cambios. Quité `scroll-behavior: smooth` del CSS. Y `DIAS_MAX_ADELANTE` ahora es una variable de entorno opcional; por defecto sigue en 90 días y solo la subí en la prueba temporal. El chequeo envió sus 50 solicitudes de prueba a una carpeta temporal, no a tu `datos/`.

Una limitación más: solo vi capturas de la portada, los tratamientos y el inicio del formulario. El panel lo revisé por texto y foco, no por captura.

- **32 · Cambios visibles:** en Edge, al confirmar una solicitud en el panel la insignia cambió a «Confirmada», apareció «Solicitud de Lucía Prueba: confirmada.» y el foco quedó en esa tarjeta. En el formulario, el aviso apareció en pantalla tras enviar.
- **41 · Formato que ve el lector:** capturas en 1280 px y 375 px sin desplazamiento lateral (`scrollWidth` 375 en 375). La captura a 360 px se ve bien y la de la portada en escritorio también. Los textos de cliente se muestran como texto: un comentario `<img src=x>` apareció literal y no creó ninguna imagen.
- **45 · Camino de error:** con un correo que el navegador acepta y el servidor no, salió «Revisa estos datos: Escribe un correo válido», el foco pasó al aviso y los campos se conservaron. Con 6 formularios vacíos, el servidor respondió 400 a los 6.
- **46 · Costo por solicitud:** no lo medí con carga, solo lo razoné. La lista vive en memoria y el panel solo la invierte, sin reordenar; hay un tope de 5000 solicitudes y un límite de 20 KB por mensaje (413 al pasarlo). Los archivos estáticos se leen del disco en cada petición.
- **49 · Regla general frente a la específica:**
  - El ✕ del script no es del sitio, por lo de los menús.
  - Aun así, con `pruebas.mjs` el servidor rechazó 9 envíos inválidos seguidos y aceptó el válido que vino después, porque el límite solo cuenta lo que pasa la validación.
  - Además encontré que `scroll-behavior: smooth` impedía el clic automático al botón, y lo quité.
- **WEB-2 · Bots:** en `pruebas.mjs`, el campo trampa devolvió «ok» sin guardar nada y el 6.º envío válido desde la misma conexión recibió 429. El panel permite filtrar y eliminar spam.
- **WEB-3 · Sin JavaScript:** con JavaScript apagado, el clic real en «Solicitar cita» llevó a «¡Recibimos tu solicitud!». Un envío sin JavaScript con errores muestra una página con la lista de errores.
- **WEB-4 · Foco:** en Edge, con datos válidos y con un error del servidor, el foco terminó en el aviso (`#estado-form`) en ambos casos. El botón no se desactiva con `disabled`, así que no pierde el foco. El script de Ritual no pudo comprobarlo porque su fecha 2030 cae fuera de mi tope de 90 días y el navegador rechaza el envío antes. Lo cubrí con mi recorrido.
- **WEB-5 · Intentos de contraseña:** 4 respuestas 401 y la 5.ª ya fue 429, y con la clave buena seguía bloqueado con `Retry-After`. En Edge, la clave mala mostró «Contraseña incorrecta.» y devolvió el foco al campo. El límite es por conexión: no hay un límite global, así que una contraseña débil seguiría siendo el punto flojo.
- **WEB-1 · Almacén dañado:** con `solicitudes.json` roto, el servidor lo apartó como `solicitudes.danado-…json`, guardó la siguiente solicitud y el panel recibió el aviso. Si falla una escritura, se responde 500 y no se da por guardada.
