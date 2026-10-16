# Fixing what the review found

`claude-sonnet-5-5` · success · 15 turns · $0.39927129999999994 · 14133 output tokens · 1 denied tool call(s)

Corregí los siete problemas. Lo comprobé con un servidor real; la caída de escritura la probé solo leyendo el código, sin simularla.

- **Límite antes de validar:** el servidor valida primero y cuenta solo los envíos válidos. Probé 12 envíos con teléfono vacío, que dieron 400 todos, y el siguiente envío correcto dio 201.
- **El límite general no tapa los errores de campo:** es el mismo cambio. Los errores de campo siempre se devuelven antes de aplicar el límite de 10 por hora.
- **Basura de bots:** añadí `DELETE /api/solicitudes/:id`, que probé (borra y deja 1 registro en el archivo). En `admin.js` hay un botón «Eliminar» con confirmación.
- **Formulario sin JavaScript:** el formulario ahora tiene `action="/api/citas" method="post"`, y el servidor acepta ese formato y responde con una página HTML de «enviada» o con la lista de errores. Las 22 opciones, incluidas las 18 horas, ya están en el HTML estático y `cita.js` ya no las genera. Probé un POST de formulario: devolvió 201 y la página «Solicitud enviada».
- **Archivo dañado o fallo de escritura:**
  - Con el archivo dañado, el servidor avisa al arrancar y guarda una copia aparte antes de seguir. Lo probé con un archivo truncado y salió el aviso y la copia.
  - Una escritura fallida ya no bloquea las siguientes. Si falla, se revierte el cambio en memoria y se responde 500. Esto último no lo ejecuté.
- **Hora ya pasada hoy:** si la cita es hoy, la hora debe ser posterior a la actual. A las 09:16, pedir hoy a las 09:00 da 400 con «Elige una hora que no haya pasado».
- **Entradas raras:** cuerpo `null` da 400, `Origin: null` da 403 y `GET /%E0%A4%A` da 400. Ninguno da ya 500.

Las pruebas dejaron archivos en `datos/` y los borré. Para probarlo, ejecuta `node servidor.mjs` y abre `http://127.0.0.1:3000`. El panel está en `/admin`, y la contraseña sale en la consola y queda en `datos/clave-admin.txt`.
