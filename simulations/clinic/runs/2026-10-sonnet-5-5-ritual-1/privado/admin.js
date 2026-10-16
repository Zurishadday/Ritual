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
    const n = clave === 'todas' ? citas.length : citas.filter((c) => c.estado === clave).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${texto} (${n})`;
    b.setAttribute('aria-pressed', String(filtro === clave));
    b.addEventListener('click', () => { filtro = clave; pintar(); });
    filtros.append(b);
  }
  const visibles = citas.filter((c) => filtro === 'todas' || c.estado === filtro);
  lista.replaceChildren();
  if (!visibles.length) {
    const p = document.createElement('p');
    p.textContent = citas.length ? 'No hay solicitudes en esta vista.' : 'Aún no hay solicitudes.';
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
    if (estado === 'eliminada') citas = citas.filter((x) => x.id !== c.id);
    else c.estado = estado;
    const nombres = { confirmada: 'confirmada', cancelada: 'cancelada', pendiente: 'pendiente', eliminada: 'eliminada' };
    decir(`Solicitud de ${c.nombre}: ${nombres[estado]}.`);
    pintar({ id: c.id, estado });
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudo guardar el cambio: ${e.message}`, true);
  }
}

async function cargar() {
  decir('Cargando solicitudes…');
  try {
    citas = (await llamar('/api/admin/citas')).citas;
    decir('');
    pintar();
  } catch (e) {
    if (e.message !== 'sesión') decir(`No se pudieron cargar las solicitudes: ${e.message}`, true);
  }
}
cargar();
