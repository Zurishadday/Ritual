const acceso = document.getElementById('acceso');
const panel = document.getElementById('panel');
const lista = document.getElementById('lista');
const errorAcceso = document.getElementById('acceso-error');

let solicitudes = [];
let tratamientos = {};
let filtro = 'todas';

function mostrar(sesionActiva) {
  acceso.hidden = sesionActiva;
  panel.hidden = !sesionActiva;
}

async function cargar() {
  const r = await fetch('/api/solicitudes');
  if (r.status === 401) return mostrar(false);
  const d = await r.json();
  solicitudes = d.solicitudes;
  tratamientos = d.tratamientos;
  mostrar(true);
  pintar();
}

function fechaBonita(iso, conHora) {
  const f = new Date(conHora ? iso : iso + 'T00:00:00');
  return f.toLocaleString('es', conHora
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

function pintar() {
  lista.replaceChildren();
  const visibles = solicitudes.filter((s) => filtro === 'todas' || s.estado === filtro);
  if (!visibles.length) {
    const v = document.createElement('p');
    v.className = 'vacio';
    v.textContent = 'No hay solicitudes.';
    lista.append(v);
    return;
  }
  for (const s of visibles) {
    const art = document.createElement('article');
    art.className = 'solicitud ' + s.estado;

    const h = document.createElement('h3');
    h.textContent = s.nombre + ' ';
    const et = document.createElement('span');
    et.className = 'etiqueta';
    et.textContent = s.estado;
    h.append(et);

    art.append(
      h,
      linea('Tratamiento', tratamientos[s.tratamiento] || s.tratamiento),
      linea('Cita pedida', `${fechaBonita(s.fecha)}, ${s.hora}`),
      linea('Teléfono', s.telefono, 'tel:' + s.telefono.replace(/[^\d+]/g, '')),
      linea('Correo', s.correo, 'mailto:' + s.correo),
    );
    if (s.comentario) art.append(linea('Comentario', s.comentario));
    art.append(linea('Recibida', fechaBonita(s.creada, true)));

    const acc = document.createElement('div');
    acc.className = 'acciones';
    const crear = (texto, estado, clase) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'boton ' + clase;
      b.textContent = texto;
      b.addEventListener('click', () => cambiarEstado(s.id, estado, b));
      acc.append(b);
    };
    if (s.estado !== 'confirmada') crear('Confirmar', 'confirmada', '');
    if (s.estado !== 'cancelada') crear('Cancelar', 'cancelada', 'boton-peligro');
    if (s.estado !== 'pendiente') crear('Volver a pendiente', 'pendiente', 'boton-sec');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'boton boton-sec';
    del.textContent = 'Eliminar';
    del.addEventListener('click', () => eliminar(s, del));
    acc.append(del);
    art.append(acc);
    lista.append(art);
  }
}

async function cambiarEstado(id, estado, boton) {
  boton.disabled = true;
  try {
    const r = await fetch('/api/solicitudes/' + encodeURIComponent(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (r.status === 401) return mostrar(false);
    if (!r.ok) throw new Error();
    const { solicitud } = await r.json();
    solicitudes = solicitudes.map((x) => (x.id === id ? solicitud : x));
    pintar();
  } catch {
    boton.disabled = false;
    alert('No se pudo cambiar el estado. Inténtalo de nuevo.');
  }
}

async function eliminar(s, boton) {
  if (!confirm('¿Eliminar la solicitud de ' + s.nombre + '? No se puede deshacer.')) return;
  boton.disabled = true;
  try {
    const r = await fetch('/api/solicitudes/' + encodeURIComponent(s.id), { method: 'DELETE' });
    if (r.status === 401) return mostrar(false);
    if (!r.ok) throw new Error();
    solicitudes = solicitudes.filter((x) => x.id !== s.id);
    pintar();
  } catch {
    boton.disabled = false;
    alert('No se pudo eliminar. Inténtalo de nuevo.');
  }
}

acceso.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorAcceso.textContent = '';
  const r = await fetch('/api/entrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave: acceso.elements.clave.value }),
  });
  if (r.ok) {
    acceso.reset();
    cargar();
  } else {
    const d = await r.json().catch(() => ({}));
    errorAcceso.textContent = d.error || 'No se pudo entrar.';
  }
});

document.getElementById('salir').addEventListener('click', async () => {
  await fetch('/api/salir', { method: 'POST' });
  solicitudes = [];
  mostrar(false);
});
document.getElementById('actualizar').addEventListener('click', cargar);
document.getElementById('filtros').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-filtro]');
  if (!b) return;
  filtro = b.dataset.filtro;
  document.querySelectorAll('#filtros button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  pintar();
});

cargar();
