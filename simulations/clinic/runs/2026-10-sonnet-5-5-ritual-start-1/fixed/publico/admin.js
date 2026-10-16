const $ = (id) => document.getElementById(id);
const vistaLogin = $('vista-login');
const vistaPanel = $('vista-panel');
const lista = $('lista');
const estadoGlobal = $('estado-global');
const NOMBRE_ESTADO = { pendiente: 'pendiente', confirmada: 'confirmada', cancelada: 'cancelada' };
let tratamientos = {};

async function api(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fisio', ...(opciones.headers || {}) },
  });
  let datos = {};
  try {
    datos = await r.json();
  } catch {}
  if (r.status === 401 && !url.endsWith('/entrar')) {
    mostrarLogin('Tu sesión terminó. Entra de nuevo.');
    throw new Error('sesion');
  }
  if (!r.ok) throw Object.assign(new Error(datos.error || 'Error inesperado.'), { estado: r.status });
  return datos;
}

function aviso(texto) {
  estadoGlobal.textContent = texto;
}

function mostrarLogin(mensaje = '') {
  vistaPanel.hidden = true;
  vistaLogin.hidden = false;
  $('error-login').textContent = mensaje;
  $('clave').value = '';
  $('clave').focus();
}

function mostrarPanel() {
  vistaLogin.hidden = true;
  vistaPanel.hidden = false;
}

function formatoFecha(f) {
  const [a, m, d] = f.split('-').map(Number);
  const t = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(a, m - 1, d));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatoRecibida(iso) {
  return 'Recibida el ' + new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function pintarEstado(li, estado) {
  li.dataset.estado = estado;
  const ins = li.querySelector('.insignia');
  ins.textContent = NOMBRE_ESTADO[estado];
  ins.className = 'insignia ' + estado;
  for (const b of li.querySelectorAll('[data-estado-btn]')) b.setAttribute('aria-pressed', String(b.dataset.estadoBtn === estado));
}

function tarjeta(c) {
  const li = document.createElement('li');
  li.className = 'cita';
  li.dataset.id = c.id;

  // Todo el contenido llega del público: se inserta siempre con textContent
  const h = document.createElement('h2');
  h.textContent = c.nombre;
  const ins = document.createElement('span');
  ins.className = 'insignia';
  h.append(ins);

  const trat = document.createElement('p');
  const fuerte = document.createElement('strong');
  fuerte.textContent = `${tratamientos[c.tratamiento] || c.tratamiento}`;
  trat.append(fuerte);

  const cuando = document.createElement('p');
  cuando.textContent = `${formatoFecha(c.fecha)}, ${c.hora}`;

  const contacto = document.createElement('p');
  const tel = document.createElement('a');
  tel.href = 'tel:' + c.telefono.replace(/[^\d+]/g, '');
  tel.textContent = c.telefono;
  const mail = document.createElement('a');
  mail.href = 'mailto:' + c.correo;
  mail.textContent = c.correo;
  contacto.append(tel, ' · ', mail);

  li.append(h, trat, cuando, contacto);
  if (c.comentario) {
    const com = document.createElement('p');
    com.className = 'comentario';
    com.textContent = c.comentario;
    li.append(com);
  }
  const rec = document.createElement('p');
  rec.className = 'recibida';
  rec.textContent = formatoRecibida(c.creada);

  const acc = document.createElement('div');
  acc.className = 'acciones';
  for (const [estado, texto] of [['confirmada', 'Confirmar'], ['cancelada', 'Cancelar'], ['pendiente', 'Dejar pendiente']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'boton boton-claro';
    b.dataset.estadoBtn = estado;
    b.textContent = texto;
    b.addEventListener('click', () => cambiar(c, li, estado));
    acc.append(b);
  }
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'boton boton-peligro';
  del.textContent = 'Eliminar';
  del.addEventListener('click', () => eliminar(c, li));
  acc.append(del);

  li.append(rec, acc);
  pintarEstado(li, c.estado);
  return li;
}

async function cargar(mensaje) {
  const estado = $('filtro').value;
  const d = await api('/api/admin/citas' + (estado ? `?estado=${estado}` : ''));
  tratamientos = d.tratamientos;
  lista.textContent = '';
  if (!d.citas.length) {
    const li = document.createElement('li');
    li.className = 'vacio';
    li.textContent = estado ? 'No hay solicitudes con ese estado.' : 'Todavía no hay solicitudes.';
    lista.append(li);
  }
  for (const c of d.citas) lista.append(tarjeta(c));
  const resumen = `${d.cuenta.pendiente || 0} pendientes · ${d.cuenta.confirmada || 0} confirmadas · ${d.cuenta.cancelada || 0} canceladas. Las más nuevas van primero.`;
  $('contador').textContent = d.total > d.mostradas ? `${resumen} Mostrando las ${d.mostradas} más nuevas de ${d.total}.` : resumen;
  document.title = (d.cuenta.pendiente ? `(${d.cuenta.pendiente}) ` : '') + 'Solicitudes de cita · Fisio Andares';
  if (mensaje) aviso(mensaje);
}

async function cambiar(c, li, estado) {
  try {
    await api('/api/admin/citas/' + encodeURIComponent(c.id), { method: 'PATCH', body: JSON.stringify({ estado }) });
    c.estado = estado;
    pintarEstado(li, estado);
    aviso(`La cita de ${c.nombre} quedó ${NOMBRE_ESTADO[estado]}.`);
    refrescarContador();
  } catch (e) {
    if (e.message !== 'sesion') aviso('No se pudo guardar: ' + e.message);
  }
}

async function refrescarContador() {
  const filas = [...lista.querySelectorAll('.cita')];
  if (filas.length && !$('filtro').value) {
    const n = (e) => filas.filter((f) => f.dataset.estado === e).length;
    document.title = (n('pendiente') ? `(${n('pendiente')}) ` : '') + 'Solicitudes de cita · Fisio Andares';
  }
}

async function eliminar(c, li) {
  if (!confirm(`¿Eliminar para siempre la solicitud de ${c.nombre}? No se puede deshacer.`)) return;
  try {
    await api('/api/admin/citas/' + encodeURIComponent(c.id), { method: 'DELETE' });
    const sig = li.nextElementSibling?.querySelector('button') || li.previousElementSibling?.querySelector('button');
    li.remove();
    aviso(`Se eliminó la solicitud de ${c.nombre}.`);
    (sig || estadoGlobal).focus();
    if (!lista.children.length) cargar();
  } catch (e) {
    if (e.message !== 'sesion') aviso('No se pudo eliminar: ' + e.message);
  }
}

$('form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const clave = $('clave').value;
  if (!clave) {
    $('error-login').textContent = 'Escribe la contraseña.';
    $('clave').focus();
    return;
  }
  $('btn-login').setAttribute('aria-busy', 'true');
  try {
    await api('/api/admin/entrar', { method: 'POST', body: JSON.stringify({ clave }) });
  } catch (e) {
    $('error-login').textContent = e.message;
    $('clave').select();
    $('clave').focus();
    $('btn-login').removeAttribute('aria-busy');
    return;
  }
  // Ya entró: cualquier error al pintar se muestra en el panel, no en el acceso oculto
  $('error-login').textContent = '';
  mostrarPanel();
  try {
    await cargar();
  } catch (e) {
    if (e.message !== 'sesion') aviso('No se pudieron mostrar las solicitudes: ' + e.message);
  }
  estadoGlobal.focus();
  $('btn-login').removeAttribute('aria-busy');
});

$('filtro').addEventListener('change', () => cargar().catch(() => {}));
$('btn-recargar').addEventListener('click', () => cargar('Lista actualizada.').catch(() => {}));
$('btn-salir').addEventListener('click', async () => {
  await api('/api/admin/salir', { method: 'POST', body: '{}' }).catch(() => {});
  mostrarLogin('Saliste correctamente.');
});
$('btn-borrar-canceladas').addEventListener('click', async () => {
  if (!confirm('¿Borrar para siempre TODAS las solicitudes canceladas? No se puede deshacer.')) return;
  try {
    const d = await api('/api/admin/citas?estado=cancelada', { method: 'DELETE' });
    await cargar(d.borradas ? `Se borraron ${d.borradas} solicitudes canceladas.` : 'No había solicitudes canceladas.');
  } catch (e) {
    if (e.message !== 'sesion') aviso('No se pudo borrar: ' + e.message);
  }
});

// Al abrir: si ya hay sesión se muestra el panel, si no, el acceso
cargar()
  .then(mostrarPanel)
  .catch((e) => {
    if (e instanceof TypeError && e.estado === undefined && e.message !== 'Failed to fetch') {
      mostrarPanel();
      return aviso('No se pudieron mostrar las solicitudes: ' + e.message);
    }
    if (e.message !== 'sesion') mostrarLogin('No se pudo conectar con el servidor.');
  });
