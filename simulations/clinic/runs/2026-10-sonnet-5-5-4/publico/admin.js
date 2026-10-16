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

  const acc = el('div', 'acciones');
  for (const [estado, texto, clase] of [['confirmada', 'Confirmar', 'ok'], ['cancelada', 'Cancelar', 'no'], ['pendiente', 'Volver a pendiente', '']]) {
    const b = el('button', clase, texto);
    b.disabled = s.estado === estado;
    b.addEventListener('click', () => cambiar(s.id, estado, b));
    acc.append(b);
  }
  t.append(acc);
  return t;
}

async function cambiar(id, estado, boton) {
  boton.disabled = true;
  const r = await fetch(`/api/admin/solicitudes/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }),
  });
  if (r.status === 401) return vista(false);
  if (!r.ok) { alert('No se pudo actualizar.'); return cargar(); }
  const nueva = await r.json();
  datos = datos.map(x => (x.id === id ? nueva : x));
  pintar();
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
