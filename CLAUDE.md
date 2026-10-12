# Ritual

Plugin público de Claude Code: cada error se vuelve lección, cada lección se vuelve regla y cada regla, cuando se puede, se vuelve prueba o guardia. Responde siempre en español.

## Reglas de este repositorio

- El repositorio es público: cada push se ve de inmediato. `fuentes/` es material de referencia local, va en `.gitignore` y nada de ahí se sube tal cual.
- Antes de cada push corre `node scripts/revisar-publicacion.mjs`. La lista de palabras que nunca se publican vive en `fuentes/no-publicar/prohibidas.txt`, fuera de git. Si encuentra una, no se sube nada: se reescribe primero. El hook `scripts/githooks/pre-push` lo corre solo (`git config core.hooksPath scripts/githooks`).
- Se trabaja en `main`, un commit por pieza terminada, con mensaje en español, y push después de cada commit.
- Cada pieza que se pueda comprobar sola lleva su prueba, y se ve fallar contra el error real antes de darla por buena. Un hook o un verificador sin sus casos no entra.
- Todos los hooks y scripts en Node, nunca en bash: el proyecto se desarrolla en Windows.
- Las lecciones del núcleo van numeradas del 1 al 49, y nunca se renumeran ni se borran: una que sobra se marca «fusionada en la N». Los paquetes usan prefijo (`WEB-1`).
- Cada lección lleva su origen: `campo` (un error real con su ejemplo), `laboratorio` (se rompió en una simulación: modelo y fecha) o `propuesta` (solo lo de seguridad que no truena, con fuente pública).
- En las simulaciones construye Sonnet; revisa, ejecuta y escribe la lección Opus, en una sesión distinta.
- Las skills se escriben en inglés con la instrucción de responder en el idioma de quien las usa. README y lecciones, en siete idiomas: el español es el original.
