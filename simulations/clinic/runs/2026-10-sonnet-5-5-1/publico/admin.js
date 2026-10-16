const $ = (id) => document.getElementById(id);
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
let token = sessionStorage.getItem('token');
let nombres = {};

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
  return dd;
}

function boton(texto, clase, onclick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'boton boton-chico ' + clase;
  b.textContent = texto;
  b.addEventListener('click', onclick);
  return b;
}

async function cambiar(cita, estado) {
  $('panel-msg').textContent = '';
  try {
    await pedir('/api/admin/citas/' + encodeURIComponent(cita.id), {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
    await cargar();
  } catch (e) {
    $('panel-msg').textContent = e.message;
  }
}

function tarjeta(c) {
  const art = document.createElement('article');
  art.className = 'solicitud';

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
  if (c.estado !== 'cancelada') acc.append(boton('Cancelar', 'boton-peligro', () => cambiar(c, 'cancelada')));
  if (c.estado !== 'pendiente') acc.append(boton('Volver a pendiente', 'boton-borde', () => cambiar(c, 'pendiente')));

  art.append(cab, dl, acc);
  return art;
}

async function cargar() {
  const { citas, tratamientos } = await pedir('/api/admin/citas');
  nombres = tratamientos;
  const lista = $('lista');
  lista.replaceChildren();
  if (!citas.length) {
    const p = document.createElement('p');
    p.className = 'vacio';
    p.textContent = 'Todavía no hay solicitudes.';
    lista.append(p);
    return;
  }
  lista.append(...citas.map(tarjeta));
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
  }
});

$('recargar').addEventListener('click', () =>
  cargar().catch((e) => ($('panel-msg').textContent = e.message)));
$('salir').addEventListener('click', cerrarSesion);

if (token) {
  mostrar(true);
  cargar().catch((e) => {
    $('login-msg').textContent = e.message;
  });
} else {
  mostrar(false);
}
