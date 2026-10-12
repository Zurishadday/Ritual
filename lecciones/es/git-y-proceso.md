# Git y proceso

Lo que aplica cuando guardas, cierras, entregas o coordinas: commits, estados, pendientes, trabajo en paralelo.

### 8. Enumera a los consumidores, no los recuerdes

`origen: campo`

**La idea.** Cuando cambias un dato que otros leen por su nombre, la lista de quién lo lee tiene que estar escrita. La memoria siempre deja uno fuera.

**Ejemplo.** Se actualizaron las etiquetas de tres pantallas tras cambiar un modelo. La cuarta, que nadie recordaba, siguió ofreciendo opciones del modelo anterior.

**Otro ejemplo.** Al escribir un capítulo se afirmó de memoria que el lector ya conocía tres funciones de un capítulo anterior. Una búsqueda mostró que ese capítulo enseñaba solo una, y que otro ya había explicado el tema que se presentaba como nuevo.

**Un ejemplo más.** Un cambio se guardó con la lista de archivos escrita de memoria, y quedó fuera uno: el que hacía funcionar lo nuevo. Lo mostró la lista de cambios pendientes, revisada después.

**Pregunta detectora.** ¿De dónde saqué la lista de quién usa esto: de una búsqueda o de acordarme?

**Señal de alarma.** «Ya cubrí los tres lugares donde se usa» · «eso ya lo vieron» · «ya agregué todo».

**Qué hacer.** Mantén un mapa escrito de impactos por tipo de cambio. Recórrelo completo diciendo «cambia» o «no aplica porque…», y si el cambio crea un consumidor nuevo, agrégalo en el mismo cambio. Antes de citar, copia de la fuente citada la frase que afirmas: lo que se dice que otro hizo o vio también se comprueba.

### 9. Un estado vive en varios registros: muévelos juntos

`origen: campo`

**La idea.** Cerrar un pendiente suele implicar tres lugares: el registro de pendientes, la prueba que lo vigila y el documento que lo describe. Si mueves uno, los otros contradicen.

**Ejemplo.** Un pendiente se marcó como cerrado en la lista, pero la prueba que lo vigilaba seguía marcada como «se espera que falle» y el documento lo describía como abierto. Tres lugares, tres versiones.

**Pregunta detectora.** ¿Qué otros lugares afirman este estado? Nómbralos antes de guardar.

**Señal de alarma.** «Luego actualizo el otro lado».

**Qué hacer.** La unidad de trabajo es el conjunto completo, en el mismo cambio.

### 30. Explica antes de hacer y espera el sí

`origen: campo`

**La idea.** Avanzar rápido en la dirección equivocada no es avanzar.

**Ejemplo.** Se reorganizó la estructura de carpetas de un proyecto entero sin avisar. El cambio era correcto en sí mismo y se deshizo completo, porque otra persona ya había decidido esa estructura por razones que no estaban en el código.

**Pregunta detectora.** ¿Este bloque es grande, difícil de deshacer o cambia algo que otra persona ya decidió? Si sí, explica y espera. Si no, di qué harás y sigue: pedir permiso para cada paso también cuesta.

**Señal de alarma.** «Ya sé lo que quiere».

**Qué hacer.** Antes de cada bloque de trabajo grande, explica en lenguaje sencillo qué harás y por qué, y espera la confirmación.

### 35. Una lista de pendientes escrita de paso envejece

`origen: campo`

**La idea.** Lo que anotaste «para después» mientras hacías otra cosa puede ya no existir, o haber sido una decisión deliberada.

**Ejemplo.** Una nota decía «quitar el filtro de fechas». Cuando por fin se trabajó, el filtro ya era una decisión escrita del equipo, y quitarlo rompió un reporte.

**Pregunta detectora.** ¿Medí hoy este pendiente, o lo voy a trabajar solo porque está escrito?

**Señal de alarma.** «Estaba en la lista».

**Qué hacer.** Antes de trabajar un pendiente, mídelo hoy y busca si alguna decisión escrita dice que se quedó así a propósito.

### 40. El registro dice qué quedó y por qué, no la crónica de tropiezos

`origen: campo`

**La idea.** Un historial de cambios sirve para entender el producto, no para narrar los errores ya resueltos de quien lo hizo.

**Ejemplo.** Un historial decía «se intentó A y falló; se intentó B y falló; quedó C». Quien lo leía meses después solo necesitaba C y su razón, y tuvo que leer tres párrafos para encontrarla.

**Pregunta detectora.** Esta línea, ¿le sirve a alguien para entender el producto o para no repetir un error, o solo cuenta lo que me pasó?

**Señal de alarma.** «Que quede constancia de todo lo que pasó».

**Qué hacer.** Escribe el estado final y su razón. Lo que se intentó y falló solo entra si enseña algo que alguien necesita para no repetirlo.

### 47. Lo que se trabaja en paralelo se cruza en lo compartido

`origen: campo`

**La idea.** Cuando varias personas trabajan a la vez, cada una ve bien su pieza. Lo que comparten (las pruebas, los datos, los documentos de todo el proyecto) junta sus cambios: nombres que chocan, copias que se quedan atrás, pruebas que leen el trabajo a medias de otra persona. Integrar es un trabajo, no un pegado.

**Ejemplo.** Cuatro personas escribían a la vez una pieza cada una y dejaban lo compartido como entrega. Al integrar, dos entregas usaban un nombre que ya existía en la prueba común, y la prueba dejó de correr. Otra prueba guardaba una copia de lo que revisaba, la pieza cambió y la copia no. Una corrida de las pruebas falló por una imagen que otra persona todavía estaba dibujando. Y al final no se podía guardar cada pieza por separado: los archivos comunes ya traían cambios de todas.

**Pregunta detectora.** ¿Qué archivo tocan dos piezas a la vez, y quién lo integra? ¿Mi prueba está leyendo el trabajo a medias de otra persona?

**Señal de alarma.** «Cada quien probó lo suyo» · «la falla es de otra pieza».

**Qué hacer.** Que lo compartido lo integre una sola persona, con un paso que se detenga si un nombre choca. Que las pruebas lean el original, no una copia. Corre las pruebas completas cuando todas terminen, o sin las piezas que siguen cambiando, y di cuáles quedaron fuera. Y guarda juntas las piezas que comparten archivos, para que cada versión guardada funcione completa.
