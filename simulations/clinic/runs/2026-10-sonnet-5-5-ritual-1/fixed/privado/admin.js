const lista = document.getElementById('lista');
const filtros = document.getElementById('filtros');
const aviso = document.getElementById('aviso');
const GRUPOS = [
  ['pendiente', 'Pendientes'],
  ['confirmada', 'Confirmadas'],
  ['cancelada', 'Canceladas'],
  ['todas', 'Todas'],
];
let citas = [];
let cuentas = { pendiente: 0, confirmada: 0, cancelada: 0, todas: 0 };
let hayMas = false;
const POR_PAGINA = 50;
let filtro = 'pendiente';

function decir(texto, mal) {
  aviso.textContent = texto;
  aviso.classList.toggle('mal', !!mal);
}

async function llamar(url, opciones) {
  const r = await fetch(url, { ...opciones, headers: { Accept: 'application/json', ...(opciones && opciones.headers) } });
  if (r.status === 401) { location.href = '/admin'; throw new Error('sesión'); }
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || 'Error del servidor');
  return cuerpo;
}

function fechaDia(s) {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function dato(dl, etiqueta, valor, enlace) {
  const dt = document.createElement('dt');
  dt.textContent = etiqueta;
  const dd = document.createElement('dd');
  if (enlace) {
    const a = document.createElement('a');
    a.href = enlace;
    a.textContent = valor;
    dd.append(a);
  } else dd.textContent = valor;
  dl.append(dt, dd);
}

function boton(c, estado, texto, clase) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = texto;
  b.dataset.id = c.id;
  b.dataset.estado = estado;
  if (clase) b.className = clase;
  if (estado !== 'eliminada') b.setAttribute('aria-pressed', String(c.estado === estado));
  b.addEventListener('click', () => cambiar(c, estado));
  return b;
}

function pintar(enfocar) {
  filtros.replaceChildren();
  for (const [clave, texto] of GRUPOS) {
    const n = cuentas[clave];
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${texto} (${n})`;
    b.setAttribute('aria-pressed', String(filtro === clave));
    b.addEventListener('click', () => { filtro = clave; cargar(); });
    filtros.append(b);
  }
  const visibles = citas;
  lista.replaceChildren();
  if (!visibles.length) {
    const p = document.createElement('p');
    p.textContent = cuentas.todas ? 'No hay solicitudes en esta vista.' : 'Aún no hay solicitudes.';
    lista.append(p);
  }
  for (const c of visibles) {
    const art = document.createElement('article');
    art.className = 'solicitud ' + c.estado;
    const h = document.createElement('h3');
    h.textContent = c.nombre;
    const ins = document.createElement('span');
    ins.className = 'insignia';
    ins.textContent = c.estado === 'pendiente' ? 'Pendiente' : c.estado === 'confirmada' ? 'Confirmada' : 'Cancelada';
    h.append(ins);
    const dl = document.createElement('dl');
    dato(dl, 'Tratamiento', c.tratamiento);
    dato(dl, 'Cuándo', `${fechaDia(c.dia)}, ${c.hora}`);
    dato(dl, 'Teléfono', c.telefono, 'tel:' + c.telefono.replace(/[^\d+]/g, ''));
    dato(dl, 'Correo', c.correo, 'mailto:' + c.correo);
    if (c.comentario) dato(dl, 'Comentario', c.comentario);
    const rec = document.createElement('p');
    rec.className = 'nuevo';
    rec.textContent = 'Recibida: ' + new Date(c.creada).toLocaleString('es');
    const acc = document.createElement('div');
    acc.className = 'acciones';
    acc.append(boton(c, 'confirmada', 'Confirmar'), boton(c, 'cancelada', 'Cancelar'));
    if (c.estado !== 'pendiente') acc.append(boton(c, 'pendiente', 'Volver a pendiente'));
    acc.append(boton(c, 'eliminada', 'Eliminar', 'peligro'));
    art.append(h, dl, rec, acc);
    lista.append(art);
  }
  if (hayMas) {
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'boton secundario';
    m.textContent = 'Ver más solicitudes';
    m.addEventListener('click', verMas);
    lista.append(m);
  }
  if (['pendiente', 'confirmada', 'cancelada'].includes(filtro) && cuentas[filtro]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'boton secundario peligro-masivo';
    b.textContent = `Eliminar las ${cuentas[filtro]} de esta vista`;
    b.addEventListener('click', eliminarVista);
    lista.append(b);
  }
  if (enfocar) {
    const b = lista.querySelector(`button[data-id="${enfocar.id}"][data-estado="${enfocar.estado}"]`);
    (b || aviso).focus();
  }
}

async function cambiar(c, estado) {
  if (estado === 'eliminada' && !confirm(`¿Eliminar la solicitud de ${c.nombre}? No se podrá recuperar desde aquí.`)) return;
  decir('Guardando…');
  try {
    await llamar('/api/admin/citas/' + c.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    await cargar(false);
    decir(`Solicitud de ${c.nombre}: ${estado}.`);
    pintar({ id: c.id, estado });
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudo guardar el cambio: ${e.message}`, true);
  }
}

async function eliminarVista() {
  if (!confirm(`¿Eliminar las ${cuentas[filtro]} solicitudes de esta vista? No se podrá deshacer desde aquí.`)) return;
  decir('Eliminando…');
  try {
    const r = await llamar('/api/admin/citas/eliminar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: filtro }),
    });
    await cargar(false);
    pintar();
    decir(`Se eliminaron ${r.eliminadas} solicitudes.`);
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudo eliminar: ${e.message}`, true);
  }
}

async function traer(desde) {
  const q = new URLSearchParams({ estado: filtro, desde: String(desde), limite: String(POR_PAGINA) });
  return llamar('/api/admin/citas?' + q);
}

async function verMas() {
  try {
    const r = await traer(citas.length);
    citas = citas.concat(r.citas);
    hayMas = r.hayMas;
    cuentas = r.cuentas;
    pintar();
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudieron cargar más: ${e.message}`, true);
  }
}

async function cargar(pintarYa = true) {
  if (pintarYa) decir('Cargando solicitudes…');
  try {
    const r = await traer(0);
    citas = r.citas;
    hayMas = r.hayMas;
    cuentas = r.cuentas;
    if (pintarYa) { decir(''); pintar(); }
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudieron cargar las solicitudes: ${e.message}`, true);
  }
}
cargar();
