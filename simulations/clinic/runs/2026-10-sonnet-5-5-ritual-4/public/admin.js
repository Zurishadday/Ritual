const $ = (id) => document.getElementById(id);
const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
const ESTADOS = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
let citas = [];

async function api(url, metodo = 'GET', cuerpo) {
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, datos };
}

function aviso(texto, mal) {
  const m = $('msg');
  m.textContent = texto;
  m.classList.toggle('mal', !!mal);
  m.hidden = false;
}

function fechaLarga(f) {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function resumen() {
  const p = citas.filter((c) => c.estado === 'pendiente').length;
  $('resumen').textContent = `${citas.length} solicitudes · ${p} pendientes`;
}

function pintarEstado(art, c) {
  const e = art.querySelector('.estado');
  e.textContent = ESTADOS[c.estado];
  e.className = 'estado estado-' + c.estado;
  art.querySelector('[data-estado="confirmada"]').setAttribute('aria-pressed', String(c.estado === 'confirmada'));
  art.querySelector('[data-estado="cancelada"]').setAttribute('aria-pressed', String(c.estado === 'cancelada'));
}

function fila(c) {
  const art = document.createElement('article');
  art.className = 'cita';
  const h = document.createElement('h2');
  const nom = document.createElement('span');
  nom.textContent = c.nombre;
  const est = document.createElement('span');
  h.append(nom, est);
  est.className = 'estado';
  const dl = document.createElement('dl');
  const datos = [
    ['Tratamiento', NOMBRES[c.tratamiento] || c.tratamiento],
    ['Día y hora', `${fechaLarga(c.fecha)}, ${c.hora}`],
    ['Teléfono', c.telefono],
    ['Correo', c.correo],
    ['Comentario', c.comentario || '—'],
    ['Recibida', new Date(c.creada).toLocaleString('es-MX')],
  ];
  for (const [k, v] of datos) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }
  const acc = document.createElement('div');
  acc.className = 'acciones';
  for (const [estado, texto] of [['confirmada', 'Confirmar'], ['cancelada', 'Cancelar']]) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'boton boton-claro'; b.dataset.estado = estado; b.textContent = texto;
    b.addEventListener('click', () => cambiar(c, estado, art));
    acc.append(b);
  }
  const borrar = document.createElement('button');
  borrar.type = 'button'; borrar.className = 'boton boton-borrar'; borrar.textContent = 'Eliminar';
  borrar.addEventListener('click', () => eliminar(c, art));
  acc.append(borrar);
  art.append(h, dl, acc);
  pintarEstado(art, c);
  return art;
}

async function cambiar(c, estado, art) {
  const { ok, status, datos } = await api('/api/admin/citas/' + c.id, 'PATCH', { estado });
  if (status === 401) return mostrarEntrar();
  if (!ok) return aviso(datos.error || 'No se pudo guardar el cambio.', true);
  c.estado = estado;
  pintarEstado(art, c); // se actualiza en el lugar: el foco no se mueve
  resumen();
  aviso(`Solicitud de ${c.nombre}: ${ESTADOS[estado].toLowerCase()}.`);
}

async function eliminar(c, art) {
  if (!confirm(`¿Eliminar la solicitud de ${c.nombre}? Esto no se puede deshacer.`)) return;
  const { ok, status, datos } = await api('/api/admin/citas/' + c.id, 'DELETE', {});
  if (status === 401) return mostrarEntrar();
  if (!ok) return aviso(datos.error || 'No se pudo eliminar.', true);
  const sig = art.nextElementSibling || art.previousElementSibling;
  art.remove();
  citas = citas.filter((x) => x !== c);
  resumen();
  aviso(`Solicitud de ${c.nombre} eliminada.`);
  if (sig) sig.querySelector('button').focus(); else $('msg').focus();
}

function mostrarEntrar() {
  $('vista-lista').hidden = true;
  $('vista-entrar').hidden = false;
  $('clave').focus();
}

async function cargar() {
  const { ok, status, datos } = await api('/api/admin/citas');
  if (status === 401) return mostrarEntrar();
  if (!ok) { $('vista-entrar').hidden = true; $('vista-lista').hidden = false; return aviso('No se pudo cargar la lista.', true); }
  citas = datos.citas;
  $('vista-entrar').hidden = true;
  $('vista-lista').hidden = false;
  $('lista').replaceChildren(...citas.map(fila));
  if (!citas.length) { $('lista').textContent = 'Todavía no hay solicitudes.'; }
  $('danadas').hidden = !datos.danadas;
  if (datos.danadas) $('danadas').textContent = `Atención: ${datos.danadas} línea(s) de datos/citas.jsonl están dañadas y no se muestran. Se conservan en el archivo.`;
  resumen();
}

$('form-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = $('e-clave');
  err.textContent = '';
  if (!$('clave').value) { err.textContent = 'Escribe la contraseña.'; $('clave').focus(); return; }
  const { ok, datos } = await api('/api/admin/entrar', 'POST', { clave: $('clave').value });
  if (!ok) { err.textContent = datos.error || 'No se pudo entrar.'; $('clave').select(); return; }
  $('clave').value = '';
  await cargar();
  $('resumen').parentElement.querySelector('button').focus();
});

$('salir').addEventListener('click', async () => {
  await api('/api/admin/salir', 'POST', {});
  $('msg').hidden = true;
  mostrarEntrar();
});

cargar();
