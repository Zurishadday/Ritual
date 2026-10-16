# Fixing what the review found

`claude-sonnet-5-5` · success · 26 turns · $0.3060234 · 11159 output tokens · 1 denied tool call(s)

Corregí los ocho problemas. Los fallos del servidor los comprobé corriendo el servidor; los del panel (la insignia y el mensaje de error) solo los comprobé leyendo el código.

Lo que sí ejecuté: `node prueba.mjs` termina con «Todo bien», y un script aparte confirma los arreglos 4, 6 y 8. No ejecuté `revision/*.mjs`: esos scripts no están en la carpeta.

- **El panel no mostraba ninguna solicitud:** a la insignia de estado le faltaba su clase `insignia` (`admin.js`, `tarjeta`), así que `pintarEstado` fallaba y la lista salía vacía. Ya la lleva. No abrí el panel en un navegador.
- **El tope global del login ganaba al de cada IP:** quité el contador global de intentos fallidos. Ahora solo se bloquea por IP (5 fallos por minuto), y cada fallo espera 400 ms. No lo probé con IPs distintas, porque desde un solo equipo no se puede simular.
- **Bots repartidos en muchas IP:** agregué un tope global de 40 solicitudes nuevas por hora (`LIMITE_CITAS_HORA`) y un máximo de 3 pendientes por teléfono o por correo, con respuesta 429 que pide llamar. Con el panel arreglado, la dueña ve la lista completa y puede eliminar una por una, o cancelar y usar «Borrar todas las canceladas». No simulé las 150 IPs.
- **El reenvío perdía el comentario nuevo:** si el comentario es nuevo, se agrega al de la solicitud existente (separado con « | »). En la prueba quedó «tengo marcapasos» y la lista siguió con una sola solicitud.
- **Cualquiera podía bloquear a la dueña:** es el mismo cambio del punto 2.
- **El límite de solicitudes contaba los intentos rechazados:** ahora solo cuentan los envíos válidos. Tras 7 intentos con teléfono mal escrito, la solicitud correcta dio 201.
- **El error de render se escribía en el login oculto:** si el login falla, el mensaje va en el login. Si falla al pintar la lista, el panel ya está visible y el mensaje sale en su aviso de estado (`estado-global`).
- **El teléfono estaba repetido en tres archivos y no había README:** el teléfono se define una sola vez en `servidor.mjs` (`TELEFONO`, o la variable de entorno del mismo nombre). El servidor lo pone en `index.html`, y `app.js` lo lee del formulario. Con `+52 55 9999 1111` el enlace salió como `tel:+525599991111`. Creé `README.md` con cómo correr y probar el sitio, los ajustes y la protección contra abuso.

Todavía tienes que cambiar la dirección de ejemplo («Calle Ejemplo 123») en `publico/index.html`. Para probarlo a mano: `node servidor.mjs`, pide una cita en http://localhost:3000 y entra a `/admin.html` con la contraseña que imprime al arrancar.
