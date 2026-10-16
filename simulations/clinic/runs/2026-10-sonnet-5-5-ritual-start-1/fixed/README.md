# Fisio Andares

Sitio del consultorio: portada, tratamientos, formulario de cita y panel de la dueña. Sin dependencias.

## Correr

    node servidor.mjs

- Página: http://localhost:3000
- Panel: http://localhost:3000/admin.html
- La contraseña del panel se imprime al arrancar. Si no defines `ADMIN_PASSWORD`, se genera una vez y queda en `datos/clave.txt`.

## Ajustes (variables de entorno)

| Variable | Qué hace |
|---|---|
| `TELEFONO` | Teléfono que se muestra y al que llama el botón «Llamar» (por defecto `55 0000 0000`). Es el único lugar donde se escribe; ejemplo: `TELEFONO="+52 55 1234 5678" node servidor.mjs` |
| `ADMIN_PASSWORD` | Contraseña del panel |
| `PORT` | Puerto (3000) |
| `DATOS_DIR` | Carpeta donde se guardan las solicitudes (`datos/`) |
| `LIMITE_CITAS` / `LIMITE_CITAS_HORA` | Solicitudes por IP cada 10 min (6) / en total por hora (40) |

La dirección está en `publico/index.html` (busca «Calle Ejemplo 123»); cámbiala por la real.

## Cómo probar

1. `node prueba.mjs` — pruebas automáticas; debe terminar con «Todo bien».
2. A mano: arranca el servidor, pide una cita en la página, abre `/admin.html`, entra con la contraseña y confirma o cancela la solicitud. Prueba también desde el celular o con el navegador en vista móvil.

## Protección contra abuso

- Campo trampa oculto, tope por IP (solo cuentan envíos válidos), tope global por hora y máximo 3 solicitudes pendientes por teléfono o correo.
- El acceso al panel se limita por IP (5 fallos por minuto); un desconocido no puede dejarte fuera.
- Si llegan solicitudes falsas, en el panel puedes eliminarlas una por una, o cancelarlas y usar «Borrar todas las canceladas».
