const $ = (id) => document.getElementById(id);
const acceso = $('acceso'), panel = $('panel'), lista = $('lista'), aviso = $('aviso'), filtro = $('filtro');
let citas = [];

async function api(ruta, opciones = {}) {
  const resp = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json' },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const cuerpo = await resp.json().catch(() => ({}));
  return { ok: resp.ok, estado: resp.status, cuerpo };
}

function mostrarAviso(tipo, texto, enfocar = false) {
  aviso.className = 'estado ' + tipo;
  aviso.textContent = texto;
  if (enfocar) aviso.focus();
}

function mostrarAcceso() {
  panel.hidden = true; acceso.hidden = false; $('salir').hidden = true;
  $('clave').focus();
}

async function cargar() {
  const r = await api('/api/admin/citas');
  if (r.estado === 401) return mostrarAcceso();
  if (!r.ok) { acceso.hidden = true; panel.hidden = false; return mostrarAviso('mal', 'No pudimos cargar las solicitudes. Recarga la página.'); }
  citas = r.cuerpo.citas;
  acceso.hidden = true; panel.hidden = false; $('salir').hidden = false;
  pintar();
}

const fechaBonita = (f) => {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const etiqueta = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };

function elemento(etiquetaHtml, texto, clase) {
  const e = document.createElement(etiquetaHtml);
  if (texto != null) e.textContent = texto;
  if (clase) e.className = clase;
  return e;
}

function tarjeta(c) {
  const li = elemento('li', null, 'cita');
  li.dataset.estado = c.estado;
  const h = elemento('h2', c.nombre);
  h.append(elemento('span', etiqueta[c.estado], 'insignia'));
  li.append(h);
  li.append(elemento('p', `${c.tratamientoNombre} · ${fechaBonita(c.fecha)} a las ${c.hora}`));
  const tel = elemento('p', 'Teléfono: ');
  const a = elemento('a', c.telefono); a.href = 'tel:' + c.telefono.replace(/[^\d+]/g, '');
  tel.append(a);
  const cor = elemento('p', 'Correo: ');
  const b = elemento('a', c.correo); b.href = 'mailto:' + c.correo;
  cor.append(b);
  li.append(tel, cor);
  if (c.comentario) li.append(elemento('p', 'Comentario: ' + c.comentario));
  li.append(elemento('p', 'Recibida: ' + new Date(c.creada).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }), 'recibida'));

  const acciones = elemento('div', null, 'acciones');
  for (const [est, texto] of [['confirmada', 'Confirmar'], ['cancelada', 'Cancelar']]) {
    const bt = elemento('button', texto);
    bt.type = 'button';
    bt.dataset.id = c.id; bt.dataset.accion = est;
    bt.setAttribute('aria-pressed', String(c.estado === est));
    acciones.append(bt);
  }
  const del = elemento('button', 'Eliminar', 'eliminar');
  del.type = 'button'; del.dataset.id = c.id; del.dataset.accion = 'eliminar';
  acciones.append(del);
  li.append(acciones);
  return li;
}

function pintar() {
  const f = filtro.value;
  const visibles = citas.filter((c) => f === 'todas' || c.estado === f);
  lista.replaceChildren(...visibles.map(tarjeta));
  const pendientes = citas.filter((c) => c.estado === 'pendiente').length;
  $('titulo').textContent = `Solicitudes de cita (${pendientes} pendiente${pendientes === 1 ? '' : 's'})`;
  if (!citas.length) mostrarAviso('', 'Todavía no hay solicitudes.');
  else if (!visibles.length) mostrarAviso('', 'No hay solicitudes con ese filtro.');
  else if (!aviso.classList.contains('ok') && !aviso.classList.contains('mal')) mostrarAviso('', '');
}

filtro.addEventListener('change', () => { mostrarAviso('', ''); pintar(); });

lista.addEventListener('click', async (ev) => {
  const bt = ev.target.closest('button[data-id]');
  if (!bt) return;
  const { id, accion } = bt.dataset;
  const c = citas.find((x) => x.id === id);
  if (!c) return;
  if (accion === 'eliminar') {
    if (!confirm(`¿Eliminar para siempre la solicitud de ${c.nombre}?`)) return;
    const r = await api('/api/admin/citas/' + id, { method: 'DELETE' });
    if (r.estado === 401) return mostrarAcceso();
    if (!r.ok) return mostrarAviso('mal', r.cuerpo.error || 'No se pudo eliminar.', true);
    citas = citas.filter((x) => x.id !== id);
    pintar();
    return mostrarAviso('ok', `Se eliminó la solicitud de ${c.nombre}.`, true);
  }
  const r = await api('/api/admin/citas/' + id, { method: 'PATCH', body: { estado: accion } });
  if (r.estado === 401) return mostrarAcceso();
  if (!r.ok) return mostrarAviso('mal', r.cuerpo.error || 'No se pudo guardar el cambio.', true);
  c.estado = accion;
  pintar();
  mostrarAviso('ok', `La cita de ${c.nombre} quedó ${etiqueta[accion].toLowerCase()}.`);
  // El foco vuelve al mismo botón, que se volvió a dibujar.
  lista.querySelector(`button[data-id="${id}"][data-accion="${accion}"]`)?.focus();
});

$('form-acceso').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const est = $('estado-acceso');
  est.className = 'estado'; est.textContent = 'Comprobando…';
  const r = await api('/api/admin/login', { method: 'POST', body: { clave: $('clave').value } });
  if (!r.ok) {
    est.className = 'estado mal';
    est.textContent = r.cuerpo.error || 'No pudimos entrar.';
    $('clave').select();
    return;
  }
  $('clave').value = '';
  est.textContent = ''; est.className = 'estado';
  await cargar();
  $('titulo').focus();
});

$('salir').addEventListener('click', async () => {
  await api('/api/admin/salir', { method: 'POST' });
  citas = [];
  mostrarAcceso();
});

cargar();
