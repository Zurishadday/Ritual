# Git y proceso

Lo que aplica cuando guardas, cierras, entregas o coordinas: commits, estados, pendientes, trabajo en paralelo.

### 8. Enumera a los consumidores, no los recuerdes

`from: 74a3645f` · `by: ai`

**La idea.** Cuando cambias un dato que otros leen por su nombre, la lista de quién lo lee tiene que estar escrita. La memoria siempre deja uno fuera.

**Ejemplo.** Se actualizaron las etiquetas de tres pantallas tras cambiar un modelo. La cuarta, que nadie recordaba, siguió ofreciendo opciones del modelo anterior.

**Otro ejemplo.** Al escribir un capítulo se afirmó de memoria que el lector ya conocía tres funciones de un capítulo anterior. Una búsqueda mostró que ese capítulo enseñaba solo una, y que otro ya había explicado el tema que se presentaba como nuevo.

**Un ejemplo más.** Un cambio se guardó con la lista de archivos escrita de memoria, y quedó fuera uno: el que hacía funcionar lo nuevo. Lo mostró la lista de cambios pendientes, revisada después. Otra vez, un commit decía que una copia de algunos archivos estaba «al día» mientras faltaban tres de ellos; lo encontró otra persona revisora.

**Pregunta detectora.** ¿De dónde saqué la lista de quién usa esto: de una búsqueda o de acordarme?

**Señal de alarma.** «Ya cubrí los tres lugares donde se usa» · «eso ya lo vieron» · «ya agregué todo».

**Qué hacer.** Mantén un mapa escrito de impactos por tipo de cambio. Recórrelo completo diciendo «cambia» o «no aplica porque…», y si el cambio crea un consumidor nuevo, agrégalo en el mismo cambio. Antes de citar, copia de la fuente citada la frase que afirmas: lo que se dice que otro hizo o vio también se comprueba. Antes de escribir que una copia está «completa» o «al día», compara la lista de lo que debería tener con la lista de lo que tiene.

### 9. Un estado vive en varios registros: muévelos juntos

`from: dbaa12af` · `by: ai`

**La idea.** Cerrar un pendiente suele implicar tres lugares: el registro de pendientes, la prueba que lo vigila y el documento que lo describe. Si mueves uno, los otros contradicen.

**Ejemplo.** Un pendiente se marcó como cerrado en la lista, pero la prueba que lo vigilaba seguía marcada como «se espera que falle» y el documento lo describía como abierto. Tres lugares, tres versiones.

**Otro ejemplo.** Un cuadro de texto se llenó con dictado por voz, que guardaba el texto en una variable aparte, y el botón de enviar mandaba esa variable. La persona borró a mano la primera mitad mientras seguía dictando, y se envió todo el texto, con la parte borrada incluida. Después, al enviar se vaciaba el cuadro pero no la variable, así que el siguiente dictado empezaba con el mensaje anterior.

**Un ejemplo más.** Un cuadro de confirmación preguntaba si se publicaba un texto, y mostraba el borrador guardado como vista previa. El script que publicaba armaba su propio cuerpo a partir de ese borrador: un prefijo en el título, campos que el borrador no tenía. La persona habría dicho que sí a un texto que no era el que salía; un revisor lo atrapó antes del primer uso, y ahora la vista previa sale de la misma función que publica.

**Pregunta detectora.** ¿Qué otros lugares afirman este estado? Nómbralos antes de guardar. ¿Y lo que envío o guardo: sale de la copia que ve la persona, o de una que se guarda aparte?

**Señal de alarma.** «Luego actualizo el otro lado» · «La variable ya tiene el texto, enviaré eso».

**Qué hacer.** La unidad de trabajo es el conjunto completo, en el mismo cambio. Lo que se envía o se guarda sale de lo que la persona ve, y cada envío o reinicio limpia todas las copias a la vez, en una sola línea de código.

### 30. Explica antes de hacer y espera el sí

`from: a2c8ffe9` · `by: ai`

**La idea.** Avanzar rápido en la dirección equivocada no es avanzar.

**Ejemplo.** Se reorganizó la estructura de carpetas de un proyecto entero sin avisar. El cambio era correcto en sí mismo y se deshizo completo, porque otra persona ya había decidido esa estructura por razones que no estaban en el código.

**Otro ejemplo.** Se le pidió a una persona que eligiera entre apagar por defecto una revisión automática o dejarla encendida. La pregunta solo daba las ventajas, y llamaba a la revisión por su nombre en el código. Dijo que sí; se hizo y se publicó. Luego preguntó qué podía perjudicar, y pasaron cuatro explicaciones más antes de que pudiera decir qué se había apagado.

**Pregunta detectora.** ¿Este bloque es grande, difícil de deshacer o cambia algo que otra persona ya decidió? Si sí, explica y espera. Si no, di qué harás y sigue: pedir permiso para cada paso también cuesta. Cuando pido un sí: ¿dije, con sus palabras, qué podría salir mal?

**Señal de alarma.** «Ya sé lo que quiere» · «Opción 1 (recomendada)» cuando solo se listan sus ventajas.

**Qué hacer.** Antes de cada bloque de trabajo grande, explica en lenguaje sencillo qué harás y por qué, y espera la confirmación. Cuando ofrezcas opciones, da a cada una una línea sobre lo que podría salir mal y qué tan fácil es deshacerla, y nombra las cosas por lo que hacen, no por su nombre en el código. Si la respuesta es una pregunta, la decisión todavía no está tomada.

### 35. Una lista de pendientes escrita de paso envejece

`from: 6deec922` · `by: author`

**La idea.** Lo que anotaste «para después» mientras hacías otra cosa puede ya no existir, o haber sido una decisión deliberada.

**Ejemplo.** Una nota decía «quitar el filtro de fechas». Cuando por fin se trabajó, el filtro ya era una decisión escrita del equipo, y quitarlo rompió un reporte.

**Pregunta detectora.** ¿Medí hoy este pendiente, o lo voy a trabajar solo porque está escrito?

**Señal de alarma.** «Estaba en la lista».

**Qué hacer.** Antes de trabajar un pendiente, mídelo hoy y busca si alguna decisión escrita dice que se quedó así a propósito.

### 40. El registro dice qué quedó y por qué, no la crónica de tropiezos

`from: 8309d6b7` · `by: author`

**La idea.** Un historial de cambios sirve para entender el producto, no para narrar los errores ya resueltos de quien lo hizo.

**Ejemplo.** Un historial decía «se intentó A y falló; se intentó B y falló; quedó C». Quien lo leía meses después solo necesitaba C y su razón, y tuvo que leer tres párrafos para encontrarla.

**Pregunta detectora.** Esta línea, ¿le sirve a alguien para entender el producto o para no repetir un error, o solo cuenta lo que me pasó?

**Señal de alarma.** «Que quede constancia de todo lo que pasó».

**Qué hacer.** Escribe el estado final y su razón. Lo que se intentó y falló solo entra si enseña algo que alguien necesita para no repetirlo.

### 47. Lo que se trabaja en paralelo se cruza en lo compartido

`from: 83287f40` · `by: ai`

**La idea.** Cuando varias personas trabajan a la vez, cada una ve bien su pieza. Lo que comparten (las pruebas, los datos, los documentos de todo el proyecto) junta sus cambios: nombres que chocan, copias que se quedan atrás, pruebas que leen el trabajo a medias de otra persona. Integrar es un trabajo, no un pegado.

**Ejemplo.** Cuatro personas escribían a la vez una pieza cada una y dejaban lo compartido como entrega. Al integrar, dos entregas usaban un nombre que ya existía en la prueba común, y la prueba dejó de correr. Otra prueba guardaba una copia de lo que revisaba, la pieza cambió y la copia no. Una corrida de las pruebas falló por una imagen que otra persona todavía estaba dibujando. Y al final no se podía guardar cada pieza por separado: los archivos comunes ya traían cambios de todas.

**Otro ejemplo.** Dos conversaciones trabajaban en la misma carpeta, que comparte más que archivos: una rama activa, una salida de compilación y un puerto del servidor de pruebas. Una conversación cambió la carpeta a otra rama; el siguiente commit de la otra conversación cayó en esa rama, y su push a main dijo «everything up to date» sin subir nada. Al volver la carpeta a main, arrastró los cambios sin confirmar de la primera conversación.

**Pregunta detectora.** ¿Qué archivo tocan dos piezas a la vez, y quién lo integra? ¿Mi prueba está leyendo el trabajo a medias de otra persona? ¿Qué rama tiene esta carpeta justo antes del commit, y quién más la usa?

**Señal de alarma.** «Cada quien probó lo suyo» · «la falla es de otra pieza» · «cada uno toca archivos distintos, no chocan».

**Qué hacer.** Que lo compartido lo integre una sola persona, con un paso que se detenga si un nombre choca. Que las pruebas lean el original, no una copia. Corre las pruebas completas cuando todas terminen, o sin las piezas que siguen cambiando, y di cuáles quedaron fuera. Y guarda juntas las piezas que comparten archivos, para que cada versión guardada funcione completa. Dale a cada sesión su propia carpeta (`git worktree`), lee `git status -sb` antes de cada commit, y después de un push revisa que la rama remota tenga el commit.

### 65. Una regla sobre cómo trabajar no tiene excepción para los pasos chicos

`from: 1f76d0cd` · `by: ai`

**La idea.** Una instrucción permanente sobre cómo trabajar (quién hace qué, dónde corre, con qué herramienta) no tiene excepción por tamaño. «Es solo una revisión rápida» es justo el caso que la regla quería cubrir.

**Ejemplo.** El usuario había pedido, y estaba guardado en la memoria, que todo el trabajo mecánico (instalar, correr scripts, transcribir) fuera a un subagente de modelo más barato, y que el modelo principal solo razonara. Ante tres archivos de audio largos, el modelo principal escribió y corrió él mismo una transcripción de muestra «para ver qué contenían»; falló por una biblioteca que faltaba, lo reintentó, y el usuario lo detuvo para recordarle la regla.

**Pregunta detectora.** Antes del primer comando de una petición: ¿hay una regla permanente (memoria, instrucciones del proyecto, lo que dijo el usuario) sobre quién hace este tipo de paso, o cómo? ¿Me la estoy saltando porque el paso es «chico»?

**Señal de alarma.** «Primero le echo un vistazo y luego lo delego» · «esto es muy corto como para delegarlo».

**Qué hacer.** Clasifica el paso por su tipo, no por su tamaño: si es mecánico, va como dice la regla desde el primer comando. Si una excepción de verdad tiene sentido, dilo antes de hacerla y deja que el usuario decida.

### 70. Un encargo abierto deriva hacia lo más fácil de criticar: el objetivo y el alcance van en el encargo

`from: 129f524c` · `by: ai`

**La idea.** Cuando le preguntas a un revisor (una persona o un agente) «¿qué nos falta?» o «¿dónde está la mayor palanca?», responde lo que se ve o se critica más fácil desde donde está, no lo que querías mejorar. Si el objetivo solo vive en tu cabeza, el revisor no tiene manera de saber que lo dejó fuera.

**Ejemplo.** El dueño de un asistente en vivo para llamadas de venta quería mejorar lo que dice el vendedor durante la llamada. Se lanzaron cuatro revisiones con la pregunta abierta «¿dónde está la mayor palanca para vender más?». Tres se fueron a lo que pasa antes y después de la llamada (agendar, dar seguimiento, cobros): consejo válido, pero no lo que se buscaba. El dueño lo dijo: se enfocaron en todo menos en lo que el dueño quería mejorar. Una segunda ronda, con el alcance escrito («solo lo que se dice dentro de la llamada; nada sobre el embudo ni el seguimiento»), trajo justo lo que faltaba.

**Pregunta detectora.** Si este revisor me trae diez ideas excelentes sobre otra cosa, ¿mi encargo lo habría evitado? ¿Escribí qué queda fuera?

**Señal de alarma.** «Les doy total libertad para que vean lo que no hemos visto».

**Qué hacer.** Escribe en el encargo el objetivo de quien pidió el trabajo, con sus palabras, más una línea con lo que queda fuera. Si quieres libertad para encontrar puntos ciegos, concédela dentro de ese alcance, y deja una sola línea para lo que encuentren fuera de él.
