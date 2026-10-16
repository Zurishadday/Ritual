const form = document.getElementById('form-cita');
const aviso = document.getElementById('resultado');
const boton = document.getElementById('enviar');
const campos = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora', 'comentario'];
let enviando = false;

// Fecha mínima: hoy (hora local)
const hoy = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
form.fecha.min = iso(hoy);
const tope = new Date(hoy); tope.setMonth(tope.getMonth() + 6);
form.fecha.max = iso(tope);
const horaAhora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Los botones de cada tratamiento preseleccionan la opción
document.querySelectorAll('[data-tratamiento]').forEach((a) =>
  a.addEventListener('click', () => { form.tratamiento.value = a.dataset.tratamiento; }));

function validarCliente() {
  const e = {};
  const v = (n) => form[n].value.trim();
  if (v('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
  const dig = v('telefono').replace(/\D/g, '');
  if (!/^[\d\s+()-]+$/.test(v('telefono')) || dig.length < 8 || dig.length > 15) e.telefono = 'Escribe un teléfono válido, por ejemplo 55 1234 5678.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('correo'))) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (!v('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
  if (!v('fecha')) e.fecha = 'Elige una fecha.';
  else {
    const [y, m, d] = v('fecha').split('-').map(Number);
    const dia = new Date(y, m - 1, d).getDay();
    if (v('fecha') < iso(hoy)) e.fecha = 'Elige una fecha de hoy en adelante.';
    else if (v('fecha') > iso(tope)) e.fecha = 'Solo agendamos con hasta 6 meses de anticipación.';
    else if (dia === 0 || dia === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  }
  if (!v('hora')) e.hora = 'Elige una hora entre las 9:00 y las 17:00.';
  else if (!e.fecha && v('fecha') === iso(new Date()) && v('hora') <= horaAhora()) e.hora = 'Esa hora ya pasó. Elige una hora más tarde o escoge otro día.';
  return e;
}

function mostrarErrores(e) {
  let primero = null;
  for (const n of campos) {
    const msg = e[n] || '';
    document.getElementById('e-' + n).textContent = msg;
    if (msg) { form[n].setAttribute('aria-invalid', 'true'); primero = primero || form[n]; }
    else form[n].removeAttribute('aria-invalid');
  }
  return primero;
}

function decir(texto, mal) {
  aviso.textContent = texto;
  aviso.classList.toggle('mal', !!mal);
  aviso.hidden = false;
  aviso.focus();
  aviso.scrollIntoView({ block: 'center' });
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return;
  aviso.hidden = true;
  const errores = validarCliente();
  const primero = mostrarErrores(errores);
  if (primero) { primero.focus(); return; }

  enviando = true;
  boton.setAttribute('aria-disabled', 'true');
  boton.textContent = 'Enviando…';
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
      mostrarErrores({});
      decir('¡Listo! Recibimos tu solicitud. Te contactaremos pronto para confirmar tu cita.');
    } else if (cuerpo.errores) {
      const p = mostrarErrores(cuerpo.errores);
      decir('Revisa los campos marcados en rojo.', true);
      if (p) p.focus();
    } else {
      decir(cuerpo.error || 'No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos.', true);
    }
  } catch {
    decir('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo, o llámanos.', true);
  } finally {
    enviando = false;
    boton.removeAttribute('aria-disabled');
    boton.textContent = 'Enviar solicitud';
  }
});
