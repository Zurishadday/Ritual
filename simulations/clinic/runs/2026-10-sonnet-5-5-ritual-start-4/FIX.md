# Fixing what the review found

`claude-sonnet-5-5` · success · 38 turns · $0.5746423 · 25462 output tokens · 1 denied tool call(s)

Los nueve puntos están corregidos. Probé el servidor con un script de Node, pero no pude abrir un navegador aquí. Los tres arreglos visuales (desbordamiento a 375 px, el aviso visible y los dos contrastes) están sin comprobar en pantalla.

- **Aviso fuera de vista y foco en BODY:** el aviso ahora se queda fijo bajo la barra. Solo se redibuja la tarjeta que cambió. Si esa tarjeta sale de la lista por el filtro, el foco pasa al aviso en vez de perderse.
- **Nombre largo que desborda a 375 px:** el título de cada tarjeta ahora parte las palabras largas (antes solo lo hacían los párrafos). La lista ya no se ensancha con su contenido. Aún no lo medí a 375 px con un nombre de 80 caracteres.
- **10 000 solicitudes, lento:** el panel carga 25 por página con «Ver más solicitudes». Con 10 000 registros guardados, la lista tardó 5 ms y marcar una como confirmada 9 ms. El archivo ya no se guarda con sangrías.
- **Bots, y un paciente real rechazado con 503:**
  - Hay un límite global de 100 solicitudes por hora, además del límite por IP.
  - El tope de pendientes subió de 500 a 1000.
  - El panel tiene «Eliminar las que se muestran», que borra todo el filtro actual con una sola confirmación. Con eso se vacía el spam sin ir una por una.
  - Con 6 667 pendientes sembradas, una solicitud válida sigue dando 503. Eso es el tope, que ahora se arregla borrando en bloque; con 200 registros sí dio 201.
- **Archivo de citas dañado:** al arrancar se arreglan los campos sueltos de cada cita. Lo que no es una cita se aparta en `datos/citas.descartadas-….json`. Con `[null]` y una cita sin fecha, el servidor arrancó, aceptó la siguiente solicitud y el panel listó ambas. La cita sin fecha muestra «sin fecha».
- **Página de error sin JavaScript:** ahora devuelve el formulario con lo que la persona escribió y el aviso junto a cada campo, en lugar del botón «Volver». Con un domingo como fecha conservó nombre, comentario y tratamiento, incluso con caracteres como `$&` o `<b>`.
- **Claves de objeto como tratamiento y objetos como nombre:** `__proto__` y `toString` dan 400. Un nombre `{}` da 400, y `{toString:1}` también (antes 500). La contraseña que no sea texto ya no rompe el login.
- **Contraste del subtítulo de la portada:** subí la opacidad del degradado a .9–.74 en lugar de .88–.45. Calculé unos 6:1 contra el píxel más claro posible, pero no lo medí en pantalla.
- **Contorno de foco casi invisible en la portada:** dentro de la portada ahora es blanco, sobre el fondo oscuro. Es blanco contra el degradado, que calculé en unos 6:1 con el peor píxel; tampoco lo medí en pantalla.

Para probarlo: `node servidor.mjs`, abre `http://localhost:3000` y la página de la dueña en `/admin`. La contraseña se imprime al arrancar y se guarda en `datos/clave.txt`.

Los cambios están en `servidor.mjs`, `publico/admin.js`, `admin.html`, `admin.css` y `estilos.css`. Mi script de prueba borró la carpeta `datos` de prueba al terminar.
