# Fixing what the review found

`claude-sonnet-5-5` · success · 22 turns · $0.24248239999999996 · 12628 output tokens

Apliqué los cinco arreglos en `servidor.mjs`, pero no pude ejecutarlos: el permiso para correr comandos (Bash/PowerShell) fue denegado, así que **ninguno está verificado ni siquiera con `node --check`**. Mientras tanto, revisé el código a mano.

**Cambios**
1. **Bots / buzón saturado:**
   - Admin con búsqueda (`?q=`), casillas con «Borrar seleccionados» y «Borrar los N encontrados…» (con confirmación).
   - Tope global de 60 mensajes por hora y descarte de mensajes idénticos repetidos, para que una inundación no llene el buzón.
2. **413 con conexión reiniciada:** el cuerpo excedido se descarta (hasta 1 MB) en vez de destruir el socket, y se responde 413 con `Connection: close`.
3. **`/%E0%A4%A` daba 500:** `decodeURIComponent` va en un `try/catch` y devuelve 404; también se rechaza `\0` en la ruta.
4. **Límites desfasados:** el bloqueo es `n >= max`, así que a los 5 fallos de login o 5 mensajes guardados el siguiente ya recibe 429.
5. **Líneas dañadas:** `total` cuenta solo mensajes válidos, y el admin tiene el botón «Quitar líneas dañadas», que las respalda en `datos/lineas-danadas.txt` antes de borrarlas.

**Para comprobarlo tú**
```
node --check servidor.mjs
node servidor.mjs
```
Pruebas rápidas con curl:
- `curl -i localhost:3000/%E0%A4%A` debe dar 404.
- Un POST de 100 KB a `/api/contacto` debe dar 413.
- Seis intentos de `/admin` con clave mala deben dar 401 cinco veces y 429 en el sexto.
- Seis envíos distintos del formulario desde la misma IP deben dar 200 cinco veces y 429 en el sexto.

Si me das permiso para ejecutar comandos, corro estas pruebas y te confirmo.
