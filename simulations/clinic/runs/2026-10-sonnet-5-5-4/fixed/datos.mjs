// Almacén de solicitudes: en memoria + archivo JSON. Las escrituras van en serie y son atómicas.
// Si una escritura falla, el cambio en memoria se deshace: lo que ve el admin es siempre lo que hay en disco.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function abrir(archivo) {
  let lista = [];
  let texto;
  try { texto = await readFile(archivo, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; } // primer arranque: no hay archivo

  if (texto !== undefined) {
    try {
      lista = JSON.parse(texto);
      if (!Array.isArray(lista)) throw new Error('el archivo no contiene una lista');
    } catch (e) {
      // Archivo dañado: se aparta (sin borrarlo) para que la siguiente solicitud no lo sobrescriba.
      const apartado = archivo.replace(/\.json$/, '') + `.danado-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await rename(archivo, apartado);
      console.error(`AVISO: ${archivo} está dañado (${e.message}). Se guardó una copia en ${apartado}; se empieza con la lista vacía.`);
      lista = [];
    }
  }

  let cola = Promise.resolve();
  function persistir() {
    const p = cola.catch(() => {}).then(async () => { // un fallo anterior no bloquea las escrituras siguientes
      await mkdir(dirname(archivo), { recursive: true });
      const tmp = archivo + '.tmp';
      await writeFile(tmp, JSON.stringify(lista, null, 2));
      await rename(tmp, archivo);
    });
    cola = p;
    return p;
  }

  return {
    todas: () => lista,
    buscar: id => lista.find(x => x.id === id),
    async agregar(rec) {
      lista.push(rec);
      try { await persistir(); }
      catch (e) { const i = lista.indexOf(rec); if (i >= 0) lista.splice(i, 1); throw e; }
    },
    async cambiarEstado(s, estado) {
      const previo = s.estado;
      s.estado = estado;
      try { await persistir(); } catch (e) { s.estado = previo; throw e; }
    },
    async eliminar(s) {
      const i = lista.indexOf(s);
      if (i < 0) return;
      lista.splice(i, 1);
      try { await persistir(); }
      catch (e) { lista.splice(Math.min(i, lista.length), 0, s); throw e; }
    },
  };
}
