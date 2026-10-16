# Escribir y documentar

Lo que aplica cuando escribes para otros: documentación, manuales, textos de pantalla, contenido, prompts.

### 11. Retirar una gráfica no retira lo que afirmaba

`from: 36ab089d` · `by: author`

**La idea.** Si quitas algo porque el dato no era confiable, esa misma afirmación probablemente vive en otros textos, escrita con otras palabras.

**Ejemplo.** Se retira una gráfica poco confiable, pero una tarjeta de «hallazgos clave» y un plan de acción seguían recomendando lo que la gráfica decía.

**Otro ejemplo.** Un plan de capítulos se renumeró de 7 a 15. Dos listas de otro documento siguieron apuntando al «7.4» y al «7.7» del plan viejo, que ahora eran otros temas. Al reemplazar un plan, los números viejos también son afirmaciones.

**Pregunta detectora.** ¿Qué otros textos dicen lo mismo que lo que acabo de quitar?

**Señal de alarma.** «Ya quité la gráfica».

**Qué hacer.** Busca por tema, no por identificador. Los ecos no tienen nombre de variable.

### 37. Documenta lo que hay, no lo que quisieras que hubiera

`from: 928f7db8` · `by: author`

**La idea.** Una revisión de documentación mejora el documento, no rediseña el sistema. Si el sistema tiene un límite, el documento lo declara; no lo esconde ni promete arreglarlo.

**Ejemplo.** Un manual decía que los datos se sincronizaban solos. El sistema solo sincronizaba al abrir la aplicación. La revisión «corrigió» el manual para prometer que pronto sería automático, en lugar de declarar el límite tal cual.

**Pregunta detectora.** Lo que voy a escribir, ¿describe cómo funciona hoy o cómo debería funcionar?

**Señal de alarma.** «Así debería funcionar» · «lo van a arreglar».

**Qué hacer.** Separa los hallazgos del documento («está mal escrito») de los del sistema («funciona distinto de lo ideal»). Los segundos se declaran como limitación.

### 38. Lo que no sabes se marca, no se inventa

`from: 93f49fe9` · `by: ai`

**La idea.** Un documento oficial afirma todo con la misma autoridad. Un dato inventado, como un responsable, un horario o un tiempo de respuesta, se lee igual que uno real.

**Ejemplo.** Un procedimiento traía un tiempo de respuesta de 24 horas que nadie había acordado: se escribió porque sonaba razonable, y al publicarse se volvió compromiso.

**Otro ejemplo.** Un mensaje de commit explicaba por qué dos revisiones no habían ejecutado nada: la persona revisora había escrito ciertos comandos. Nadie había visto esos comandos; el registro solo decía «denied». El mensaje ya era público, y el siguiente commit tuvo que corregirlo.

**Un ejemplo más.** Alguien preguntó por una herramienta con un nombre que no le sonaba. Se tomó por una conocida con un nombre parecido, que se buscó y se explicó largamente. Se refería a un producto nuevo con ese nombre exacto; buscarlo tal como estaba escrito lo habría encontrado de inmediato.

**Pregunta detectora.** ¿Este dato lo sé, o lo supongo porque suena razonable? Una causa, un nombre, una cifra: ¿lo vi, o es mi mejor suposición?

**Señal de alarma.** «Seguro es así» · «ha de ser por eso» · «han de referirse a…».

**Qué hacer.** Marca lo que falta de forma visible, como «Pendiente» en rojo, y pregunta a quien sí lo sabe. Una redacción neutra es mejor que una falsa. En un mensaje de commit, una causa que nadie vio en una salida se escribe como suposición («likely»). Un nombre que no reconoces se busca exactamente como está escrito; si no aparece nada, pregunta a cuál se refieren.

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

`from: 781d2fa2` · `by: author`

**La idea.** Tras varias rondas de arreglos puntuales, un documento puede contradecirse a sí mismo: cada corrección fue cierta en su apartado, pero nadie volvió a leer los demás.

**Ejemplo.** Un apartado decía que sin conexión no se guarda nada, y las preguntas frecuentes seguían diciendo que lo capturado se conserva en el equipo.

**Pregunta detectora.** ¿Cuántas correcciones lleva esto desde la última vez que alguien lo leyó completo?

**Señal de alarma.** «Cada arreglo lo revisé en su lugar».

**Qué hacer.** Al cerrar cada ronda, busca por tema todo lo que dice el documento sobre lo que corregiste.

### 51. Lo que a ti te parece obvio es lo primero que hay que enseñar

`from: 1fed11d1` · `by: author`

**La idea.** Quien ya sabe no ve los pasos que da sin pensar. Por eso su primer ejemplo trae varias cosas nuevas a la vez, y quien empieza se pierde en la primera línea.

**Ejemplo.** Un curso de programación para principiantes empezaba con una celda que traía seis cosas nuevas a la vez, y el plan nunca enseñaba qué es un tipo de dato ni que el `=` guarda y se lee de derecha a izquierda. La dueña del curso lo dijo en una frase: «asumes muchas cosas de los estudiantes». Después, tres lecciones decían «como arrastrar una fórmula», y ninguna lo había enseñado: decían «copiar la fórmula hacia abajo».

**Pregunta detectora.** En mi primer ejemplo, ¿cuántas cosas son nuevas para alguien que no sabe nada? ¿Ya se explicó cada símbolo, cada palabra, cada nombre de botón y cada acción que pido?

**Señal de alarma.** «Eso lo entiende cualquiera» · «es solo una línea» · «es la palabra de siempre».

**Qué hacer.** Antes de escribir, lista lo que tu ejemplo da por sabido (símbolos, palabras, clics, cosas que el estudiante ya debería haber armado) y enséñalo primero: una idea nueva a la vez, cada símbolo explicado la primera vez que aparece. Busca cada palabra que coincide con el nombre de un botón, y cada acción que pides, como buscas un símbolo. Si se puede, deja que una revisión automática compare lo que usa cada ejemplo con lo que ya se enseñó.

### 52. Sobre una herramienta que cambia rápido se escribe desde la práctica de hoy, no de memoria

`from: 15098a47` · `by: author`

**La idea.** Una lección o una guía sobre una herramienta que cambia cada pocos meses envejece mientras se escribe, si sale de lo que recuerda quien la escribe. Su premisa puede ser falsa antes de que la lea la primera persona.

**Ejemplo.** El plan de un módulo de «análisis con IA» empezaba con «la IA no ve tus datos, así que describe tu tabla en lugar de pegarla». La dueña del curso señaló que hoy los agentes se conectan a la base, corren las consultas solos y devuelven el número. Una investigación con fuentes y fechas lo confirmó: copiar código de un chat era como se trabajaba dos años antes. Varias lecciones se reescribieron alrededor de lo que sigue siendo cierto: definir la pregunta, supervisar al agente y comprobar el número.

**Pregunta detectora.** ¿Qué premisas de este texto dependen de lo que la herramienta puede hacer hoy? ¿Cuándo las comprobé por última vez, y contra qué fuente?

**Señal de alarma.** «Así funciona» · «todo el mundo lo hace así».

**Qué hacer.** Antes de escribir sobre una herramienta que cambia rápido, investiga la práctica actual con fuentes y fechas: qué hace hoy, qué es gratis, qué usa de verdad la gente. Arma el texto alrededor de la habilidad que sobrevive a la siguiente versión (plantear, supervisar, verificar) y deja los pasos de la herramienta en un solo lugar que se pueda actualizar. Marca lo que no pudiste comprobar y pruébalo a mano antes de publicar.

### 54. «El X al inicio y al cierre»: todo traductor elige la misma lectura equivocada

`from: f31b1607` · `by: ai`

**La idea.** Un calificativo colocado antes de dos elementos unidos por «y» puede referirse a ambos o solo al primero. Quien escribe sabe a cuál se refiere; quien lee tiene que adivinar, y los traductores adivinan igual.

**Ejemplo.** Una página de resultados decía «lo que lo cambió son las lecciones al inicio y al cierre», refiriéndose a dos piezas de una herramienta: las lecciones que se muestran al inicio, y un paso de verificación final. Las seis traducciones lo leyeron como una sola cosa: lecciones mostradas al inicio y al final. Dos días después, la misma forma entró en un párrafo nuevo, y las traducciones volvieron a leerla mal.

**Pregunta detectora.** En esta frase, ¿alguna «el X en A y B» tiene dos lecturas? Traducida palabra por palabra, ¿saldría la otra lectura?

**Señal de alarma.** Una lista de dos donde un elemento es una cosa y el otro es un momento o un lugar.

**Qué hacer.** Haz visible la separación. Cuéntala («dos piezas: …»), dale a cada elemento su propio artículo («las lecciones al inicio, y el cierre»), o pon primero el elemento corto («el cierre, y las lecciones al inicio»). Luego lee la traducción de esa frase para ver si dice la lectura que querías.

### EDU-2. Lo que se ve antes de responder no puede traer la respuesta

`from: a7bc9d8b` · `by: author`

**La idea.** Una pregunta deja de medir si la respuesta ya apareció: en una imagen, en la idea clave, en la explicación de otro ejercicio, en el título de un paso o en una lección anterior. Quien contesta bien pudo haberla leído.

**Ejemplo.** Una ilustración con la cifra correcta quedaba arriba de la práctica que pedía calcularla. Una lección preguntaba qué pasa al guardar otro valor en una variable, en un paso titulado «Guardar otra vez reemplaza». Un resumen debajo del quiz final se leía antes de contestarlo. Y un recuadro que aparece tras el primer intento, aunque falle, daba la dirección de la respuesta.

**Pregunta detectora.** Esta cifra, imagen o frase, ¿la ve el estudiante antes de contestar, aquí o en una lección anterior? No solo la cifra exacta: también una aproximación («unas 25»), la conclusión escrita al pie de una imagen, un título, un «acabas de ver que…», o lo que muestra en pantalla el error más probable de un ejercicio anterior.

**Señal de alarma.** «Es solo contexto» · «es solo el título» · «es el pie de la imagen».

**Qué hacer.** Busca cada respuesta en todo lo que se ve antes de su pregunta, también en lo que aparece tras un primer intento fallido, en lo que imprime el código de partida al correrlo, en los archivos que se descargan y en lo que se puede contar en un dibujo. Escribe el título del paso y los objetivos al final, y léelos junto al resultado de cada predicción. Una revisión automática encuentra las cifras exactas; las aproximaciones y las frases con otras palabras solo las encuentra quien lee con la respuesta en mente.

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
