<div align="center">

<img src="assets/banner.png" width="100%" alt="Ritual. Claude makes a mistake once. Ritual makes sure it's the last time. Mistake, lesson, rule, check.">

**Claude se equivoca una vez. Ritual se asegura de que sea la última.**

Un plugin de Claude Code que convierte cada error en una lección, cada lección en una regla y cada regla, cuando puede, en una prueba o una guardia.

[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-E8743B)](#install)
[![Tests](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml/badge.svg)](https://github.com/Zurishadday/Ritual/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/github/license/Zurishadday/Ritual)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Zurishadday/Ritual)](https://github.com/Zurishadday/Ritual/commits/main)

[English](README.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

</div>

Otras herramientas anotan lo aprendido; Ritual llega hasta comprobarlo, porque una regla que solo vive en texto se olvida en una sesión larga, y una que se comprueba sola, no.

Trae **49 lecciones de campo**, cada una nacida de un error real; **paquetes por tipo de proyecto**, cuyas lecciones salen de ver a un modelo construir algo y romperse; y **un comando**, `/ritual`, que convierte los errores de tu sesión en lecciones tuyas, y tus lecciones en reglas que se cumplen solas.

<a name="install"></a>

## Instalar

```bash
claude plugin marketplace add Zurishadday/Ritual
claude plugin install ritual@ritual
```

Después, en tu proyecto, escribe `/ritual`. La primera vez detecta qué construyes a partir de tus dependencias, te pregunta una sola cosa (qué paquetes de lecciones activar y en qué idioma) y crea la carpeta `.ritual/`. Con eso queda todo configurado.

Necesita Node 20.17 o más reciente (`node --version`). Si algo no funciona, escribe `/ritual doctor`: revisa Node, tu configuración y si los hooks realmente se están ejecutando, y te dice qué arreglar.

**Actualizar.** Ritual mejora con cada commit. Ejecuta `claude plugin update ritual@ritual` e inicia una sesión nueva, o activa la actualización automática del marketplace `ritual` en `/plugin` → Marketplaces.

**¿No se encuentra `claude`?** Eso pasa cuando solo tienes la aplicación de escritorio de Claude, que trae su propia copia. Instala la línea de comandos ([cómo](https://code.claude.com/docs/en/setup)): comparte los plugins con la aplicación. Luego reinicia la aplicación.

## Verlo en acción

Salida real de las pruebas de Ritual, en un proyecto web.

**La guardia bloquea un comando que tu proyecto ya vio fallar,** y dice qué usar en su lugar:

```console
$ git push --force origin main
Ritual guard (force-push-to-main): A forced push to main rewrites shared history. Push to a branch and open a pull request.
```

**La primera vez que Claude edita un componente,** recibe las preguntas detectoras de ese grupo, una vez por sesión (recortadas):

```text
Ritual · Interface and design. Before you continue, run through these detector questions for what you
are about to do. If one applies, act on it and say so in one line; if none applies, just continue.
- 32 · Right after using the control, without moving from where it is, does the user see what changed?
- 45 · If the user does the most likely wrong thing (a typo, an empty answer, two clicks), what do they
       see, and can they keep going?
- WEB-2 · If a thousand fake messages arrive tomorrow, how does the owner find the one real one, and how
          do they delete the rest?
- WEB-4 · After submitting, whether it succeeded or failed, where does focus end up and where does the
          next Tab go?
```

**`/ritual` parte de lo que realmente pasó,** no de la memoria (fragmento):

```text
Log: 1 failed command(s), 1 correction(s)
  10-12 20:05 cmd  npm run build  →  Exit code 1 Type error: Property 'email' does not exist on type 'FormData'
  10-12 20:05 fix  «that is wrong, the form still loses the message»  while Edit src/components/ContactForm.tsx

Guard: 2 block(s) · force-push-to-main ×1, python-c ×1 (details: hooks/guard.mjs --log)

Groups touched in 1 session(s): interface-and-design (1)
```

## Cómo funciona

Tres hooks trabajan sin que hagas nada:

| Hook | Qué hace | Qué cuesta |
|---|---|---|
| 🛡️ **Guardia** | Bloquea los comandos que tu proyecto ya vio fallar y dice qué usar en su lugar. Sus reglas viven en `.ritual/guard.json`, cada una con un caso que bloquea y otro que deja pasar. | Nada, hasta que bloquea. |
| 📝 **Bitácora** | Anota en el momento cada comando que falla y cada corrección tuya («eso está mal», «hazlo de nuevo»), con lo que Claude estaba tocando. | Nada. |
| ❓ **Preguntas** | La primera vez en la sesión que Claude va a editar una prueba, un componente, un script, un documento o una consulta, o a correr un comando o hacer un commit, le muestra las preguntas detectoras de ese grupo. Una vez por grupo y por sesión. | Una línea por lección del grupo, de tres a trece según el grupo y los paquetes. |

Nada de esto cambia lo que Claude hace: solo le pone enfrente, en el momento justo, lo que tu proyecto ya aprendió.

Al cerrar una sesión, o después de un error que dolió, escribe `/ritual`. Lee la bitácora, encuentra qué lección debió atrapar cada error y por qué no saltó, y sube por la escalera: una lección se vuelve regla del guardia o prueba siempre que se pueda.

<details>
<summary><b>Los ocho pasos de <code>/ritual</code></b></summary>

0. Revisa los **candidatos** que el ritual anterior dejó abiertos: lo que pudo volverse prueba y no se volvió.
1. **Lista los errores**, empezando por la bitácora, y confirma la causa de cada uno.
2. Busca **qué lección lo cubría y por qué no saltó**, primero en el grupo del error. Si una lo cubría, afina su pregunta detectora o su señal de alarma, o le agrega el ejemplo.
3. Busca **falsos positivos**: preguntas que hicieron parar sin necesidad y bloqueos del guardia que no tenían razón. Un bloqueo equivocado se vuelve un caso que debe dejar pasar.
4. Escribe una **lección nueva** solo si ninguna lo cubre, con sus cinco partes.
5. **Sube por la escalera** lo que se pueda: un patrón de comando se vuelve regla del guardia; una propiedad del código, una prueba con el nombre de la lección, vista fallar contra el error real antes de confiar en ella; lo que no se puede automatizar y ya se rompió dos veces, una línea en `CLAUDE.md`. Lo demás queda como candidato con su fecha.
6. Guarda todo junto, en el mismo commit, y corre el verificador.
7. Deja los ejemplos anónimos y, si una lección vale para cualquier proyecto, te ofrece el texto para compartirla aquí. Nunca publica nada por su cuenta.

</details>

Y `/ritual close` (o `/ritual cierre`), antes de dar algo por terminado, recorre las preguntas de los grupos que tocaste contra el cambio y te dice qué falta.

## La biblioteca

Las lecciones viven en [`lessons/es/`](lessons/es/README.md), en español; el original está en inglés, en [`lessons/en/`](lessons/en/README.md). Son siete grupos según **lo que estabas haciendo** cuando pasó:

| Grupo | De qué trata |
|---|---|
| Escribir y documentar | Documentación, manuales, textos de pantalla, contenido, prompts. |
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
| El tuyo | Un tipo de proyecto que falte (móvil, datos, juegos…) empieza con su primera lección: mira [dónde va una lección](lessons/TEMPLATE.md#where-a-lesson-goes). |

Cada lección tiene cinco partes, siempre las cinco: **la idea**, un **ejemplo** real y anónimo, la **pregunta detectora** que separa el caso que aplica del que no, la **señal de alarma** (la frase que uno se dice justo antes de cometerlo otra vez) y **qué hacer**. Y un número que no cambia nunca: una lección que sobra se marca como fusionada en otra, no se borra. El formato completo está en [`lessons/TEMPLATE.md`](lessons/TEMPLATE.md).

> **Un verificador que nunca vio el error no verifica nada.** Una prueba que siempre pasa puede estar rota. La única forma de saberlo es verla fallar contra el error real. *Pregunta detectora:* ¿probé mi verificación contra el error en las formas en que aparecería de verdad? ¿Y contra el caso correcto? *Señal de alarma:* «Ya pasa, entonces está bien puesta».
>
> — lección 13

Ritual aplica esa lección a sí mismo: cada regla del guardia, cada verificador y cada hook de este repositorio lleva sus casos, y se vio fallar antes de entrar.

Cada lección dice de dónde salió y con qué modelo y en qué mes pasó (`field · ~opus · 2026-08`; la `~` quiere decir que es de memoria, no de un registro):

- `field`: de un error real en un proyecto, con ese ejemplo.
- `lab`: se rompió en una [simulación](simulations/README.es.md), y dice qué modelo y cuándo. Pasa a `field` cuando alguien la confirma en un proyecto suyo.
- `proposal`: solo para lo que no «truena» (seguridad), con fuente pública.

> [!NOTE]
> Ritual corre con Claude, y un error que comete un modelo puede no cometerlo otro. Por eso cada lección registra su modelo: una lección que solo pasó con otro modelo se comprueba con Claude antes de que a alguien le salga su pregunta, y cuando un Claude más nuevo ya no comete el error, los datos lo muestran.

## Las lecciones de los paquetes salen de simulaciones

Las lecciones por tipo de proyecto no se inventan. Un modelo construye una tarea realista sin Ritual; otro modelo, en otra sesión, ejecuta lo construido y anota lo que se rompió, con evidencia. Cada tarea se corre dos veces: lo que se rompe las dos veces es lección; lo que se rompe una vez queda como candidato. Cuando sale un modelo nuevo, las tareas se vuelven a correr, y una lección que ya no se rompe se baja con datos. El método y las tareas están en [`simulations/`](simulations/README.es.md).

La primera fue un sitio para un taller de bicicletas con formulario de contacto y página de administración. Sonnet lo construyó dos veces, y las dos versiones escapaban bien el HTML, no salían de la carpeta pública y aguantaron 300 mensajes a la vez. Aun así, las dos perdían en silencio el mensaje que llegaba después de una escritura cortada, las dos aceptaban cientos de mensajes de un robot sin forma de limpiarlos, y una decía que su prueba pasaba cuando fallaba una vez de cada diez. Cada hallazgo está con su evidencia en [`simulations/web/runs/`](simulations/web/runs/2026-10-sonnet-2/FINDINGS.md), junto al código tal como quedó.

Ritual también se revisa con sus propias lecciones. WEB-1 encontró el mismo error en la bitácora de Ritual, y se corrigió con una prueba que primero se vio fallar.

## Contribuir

La forma más fácil: **confirma una lección**. Si una lección también te pasó a ti, [abre una confirmación](https://github.com/Zurishadday/Ritual/issues/new?template=confirm-a-lesson.yml) con tu ejemplo anónimo y el modelo que usabas. Cada confirmación agrega ese modelo a la lista `seen:` de la lección: así la biblioteca aprende a qué modelos les pasa cada error, y cuáles más nuevos ya no lo cometen. Una lección `lab` o `proposal` con un ejemplo real pasa a `field`, con tu nombre si quieres.

También puedes:

- **Compartir una lección** tuya: escribe `/ritual share`. La compara con la biblioteca (un error que ya está cubierto se vuelve una confirmación, no un duplicado), la reescribe para que le sirva a alguien que construye otra cosa, revisa que no nombre nada de tu proyecto, decide dónde va y abre el [formulario](https://github.com/Zurishadday/Ritual/issues/new?template=share-a-lesson.yml) ya lleno. Tú lo lees y lo envías. Una lección que solo pasó con otro modelo [se comprueba con Claude primero](simulations/README.es.md#cómo-se-revisa-una-lección-que-alguien-aporta).
- **Abrir un paquete nuevo** para un tipo de proyecto que falte: `/ritual share` lo propone cuando una lección no cabe en ninguno de los que existen. O **proponer una tarea de simulación** para él.
- **Revisar una traducción**: las lecciones las traduce un modelo, y cada una lo dice (`by: ai`). Si eres hablante nativo, corrígela y fírmala con tu usuario de GitHub. El flujo está en [`lessons/TRANSLATING.md`](lessons/TRANSLATING.md).
- **Agregar una regla al guardia**, o un caso que debía dejar pasar.

Antes de abrir un pull request, corre `npm test`. Corre la calibración de cada verificador y hook, revisa que cada lección traiga sus cinco partes y que los índices estén al día (`node scripts/lessons.mjs --index` los regenera).

## Idiomas

El original es el inglés. Las lecciones están en siete idiomas: [English](lessons/en/README.md) · [Español](lessons/es/README.md) · [Português](lessons/pt/README.md) · [Français](lessons/fr/README.md) · [中文](lessons/zh-CN/README.md) · [日本語](lessons/ja/README.md) · [한국어](lessons/ko/README.md). Cada traducción dice de qué versión del original salió: cuando el original cambia, el verificador avisa que la traducción quedó vieja.

## Licencia

MIT © 2026 Zurishadday
