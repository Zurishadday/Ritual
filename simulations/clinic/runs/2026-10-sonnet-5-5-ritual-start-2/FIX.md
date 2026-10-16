# Fixing what the review found

`claude-sonnet-5-5` · success · 40 turns · $0.46257670000000006 · 18312 output tokens · 1 denied tool call(s)

Arreglé los siete problemas. Pasan `herramientas/probar.mjs` y el nuevo `herramientas/verificar-arreglos.mjs`, que ejecuté. El ancho lo medí en Chrome sin pantalla con una tarjeta de ejemplo (`herramientas/medir-ancho.mjs`), pero no recorrí el panel completo con un navegador.

- **Formato que ve el lector:** corregí el desborde y la comprobación del selector (puntos 3 y 4). Medí el ancho con una tarjeta de ejemplo en Chrome sin pantalla, que no baja de 512 px de ancho: no se sale (`scrollWidth` igual a `innerWidth`). No pude probar los 375 px exactos.
- **Bots y tope de 5000:** el panel ahora tiene "Borrar" en cada solicitud y "Borrar canceladas" (ambos piden confirmación). Muestra un aviso rojo cuando hay 4000 de 5000 guardadas o más. Probé que borrar canceladas funciona y que borrar exige sesión. El tope de 5000 sigue siendo el mismo.
- **Texto largo rompe el celular:** las tarjetas del panel ahora parten las palabras largas (`overflow-wrap: anywhere` y `min-width: 0`), como en el ancho medido arriba.
- **Selector con comillas:** quité el selector CSS. Ahora el foco vuelve buscando la tarjeta y el botón por sus datos. Lo razoné por el código y no ejecuté el panel con un nombre con comillas.
- **Claves heredadas (`toString`, `__proto__`):** la lista de tratamientos se consulta con `Object.hasOwn`. Probé `toString`, `__proto__` y `constructor`: las tres dan 422 y no se guardan.
- **Página de error sin JavaScript:** ahora trae el formulario de nuevo con lo que la persona escribió, incluido un nombre con comillas, y el enlace "Volver al formulario" sigue ahí.
- **Bloqueo de login:** la contraseña correcta entra siempre, aunque haya 5 fallos seguidos. Cada contraseña mala espera 400 ms, y después del límite recibe 429 con el tiempo de espera. Con esto un tercero ya no puede dejar fuera a la dueña. El costo es que, pasado el límite, una contraseña correcta adivinada sí entraría. Por eso conviene dejar la contraseña larga que genera el servidor.

La prueba vieja de `probar.mjs` afirmaba el bloqueo de la contraseña correcta, así que la cambié por el comportamiento nuevo.
