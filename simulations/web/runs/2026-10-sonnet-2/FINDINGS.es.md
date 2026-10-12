# Hallazgos · Web · corrida 2 · Sonnet · 2026-10

Construyó Sonnet en una carpeta limpia, con el mismo texto de `TASK.es.md`. Revisó Opus con `REVIEW.es.md` y las mismas pruebas que en la [corrida 1](../2026-10-sonnet-1/FINDINGS.es.md), corriendo el servidor (`ADMIN_CLAVE=prueba123 PORT=3000 node servidor.mjs`) en Windows con Node 26. El código está aquí tal como quedó.

## Lo que se rompió

| # | Qué se rompió | Evidencia | Qué le pasaría a una persona real | Clase |
|---|---|---|---|---|
| 1 | Una línea cortada en el archivo de mensajes se traga el mensaje siguiente. | Igual que en la corrida 1: con una línea sin terminar al final de `mensajes.jsonl`, el mensaje siguiente respondió `{"ok":true}`, quedó en el archivo pegado a la línea cortada, y la administración siguió en «Mensajes recibidos (651)», sin él. | La persona recibe «¡Gracias!» y nunca le contestan. | datos |
| 2 | El formulario no tiene freno y la administración no tiene páginas ni forma de borrar. | 650 mensajes desde un script, todos `201`. La administración: 1.2 MB y 6 118 010 px de alto en el celular. Además, a 375 px la columna del mensaje queda fuera de la pantalla y hay que desplazar la tabla de lado. El constructor avisó que faltaban el límite y el borrado. | Tras la primera ola de robots, el dueño no encuentra los mensajes reales, y en el celular ni siquiera ve el texto sin desplazar. | servidor · datos |
| 3 | El formulario sin JavaScript envía, guarda y deja a la persona frente a JSON crudo. El constructor dijo lo contrario. | Envío nativo del formulario (sin pasar por `app.js`): la página cambia a `/contacto` y muestra solo `{"ok":true}`. Con `curl -d 'nombre=…'` también da 201. El resumen decía «Sin JavaScript no envía». | Si `app.js` no carga, la persona ve una página en blanco con código y no sabe si su mensaje llegó. | formulario · afirmación falsa |
| 4 | Tras un error del servidor, el foco se va al principio de la página. | Con `ana@correo` y Enter sobre «Enviar mensaje»: el aviso «El correo no parece válido.» aparece, el foco queda en `BODY` y el siguiente Tab lleva a «Escríbenos», arriba. Se repitió igual en la corrida 1 (el siguiente Tab llevó a «Taller Rueda Libre»). | Quien usa teclado tiene que recorrer otra vez toda la página para llegar al campo que debe corregir. | accesibilidad |
| 5 | El navegador y el servidor validan el correo con reglas distintas. | `ana@correo` pasa en el navegador y el servidor lo rechaza, igual que en la corrida 1. | Ve el error debajo del botón, no junto al campo. | formulario |
| 6 | La frase de la portada se cruza con el dibujo. | A 375 px, el texto blanco queda encima de las líneas blancas de la bicicleta, sin velo oscuro entre los dos: «bici vuelve» y «rodar» quedan cortados por los trazos. La corrida 1 sí ponía un degradado. | La frase principal del sitio se lee mal en el celular. | celular · accesibilidad |
| 7 | La clave fija de la administración se imprime en la consola. | Con `ADMIN_CLAVE=prueba123`, el arranque escribe «clave: prueba123». | La clave queda en el historial de la terminal y en cualquier registro del servidor. | seguridad |
| 8 | La administración no limita los intentos de clave. | 200 claves equivocadas en 88 ms, todas `401`. Igual que en la corrida 1. | Con una clave corta, alguien la adivina y lee los datos de todos los clientes. | seguridad |
| 9 | Torpezas menores. | Una ruta mal codificada (`/%E0%A4%A`) da 500 en vez de 400. `PORT=` vacío arranca en un puerto al azar («http://localhost:0»). Sin cabeceras de seguridad. `HEAD /admin` da 404. | Poca cosa. | servidor |

## Lo que funcionó

- El HTML de los mensajes se muestra como texto; 0 etiquetas inyectadas.
- El servidor de archivos no sale de `publico/` y solo sirve extensiones conocidas: todas las rutas de prueba dan 404.
- El cuerpo grande se rechaza con 400 siempre, sin cortar la conexión (5 de 5 con 100 KB).
- `prueba.mjs` pasó 20 de 20 veces.
- `/admin` pide clave; la comparación es de tiempo constante.
- Doble clic: un solo mensaje. 300 mensajes a la vez, dos veces: ninguno perdido.
- A 375 px no hay scroll horizontal en la página; los campos y el botón miden 48 px o más de alto.

## Lo que dijo el constructor contra lo que hay

| Afirmación | ¿Es cierta? |
|---|---|
| «El formulario necesita JavaScript. Sin JavaScript no envía.» | No: envía, guarda y muestra JSON crudo (hallazgo 3). |
| «Un fallo al escribir devuelve error en vez de decir enviado» | Sí, pero una escritura cortada que sí se hizo daña el mensaje siguiente (hallazgo 1). |
| «El servidor también acepta el formulario en formato clásico» | Sí; y responde JSON a un navegador (hallazgo 3). |
| «La tabla de administración se desplaza de lado si no cabe» | Sí, y por eso el mensaje queda fuera de la pantalla (hallazgo 2). |
| «La prueba falla si le quito el escape del HTML» | Sí: la prueba revisa el escape. |
| «Si no la fijas, se genera una clave al arrancar» | Sí; y si la fijas, también la imprime (hallazgo 7). |

## Veredicto de las dos corridas

| Se rompió | Corrida 1 | Corrida 2 | Resultado |
|---|---|---|---|
| Línea cortada que se traga el mensaje siguiente | sí | sí | lección **WEB-1** |
| Formulario sin freno, administración sin páginas ni borrado | sí | sí | lección **WEB-2** |
| Respaldo sin JavaScript que no funciona | sí | sí | lección **WEB-3** |
| El foco se va al principio tras un error | sí | sí | lección **WEB-4** |
| Dos reglas distintas para el correo | sí | sí | ya la cubre la **6** |
| La administración no limita intentos de clave | sí | sí | no truena: candidata para el paquete `seguridad`, como `proposal` con fuente |
| Prueba de humo intermitente | sí | no | candidato |
| Texto de portada sobre el dibujo sin velo | no | sí | candidato |
| Clave fija impresa en la consola | no | sí | candidato (`seguridad`) |

### Candidato (hallazgo 6). El texto sobre una imagen necesita su propio fondo

`origin: lab · sonnet · 2026-10` · `packages: web`

**La idea.** Una frase blanca sobre una imagen se lee solo donde la imagen es oscura. Una sombra de texto no alcanza cuando la imagen tiene trazos claros justo detrás.

**Ejemplo.** La portada ponía la frase en blanco, con una sombra leve, sobre un dibujo de bicicleta con líneas blancas. En el celular, la frase quedó encima de las líneas y partes de ella se cortaban.

**Pregunta detectora.** ¿Revisé el contraste del texto contra la parte más clara de la imagen que puede quedar detrás, en cada ancho de pantalla?

**Señal de alarma.** «Con la sombra se lee».

**Qué hacer.** Pon un velo oscuro entre la imagen y el texto (un degradado basta), y mira la portada a 375 px.
