# Fixing what the review found

`claude-sonnet-5-5` · success · 51 turns · $0.8395938999999999 · 37339 output tokens · 1 denied tool call(s)

Corregí los 11 problemas. `node prueba.mjs` termina con «Todo bien» (31 comprobaciones). Lo que sigue sin comprobar en un navegador real está al final.

- **Panel sin JavaScript:** el `<noscript>` estaba dentro de la sección oculta. Ahora está fuera, con título y enlace de regreso.
- **Rendimiento:** el servidor ya no lee todo el archivo en cada petición.
  - Carga las citas en memoria al arrancar y compacta el archivo al arrancar y cuando crece mucho.
  - Con 20 000 citas, 10 listados en paralelo tardan unos 20 ms y cambiar un estado unos 30 ms. No probé 100 000.
  - El panel muestra 50 citas por página, con «Mostrar más».
- **Límite contra validación:** ahora se valida primero y el límite por IP se revisa después. Un domingo después de 5 citas válidas devuelve el error de fecha, no el 429.
- **Robots:**
  - Añadí un tope global de 100 solicitudes por hora.
  - El panel tiene búsqueda y paginación.
  - El panel tiene «Eliminar las N de esta vista» con un solo confirm, que exige un filtro o una búsqueda activos.
  - Las respuestas falsas del campo trampa ya no gastan el cupo de la IP.
  - Con 200 robots desde 200 IPs entran como máximo 100 por hora, no 200 de golpe.
- **Desborde en celular:** el panel y las páginas sencillas ahora parten el texto largo sin espacios (`overflow-wrap`). No lo abrí en un celular ni a 375 px.
- **Hora de hoy ya pasada:** el servidor la rechaza con «Esa hora ya pasó hoy». El formulario también deshabilita esas horas.
- **Zona horaria:** «hoy» y la hora se calculan en `ZONA_HORARIA`, por defecto `America/Mexico_City`, y no en la del servidor. Lo comprobé en la prueba solo con la zona por defecto; no probé Tokio.
- **IP, proxies y bloqueo del dueño:**
  - La contraseña correcta nunca se rechaza; a quien falla más de 5 veces por minuto se le hace esperar cada vez más (hasta 5 s).
  - Con `CONFIAR_PROXY=1` se toma la IP real de `X-Forwarded-For`. El README explica `HOST=0.0.0.0` detrás de un proxy.
- **Página de error sin JavaScript:** el error de validación y el 429 vuelven a mostrar el formulario con lo escrito y el error junto a cada campo. El 413 de 100 KB ahora responde una página HTML, no JSON.
- **Zonas de toque:** el teléfono, «Acceso del consultorio» y «Volver al sitio» miden al menos 48 px de alto. Los enlaces de teléfono y correo del panel también crecieron. No medí los tamaños en pantalla.
- **README y contraseña:** añadí `README.md` con cómo correrlo y probarlo, y las variables de entorno. La contraseña se muestra solo la primera vez que se crea; en los arranques siguientes la consola indica en qué archivo está. `prueba.mjs` ahora cubre todo lo anterior y termina con «Todo bien», sin «parte 1».

Dos cosas que cambian lo que ya tenía: al reiniciar, una línea dañada del archivo se copia a `datos/lineas-danadas.txt` y se quita de `citas.jsonl`. Y no encontré ningún `datos.mjs` en la carpeta; las cifras de rendimiento que probé son las de mi propia prueba.

Con Chrome revisa tú tres cosas: el panel con scripts desactivados, el panel a 375 px con un nombre muy largo, y los tamaños de los enlaces.
