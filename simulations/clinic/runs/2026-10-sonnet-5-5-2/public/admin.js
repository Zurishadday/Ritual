const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
const login = document.getElementById('login');
const panel = document.getElementById('panel');
const errorLogin = document.getElementById('error-login');
const lista = document.getElementById('lista');
const resumen = document.getElementById('resumen');
let token = sessionStorage.getItem('token');

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

function tarjeta(c) {
  const art = document.createElement('article');
  art.className = 'cita';

  const cab = document.createElement('div');
  cab.className = 'cita-cab';
  const h = document.createElement('h2');
  h.textContent = c.nombre;
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
  for (const [estado, texto, clase] of [['confirmada', 'Confirmar', 'ok'], ['cancelada', 'Cancelar', 'no'], ['pendiente', 'Volver a pendiente', '']]) {
    if (c.estado === estado) continue;
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.textContent = texto;
    if (clase) bt.className = clase;
    bt.addEventListener('click', async () => {
      acc.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        await llamar('/api/citas/' + encodeURIComponent(c.id), { method: 'PATCH', body: JSON.stringify({ estado }) });
        await cargar();
      } catch (e) {
        if (e.message !== 'sesion') alert('No se pudo actualizar: ' + e.message);
        acc.querySelectorAll('button').forEach((x) => (x.disabled = false));
      }
    });
    acc.append(bt);
  }
  art.append(acc);
  return art;
}

async function cargar() {
  try {
    const citas = await llamar('/api/citas'); // el servidor las envía de más nueva a más antigua
    mostrarPanel(true);
    const pendientes = citas.filter((c) => c.estado === 'pendiente').length;
    resumen.textContent = citas.length ? `${citas.length} solicitudes, ${pendientes} pendientes.` : 'Todavía no hay solicitudes.';
    lista.replaceChildren(...citas.map(tarjeta));
  } catch (e) {
    if (e.message !== 'sesion') resumen.textContent = 'No se pudieron cargar las solicitudes: ' + e.message;
  }
}

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

document.getElementById('recargar').addEventListener('click', cargar);
document.getElementById('salir').addEventListener('click', cerrarSesion);
if (token) cargar();
