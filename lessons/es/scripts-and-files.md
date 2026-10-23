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

`from: b201fbb7` · `by: ai`

**La idea.** Si ubicas tu cambio buscando un texto que el usuario lee, como un título o un rótulo, otra mejora le pegará algo encima y tu cambio dejará de encontrarlo.

**Ejemplo.** Se agregó un ícono de ayuda junto a varios títulos, y las actualizaciones que se ubicaban por esos títulos dejaron de funcionar.

**Otro ejemplo.** Una revisión buscaba el texto «int(» para saber si alguien convirtió un número, y lo encontraba dentro de «print(»: cualquier línea que mostrara algo parecía cumplir. Un conteo de atajos de teclado buscaba «Ctrl+» seguido de una letra, sin distinguir mayúsculas, y contó Ctrl+Shift+V como «Ctrl+S»: la S era la primera letra de «Shift». Lo buscado tiene que ser una palabra completa, no un pedazo de otra.

**Un ejemplo más.** Una revisión tomaba la última línea que mostraba el código como su respuesta. Con una función que muestra el número por dentro y no lo devuelve, esa línea existía por otra razón: la respuesta se veía, aunque el código no la entregaba.

**Pregunta detectora.** ¿El texto que uso como ancla puede existir por otra razón, o puede crecerle algo por dentro?

**Señal de alarma.** «Me anclo en el título, que es único».

**Qué hacer.** Usa marcadores propios, como un identificador o un comentario de sección. Y cuando un cambio toca muchos bloques a la vez, revísalos todos, no solo el primero. Un conteo que sale de una búsqueda se revisa en sus coincidencias, no solo en el total: abre tres de ellas.

### 22. La segunda corrida es la que encuentra el error

`from: 8a1c8a92` · `by: ai`

**La idea.** Un cambio que se repite sin romper nada se comprueba corriéndolo dos veces, no una.

**Ejemplo.** Para comprobar que un script no cambiaba nada en su segunda corrida, se comparó dos veces la huella de la misma corrida, y después dos huellas sacadas de listas de archivos distintas. Las dos comparaciones decían «igual» o «distinto» sin probar nada. La comparación que sirve toma la huella, corre el script y toma la huella otra vez, de los mismos archivos y en un solo comando.

**Otro ejemplo.** Un lanzador de doble clic arrancaba dos servidores locales en puertos fijos y abría el navegador. Se probó una vez, con todo cerrado, y funcionó. Se corrió otra vez para obtener una versión nueva mientras la anterior seguía corriendo: los dos servidores nuevos fallaron con «port already in use», y el navegador se quedó en la versión vieja sin que nada lo dijera (ver la 27). Aquí la segunda corrida chocó con procesos y puertos, no con archivos.

**Pregunta detectora.** ¿Corrí mi cambio sobre algo que ya lo tenía aplicado? ¿Qué otro proceso toca este mismo texto después de mí? ¿Qué pasa si lo vuelvo a iniciar mientras la primera corrida sigue viva?

**Señal de alarma.** «Corrió bien, ya quedó».

**Qué hacer.** Córrelo dos veces desde el mismo punto de partida y compara los archivos: la segunda corrida no debe cambiar nada. Prueba un lanzador iniciándolo otra vez sin cerrar la corrida anterior. Antes de iniciar nada, el lanzador detiene solo sus propios procesos (los encuentra por su nombre de proceso o por el título de su ventana, nunca por «lo que esté en el puerto»), y avisa si otro programa ocupa el puerto.

### 23. Las direcciones por posición caducan

`from: 9c3d3e62` · `by: ai`

**La idea.** Si insertas algo antes de «la celda 9», la celda 9 ya es otra.

**Ejemplo.** Un script insertaba una celda de título antes de la celda 9 de un cuaderno y después editaba «la celda 9»: editó la que acababa de insertar.

**Otro ejemplo.** Una marca que apunta a algo dibujado (una caja, una flecha, un resaltado) también es una dirección por posición. Un video hecho con código redibujó una celda de código con un diseño nuevo y más ancho. La caja alrededor del resultado tenía `x = 150` escrito a mano, de la celda vieja, y quedó cruzando dos columnas de la tabla de resultados. Quien vio el video completo lo notó; el revisor de cuadros fijos lo había pasado.

**Pregunta detectora.** ¿Esta herramienta ubica las cosas por su posición, y acabo de insertar o borrar algo antes? ¿Una marca sale de lo que marca, o de coordenadas escritas a mano?

**Señal de alarma.** «La celda 9 es la que acabo de ver» · «Solo cambió el estilo, las marcas son las mismas».

**Qué hacer.** Vuelve a ubicar el lugar después de cada inserción, y comprueba el resultado revisando la estructura completa. Haz que una sola función devuelva la caja de cada cosa dibujada, y pide a esa función cada marca. Después de un redibujo, busca en el código los números de posición sueltos.

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

### 56. Una actualización incremental no es reconstruir todo: revisa lo que elimina

`from: 9ffb2735` · `by: ai`

**La idea.** Una actualización que procesa solo lo que cambió no da el mismo resultado que una reconstrucción completa. Cuando reemplaza todo lo que vino de un archivo releído, también elimina lo que otros archivos aportaron a esas mismas entradas. Antes de aceptar que algo desaparece, lista lo que se pierde y de qué archivo venía.

**Ejemplo.** Un grafo de conocimiento de un repositorio se actualizó solo con los archivos cambiados. Un guardia que impide que el grafo se encoja lo detuvo dos veces. Primero, nodos que solo compartían una etiqueta se fundieron en uno (ver la lección 2). Luego, al reemplazar los nodos de un archivo releído, también se borraron los nodos a los que apuntaban otros archivos: diez entradas que debían mostrar su propio título mostraban la etiqueta genérica de un nodo viejo.

**Pregunta detectora.** ¿Qué había antes y ya no está, y de qué archivo venía cada cosa perdida?

**Señal de alarma.** «Es la misma corrida, solo que con los archivos nuevos».

**Qué hacer.** Compara antes y después por identificador, y guarda la lista de lo perdido con su archivo de origen. Fuerza la escritura solo si cada pérdida se explica por un cambio en su propio archivo de origen, y pon el arreglo en el script que fusiona, no en la salida. Una reconstrucción completa hace la misma comparación (ver la lección 48).

### 61. Una función auxiliar que adivina la intención por la forma de sus argumentos

`from: 4248a8c5` · `by: ai`

**La idea.** Una función que decide qué hacer según si se le pasó un argumento (con cuerpo es POST, sin cuerpo es GET; con un id actualiza, sin id inserta) convierte una omisión en otra operación, sin ningún error.

**Ejemplo.** Una función auxiliar del front-end para llamar al servidor enviaba POST cuando recibía datos y GET cuando no. Un nuevo endpoint era POST pero no necesitaba datos; se llamó sin ninguno, salió como GET, y el servidor respondió «método no permitido». La pantalla solo mostró una línea breve de error, y se notó recién al probar en el navegador.

**Pregunta detectora.** ¿Esta función cambia de operación según un argumento opcional? Si lo omito porque no lo necesito, ¿hace en silencio otra cosa?

**Señal de alarma.** «Este no recibe datos, lo llamo sin nada».

**Qué hacer.** Haz explícita la operación (`api.post(path)`, `save(x, create=True)`), o haz que el valor por defecto sea el caso seguro. Mientras exista la función auxiliar ambigua, revisa cada llamada que omite ese argumento.

### 63. Antes de limpiar en masa algo que nadie guardó, guárdalo tal como está

`from: 8f7e7662` · `by: ai`

**La idea.** Los archivos recién generados (datos, reportes, la salida de un agente) suelen no estar todavía bajo control de versiones. Si el siguiente paso los reescribe en masa (quitar duplicados, cambiar etiquetas, borrar líneas) y borra de más, no hay vuelta atrás al original. La lección 24 protege una escritura que falla a medio camino; esta protege contra una limpieza que funciona y está mal.

**Ejemplo.** Siete agentes escribieron 3,780 oraciones de entrenamiento en archivos nuevos. El siguiente paso era limpiarlas: quitar las demasiado parecidas al conjunto de prueba y los duplicados entre archivos. Los archivos todavía no estaban en git. Antes de que corriera la reescritura, el sistema de permisos la bloqueó por irreversible, y tenía razón. Las 3,780 se guardaron primero en un commit, y la limpieza (73 líneas quitadas, 1 con etiqueta cambiada) fue a su propio commit, que se puede revisar y revertir.

**Pregunta detectora.** ¿Lo que voy a reescribir está guardado en algún lado en su estado actual? Si mi limpieza borra de más, ¿de dónde lo recupero?

**Señal de alarma.** «Son archivos nuevos, los limpio de una vez».

**Qué hacer.** Primero un commit (o una copia) del estado original. Luego la limpieza en su propio commit, con un conteo de lo que se quitó y por qué (ver la 56), para que el cambio se pueda revisar línea por línea y deshacer.

### 66. Un script nuevo hereda la configuración que el proyecto ya usa

`from: 6a79105c` · `by: ai`

**La idea.** Si el proyecto ya carga una biblioteca en otro script con una configuración especial (rutas de librerías nativas, variables de entorno, dispositivo, versión del modelo), un script nuevo que la use necesita esa misma configuración. Escribirlo desde cero repite un problema que el proyecto ya resolvió.

**Ejemplo.** Un script desechable para transcribir en GPU falló con una DLL de CUDA que faltaba. El script de dataset del proyecto ya resolvía eso agregando la carpeta de bibliotecas del framework de deep learning a la ruta de búsqueda de DLL antes de importar la biblioteca de reconocimiento de voz; el script nuevo no la copió.

**Pregunta detectora.** ¿Esta biblioteca ya se carga en otro script del proyecto? ¿Qué hace ese script justo antes de importarla o crearla?

**Señal de alarma.** «Es un script de cinco líneas, no necesito ver cómo lo hace el otro».

**Qué hacer.** Antes de escribir un script que use una biblioteca del proyecto, busca dónde ya se carga y copia su configuración, o mejor, importa el cargador del proyecto, para que la configuración viva en un solo lugar (ver la 6). Si aparece un error de carga, búscalo primero en el código del proyecto, antes de investigar por fuera.

### 67. Un valor ajustado en una muestra no sirve para todas las muestras

`from: c4c22bc2` · `by: ai`

**La idea.** Un ajuste elegido probándolo en una muestra (un umbral, un corte, una ganancia) se ajusta a esa muestra. Cuando llega una más fuerte, más larga o más rara, el mismo número ya no da el resultado que se aprobó.

**Ejemplo.** Las respiraciones de una voz generada se bajaron 18 dB; en una muestra de 15 s quedaron inaudibles y el usuario lo aprobó. En la lección completa el modelo respiraba más fuerte, y cuatro respiraciones seguían audibles. Antes de cortar más fuerte, se revisó cada una: tres no eran respiraciones sino la «s» final de palabras, que el detector había confundido (ver la 13), y cortar a −35 dB hacía que la transcripción perdiera la «s».

**Pregunta detectora.** ¿En cuántas muestras, y en cuáles extremas, se eligió este número? ¿Describe el resultado que quiero, o un paso que solo dio ese resultado en la muestra?

**Señal de alarma.** «Quedó perfecto en la muestra, aplícalo igual a todo» · «quedan unos cuantos, corta más fuerte».

**Qué hacer.** Elige el valor con los extremos, no con una sola muestra: el más fuerte, el más largo, el caso más raro. Cuando se pueda, escríbelo como el resultado que quieres, con límites («terminar en −61 dBFS, cortando entre 18 y 35 dB»), en lugar de como un paso fijo. Cuando algo sobrevive al ajuste, mira cada caso antes de apretarlo: puede que no sea lo que el ajuste busca.

### 68. Un paso que lee más allá de un borde va antes del paso que lo corta

`from: 1e65549b` · `by: ai`

**La idea.** Algunos pasos necesitan material más allá del borde de lo que procesan: una reverberación o un eco prolonga un sonido más allá de su final, y un filtro de suavizado o un promedio móvil lee a los vecinos de cada punto. Puestos después de un recorte, un fundido o un filtro, no encuentran nada que leer, y el resultado sale igual, o mal en los bordes.

**Ejemplo.** Para que las frases de narración se desvanecieran más natural, se probó una reverberación ligera. Se aplicó a frases ya recortadas y desvanecidas: la cola de la reverberación quedó entre 8 y 30 dB por debajo del fondo, inaudible, y la prueba no cambió nada.

**Pregunta detectora.** ¿Este paso necesita material que queda más allá del punto donde ya corté, desvanecí o filtré? ¿En qué lugar de la cadena lo estoy poniendo?

**Señal de alarma.** «Agrego el efecto al final, sobre lo que ya está hecho».

**Qué hacer.** Antes de agregar un paso a una cadena de procesamiento, escribe qué necesita de entrada y qué deja de salida, y ponlo donde su entrada todavía exista. Luego comprueba que cambió la salida (ver la 50) antes de pedirle a alguien que lo mire o lo escuche.

### VIDEO-3. Pegar clips sobre silencio digital deja al descubierto su ruido de fondo

`from: 1bd2ffe3` · `by: ai`

**La idea.** Cuando se colocan piezas de audio sobre una línea de tiempo de ceros, cada pieza trae su propio ruido de fondo, y los huecos son silencio absoluto. El oído escucha el fondo prenderse y apagarse en cada corte. Un fondo puesto debajo de los huecos solo lo oculta si coincide con las piezas en nivel y en sonido, y aun uno que coincide puede escucharse como un siseo constante.

**Ejemplo.** La narración de una lección se armó colocando cada frase generada sobre ceros. Con una voz limpia (piso de ruido −83 dB) no se escuchaba nada; con una voz clonada que traía ruido de sala (−48 dB), el usuario escuchó un silencio repentino en los 17 cortes. Después, un relleno a −63 dB bajo una voz con piso de −58 dB dejó escalones, y uno a −58 dB se escuchó como un siseo tenue y constante.

**Pregunta detectora.** ¿Cuál es el piso de ruido dentro de cada pieza, y entre piezas? ¿Coinciden en nivel y en sonido, o el corte cambia alguno de los dos?

**Señal de alarma.** «El hueco está en silencio, no puede quedar más limpio» · «le pongo un fondo y listo».

**Qué hacer.** Mide el piso de las piezas antes de unirlas. Si es tan bajo como los huecos (aquí, la voz limpia a −83 dB no mostró costuras), deja los huecos en silencio. Si no, limpia las piezas hacia ese nivel antes de unirlas; si en cambio pones un fondo bajo los huecos, tómalo de las propias piezas a su nivel y escucha el conjunto completo con audífonos antes de quedarte con él. Revisa la salida por saltos de nivel en cada corte. De dónde salió el ruido está en la lección AI-3.

### WEB-1. Un almacenamiento dañado no debe arrastrar consigo el registro siguiente

`from: e896b1e3` · `by: ai`

**La idea.** Sin importar cómo guarde sus registros un sitio, una escritura dañada puede arrastrar también lo que viene después. Si los registros se agregan como líneas, una línea cortada a medias pega el registro siguiente a ella, y un lector que se salta las «líneas dañadas» descarta los dos, en silencio. Si todos los registros están en un solo archivo que se lee, se modifica y se vuelve a escribir completo, en cuanto ese archivo no se puede leer, cada registro nuevo falla, y solo una consola que nadie mira lo dice. Es el otro lado de la lección 24: allí se vacía el archivo; aquí se pierde lo que viene después.

**Ejemplo.** En las dos corridas de la primera simulación Web, el formulario guardaba cada mensaje como una línea JSON, y el panel de administración omitía las que no podía leer. Con una línea cortada al final del archivo, el mensaje siguiente recibió la respuesta «¡Gracias!», se guardó y nunca apareció en el panel de administración. Una de las dos versiones tenía un comentario que decía «línea dañada: se omite».

**Otro ejemplo.** En las dos corridas de la repetición, todos los mensajes vivían en un solo archivo JSON que se escribía en un archivo temporal y luego se renombraba, así que un fallo a media escritura ya no hacía daño. Pero con el archivo dañado de cualquier otra forma (una edición a mano, un disco lleno, una restauración mal hecha), cada visitante nuevo recibía «Error interno», la página de administración no mostraba nada, y la única señal era un error en la consola del servidor.

**Pregunta detectora.** Si mañana el almacenamiento se daña, ¿qué le pasa al registro del siguiente visitante, y quién se entera?

**Señal de alarma.** «Las líneas dañadas se omiten» · «es solo agregar al final» · «la escritura es atómica, así que el archivo no se puede romper».

**Qué hacer.** Haz que un registro nuevo no dependa de los anteriores: agrégalo al final de un archivo que termine en salto de línea (si no termina, empieza el registro con uno), o guarda cada registro en su propio archivo, en lugar de reescribir un archivo que los contiene todos. Al leer, cuenta lo que no se pudo leer y muestra ese número donde lo vea el dueño. Pruébalo dañando el almacenamiento a mano (corta la última línea, trunca el archivo) y después envía un registro.
