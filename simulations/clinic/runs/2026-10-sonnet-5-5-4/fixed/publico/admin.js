const $ = id => document.getElementById(id);
const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
const ESTADOS = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
let datos = [];

function vista(autenticado) {
  $('login').hidden = autenticado;
  $('panel').hidden = !autenticado;
  $('salir').hidden = !autenticado;
}

async function cargar() {
  const r = await fetch('/api/admin/solicitudes');
  if (r.status === 401) return vista(false);
  datos = await r.json();
  vista(true);
  avisar('');
  pintar();
}

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto; // textContent: los datos del público nunca se interpretan como HTML
  return e;
}

function pintar() {
  const filtro = $('filtro').value;
  const lista = datos.filter(s => !filtro || s.estado === filtro);
  $('vacio').hidden = lista.length > 0;
  $('lista').replaceChildren(...lista.map(tarjeta));
}

function tarjeta(s) {
  const t = el('article', `sol ${s.estado}`);
  const h = el('h3', '', s.nombre);
  h.append(el('span', 'insignia', ESTADOS[s.estado]));
  const [a, m, d] = s.fecha.split('-');
  t.append(
    h,
    el('p', 'cuando', `${NOMBRES[s.tratamiento] || s.tratamiento} · ${d}/${m}/${a} a las ${s.hora}`),
    el('p', '', `Tel: ${s.telefono} · ${s.correo}`),
  );
  if (s.comentario) t.append(el('p', '', `Comentario: ${s.comentario}`));
  t.append(el('p', 'recibida', `Recibida: ${new Date(s.creada).toLocaleString('es')}`));

  h.tabIndex = -1; // para poder devolverle el foco tras una acción
  t.dataset.id = s.id;
  const acc = el('div', 'acciones');
  for (const [estado, texto, clase] of [['confirmada', 'Confirmar', 'ok'], ['cancelada', 'Cancelar', 'no'], ['pendiente', 'Volver a pendiente', '']]) {
    const b = el('button', clase, texto);
    b.type = 'button';
    if (s.estado === estado) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => { if (s.estado !== estado) cambiar(s, estado); });
    acc.append(b);
  }
  const borrar = el('button', 'borrar', 'Eliminar');
  borrar.type = 'button';
  borrar.addEventListener('click', () => eliminar(s));
  acc.append(borrar);
  t.append(acc);
  return t;
}

let ocupado = false;
function avisar(texto, mal) {
  const a = $('aviso');
  a.textContent = texto;
  a.className = mal ? 'mal' : '';
  return a;
}
// Tras repintar, el foco vuelve a la tarjeta; si ya no se ve (por el filtro o porque se eliminó), al mensaje.
function enfocarTarjeta(id, aviso) {
  const h = [...$('lista').children].find(c => c.dataset.id === id)?.querySelector('h3');
  (h || aviso).focus();
}

async function llamar(id, opciones) {
  const r = await fetch(`/api/admin/solicitudes/${encodeURIComponent(id)}`, opciones);
  if (r.status === 401) { vista(false); return null; }
  return r;
}

async function cambiar(s, estado) {
  if (ocupado) return;
  ocupado = true;
  try {
    const r = await llamar(s.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    if (!r) return;
    if (!r.ok) { avisar(`No se pudo actualizar la solicitud de ${s.nombre}. Inténtalo de nuevo.`, true).focus(); return; }
    const nueva = await r.json();
    datos = datos.map(x => (x.id === s.id ? nueva : x));
    pintar();
    const filtro = $('filtro').value;
    const oculta = filtro && filtro !== estado;
    const aviso = avisar(`Solicitud de ${s.nombre}: ${ESTADOS[estado].toLowerCase()}.` +
      (oculta ? ` Ya no aparece en el filtro «${$('filtro').selectedOptions[0].textContent}»; cambia el filtro a «Todas» para verla.` : ''));
    enfocarTarjeta(s.id, aviso);
  } catch { avisar('No se pudo conectar con el servidor.', true).focus(); }
  finally { ocupado = false; }
}

async function eliminar(s) {
  if (ocupado || !confirm(`¿Eliminar para siempre la solicitud de ${s.nombre}?`)) return;
  ocupado = true;
  try {
    const r = await llamar(s.id, { method: 'DELETE' });
    if (!r) return;
    if (!r.ok && r.status !== 404) { avisar(`No se pudo eliminar la solicitud de ${s.nombre}.`, true).focus(); return; }
    datos = datos.filter(x => x.id !== s.id);
    pintar();
    avisar(`Solicitud de ${s.nombre} eliminada.`).focus();
  } catch { avisar('No se pudo conectar con el servidor.', true).focus(); }
  finally { ocupado = false; }
}

$('login').addEventListener('submit', async ev => {
  ev.preventDefault();
  $('login-error').textContent = '';
  const r = await fetch('/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave: ev.target.clave.value }),
  });
  if (r.ok) { ev.target.reset(); cargar(); }
  else $('login-error').textContent = (await r.json().catch(() => ({}))).error || 'Error al entrar.';
});

$('salir').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  datos = []; vista(false);
});
$('filtro').addEventListener('change', pintar);
$('recargar').addEventListener('click', cargar);

cargar();
