# Hallazgos · Web · corrida 1 · Sonnet · 2026-10

Construyó Sonnet con el texto de `TASK.es.md` y nada más. Revisó Opus en otra sesión, con `REVIEW.es.md`, corriendo el servidor (`ADMIN_PASSWORD=prueba123 PORT=3000 node servidor.mjs`) en Windows con Node 26, con `curl`, scripts de Node y el navegador a 375 px y en escritorio. El código está aquí tal como quedó.

## Lo que se rompió

| # | Qué se rompió | Evidencia | Qué le pasaría a una persona real | Clase |
|---|---|---|---|---|
| 1 | La prueba de humo es intermitente, y el constructor dijo que pasa. | `node prueba.mjs` 20 veces: pasan 18, fallan 2 con `fetch failed · ECONNRESET`. El POST de 20 KB solo: 19 veces `413` y una `ECONNRESET`. Con 100 KB: un `413` y cuatro conexiones cortadas (`curl`: «Recv failure: Connection was reset», código 000). El servidor responde 413 y destruye el socket al terminar la respuesta, mientras el cliente sigue subiendo el cuerpo. | Quien corre la prueba que le indicaron la ve fallar una vez de cada diez y no sabe si su sitio está roto. Un cliente que manda un cuerpo grande recibe una conexión cortada en vez de «El mensaje es demasiado largo». | servidor · afirmación falsa |
| 2 | Una línea cortada en el archivo de mensajes se traga el mensaje siguiente. | Se dejó al final de `mensajes.jsonl` una línea sin terminar, como la dejaría una caída a media escritura. Después se envió un mensaje válido: respuesta `{"ok":true}`, el mensaje sí está en el archivo, pero quedó pegado a la línea cortada. La administración siguió en «Mensajes (651)» y el nombre del mensaje nuevo aparece 0 veces. El código lo había previsto a medias: «línea dañada: se omite». | La persona ve «¡Gracias! Recibimos tu mensaje» y nunca le contestan. El dueño no tiene forma de saber que ese mensaje existe. | datos |
| 3 | El formulario no tiene ningún freno y la administración no tiene ni páginas ni forma de borrar. | Un script mandó 650 mensajes en cerca de un segundo: todos `201`. La administración pasó a 653 mensajes, 1.29 MB de HTML y 1 415 207 px de alto, sin paginación ni botón de borrar. El constructor avisó que faltaba el límite y el borrado. | Después de la primera ola de robots, el dueño tiene que bajar entre cientos de mensajes basura para encontrar uno real, o editar el archivo a mano. | servidor · datos |
| 4 | El navegador y el servidor validan el correo con reglas distintas. | Con `ana@correo`, el navegador deja enviar (`type=email` lo acepta) y el servidor responde «Escribe un correo válido.». El aviso sale debajo del botón, el campo no se marca (`aria-invalid` vacío) y el foco cae al `BODY`. | Puede corregirlo, porque lo escrito se conserva, pero el aviso no está junto al campo que falla. | formulario |
| 5 | El formulario aparenta funcionar sin JavaScript, y no funciona. | El `<form>` lleva `method="post" action="/api/contacto"`, pero el servidor solo acepta JSON. `curl -d 'nombre=Ana&correo=ana@correo.mx&mensaje=hola'` devuelve `{"error":"Solicitud no válida."}` con 400. | Si `app.js` no carga, la persona ve una línea de JSON en pantalla en blanco y su mensaje se pierde. | formulario |
| 6 | El foco se pierde al enviar. | Recorrido solo con teclado: después de Enter en «Enviar mensaje», `document.activeElement` es `BODY`, porque el botón se deshabilita mientras envía. | Quien usa teclado o lector de pantalla queda fuera del formulario. El aviso sí se anuncia (`aria-live`). | accesibilidad |
| 7 | La administración no limita los intentos de clave. | 200 claves equivocadas en 293 ms, todas `401`, sin demora. La clave viaja sin cifrar por HTTP (el constructor lo avisó). | Con la clave aleatoria no pasa nada. Con una clave corta puesta en `ADMIN_PASSWORD`, alguien la adivina y lee los datos de todos los clientes. | seguridad |

## Lo que funcionó

- El HTML de los mensajes se muestra como texto: `<b>hola</b>` y `<img src=x onerror=…>` aparecen tal cual, sin etiquetas en la página (0 `img`, 0 `b`).
- El servidor de archivos no sale de `publico/`: `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, `/%2e%2e%5cservidor.mjs`, `/datos/…` y `/estilos.css%00.html` devuelven 404. Una ruta mal codificada devuelve 400.
- `/admin` pide clave (401 sin ella y con una equivocada).
- El servidor valida sin la página: vacío, `{}`, `null`, campos que no son texto y JSON roto dan 400; `PUT` y `DELETE` dan 405.
- Doble clic en enviar: un solo mensaje guardado.
- 300 mensajes a la vez, dos veces: 300 guardados y legibles cada vez.
- A 375 px no hay scroll horizontal; los títulos no quedan bajo la barra fija; la administración se lee en el celular.
- Teclado: el orden de Tab es el de la página, el foco se ve (contorno azul de 3 px) y el formulario se envía con Enter.
- Contraste del botón: blanco sobre `#b5561a`, 4.9 a 1. Las imágenes tienen texto alternativo útil y proporción fija, así que la página no salta al cargar.

## Lo que dijo el constructor contra lo que hay

| Afirmación | ¿Es cierta? |
|---|---|
| «La prueba automática de humo pasa» | A medias: pasa 18 de cada 20 veces (hallazgo 1). |
| «Se valida en el navegador y otra vez en el servidor» | Sí, pero con reglas distintas (hallazgo 4). |
| «Los mensajes se escapan antes de mostrarse» | Sí. |
| «El servidor bloquea rutas que intentan salir de `publico/`» | Sí. |
| «El cuerpo de las solicitudes tiene tope de 10 KB» | Sí, aunque el aviso de que es demasiado largo casi nunca llega (hallazgo 1). |
| «Con datos inválidos muestra el error en la misma página» | Sí, debajo del botón. |
| «El diseño parte del celular» | Sí; no lo había visto, y lo dijo. |
| «Sin `ADMIN_PASSWORD` se genera una clave aleatoria» | Sí, y la imprime en la consola. |

## Lecciones candidatas

Esta es la primera corrida: lo que se rompa también en la segunda pasa a lección; lo demás queda como candidato.

- El **4** ya lo cubre la **6** (la definición vive en un solo lugar): la regla del correo está escrita dos veces.
- El crecimiento de la administración del **3** lo cubre la **46**: cada visita lee y pinta el archivo entero.
- El **6** es una torpeza única. El **7** no truena: si se repite, va como `proposal` en el paquete de seguridad.

### Candidata A (hallazgo 1). Una prueba de red que pasó una vez no pasó

`origin: lab · sonnet · 2026-10` · `groups: tests-and-checks` · `packages: web`

**La idea.** Lo que depende de tiempos (cerrar una conexión, dos peticiones a la vez, un servidor que arranca) puede pasar y fallar con el mismo código. Una corrida verde no dice nada.

**Ejemplo.** Un servidor rechazaba los cuerpos de más de 10 KB respondiendo 413 y cortando la conexión al terminar la respuesta. Su prueba mandaba 20 KB y pasó la vez que se corrió. Corrida 20 veces, falló 2; con 100 KB, el aviso no llegaba casi nunca: el cliente veía la conexión cortada.

**Pregunta detectora.** ¿Esta prueba toca la red, procesos o algo que ocurre a la vez? ¿La corrí suficientes veces para ver la falla que pasa una de cada diez?

**Señal de alarma.** «Pasó» · «fue un error raro, ya no salió».

**Qué hacer.** Córrela en un bucle (20 veces) antes de darla por buena, y prueba también el tamaño que de verdad manda quien abusa, no solo el que apenas cruza el límite. Para rechazar un cuerpo grande, responde y deja que el cliente termine de enviar (descarta el resto con `req.resume()` y responde con `Connection: close`) en vez de destruir la conexión.

### Candidata B (hallazgo 2). En un archivo que solo crece, una línea rota daña también la siguiente

`origin: lab · sonnet · 2026-10` · `groups: scripts-and-files` · `packages: web` · `refines: 24`

**La idea.** Guardar cada registro como una línea al final de un archivo es sencillo y aguanta muchos a la vez. Pero si una escritura se corta, la línea queda sin su salto, y el registro siguiente se pega a ella. Saltarse «las líneas dañadas» al leer se lleva los dos.

**Ejemplo.** Un formulario guardaba cada mensaje como una línea JSON, y la administración omitía las que no se podían leer. Con una línea cortada al final, el siguiente mensaje respondió «gracias», quedó en el archivo y nunca apareció en la administración.

**Pregunta detectora.** Si la última escritura quedó a medias, ¿qué le pasa a la siguiente? ¿Lo que mi lector «omite» avisa a alguien?

**Señal de alarma.** «Las líneas dañadas se omiten» · «es solo agregar al final».

**Qué hacer.** Empieza cada registro con un salto de línea si el archivo no termina en uno, o escribe cada registro como su propio archivo. Al leer, cuenta las líneas que no se pudieron leer y muéstralo en la administración, en vez de saltarlas en silencio.

### Candidata C (hallazgo 3). Un formulario público recibe robots el primer día

`origin: lab · sonnet · 2026-10` · `groups: interface-and-design` · `packages: web`

**La idea.** Un formulario abierto a internet no lo llenan solo personas. Si no frena lo automático y quien lo lee no puede limpiar, la primera ola de basura entierra a los clientes.

**Ejemplo.** Un formulario de contacto aceptó 650 mensajes en un segundo desde un script. La administración, sin páginas ni botón de borrar, pasó a medir más de un millón de píxeles de alto.

**Pregunta detectora.** Si mañana llegan mil mensajes falsos, ¿cómo encuentra el dueño el único real, y cómo borra los demás?

**Señal de alarma.** «Es un sitio chico, nadie lo va a atacar».

**Qué hacer.** Pon un freno barato desde el inicio (un campo oculto que las personas no llenan, un límite por dirección por minuto), y dale a la administración páginas y una forma de borrar o marcar como basura.

### Candidata D (hallazgo 5). Un respaldo que nadie probó no es respaldo

`origin: lab · sonnet · 2026-10` · `packages: web`

**La idea.** Un formulario con `action` y `method` promete que funciona aunque falle el JavaScript. Si el servidor solo entiende lo que manda el JavaScript, la promesa es falsa y el error sale crudo.

**Ejemplo.** El formulario enviaba JSON con JavaScript y declaraba `method="post"` como respaldo. Enviado sin JavaScript, el servidor respondía una línea de JSON con «Solicitud no válida» y el mensaje se perdía.

**Pregunta detectora.** Si este archivo de JavaScript no carga, ¿qué pasa cuando la persona envía?

**Señal de alarma.** «Igual todos tienen JavaScript».

**Qué hacer.** O el servidor acepta también el envío normal del formulario y responde con una página, o el formulario no promete un respaldo que no tiene. Pruébalo una vez con el JavaScript apagado.
