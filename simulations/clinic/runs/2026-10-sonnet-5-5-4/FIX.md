# Fixing what the review found

`claude-sonnet-5-5` · success · 34 turns · $0.5589953999999999 · 27963 output tokens · 2 denied tool call(s)

Corregí los 11 problemas. La API pasa 33 comprobaciones en `prueba.mjs`. Lo que se ve en pantalla no lo pude probar en Chrome (aquí no hay navegador), así que solo comprobé que `app.js` y `admin.js` no tengan errores de sintaxis. Conviene que el revisor repita las pruebas de navegador.

- **Errores invisibles (teléfono 'abc…', hora 20:00, filtro Pendientes):** `app.js` ahora valida el teléfono, el correo, el día y la hora antes de enviar, igual que el servidor. Cualquier error o éxito mueve el foco al campo con error o al mensaje, que tiene fondo de color. En el admin, cada cambio muestra un aviso visible, por ejemplo «Ya no aparece en el filtro…».
- **Admin roto a 375px (994px de ancho):** la lista y las tarjetas ya pueden encogerse (`minmax(0,1fr)` y `min-width:0`), y los nombres largos se parten. Los botones se acomodan en móvil.
- **Camino de error:** teléfono con letras, teléfono '12' y la hora 20:00 se rechazan con mensaje visible. Un cuerpo JSON `null` da 400 en vez de 500. El doble clic ya no manda dos veces: se ignora mientras hay un envío en curso.
- **Bots:** la solicitud tiene que llegar como JSON, y si el `Origin` es de otro sitio da 403 (`text/plain` da 415). Agregué un campo trampa oculto, un límite de 5 solicitudes guardadas por IP cada 10 minutos (429 después) y una solicitud repetida ya no se duplica. El admin tiene botón «Eliminar» para liberar espacio cuando llegue al tope de 5000.
- **Sin JavaScript:** el formulario ahora envía por POST al servidor y recibe una página HTML con el resultado o los errores. La lista de horas viene completa en el HTML. Sin JavaScript se pierde lo que se escribió si hay error.
- **Foco por botón deshabilitado:** el botón de enviar y los del admin usan `aria-disabled` y no `disabled`, así que no pierden el foco. Después de cada acción el foco vuelve a la tarjeta, o al aviso si ya no se ve.
- **Archivo dañado:** la nueva `datos.mjs` aparta el archivo como `solicitudes.danado-FECHA.json`, avisa en consola y empieza con la lista vacía. Ya no lo sobrescribe en silencio. No recupera las solicitudes del archivo dañado (hay que revisarlas a mano en la copia).
- **`prueba.mjs` borraba los datos:** ahora usa una carpeta temporal (`DATOS_DIR`) y solo borra esa. No toca `./datos`.
- **Fallo de escritura que envenena la cola:** un fallo ya no bloquea las siguientes. Si la escritura falla, el cambio se deshace en memoria, así que el admin ve lo mismo que hay en disco y no se pierde nada al reiniciar.
- **'constructor' como tratamiento:** ahora se acepta solo una clave propia de la lista (`Object.hasOwn`).
- **Fechas pasadas y horas fuera de rejilla:** el servidor rechaza días anteriores a hoy, horas que ya pasaron hoy, minutos que no sean :00 o :30 y fechas a más de 180 días. Usa la hora local del servidor. La prueba cubre fecha pasada y 09:07, pero no "hoy con hora ya pasada".

Para probarlo:
- **Servidor:** `ADMIN_PASSWORD=tuclave node servidor.mjs`; si no pones contraseña, se imprime una al azar.
- **Páginas:** la página pública está en `http://localhost:3000` y la del admin en `/admin`.
- **Pruebas:** `node prueba.mjs`.
