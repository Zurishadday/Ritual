# Cómo se escribe una lección

Una lección sale de un error real, no de la teoría. Tiene cinco partes, siempre las cinco, y un número que no cambia nunca. Vive en `lecciones/es/<grupo>.md`, en el grupo de **lo que estabas haciendo** cuando pasó (escribir, cifras, pruebas, scripts, interfaz, consola o git). Si también sirve en otro grupo, se dice con `grupos:`. Si es propia de un tipo de proyecto, se dice con `paquetes:`.

El verificador (`node scripts/lecciones.mjs --verificar`) revisa todo esto, y el índice de cada idioma se genera solo (`--indice`): no se edita a mano.

## Plantilla

```markdown
### 13. Un verificador que nunca vio el error no verifica nada

`origen: campo` · `grupos: scripts-y-archivos` · `paquetes: web`

**La idea.** La regla, en una o dos frases que se entiendan sin el contexto.

**Ejemplo.** El caso real, anónimo: qué se hizo, qué pasó, cómo se notó.

**Pregunta detectora.** La pregunta concreta que separa el caso que aplica del que no. Sin esta
pregunta, la lección es una advertencia, y las advertencias se ignoran.

**Señal de alarma.** La frase que uno se dice justo antes de cometerlo otra vez: «ya pasa,
entonces está bien puesta».

**Qué hacer.** Lo que se hace distinto a partir de ahora, lo más concreto posible.
```

Partes extra como **Otro ejemplo.**, **Variante.** o **No la confundas con.** están permitidas; las cinco de arriba son obligatorias.

## Los datos de la lección

| Dato | Valores | Qué significa |
|---|---|---|
| `origen: campo` | | Salió de un error real en un proyecto, y el ejemplo es ese error. |
| `origen: laboratorio · sonnet · 2026-10` | modelo y mes | Se rompió en una simulación de Ritual: ese modelo construyó la tarea ese mes. Cuando alguien la confirma en un proyecto suyo, pasa a `campo`. |
| `origen: propuesta` + `fuente: <enlace>` | | Solo para lo que no «truena» (seguridad, sobre todo) y viene de una fuente pública. |
| `grupos:` | otros grupos, separados por coma | Grupos secundarios donde también aplica. |
| `paquetes:` | `web`, `apps`, `crm`, `ia`, `seguridad` | Tipos de proyecto a los que pertenece. Sin este dato, aplica a todos. |

## Números

- El núcleo va del 1 en adelante, sin huecos. Los paquetes usan prefijo: `WEB-1`, `IA-3`.
- Nunca se renumera ni se borra. Una lección que ya está cubierta por otra se queda con su número y dice solo: `Fusionada en la N.`
- Para citar otra lección se escribe «ver la 44» o «lección 44»; el verificador comprueba que exista.

## Idiomas

El original es el español. Las traducciones (`lecciones/en/`, `lecciones/pt/`...) llevan el mismo número y las cinco partes con los nombres de ese idioma; la línea de datos (`origen`, `grupos`, `paquetes`) solo va en el original.
