const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
const login = document.getElementById('login');
const panel = document.getElementById('panel');
const errorLogin = document.getElementById('error-login');
const lista = document.getElementById('lista');
const resumen = document.getElementById('resumen');
const filtros = document.getElementById('filtros');
const botonMas = document.getElementById('mas');
let token = sessionStorage.getItem('token');
let siguiente = 0; // cuántas solicitudes (con el filtro actual) ya están en pantalla
let conteo = null;
let version = 0; // descarta respuestas viejas si el filtro cambia mientras llegan

function mostrarPanel(si) {
  login.classList.toggle('oculto', si);
  panel.classList.toggle('oculto', !si);
}

function cerrarSesion() {
  token = null;
  sessionStorage.removeItem('token');
  mostrarPanel(false);
}

async function llamar(url, opciones = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) {
    cerrarSesion();
    throw new Error('sesion');
  }
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || 'Error');
  return cuerpo;
}

function fechaBonita(texto) {
  const [y, m, d] = texto.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function linea(etiqueta, valor, enlace) {
  const p = document.createElement('p');
  const b = document.createElement('strong');
  b.textContent = etiqueta + ': ';
  p.append(b);
  if (enlace) {
    const a = document.createElement('a');
    a.href = enlace;
    a.textContent = valor;
    p.append(a);
  } else {
    p.append(valor);
  }
  return p;
}

function textoResumen() {
  if (!conteo) return '';
  if (!conteo.total) return 'Todavía no hay solicitudes.';
  const base = `${conteo.total} solicitudes en total: ${conteo.pendiente} pendientes, ${conteo.confirmada} confirmadas, ${conteo.cancelada} canceladas.`;
  const mostradas = lista.children.length;
  const filtrado = filtros.elements.q.value.trim() || filtros.elements.estado.value;
  if (filtrado && !mostradas) return base + ' Ninguna coincide con el filtro.';
  return base + (filtrado ? ` Mostrando ${mostradas} que coinciden${botonMas.classList.contains('oculto') ? '' : ' (hay más)'}.` : '');
}

function actualizarResumen() {
  resumen.textContent = textoResumen();
}

function tarjeta(c) {
  const art = document.createElement('article');
  art.className = 'cita';
  art.dataset.id = c.id;

  const cab = document.createElement('div');
  cab.className = 'cita-cab';
  const h = document.createElement('h2');
  h.textContent = c.nombre;
  h.tabIndex = -1;
  const et = document.createElement('span');
  et.className = 'etiqueta ' + c.estado;
  et.textContent = c.estado;
  cab.append(h, et);

  const cuando = document.createElement('p');
  cuando.className = 'cuando';
  cuando.textContent = `${NOMBRES[c.tratamiento] || c.tratamiento} · ${fechaBonita(c.fecha)}, ${c.hora}`;

  const recibida = document.createElement('p');
  recibida.className = 'quien';
  recibida.textContent = 'Recibida: ' + new Date(c.creada).toLocaleString('es-MX');

  art.append(cab, cuando, linea('Teléfono', c.telefono, 'tel:' + c.telefono.replace(/[^\d+]/g, '')), linea('Correo', c.correo, 'mailto:' + c.correo));
  if (c.comentario) art.append(linea('Comentario', c.comentario));
  art.append(recibida);

  const acc = document.createElement('div');
  acc.className = 'acciones';
  const acciones = [['confirmada', 'Confirmar', 'ok'], ['cancelada', 'Cancelar', 'no'], ['pendiente', 'Volver a pendiente', '']];
  for (const [estado, texto, clase] of acciones) {
    if (c.estado === estado) continue;
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.textContent = texto;
    bt.setAttribute('aria-label', `${texto}: ${c.nombre}`);
    if (clase) bt.className = clase;
    bt.addEventListener('click', () => cambiarEstado(art, c, estado, acc));
    acc.append(bt);
  }
  const borrar = document.createElement('button');
  borrar.type = 'button';
  borrar.className = 'no';
  borrar.textContent = 'Eliminar';
  borrar.setAttribute('aria-label', `Eliminar: ${c.nombre}`);
  borrar.addEventListener('click', () => eliminar(art, c, acc));
  acc.append(borrar);
  art.append(acc);
  return art;
}

function ocupar(acc, si) {
  acc.querySelectorAll('button').forEach((x) => (si ? x.setAttribute('aria-disabled', 'true') : x.removeAttribute('aria-disabled')));
  acc.dataset.ocupado = si ? '1' : '';
}

async function cambiarEstado(art, c, estado, acc) {
  if (acc.dataset.ocupado) return;
  ocupar(acc, true);
  try {
    const r = await llamar('/api/citas/' + encodeURIComponent(c.id), { method: 'PATCH', body: JSON.stringify({ estado }) });
    conteo = r.conteo;
    const filtro = filtros.elements.estado.value;
    if (filtro && filtro !== r.cita.estado) {
      // Ya no pertenece a este filtro: sale de la lista y el foco pasa a la siguiente tarjeta.
      const vecina = art.nextElementSibling || art.previousElementSibling;
      art.remove();
      siguiente--;
      (vecina ? vecina.querySelector('h2') : filtros.elements.q).focus();
    } else {
      const nueva = tarjeta(r.cita);
      art.replaceWith(nueva);
      nueva.querySelector('h2').focus();
    }
    actualizarResumen();
  } catch (e) {
    ocupar(acc, false);
    if (e.message !== 'sesion') resumen.textContent = 'No se pudo actualizar: ' + e.message;
  }
}

async function eliminar(art, c, acc) {
  if (acc.dataset.ocupado) return;
  if (!confirm(`¿Eliminar la solicitud de ${c.nombre}? No se puede deshacer.`)) return;
  ocupar(acc, true);
  try {
    const r = await llamar('/api/citas/' + encodeURIComponent(c.id), { method: 'DELETE' });
    conteo = r.conteo;
    const vecina = art.nextElementSibling || art.previousElementSibling;
    art.remove();
    siguiente--;
    (vecina ? vecina.querySelector('h2') : filtros.elements.q).focus();
    actualizarResumen();
  } catch (e) {
    ocupar(acc, false);
    if (e.message !== 'sesion') resumen.textContent = 'No se pudo eliminar: ' + e.message;
  }
}

// reiniciar: vuelve a la primera página; si no, agrega la siguiente.
async function cargar(reiniciar = true) {
  const mia = reiniciar ? ++version : version;
  const desde = reiniciar ? 0 : siguiente;
  const params = new URLSearchParams({ desde });
  if (filtros.elements.q.value.trim()) params.set('q', filtros.elements.q.value.trim());
  if (filtros.elements.estado.value) params.set('estado', filtros.elements.estado.value);
  try {
    const r = await llamar('/api/citas?' + params); // más nuevas primero, de 50 en 50
    if (mia !== version) return;
    mostrarPanel(true);
    conteo = r.conteo;
    siguiente = r.siguiente;
    const tarjetas = r.citas.map(tarjeta);
    if (reiniciar) lista.replaceChildren(...tarjetas);
    else lista.append(...tarjetas);
    botonMas.classList.toggle('oculto', !r.hayMas);
    actualizarResumen();
    if (!reiniciar && tarjetas.length) tarjetas[0].querySelector('h2').focus();
  } catch (e) {
    if (e.message !== 'sesion') resumen.textContent = 'No se pudieron cargar las solicitudes: ' + e.message;
  }
}

let espera;
filtros.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(cargar, 300);
});
filtros.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(espera);
  cargar();
});
botonMas.addEventListener('click', () => cargar(false));

login.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorLogin.textContent = '';
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: login.elements.clave.value }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return (errorLogin.textContent = cuerpo.error || 'No se pudo entrar.');
    token = cuerpo.token;
    sessionStorage.setItem('token', token);
    login.reset();
    cargar();
  } catch {
    errorLogin.textContent = 'No hay conexión con el servidor.';
  }
});

document.getElementById('recargar').addEventListener('click', () => cargar());
document.getElementById('salir').addEventListener('click', cerrarSesion);
if (token) cargar();
