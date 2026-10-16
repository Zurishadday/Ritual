# Fixing what the review found

`claude-sonnet-5-5` · success · 34 turns · $0.6696810999999999 · 33323 output tokens · 2 denied tool call(s)

Corregí los 14 problemas. Los comprobé con dos scripts de Node contra el servidor real. Lo que depende del navegador (contraste en pantalla, foco, scroll horizontal, JS desactivado) no lo pude abrir aquí, así que ahí solo hay revisión del código.

- **Contraste de la portada:** puse un velo oscuro (80 %) sobre toda la foto y quité la opacidad de la imagen. El peor caso, con fondo blanco bajo el texto, da unos 7:1 por cálculo. No medí los píxeles en pantalla.
- **Error de teléfono y 429:** la validación va antes del límite y solo las solicitudes válidas gastan cupo (10 por hora por IP). En la prueba, 12 envíos inválidos seguidos y luego uno válido dio 201. Ahora se mantiene el límite de 10 válidas por hora.
- **Formulario vacío sin `aria-invalid`:** cada campo con error lleva `aria-invalid` y `aria-describedby`, el mensaje los lista todos y el foco va al primero. El servidor también devuelve el campo con error.
- **20.000 solicitudes en el admin:** la lista llega paginada de 50 en 50 con «Ver más». Confirmar, cancelar o eliminar actualiza solo esa tarjeta, sin volver a pedir la lista. Con 20.000 registros, el listado tardó 11 ms (16 KB) y un cambio de estado 46 ms.
- **Bots y moderación:** añadí un campo trampa invisible, que responde «bien» sin guardar nada. El servidor tiene `DELETE /api/citas/:id` y el admin tiene botón «Eliminar» con confirmación, búsqueda y filtro por estado.
- **Sin JavaScript:** las horas ahora están en el HTML. El formulario envía con POST normal y el servidor responde con una redirección a `gracias.html` o con una página de error clara. Sin JS vale la validación nativa del navegador.
- **Foco tras enviar y tras Confirmar:** el botón del formulario usa `aria-disabled` en vez de `disabled`, así que conserva el foco. Tras el éxito el foco va al mensaje. En el admin, tras cada acción el foco va al nombre de la tarjeta o a la vecina.
- **`citas.json` dañado:** el servidor lo aparta como `citas.danado-<fecha>.json`, arranca vacío y avisa en consola. Lo probé con un archivo truncado.
- **Cola de escritura rota tras un fallo:** cada cambio se escribe en disco y solo entonces pasa a memoria. Si la escritura falla, el servidor responde 500 y la memoria queda igual. La siguiente operación funciona con normalidad. Simulé el fallo con `citas.json` como carpeta: tras repararlo, disco y memoria coincidían.
- **Límite que bloquea al que ya corrigió el error:** es el mismo arreglo que el segundo punto.
- **Scroll horizontal del admin en celular:** las tarjetas parten palabras largas (`overflow-wrap: anywhere`, `min-width: 0`). Lo hice solo por CSS y no lo medí en un navegador a 375 px.
- **Anillo de foco débil:** ahora es de 3 px en verde oscuro (`#14504b`, unos 9:1 sobre blanco) y blanco sobre la portada. Cubre enlaces, botones y campos.
- **413 convertido en reset:** el servidor ya no corta la conexión; descarta el cuerpo y responde 413 con `Connection: close`. Un POST de 100 KB devolvió 413.
- **Bloqueo por IP que dejaba fuera al dueño:** la contraseña correcta siempre entra. Los intentos fallidos se frenan: tras 5 por IP se rechazan con 429, y cada fallo tarda 300 ms. La contrapartida es que un atacante podría seguir adivinando mientras está bloqueado. Sigue siendo seguro con la contraseña aleatoria que genera el servidor, pero no con una contraseña débil.

**Cómo probarlo:**
1. Ejecuta `node servidor.mjs`.
2. Abre `http://localhost:3000` para el sitio y `http://localhost:3000/admin` para el panel.
3. La contraseña del panel se imprime en consola y se guarda en `datos/clave.txt`. También puedes fijarla con `ADMIN_PASSWORD`.
4. Pide una cita de lunes a viernes, entre las 9:00 y las 17:00, y compruébala en el panel.
