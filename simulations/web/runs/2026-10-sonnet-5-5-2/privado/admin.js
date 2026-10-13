const lista = document.getElementById('lista');
const resumen = document.getElementById('resumen');

function elemento(etiqueta, texto, clase) {
  const el = document.createElement(etiqueta);
  if (texto !== undefined) el.textContent = texto;
  if (clase) el.className = clase;
  return el;
}

function tarjeta(m) {
  const art = elemento('article', undefined, 'mensaje');

  const cab = elemento('header');
  cab.append(elemento('strong', m.nombre));
  cab.append(elemento('span', new Date(m.fecha).toLocaleString('es-MX'), 'meta'));
  art.append(cab);

  const correo = elemento('a', m.correo);
  correo.href = 'mailto:' + m.correo;
  const linea = elemento('p', undefined, 'meta');
  linea.append(correo);
  art.append(linea);

  art.append(elemento('p', m.mensaje));

  const borrar = elemento('button', 'Eliminar');
  borrar.type = 'button';
  borrar.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    const r = await fetch('/api/mensajes/' + encodeURIComponent(m.id), { method: 'DELETE' });
    if (r.ok) cargar();
    else alert('No se pudo eliminar el mensaje.');
  });
  art.append(borrar);

  return art;
}

async function cargar() {
  try {
    const r = await fetch('/api/mensajes');
    if (!r.ok) throw new Error();
    const mensajes = await r.json();
    resumen.textContent = mensajes.length
      ? `${mensajes.length} mensaje(s), del más reciente al más antiguo.`
      : 'Todavía no hay mensajes.';
    lista.replaceChildren(...mensajes.map(tarjeta));
  } catch {
    resumen.textContent = 'No se pudieron cargar los mensajes.';
  }
}

cargar();
