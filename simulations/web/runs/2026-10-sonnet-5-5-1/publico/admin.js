// Página de administración: lista y borra mensajes.
// Todo el texto se inserta con textContent, nunca como HTML.
const lista = document.getElementById('lista');
const resumen = document.getElementById('resumen');

function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function tarjeta(m) {
  const art = crear('article', 'mensaje');

  const cab = crear('header');
  const de = crear('span', 'de', m.nombre + ' · ');
  const enlace = crear('a', '', m.correo);
  enlace.href = 'mailto:' + encodeURIComponent(m.correo).replace(/%40/g, '@');
  de.append(enlace);
  const fecha = crear('span', 'fecha', new Date(m.fecha).toLocaleString('es-MX'));
  cab.append(de, fecha);

  const texto = crear('p', 'texto', m.mensaje);

  const borrar = crear('button', '', 'Eliminar');
  borrar.type = 'button';
  borrar.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este mensaje?')) return;
    borrar.disabled = true;
    const r = await fetch('/api/mensajes/' + m.id, { method: 'DELETE', headers: { 'X-Admin': '1' } });
    if (r.ok) cargar();
    else { borrar.disabled = false; alert('No se pudo eliminar.'); }
  });

  art.append(cab, texto, borrar);
  return art;
}

async function cargar() {
  try {
    const r = await fetch('/api/mensajes', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const mensajes = await r.json();
    lista.replaceChildren(...mensajes.map(tarjeta));
    resumen.textContent = mensajes.length
      ? `${mensajes.length} mensaje${mensajes.length === 1 ? '' : 's'}, del más reciente al más antiguo.`
      : 'Aún no hay mensajes.';
  } catch {
    resumen.textContent = 'No se pudieron cargar los mensajes.';
  }
}

cargar();
