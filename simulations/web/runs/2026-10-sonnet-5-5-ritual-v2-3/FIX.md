# Fixing what the review found

`claude-sonnet-5-5` · success · 22 turns · $0.29226420000000003 · 14577 output tokens

Apliqué los seis arreglos, pero **no pude ejecutar nada**: tanto Bash como PowerShell me fueron denegados en este modo, así que ni la sintaxis ni los arreglos están comprobados. Para verificar, hay que correr `node --check servidor.mjs` y luego `node probe4.mjs 3521 scale` y `flood`, y `probe2`.

- **Escala (/admin lento con 40 000 mensajes):** `servidor.mjs` ahora lee el archivo una sola vez, lo guarda en memoria y solo lo vuelve a leer si cambió por fuera (tamaño o fecha). La página toma solo los 50 mensajes que muestra, sin copiar ni invertir todo.
- **Inundación de bots sin aviso al dueño:** los envíos rechazados se cuentan en `datos/rechazos.jsonl` y /admin muestra «se rechazaron N envíos en 24 h». Los mensajes que llegan en ráfaga (más de 30 por hora entre todos) se guardan con la insignia «llegó en ráfaga». La detección de enlaces ahora también reconoce dominios sin `http` (por ejemplo `algo.com`).
- **El tope global de 100 por hora cierra el formulario a clientes reales:** quité ese freno. Ahora nadie es rechazado antes de 1000 envíos válidos por hora, un tope que solo protege el disco y que, si se alcanza, queda avisado en /admin.
- **Color del foco invisible en el encabezado y la portada:** `publico/estilos.css` usa ahora un anillo doble (blanco por fuera, `#111` por dentro), visible sobre fondos claros y oscuros. No medí los contrastes: el anillo exterior blanco debería pasar 3:1 sobre `#0f3d3e` y `#081c1d`, pero falta confirmarlo.
- **El límite por dirección cuenta envíos rechazados:** ahora solo cuentan los envíos válidos que se guardan, y los inválidos ya no consumen cupo.
- **Duplicados sin JavaScript:** un mensaje idéntico (mismo nombre, correo y texto) en 10 minutos se responde «ok» pero se guarda una sola vez. La revisión es síncrona, así que dos POST simultáneos tampoco pasan los dos.
