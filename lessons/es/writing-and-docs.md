# Escribir y documentar

Lo que aplica cuando escribes para otros: documentación, manuales, textos de pantalla, contenido, prompts.

### 11. Retirar una gráfica no retira lo que afirmaba

`from: 36fecfbc` · `by: ai`

**La idea.** Si quitas algo porque el dato no era confiable, esa misma afirmación probablemente vive en otros textos, escrita con otras palabras.

**Ejemplo.** Se retira una gráfica poco confiable, pero una tarjeta de «hallazgos clave» y un plan de acción seguían recomendando lo que la gráfica decía.

**Otro ejemplo.** Un plan de capítulos se renumeró de 7 a 15. Dos listas de otro documento siguieron apuntando al «7.4» y al «7.7» del plan viejo, que ahora eran otros temas. Al reemplazar un plan, los números viejos también son afirmaciones.

**Un ejemplo más.** Un proyecto llevaba su propia lista de lecciones, y una biblioteca la había adoptado en su propia lista. Ambas numeraban igual hasta la 44 y distinto desde la 45. Las instrucciones del proyecto y sus agentes revisores seguían citando «la 46», que en la biblioteca es otra lección. Salió solo cuando la dueña pidió una segunda revisión.

**Pregunta detectora.** ¿Qué otros textos dicen lo mismo que lo que acabo de quitar? Cuando conviven dos numeraciones, ¿cada cita dice cuál lista usa?

**Señal de alarma.** «Ya quité la gráfica» · «Los números son los mismos».

**Qué hacer.** Busca por tema, no por identificador. Los ecos no tienen nombre de variable. Cuando conviven dos numeraciones, cita con un prefijo que diga de qué lista es («v2 #46», «biblioteca #46»), y busca toda cita del rango cambiado en todos los archivos, no solo en el que renumeraste (ver la 8).

### 37. Documenta lo que hay, no lo que quisieras que hubiera

`from: 928f7db8` · `by: author`

**La idea.** Una revisión de documentación mejora el documento, no rediseña el sistema. Si el sistema tiene un límite, el documento lo declara; no lo esconde ni promete arreglarlo.

**Ejemplo.** Un manual decía que los datos se sincronizaban solos. El sistema solo sincronizaba al abrir la aplicación. La revisión «corrigió» el manual para prometer que pronto sería automático, en lugar de declarar el límite tal cual.

**Pregunta detectora.** Lo que voy a escribir, ¿describe cómo funciona hoy o cómo debería funcionar?

**Señal de alarma.** «Así debería funcionar» · «lo van a arreglar».

**Qué hacer.** Separa los hallazgos del documento («está mal escrito») de los del sistema («funciona distinto de lo ideal»). Los segundos se declaran como limitación.

### 38. Lo que no sabes se marca, no se inventa

`from: dc2fde6c` · `by: ai`

**La idea.** Un documento oficial afirma todo con la misma autoridad. Un dato inventado, como un responsable, un horario o un tiempo de respuesta, se lee igual que uno real.

**Ejemplo.** Un procedimiento traía un tiempo de respuesta de 24 horas que nadie había acordado: se escribió porque sonaba razonable, y al publicarse se volvió compromiso.

**Otro ejemplo.** Un mensaje de commit explicaba por qué dos revisiones no habían ejecutado nada: la persona revisora había escrito ciertos comandos. Nadie había visto esos comandos; el registro solo decía «denied». El mensaje ya era público, y el siguiente commit tuvo que corregirlo.

**Un ejemplo más.** Alguien preguntó por una herramienta con un nombre que no le sonaba. Se tomó por una conocida con un nombre parecido, que se buscó y se explicó largamente. Se refería a un producto nuevo con ese nombre exacto; buscarlo tal como estaba escrito lo habría encontrado de inmediato.

**Variante.** El dato puede ser el estado actual de una herramienta, o lo que pasó antes. En dos días, dos afirmaciones sobre herramientas salieron de la memoria y resultaron falsas: que un comando de actualización reconstruía un índice completo (solo lee lo que cambió), y que las actualizaciones automáticas de un plugin estaban «probablemente» apagadas (el comando `doctor` del propio plugin decía que encendidas). Una mirada a cada herramienta lo habría respondido. Y cuando las reglas de un proyecto se pasaron a un formato nuevo, varios de sus ejemplos se reconstruyeron de memoria y no coincidían con lo que había pasado; uno contaba un error que nunca ocurrió. Se corrigieron abriendo el registro viejo.

**Pregunta detectora.** ¿Este dato lo sé, o lo supongo porque suena razonable? Una causa, un nombre, una cifra, lo que hace una herramienta, cómo está configurada: ¿lo vi, o es mi mejor suposición? ¿De qué registro copié este ejemplo?

**Señal de alarma.** «Seguro es así» · «ha de ser por eso» · «han de referirse a…» · «así pasó, más o menos».

**Qué hacer.** Marca lo que falta de forma visible, como «Pendiente» en rojo, y pregunta a quien sí lo sabe. Una redacción neutra es mejor que una falsa. En un mensaje de commit, una causa que nadie vio en una salida se escribe como suposición («likely»). Un nombre que no reconoces se busca exactamente como está escrito; si no aparece nada, pregunta a cuál se refieren. Antes de decir qué hace una herramienta o cómo está configurada, haz la mirada más barata (su `doctor`, su `--help`, su configuración, una búsqueda) y di lo que mostró, o marca la afirmación como no revisada (ver la 29 y la 52). Un «correcto» de un revisor también es una suposición, salvo que lo haya mirado (ver la 28). Un ejemplo de lo que pasó se copia de su registro (el log, el commit), nunca se reconstruye.

**No la confundas con.** La marca es para quien decide, no para el lector final: un «pendiente de confirmar» dentro de un texto publicado es otro dato que no debía estar ahí. Si el documento sale antes de confirmarlo, usa una redacción neutra que no afirme lo que falta, y deja el pendiente en el informe o el registro del proyecto.

### 39. Versiona a la vista

`from: 778c3988` · `by: author`

**La idea.** Cada cambio lleva número de versión nuevo en la portada y una línea en el historial, con fecha, qué cambió y quién lo hizo. Cuando circulan dos copias, la versión es lo único que dice cuál es la buena.

**Ejemplo.** Dos copias de un manual circulaban por correo. La vieja decía que la herramienta «se abre con doble clic», algo que ya no era cierto, y nadie podía saber cuál de las dos era la buena.

**Pregunta detectora.** Si alguien tiene la copia de la semana pasada, ¿cómo sabe que ya no es la buena?

**Señal de alarma.** «Es un cambio chico, no amerita versión».

**Qué hacer.** Sube el número de versión y escribe la línea del historial en el mismo cambio que modifica el documento.

### 42. Trabaja sobre la versión vigente

`from: 2618ac78` · `by: author`

**La idea.** Una revisión hecha sobre una copia vieja trae de regreso errores que ya se habían corregido.

**Ejemplo.** Una reorganización del manual se hizo sobre una versión de semanas atrás y volvió a decir que la herramienta «se abre con doble clic», algo que ya no era cierto.

**Pregunta detectora.** Lo que estoy editando, ¿es la versión más reciente o la que tenía abierta?

**Señal de alarma.** «Tengo la versión abierta desde ayer».

**Qué hacer.** Aprovecha la estructura que propone la revisión y vacía en ella el contenido más reciente, no al revés.

### 43. Relee de punta a punta después de muchas correcciones

`from: b956a885` · `by: ai`

**La idea.** Tras varias rondas de arreglos puntuales, un documento puede contradecirse a sí mismo: cada corrección fue cierta en su apartado, pero nadie volvió a leer los demás.

**Ejemplo.** Un apartado decía que sin conexión no se guarda nada, y las preguntas frecuentes seguían diciendo que lo capturado se conserva en el equipo.

**Otro ejemplo.** Un proyecto final de un módulo de estadística llegó en tres partes. La segunda aceptaba como correcto «el segundo pago se quedó igual» con un valor p de 0.875; la tercera enseñaba que un valor p alto no prueba que no haya efecto. Ya corregido eso, la misma afirmación volvió en otros tres lugares: una frase de transición («al abrirlo, no cambió nada»), el título de un paso y lo que dice un personaje en una reunión simulada.

**Pregunta detectora.** ¿Cuántas correcciones lleva esto desde la última vez que alguien lo leyó completo? ¿Alguna oración, incluidos los títulos y los diálogos, rompe una regla que este documento enseña?

**Señal de alarma.** «Cada arreglo lo revisé en su lugar».

**Qué hacer.** Al cerrar cada ronda, busca por tema todo lo que dice el documento sobre lo que corregiste. Luego enumera las reglas que enseña el documento y busca cada una por tema, también en las partes que no tratan de ella: títulos, transiciones, ejemplos y diálogos.

### 51. Lo que a ti te parece obvio es lo primero que hay que enseñar

`from: c970d3ec` · `by: ai`

**La idea.** Quien ya sabe no ve los pasos que da sin pensar. Por eso su primer ejemplo trae varias cosas nuevas a la vez, y quien empieza se pierde en la primera línea.

**Ejemplo.** Un curso de programación para principiantes empezaba con una celda que traía seis cosas nuevas a la vez, y el plan nunca enseñaba qué es un tipo de dato ni que el `=` guarda y se lee de derecha a izquierda. La dueña del curso lo dijo en una frase: «asumes muchas cosas de los estudiantes». Después, tres lecciones decían «como arrastrar una fórmula», y ninguna lo había enseñado: decían «copiar la fórmula hacia abajo».

**Otro ejemplo.** En un módulo para principiantes, la misma palabra corta nombraba una celda de hoja de cálculo en un paso y el cuadradito de su esquina en otro. Los avisos propios de una práctica usaban una referencia de celda y el nombre de una herramienta de capturas antes de que el texto hubiera presentado cualquiera de los dos.

**Pregunta detectora.** En mi primer ejemplo, ¿cuántas cosas son nuevas para alguien que no sabe nada? ¿Ya se explicó cada símbolo, cada palabra, cada nombre de botón y cada acción que pido? ¿Una palabra nombra dos cosas? ¿Un aviso nombra algo que aún no se enseñó?

**Señal de alarma.** «Eso lo entiende cualquiera» · «es solo una línea» · «es la palabra de siempre» · «el aviso lo explica».

**Qué hacer.** Antes de escribir, lista lo que tu ejemplo da por sabido (símbolos, palabras, clics, cosas que el estudiante ya debería haber armado) y enséñalo primero: una idea nueva a la vez, cada símbolo explicado la primera vez que aparece. Busca cada palabra que coincide con el nombre de un botón, y cada acción que pides, como buscas un símbolo. Si se puede, deja que una revisión automática compare lo que usa cada ejemplo con lo que ya se enseñó. Lee los avisos y pistas de la interfaz en el orden en que el estudiante los encuentra, y busca cada nombre que usan como buscas un símbolo. Da a cada cosa un solo nombre y mantenlo (ver la 2).

### 52. Sobre una herramienta que cambia rápido se escribe desde la práctica de hoy, no de memoria

`from: 15098a47` · `by: author`

**La idea.** Una lección o una guía sobre una herramienta que cambia cada pocos meses envejece mientras se escribe, si sale de lo que recuerda quien la escribe. Su premisa puede ser falsa antes de que la lea la primera persona.

**Ejemplo.** El plan de un módulo de «análisis con IA» empezaba con «la IA no ve tus datos, así que describe tu tabla en lugar de pegarla». La dueña del curso señaló que hoy los agentes se conectan a la base, corren las consultas solos y devuelven el número. Una investigación con fuentes y fechas lo confirmó: copiar código de un chat era como se trabajaba dos años antes. Varias lecciones se reescribieron alrededor de lo que sigue siendo cierto: definir la pregunta, supervisar al agente y comprobar el número.

**Pregunta detectora.** ¿Qué premisas de este texto dependen de lo que la herramienta puede hacer hoy? ¿Cuándo las comprobé por última vez, y contra qué fuente?

**Señal de alarma.** «Así funciona» · «todo el mundo lo hace así».

**Qué hacer.** Antes de escribir sobre una herramienta que cambia rápido, investiga la práctica actual con fuentes y fechas: qué hace hoy, qué es gratis, qué usa de verdad la gente. Arma el texto alrededor de la habilidad que sobrevive a la siguiente versión (plantear, supervisar, verificar) y deja los pasos de la herramienta en un solo lugar que se pueda actualizar. Marca lo que no pudiste comprobar y pruébalo a mano antes de publicar.

### 54. «El X al inicio y al cierre»: todo traductor elige la misma lectura equivocada

`from: 96bbb4cc` · `by: ai`

**La idea.** Un calificativo colocado antes de dos elementos unidos por «y» puede referirse a ambos o solo al primero. Quien escribe sabe a cuál se refiere; quien lee tiene que adivinar, y los traductores adivinan igual.

**Ejemplo.** Una página de resultados decía «lo que lo cambió son las lecciones al inicio y al cierre», refiriéndose a dos piezas de una herramienta: las lecciones que se muestran al inicio, y un paso de verificación final. Las seis traducciones lo leyeron como una sola cosa: lecciones mostradas al inicio y al final. Dos días después, la misma forma entró en un párrafo nuevo, y las traducciones volvieron a leerla mal.

**Otro ejemplo.** Un párrafo nombró un tipo de error como «(la ruta de error, el foco del teclado, un archivo de datos dañado, una partición escrita antes de las corridas)», queriendo decir que el tipo mismo se había fijado antes de las corridas. Las seis traducciones lo listaron como un cuarto error. La pregunta de esta lección ya se le había mostrado a quien escribe ese mismo día.

**Pregunta detectora.** En esta frase, ¿alguna «el X en A y B» tiene dos lecturas? Traducida palabra por palabra, ¿saldría la otra lectura? En una lista, ¿una nota sobre la lista queda donde se lee como un elemento más?

**Señal de alarma.** Una lista de dos donde un elemento es una cosa y el otro es un momento o un lugar. Una nota sobre una lista escrita dentro de ella, como su último elemento.

**Qué hacer.** Haz visible la separación. Cuéntala («dos piezas: …»), dale a cada elemento su propio artículo («las lecciones al inicio, y el cierre»), o pon primero el elemento corto («el cierre, y las lecciones al inicio»). Una nota sobre una lista va fuera de ella, en su propia cláusula. Luego lee la traducción de esa frase para ver si dice la lectura que querías.

### 58. Una instrucción hecha de muchas piezas se ve antes de armarla

`from: 2875c4ef` · `by: ai`

**La idea.** Cuando lo que enseñas se arma con varias piezas (una fórmula con cinco argumentos, un comando con varias opciones), dictarlas una tras otra mientras se escriben hace que quien aprende se pierda: tiene que entender cada pieza y el armado a la vez. Primero cada pieza se muestra haciendo su trabajo en los datos, con su nombre y su significado a la vista; luego se arma.

**Ejemplo.** Un video tutorial de una fórmula con dos condiciones dictaba cada rango y cada condición mientras se escribía. El responsable: no se entendía cada parámetro, y con muchos se pierde uno. Rehecho con la pregunta en palabras, cada pieza pintada en los datos con su color, el conteo hecho a mano, la fórmula armada en piezas con los mismos colores, y lo único nuevo al final, funcionó mucho mejor.

**Pregunta detectora.** Antes de escribir el primer carácter, ¿quien aprende ya vio en los datos qué hace cada pieza? ¿Cada pieza lleva a la vista su nombre y su significado, no solo su color?

**Señal de alarma.** «La voz nombra cada argumento según aparece».

**Qué hacer.** Primero la pregunta en palabras. Luego cada pieza mostrada en los datos, un color para cada una, con su nombre y lo que significa al lado. Después el resultado calculado a mano. Solo entonces la instrucción, armada en partes con los mismos colores y una pausa entre partes, con lo nuevo al final. No es lo mismo que la lección 51: aquí cada pieza puede ya ser conocida, y lo que falla es el orden.

### AI-1. Si restringes dónde puede escribir el modelo, escribe donde lo dejes

`from: abeb61b2` · `by: ai`

**La idea.** Cuando el prompt o el código prohíbe un campo de salida en el que el modelo sí tiene algo que decir, el modelo no se calla: lo pone en el campo que sí dejaste, aunque no le corresponda. Cada campo debe decir qué puede contener y que dejarlo vacío está bien (ver la lección 38).

**Ejemplo.** Un asistente en vivo tenía tres zonas: advertencias, datos sobre el cliente y la frase que viene a continuación. El prompt decía «en los primeros 2 minutos, usa solo advertencias», y el código descartaba todo lo demás. El modelo quiso sugerir una pregunta y la puso en la zona de advertencias («No expliques más: pregunta “¿qué te gustaría sacar de esto?”»). Cuando sí envió la frase en su propia zona, el código la descartó y el panel quedó vacío. La persona lo reportó con una captura de pantalla.

**Pregunta detectora.** Si el modelo tiene algo que decir y el campo correcto está prohibido en este momento, ¿dónde lo pondrá? ¿Cada campo dice qué cabe y qué no, y que puede quedar vacío? ¿El código descarta algo que el prompt no sabe que se descarta?

**Señal de alarma.** «En esa fase, que use solo el campo X».

**Qué hacer.** Define cada campo por su contenido («solo advertencias; nunca una frase para decir»), no por el momento. Si una fase no debe mostrar algo, el prompt y el código tienen que decir lo mismo (ver la lección 9). Prueba con un caso en el que el modelo sí tenga algo que decir en el campo prohibido.

### AI-2. Una regla escrita como lista se ejecuta como lista, aun después de que la otra persona respondió

`from: 23040433` · `by: ai`

**La idea.** Si el prompt enumera lo que hay que cubrir (los puntos de una apertura, los campos de un formulario), el modelo pide cada uno por turno aunque la persona ya lo haya dado con otras palabras, y deja de responder a lo que acaba de decir.

**Ejemplo.** Un asistente de ventas tenía que cubrir cuatro puntos de apertura en el primer minuto; uno era «qué quiere sacar de la llamada». El cliente acababa de decir «estoy en contabilidad y quería ver de qué va esto de los datos». El asistente sugirió «Si no es para ti, solo dime. ¿Qué te gustaría sacar hoy?»: ignoró lo que dijo el cliente y preguntó algo ya contestado. La persona lo notó («no encaja con lo que el cliente me está preguntando ahora»).

**Pregunta detectora.** Si la persona ya dio este punto con otras palabras, ¿el prompt le dice al modelo que lo cuente como cubierto? ¿La respuesta se apoya en lo último que dijo la persona, o salta al siguiente punto de la lista?

**Señal de alarma.** «Que cubra los cuatro puntos».

**Qué hacer.** Junto a cada lista, escribe: «un punto dicho con otras palabras ya está cubierto», «lo que falte entra como un puente dentro de la respuesta que sigue el hilo» y «nunca ignores lo último que dijeron». Pruébalo con una conversación real en la que la persona responda un punto antes de que se lo pregunten.

### EDU-2. Lo que se ve antes de responder no puede traer la respuesta

`from: 2ffd5c1e` · `by: ai`

**La idea.** Una pregunta deja de medir si la respuesta ya apareció: en una imagen, en la idea clave, en la explicación de otro ejercicio, en el título de un paso o en una lección anterior. Quien contesta bien pudo haberla leído.

**Ejemplo.** Una ilustración con la cifra correcta quedaba arriba de la práctica que pedía calcularla. Una lección preguntaba qué pasa al guardar otro valor en una variable, en un paso titulado «Guardar otra vez reemplaza». Un resumen debajo del quiz final se leía antes de contestarlo. Y un recuadro que aparece tras el primer intento, aunque falle, daba la dirección de la respuesta.

**Otro ejemplo.** Un ejercicio pedía escribir una fórmula signo por signo, con la fórmula mostrada justo arriba del recuadro y con el pegado permitido: medía copiar y pegar.

**Un ejemplo más.** En un curso con interfaces dibujadas, cuatro componentes llevaban en su código fuente las cifras que pedía un ejercicio posterior. La revisión automática de respuestas filtradas nunca buscó ahí; las encontraron los revisores. En cinco de siete pasos de un módulo, la pregunta estaba justo debajo del texto que la respondía: un encabezado «Doble clic: abrir» encima de la pregunta «¿qué abre una carpeta?».

**Pregunta detectora.** Esta cifra, imagen o frase, ¿la ve el estudiante antes de contestar, aquí o en una lección anterior? No solo la cifra exacta: también una aproximación («unas 25»), la conclusión escrita al pie de una imagen, un título, un «acabas de ver que…», o lo que muestra en pantalla el error más probable de un ejercicio anterior.

**Señal de alarma.** «Es solo contexto» · «es solo el título» · «es el pie de la imagen».

**Qué hacer.** Busca cada respuesta en todo lo que se ve antes de su pregunta, también en lo que aparece tras un primer intento fallido, en lo que imprime el código de partida al correrlo, en los archivos que se descargan y en lo que se puede contar en un dibujo. Escribe el título del paso y los objetivos al final, y léelos junto al resultado de cada predicción. Una revisión automática encuentra las cifras exactas; las aproximaciones y las frases con otras palabras solo las encuentra quien lee con la respuesta en mente. Cuando un ejercicio pida escribir lo que aparece en pantalla, bloquea el pegado y explica por qué. Extiende la revisión a cada archivo que dibuja la pantalla del estudiante, incluido el código de los componentes (ver la 16). En un paso que explica y luego pregunta, la explicación que da la respuesta va después de la pregunta, o la pregunta trata de un caso que la explicación no cubre.

### EDU-3. Una pregunta con dos respuestas defendibles no mide nada

`from: 3f95b2da` · `by: author`

**La idea.** Si con lo que dice el enunciado otra opción también se puede defender, quien elige la «equivocada» por una buena razón queda marcado como error, y quien acierta pudo acertar por suerte. La pregunta mide la frase que falta, no la idea.

**Ejemplo.** Una pregunta pedía qué hacer con un descuento vacío «cuando la venta no tuvo descuento». La lección había enseñado que un vacío que es un dato se deja, así que «dejarlo» se defendía; la respuesta esperada, rellenar con cero, dependía de algo que el enunciado no decía: que se quería el promedio de todas las ventas. En otra, «la medida principal es la parte que paga el segundo mes» no decía de quiénes, y las dos versiones empataban o no según cómo se leyera.

**Pregunta detectora.** Con lo que dice el enunciado y lo que enseñó la lección, ¿puedo defender otra opción? ¿Qué dato tendría que saber para descartarla, y está escrito?

**Señal de alarma.** «Se sobreentiende» · «es obvio que se refiere a…».

**Qué hacer.** Para cada opción equivocada, escribe en una línea por qué está mal usando solo el enunciado y la lección. Si para descartarla necesitas un dato que no está escrito, agrégalo al enunciado: el propósito de la cuenta, la regla del sistema, el denominador de una proporción, lo que se sabe de los datos. En un ejercicio de clasificar, prueba cada elemento contra cada categoría, no solo contra la suya.

### EDU-5. Una pista apunta a la causa del error, no a la respuesta

`from: 2fa4365d` · `by: author`

**La idea.** Una pista aparece después de un intento fallido. Si da la respuesta, la línea que resuelve el ejercicio o lo que separa la solución del error más probable, el segundo intento mide la copia.

**Ejemplo.** Al revisar las 277 prácticas revisadas de un curso, cambiaron 82 pistas en 49 archivos. Unas daban la línea que resuelve («el segundo es la…»). Otras dictaban el orden que separa la solución de su error común. En los ejercicios de cuadrar contra un resultado anterior, la pista decía «debe dar lo mismo que en la lección 2.2»: quien recordaba el número de antes lo podía escribir sin hacer el paso.

**Pregunta detectora.** ¿Quien lee esta pista podría pasar el siguiente intento sin la habilidad? ¿Nombra la respuesta, la línea que resuelve, los pasos que mide el ejercicio o el número de antes con el que debe cuadrar?

**Señal de alarma.** «Es solo un empujón» · «ya lo intentó una vez».

**Qué hacer.** Escribe la pista sobre la causa del error probable («las posiciones empiezan en 0, no en 1») y cita solo lo ya enseñado. Deja el «debe dar lo mismo que antes» para la explicación que aparece al responder, donde enseña que dos métodos con el mismo número son una verificación. Revisa cada pista contra el error más probable de su ejercicio, no sola.
