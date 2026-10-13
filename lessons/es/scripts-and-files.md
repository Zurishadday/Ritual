# Scripts y archivos

Lo que aplica cuando un programa escribe, genera, transforma o mueve archivos y datos.

### 6. La definición de negocio vive en un solo lugar

`from: 5286faa8` · `by: author`

**La idea.** Si la regla de «qué cuenta como activo» se repite en cada consulta, las copias van a divergir. No es si acaso, sino cuándo.

**Ejemplo.** Un validador tenía escrito a mano que existían 43 elementos de referencia. Cuando el documento llegó a 47, rechazaba como inexistentes los cuatro nuevos. Ahora cuenta los del documento.

**Pregunta detectora.** Si cambio esta definición, ¿cuántos archivos tengo que tocar? Si es más de uno, la regla no está puesta.

**Señal de alarma.** «Lo pongo aquí también, total es una línea» · «ese número no va a cambiar».

**Qué hacer.** Pon la definición en un punto que todas las consultas crucen, y haz que todas consuman de ahí. Un número escrito a mano que copia un dato de otro lugar también es una definición repetida.

**No la confundas con.** Repetir una explicación a propósito, en un material para aprender, no es copiar una definición. Lo que no se copia es la regla que calcula el dato.

### 7. Lee lo publicado, no la intención

`from: d542c959` · `by: author`

**La idea.** Un proceso declara lo que piensa hacer, pero publica lo que de verdad hizo, y no siempre coinciden. Quien consume debe leer el resultado.

**Ejemplo.** Una pantalla arma sus controles con la lista de variables que el modelo *iba* a usar. El entrenamiento descartó una, y durante días hubo un control que no movía nada.

**Pregunta detectora.** ¿Esto se construye con la configuración de un proceso o con su resultado publicado?

**Señal de alarma.** «La lista declarada y el modelo son lo mismo».

**Qué hacer.** Deriva del resultado publicado. Y lo que no se pueda derivar, que falle en voz alta en lugar de desaparecer en silencio.

### 20. Idempotente no es lo mismo que actualizable

`from: 8ddac922` · `by: author`

**La idea.** «Insertar si no existe» evita duplicados, pero congela: lo que ya está no se vuelve a escribir nunca.

**Ejemplo.** Una leyenda con los rangos de una clasificación se insertó una vez. Cambiaron los rangos y la leyenda siguió mostrando los viejos.

**Pregunta detectora.** Si cambio lo que este código inyecta, ¿la siguiente corrida lo actualiza?

**Señal de alarma.** «Ya está puesto, no lo vuelvo a tocar».

**Qué hacer.** Reemplaza: quita lo anterior, vuelve a inyectar y comprueba que quedó una sola copia.

### 21. Tu marcador debe ser tuyo

`from: e8ae4ba7` · `by: author`

**La idea.** Si ubicas tu cambio buscando un texto que el usuario lee, como un título o un rótulo, otra mejora le pegará algo encima y tu cambio dejará de encontrarlo.

**Ejemplo.** Se agregó un ícono de ayuda junto a varios títulos, y las actualizaciones que se ubicaban por esos títulos dejaron de funcionar.

**Otro ejemplo.** Una revisión buscaba el texto «int(» para saber si alguien convirtió un número, y lo encontraba dentro de «print(»: cualquier línea que mostrara algo parecía cumplir. Lo buscado tiene que ser una palabra completa, no un pedazo de otra.

**Un ejemplo más.** Una revisión tomaba la última línea que mostraba el código como su respuesta. Con una función que muestra el número por dentro y no lo devuelve, esa línea existía por otra razón: la respuesta se veía, aunque el código no la entregaba.

**Pregunta detectora.** ¿El texto que uso como ancla puede existir por otra razón, o puede crecerle algo por dentro?

**Señal de alarma.** «Me anclo en el título, que es único».

**Qué hacer.** Usa marcadores propios, como un identificador o un comentario de sección. Y cuando un cambio toca muchos bloques a la vez, revísalos todos, no solo el primero.

### 22. La segunda corrida es la que encuentra el error

`from: 56b0053e` · `by: author`

**La idea.** Un cambio que se repite sin romper nada se comprueba corriéndolo dos veces, no una.

**Ejemplo.** Para comprobar que un script no cambiaba nada en su segunda corrida, se comparó dos veces la huella de la misma corrida, y después dos huellas sacadas de listas de archivos distintas. Las dos comparaciones decían «igual» o «distinto» sin probar nada. La comparación que sirve toma la huella, corre el script y toma la huella otra vez, de los mismos archivos y en un solo comando.

**Pregunta detectora.** ¿Corrí mi cambio sobre algo que ya lo tenía aplicado? ¿Qué otro proceso toca este mismo texto después de mí?

**Señal de alarma.** «Corrió bien, ya quedó».

**Qué hacer.** Córrelo dos veces desde el mismo punto de partida y compara los archivos: la segunda corrida no debe cambiar nada.

### 23. Las direcciones por posición caducan

`from: d94e6ad5` · `by: author`

**La idea.** Si insertas algo antes de «la celda 9», la celda 9 ya es otra.

**Ejemplo.** Un script insertaba una celda de título antes de la celda 9 de un cuaderno y después editaba «la celda 9»: editó la que acababa de insertar.

**Pregunta detectora.** ¿Esta herramienta ubica las cosas por su posición, y acabo de insertar o borrar algo antes?

**Señal de alarma.** «La celda 9 es la que acabo de ver».

**Qué hacer.** Vuelve a ubicar el lugar después de cada inserción, y comprueba el resultado revisando la estructura completa.

### 24. Escribe con red

`from: f7402634` · `by: author`

**La idea.** Abrir un archivo para escribir lo vacía al instante. Si algo falla a media escritura, te quedas con un archivo vacío.

**Ejemplo.** Un script abría el archivo de configuración para reescribirlo, fallaba al calcular uno de los valores y dejaba el archivo vacío. El servidor no volvió a arrancar.

**Pregunta detectora.** ¿Puede fallar algo entre que abro el archivo y que termino de escribir?

**Señal de alarma.** «Es un reemplazo sencillo, escribo directo».

**Qué hacer.** Prepara todo en memoria, escribe a un archivo temporal y al final reemplaza el original de un solo golpe.

### 25. Un ajuste no es un estado, y un aviso no es una garantía

`from: c5f24f3e` · `by: author`

**La idea.** «La tarea programada está activada» no significa «corrió este mes». Y esperar a que algo avise cuando falla es confiar en que el aviso nunca falle.

**Ejemplo.** Una tarea programada aparecía «activa» y llevaba dos meses sin correr por una credencial vencida. El tablero mostraba el último dato como si fuera de hoy.

**Pregunta detectora.** ¿Dependo de que algo «se dispare solo»?

**Señal de alarma.** «Está programado, entonces está corriendo».

**Qué hacer.** Muestra en pantalla cuándo se actualizó el dato por última vez. Comprueba qué periodos faltan. Y haz que los procesos se puedan repetir sin duplicar filas.

### 48. Si un archivo sale de un generador, el arreglo va en el generador

`from: 17fcef8c` · `by: author`

**La idea.** Cuando un archivo se arma con un script o desde otras piezas, el archivo es una salida, no el original. Lo que se corrige directo en él se pierde la próxima vez que se genere, sin aviso.

**Ejemplo.** Una nota se armaba con las secciones que entregaba cada persona. Tres filas se corrigieron directo en la nota, y al volver a armarla desde las entregas regresaron las tres filas viejas. En otra pieza, un revisor corrigió a mano el texto alternativo de una página que salía de una plantilla; quien la escribió volvió a generarla y el arreglo desapareció.

**Pregunta detectora.** ¿Este archivo lo escribe algo más (un script, una plantilla, un armado de piezas)? Si lo vuelvo a generar, ¿mi cambio sigue ahí?

**Señal de alarma.** «Lo arreglé directo en el archivo» · «nada más lo regeneré».

**Qué hacer.** Antes de corregir un archivo, averigua de dónde sale. Corrige la fuente (la plantilla, el script, la entrega) y vuelve a generar; si tienes que corregir la salida, corrige también la fuente en el mismo paso. Quien revisa algo generado avisa qué cambió para que pase a la fuente. Y antes de rehacer un archivo desde sus fuentes, compáralo con lo que va a salir: lo que difiera es un arreglo que se perdería.

### WEB-1. Un almacenamiento dañado no debe arrastrar consigo el registro siguiente

`from: e896b1e3` · `by: ai`

**La idea.** Sin importar cómo guarde sus registros un sitio, una escritura dañada puede arrastrar también lo que viene después. Si los registros se agregan como líneas, una línea cortada a medias pega el registro siguiente a ella, y un lector que se salta las «líneas dañadas» descarta los dos, en silencio. Si todos los registros están en un solo archivo que se lee, se modifica y se vuelve a escribir completo, en cuanto ese archivo no se puede leer, cada registro nuevo falla, y solo una consola que nadie mira lo dice. Es el otro lado de la lección 24: allí se vacía el archivo; aquí se pierde lo que viene después.

**Ejemplo.** En las dos corridas de la primera simulación Web, el formulario guardaba cada mensaje como una línea JSON, y el panel de administración omitía las que no podía leer. Con una línea cortada al final del archivo, el mensaje siguiente recibió la respuesta «¡Gracias!», se guardó y nunca apareció en el panel de administración. Una de las dos versiones tenía un comentario que decía «línea dañada: se omite».

**Otro ejemplo.** En las dos corridas de la repetición, todos los mensajes vivían en un solo archivo JSON que se escribía en un archivo temporal y luego se renombraba, así que un fallo a media escritura ya no hacía daño. Pero con el archivo dañado de cualquier otra forma (una edición a mano, un disco lleno, una restauración mal hecha), cada visitante nuevo recibía «Error interno», la página de administración no mostraba nada, y la única señal era un error en la consola del servidor.

**Pregunta detectora.** Si mañana el almacenamiento se daña, ¿qué le pasa al registro del siguiente visitante, y quién se entera?

**Señal de alarma.** «Las líneas dañadas se omiten» · «es solo agregar al final» · «la escritura es atómica, así que el archivo no se puede romper».

**Qué hacer.** Haz que un registro nuevo no dependa de los anteriores: agrégalo al final de un archivo que termine en salto de línea (si no termina, empieza el registro con uno), o guarda cada registro en su propio archivo, en lugar de reescribir un archivo que los contiene todos. Al leer, cuenta lo que no se pudo leer y muestra ese número donde lo vea el dueño. Pruébalo dañando el almacenamiento a mano (corta la última línea, trunca el archivo) y después envía un registro.
