# What the builder said

`claude-sonnet-5-5` · success · 15 turns · $0.2922966 · 18747 output tokens

La web de Fisio Andares está lista y la API pasó mis pruebas automáticas. No abrí las páginas en un navegador, así que el diseño en el celular y el formulario con sus mensajes no los he visto.

## Cómo probarla

1. En la carpeta del proyecto, ejecuta:
   ```
   node servidor.mjs
   ```
2. Abre `http://localhost:3000`. Ahí está la portada, los tratamientos, el formulario y el contacto.
3. Envía una solicitud de prueba desde el formulario.
4. Abre `http://localhost:3000/admin`. La contraseña aparece en la consola al arrancar y cambia en cada arranque. Para fijar una:
   - PowerShell: `$env:ADMIN_PASSWORD='tuclave'; node servidor.mjs`
   - Con `node -e` o desde un `.bat` también sirve.
5. Para ver cómo queda en el celular, usa el modo móvil del navegador (F12, luego el icono de dispositivo). También puedes entrar desde tu teléfono con la IP de tu PC y el puerto 3000, si están en la misma red.
6. `node prueba.mjs` repite las pruebas automáticas de la API. Cubren el formulario, el login y el cambio de estado, y no tocan tus datos reales.

## Qué hace

- **Portada y tratamientos:** frase "Vuelve a moverte sin dolor", con foto, duración y precio por tratamiento.
- **Formulario:** el selector de hora solo ofrece horarios en los que la sesión termina antes de las 18:00. Por ejemplo, la rodilla (60 min) llega hasta las 17:00 y el masaje (30 min) hasta las 17:30. El servidor revisa lo mismo, y también rechaza sábados y domingos.
- **Solicitudes:** se guardan en `datos/solicitudes.json`.
- **Página de administración:** muestra las solicitudes más nuevas primero. Cada una se puede marcar como Confirmar, Cancelar o Volver a pendiente, y hay un filtro por estado.
- **Seguridad de la administración:** la sesión dura 8 horas. Tras 5 contraseñas incorrectas se bloquea el login 5 minutos.

## Lo que debes cambiar tú

- **Datos de ejemplo:** la dirección ("Calle Ejemplo 123"), el teléfono (00 0000 0000) y los precios ($600, $500 y $350) los inventé. Cámbialos en `publico/index.html`. Si cambias las duraciones, cámbialas también en `TRATAMIENTOS` dentro de `servidor.mjs`.
- **Fotos:** son ilustraciones de ejemplo en `publico/img/*.svg`. Para usar fotos reales, ponlas en esa carpeta y cambia los `src` en `index.html`.
- **Contraseña en producción:** fija `ADMIN_PASSWORD`, porque la aleatoria cambia en cada arranque.
- **HTTPS:** el servidor usa HTTP simple. Si lo publicas en internet, ponle HTTPS delante (por ejemplo con un proxy inverso). Si no, la contraseña viaja sin cifrar.
- **Citas repetidas:** no evito que dos personas pidan la misma hora. Son solicitudes, y tú las confirmas o cancelas.
