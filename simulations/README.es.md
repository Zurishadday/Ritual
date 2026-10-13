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

## Cómo se revisa una lección que alguien aporta

Ritual corre dentro de Claude Code, así que una lección solo se gana una pregunta en la sesión de alguien si el error pasa con Claude. Cada lección aportada y cada confirmación dicen con qué modelo y en qué mes pasó.

1. **Pasó con Claude, en un proyecto real, con su ejemplo:** entra como `field` con ese modelo, después de la revisión de siempre (cinco partes, anónima, que no la cubra otra).
2. **Pasó con otro modelo, o el ejemplo deja dudas:** quien mantiene el repositorio convierte la situación en una tarea chica, escrita como la pediría un cliente, y la corre con los modelos actuales de Claude, con el método de arriba.
   - Se rompe con Claude: entra como `lab` con ese modelo de Claude, y el modelo de quien la aportó va a `seen:`.
   - Solo se rompió con el otro modelo: queda como candidata en el issue, con su modelo anotado. Nadie recibe su pregunta hasta que alguien la vea pasar con Claude.
3. **Una confirmación** de una lección que ya existe agrega `<modelo> <AAAA-MM>` a su `seen:`. Una lección vista con varios modelos es un error general; una que solo se vio con un modelo viejo es la primera que una corrida nueva revisa antes de bajarla.
