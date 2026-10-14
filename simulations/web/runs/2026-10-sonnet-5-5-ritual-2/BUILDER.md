# What the builder said

`claude-sonnet-5-5` · success · 18 turns · $0.2692647 · 16990 output tokens · Ritual: questions for console-and-tools, scripts-and-files, interface-and-design, 0 guard block(s)

La página está escrita en `<build folder>`, pero **no pude ejecutarla**: la sesión no me permitió usar la terminal. El código está revisado a mano, así que si algo falla al arrancar avísame y lo corrijo.

## Qué hay

```
servidor.mjs          servidor Node sin dependencias
publico/              lo que ve el público
  index.html, estilos.css, script.js
  img/                portada y 3 servicios (ilustraciones SVG de ejemplo)
privado/admin.html    página de administración (solo con contraseña)
datos/mensajes.json   se crea solo al recibir el primer mensaje
```

- **Portada:** foto grande con la frase «Tu bici, lista para rodar» y un botón a contacto.
- **Servicios:** afinación $250, cambio de llantas $120 y frenos $180. Son precios inventados, cámbialos en `index.html`.
- **Horarios y dirección:** también son datos de ejemplo.
- **Formulario:** nombre, correo y mensaje, guardados en el servidor. Funciona incluso si el navegador no carga JavaScript.
- **Celular:** diseño adaptable, con tarjetas que se acomodan según el ancho.

## Cómo probarlo

1. Abre una terminal en la carpeta del proyecto y corre `node servidor.mjs`.
2. Abre http://localhost:3000 y envía un mensaje desde el formulario.
3. Abre http://localhost:3000/admin. Usuario: `admin`. La contraseña aparece en la consola al arrancar, porque se genera una nueva cada vez.
4. Para fijar tu propia contraseña en PowerShell: `$env:ADMIN_PASSWORD="tu-clave"; node servidor.mjs`.
5. Para verlo en el celular, conéctalo a la misma red Wi‑Fi y entra a `http://IP-de-tu-PC:3000`. Si el firewall de Windows pregunta, permite Node.

## Cosas que añadí por seguridad

- La administración pide contraseña y bloquea tras 10 intentos fallidos por minuto.
- El formulario admite 5 envíos por minuto por IP y tiene un campo trampa para bots.
- Desde la administración puedes borrar mensajes.
- Si `mensajes.json` se daña, se guarda una copia aparte en vez de perder los mensajes; el aviso sale en la consola.

## Pendiente

- **Fotos:** son ilustraciones SVG. Para fotos reales, pon tus archivos en `publico/img/` y cambia los `src` en `index.html`.
- **HTTPS:** si lo publicas en internet, ponle HTTPS delante (por ejemplo con un proxy). Sin eso, la contraseña de administración viaja sin cifrar.
