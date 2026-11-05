# Consola y herramientas

Lo que aplica cuando corres comandos, servidores, pruebas o capturas, y cuando la herramienta se interpone entre tú y el sistema.

### 27. Antes de dudar del sistema, duda del instrumento

`from: 82624501` · `by: ai`

**La idea.** Si un número no cambió cuando debía, o cambió justo cuando lo mirabas, sospecha en este orden: la caché, otro proceso que escribe en la misma tabla, la herramienta con la que miras, y solo al final el sistema.

**Ejemplo.** Una tabla «perdió la mitad de sus columnas». Minutos después estaba completa: la estabas viendo mientras otro proceso la reconstruía.

**Otro ejemplo.** Una imagen nueva «no cargaba» en la página. El archivo estaba bien: el servidor de pruebas no veía las carpetas creadas después de arrancar. Un servidor que se estaba midiendo seguía respondiendo con el código viejo: al detener su tarea, el proceso anterior había quedado vivo en el mismo puerto. Y un `git log` entre dos versiones de un plugin instalado falló con «unknown revision»: la copia local era superficial y tenía un solo commit, y el historial estaba solo en el remoto.

**Un ejemplo más.** Un script «calculaba mal» un patrón de texto. El script estaba bien: la consola por la que se le pasó el código convirtió cada `\n` en un salto de línea real antes de que el script lo leyera. Y en un cuaderno donde las celdas comparten memoria, un error que debía aparecer no salió: la variable seguía guardada de una celda anterior.

**Un cuarto ejemplo.** Justo después de desplegar una página en un servidor de pruebas, una comprobación automática reportó 528 px de desbordamiento horizontal y advertencias de accesibilidad; segundos después todo pasaba. El sitio seguía sirviendo la hoja de estilos anterior. Pasó dos veces, hasta que la comprobación esperó por el archivo nuevo.

**Pregunta detectora.** ¿Estoy mirando el sistema, o una caché, una copia o una herramienta que guardó una foto vieja de él o lo cambió en el camino?

**Señal de alarma.** «Ya lo arreglé y sigue igual» · «esta vez sí lo escribí bien» · «acabo de desplegarlo, ya puedo revisar».

**Qué hacer.** Toma una segunda foto unos minutos después, antes de declarar una catástrofe. Si un instrumento ya te falló de la misma forma, cámbialo en lugar de vigilarlo: un tropiezo repetido no es mala suerte, es la herramienta equivocada. Una consola que transforma `\n` o `\\` en el camino no sirve para pasarle código: el código va en un archivo, escrito con una herramienta que no lo toque, y se corre desde ahí. Y lo que es mecánico (un comando que ya falló tres veces) se bloquea con un guardia, no se recuerda. Antes de medir un servidor, revisa qué proceso ocupa su puerto. Antes de leer el historial de una copia, revisa si es superficial (`git rev-parse --is-shallow-repository`), y si lo es, pregunta al remoto. Después de un despliegue, espera hasta que el sitio sirva una marca que solo tiene esta versión (una clase, un texto, una consulta `?v=`), en un bucle con un límite de intentos, antes de medir.

### 29. Verifica el comando antes de pasárselo a otro

`from: 730b276c` · `by: ai`

**La idea.** Quien ejecuta un comando ajeno lo hace a ciegas. Cada comando roto le gasta la confianza que le tendrá al siguiente.

**Ejemplo.** Un comando de despliegue traía el nombre de una rama escrito de memoria. La rama se llamaba distinto, y quien lo corrió perdió media hora antes de preguntar.

**Otro ejemplo.** Para ver un cambio, a una persona le pasaron `cd folder && npx next dev -p 3001`. Su terminal era Windows PowerShell 5.1, que rechaza `&&`. Arreglado y arrancado desde su propia terminal, el servidor respondía «not found»: las páginas a revisar solo se muestran con una variable de entorno que el comando no había puesto.

**Pregunta detectora.** Cada nombre dentro de este comando, ¿lo leí hoy del sistema o lo escribí de memoria? ¿En qué shell y en qué carpeta lo van a correr, y lo corrí así?

**Señal de alarma.** «Es el mismo comando de siempre» · `&&`, `export` o `$VAR` en un comando para Windows PowerShell.

**Qué hacer.** Córrelo tú antes de pasarlo, y copia cada nombre (script, ruta, rama) del sistema, no de la memoria. Escríbelo en su shell (en PowerShell 5.1: `;` y `$env:NAME = 'value'`), y antes de pasar un enlace, pide esa dirección exacta y mira que responda lo esperado. Si lo arrancas para otra persona, arráncalo en su propia terminal, no como hijo de tu llamada a la herramienta (lección 69).

### 44. Lo que recortas de la salida puede ser el veredicto

`from: c24ec5bb` · `by: ai`

**La idea.** Mirar solo las últimas líneas de un resultado, o pasarlo por otro comando, puede tirar justo la parte que decía «falló». Una salida recortada de una prueba que falló se ve igual que la de una que pasó.

**Ejemplo.** Una página se marcó como revisada porque su prueba «terminó sin errores». El resultado pasaba por un comando que mostraba solo el final, y el aviso de que la prueba había fallado se perdió en el camino.

**Otro ejemplo.** Una suite de pruebas reintentaba sola cada prueba que fallaba. Las que pasaban al segundo intento no contaban como falla, solo como «inestables», y la causa quedó escondida: cada cambio de paso volvía a pedir la página al servidor. Sin reintentos, la falla apareció y se pudo medir. En otra suite, una comprobación falló una vez y pasó al repetirla: la repetición sobrescribió la traza de la primera falla, y su causa se perdió. Y una suite terminó con código de salida 0 y sin conteo de aprobadas ni fallidas: su salida completa se había guardado dentro de la carpeta que el ejecutor de pruebas vacía al arrancar, así que la herramienta que escribe el veredicto la había borrado.

**Un ejemplo más.** `npm test 2>&1 | tail -4 && git commit …`: un script no se pudo cargar, la prueba terminó con error, y aun así el commit se hizo, porque el `&&` vio el código de salida de `tail`, que siempre es cero. En otro caso, `Select-Object -First 1` cortó un script en cuanto tuvo su primera línea, así que nunca llegó a su limpieza, y se quedó una copia modificada de un archivo.

**Pregunta detectora.** ¿Estoy leyendo el veredicto (cuántas pasaron, cuántas fallaron, cómo terminó) o solo un pedazo de la salida? ¿Y qué decide el siguiente paso: el código de salida de la prueba, o el del comando que la recorta?

**Señal de alarma.** «No salió ningún error en pantalla» · «con las últimas líneas basta» · «lo encadeno para que sea un solo comando».

**Qué hacer.** Busca la línea del veredicto antes de cambiar un estado. Si encadenas comandos, haz que el fallo del primero llegue hasta el final. Si la salida no trae veredicto, eso es un «no sé», no un «pasó» (ver la 1). Y guarda la salida completa en un archivo y busca ahí el veredicto: así no tienes que decidir antes cuánto leer. En un shell, `set -o pipefail` hace que una tubería falle cuando falla la prueba; y nunca cortes a la mitad un script que limpia lo que deja tras de sí. Guarda el archivo con la salida completa fuera de cualquier carpeta que la herramienta vacía al arrancar. Antes de volver a correr una prueba fallida, copia la traza y la captura de la primera falla a un lugar que la siguiente corrida no toque.

### 53. El código pasa por el editor, no por el manejo de texto de la consola

`from: 34503dce` · `by: ai`

**La idea.** Reescribir un archivo de código con las herramientas de texto de la consola (leerlo, reemplazar y volver a escribirlo) pasa el código por reglas hechas para otra cosa: la codificación por defecto, la precedencia de operadores, las comillas y los escapes. El cambio se ve bien en el comando, y el archivo sale distinto de lo que el comando parece decir.

**Ejemplo.** Dos ediciones en una misma sesión, las dos en Windows PowerShell 5.1. Una lectura, reemplazo y escritura de un script (`Get-Content`, `-replace`, `Set-Content -Encoding utf8`) leyó el archivo en la página de códigos ANSI del sistema y lo escribió de vuelta como UTF-8: cada ✓ y · del archivo se volvió `âœ“` y `Â·`, y su autoverificación imprimió la marca dañada. Luego, una lista de reemplazos escrita como ``@('old', 'new' + "`n" + 'more')`` perdió líneas: en PowerShell la coma liga más fuerte que `+`, así que cada par se volvió cuatro elementos y solo se escribió el primer pedazo del texto nuevo.

**Pregunta detectora.** ¿Este cambio de código pasa por el editor, o por la lectura, el reemplazo y la escritura de la consola, con sus reglas de codificación, precedencia y comillas?

**Señal de alarma.** «Es un reemplazo rápido, lo hago en un solo comando» · «varios reemplazos a la vez es más rápido».

**Qué hacer.** Cambia el código con las herramientas de editar y escribir del propio editor. Cuando el cambio tenga que hacerse con un script, escribe el script en un archivo y córrelo con un intérprete que lea y escriba UTF-8 y tenga literales de cadena simples (`node fix.mjs`, `python -I fix.py`). Luego revisa el diff: un cambio que tocó más líneas de las que querías, o caracteres que no tocaste, es culpa de la consola.

### 60. Lo que viaja como argumento de un proceso tiene un techo que no se ve hasta que crece

`from: c0be3e59` · `by: ai`

**La idea.** Una biblioteca que lanza otro programa puede pasarle tu texto como argumentos de línea de comandos. El sistema operativo limita esa línea (en Windows, unos 32 000 caracteres), y el error que obtienes al cruzarla casi nunca lo dice.

**Ejemplo.** Un servidor llamaba a un modelo de lenguaje mediante una biblioteca que inicia una herramienta de línea de comandos y le pasa un texto de configuración largo como opción. Con textos cortos funcionaba. El texto de configuración de un rol incluía un archivo de reglas de varias páginas: en Windows fallaba con «el nombre de archivo o la extensión es demasiado largo», y la biblioteca lo reportaba como «herramienta no encontrada». Se arregló pasando ese texto en un archivo temporal.

**Pregunta detectora.** Este texto que crece con el contenido (un texto de configuración, una lista, una consulta): ¿cómo llega al otro proceso, por línea de comandos, variable de entorno o URL? ¿Qué pasa cuando es diez veces más largo?

**Señal de alarma.** «Ya funcionaba con el ejemplo corto».

**Qué hacer.** Todo lo que pueda crecer viaja en un archivo, por la entrada estándar o en el cuerpo de una petición, nunca como argumentos, variables de entorno ni en la URL. Prueba una vez con el texto más largo que esperas, en el sistema más estricto donde vaya a correr.

### 62. Parar un trabajo en segundo plano es parar lo que lo lanza, y luego comprobar que no queda nada

`from: 9276f71e` · `by: ai`

**La idea.** El trabajo largo en segundo plano suele tener un lanzador (un script que corre los pasos uno tras otro) y procesos hijos (cada paso). Si matas solo al hijo, el lanzador arranca el siguiente paso; la GPU, el disco o la red siguen ocupados mientras tú reportas «quedó detenido».

**Ejemplo.** Un usuario pidió detener un entrenamiento de modelo que corría desde la noche. Se detuvo primero el agente que lo había lanzado, y luego el proceso de Python que entrenaba. Una comprobación encontró otro proceso de Python entrenando con un PID nuevo: el script lanzador había pasado al siguiente paso. Hizo falta encontrar todo el árbol de procesos, cerrar el lanzador y un `tail -f` que seguía el registro, y confirmar con `nvidia-smi` qué seguía usando la GPU.

**Pregunta detectora.** ¿Quién lanzó este proceso, y lo volverá a lanzar si lo cierro? Después de detenerlo, ¿qué comando demuestra que nada mío sigue corriendo?

**Señal de alarma.** «Maté el proceso, ya está detenido».

**Qué hacer.** Cierra todo el árbol desde el lanzador (`taskkill /t /f` en Windows, matar el grupo de procesos en Unix). Luego busca en los procesos en ejecución, por línea de comandos, cualquier cosa que quede de ese trabajo, y revisa el recurso (GPU, puerto, bloqueo de archivo) hasta que esté libre; di «detenido» solo después de esa comprobación (ver la 38). Por diseño, dale al trabajo una parada limpia (un archivo `STOP` que revisa antes de cada paso), y haz que el lanzador se detenga cuando se mate un paso, en lugar de pasar al siguiente.

### 69. Un proceso que lanzas desde una herramienta de vida corta muere cuando la herramienta termina

`from: 7870a42f` · `by: ai`

**La idea.** Un servidor o un programa de larga duración lanzado desde un comando que termina (la llamada de una herramienta de un asistente, un paso de CI, una sesión remota) suele quedar como hijo de ese comando. Cuando el comando termina, la herramienta o el ejecutor suele cerrar todo lo que arrancó (su grupo de procesos, su trabajo o su sesión). Lo viste arrancar y responder; un minuto después ya no está, y nada te avisa.

**Ejemplo.** La app local de una persona seguía corriendo una versión vieja. Para darle la nueva, se relanzó el script de inicio de la app desde la herramienta de comandos del asistente; se vio el servidor respondiendo en su puerto, y se le dijo a la persona «ya está en la versión nueva». La llamada de la herramienta terminó, el sistema cerró los procesos que había abierto, y la persona se quedó sin app. Se notó media hora después, cuando un agente no encontró nada escuchando en los puertos.

**Pregunta detectora.** ¿De quién es hijo lo que acabo de arrancar, y sigue vivo cuando ese padre termina? ¿Lo revisé después de que terminó la herramienta, o solo mientras corría?

**Señal de alarma.** «Lo reinicié, responde en el puerto».

**Qué hacer.** Lo que una persona usa a diario, lo arranca ella misma, con su propio acceso directo o servicio. Si tienes que arrancarlo, sepáralo del padre (un modo de segundo plano que sobreviva al comando, un servicio del sistema) y revisa en una llamada aparte, después, que siga vivo. Si no puedes garantizarlo, no digas que está listo: pide que lo abran ellos. Detener este tipo de trabajo es ver la 62; arrancarlo dos veces, ver la 22.

### 78. Lo que encuentra el shell, quizá no lo encuentre un programa

`from: 8b07c6d7` · `by: ai`

**La idea.** Un nombre de comando que funciona en el shell puede fallar cuando un programa lo lanza: el shell resuelve atajos (archivos por lotes, alias, funciones) que una llamada directa del sistema no conoce, y entonces se ejecuta otro programa con el mismo nombre, o ninguno.

**Ejemplo.** Un script de Node llamaba a `python` para generar audio. En el shell, `python` era un atajo de un administrador de versiones (un archivo `.bat`); desde Node, sin shell, el sistema operativo abría un alias de la tienda de aplicaciones que solo responde «Python was not found».

**Pregunta detectora.** El programa que lanzo desde el código: ¿lo resuelve el shell (un atajo, un archivo por lotes, un alias) o es un ejecutable real? ¿Lo probé lanzado desde el código, no desde el shell?

**Señal de alarma.** «Pero en la terminal sí funciona».

**Qué hacer.** Ejecuta el paso una vez desde el mismo programa que lo va a lanzar. Si el comando es un atajo, lánzalo a través del shell (en Node, `shell: true` en Windows, con argumentos sin espacios ni comillas) o por su ruta completa, y haz que el error diga qué comando no se encontró. Lo de otra máquina es la lección 55; la configuración de otro script, la lección 66.

### 79. Un generador que no encuentra lo que ya hizo, lo vuelve a hacer todo

`from: ae59e617` · `by: ai`

**La idea.** Un proceso que salta el trabajo terminado (con una huella de cada parte, una caché o una carpeta de trabajo) solo es barato en la máquina o copia donde vive ese estado. Si arranca en otra parte, no ve nada hecho y empieza de cero: trabajo caro, otra vez, que nadie pidió.

**Ejemplo.** La narración de una lección se grababa paso a paso con un modelo de voz lento (no se midió el tiempo), y el generador saltaba los pasos sin cambios gracias a su carpeta de trabajo, que no está en git. Un agente, para regenerar un paso, lo arrancó en otra copia del repositorio que no tenía esa carpeta: empezó a grabar la lección completa en la GPU compartida. Se detuvo a mano.

**Pregunta detectora.** ¿Dónde vive el estado que permite saltar el trabajo terminado? ¿Existe en la carpeta y en la máquina donde voy a ejecutarlo? Si no existe, ¿el proceso se detiene o vuelve a hacerlo todo en silencio?

**Señal de alarma.** «Solo cambió un paso» en una copia nueva · una carpeta de trabajo en .gitignore · un agente al que se le dijo «ejecuta el generador» sin decirle dónde está su caché.

**Qué hacer.** Haz que el generador se niegue a empezar desde cero cuando ya existe un resultado y falta su estado, y que diga dónde ejecutarlo (con una opción explícita, como `--all`, para quien de verdad quiera reconstruirlo todo). En las instrucciones a los agentes, nombra la carpeta donde se ejecuta. Un estado que falta y se toma como «nada hecho» es el «No pude leer» de la lección 1, en otra forma.

### 82. Una herramienta que vacía su carpeta al arrancar se lleva lo que otros guardaron ahí

`from: b6b0c760` · `by: ai`

**La idea.** Muchas herramientas borran su carpeta de salida cada vez que arrancan, para que las ejecuciones no se mezclen. Si otros procesos guardan sus archivos ahí porque «es la carpeta de resultados», la siguiente ejecución los borra sin avisar, y nadie se da cuenta hasta que alguien busca el archivo.

**Ejemplo.** Un ejecutor de pruebas de navegador vaciaba su carpeta de resultados en cada arranque. Los agentes de revisión guardaban allí sus informes, y un script guardaba los archivos de pasos por lección. En un solo día se perdieron dos informes largos, uno pedido por el dueño del proyecto, y un revisor reportó que uno de esos archivos de pasos no existía, porque una ejecución de pruebas lo había borrado minutos antes. Se recuperaron de las transcripciones de los agentes.

**Pregunta detectora.** ¿Qué herramienta escribe en esta carpeta, y alguna la vacía al arrancar o al terminar? ¿Lo que guardo aquí sobrevive a la siguiente ejecución de esa herramienta? ¿Lo comprobé con un archivo de prueba?

**Señal de alarma.** «Lo dejo en la carpeta de resultados» · «el archivo no existe» de algo escrito hace minutos · una carpeta ignorada que guarda a la vez artefactos desechables y entregables.

**Qué hacer.** Dale a cada herramienta que borra su propia subcarpeta (en Playwright, `outputDir`) y guarda los entregables fuera de ella, o en algo con versiones. Compruébalo: deja un archivo de prueba, ejecuta la herramienta y mira que siga ahí. La salida completa de una prueba que se guarda en esa carpeta es el caso de la lección 44; editar un archivo que escribe un generador, la lección 48.
