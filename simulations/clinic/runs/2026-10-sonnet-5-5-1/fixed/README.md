# Fisio Andares

Sitio web con formulario de citas y panel de administración. Sin dependencias: solo Node.js 18 o más nuevo.

## Cómo correrlo

```
node servidor.mjs
```

Abre http://127.0.0.1:3000 (el sitio) y http://127.0.0.1:3000/admin (el panel).

**Contraseña del panel.** Define la tuya con la variable `ADMIN_PASSWORD`:

```
ADMIN_PASSWORD="una-clave-larga" node servidor.mjs        # macOS / Linux
$env:ADMIN_PASSWORD="una-clave-larga"; node servidor.mjs  # PowerShell
```

Si no la defines, la primera vez se genera una al azar, se imprime en la consola y se guarda en `datos/clave-admin.txt`. No hay ninguna contraseña por defecto en el código.

Otras variables: `PORT` (3000) y `HOST` (127.0.0.1; usa `0.0.0.0` para que otros equipos entren).

## Antes de publicarlo: reemplaza los datos de ejemplo

- **Dirección y teléfono**: `publico/index.html`, sección «Dónde estamos» (busca `CAMBIAR`). Cambia también el número del enlace `tel:` (formato `+52` y 10 dígitos).
- **Precios y duraciones**: en la misma página, en las tarjetas de tratamientos y en el `<select>` del formulario.
- **Fotos**: `publico/img/*.svg` son ilustraciones de ejemplo; reemplázalas (mismos nombres, o cambia las rutas en `index.html`) y ajusta `width`/`height` de las `<img>`.

## Datos

Las solicitudes se guardan en `datos/solicitudes.jsonl` (una línea por cambio; respáldalo copiando el archivo). Si una línea se daña se omite y se guarda una copia `datos/danado-*.bak`.

Las horas se comparan con la hora del servidor: ajusta la zona horaria del equipo (o la variable `TZ`).

## Protección contra abuso

Campo señuelo invisible, máximo 10 solicitudes válidas por IP y 100 en total por hora, y en el panel puedes buscar, filtrar y borrar (una por una o todas las de un filtro).

## Prueba

`node prueba.mjs` arranca un servidor temporal y revisa lo principal.
