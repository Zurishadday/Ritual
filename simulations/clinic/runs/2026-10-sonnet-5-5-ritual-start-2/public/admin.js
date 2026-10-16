const $ = (id) => document.getElementById(id);
let citas = [];

const post = (url, cuerpo) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo || {}),
});

function mostrar(vista) {
  $('entrada').hidden = vista !== 'entrada';
  $('lista').hidden = vista !== 'lista';
}

async function cargar() {
  let r;
  try { r = await fetch('/api/admin/citas'); }
  catch { $('conteo').textContent = 'No hay conexión con el servidor.'; mostrar('lista'); return; }
  if (r.status === 401) { mostrar('entrada'); return false; }
  const d = await r.json();
  citas = d.citas;
  $('alerta-datos').hidden = !d.lineasDanadas;
  $('alerta-datos').textContent = `Atención: ${d.lineasDanadas} registro(s) del archivo de datos están dañados y no se pueden mostrar. Revisa datos/citas.jsonl.`;
  mostrar('lista');
  pintar();
  return true;
}

const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };

function pintar() {
  const filtro = $('filtro').value;
  const visibles = citas.filter((c) => filtro === 'todas' || (filtro === 'activas' ? c.estado !== 'cancelada' : c.estado === filtro));
  const pendientes = citas.filter((c) => c.estado === 'pendiente').length;
  $('conteo').textContent = `${visibles.length} solicitud(es) mostradas · ${pendientes} pendiente(s) por atender · ${citas.length} en total`;
  const contenedor = $('solicitudes');
  contenedor.replaceChildren();
  if (!visibles.length) {
    const p = document.createElement('p');
    p.textContent = 'No hay solicitudes con este filtro.';
    contenedor.append(p);
    return;
  }
  for (const c of visibles) contenedor.append(tarjeta(c));
}

function linea(texto, enlace) {
  const p = document.createElement('p');
  if (enlace) {
    const a = document.createElement('a');
    a.href = enlace; a.textContent = texto;
    p.append(a);
  } else p.textContent = texto;
  return p;
}

function tarjeta(c) {
  const art = document.createElement('article');
  art.className = 'solicitud';
  art.dataset.id = c.id;
  const h = document.createElement('h2');
  h.append(document.createTextNode(c.nombre + ' '));
  const et = document.createElement('span');
  et.className = 'etiqueta estado-' + c.estado;
  et.textContent = ETIQUETA[c.estado];
  h.append(et);
  const dia = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const recibida = new Date(c.creada).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  art.append(
    h,
    linea(`${c.tratamientoNombre} · ${dia} a las ${c.hora}`),
    linea('Tel: ' + c.telefono, 'tel:' + c.telefono.replace(/[^\d+]/g, '')),
    linea(c.correo, 'mailto:' + c.correo),
  );
  if (c.comentario) art.append(linea('Comentario: ' + c.comentario));
  art.append(linea('Recibida: ' + recibida));
  const acc = document.createElement('div');
  acc.className = 'acciones';
  for (const [estado, texto] of [['confirmada', 'Confirmar'], ['cancelada', 'Cancelar'], ['pendiente', 'Dejar pendiente']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'boton boton-claro';
    b.textContent = texto;
    b.setAttribute('aria-pressed', String(c.estado === estado));
    b.setAttribute('aria-label', `${texto} la solicitud de ${c.nombre}`);
    b.addEventListener('click', () => cambiar(c, estado, b));
    acc.append(b);
  }
  art.append(acc);
  return art;
}

async function cambiar(c, estado, boton) {
  if (c.estado === estado) return;
  const anuncio = $('anuncio');
  try {
    const r = await post('/api/admin/estado', { id: c.id, estado });
    if (r.status === 401) return mostrar('entrada');
    const d = await r.json();
    if (!r.ok) throw new Error(d.mensaje);
    c.estado = estado;
    anuncio.className = 'aviso aviso-ok';
    anuncio.textContent = `${c.nombre}: marcada como ${ETIQUETA[estado].toLowerCase()}.`;
  } catch (e) {
    anuncio.className = 'aviso aviso-error';
    anuncio.textContent = `No se pudo cambiar el estado de ${c.nombre}. Inténtalo de nuevo.`;
  }
  anuncio.hidden = false;
  pintar();
  // La tarjeta puede desaparecer por el filtro; el foco vuelve al mismo botón si existe, o al aviso.
  const nuevo = document.querySelector(`[data-id="${c.id}"] button[aria-label="${boton.getAttribute('aria-label')}"]`);
  if (nuevo) nuevo.focus(); else { anuncio.tabIndex = -1; anuncio.focus(); }
}

$('form-login').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = $('error-login');
  err.hidden = true;
  try {
    const r = await post('/api/admin/login', { clave: $('clave').value });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { $('clave').value = ''; await cargar(); $('conteo').tabIndex = -1; $('conteo').focus(); return; }
    err.textContent = d.mensaje || 'No se pudo entrar.';
  } catch { err.textContent = 'No hay conexión con el servidor.'; }
  err.hidden = false;
  err.focus();
});

$('filtro').addEventListener('change', pintar);
$('actualizar').addEventListener('click', async () => { await cargar(); $('anuncio').hidden = true; });
$('salir').addEventListener('click', async () => { await post('/api/admin/salir'); citas = []; mostrar('entrada'); $('clave').focus(); });

cargar().then((ok) => { if (ok === false) mostrar('entrada'); });
