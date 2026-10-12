# Simulaciones

Las lecciones de los paquetes (`web`, `apps`, `crm`, `ia`) no se inventan: salen de ver a un modelo construir algo y romperse. Cada simulación es una tarea realista, escrita como la pediría un cliente, que un modelo construye sin Ritual. Después, otro modelo, en otra sesión, ejecuta lo construido y anota lo que se rompió, con evidencia. Lo que se rompe entra como lección con `origen: laboratorio · <modelo> · <año-mes>`; lo que no se rompe, no entra.

## Método

1. **Construye** un modelo mecánico (Sonnet), en una carpeta limpia, con el texto de `TAREA.md` tal cual y nada más. No ve lecciones, ni hooks, ni esta carpeta.
2. **Revisa** un modelo de juicio (Opus), en otra sesión, con `REVISION.md`: corre lo construido, prueba los caminos que la gente recorre de verdad (el vacío, el error, el doble clic, el celular, el teclado) y busca lo que no truena pero es error (una clave, un texto sin escapar). Cada hallazgo lleva su evidencia: el comando y su salida, o lo que se vio en pantalla. El revisor no arregla nada.
3. **Escribe las lecciones** el mismo modelo de juicio, con las cinco partes, y el revisor humano del repositorio las integra: comprueba que ninguna del núcleo ya las cubra y corre el verificador.
4. **Cada tarea se corre dos veces.** Lo que se rompe las dos veces es lección; lo que se rompe una vez queda como candidato.

Cada corrida se guarda en `<tarea>/corridas/<año-mes>-<modelo>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`): el código tal como quedó (es el proyecto de ejemplo con errores reales, y el caso de calibración de sus lecciones) y `HALLAZGOS.md`.

## Cómo repetir una simulación

Cuando sale un modelo nuevo, se vuelve a correr la tarea. Una lección que ya no se rompe no se borra: se baja (`bajadas` en la configuración del proyecto que la use) y la corrida lo deja escrito. Así la biblioteca se achica sola cuando los modelos mejoran, con datos.

Para proponer una tarea nueva, abre un issue con el texto de la tarea y qué tipo de proyecto representa.
