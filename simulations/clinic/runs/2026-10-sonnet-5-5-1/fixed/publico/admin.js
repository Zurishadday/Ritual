const $ = (id) => document.getElementById(id);
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
let token = sessionStorage.getItem('token');
let nombres = {};
let pagina = 1;
let ultimo = { total: 0, paginas: 1 };

function mostrar(conSesion) {
  $('login').hidden = conSesion;
  $('panel').hidden = !conSesion;
}

async function pedir(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  });
  if (r.status === 401) {
    cerrarSesion();
    throw new Error('Tu sesión terminó. Entra de nuevo.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error del servidor.');
  return j;
}

function cerrarSesion() {
  token = null;
  sessionStorage.removeItem('token');
  mostrar(false);
  $('clave').focus();
}

function fechaLegible(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d);
  return `${DIAS[f.getDay()]} ${d}/${m}/${a}`;
}

function fila(dl, etiqueta, valor) {
  const dt = document.createElement('dt');
  dt.textContent = etiqueta;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  dl.append(dt, dd);
}

function boton(texto, clase, onclick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'boton boton-chico ' + clase;
  b.textContent = texto;
  b.addEventListener('click', onclick);
  return b;
}

function aviso(texto, tipo) {
  const el = $('panel-msg');
  el.textContent = texto;
  el.className = 'mensaje ' + (tipo || '');
}

// Tras cambiar algo la lista se vuelve a pintar; el foco vuelve a la misma tarjeta
// (o, si ya no está en este filtro, al aviso) para que el teclado no se pierda.
function enfocarTarjeta(id) {
  const art = id && $('lista').querySelector(`[data-id="${CSS.escape(id)}"]`);
  const destino = art || $('panel-msg');
  destino.tabIndex = -1;
  destino.focus();
}

async function cambiar(cita, estado) {
  aviso('');
  try {
    await pedir('/api/admin/citas/' + encodeURIComponent(cita.id), {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
    await cargar();
    aviso(`Solicitud de ${cita.nombre}: ${estado}.`, 'ok');
    enfocarTarjeta(cita.id);
  } catch (e) {
    aviso(e.message, 'error');
  }
}

async function borrar(cita) {
  if (!confirm(`¿Borrar la solicitud de ${cita.nombre}? No se puede deshacer.`)) return;
  aviso('');
  try {
    await pedir('/api/admin/citas/' + encodeURIComponent(cita.id), { method: 'DELETE' });
    await cargar();
    aviso('Solicitud borrada.', 'ok');
    enfocarTarjeta(null);
  } catch (e) {
    aviso(e.message, 'error');
  }
}

function tarjeta(c) {
  const art = document.createElement('article');
  art.className = 'solicitud';
  art.dataset.id = c.id;

  const cab = document.createElement('div');
  cab.className = 'solicitud-cab';
  const h = document.createElement('h2');
  h.textContent = c.nombre;
  const ins = document.createElement('span');
  ins.className = 'insignia ' + c.estado;
  ins.textContent = c.estado[0].toUpperCase() + c.estado.slice(1);
  cab.append(h, ins);

  const dl = document.createElement('dl');
  fila(dl, 'Tratamiento', nombres[c.tratamiento] || c.tratamiento);
  fila(dl, 'Día y hora', `${fechaLegible(c.fecha)}, ${c.hora}`);
  fila(dl, 'Teléfono', c.telefono);
  fila(dl, 'Correo', c.correo);
  if (c.comentario) fila(dl, 'Comentario', c.comentario);
  fila(dl, 'Recibida', new Date(c.creada).toLocaleString('es'));

  const acc = document.createElement('div');
  acc.className = 'solicitud-botones';
  if (c.estado !== 'confirmada') acc.append(boton('Confirmar', '', () => cambiar(c, 'confirmada')));
  if (c.estado !== 'cancelada') acc.append(boton('Cancelar', 'boton-borde', () => cambiar(c, 'cancelada')));
  if (c.estado !== 'pendiente') acc.append(boton('Volver a pendiente', 'boton-borde', () => cambiar(c, 'pendiente')));
  acc.append(boton('Borrar', 'boton-peligro', () => borrar(c)));

  art.append(cab, dl, acc);
  return art;
}

function filtroActual() {
  return { q: $('buscar').value.trim(), estado: $('estado').value };
}

async function cargar() {
  const f = filtroActual();
  const qs = new URLSearchParams({ pagina, ...(f.q && { q: f.q }), ...(f.estado && { estado: f.estado }) });
  const r = await pedir('/api/admin/citas?' + qs);
  nombres = r.tratamientos;
  pagina = r.pagina;
  ultimo = r;
  const c = r.conteos;
  $('resumen').textContent =
    `${c.pendiente} pendientes · ${c.confirmada} confirmadas · ${c.cancelada} canceladas` +
    (f.q || f.estado ? ` · ${r.total} coinciden con el filtro` : '');
  const lista = $('lista');
  lista.replaceChildren();
  if (!r.citas.length) {
    const p = document.createElement('p');
    p.className = 'vacio';
    p.textContent = f.q || f.estado ? 'Ninguna solicitud coincide con el filtro.' : 'Todavía no hay solicitudes.';
    lista.append(p);
  } else {
    lista.append(...r.citas.map(tarjeta));
  }
  $('paginas').hidden = r.paginas <= 1;
  $('pagina-info').textContent = `Página ${r.pagina} de ${r.paginas}`;
  // aria-disabled (no disabled): el botón pulsado conserva el foco aunque llegue al límite.
  $('anterior').setAttribute('aria-disabled', String(r.pagina <= 1));
  $('siguiente').setAttribute('aria-disabled', String(r.pagina >= r.paginas));
  const bb = $('borrar-filtro');
  bb.hidden = !(f.q || f.estado) || r.total === 0;
  bb.textContent = `Borrar las ${r.total} solicitudes de este filtro`;
}

function fallo(e) {
  aviso(e.message, 'error');
}

$('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('login-msg').textContent = '';
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: $('clave').value }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo entrar.');
    token = j.token;
    sessionStorage.setItem('token', token);
    $('clave').value = '';
    mostrar(true);
    await cargar();
  } catch (err) {
    $('login-msg').textContent = err.message;
    $('clave').focus();
  }
});

$('filtros').addEventListener('submit', (e) => {
  e.preventDefault();
  pagina = 1;
  cargar().catch(fallo);
});
$('anterior').addEventListener('click', () => {
  if ($('anterior').getAttribute('aria-disabled') === 'true') return;
  pagina--;
  cargar().catch(fallo);
});
$('siguiente').addEventListener('click', () => {
  if ($('siguiente').getAttribute('aria-disabled') === 'true') return;
  pagina++;
  cargar().catch(fallo);
});
$('recargar').addEventListener('click', () => cargar().catch(fallo));
$('salir').addEventListener('click', cerrarSesion);
$('borrar-filtro').addEventListener('click', async () => {
  const f = filtroActual();
  if (!confirm(`¿Borrar las ${ultimo.total} solicitudes que coinciden con el filtro? No se puede deshacer.`)) return;
  try {
    const r = await pedir('/api/admin/borrar-filtradas', { method: 'POST', body: JSON.stringify(f) });
    pagina = 1;
    await cargar();
    aviso(`Se borraron ${r.borradas} solicitudes.`, 'ok');
    enfocarTarjeta(null);
  } catch (e) {
    fallo(e);
  }
});

if (token) {
  mostrar(true);
  cargar().catch((e) => {
    $('login-msg').textContent = e.message;
  });
} else {
  mostrar(false);
}
