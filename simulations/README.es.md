# Simulaciones

[English](README.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Las lecciones de los paquetes (`web`, `apps`, `crm`, `ai`) no se inventan: salen de ver a un modelo construir algo y romperse. Cada simulación es una tarea realista, escrita como la pediría un cliente, que un modelo construye sin Ritual. Después, otro modelo, en otra sesión, ejecuta lo construido y anota lo que se rompió, con evidencia. Lo que se rompe entra como lección con `origin: lab · <modelo> · <año-mes>`; lo que no se rompe, no entra.

## Método

1. **Construye** un modelo mecánico (Sonnet), en una carpeta limpia, con el texto de `TASK.md` tal cual y nada más. No ve lecciones, ni hooks, ni esta carpeta.
2. **Revisa** un modelo de juicio (Opus), en otra sesión, con `REVIEW.md`: corre lo construido, prueba los caminos que la gente recorre de verdad (el vacío, el error, el doble clic, el celular, el teclado) y busca lo que no truena pero es error (una clave, un texto sin escapar). Cada hallazgo lleva su evidencia: el comando y su salida, o lo que se vio en pantalla. El revisor no arregla nada.
3. **Escribe las lecciones** el mismo modelo de juicio, con las cinco partes, y el revisor humano del repositorio las integra: comprueba que ninguna del núcleo ya las cubra y corre el verificador.
4. **Cada tarea se corre dos veces.** Lo que se rompe las dos veces es lección; lo que se rompe una vez queda como candidato.

Cada corrida se guarda en `<tarea>/runs/<año-mes>-<modelo>-<n>/` (`2026-10-sonnet-1`, `2026-10-sonnet-2`): el código tal como quedó (es el proyecto de ejemplo con errores reales, y el caso de calibración de sus lecciones) y `FINDINGS.md`.

## Cómo repetir una simulación

Cuando sale un modelo nuevo, se vuelve a correr la tarea. Una lección que ya no se rompe no se borra: se baja (`demoted` en la configuración del proyecto que la use) y la corrida lo deja escrito. Así la biblioteca se achica sola cuando los modelos mejoran, con datos.

Lo hace el script: `node scripts/simulate.mjs <task>` (por ejemplo `web`). Sonnet construye y Opus revisa, dos veces, cada uno en su propia sesión aislada de Claude Code, y el script compara las corridas: una lección cuyo error se repitió en todas se confirma con ese modelo, y una cuyo error no apareció en ninguna es candidata a bajar. Primero comprueba el aislamiento con `node scripts/simulate.mjs --probe`: el modelo que construye no debe ver tu CLAUDE.md, tu memoria ni tus plugins. Nada de la biblioteca cambia hasta que quien mantiene el repositorio lo aplique con `/maintain`.

Para proponer una tarea nueva, abre un issue con el texto de la tarea y qué tipo de proyecto representa.

<a name="ab"></a>

## ¿Ritual ayuda? Una prueba A/B con la tarea web

La misma tarea (la solicitud web en español), el mismo constructor (`claude-sonnet-5-5`) y el mismo revisor (`claude-opus-5-5`), 2026-10, con Claude Code 2.1.295–2.1.296. Primero sin Ritual, y luego con los hooks de Ritual cargados y el proyecto configurado con el paquete `web` (`--with-ritual`). Después, la reparación: el mismo constructor, sin Ritual, recibe los hallazgos del revisor sobre una construcción y los corrige (`--fix`), para que el costo de construir y el de arreglar lo que quedó se compare completo.

| | Lecciones cuyo error apareció (de 9) | Errores nuevos | Construir | Corregir lo encontrado | Construir + corregir |
|---|---|---|---|---|---|
| Sin Ritual ([1](web/runs/2026-10-sonnet-5-5-1), [2](web/runs/2026-10-sonnet-5-5-2)) | 7, 8 | 6, 7 | $0.28, $0.27 | $0.53, $0.45 | **$0.82, $0.72** |
| Solo preguntas ([1](web/runs/2026-10-sonnet-5-5-ritual-1), [2](web/runs/2026-10-sonnet-5-5-ritual-2), [3](web/runs/2026-10-sonnet-5-5-ritual-3)) | 6, 9, 8 | 4, 4, 7 | $0.26, $0.27, $0.27 | | |
| Con Ritual hoy ([1](web/runs/2026-10-sonnet-5-5-ritual-v2-1), [2](web/runs/2026-10-sonnet-5-5-ritual-v2-2), [3](web/runs/2026-10-sonnet-5-5-ritual-v2-3)) | **1, 2, 2** | 4, 5, 4 | $0.38, $0.53, $0.60 | $0.24, $0.17, $0.29 | **$0.63, $0.70, $0.90** |

Lo que dice:

- **Errores:** las nueve lecciones se rompieron en promedio 7.5 veces por construcción sin Ritual, y 1.7 con él: alrededor de tres cuartos menos. Los errores nuevos, fuera de las lecciones, bajaron de 6.5 a 4.3.
- **Costo:** construir con Ritual cuesta más (unos $0.23 más por construcción: diseña pensando en las lecciones y regresa una vez a revisar). Corregir lo que queda cuesta alrededor de la mitad (−52% en dinero, −53% en tokens de salida: 24,300 contra 11,300 en promedio). Construir más corregir sale casi igual: $0.77 contra $0.74 en promedio, una diferencia menor que la dispersión entre corridas. El resultado final parte de muchos menos errores por el mismo dinero.
- **Solo las preguntas no hicieron nada.** La versión que solo mostraba las preguntas de cada grupo mientras escribía terminó donde la construcción sin Ritual. Lo que lo cambió fueron las lecciones de paquete al inicio y al cierre, que hacen que el constructor regrese una vez antes de terminar.

Lo que no dice: es una sola tarea, dos o tres corridas por brazo y un solo modelo. No cuenta encontrar los errores: la revisión costó $1.30–$2.40 por construcción, lo mismo en los dos brazos. Cada construcción y cada corrección que lo menciona dice que el acceso al shell fue denegado para los comandos que intentó, en ambos brazos, así que ninguna corrió el sitio: la verificación web automática del cierre nunca corrió, y las correcciones no se volvieron a revisar.

## Cómo se revisa una lección que alguien aporta

Ritual corre dentro de Claude Code, así que una lección solo se gana una pregunta en la sesión de alguien si el error pasa con Claude. Cada lección aportada y cada confirmación dicen con qué modelo y en qué mes pasó.

1. **Pasó con Claude, en un proyecto real, con su ejemplo:** entra como `field` con ese modelo, después de la revisión de siempre (cinco partes, anónima, que no la cubra otra).
2. **Pasó con otro modelo, o el ejemplo deja dudas:** quien mantiene el repositorio convierte la situación en una tarea chica, escrita como la pediría un cliente, y la corre con los modelos actuales de Claude, con el método de arriba.
   - Se rompe con Claude: entra como `lab` con ese modelo de Claude, y el modelo de quien la aportó va a `seen:`.
   - Solo se rompió con el otro modelo: queda como candidata en el issue, con su modelo anotado. Nadie recibe su pregunta hasta que alguien la vea pasar con Claude.
3. **Una confirmación** de una lección que ya existe agrega `<modelo> <AAAA-MM>` a su `seen:`. Una lección vista con varios modelos es un error general; una que solo se vio con un modelo viejo es la primera que una corrida nueva revisa antes de bajarla.
