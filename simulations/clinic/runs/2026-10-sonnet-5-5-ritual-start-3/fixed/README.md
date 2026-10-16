# Fisio Andares

Sitio del consultorio: portada, tratamientos, formulario de citas y un panel con contraseña.
HTML, CSS y JavaScript sin frameworks; servidor de Node sin dependencias (Node 18 o más nuevo).

## Cómo correrlo

    node servidor.mjs

Abre http://127.0.0.1:3000 (sitio) y http://127.0.0.1:3000/admin.html (panel).

La **primera vez** que arranca, el servidor crea una contraseña y la muestra una sola vez en la consola.
Queda guardada en `datos/contrasena-admin.txt`; puedes cambiarla editando ese archivo
(o fijarla con la variable `CONTRASENA_ADMIN`). Las solicitudes se guardan en `datos/citas.jsonl`.

## Cómo probarlo

1. **Prueba automática:** `node prueba.mjs` (usa datos temporales y su propio puerto, 3917; debe terminar con `Todo bien`).
2. **A mano:**
   - En el sitio, llena el formulario con un día de lunes a viernes y una hora de 9:00 a 18:00 y envíalo.
     Prueba también un sábado, una hora que ya pasó hoy, o desactiva JavaScript: el formulario sigue funcionando
     y, si hay un error, vuelve a mostrarse con lo que escribiste.
   - En `/admin.html` entra con la contraseña: verás las solicitudes (las más nuevas primero), podrás
     confirmarlas, cancelarlas, buscarlas, filtrarlas por estado, eliminarlas y, con un filtro o búsqueda activos,
     eliminar de golpe todas las de esa vista.
   - Con el teléfono (o la vista móvil del navegador) revisa que todo se ve bien.

## Opciones (variables de entorno)

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `PORT` | Puerto | `3000` |
| `HOST` | Dirección en la que escucha. Para recibir visitas de internet: `0.0.0.0` | `127.0.0.1` |
| `CONFIAR_PROXY` | `1` si el servidor está detrás de un proxy inverso de confianza (nginx, Caddy…): toma la IP real de `X-Forwarded-For`. Sin esto, todos los visitantes parecerían una sola IP. **No lo actives si el servidor está expuesto directamente.** | apagado |
| `ZONA_HORARIA` | Zona del consultorio para decidir qué es «hoy» y qué horas ya pasaron | `America/Mexico_City` |
| `CONTRASENA_ADMIN` | Contraseña del panel | la del archivo |
| `DATOS_DIR` | Carpeta de datos | `./datos` |

## Protección contra abuso

- Cada IP puede enviar 5 solicitudes válidas cada 10 minutos, y entre todas hay un tope de 100 por hora.
  Los errores de captura no cuentan. Un campo oculto atrapa a muchos robots simples.
- Contraseña del panel: nunca se bloquea a quien la escribe bien; a quien falla más de 5 veces por minuto
  se le hace esperar cada vez más. Usa una contraseña larga.
- Si aun así llega basura, en el panel busca o filtra y usa «Eliminar las N solicitudes de esta vista».

## Datos

`datos/citas.jsonl` guarda un evento por línea. Al arrancar se compacta y se carga en memoria, así que listar
y cambiar estados es rápido aunque haya decenas de miles de solicitudes. Si hay líneas dañadas se copian a
`datos/lineas-danadas.txt` y el panel avisa. Haz copia de la carpeta `datos/` de vez en cuando.

Teléfono y dirección están en `publico/index.html` (y el teléfono también en `servidor.mjs`): cámbialos por los reales.
Las fotos son ilustraciones de ejemplo en `publico/img/`.
