# What the builder said

`claude-sonnet-5-5` · success · 14 turns · $0.39845769999999997 · 19596 output tokens

La página de Fisio Andares está lista. Probé el servidor con un script (`prueba.mjs`) y todo respondió como esperaba. No la abrí en un navegador, así que revisa el aspecto en el celular.

## Cómo probarla

```
node servidor.mjs
```

- **Sitio:** http://127.0.0.1:3000
- **Tu panel:** http://127.0.0.1:3000/admin
- **Contraseña por defecto:** `fisio2026`. Cámbiala antes de publicar:
  - PowerShell: `$env:ADMIN_PASSWORD = "tu-clave"; node servidor.mjs`

**Para verlo en el celular**, con el celular en la misma red wifi:
1. Arranca con `$env:HOST = "0.0.0.0"; node servidor.mjs`.
2. Abre `http://IP-DE-TU-PC:3000` en el celular.

**Para probar el flujo completo:**
1. Llena el formulario en la portada y envíalo. Los fines de semana no se pueden elegir.
2. Entra a `/admin` con la contraseña. Aparece la solicitud, y las más nuevas salen primero.
3. Pulsa **Confirmar** o **Cancelar**. El estado queda guardado y también puedes volver a ponerla en pendiente.

## Qué incluye

- **Portada:** foto y la frase «Recupera tu movimiento, vuelve a caminar sin dolor».
- **Tratamientos:** los tres, cada uno con foto, duración y precio.
- **Formulario:** guarda cada solicitud en el servidor, en `datos/solicitudes.json`.
- **Validación:** el servidor revisa de lunes a viernes, de 9:00 a 17:00 (la última cita empieza a las 17:00 para terminar antes de las 18:00) y no deja pedir días pasados.
- **Contacto:** dirección, teléfono y horario al final de la página.
- **Protección:** limita el número de intentos de contraseña y de solicitudes por IP.

## Lo que debes cambiar

- **Precios y duraciones:** puse ejemplos. Los de la página están en `publico/index.html`; los del formulario también están ahí, en el selector de tratamiento.
  - Rodilla: 60 min, $600.
  - Espalda: 50 min, $550.
  - Masaje: 45 min, $500.
- **Dirección y teléfono:** son de ejemplo, en la sección `#contacto` de `publico/index.html`. El número también está en el enlace `tel:`.
- **Fotos:** son ilustraciones de ejemplo en `publico/img/`. Para usar las tuyas, cambia las rutas en `index.html` (por ejemplo `.jpg`).
- **Contraseña:** el panel muestra un aviso mientras use la de ejemplo.

## Cosas a tener en cuenta

- Si publicas el sitio en internet, ponlo detrás de HTTPS, por ejemplo con un proxy inverso. La contraseña viaja al servidor y sin HTTPS se podría interceptar.
- Las sesiones del panel se guardan en memoria: si reinicias el servidor, tendrás que volver a entrar. Las solicitudes no se pierden.
- Puedes borrar `prueba.mjs` si no lo quieres. Puede volver a ejecutarse con `node prueba.mjs`.
