# Fixing what the review found

`claude-sonnet-5-5` · success · 23 turns · $0.44677839999999996 · 25017 output tokens

Apliqué los cambios en el código, pero no pude ejecutar nada para comprobarlos: Bash y PowerShell me fueron denegados en este modo. Ninguna corrección está verificada; solo la revisé leyendo el código.

Para verificarlas hace falta que me permitas ejecutar comandos, o que corras `node servidor.mjs` tú.

**Qué cambié por problema**
- **`#estado` fuera de pantalla en el celular:** el aviso va antes del botón, se hace `scrollIntoView` y se le da el foco al mostrar el resultado.
- **Titular de la portada sin contraste:** el bloque de texto tiene ahora un fondo oscuro sólido (rgba 0.82) en todo su alto, en vez de un degradado que se desvanecía arriba. No lo medí en pantalla.
- **429 tras errores corregidos:** solo cuentan los mensajes guardados (5 por IP cada 10 minutos). Los intentos con error no suman. Hay un tope aparte de 60 peticiones por IP, que no debería afectar a una persona normal.
- **Foco perdido y `aria-invalid` ausente:** el botón ya no se deshabilita. El servidor devuelve qué campo falló, ese campo recibe `aria-invalid` y foco, y al éxito el foco va a `#estado`.
- **Costo por petición que crecía con los datos:** los mensajes se guardan en un archivo `mensajes.jsonl` y se cargan en memoria al arrancar. Guardar es un append. El listado de administración pagina de 50 en 50, así que el cuerpo ya no crece con el total.
- **Límite general antes de la validación:** ahora se valida primero y el límite por IP se aplica solo a mensajes válidos.
- **Bots y administración pobre:**
  - Hay un token firmado con espera mínima de 2 s; sin token válido da 400 y el campo trampa o un envío demasiado rápido dan éxito falso sin guardar.
  - El administrador tiene búsqueda, paginación, selección, "seleccionar todos" y borrado masivo con un solo `confirm`, sin recargar la página.
- **Sin JavaScript:** el formulario tiene `method="post"` y `action`. El servidor acepta `application/x-www-form-urlencoded` y responde con una página HTML de resultado. El token se inyecta al servir `index.html`, así que funciona sin JavaScript.
- **Archivo de mensajes dañado:** al arrancar se omiten las líneas corruptas, se copian a `datos/mensajes-corruptos.txt`, se avisa en consola y el sitio sigue funcionando. Un `mensajes.json` antiguo se importa una vez.
- **Sin límite de intentos en el login:** 10 claves incorrectas por IP en 10 minutos dan 429 con `Retry-After`.
- **413 convertido en reinicio de conexión:** el cuerpo excedido se descarta y se responde 413. Solo se corta la conexión si pasa de 1 MB.
- **Campos no string guardados:** si `nombre`, `correo` o `mensaje` no son texto, responde 400.
- **Imágenes sin tamaño:** las 4 `<img>` tienen `width` y `height`, tomados del `viewBox` de cada SVG.
- **Instrucción en sintaxis bash:** en PowerShell es `$env:HOST='0.0.0.0'; node servidor.mjs`. Para fijar la clave: `$env:ADMIN_CLAVE='tu-clave'`.

**Cómo probarlo tú mismo**
1. Ejecuta `node servidor.mjs` y abre `http://127.0.0.1:3000`.
2. En el formulario, espera unos 3 segundos antes de enviar (el envío más rápido se descarta como bot).
3. Abre `/admin` con usuario `admin` y la clave que imprime la consola.
