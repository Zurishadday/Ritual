# Consola y herramientas (lecciones de este repositorio)

### P-1. El estado de salida de una tubería es el del último comando

`origen: campo` · `afina: 44`

**La idea.** Encadenar una prueba con `| tail` o `| grep` para leer menos no solo recorta la salida: cambia el veredicto. El estado de salida que ve el `&&` siguiente es el de `tail`, que siempre es cero. La prueba falló y el commit pasó.

**Ejemplo.** `npm test --silent 2>&1 | tail -4 && git commit …`: un script no cargaba por una variable repetida, Node imprimió la traza, `tail` la mostró completa y devolvió cero, y el commit se hizo y se subió con la prueba rota. Se notó porque la traza quedó a la vista en la salida; si hubiera sido más larga que cuatro líneas, ni eso.

**Pregunta detectora.** El comando que decide si sigo (`&&`, un `if`, un hook), ¿es la prueba o es el que recorta su salida?

**Señal de alarma.** «Con las últimas líneas basta» · «lo encadeno para que quede en un solo comando».

**Qué hacer.** `set -o pipefail &&` al principio de la línea, o guarda la salida completa en un archivo y lee el veredicto ahí. En este repositorio lo bloquea el guardia (`veredicto-por-tail` en `.ritual/guardia.json`).
