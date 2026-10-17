# Cifras y datos

Lo que aplica cuando calculas, mides o muestras un número: tableros, reportes, modelos, métricas.

### 1. «No pude leer» no es «no hay nada»

`from: fe96d871` · `by: author`

**La idea.** Todo dato tiene tres estados: lo tengo, de verdad no hubo nada, y no sé. Los dos últimos se dibujan igual en una gráfica, como un cero, y significan lo contrario.

**Ejemplo.** Una consulta falla por un permiso vencido y el tablero muestra «0 ventas» en la región. Nadie lo cuestiona: un cero se ve como un dato.

**Pregunta detectora.** El número que voy a mostrar, o el «todo bien» que me voy a creer, ¿podría venir de una consulta que falló, de una tabla vacía, de un permiso denegado o de una salida que no leí completa (ver la 44)?

**Señal de alarma.** «Si falla, lo dejo en cero y ya».

**Qué hacer.** Si la lectura falla, muestra el error en la propia tarjeta, no un hueco ni un cero. Y un contador que dice «0 problemas» solo se cree si antes encontró un problema que le sembraste a propósito.

### 2. Dos cosas con el mismo nombre no son la misma cosa

`from: 36e0626d` · `by: author`

**La idea.** «Cliente activo», «fecha», «el jefe», «el umbral»: la misma palabra suele esconder dos definiciones. Cuando dos reportes no cuadran, casi siempre es esto.

**Ejemplo.** «Fecha» puede ser la del evento, la de carga o la de partición. O «el jefe»: el que la persona tiene hoy, o el que tenía cuando pasó lo que estás midiendo.

**Otro ejemplo.** Una tabla de campañas traía la inversión de la empresa completa, pero los ingresos salían de una muestra de una compra de cada cien. Las dos columnas decían «pesos», y el retorno de todas las campañas salía negativo.

**Pregunta detectora.** ¿Hay una regla que es verdad para una de las dos cosas y falsa para la otra? Y si combino dos cifras en una cuenta, ¿vienen del mismo universo, la misma escala y el mismo periodo?

**Señal de alarma.** «Es la misma fecha» · «la vista ya lo filtra» · «las dos están en pesos».

**Qué hacer.** Dale a cada variante un nombre distinto en el código y en la pantalla, aunque quede feo. Y antes de dividir o restar dos cifras de fuentes distintas, escribe de dónde sale cada una: si un resultado sale igual en todos los casos (todas pierden, todas ganan), sospecha de la escala antes que del negocio.

### 3. El periodo en curso siempre está incompleto

`from: 23269694` · `by: author`

**La idea.** Un mes que no ha terminado siempre parece peor que uno cerrado. No es una tendencia: es el calendario.

**Ejemplo.** La curva de ventas «cae» en el último punto, que es el mes que va a la mitad.

**Pregunta detectora.** ¿Este cálculo incluye un periodo que todavía no termina?

**Señal de alarma.** «Ya se alcanza a ver la tendencia».

**Qué hacer.** Corta los indicadores al último periodo cerrado, o marca el periodo parcial en pantalla. Y separa los dos relojes: los números del grupo van a mes cerrado, las personas con nombre van al día.

### 4. Un campo que la fuente sobrescribe no es historia

`from: 89a9e01d` · `by: author`

**La idea.** Muchos sistemas guardan solo el valor de hoy. Si construyes una variable «histórica» sobre ese campo, estás midiendo el presente con cara de pasado.

**Ejemplo.** El sistema guarda solo el último jefe de cada persona. Para quien ya se fue, ese jefe quedó congelado, así que «la rotación del equipo de cada jefe» termina midiendo «este equipo ya no existe».

**Pregunta detectora.** ¿Este campo conserva su valor anterior cuando cambia, o lo reemplaza?

**Señal de alarma.** «Ahí está la columna, la uso».

**Qué hacer.** Pregunta a la fuente si el dato es foto o historial antes de usarlo para mirar hacia atrás.

### 5. Un resultado perfecto es una alerta, no un triunfo

`from: 44986978` · `by: author`

**La idea.** Si una variable sola separa casi sin error a los que se fueron de los que se quedaron, lo más probable es que traiga escondido el propio desenlace.

**Ejemplo.** Un modelo mejora de golpe muchísimo. Resulta que una variable vale 1 para todos los que se fueron y 0 para los que siguen, porque la fuente la llena distinto para cada grupo. Otra variante: el modelo aprende en qué año pasó algo, no a quién le pasó.

**Pregunta detectora.** ¿Mi medida de calidad podría subir porque el modelo adivina cuándo pasó algo en vez de a quién?

**Señal de alarma.** «¡Salió casi perfecto!» · «nivelemos por año y listo».

**Qué hacer.** Prueba hacia adelante: entrena con el pasado y evalúa en un periodo posterior. Y antes de normalizar por algo, pregunta si ese algo lo decide el resultado que quieres predecir.

### 12. Que la consulta corra no prueba que el número esté bien

`from: b2232042` · `by: author`

**La idea.** «No dio error» no es «está bien». Compara contra algo independiente de tu propio cálculo.

**Ejemplo.** Una pregunta de opción múltiple afirmaba que comparar un número con un texto entre comillas da error. En otros motores sí; en el que de verdad usaba la gente, la consulta corría y devolvía filas.

**Otro ejemplo.** Un texto explicaba bien que un bloque con nombre vive solo dentro de su consulta, pero su propio ejemplo daba por hecho que tres consultas separadas lo compartían. Corrida, la segunda consulta daba error: la tabla no existía.

**Un ejemplo más.** Se corrieron todos los ejemplos de una página, y aun así tres frases salieron falsas: la explicación de una opción, escrita al final, decía qué hace una línea que nadie corrió; una regla para leer errores («si dice esto, falta aquello») la contradecía otro paso de la misma página; y la introducción decía que una función «da un resultado» cuando no lo hace.

**Pregunta detectora.** ¿Con qué, fuera de mi código, voy a comprobar este resultado? Y lo que el texto afirma que hace el sistema, en un ejemplo, una regla o la explicación de una opción, ¿lo corrí en el motor real?

**Señal de alarma.** «En mi máquina corre» · «no dio error» · «así funciona, lo acabo de explicar».

**Qué hacer.** Reconcilia contra una cifra conocida, el sistema de origen o el periodo anterior. Prueba en el entorno real: con sus permisos, sus librerías y la copia del código que de verdad se ejecuta. Cada afirmación sobre cómo se comporta el sistema se corre una vez antes de escribirla, también la que aparece de paso en un ejemplo o se escribe de último. Si la afirmación es una regla general («solo», «siempre», «nunca»), busca el caso que la rompería y córrelo también: «la conversión a entero solo lee enteros» se comprobó con un texto con decimales, y resultó falsa con un número con decimales. Al decir una fracción («cinco de cada seis»), nombra el todo del que sale; y un escenario inventado también se mide: el tamaño, la diferencia y el valor p tienen que cuadrar entre sí.

### 36. Mide antes de escribir

`from: 2265b4bd` · `by: ai`

**La idea.** Cada cifra de un documento viene de una medición con fecha y fuente, no de la memoria ni de una versión anterior del documento.

**Ejemplo.** Una explicación decía que un error hacía perder «casi uno de cada cinco» boletos. Al medirlo eran más de uno de cada cinco: la frase venía del cálculo mental, no del dato.

**Otro ejemplo.** Un texto decía que un grupo de cohortes «andaba arriba del 50 %»; cinco de las doce quedaban abajo. En otro, la ilustración traía una cuenta hecha a mano que no cuadraba: el porcentaje por el total no daba el resultado dibujado.

**Un tercer ejemplo: el alcance, no la cifra.** En un curso escrito a partir de un archivo de investigación con fuentes citadas, todos los números estaban bien y las frases alrededor de ellos no: «la documentación de dos sistemas describe tres mecanismos» cuando documentaba uno; «ningún artículo lo prohíbe» después de leer dos; una encuesta que preguntó «¿qué haces para mejorar tus probabilidades cuando aplicas?» se resumió como «adapta su currículum a cada empleo»; «nadie lo ha medido» y «no hay ningún estudio» cuando la investigación simplemente no había encontrado ninguno; «las guías coinciden» sin que ninguna guía estuviera entre las fuentes. Cada una se escribió junto a su fuente; los revisores las atraparon una por una.

**Un cuarto ejemplo: lo que dice la fuente en contra.** Un párrafo de un README daba el resultado favorable de una prueba, con todas las cifras bien, mientras el archivo de resultados al que enlazaba decía que en los totales no había diferencia. El mismo día el párrafo se subió al inicio de la página y sus cifras pasaron a imágenes para una publicación, cada vez sin releer el archivo. Un revisor externo lo abrió y llamó al titular una exageración de su propio resultado nulo.

**Pregunta detectora.** Este número, o esta comparación («más de mil», «arriba de la mitad», «casi todas»), ¿de qué dato y de qué fecha salió? ¿La frase alrededor de una cifra con fuente dice más que la fuente: más amplia («todas», «ninguna», «solo», «la ley»), más segura, o sobre evidencia que no busqué («nadie lo ha medido», «las guías coinciden»)? ¿Deja fuera lo que la fuente dice en contra?

**Señal de alarma.** «Es la cifra que ya teníamos» · «da más o menos eso» · «se ve que todas pasan» · «eso es lo que dice la fuente, más o menos». · Una afirmación movida a un lugar más visible (el inicio de una página, una gráfica, una publicación) sin releerla contra su fuente.

**Qué hacer.** Antes de escribir una cifra, mídela otra vez y anota junto a ella de qué dato y de qué fecha salió. Las palabras de cantidad («casi», «más de», «la mayoría») son cifras con disfraz: se miden igual. Y si una imagen trae cuentas, que las haga el mismo script que la dibuja. Junto a una afirmación con fuente, copia también el alcance de la fuente: quién lo midió, sobre qué población, cuándo y, en una encuesta, la pregunta que se hizo; una palabra absoluta que la fuente no tiene, se quita. Lo que no encontraste se dice como tuyo («no encontramos ningún estudio»), y una recomendación sin fuente va firmada («recomendamos»).

### 50. Si dos explicaciones predicen lo mismo, tu ejemplo no elige entre ellas

`from: 9148c81d` · `by: ai`

**La idea.** Un ejemplo confirma tu explicación solo si la explicación rival daba otro resultado. Si las dos predicen lo mismo, el ejemplo te deja creer la que se te ocurrió primero.

**Ejemplo.** Una lección comparaba subir cinco puntos la primera etapa de un embudo contra subirlos en la última. Ganaba la primera, y el texto decía: «valen más donde hay más visitas». Pero la primera etapa también era la que menos convertía, y esa era la causa: en un embudo donde la primera convierte mejor, gana la última aunque tenga menos visitas. En otro proyecto se culpó a una página de tardar 2.7 s; una prueba que pedía las páginas una por una pasaba aun sin el arreglo, porque la causa real eran cuarenta peticiones al mismo tiempo.

**Otro ejemplo.** Un video de demostración generado decía «funcionó porque primero quitaste los espacios», pero ninguna celda de su hoja de muestra tenía espacios sobrantes: sin quitarlos, el reemplazo daba el mismo resultado. Una revisión lo señaló. Una celda con un espacio al final, que solo coincide después de quitarlo, hizo que los datos mostraran la causa, y ahora un assert en el script que construye la demo falla si deja de mostrarla.

**Pregunta detectora.** ¿Qué otra explicación daría este mismo resultado? ¿Mi ejemplo la descarta? Si se omite el paso al que atribuyo el resultado, ¿cambia?

**Señal de alarma.** «Los números lo confirman».

**Qué hacer.** Antes de enseñar o reportar por qué pasa algo, escribe la explicación rival y arma un caso donde las dos predigan distinto. Compara partes del mismo tamaño, prueba con otro tamaño de ejemplo y mide una afirmación general en datos simulados antes de escribirla. Si no logras separarlas, di que el ejemplo es compatible con las dos. Cuando el código construye el ejemplo (una demo, un conjunto de datos de muestra), deja en él un assert que falle si la explicación rival daría el mismo resultado.
