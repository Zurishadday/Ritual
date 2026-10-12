# Ritual

[English](README.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**Claude se equivoca una vez. Ritual se asegura de que sea la última.**

Ritual es un plugin de Claude Code para cualquier proyecto. Su idea es una sola: **cada error se vuelve lección, cada lección se vuelve regla y cada regla, cuando se puede, se vuelve prueba o guardia.** Otras herramientas anotan lo aprendido; esta llega hasta comprobarlo, porque una regla que solo está escrita se olvida en una sesión larga, y una que se revisa sola no.

Trae 49 lecciones de campo, cada una nacida de un error real; paquetes por tipo de proyecto, cuyas lecciones salen de ver a un modelo construir algo y romperse; y un comando, `/ritual`, que convierte los errores de tu sesión en lecciones tuyas, y las tuyas en reglas que se cumplen solas.

## Instalar

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Después, en tu proyecto, escribe `/ritual`. La primera vez detecta qué construyes por tus dependencias, te pregunta una sola cosa (qué paquetes de lecciones activar y en qué idioma) y crea la carpeta `.ritual/`. Desde ese momento tres hooks trabajan sin que hagas nada:

| Hook | Qué hace | Qué cuesta |
|---|---|---|
| **Guardia** | Bloquea los comandos que tu proyecto ya vio fallar y dice qué usar en su lugar. Sus reglas viven en `.ritual/guard.json`, cada una con un caso que bloquea y otro que deja pasar. | Nada, hasta que bloquea. |
| **Bitácora** | Anota en el momento cada comando que falla y cada corrección tuya («eso está mal», «hazlo de nuevo»), con lo que Claude estaba tocando. | Nada. |
| **Preguntas** | La primera vez en la sesión que Claude va a editar una prueba, un componente, un script, un documento, una consulta, o a correr un comando o hacer un commit, le muestra las preguntas detectoras de ese grupo. Una vez por grupo y por sesión. Van en inglés: son para Claude, que te sigue respondiendo en tu idioma. | Una línea por lección del grupo, de tres a trece según el grupo y los paquetes. |

Nada de esto cambia lo que Claude hace: solo le pone enfrente, en el momento justo, lo que tu proyecto ya aprendió.

## El ritual

Al cerrar una sesión, o después de un error que dolió, escribe `/ritual`. Lee la bitácora y hace esto, en orden:

0. Revisa los **candidatos** que el ritual anterior dejó abiertos: lo que se podía volver prueba y no se hizo.
1. **Lista los errores**, empezando por la bitácora, y confirma la causa de cada uno.
2. Busca **qué lección lo cubría y por qué no saltó**, primero en el grupo del error. Si una lo cubría, afina su pregunta detectora o su señal de alarma, o le agrega el ejemplo.
3. Busca **falsos positivos**: preguntas que hicieron parar sin necesidad y bloqueos del guardia que no tenían razón. Un bloqueo equivocado se vuelve un caso que debe dejar pasar.
4. Escribe una **lección nueva** solo si ninguna lo cubre, con sus cinco partes.
5. **Sube por la escalera** lo que se pueda: un patrón de comando se vuelve regla del guardia; una propiedad del código, una prueba con el nombre de la lección, vista fallar contra el error real antes de confiar en ella; lo que no se puede automatizar y ya se rompió dos veces, una línea en `CLAUDE.md`. Lo demás queda como candidato con su fecha.
6. Guarda todo junto, en el mismo commit, y corre el verificador.
7. Deja los ejemplos anónimos y, si una lección sirve para cualquier proyecto, te ofrece el texto para compartirla aquí. Nunca publica nada por su cuenta.

Y `/ritual close` (o `/ritual cierre`), antes de dar algo por terminado, recorre las preguntas de los grupos que tocaste contra el cambio y te dice qué falta.

## La biblioteca

Las lecciones viven en [`lessons/en/`](lessons/en/README.md), el original en inglés, y en español en [`lessons/es/`](lessons/es/README.md), en siete grupos según **lo que estabas haciendo** cuando pasó:

| Grupo | De qué trata |
|---|---|
| Escribir y documentar | Documentación, manuales, textos de pantalla, contenido. |
| Cifras y datos | Tableros, reportes, modelos, cualquier número que se muestra. |
| Prácticas y pruebas | Pruebas automáticas, validadores, revisiones, calibración. |
| Scripts y archivos | Programas que escriben, generan o transforman archivos y datos. |
| Interfaz y diseño | Pantallas, componentes, estilos, páginas. |
| Consola y herramientas | Comandos, servidores, capturas, y la herramienta que se interpone. |
| Git y proceso | Commits, estados, pendientes, trabajo en paralelo. |

Encima de los grupos van los **paquetes** por tipo de proyecto: lecciones que solo aplican si construyes eso. Viven en el archivo de su grupo, con prefijo (`WEB-1`), y sus preguntas solo aparecen si el paquete está activo. Se activan al arrancar y se pueden cambiar en `.ritual/config.json`.

| Paquete | Lecciones |
|---|---|
| `web` | 4: lo que se pierde tras una escritura cortada, los robots en un formulario público, el respaldo sin JavaScript y el foco al enviar. |
| `apps`, `crm`, `ai` | En camino, con el mismo método. |

Cada lección tiene cinco partes, siempre las cinco: **la idea**, un **ejemplo** real y anónimo, la **pregunta detectora** que separa el caso que aplica del que no, la **señal de alarma** (la frase que uno se dice justo antes de cometerlo otra vez) y **qué hacer**. Y un número que no cambia nunca: una lección que sobra se marca como fusionada en otra, no se borra. El formato completo está en [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

Cada una dice de dónde salió, y con qué modelo y en qué mes pasó (`field · ~opus · 2026-08`; la `~` quiere decir que es de memoria, no de un registro):

- `field`: de un error real en un proyecto, con ese ejemplo.
- `lab`: se rompió en una [simulación](simulations/README.es.md), y dice qué modelo y cuándo. Pasa a `field` cuando alguien la confirma en un proyecto suyo.
- `proposal`: solo para lo que no «truena» (seguridad), con fuente pública.

Un ejemplo, la 13:

> **Un verificador que nunca vio el error no verifica nada.** Una prueba que siempre pasa puede estar rota. La única forma de saberlo es verla fallar contra el error real. *Pregunta detectora:* ¿probé mi verificación contra el error en las formas en que aparecería de verdad? ¿Y contra el caso correcto? *Señal de alarma:* «ya pasa, entonces está bien puesta».

Ritual se aplica esa lección a sí mismo: cada regla del guardia, cada verificador y cada hook de este repositorio lleva sus casos, y se vio fallar antes de entrar.

## Las lecciones de los paquetes salen de simulaciones

Las lecciones por tipo de proyecto no se inventan. Un modelo construye una tarea realista sin Ritual; otro modelo, en otra sesión, ejecuta lo construido y anota lo que se rompió, con evidencia. Lo que se rompe entra como lección; lo que no, no. Cada tarea se corre dos veces: lo que se rompe las dos veces es lección; lo que se rompe una vez queda como candidato. Cuando sale un modelo nuevo, las tareas se vuelven a correr, y una lección que ya no se rompe se baja con datos. El método y las tareas están en [`simulations/`](simulations/README.es.md).

La primera fue un sitio para un taller de bicicletas con formulario de contacto y página de administración. Sonnet lo construyó dos veces, y las dos versiones escapaban bien el HTML, no dejaban salir de la carpeta pública y aguantaron 300 mensajes a la vez. Aun así, las dos perdían en silencio el mensaje que llegaba después de una escritura cortada, las dos aceptaban cientos de mensajes de un robot sin forma de limpiarlos, y una dijo que su prueba pasaba cuando fallaba una vez de cada diez. Cada hallazgo está con su evidencia en [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md), junto al código tal como quedó.

Ritual también se revisa con sus lecciones. La WEB-1 encontró el mismo error en su propia bitácora, y se corrigió con una prueba que primero se vio fallar.

## Contribuir

La forma más fácil: **confirma una lección**. Si una lección te pasó a ti también, [abre una confirmación](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) con tu ejemplo anónimo y el modelo que usabas. Cada confirmación agrega ese modelo a la lista `seen:` de la lección: así la biblioteca aprende a qué modelos les pasa cada error, y cuáles más nuevos ya no lo cometen. Una de `lab` o `proposal` con un ejemplo real pasa a `field`, con tu nombre si quieres.

Ritual corre con Claude, así que una lección que solo pasó con otro modelo se comprueba con Claude antes de que a nadie le salga su pregunta ([cómo](simulations/README.es.md#cómo-se-revisa-una-lección-que-alguien-aporta)).

También puedes:

- **[Compartir una lección](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml)** tuya: cinco partes, ejemplo anónimo, el grupo donde va y el modelo con que pasó. `/ritual` te genera el texto listo.
- **Proponer una tarea de simulación** para un tipo de proyecto que falte.
- **Corregir una traducción**: las hace Claude y se agradece la revisión de hablantes nativos.
- **Agregar una regla al guardia** o un caso que debía dejar pasar.

Antes de abrir el pull request: `npm test`. Corre la calibración de cada verificador y hook, y revisa que cada lección traiga sus cinco partes y que el índice esté al día (`node scripts/lessons.mjs --index` lo regenera).

## Idiomas

El original es el inglés. Las lecciones están en siete idiomas: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Las traduce una IA y cada lección dice de qué versión del original salió: si el original cambia, el verificador avisa que la traducción quedó vieja. Las que dicen `by: ai` esperan la revisión de alguien nativo.

## Licencia

MIT © 2026 Zurishadday
