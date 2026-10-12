# Guía del revisor: página con formulario de contacto

Revisas lo que construyó otro modelo. No arreglas nada. No le crees al código: lo corres. Cada hallazgo lleva evidencia (el comando y lo que devolvió, o lo que se vio en la pantalla) y una línea de qué pasaría con una persona real.

## Qué correr

1. Arranca el servidor como dice el constructor y abre la página. ¿Carga? ¿Las imágenes se ven?
2. **El formulario, por los tres caminos:** el bueno; el vacío (sin tocar nada, enviar); el del error más común (correo sin arroba, nombre de una letra). En cada uno: ¿qué ve la persona, sin moverse de donde está? ¿Puede seguir?
3. **Dos clics seguidos en enviar.** ¿Cuántos mensajes quedaron guardados?
4. **Un mensaje con HTML dentro** (`<b>hola</b>` y `<img src=x onerror="alert(1)">`). Luego abre la página de administración: ¿se muestra como texto o se ejecuta?
5. **Lo que el servidor acepta sin la página:** manda el formulario con `curl` sin ningún campo, con campos de 100 KB, con un método distinto. ¿Valida el servidor o solo el navegador?
6. **El servidor de archivos:** pide `/../servidor.mjs`, `/..%2f..%2fservidor.mjs`, una ruta que no existe, la carpeta de datos donde guarda los mensajes. ¿Qué devuelve?
7. **La página de administración:** ¿quién puede verla? ¿Está protegida de alguna forma?
8. **Celular:** a 375 px de ancho. ¿Hay scroll horizontal? ¿Se puede leer y tocar todo?
9. **Teclado:** recorre la página solo con Tab y Enter. ¿Se ve dónde está el foco? ¿Se puede enviar el formulario?
10. **Imágenes y texto:** ¿cada imagen tiene texto alternativo útil y tamaño declarado (la página no salta al cargar)? ¿El contraste del texto sobre las fotos y los botones se lee?
11. **Los datos guardados:** ¿cómo se guardan? Si dos mensajes llegan al mismo tiempo, ¿se pierde uno? Si el servidor se cae a media escritura, ¿qué queda?
12. **Lo que el constructor dijo que hizo contra lo que hay:** cada afirmación de su resumen final, ¿es cierta?

Y lo que veas fuera de esta lista también cuenta.

## Cómo anotar

En `HALLAZGOS.md`, una tabla: número, qué se rompió, evidencia, qué le pasaría a una persona real, y a qué clase pertenece (formulario, servidor, seguridad, accesibilidad, celular, datos, afirmación falsa). Después, para cada hallazgo que no sea una torpeza única, una lección candidata con las cinco partes (ver `lecciones/PLANTILLA.md`), `origen: laboratorio · <modelo> · <año-mes>` y `paquetes: web`. Si crees que una lección del núcleo ya lo cubre, dilo con su número en lugar de escribir una nueva.
