# Prácticas y pruebas

Lo que aplica cuando compruebas algo: pruebas automáticas, validadores, revisiones, calibración.

### 13. Un verificador que nunca vio el error no verifica nada

`from: 200d356e` · `by: ai`

**La idea.** Una prueba que siempre pasa puede estar rota. La única forma de saberlo es verla fallar contra el error real.

**Ejemplo.** Una prueba que prohíbe una palabra solo buscaba la versión en minúsculas; con mayúsculas o con un acento pasaba.

**Otro ejemplo.** Se sembraron 37 registros duplicados para un ejercicio y el conteo dio 92: los datos ya traían coincidencias naturales. Lo atrapó una comprobación que, antes de guardar, comparaba el conteo con lo sembrado.

**Un ejemplo más.** Una regla que detectaba código sangrado marcó una línea que empezaba con un texto: el caso que debía pasar no traía esa forma. Y una prueba de que el texto se comparaba bien pasaba aunque la comparación estuviera rota, porque otra revisión rechazaba antes el error.

**Un cuarto ejemplo.** Un clasificador que marca objeciones de venta dio 0 falsas alarmas en 30 frases ordinarias de clientes, y ese número se reportó. Al agregar 25 frases de los mismos temas que decían lo contrario (señales de compra como «¿puedo pagar con tarjeta?»), se disparó 7 veces. En otro proyecto, un detector que bajaba las respiraciones de una pista de voz también bajaba la «s» final de las palabras: nada en su prueba sonaba a respiración sin serlo.

**Pregunta detectora.** ¿Probé mi verificación contra el error en las formas en que aparecería de verdad? ¿Y contra los casos correctos que más se parecen al error: el mismo tema, las mismas palabras, el significado contrario?

**Señal de alarma.** «Ya pasa, entonces está bien puesta». · «Cero falsas alarmas, listo».

**Qué hacer.** Calibra con dos casos: uno donde debe encontrar y otro donde no debe, y córrela de verdad el día que nace. El caso bueno importa tanto como el malo: un verificador que rechaza lo correcto también está roto, y se nota menos, porque parece exigente. El caso bueno lleva las formas reales de lo correcto, también las que no escribiste tú: otro orden, otro nombre. Construye los más difíciles a propósito: por cada cosa que la verificación debe atrapar, su gemelo que debe dejar pasar, y reporta las falsas alarmas de esos aparte de las fáciles; un cero que sale solo de los casos fáciles no dice nada. Cada verificación se calibra sola: si otra atrapa el error antes, la tuya nunca se probó. Y una revisión que repite lo que ya leyó no puede fallar (una «segunda corrida» que vuelve a leer el mismo archivo): cámbiala por un cuadre que sí falle si algo está mal.

### 14. La sonda no viaja por el canal que investiga

`from: 5c6ecad0` · `by: author`

**La idea.** Si tu verificación pasa por la misma tubería que pudo causar el daño, el daño también la afecta a ella, y responde lo mismo esté bien o mal.

**Ejemplo.** Se buscaba un problema de acentos mandando consultas con acentos por la misma vía que los dañaba.

**Pregunta detectora.** ¿La transformación que investigo también transforma a mi prueba?

**Señal de alarma.** «Lo compruebo mandando otra consulta igual».

**Qué hacer.** Construye la prueba en una forma que el daño no pueda tocar.

### 15. Una prueba que se apaga sola no avisa que se apagó

`from: 86581aad` · `by: author`

**La idea.** Las ramas de «si no encuentro el dato, me salto la prueba» se activan justo cuando el mundo cambia, y dejan de vigilar sin que nadie lo note.

**Ejemplo.** Una prueba ubicaba una tabla por su título y, si no lo encontraba, se saltaba. El título cambió, y la prueba pasó durante semanas sin mirar nada.

**Variante.** Una verificación que se cae con el primer archivo roto deja sin vigilar todos los que venían después. Un validador que truena, en lugar de reportar «esta página no se puede leer, línea 12», apaga la revisión entera.

**Pregunta detectora.** ¿Mi prueba tiene una salida silenciosa que se activa con un cambio legítimo?

**Señal de alarma.** «Si no encuentro el ancla, me salto la prueba».

**Qué hacer.** Si lo que falta es una herramienta, saltarla es honesto. Si lo que falta es el dato vigilado, la prueba debe fallar. Y un archivo que no se puede leer es un hallazgo con su línea, no el fin de la revisión.

### 16. El filtro de tu verificador suele excluir justo lo que importa

`from: ef7dcfa7` · `by: ai`

**La idea.** Toda revisión automática filtra lo «relevante», y ese filtro puede dejarla ciega exactamente donde está el problema.

**Ejemplo.** Un auditor de diseño revisaba solo los elementos sin hijos. Los rótulos que había que revisar tenían dentro un ícono de ayuda, así que nunca los vio.

**Otro ejemplo.** Una prueba recorría cada página marcando siempre la primera opción y corriendo cada consulta tal como venía. Pasaba siempre, y nunca comprobó que la respuesta correcta se aceptara.

**Un ejemplo más.** Para decidir si alguien cambió un texto, se ignoraron los espacios. Eso dejó fuera justo el caso de la página que explicaba cómo acomodar ese texto con espacios y saltos de línea. Normalizar también es filtrar. Y una corrida de pruebas para una página «pasó» sin probar nada: el filtro era una expresión regular sobre los nombres de las pruebas, y el título de la página tenía paréntesis, que son caracteres especiales en una expresión regular; el filtro no coincidió con ninguna prueba y no corrió ninguna.

**Pregunta detectora.** ¿Qué deja fuera mi filtro? Escríbelo antes de creerle al resultado. ¿Y cuántas seleccionó? Cero no es un pase.

**Señal de alarma.** «Encontró 48 diferencias, ya tengo la lista» · «la prueba recorre todas» · «la corrida filtrada pasó».

**Qué hacer.** Escribe qué deja fuera el filtro y revisa a mano una muestra de lo excluido. Y cuando aprendas que un filtro te dejó ciego, busca los otros filtros parecidos que ya escribiste: una revisión que quitaba todos los espacios del código pegó dos palabras en una, y rechazó código correcto, poco después de que se aprendiera la misma lección con otra normalización. Antes de leer el veredicto de una corrida filtrada, cuenta lo que el filtro seleccionó (`--list`, o el conteo de pruebas que corrió el ejecutor), y filtra por un identificador en lugar de por un nombre: una corrida que no seleccionó nada no tiene veredicto, y sin veredicto se dice «no sé» (ver la 44).

### 17. Que el código compile no es que corra

`from: 2a71a25d` · `by: author`

**La idea.** Un revisor de sintaxis aprueba código que truena al ejecutarse. Una pantalla en blanco con todo «en verde» es el peor fallo posible.

**Ejemplo.** Una página pasaba la revisión de sintaxis y la de tipos. Al abrirla quedaba en blanco: usaba una variable que solo existe en el servidor.

**Pregunta detectora.** Mi prueba, ¿ejecuta el código o solo lo lee?

**Señal de alarma.** «La revisión de sintaxis pasa, el código está bien».

**Qué hacer.** Ten al menos una prueba que ejecute la página o el programa completo.

### 18. Verificar el origen no es verificar lo entregado

`from: fd2f11f3` · `by: author`

**La idea.** Si compruebas X y al usuario le llega Y, derivado de X, entre los dos hay código que nadie está mirando.

**Ejemplo.** Se verificaba que cada resultado publicado fuera correcto, pero a la pantalla viajaba una versión armada a partir de él, que usaba otra regla para los datos faltantes.

**Otro ejemplo.** Un revisor leía el archivo fuente de cada página y lo aprobaba. Una tabla que en el celular se apilaba en tarjetas, y ya no se podía comparar, solo apareció al mirar la página.

**Pregunta detectora.** ¿Alguien comprueba lo que llega a la pantalla, o solo lo que sale de la fuente?

**Señal de alarma.** «Sale de un dato ya verificado» · «el archivo está bien».

**Qué hacer.** Comprueba en el punto donde llega a la persona: la página como se ve, el archivo que descarga, el mensaje que recibe (ver también la 41).

### 26. Lo que está en producción también se echa a perder

`from: 7b79664a` · `by: author`

**La idea.** Los filtros de calidad suelen revisar lo nuevo. Lo que ya entró se quedó, y sus supuestos envejecen sin que nadie vuelva a preguntar.

**Ejemplo.** Un reporte publicado hacía un año seguía filtrando por una columna que la fuente había dejado de llenar. Mostraba cero, y como «ya estaba validado», nadie volvió a preguntar.

**Pregunta detectora.** Esto que lleva meses corriendo, ¿alguien volvió a verificar sus supuestos después de publicarlo?

**Señal de alarma.** «Eso ya lo validamos cuando se publicó».

**Qué hacer.** Somete a lo que ya está en uso a las mismas pruebas que al candidato nuevo, en cada revisión.

### 28. Quien ejecuta y quien verifica son personas distintas

`from: 0090f5e0` · `by: ai`

**La idea.** Si la misma persona ejecuta y confirma, un error de ejecución se confirma a sí mismo.

**Ejemplo.** Quien escribía cada página tomaba también las capturas de revisión, y solo de los pasos que creía riesgosos. El revisor leía el archivo fuente. Los pasos sin captura no los vio nadie.

**Pregunta detectora.** ¿Quién, además de quien lo hizo, revisó el resultado tal como lo recibe el usuario?

**Señal de alarma.** «Ya lo revisé yo».

**Qué hacer.** Uno ejecuta y el otro comprueba leyendo el resultado. «Ya lo hice» es el aviso de que ya se puede verificar, no la verificación. Y el que verifica no mira por el mismo canal que quien hizo (ver la 14): si los dos leen solo la fuente, ninguno ve la pantalla. Un revisor que aprueba una afirmación sobre una herramienta (qué hace, qué tiene, cómo está configurada) dice qué miró hoy: su ayuda, su configuración o una corrida de ella. Si no lo miró, lo dice, y el trabajo se detiene hasta que alguien lo haga.

### 34. A un hallazgo de QA créele el síntoma y mide la causa

`from: b3b868fb` · `by: author`

**La idea.** Un reporte de calidad suele acertar en el síntoma y proponer una causa que es solo una hipótesis.

**Ejemplo.** Un reporte pidió arreglar una gráfica que sumaba mal, pero esa gráfica no existía en la pantalla: el dato viajaba sin que nada lo dibujara.

**Pregunta detectora.** ¿Puedo reproducir la causa con mi propia medición, o la acepto porque suena bien?

**Señal de alarma.** «El reporte ya dice cuál es la causa».

**Qué hacer.** Mide antes y después del arreglo. Un arreglo que mejora el síntoma a medias todavía no está cerrado.

### 55. El verde en tu máquina es el veredicto de una sola máquina

`from: 4bc0daad` · `by: ai`

**La idea.** Una verificación que pasó donde la corriste dice que el trabajo sirve en esa máquina: su sistema, su velocidad, su reloj, su zona horaria, sus nombres de archivo. Donde el trabajo corre de verdad (otro sistema, un servidor, CI, la computadora del usuario), cualquiera de esas cosas puede ser distinta, y la misma verificación puede fallar allí aunque aquí pase.

**Ejemplo.** Una prueba de un resumen pasó en la máquina Windows del desarrollador y se subió, seis commits seguidos. En los corredores de CI con Linux falló siempre: las máquinas eran tan rápidas que registraban una entrada en el mismo milisegundo que la marca que la prueba acababa de escribir, así que «después de la marca» la dejaba fuera. El veredicto local se leía cada vez; el de las otras máquinas estaba en un correo hasta que lo encontró el usuario.

**Pregunta detectora.** ¿Dónde va a correr esto de verdad, y mi verificación corrió allí o solo aquí? Si existe un veredicto de allá (CI, un servidor de pruebas, el dispositivo del usuario), ¿lo leí antes de decir que funciona?

**Señal de alarma.** «En mi máquina sí funciona», o un push seguido de la siguiente tarea mientras CI sigue corriendo o está en rojo. Todo lo que depende del tiempo, el orden, la velocidad, las mayúsculas de los nombres de archivo, los separadores de ruta, los finales de línea, el idioma o la zona horaria.

**Qué hacer.** Nombra las máquinas donde corre el trabajo y consigue un veredicto de cada una: lee CI hasta el final después de cada push (cada job, no solo el primero en verde), corre en el servidor o en una copia de él, o pide el resultado del usuario. Una falla en una de ellas es real aunque aquí nunca aparezca: reprodúcela aquí forzando la diferencia (una fecha fija, un reloj rápido, una ruta sensible a mayúsculas) antes de arreglarla, y arregla el supuesto, no la máquina.

### EDU-1. Si la respuesta sale igual sin la habilidad, el ejercicio no la mide

`from: 164808ab` · `by: ai`

**La idea.** Un ejercicio comprueba una habilidad solo si quien se la salta obtiene otro resultado. Si el punto de partida, un ejemplo o un atajo ya dan la respuesta correcta, el ejercicio aprueba a todos. Es la lección 13 aplicada a ejercicios: una revisión vale algo solo después de verla rechazar el error.

**Ejemplo.** Una práctica pedía la compra más grande del verano, con un filtro de fechas. La más grande de toda la tabla también era del verano: sin el filtro salía el mismo número, y el ejercicio la aceptaba. Otra exigía que el código tuviera un `=`, y pasaba con el resultado tecleado a mano, `total = 1945`. La revisión miraba la letra, no la habilidad.

**Otro ejemplo.** Una práctica hecha en una hoja de cálculo pedía a los estudiantes configurar la región, importar un CSV y escribir cuántas unidades tenía de un producto. La cuenta era un número entero guardado en el archivo: un editor de texto plano lo mostraba sin importar nada ni configurar la región. Se reemplazó por unidades multiplicadas por un precio con punto decimal, que solo da el número esperado si la hoja interpreta bien ese decimal. En el mismo curso, un ejercicio para ordenar archivos por su extensión se podía resolver solo con los nombres de los archivos.

**Un ejemplo más.** En un curso con interfaces dibujadas (un navegador, una bandeja de correo, una hoja de cálculo), los ejercicios revisaban solo el estado final, y otros caminos llegaban a él. Cerrar la lección y quedarse en la otra pestaña pasó «cambiar de pestaña»; reabrir otra pestaña pasó «reabrir la lección»; borrar la celda y arrastrar el controlador de relleno pasó «copiar la fórmula». Y un contador contó dos veces un correo falso cuando se reportó y después se borró.

**Pregunta detectora.** ¿Qué resultado obtiene quien omite justo lo que enseño, o quien entrega el ejercicio sin tocarlo? ¿Es distinto del correcto? ¿Elegí un caso donde los dos cálculos coinciden por casualidad (el primer grupo, el primer paso, el total)?

**Señal de alarma.** «Con la respuesta correcta da el número, ya funciona» · «De todos modos van a hacer la configuración».

**Qué hacer.** Resuelve cada ejercicio tres veces: sin tocarlo, con el error más probable y bien. Solo la tercera debe pasar. Prueba en todos la misma lista de atajos: el número tecleado, el código de partida con la respuesta agregada al final, el síntoma corregido a mano en lugar de la causa, la palabra exigida usada vacía, y una corrida con la memoria de un intento anterior. Deja la tolerancia más chica que la distancia entre la respuesta y el error probable, y escribe tres formas correctas que usaría un estudiante, para no rechazar lo que está bien. Cuando la práctica ocurre en otra herramienta y solo vuelve un número tecleado, pide uno que aparezca solo después del paso enseñado (un cálculo al que afecta la configuración), no un valor guardado en el archivo, y agrega «la configuración omitida» a los atajos. En un ejercicio de ordenar, mantén igual todo excepto la función que se enseña. En una interfaz dibujada, revisa el camino, no solo el estado final: la acción enseñada tiene que ocurrir, así que cerrar la pestaña de la lección no debe contar como cambiar de pestaña. Y cuenta cada elemento una sola vez, pase lo que pase después.

### EDU-4. Si adivinas la correcta por su lugar, su largo o su aspecto, el quiz mide la suerte

`from: d2e6b716` · `by: ai`

**La idea.** Cada pregunta puede estar bien sola y el conjunto delatar la respuesta: la correcta es siempre la segunda, siempre la más larga, siempre la de largo medio o la única con un botón. Los estudiantes notan los patrones antes que quien escribe.

**Ejemplo.** En el quiz de cierre de un módulo, la correcta era la segunda opción en seis de siete preguntas. En todo un curso, la correcta era la más larga en el 55 % de las preguntas, cuando al azar, con tres opciones, toca una de cada tres. Después de emparejar los largos a mano, la correcta quedó como la más corta en seis de siete preguntas de una lección, y en medio en todas las de tres lecciones seguidas.

**Otro ejemplo.** En un buzón de correo dibujado, solo los correos falsos tenían un botón de reportar, así que los estudiantes reportaban sin leer el remitente. En una pregunta de «toca la captura correcta», la captura correcta era la única con contenido: las otras dos eran bloques de color.

**Pregunta detectora.** Si leo solo el lugar, el largo y el aspecto de las opciones, sin el texto, ¿adivino la correcta más de una vez de cada tres?

**Señal de alarma.** «Revisé cada pregunta y todas están bien».

**Qué hacer.** Baraja las opciones al mostrarlas, con un orden que no salga de dónde se escribió la correcta. Mide la más larga, la más corta y la de en medio por archivo, y junta por módulo los archivos chicos, para que unas pocas preguntas no escondan el patrón. Lee el conteo contra lo que pediste: emparejar a mano puede mover la pista en lugar de quitarla. Da a cada opción los mismos controles (cada correo tiene un enlace y un botón), y dibuja las opciones incorrectas tan creíbles como la correcta.
