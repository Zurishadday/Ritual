# What the builder said

`claude-sonnet-5-5` · success · 47 turns · $0.9040396000000002 · 44267 output tokens · 1 denied tool call(s) · Ritual: package lessons at the start, questions for scripts-and-files, interface-and-design, console-and-tools, 1 guard block(s) (node-e-backslashes), sent back once to check before finishing

Corrí `web-check.mjs` en un navegador real contra el sitio y arreglé tres cosas. Queda un ✕ en el script que es una limitación suyo, no del sitio.

## Qué corregí
- **Fecha tope:** el servidor rechazaba fechas de más de un año adelante, sin motivo. Lo quité.
- **Scroll suave:** `scroll-behavior: smooth` hacía que el script hiciera clic en el lugar equivocado al envío sin JavaScript. Lo quité y añadí `scroll-margin-top` para que la barra fija no tape los títulos.
- **Datos de la prueba:** el chequeo envió 50 solicitudes de «Ritual Check» a una carpeta temporal. Tu `datos/` no se tocó.

## Resultado, una línea por chequeo
- **32 · Se ve lo que cambió:** con el teclado, al enviar bien el foco queda en el aviso «¡Solicitud enviada!» (`#exito`), y el panel anuncia cada cambio de estado. Lo vi en `web-check`; el panel de administración no lo probé en navegador.
- **41 · Formato que ve el lector:** screenshots de teléfono (375 px) y escritorio revisados. No hay scroll lateral, el formulario y las tarjetas se ven bien.
- **45 · Camino de error:** 6 envíos vacíos dieron 400 con errores legibles. Sin JavaScript el servidor muestra la lista de errores en una página.
- **46 · Costo por solicitud:** las citas viven en memoria y el panel las ordena en cada consulta. Es trivial con cientos. No medí con miles.
- **49 · Reglas generales vs. específicas:** el script marca ✕, pero su envío «bueno» manda `tratamiento="Ritual Check"` y `hora="Ritual Check"`, que no están en mis listas. Con valores reales (6 vacías y luego una buena) dio `400,400,400,400,400,400` y luego `303` (aceptada), así que el límite de 10 por IP no castiga a quien se equivoca.
- **WEB-2 · Bots:** una ráfaga de 40 envíos encontró freno (400 y 429). El campo trampa descarta bots sin guardarlos, y el panel permite filtrar y Eliminar.
- **WEB-3 · Respaldo sin JavaScript:** con JS apagado y un clic real, el navegador muestra «¡Solicitud enviada!» en `/gracias.html`.
- **WEB-4 · Foco:** envío aceptado por teclado → foco en `#exito`. Envío rechazado → foco en `#resumen`. El botón usa `aria-disabled`, no `disabled`.
- **WEB-5 · Límite de intentos:** `prueba.mjs` confirmó que el 5.º intento fallido da 429 y que, bloqueado, ni la clave correcta entra. No probé la fuerza bruta distribuida desde varias IP.
- **WEB-1 · Almacén dañado:** `prueba.mjs` agregó una línea rota al archivo y reinició. Los datos y estados quedaron intactos, y la siguiente solicitud se guardó en su propia línea.

## Sin comprobar
- No probé en un celular físico ni en Safari, solo en el navegador de pruebas.
- No probé HTTPS. Detrás de HTTPS falta añadir `Secure` a la cookie de sesión.
