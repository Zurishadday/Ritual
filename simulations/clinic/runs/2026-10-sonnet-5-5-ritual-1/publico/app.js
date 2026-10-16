// Formulario de cita. Sin este archivo el formulario sigue funcionando (envío normal + validación del servidor).
const form = document.getElementById('formulario');
const resumen = document.getElementById('resumen');
const estado = document.getElementById('estado');
const exito = document.getElementById('exito');
const boton = document.getElementById('enviar');
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'dia', 'hora'];
const TEL = '555 123 4567';

form.noValidate = true; // validamos nosotros para dar mensajes claros (sin JS vale la validación del navegador)

function pad(n) { return String(n).padStart(2, '0'); }
function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
form.dia.min = hoy();

function mensajeCampo(nombre) {
  const c = form[nombre];
  const v = c.value.trim();
  if (!v) return { nombre: 'Escribe tu nombre.', telefono: 'Escribe tu teléfono.', correo: 'Escribe tu correo.', tratamiento: 'Elige un tratamiento.', dia: 'Elige un día.', hora: 'Elige una hora.' }[nombre];
  if (nombre === 'nombre' && v.length < 2) return 'Escribe tu nombre.';
  if (nombre === 'telefono') {
    const n = v.replace(/\D/g, '').length;
    if (!/^[\d\s()+\-.]+$/.test(v) || n < 8 || n > 15) return 'Escribe un teléfono válido, con al menos 8 dígitos.';
  }
  if (nombre === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (nombre === 'dia') {
    const [a, m, d] = v.split('-').map(Number);
    const dow = new Date(a, m - 1, d).getDay();
    if (dow === 0 || dow === 6) return 'Atendemos de lunes a viernes. Elige otro día.';
    if (v < hoy()) return 'Ese día ya pasó. Elige uno a partir de hoy.';
  }
  if (nombre === 'hora' && form.dia.value === hoy()) {
    const n = new Date();
    if (v <= `${pad(n.getHours())}:${pad(n.getMinutes())}`) return 'Esa hora ya pasó. Elige una posterior o escoge otro día.';
  }
  return '';
}

function mostrarErrores(errores) {
  const nombres = CAMPOS.filter((c) => errores[c]);
  for (const c of CAMPOS) {
    document.getElementById('e-' + c).textContent = errores[c] || '';
    if (errores[c]) form[c].setAttribute('aria-invalid', 'true'); else form[c].removeAttribute('aria-invalid');
  }
  if (!nombres.length) { resumen.hidden = true; resumen.replaceChildren(); return; }
  const t = document.createElement('p');
  t.textContent = nombres.length === 1 ? 'Hay 1 dato por corregir:' : `Hay ${nombres.length} datos por corregir:`;
  const ul = document.createElement('ul');
  for (const c of nombres) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + c;
    a.textContent = errores[c];
    a.addEventListener('click', (e) => { e.preventDefault(); form[c].focus(); });
    li.append(a);
    ul.append(li);
  }
  resumen.replaceChildren(t, ul);
  resumen.hidden = false;
  resumen.focus();
}

function aviso(texto, mal) {
  estado.textContent = texto;
  estado.classList.toggle('mal', !!mal);
}

let enviando = false;
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return; // doble clic
  const errores = {};
  for (const c of CAMPOS) { const m = mensajeCampo(c); if (m) errores[c] = m; }
  mostrarErrores(errores);
  if (Object.keys(errores).length) { aviso(''); return; }

  enviando = true;
  boton.setAttribute('aria-disabled', 'true'); // no usamos disabled: así el foco no se pierde
  boton.textContent = 'Enviando…';
  aviso('Enviando tu solicitud…');
  try {
    const datos = Object.fromEntries(new FormData(form));
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (r.ok) {
      form.reset();
      form.dia.min = hoy();
      mostrarErrores({});
      aviso('');
      form.hidden = true;
      exito.hidden = false;
      exito.scrollIntoView({ block: 'center' });
      exito.focus();
    } else if (cuerpo.errores) {
      mostrarErrores(cuerpo.errores);
      aviso('');
    } else {
      aviso(cuerpo.error || `No pudimos enviar tu solicitud. Llámanos al ${TEL}.`, true);
      boton.focus();
    }
  } catch {
    aviso(`No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo, o llámanos al ${TEL}.`, true);
    boton.focus();
  } finally {
    enviando = false;
    boton.removeAttribute('aria-disabled');
    boton.textContent = 'Enviar solicitud';
  }
});

for (const c of CAMPOS) {
  form[c].addEventListener('change', () => {
    if (form[c].getAttribute('aria-invalid') === 'true') {
      const m = mensajeCampo(c);
      document.getElementById('e-' + c).textContent = m;
      if (!m) form[c].removeAttribute('aria-invalid');
    }
  });
}

document.getElementById('otra').addEventListener('click', () => {
  exito.hidden = true;
  form.hidden = false;
  form.nombre.focus();
});
