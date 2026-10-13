# Prácticas y pruebas

Lo que aplica cuando compruebas algo: pruebas automáticas, validadores, revisiones, calibración.

### 13. Un verificador que nunca vio el error no verifica nada

`from: eb6c6b31` · `by: author`

**La idea.** Una prueba que siempre pasa puede estar rota. La única forma de saberlo es verla fallar contra el error real.

**Ejemplo.** Una prueba que prohíbe una palabra solo buscaba la versión en minúsculas; con mayúsculas o con un acento pasaba.

**Otro ejemplo.** Se sembraron 37 registros duplicados para un ejercicio y el conteo dio 92: los datos ya traían coincidencias naturales. Lo atrapó una comprobación que, antes de guardar, comparaba el conteo con lo sembrado.

**Un ejemplo más.** Una regla que detectaba código sangrado marcó una línea que empezaba con un texto: el caso que debía pasar no traía esa forma. Y una prueba de que el texto se comparaba bien pasaba aunque la comparación estuviera rota, porque otra revisión rechazaba antes el error.

**Pregunta detectora.** ¿Probé mi verificación contra el error en las formas en que aparecería de verdad? ¿Y contra el caso correcto?

**Señal de alarma.** «Ya pasa, entonces está bien puesta».

**Qué hacer.** Calibra con dos casos: uno donde debe encontrar y otro donde no debe, y córrela de verdad el día que nace. El caso bueno importa tanto como el malo: un verificador que rechaza lo correcto también está roto, y se nota menos, porque parece exigente. El caso bueno lleva las formas reales de lo correcto, también las que no escribiste tú: otro orden, otro nombre. Cada verificación se calibra sola: si otra atrapa el error antes, la tuya nunca se probó. Y una revisión que repite lo que ya leyó no puede fallar (una «segunda corrida» que vuelve a leer el mismo archivo): cámbiala por un cuadre que sí falle si algo está mal.

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

`from: 5301da23` · `by: author`

**La idea.** Toda revisión automática filtra lo «relevante», y ese filtro puede dejarla ciega exactamente donde está el problema.

**Ejemplo.** Un auditor de diseño revisaba solo los elementos sin hijos. Los rótulos que había que revisar tenían dentro un ícono de ayuda, así que nunca los vio.

**Otro ejemplo.** Una prueba recorría cada página marcando siempre la primera opción y corriendo cada consulta tal como venía. Pasaba siempre, y nunca comprobó que la respuesta correcta se aceptara.

**Un ejemplo más.** Para decidir si alguien cambió un texto, se ignoraron los espacios. Eso dejó fuera justo el caso de la página que explicaba cómo acomodar ese texto con espacios y saltos de línea. Normalizar también es filtrar.

**Pregunta detectora.** ¿Qué deja fuera mi filtro? Escríbelo antes de creerle al resultado.

**Señal de alarma.** «Encontró 48 diferencias, ya tengo la lista» · «la prueba recorre todas».

**Qué hacer.** Escribe qué deja fuera el filtro y revisa a mano una muestra de lo excluido. Y cuando aprendas que un filtro te dejó ciego, busca los otros filtros parecidos que ya escribiste: una revisión que quitaba todos los espacios del código pegó dos palabras en una, y rechazó código correcto, poco después de que se aprendiera la misma lección con otra normalización.

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

`from: ed079f80` · `by: author`

**La idea.** Si la misma persona ejecuta y confirma, un error de ejecución se confirma a sí mismo.

**Ejemplo.** Quien escribía cada página tomaba también las capturas de revisión, y solo de los pasos que creía riesgosos. El revisor leía el archivo fuente. Los pasos sin captura no los vio nadie.

**Pregunta detectora.** ¿Quién, además de quien lo hizo, revisó el resultado tal como lo recibe el usuario?

**Señal de alarma.** «Ya lo revisé yo».

**Qué hacer.** Uno ejecuta y el otro comprueba leyendo el resultado. «Ya lo hice» es el aviso de que ya se puede verificar, no la verificación. Y el que verifica no mira por el mismo canal que quien hizo (ver la 14): si los dos leen solo la fuente, ninguno ve la pantalla.

### 34. A un hallazgo de QA créele el síntoma y mide la causa

`from: b3b868fb` · `by: author`

**La idea.** Un reporte de calidad suele acertar en el síntoma y proponer una causa que es solo una hipótesis.

**Ejemplo.** Un reporte pidió arreglar una gráfica que sumaba mal, pero esa gráfica no existía en la pantalla: el dato viajaba sin que nada lo dibujara.

**Pregunta detectora.** ¿Puedo reproducir la causa con mi propia medición, o la acepto porque suena bien?

**Señal de alarma.** «El reporte ya dice cuál es la causa».

**Qué hacer.** Mide antes y después del arreglo. Un arreglo que mejora el síntoma a medias todavía no está cerrado.

### EDU-1. Si la respuesta sale igual sin la habilidad, el ejercicio no la mide

`from: 4a591edc` · `by: author`

**La idea.** Un ejercicio comprueba una habilidad solo si quien se la salta obtiene otro resultado. Si el punto de partida, un ejemplo o un atajo ya dan la respuesta correcta, el ejercicio aprueba a todos. Es la lección 13 aplicada a ejercicios: una revisión vale algo solo después de verla rechazar el error.

**Ejemplo.** Una práctica pedía la compra más grande del verano, con un filtro de fechas. La más grande de toda la tabla también era del verano: sin el filtro salía el mismo número, y el ejercicio la aceptaba. Otra exigía que el código tuviera un `=`, y pasaba con el resultado tecleado a mano, `total = 1945`. La revisión miraba la letra, no la habilidad.

**Pregunta detectora.** ¿Qué resultado obtiene quien omite justo lo que enseño, o quien entrega el ejercicio sin tocarlo? ¿Es distinto del correcto? ¿Elegí un caso donde los dos cálculos coinciden por casualidad (el primer grupo, el primer paso, el total)?

**Señal de alarma.** «Con la respuesta correcta da el número, ya funciona».

**Qué hacer.** Resuelve cada ejercicio tres veces: sin tocarlo, con el error más probable y bien. Solo la tercera debe pasar. Prueba en todos la misma lista de atajos: el número tecleado, el código de partida con la respuesta agregada al final, el síntoma corregido a mano en lugar de la causa, la palabra exigida usada vacía, y una corrida con la memoria de un intento anterior. Deja la tolerancia más chica que la distancia entre la respuesta y el error probable, y escribe tres formas correctas que usaría un estudiante, para no rechazar lo que está bien.

### EDU-4. Si adivinas la correcta por su lugar o su largo, el quiz mide la suerte

`from: dcfa5304` · `by: author`

**La idea.** Cada pregunta puede estar bien sola y el conjunto delatar la respuesta: la correcta es siempre la segunda, siempre la más larga o siempre la de largo medio. Los estudiantes notan los patrones antes que quien escribe.

**Ejemplo.** En el quiz de cierre de un módulo, la correcta era la segunda opción en seis de siete preguntas. En todo un curso, la correcta era la más larga en el 55 % de las preguntas, cuando al azar, con tres opciones, toca una de cada tres. Después de emparejar los largos a mano, la correcta quedó como la más corta en seis de siete preguntas de una lección, y en medio en todas las de tres lecciones seguidas.

**Pregunta detectora.** Si leo solo el lugar y el largo de las opciones, sin el texto, ¿adivino la correcta más de una vez de cada tres?

**Señal de alarma.** «Revisé cada pregunta y todas están bien».

**Qué hacer.** Baraja las opciones al mostrarlas, con un orden que no salga de dónde se escribió la correcta. Mide la más larga, la más corta y la de en medio por archivo, y junta por módulo los archivos chicos, para que unas pocas preguntas no escondan el patrón. Lee el conteo contra lo que pediste: emparejar a mano puede mover la pista en lugar de quitarla.
