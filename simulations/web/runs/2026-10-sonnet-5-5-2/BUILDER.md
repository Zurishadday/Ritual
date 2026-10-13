# What the builder said

`claude-sonnet-5-5` · success · 13 turns · $0.2728318

El sitio está escrito completo, pero **no pude ejecutarlo ni probarlo**. El entorno denegó Bash y bloqueó mi comando de PowerShell, así que nada de lo de abajo está verificado en ejecución. Prefiero decírtelo antes que darte un "funciona" sin comprobarlo.

## Qué se creó

```
servidor.mjs          servidor Node sin dependencias
publico/              lo que ve cualquiera
  index.html  estilos.css  script.js
  img/  portada.svg  afinacion.svg  llantas.svg  frenos.svg
privado/              solo accesible con clave
  admin.html  admin.js
datos/mensajes.json   se crea solo al recibir el primer mensaje
```

- **Portada:** foto grande con la frase "Tu bici, lista para rodar libre."
- **Servicios:** afinación $250, cambio de llantas $120 y frenos $180, cada uno con su imagen. Los precios, horarios y dirección son inventados; cámbialos en `publico/index.html`.
- **Visítanos:** horarios y dirección.
- **Contacto:** formulario con nombre, correo y mensaje. El servidor valida los datos y los guarda en `datos/mensajes.json`.
- **Administración:** `/admin` pide usuario y clave, y muestra los mensajes del más reciente al más antiguo, con opción de eliminar.
- **Celular:** diseño adaptable con cuadrícula flexible y barra pegajosa, probado solo en el código, no en pantalla.
- **Imágenes:** son ilustraciones SVG de ejemplo. Para usar fotos reales, ponlas en `publico/img/` y cambia las rutas en `index.html`.

## Cómo probarlo

1. En la carpeta del proyecto, ejecuta:
   ```
   node servidor.mjs
   ```
2. Abre `http://127.0.0.1:3000`, llena el formulario y envíalo.
3. Abre `http://127.0.0.1:3000/admin`. El usuario es `admin`. La clave aparece en la consola al arrancar, porque se genera al azar.
4. Para fijar tu propia clave, en PowerShell:
   ```
   $env:ADMIN_CLAVE = 'tu-clave'; node servidor.mjs
   ```
5. Revisa también la vista de celular con las herramientas del navegador (F12 → modo dispositivo).

## Detalles que conviene saber

- Por defecto escucha solo en `127.0.0.1` (tu equipo). Para publicarlo, usa `HOST=0.0.0.0` y ponlo detrás de HTTPS, porque la clave de administración viaja en claro sobre HTTP simple.
- Hay límite de 5 mensajes por IP cada 10 minutos y un campo oculto contra bots.
- Los mensajes se muestran como texto plano en la administración, así que un mensaje con HTML no se ejecuta.

Si me das permiso para ejecutar comandos en este entorno, lo arranco y compruebo las rutas, el formulario y la autenticación. También puedes correrlo tú y pasarme cualquier error.
