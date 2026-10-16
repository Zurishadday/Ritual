# Fixing what the review found

`claude-sonnet-5-5` · success · 32 turns · $0.5906667000000001 · 30927 output tokens · 1 denied tool call(s)

Corregí los 16 puntos. Probé la parte del servidor con `node prueba.mjs` ("Todo bien"); lo del navegador (foco, 375 px, contraste) quedó solo revisado en el código, porque aquí no tengo navegador.

- **Mensaje fuera de vista:** cada campo muestra su error debajo, con `aria-invalid`; al fallar se enfoca el campo y se centra en pantalla.
- **Admin a 375 px:** el nombre largo ya parte línea (`overflow-wrap`, `minmax(0,1fr)`); además el servidor limita el nombre a 100 caracteres.
- **Error con letras en el teléfono:** el teléfono se valida en el cliente con las mismas reglas que el servidor, marca el campo y le da foco; el servidor devuelve qué campo falló.
- **Escala:** las solicitudes se guardan en un diario de solo-añadir (`datos/solicitudes.jsonl`). El admin recibe 25 por página, con búsqueda y filtro por estado.
- **Límite general vs. específico:** primero se valida y solo cuentan las solicitudes aceptadas. En el login solo cuentan los fallos, y la contraseña correcta siempre entra.
- **Bots:** campo señuelo, tope de 10 solicitudes válidas por IP y 100 por hora en total, y borrado uno a uno o en bloque por filtro en el panel.
- **Sin JavaScript:** las horas ya vienen en el HTML y el formulario hace POST a `/cita`, con página de resultado; ya no filtra datos en la URL.
- **Foco al deshabilitar:** uso `aria-disabled` en lugar de `disabled`; en el admin el foco vuelve a la tarjeta (o al aviso si desaparece).
- **Archivo dañado:** las líneas rotas se saltan, se guarda copia `.bak` y se compacta al arrancar; el servidor sigue en pie. Importa también el `solicitudes.json` anterior, incluso truncado.
- **Escritura fallida:** la cola no queda rechazada tras un error y la memoria cambia solo después de escribir en disco.
- **Hora ya pasada hoy:** el servidor la rechaza y el cliente deshabilita esas horas. También limité las citas a 180 días.
- **Contraseña por defecto:** quitada. Se usa `ADMIN_PASSWORD`; si falta, se genera una al azar y se guarda en `datos/clave-admin.txt`.
- **Foco poco visible:** el anillo es ahora `#0b3f38`, y los bordes de los campos subieron a ≥3:1.
- **Dirección y teléfono de ejemplo:** hay un comentario `CAMBIAR` en el HTML y un `README.md` con cómo correrlo y qué reemplazar.
- **Imágenes y tap targets:** las `<img>` llevan `width`/`height`, y botones, enlaces del menú y teléfono miden al menos 44 px.

Para probarlo: `node servidor.mjs`, abre `/` y `/admin` (la contraseña sale en la consola).

La contraseña correcta entra aunque la IP tenga 10 fallos, como pidió el reviewer. Eso significa que el límite ya no frena a quien adivine a ciegas, así que conviene una clave larga. Las horas usan la zona horaria del servidor.
