# Scripts y archivos

Lo que aplica cuando un programa escribe, genera, transforma o mueve archivos y datos.

### 6. La definición de negocio vive en un solo lugar

`origen: campo`

**La idea.** Si la regla de «qué cuenta como activo» se repite en cada consulta, las copias van a divergir. No es si acaso, sino cuándo.

**Ejemplo.** Un validador tenía escrito a mano que existían 43 elementos de referencia. Cuando el documento llegó a 47, rechazaba como inexistentes los cuatro nuevos. Ahora cuenta los del documento.

**Pregunta detectora.** Si cambio esta definición, ¿cuántos archivos tengo que tocar? Si es más de uno, la regla no está puesta.

**Señal de alarma.** «Lo pongo aquí también, total es una línea» · «ese número no va a cambiar».

**Qué hacer.** Pon la definición en un punto que todas las consultas crucen, y haz que todas consuman de ahí. Un número escrito a mano que copia un dato de otro lugar también es una definición repetida.

**No la confundas con.** Repetir una explicación a propósito, en un material para aprender, no es copiar una definición. Lo que no se copia es la regla que calcula el dato.

### 7. Lee lo publicado, no la intención

`origen: campo`

**La idea.** Un proceso declara lo que piensa hacer, pero publica lo que de verdad hizo, y no siempre coinciden. Quien consume debe leer el resultado.

**Ejemplo.** Una pantalla arma sus controles con la lista de variables que el modelo *iba* a usar. El entrenamiento descartó una, y durante días hubo un control que no movía nada.

**Pregunta detectora.** ¿Esto se construye con la configuración de un proceso o con su resultado publicado?

**Señal de alarma.** «La lista declarada y el modelo son lo mismo».

**Qué hacer.** Deriva del resultado publicado. Y lo que no se pueda derivar, que falle en voz alta en lugar de desaparecer en silencio.

### 20. Idempotente no es lo mismo que actualizable

`origen: campo`

**La idea.** «Insertar si no existe» evita duplicados, pero congela: lo que ya está no se vuelve a escribir nunca.

**Ejemplo.** Una leyenda con los rangos de una clasificación se insertó una vez. Cambiaron los rangos y la leyenda siguió mostrando los viejos.

**Pregunta detectora.** Si cambio lo que este código inyecta, ¿la siguiente corrida lo actualiza?

**Señal de alarma.** «Ya está puesto, no lo vuelvo a tocar».

**Qué hacer.** Reemplaza: quita lo anterior, vuelve a inyectar y comprueba que quedó una sola copia.

### 21. Tu marcador debe ser tuyo

`origen: campo`

**La idea.** Si ubicas tu cambio buscando un texto que el usuario lee, como un título o un rótulo, otra mejora le pegará algo encima y tu cambio dejará de encontrarlo.

**Ejemplo.** Se agregó un ícono de ayuda junto a varios títulos, y las actualizaciones que se ubicaban por esos títulos dejaron de funcionar.

**Otro ejemplo.** Una revisión buscaba el texto «int(» para saber si alguien convirtió un número, y lo encontraba dentro de «print(»: cualquier línea que mostrara algo parecía cumplir. Lo buscado tiene que ser una palabra completa, no un pedazo de otra.

**Un ejemplo más.** Una revisión tomaba la última línea que mostraba el código como su respuesta. Con una función que muestra el número por dentro y no lo devuelve, esa línea existía por otra razón: la respuesta se veía, aunque el código no la entregaba.

**Pregunta detectora.** ¿El texto que uso como ancla puede existir por otra razón, o puede crecerle algo por dentro?

**Señal de alarma.** «Me anclo en el título, que es único».

**Qué hacer.** Usa marcadores propios, como un identificador o un comentario de sección. Y cuando un cambio toca muchos bloques a la vez, revísalos todos, no solo el primero.

### 22. La segunda corrida es la que encuentra el error

`origen: campo`

**La idea.** Un cambio que se repite sin romper nada se comprueba corriéndolo dos veces, no una.

**Ejemplo.** Para comprobar que un script no cambiaba nada en su segunda corrida, se comparó dos veces la huella de la misma corrida, y después dos huellas sacadas de listas de archivos distintas. Las dos comparaciones decían «igual» o «distinto» sin probar nada. La comparación que sirve toma la huella, corre el script y toma la huella otra vez, de los mismos archivos y en un solo comando.

**Pregunta detectora.** ¿Corrí mi cambio sobre algo que ya lo tenía aplicado? ¿Qué otro proceso toca este mismo texto después de mí?

**Señal de alarma.** «Corrió bien, ya quedó».

**Qué hacer.** Córrelo dos veces desde el mismo punto de partida y compara los archivos: la segunda corrida no debe cambiar nada.

### 23. Las direcciones por posición caducan

`origen: campo`

**La idea.** Si insertas algo antes de «la celda 9», la celda 9 ya es otra.

**Ejemplo.** Un script insertaba una celda de título antes de la celda 9 de un cuaderno y después editaba «la celda 9»: editó la que acababa de insertar.

**Pregunta detectora.** ¿Esta herramienta ubica las cosas por su posición, y acabo de insertar o borrar algo antes?

**Señal de alarma.** «La celda 9 es la que acabo de ver».

**Qué hacer.** Vuelve a ubicar el lugar después de cada inserción, y comprueba el resultado revisando la estructura completa.

### 24. Escribe con red

`origen: campo`

**La idea.** Abrir un archivo para escribir lo vacía al instante. Si algo falla a media escritura, te quedas con un archivo vacío.

**Ejemplo.** Un script abría el archivo de configuración para reescribirlo, fallaba al calcular uno de los valores y dejaba el archivo vacío. El servidor no volvió a arrancar.

**Pregunta detectora.** ¿Puede fallar algo entre que abro el archivo y que termino de escribir?

**Señal de alarma.** «Es un reemplazo sencillo, escribo directo».

**Qué hacer.** Prepara todo en memoria, escribe a un archivo temporal y al final reemplaza el original de un solo golpe.

### 25. Un ajuste no es un estado, y un aviso no es una garantía

`origen: campo`

**La idea.** «La tarea programada está activada» no significa «corrió este mes». Y esperar a que algo avise cuando falla es confiar en que el aviso nunca falle.

**Ejemplo.** Una tarea programada aparecía «activa» y llevaba dos meses sin correr por una credencial vencida. El tablero mostraba el último dato como si fuera de hoy.

**Pregunta detectora.** ¿Dependo de que algo «se dispare solo»?

**Señal de alarma.** «Está programado, entonces está corriendo».

**Qué hacer.** Muestra en pantalla cuándo se actualizó el dato por última vez. Comprueba qué periodos faltan. Y haz que los procesos se puedan repetir sin duplicar filas.

### 48. Si un archivo sale de un generador, el arreglo va en el generador

`origen: campo`

**La idea.** Cuando un archivo se arma con un script o desde otras piezas, el archivo es una salida, no el original. Lo que se corrige directo en él se pierde la próxima vez que se genere, sin aviso.

**Ejemplo.** Una nota se armaba con las secciones que entregaba cada persona. Tres filas se corrigieron directo en la nota, y al volver a armarla desde las entregas regresaron las tres filas viejas. En otra pieza, un revisor corrigió a mano el texto alternativo de una página que salía de una plantilla; quien la escribió volvió a generarla y el arreglo desapareció.

**Pregunta detectora.** ¿Este archivo lo escribe algo más (un script, una plantilla, un armado de piezas)? Si lo vuelvo a generar, ¿mi cambio sigue ahí?

**Señal de alarma.** «Lo arreglé directo en el archivo» · «nada más lo regeneré».

**Qué hacer.** Antes de corregir un archivo, averigua de dónde sale. Corrige la fuente (la plantilla, el script, la entrega) y vuelve a generar; si tienes que corregir la salida, corrige también la fuente en el mismo paso. Quien revisa algo generado avisa qué cambió para que pase a la fuente. Y antes de rehacer un archivo desde sus fuentes, compáralo con lo que va a salir: lo que difiera es un arreglo que se perdería.

### WEB-1. En un archivo que solo crece, una línea rota se lleva también la siguiente

`origen: laboratorio · sonnet · 2026-10` · `paquetes: web`

**La idea.** Guardar cada registro como una línea al final de un archivo es sencillo y aguanta muchos a la vez. Pero si una escritura se corta, la línea queda sin su salto y el registro siguiente se pega a ella. Saltarse «las líneas dañadas» al leer se lleva los dos, en silencio. Es la otra cara de la 24: ahí se vacía el archivo; aquí se pierde lo que llega después.

**Ejemplo.** En las dos corridas de la simulación Web, el formulario guardaba cada mensaje como una línea JSON, y la administración omitía las que no podía leer. Con una línea cortada al final del archivo, el mensaje siguiente respondió «¡Gracias!», quedó guardado y nunca apareció en la administración. Una de las dos versiones decía en un comentario «línea dañada: se omite».

**Pregunta detectora.** Si la última escritura quedó a medias, ¿qué le pasa a la siguiente? ¿Lo que mi lector omite le avisa a alguien?

**Señal de alarma.** «Las líneas dañadas se omiten» · «es solo agregar al final».

**Qué hacer.** Antes de agregar, si el archivo no termina en salto de línea, empieza el registro con uno; o guarda cada registro en su propio archivo. Al leer, cuenta las líneas que no se pudieron leer y muéstralo donde lo vea el dueño. Pruébalo dejando una línea cortada a mano y enviando un registro después.
