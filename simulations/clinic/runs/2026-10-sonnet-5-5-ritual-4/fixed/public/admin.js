const $ = (id) => document.getElementById(id);
const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
const ESTADOS = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
let citas = [];       // las ya mostradas
let total = 0;        // las que coinciden con el filtro
let global = null;    // conteos de todo el archivo
const POR_PAGINA = 50;

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
  const [y, m, d] = String(f).split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return Number.isNaN(fecha.getTime()) ? String(f) : fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function resumen() {
  if (!global) return;
  const filtrando = $('f-estado').value || $('f-q').value.trim();
  $('resumen').textContent = `${global.todas} solicitudes · ${global.pendiente} pendientes` + (filtrando ? ` · mostrando ${citas.length} de ${total} que coinciden` : citas.length < total ? ` · mostrando ${citas.length}` : '');
  $('mas').hidden = citas.length >= total;
  $('mas').textContent = `Mostrar más (${total - citas.length} restantes)`;
}

// Una tarjeta rota nunca debe dejar sin pintar a las demás.
function filaSegura(c) {
  try { return fila(c); } catch {
    const p = document.createElement('p');
    p.className = 'aviso mal';
    p.textContent = 'Una solicitud tiene datos ilegibles y no se pudo mostrar.';
    return p;
  }
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
  global = datos.global;
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
  total--; global = datos.global;
  resumen();
  aviso(`Solicitud de ${c.nombre} eliminada.`);
  if (sig) sig.querySelector('button').focus(); else $('msg').focus();
}

function mostrarEntrar() {
  $('vista-lista').hidden = true;
  $('vista-entrar').hidden = false;
  $('clave').focus();
}

// Pide una página (50) con el filtro actual. "añadir" agrega al final; si no, reemplaza la lista.
async function cargar(añadir = false) {
  const p = new URLSearchParams({ desde: añadir ? citas.length : 0, por: POR_PAGINA });
  if ($('f-estado').value) p.set('estado', $('f-estado').value);
  if ($('f-q').value.trim()) p.set('q', $('f-q').value.trim());
  const { ok, status, datos } = await api('/api/admin/citas?' + p);
  if (status === 401) return mostrarEntrar();
  if (!ok) { $('vista-entrar').hidden = true; $('vista-lista').hidden = false; return aviso('No se pudo cargar la lista.', true); }
  $('vista-entrar').hidden = true;
  $('vista-lista').hidden = false;
  total = datos.total; global = datos.global;
  citas = añadir ? citas.concat(datos.citas) : datos.citas;
  const tarjetas = datos.citas.map(filaSegura);
  if (añadir) $('lista').append(...tarjetas);
  else if (citas.length) $('lista').replaceChildren(...tarjetas);
  else $('lista').textContent = global.todas ? 'Ninguna solicitud coincide con ese filtro.' : 'Todavía no hay solicitudes.';
  $('danadas').hidden = !datos.danadas;
  if (datos.danadas) $('danadas').textContent = `Atención: ${datos.danadas} línea(s) de datos/citas.jsonl están dañadas o incompletas y no se muestran. Se conservan en el archivo.`;
  resumen();
}

$('filtros').addEventListener('submit', (ev) => { ev.preventDefault(); cargar(); });
$('f-estado').addEventListener('change', () => cargar());
$('mas').addEventListener('click', () => cargar(true));
$('borrar-filtro').addEventListener('click', async () => {
  const estado = $('f-estado').value, q = $('f-q').value.trim();
  if (!estado && !q) return aviso('Elige un estado o escribe una búsqueda para eliminar en bloque.', true);
  if (!confirm(`¿Eliminar las ${total} solicitudes que coinciden con el filtro? Esto no se puede deshacer.`)) return;
  const { ok, status, datos } = await api('/api/admin/citas', 'DELETE', { estado, q });
  if (status === 401) return mostrarEntrar();
  if (!ok) return aviso(datos.error || 'No se pudo eliminar.', true);
  await cargar();
  aviso(`${datos.eliminadas} solicitudes eliminadas.`);
});

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
