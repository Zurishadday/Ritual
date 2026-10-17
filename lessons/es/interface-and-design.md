# Interfaz y diseño

Lo que aplica cuando una persona va a ver o usar lo que haces: pantallas, componentes, estilos, páginas.

### 10. Los módulos gemelos se cambian juntos

`from: 39a1c52b` · `by: author`

**La idea.** Si tu producto tiene dos versiones de la misma pantalla, para dos tipos de usuario, dos regiones o dos productos, una mejora en una es una mejora pendiente en la otra.

**Ejemplo.** La versión de escritorio ganó un filtro por fecha. La de celular, que la gente ve como «la misma pantalla», siguió sin él durante un mes.

**Pregunta detectora.** ¿Esto que toco tiene un gemelo que el usuario ve como «el mismo módulo»?

**Señal de alarma.** «En el otro no me lo pidieron».

**Qué hacer.** No cierres el cambio hasta revisar el gemelo y decir «igual» o «no aplica porque…».

### 19. Una revisión de una sola dimensión no es una revisión

`from: e2d5ae25` · `by: author`

**La idea.** «Ya están iguales» exige haber comparado todas las propiedades que se ven, no solo una.

**Ejemplo.** Se homologó el diseño de dos pantallas en cuatro rondas: primero el tamaño, luego la tipografía, luego los colores, luego el color de los rótulos. Cada entrega decía «ya quedó».

**Otro ejemplo.** Las ilustraciones de un material se revisaban por contenido y por tamaño, pero no por contraste: dos colores de texto quedaron por debajo del mínimo legible en cuatro imágenes.

**Pregunta detectora.** ¿Comparé una propiedad o todas las que el usuario ve?

**Señal de alarma.** «Ya coincide el tamaño, entonces el diseño es el mismo».

**Qué hacer.** Enumera todas las diferencias antes de corregir la primera. Y en tus registros, el verbo te delata: «queda», «pasa a» son intención; «dice», «muestra» son medición.

### 31. Nada técnico en pantalla si no cambia una decisión

`from: 60f4261e` · `by: author`

**La idea.** Cada elemento de una pantalla de negocio debe ayudar a decidir algo. Lo que sirve para auditar va en el código; lo que sirve para decidir va en la pantalla, en lenguaje de negocio.

**Ejemplo.** Una pantalla de ventas mostraba en la primera fila el identificador interno de cada pedido y la hora del último cálculo. Nadie decidía nada con eso, y ocupaba el lugar del dato que sí importaba.

**Pregunta detectora.** ¿Esto cambia alguna decisión de quien usa la pantalla? Si no, ¿por qué está aquí?

**Señal de alarma.** «Por si alguien lo necesita».

**Qué hacer.** Antes de agregar algo a la pantalla, escribe qué decisión cambia. Si no cambia ninguna, va al registro técnico o al código, no a la pantalla.

### 32. Lo que funciona y no se ve se reporta como roto

`from: 62e8051c` · `by: author`

**La idea.** Si un botón cambia algo fuera de la vista, para el usuario funcionar y no funcionar se ven igual.

**Ejemplo.** Un filtro sí filtraba una tabla, pero la tabla estaba dos pantallas más abajo. Lo reportaron como «no hace nada».

**Variante.** Ocultar un contenedor oculta todo lo que vive dentro, incluso lo que no tenía que ver con él. Por ejemplo, un enlace útil que vivía dentro de un control retirado.

**Pregunta detectora.** Justo después de usar el control, sin moverse de donde está, ¿el usuario ve qué cambió?

**Señal de alarma.** «Sí funciona, nada más no se ve».

**Qué hacer.** Todo control dice qué cambió y lleva al usuario hasta ahí. Y antes de ocultar algo, revisa qué otros elementos viven dentro.

### 33. El glifo no es el texto

`from: ba84572f` · `by: author`

**La idea.** En letra pequeña, «÷» y «+», «l» y «1», «O» y «0» se confunden. Si dos personas leen lo mismo mal, no están distraídas: es el tamaño de la letra.

**Ejemplo.** Dos personas distintas leyeron «98 ÷ 441» como «98 + 441» en una tarjeta con letra pequeña, y las dos reportaron que la cuenta estaba mal.

**Otro ejemplo.** La fuente de código de un material unía `>=` en un solo símbolo, ⩾. Quien aprende copia lo que ve, y ese símbolo no existe en el teclado ni en el lenguaje.

**Pregunta detectora.** En el tamaño y la fuente en que se va a leer, ¿este símbolo se puede confundir con otro, o se ve como algo que no se puede escribir?

**Señal de alarma.** «En mi pantalla se ve bien».

**Qué hacer.** Cuando un símbolo se confunde, cámbialo por una palabra: «98 sobre 441» en lugar de «98 ÷ 441».

### 41. Comprueba en el formato que lee la gente

`from: 10a08b3c` · `by: author`


**La idea.** Buscar una palabra en el texto no prueba que se vea. El texto puede estar en otro lugar del documento mientras el formato que lo debía mostrar sale vacío.

**Ejemplo.** Tres pasos numerados salían como viñetas vacías. La revisión automática los daba por buenos porque esas palabras aparecían en otra parte del documento.

**Otro ejemplo.** Se agregó un aviso de «hay más columnas a la derecha» y se dio por hecho porque el código estaba ahí. Nunca aparecía: un estilo general de las tablas le quitaba la condición que lo encendía. Lo vio otra persona en una captura.

**Un ejemplo más.** Una opción de respuesta decía en el archivo «Total: {2 * 78}». Al dibujar la página, el sistema calculó lo que iba entre llaves y mostró «Total: 156»: dos opciones idénticas. Solo lo vio quien miró la pantalla.

**Variante.** Las capturas que juzga un revisor pueden mostrar una pantalla a la que nadie llega. La herramienta de capturas de un curso contestaba cada ejercicio de código con una línea de relleno solo para avanzar, así que la captura de «después» mostraba esa línea y el aviso «no es el resultado esperado»: los revisores nunca vieron lo que ve un estudiante que acierta. En escritorio, además, las capturas incluían la cabecera y el menú lateral, y la lección quedaba como una franja ilegible. Al capturar para revisar, contesta cada paso como lo haría quien acierta, y captura solo la parte que se revisa.

**Pregunta detectora.** ¿Vi el elemento exacto tal como lo ve el lector, o solo encontré la palabra (o el código) en la fuente?

**Señal de alarma.** «La palabra está en el archivo» · «es un arreglo de una línea».

**Qué hacer.** Verifica el elemento exacto, como «estos tres pasos, como viñetas», y mira al menos una vez la página tal como la verá el lector. Un arreglo chico se mira igual: es donde menos se espera que otra regla lo anule. Y la primera vez que usas un recurso nuevo en la página (un bloque de código, un encabezado fijo), míralo también en el celular.

### 45. El camino del error también lo recorre alguien

`from: 93409a9c` · `by: author`

**La idea.** Si solo pruebas lo que pasa cuando todo sale bien, quien se equivoca encuentra el hueco. Y al aprender, equivocarse es lo más común.

**Ejemplo.** Una celda de consulta contaba un intento solo cuando la consulta corría. Con un error de escritura, el botón para avanzar nunca se activaba y la persona se quedaba atorada. Las pruebas pasaban, porque siempre corrían la consulta de partida, que no tenía errores.

**Pregunta detectora.** Si el usuario hace mal lo más probable (un error de escritura, una respuesta vacía, dos clics), ¿qué ve, y puede seguir?

**Señal de alarma.** «Con la respuesta correcta funciona».

**Qué hacer.** Por cada control, prueba tres caminos: el bueno, el del error más común y el vacío. Los tres dicen qué pasó y dejan seguir.

### 46. Lo que corre en cada petición no puede crecer con el contenido

`from: b7ad7ec2` · `by: author`

**La idea.** Algo que se hace en cada página, como leer todo el contenido o recalcular un índice, cuesta poco con diez páginas y mucho con cien. Crece de a poco y nadie lo nota, hasta que algo empieza a fallar «de vez en cuando».

**Ejemplo.** Cada página de un sitio leía y analizaba todo el contenido para armar el temario. Sola, una página tardaba 0.4 s. Pero la barra lateral pedía unas 40 a la vez, y juntas tardaban 16 s. Meses después, las pruebas empezaron a fallar al cambiar de página, y la falla parecía de la prueba.

**Pregunta detectora.** ¿Esto que corre en cada petición recorre todo el contenido? ¿Cuánto tarda hoy, cuánto con el doble y cuánto con muchas peticiones a la vez?

**Señal de alarma.** «En local carga rápido» · «es una falla intermitente».

**Qué hacer.** Mide en el servidor compilado y como lo usa la gente, con todas sus peticiones juntas, no una página sola. Guarda lo que no cambia mientras corre el servidor, y deja una prueba que lo mida con el caso que de verdad lo hacía lento.

### 49. Una regla general no debe ganarle en silencio a las particulares

`from: 4a81cf45` · `by: author`

**La idea.** Una regla que aplica a todo (un estilo global, un valor por defecto) puede pisar lo que cada pieza decidió para sí, sin que nada avise.

**Ejemplo.** El estilo del foco del teclado, escrito para todo el sitio, traía su propio redondeo. Como quedaba por encima de los estilos de cada componente, un botón en forma de píldora cambiaba de forma al enfocarlo con el teclado. Nadie lo vio, porque con el ratón el foco no aparece.

**Pregunta detectora.** Esta regla general, ¿toca algo que cada pieza ya decide por su cuenta? Si chocan, ¿cuál gana?

**Señal de alarma.** «Lo puse global para no repetirlo».

**Qué hacer.** Que la regla general toque solo lo suyo (el contorno del foco, no la forma). Si debe ganar a propósito, escríbelo junto a ella. Y pruébala en la pieza más distinta, no solo en la común.

### VIDEO-1. En un video, cada acción cae cuando la narración la nombra

`from: 93ac042f` · `by: ai`

**La idea.** Cuando la pantalla hace algo antes o después de que la voz lo diga, quien mira ve lo que no está escuchando y escucha lo que no está viendo. Un clic que llega antes de su palabra enseña el clic sin su nombre.

**Ejemplo.** En una serie de videos narrados de hojas de cálculo, hechos con código, cada clic se ubicaba como una fracción de su escena. Una revisión pedagógica encontró clics que caían antes de que la voz nombrara la opción (un color en un panel lateral), y una frase que abría con contexto mientras el cursor ya hacía su primer clic. La regla que salió de ahí: si una frase abre con contexto, ese tramo no lleva clics, y cada clic cae sobre la palabra que lo nombra.

**Otro ejemplo.** En la misma serie, el responsable del curso dijo que un video saltaba de una idea a la siguiente demasiado rápido. Una pausa sin movimiento de 1 a 1.5 segundos al final de cada idea nueva lo arregló.

**Pregunta detectora.** Para cada clic y cada tecla de esta escena, ¿qué palabra de la narración cae encima? ¿Esa palabra lo nombra? ¿Cada idea nueva termina con un momento quieto antes de que empiece la siguiente?

**Señal de alarma.** «Dice algo así por ahí» · «es una fracción de la escena, así que cuadra».

**Qué hacer.** Si la voz no da una marca de tiempo por palabra, ubica cada acción según dónde está su palabra en la frase (los caracteres que van antes de ella), y revísala en el video completo a su velocidad real, no en cuadros fijos. Si el motor de voz da marcas de tiempo por palabra, ubica las acciones con ellas. Cambiar la voz o reescribir una frase mueve cada palabra: revisa la escena otra vez. Cierra cada idea nueva con una pausa breve, de alrededor de un segundo, y júzgala también a velocidad real.

### VIDEO-2. En un video, lo que cambia sin mostrarse se marca

`from: c7d1a08d` · `by: ai`

**La idea.** Cuando el efecto de un paso no se ve en pantalla (quitar un espacio al final, convertir una fórmula en su valor), un video que muestra ese paso parece que no hace nada. Quien mira no puede hacer clic por ahí para averiguarlo, así que el video tiene que marcar lo que cambió y detenerse el tiempo suficiente para ver la marca.

**Ejemplo.** Un video generado enseñó a quitar los espacios sobrantes de una columna de una hoja de cálculo y luego a pegar el resultado solo como valores. La columna limpia se veía exactamente igual que la sucia, y pegar valores no cambiaba nada visible. El responsable del curso lo vio y dijo que el cambio no se notaba y que no se entendía por qué importaba pegar solo los valores. Se arregló con un punto naranja sobre cada espacio sobrante, una escena lado a lado con las dos columnas, y una flecha desde la celda de origen hasta la fórmula que la lee, cada una sostenida un momento en pantalla.

**Pregunta detectora.** Con el sonido apagado, ¿la pantalla muestra lo que cambió con este paso, y se queda en ello el tiempo suficiente para verlo?

**Señal de alarma.** «La narración lo explica» · «el cambio es sutil, pero ahí está».

**Qué hacer.** Para cada paso del guion, anota qué cambia en pantalla. Si no cambia nada visible, agrega una marca (un punto, la barra de fórmulas, una flecha, un antes y un después lado a lado), sostén el cuadro en ella un momento, y di en la narración que esa es la marca del video, no la del programa.

### WEB-2. Un formulario público recibe robots desde el primer día

`from: 6a05ed7d` · `by: author`

**La idea.** Un formulario abierto a internet no lo llenan solo personas. Si no frena lo automático y quien lee los mensajes no puede limpiarlos, la primera ola de basura entierra a los clientes de verdad.

**Ejemplo.** En las dos corridas de la simulación Web, el formulario de contacto aceptó 650 mensajes de un script en un par de segundos, todos con «gracias». La administración no tenía páginas ni botón de borrar: pasó a medir entre uno y seis millones de píxeles de alto, y en el celular el texto del mensaje quedaba fuera de la pantalla. Las dos veces el constructor lo dejó anotado como pendiente.

**Pregunta detectora.** Si mañana llegan mil mensajes falsos, ¿cómo encuentra el dueño el único real, y cómo borra los demás?

**Señal de alarma.** «Es un sitio chico, nadie lo va a atacar» · «el límite se pone después».

**Qué hacer.** Desde el inicio, un freno barato: un campo oculto que las personas no llenan y un límite de envíos por dirección por minuto. Y una administración con páginas, lo más nuevo primero, y una forma de borrar o marcar como basura. Pruébalo mandando cientos de mensajes con un script y abriendo la administración en el celular.

### WEB-3. Un respaldo que nadie probó no es respaldo

`from: c0e4cb66` · `by: author`

**La idea.** Un formulario con `method` y `action` promete que funciona aunque falle el JavaScript. Si el servidor solo responde lo que espera el JavaScript, la promesa es falsa y la persona termina frente a código.

**Ejemplo.** En las dos corridas de la simulación Web, el formulario enviaba con JavaScript y declaraba `method="post"`. Sin JavaScript, en una versión el servidor rechazaba el envío con una línea de JSON y el mensaje se perdía; en la otra lo guardaba y mostraba solo `{"ok":true}` en una página en blanco. Esta segunda versión decía en su resumen que sin JavaScript no enviaba.

**Pregunta detectora.** Si este archivo de JavaScript no carga, ¿qué ve la persona cuando envía?

**Señal de alarma.** «Igual todos tienen JavaScript» · «el `action` lo dejo por si acaso».

**Qué hacer.** Decide una de dos y pruébala: o el servidor acepta el envío normal y responde con una página (o redirige a una de gracias), o el formulario no declara un respaldo que no tiene. Envíalo una vez con el JavaScript apagado.

### WEB-4. Si deshabilitas el botón, el foco se va con él

`from: 4dc9e2b6` · `by: author`

**La idea.** Deshabilitar el botón mientras se envía evita el doble envío, pero el botón pierde el foco y el navegador lo manda al documento. Quien usa teclado, después del aviso, empieza otra vez desde arriba.

**Ejemplo.** En las dos corridas de la simulación Web, el envío deshabilitaba el botón. Con un correo que el servidor rechazó, el aviso apareció debajo del botón, el foco quedó en el documento y el siguiente Tab llevó al primer enlace de la página, lejos del campo que había que corregir.

**Pregunta detectora.** Después de enviar, con éxito o con error, ¿dónde queda el foco y adónde lleva el siguiente Tab?

**Señal de alarma.** «Lo deshabilito para que no le den dos veces».

**Qué hacer.** Al terminar el envío, pon el foco donde sigue la persona: en el campo con error (marcado con `aria-invalid` y su mensaje junto a él) o en el aviso de éxito. O evita el doble envío sin deshabilitar, con `aria-disabled` y una bandera. Recorre el error solo con teclado.

### WEB-5. Un inicio de sesión sin límite de intentos solo es tan fuerte como la contraseña más débil

`from: 0e974320` · `by: ai`

**La idea.** Un inicio de sesión que responde a cada contraseña incorrecta a toda velocidad deja que cualquiera pruebe miles por minuto. Una contraseña predeterminada fuerte esconde el problema hasta que el dueño pone la suya, y nada impide que la suya sea corta.

**Ejemplo.** En las dos corridas de la repetición de la simulación Web, la página de administración pedía contraseña y nunca limitaba los intentos fallidos: 200 contraseñas incorrectas seguidas recibieron 200 rechazos en menos de un segundo, y ninguna fue bloqueada. La contraseña predeterminada era larga y aleatoria, pero el resumen final de quien construyó el sitio le explicaba al dueño cómo poner una nueva, y nada exigía que fuera larga.

**Pregunta detectora.** ¿Cuántas contraseñas incorrectas puede probar alguien contra este inicio de sesión en un minuto, y qué pasa después de la quinta?

**Señal de alarma.** «La contraseña predeterminada es fuerte» · «es solo la página de administración».

**Qué hacer.** Frena o bloquea los fallos repetidos, por dirección y por cuenta, con una espera que crezca con cada intento. Exige una longitud mínima cuando el dueño ponga una contraseña. Pruébalo: envía veinte contraseñas incorrectas seguidas y comprueba que las últimas se rechazan.
