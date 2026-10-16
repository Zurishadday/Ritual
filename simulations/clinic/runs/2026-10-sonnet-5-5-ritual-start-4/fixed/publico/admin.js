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

let conteos = { todas: 0, pendiente: 0, confirmada: 0, cancelada: 0 };
let hayMas = false;
const masBoton = $('mas'), borrarTodas = $('borrar-todas');

// Carga una página de solicitudes (25). Con vacia=true empieza de nuevo con el filtro actual.
async function cargar(vacia = true) {
  const params = new URLSearchParams({ estado: filtro.value });
  if (!vacia && citas.length) params.set('antes', citas[citas.length - 1].id);
  const r = await api('/api/admin/citas?' + params);
  if (r.estado === 401) return mostrarAcceso();
  if (r.estado === 409) return cargar(true);
  if (!r.ok) { acceso.hidden = true; panel.hidden = false; return mostrarAviso('mal', 'No pudimos cargar las solicitudes. Recarga la página.'); }
  citas = vacia ? r.cuerpo.citas : citas.concat(r.cuerpo.citas);
  conteos = r.cuerpo.conteos; hayMas = r.cuerpo.hayMas;
  acceso.hidden = true; panel.hidden = false; $('salir').hidden = false;
  pintar();
}

const fechaBonita = (f) => {
  const [a, m, d] = String(f).split('-').map(Number);
  const dia = new Date(a, m - 1, d);
  return Number.isNaN(dia.getTime()) ? 'sin fecha' : dia.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
  li.dataset.estado = c.estado; li.dataset.id = c.id;
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
  lista.replaceChildren(...citas.map(tarjeta));
  resumen();
}

function resumen() {
  const pendientes = conteos.pendiente;
  $('titulo').textContent = `Solicitudes de cita (${pendientes} pendiente${pendientes === 1 ? '' : 's'})`;
  masBoton.hidden = !hayMas;
  borrarTodas.hidden = !conteos[filtro.value];
  if (!conteos.todas) mostrarAviso('', 'Todavía no hay solicitudes.');
  else if (!citas.length) mostrarAviso('', 'No hay solicitudes con ese filtro.');
  else if (!aviso.classList.contains('ok') && !aviso.classList.contains('mal')) mostrarAviso('', '');
}

filtro.addEventListener('change', () => { mostrarAviso('', ''); cargar(true); });
masBoton.addEventListener('click', () => cargar(false));

borrarTodas.addEventListener('click', async () => {
  const f = filtro.value;
  const n = conteos[f];
  const cuales = f === 'todas' ? 'TODAS las solicitudes' : `las ${n} solicitudes ${etiqueta[f].toLowerCase()}s`.replace('1 solicitudes', '1 solicitud');
  if (!confirm(`¿Eliminar para siempre ${cuales}${f === 'todas' ? ` (${n})` : ''}? No se puede deshacer.`)) return;
  const r = await api('/api/admin/citas/eliminar', { method: 'POST', body: { estado: f } });
  if (r.estado === 401) return mostrarAcceso();
  if (!r.ok) return mostrarAviso('mal', r.cuerpo.error || 'No se pudo eliminar.', true);
  await cargar(true);
  mostrarAviso('ok', `Se eliminaron ${r.cuerpo.eliminadas} solicitudes.`, true);
});

// Quita o vuelve a dibujar solo la tarjeta que cambió (no toda la lista).
function actualizarTarjeta(c) {
  const vieja = lista.querySelector(`li[data-id="${c.id}"]`);
  if (!vieja) return null;
  if (filtro.value !== 'todas' && c.estado !== filtro.value) { vieja.remove(); return null; }
  const nueva = tarjeta(c);
  vieja.replaceWith(nueva);
  return nueva;
}

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
    conteos[c.estado]--; conteos.todas--;
    lista.querySelector(`li[data-id="${id}"]`)?.remove();
    resumen();
    return mostrarAviso('ok', `Se eliminó la solicitud de ${c.nombre}.`, true);
  }
  const r = await api('/api/admin/citas/' + id, { method: 'PATCH', body: { estado: accion } });
  if (r.estado === 401) return mostrarAcceso();
  if (!r.ok) return mostrarAviso('mal', r.cuerpo.error || 'No se pudo guardar el cambio.', true);
  conteos[c.estado]--; conteos[accion]++;
  c.estado = accion;
  if (filtro.value !== 'todas' && accion !== filtro.value) citas = citas.filter((x) => x.id !== id);
  const nueva = actualizarTarjeta(c);
  resumen();
  mostrarAviso('ok', `La cita de ${c.nombre} quedó ${etiqueta[accion].toLowerCase()}.`);
  // El foco vuelve al mismo botón; si la tarjeta salió de la lista, al aviso (que se ve y se lee).
  const boton = nueva?.querySelector(`button[data-accion="${accion}"]`);
  if (boton) boton.focus({ preventScroll: true }); else aviso.focus();
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
