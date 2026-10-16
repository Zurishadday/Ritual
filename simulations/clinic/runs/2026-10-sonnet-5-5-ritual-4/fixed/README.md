# Fisio Andares

Sitio web con formulario de citas y panel privado. Sin dependencias: solo Node 18+.

## Arrancar

```
node servidor.mjs
```

Abre <http://localhost:3000> (portada y formulario) y <http://localhost:3000/admin.html> (panel).

La contraseña del panel está en `datos/clave-admin.txt` (se crea sola la primera vez y también se imprime en la consola). Para usar otra: variable `ADMIN_PASSWORD`.

## Abrirlo desde el celular

Por defecto el servidor solo escucha en este equipo. Para verlo desde el celular (conectado al mismo wifi):

- PowerShell: `$env:HOST = "0.0.0.0"; node servidor.mjs`
- Mac/Linux: `HOST=0.0.0.0 node servidor.mjs`

La consola mostrará una línea «Desde el celular: http://192.168.x.x:3000»; escribe esa dirección en el navegador del celular. Si no abre, permite Node.js en el firewall de Windows (redes privadas).

Otras variables: `PORT` (3000), `DATOS_DIR` (carpeta de datos), `LIMITE_GLOBAL_HORA` (solicitudes por hora entre todas las IP, 40).

## Panel

Las solicitudes salen de 50 en 50 (más nuevas primero). Se puede filtrar por estado, buscar por texto, marcar confirmada/cancelada, eliminar una, o eliminar en bloque todas las que coincidan con el filtro (por ejemplo, todas las canceladas o las de un número de spam).

Las solicitudes se guardan en `datos/citas.jsonl`. No edites el archivo mientras el servidor corre (se lee al arrancar). Las líneas dañadas no se muestran, pero se avisan en el panel y se conservan.

## Probar

`node prueba.mjs` — usa una carpeta temporal, no toca `datos/`.
