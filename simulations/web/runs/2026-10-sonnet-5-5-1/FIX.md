# Fixing what the review found

`claude-sonnet-5-5` · success · 21 turns · $0.5345685 · 23549 output tokens

Hice los cambios en el código, pero no pude comprobar ninguno ejecutándolo: el permiso para ejecutar comandos (Bash y PowerShell) me fue denegado a mitad del trabajo. Si me lo habilitas, ejecuto las pruebas; mientras tanto puedes correrlas tú con `node servidor.mjs`.

## Qué cambié (un renglón por problema)

1. **`.precio{margin-top:auto}` no se aplicaba:** ahora es `.tarjeta-cuerpo .precio{margin:auto 0 0}`, con más especificidad que la regla general, así que los tres precios quedan abajo.
2. **Error de red en inglés y 429 por typos:** el script muestra «No pudimos conectar con el servidor…» y conserva lo escrito. Además, el correo se valida con la misma regla que el servidor (exige punto en el dominio), y los intentos rechazados ya no cuentan para el límite.
3. **Cada POST reescribía todo el archivo y la lista crecía sin tope:** ahora se guarda un mensaje por línea (`datos/mensajes.jsonl`) con una sola escritura al final, y las lecturas salen de memoria. El admin pagina de 50 en 50.
4. **Regla general ganaba a la específica:** es el mismo arreglo que el punto 1.
5. **Bots, mensajes expulsados y borrado uno por uno:**
   - Hay un límite global de 40 mensajes por minuto además del de 10 por IP, que ya no se elude cambiando de IP.
   - Al llegar a 20 000 mensajes el servidor avisa «buzón lleno» en vez de borrar los viejos.
   - Los mensajes idénticos seguidos se descartan.
   - El admin tiene búsqueda, casillas, «Eliminar seleccionados» y «Eliminar todos los que coinciden».
6. **Fallback sin JavaScript:** el formulario tiene `action`/`method` y el servidor acepta el envío normal y responde con una página «¡Gracias!» o con el error.
7. **Foco perdido al deshabilitar el botón:** usa `aria-disabled` y una bandera, así el foco se queda en el botón. En el admin, tras eliminar, el foco pasa al siguiente «Eliminar» o al resumen.
8. **EPERM en Windows por lectores fuera de la cola:** nadie lee el archivo en disco. Las escrituras pasan por una cola, las lecturas van a memoria, el reemplazo reintenta y en el peor caso sobrescribe directo.
9. **Límite por IP del proxy y typos contados:** solo cuentan los mensajes guardados. Con `TRUST_PROXY=1` se usa la IP real que reenvía el proxy, y el LEEME lo explica.
10. **Contraste del botón naranja:** el color pasó de #e8742c a #b84a08 (5.22:1 con texto blanco) y el hover a #9a3a00 (7.05:1). Esas dos razones sí las calculé con Node.
11. **`mensajes.json` dañado daba 500:** al arrancar se omiten las líneas malas, se guarda una copia del original y el archivo queda limpio. También se migra el formato anterior si existe.
12. **Avisos de arranque con sintaxis bash y banner con localhost:** el aviso usa sintaxis PowerShell en Windows. Con `HOST=0.0.0.0` muestra la IP de la red. La contraseña generada se guarda en `datos/clave-admin.txt`, así que es la misma en cada arranque.
13. **Sin freno a contraseñas incorrectas:** 5 fallos seguidos bloquean esa IP 15 minutos con 429 y `Retry-After`.

## Sin verificar

No pude correr el servidor ni renderizar la página, así que quedan sin comprobar:

- **Posición real de los precios:** si quedan al fondo en 1280 px.
- **Rutas del servidor:** la migración de datos, el bloqueo por contraseña y los límites de mensajes.
- **Foco y envío sin JavaScript:** el comportamiento en el navegador.

Para probarlo: `node servidor.mjs`, abre `http://127.0.0.1:3000`, envía un mensaje y revisa `/admin` (usuario `admin`, contraseña impresa en la terminal).
