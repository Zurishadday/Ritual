# Interfaz y diseño

Lo que aplica cuando una persona va a ver o usar lo que haces: pantallas, componentes, estilos, páginas.

### 10. Los módulos gemelos se cambian juntos

`origen: campo`

**La idea.** Si tu producto tiene dos versiones de la misma pantalla, para dos tipos de usuario, dos regiones o dos productos, una mejora en una es una mejora pendiente en la otra.

**Ejemplo.** La versión de escritorio ganó un filtro por fecha. La de celular, que la gente ve como «la misma pantalla», siguió sin él durante un mes.

**Pregunta detectora.** ¿Esto que toco tiene un gemelo que el usuario ve como «el mismo módulo»?

**Señal de alarma.** «En el otro no me lo pidieron».

**Qué hacer.** No cierres el cambio hasta revisar el gemelo y decir «igual» o «no aplica porque…».

### 19. Una revisión de una sola dimensión no es una revisión

`origen: campo`

**La idea.** «Ya están iguales» exige haber comparado todas las propiedades que se ven, no solo una.

**Ejemplo.** Se homologó el diseño de dos pantallas en cuatro rondas: primero el tamaño, luego la tipografía, luego los colores, luego el color de los rótulos. Cada entrega decía «ya quedó».

**Otro ejemplo.** Las ilustraciones de un material se revisaban por contenido y por tamaño, pero no por contraste: dos colores de texto quedaron por debajo del mínimo legible en cuatro imágenes.

**Pregunta detectora.** ¿Comparé una propiedad o todas las que el usuario ve?

**Señal de alarma.** «Ya coincide el tamaño, entonces el diseño es el mismo».

**Qué hacer.** Enumera todas las diferencias antes de corregir la primera. Y en tus registros, el verbo te delata: «queda», «pasa a» son intención; «dice», «muestra» son medición.

### 31. Nada técnico en pantalla si no cambia una decisión

`origen: campo`

**La idea.** Cada elemento de una pantalla de negocio debe ayudar a decidir algo. Lo que sirve para auditar va en el código; lo que sirve para decidir va en la pantalla, en lenguaje de negocio.

**Ejemplo.** Una pantalla de ventas mostraba en la primera fila el identificador interno de cada pedido y la hora del último cálculo. Nadie decidía nada con eso, y ocupaba el lugar del dato que sí importaba.

**Pregunta detectora.** ¿Esto cambia alguna decisión de quien usa la pantalla? Si no, ¿por qué está aquí?

**Señal de alarma.** «Por si alguien lo necesita».

**Qué hacer.** Antes de agregar algo a la pantalla, escribe qué decisión cambia. Si no cambia ninguna, va al registro técnico o al código, no a la pantalla.

### 32. Lo que funciona y no se ve se reporta como roto

`origen: campo` · `paquetes: web, apps`

**La idea.** Si un botón cambia algo fuera de la vista, para el usuario funcionar y no funcionar se ven igual.

**Ejemplo.** Un filtro sí filtraba una tabla, pero la tabla estaba dos pantallas más abajo. Lo reportaron como «no hace nada».

**Variante.** Ocultar un contenedor oculta todo lo que vive dentro, incluso lo que no tenía que ver con él. Por ejemplo, un enlace útil que vivía dentro de un control retirado.

**Pregunta detectora.** Justo después de usar el control, sin moverse de donde está, ¿el usuario ve qué cambió?

**Señal de alarma.** «Sí funciona, nada más no se ve».

**Qué hacer.** Todo control dice qué cambió y lleva al usuario hasta ahí. Y antes de ocultar algo, revisa qué otros elementos viven dentro.

### 33. El glifo no es el texto

`origen: campo`

**La idea.** En letra pequeña, «÷» y «+», «l» y «1», «O» y «0» se confunden. Si dos personas leen lo mismo mal, no están distraídas: es el tamaño de la letra.

**Ejemplo.** Dos personas distintas leyeron «98 ÷ 441» como «98 + 441» en una tarjeta con letra pequeña, y las dos reportaron que la cuenta estaba mal.

**Otro ejemplo.** La fuente de código de un material unía `>=` en un solo símbolo, ⩾. Quien aprende copia lo que ve, y ese símbolo no existe en el teclado ni en el lenguaje.

**Pregunta detectora.** En el tamaño y la fuente en que se va a leer, ¿este símbolo se puede confundir con otro, o se ve como algo que no se puede escribir?

**Señal de alarma.** «En mi pantalla se ve bien».

**Qué hacer.** Cuando un símbolo se confunde, cámbialo por una palabra: «98 sobre 441» en lugar de «98 ÷ 441».

### 41. Comprueba en el formato que lee la gente

`origen: campo` · `grupos: practicas-y-pruebas` · `paquetes: web`

**La idea.** Buscar una palabra en el texto no prueba que se vea. El texto puede estar en otro lugar del documento mientras el formato que lo debía mostrar sale vacío.

**Ejemplo.** Tres pasos numerados salían como viñetas vacías. La revisión automática los daba por buenos porque esas palabras aparecían en otra parte del documento.

**Otro ejemplo.** Se agregó un aviso de «hay más columnas a la derecha» y se dio por hecho porque el código estaba ahí. Nunca aparecía: un estilo general de las tablas le quitaba la condición que lo encendía. Lo vio otra persona en una captura.

**Un ejemplo más.** Una opción de respuesta decía en el archivo «Total: {2 * 78}». Al dibujar la página, el sistema calculó lo que iba entre llaves y mostró «Total: 156»: dos opciones idénticas. Solo lo vio quien miró la pantalla.

**Pregunta detectora.** ¿Vi el elemento exacto tal como lo ve el lector, o solo encontré la palabra (o el código) en la fuente?

**Señal de alarma.** «La palabra está en el archivo» · «es un arreglo de una línea».

**Qué hacer.** Verifica el elemento exacto, como «estos tres pasos, como viñetas», y mira al menos una vez la página tal como la verá el lector. Un arreglo chico se mira igual: es donde menos se espera que otra regla lo anule. Y la primera vez que usas un recurso nuevo en la página (un bloque de código, un encabezado fijo), míralo también en el celular.

### 45. El camino del error también lo recorre alguien

`origen: campo` · `paquetes: web, apps`

**La idea.** Si solo pruebas lo que pasa cuando todo sale bien, quien se equivoca encuentra el hueco. Y al aprender, equivocarse es lo más común.

**Ejemplo.** Una celda de consulta contaba un intento solo cuando la consulta corría. Con un error de escritura, el botón para avanzar nunca se activaba y la persona se quedaba atorada. Las pruebas pasaban, porque siempre corrían la consulta de partida, que no tenía errores.

**Pregunta detectora.** Si el usuario hace mal lo más probable (un error de escritura, una respuesta vacía, dos clics), ¿qué ve, y puede seguir?

**Señal de alarma.** «Con la respuesta correcta funciona».

**Qué hacer.** Por cada control, prueba tres caminos: el bueno, el del error más común y el vacío. Los tres dicen qué pasó y dejan seguir.

### 46. Lo que corre en cada petición no puede crecer con el contenido

`origen: campo` · `paquetes: web`

**La idea.** Algo que se hace en cada página, como leer todo el contenido o recalcular un índice, cuesta poco con diez páginas y mucho con cien. Crece de a poco y nadie lo nota, hasta que algo empieza a fallar «de vez en cuando».

**Ejemplo.** Cada página de un sitio leía y analizaba todo el contenido para armar el temario. Sola, una página tardaba 0.4 s. Pero la barra lateral pedía unas 40 a la vez, y juntas tardaban 16 s. Meses después, las pruebas empezaron a fallar al cambiar de página, y la falla parecía de la prueba.

**Pregunta detectora.** ¿Esto que corre en cada petición recorre todo el contenido? ¿Cuánto tarda hoy, cuánto con el doble y cuánto con muchas peticiones a la vez?

**Señal de alarma.** «En local carga rápido» · «es una falla intermitente».

**Qué hacer.** Mide en el servidor compilado y como lo usa la gente, con todas sus peticiones juntas, no una página sola. Guarda lo que no cambia mientras corre el servidor, y deja una prueba que lo mida con el caso que de verdad lo hacía lento.

### 49. Una regla general no debe ganarle en silencio a las particulares

`origen: campo` · `paquetes: web`

**La idea.** Una regla que aplica a todo (un estilo global, un valor por defecto) puede pisar lo que cada pieza decidió para sí, sin que nada avise.

**Ejemplo.** El estilo del foco del teclado, escrito para todo el sitio, traía su propio redondeo. Como quedaba por encima de los estilos de cada componente, un botón en forma de píldora cambiaba de forma al enfocarlo con el teclado. Nadie lo vio, porque con el ratón el foco no aparece.

**Pregunta detectora.** Esta regla general, ¿toca algo que cada pieza ya decide por su cuenta? Si chocan, ¿cuál gana?

**Señal de alarma.** «Lo puse global para no repetirlo».

**Qué hacer.** Que la regla general toque solo lo suyo (el contorno del foco, no la forma). Si debe ganar a propósito, escríbelo junto a ella. Y pruébala en la pieza más distinta, no solo en la común.
