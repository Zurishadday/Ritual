# Consola y herramientas

Lo que aplica cuando corres comandos, servidores, pruebas o capturas, y cuando la herramienta se interpone entre tú y el sistema.

### 27. Antes de dudar del sistema, duda del instrumento

`from: 4b9a0956` · `by: author`

**La idea.** Si un número no cambió cuando debía, o cambió justo cuando lo mirabas, sospecha en este orden: caché, otro proceso que escribe en la misma tabla, la herramienta por la que miras, y hasta el final el sistema.

**Ejemplo.** Una tabla «perdió la mitad de sus columnas». Minutos después estaba completa: la estabas viendo mientras otro proceso la reconstruía.

**Otro ejemplo.** Una imagen nueva «no cargaba» en la página. El archivo estaba bien: el servidor de prueba no veía las carpetas creadas después de arrancar.

**Un ejemplo más.** Un script «calculaba mal» un patrón de texto. El script estaba bien: la consola por la que se pasó convirtió cada `\n` en un salto de línea real antes de que el script lo leyera. Y en un cuaderno donde las celdas comparten memoria, un error que se quería mostrar no salía: la variable seguía guardada de una celda anterior.

**Pregunta detectora.** ¿Lo que estoy mirando es el sistema, o una caché, una copia o una herramienta que se quedó con una foto vieja de él o lo cambió en el camino?

**Señal de alarma.** «Ya lo arreglé y sigue igual» · «esta vez sí lo escribí bien».

**Qué hacer.** Toma una segunda foto con minutos de diferencia antes de declarar una catástrofe. Si un instrumento ya te falló de la misma forma, cámbialo en lugar de vigilarlo: un tropiezo repetido no es mala suerte, es la herramienta equivocada. Una consola que transforma `\n` o `\\` en el camino no sirve para pasarle código: el código va en un archivo, escrito con una herramienta que no lo toque, y se corre desde ahí. Y lo que es mecánico (un comando que ya falló tres veces) se bloquea con un guardia, no se recuerda.

### 29. Verifica el comando antes de pasárselo a otro

`from: 0c95aa16` · `by: author`

**La idea.** Quien ejecuta un comando ajeno lo hace a ciegas. Cada comando roto le gasta la confianza que le tendrá al siguiente.

**Ejemplo.** Un comando de despliegue traía el nombre de una rama escrito de memoria. La rama se llamaba distinto, y quien lo corrió perdió media hora antes de preguntar.

**Pregunta detectora.** Cada nombre dentro de este comando, ¿lo leí hoy del sistema o lo escribí de memoria?

**Señal de alarma.** «Es el comando de siempre».

**Qué hacer.** Córrelo tú antes de pasarlo, y copia cada nombre (script, ruta, rama) del sistema, no de la memoria.

### 44. Lo que recortas de la salida puede ser el veredicto

`from: ca6fa003` · `by: author`

**La idea.** Mirar solo las últimas líneas de un resultado, o pasarlo por otro comando, puede tirar justo la parte que decía «falló». Una salida recortada de una prueba que falló se ve igual que la de una que pasó.

**Ejemplo.** Una página se marcó como revisada porque su prueba «terminó sin errores». El resultado pasaba por un comando que mostraba solo el final, y el aviso de que la prueba había fallado se perdió en el camino.

**Otro ejemplo.** Una suite de pruebas reintentaba sola cada prueba que fallaba. Las que pasaban al segundo intento no contaban como falla, solo como «inestables», y la causa quedó escondida: cada cambio de paso volvía a pedir la página al servidor. Sin reintentos, la falla apareció y se pudo medir.

**Pregunta detectora.** ¿Estoy leyendo el veredicto (cuántas pasaron, cuántas fallaron, cómo terminó) o solo un pedazo de la salida?

**Señal de alarma.** «No salió ningún error en pantalla» · «con las últimas líneas basta».

**Qué hacer.** Busca la línea del veredicto antes de cambiar un estado. Si encadenas comandos, haz que el fallo del primero llegue hasta el final. Si la salida no trae veredicto, eso es un «no sé», no un «pasó» (ver la 1). Y guarda la salida completa en un archivo y busca ahí el veredicto: así no tienes que decidir antes cuánto leer.
