// Mejora el formulario: validación y envío sin recargar. Sin este archivo, el formulario sigue funcionando (envío normal).
const form = document.getElementById('form-cita');
const resumenErrores = document.getElementById('errores');
const resultado = document.getElementById('resultado');
const boton = document.getElementById('enviar');
const campos = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'];
const TELEFONO = '55 1234 5678';
let enviando = false;

// Día mínimo: mañana (hora local del navegador)
const fechaInput = document.getElementById('fecha');
const manana = new Date();
manana.setDate(manana.getDate() + 1);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
fechaInput.min = iso(manana);

const tratamientoUrl = new URLSearchParams(location.search).get('tratamiento');
if (tratamientoUrl) form.tratamiento.value = tratamientoUrl;

function limpiarErrores() {
  resumenErrores.hidden = true;
  resumenErrores.replaceChildren();
  for (const c of campos) {
    document.getElementById('error-' + c).hidden = true;
    form[c].removeAttribute('aria-invalid');
    form[c].removeAttribute('aria-describedby');
  }
}

function mostrarErrores(errores, titulo) {
  limpiarErrores();
  const p = document.createElement('p');
  p.textContent = titulo;
  resumenErrores.append(p);
  const ul = document.createElement('ul');
  let primero = null;
  for (const c of campos) {
    if (!errores[c]) continue;
    const msg = document.getElementById('error-' + c);
    msg.textContent = errores[c];
    msg.hidden = false;
    form[c].setAttribute('aria-invalid', 'true');
    form[c].setAttribute('aria-describedby', 'error-' + c);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + c;
    a.textContent = errores[c];
    li.append(a);
    ul.append(li);
    primero ||= form[c];
  }
  if (ul.children.length) resumenErrores.append(ul);
  resumenErrores.hidden = false;
  resumenErrores.focus();
  resumenErrores.scrollIntoView({ block: 'center' });
}

function validarLocal() {
  const e = {};
  const v = (c) => form[c].value.trim();
  if (v('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
  const digitos = v('telefono').replace(/\D/g, '');
  if (!/^[\d\s()+.-]+$/.test(v('telefono')) || digitos.length < 7 || digitos.length > 15) e.telefono = 'Escribe un teléfono válido, solo números (ej. 55 1234 5678).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('correo'))) e.correo = 'Escribe un correo válido (ej. nombre@correo.com).';
  if (!v('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
  if (!v('fecha')) e.fecha = 'Elige un día.';
  else if (v('fecha') < fechaInput.min) e.fecha = 'Elige un día a partir de mañana. Para hoy, llámanos.';
  else if ([0, 6].includes(new Date(v('fecha') + 'T12:00:00').getDay())) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  if (!v('hora')) e.hora = 'Elige una hora entre 9:00 y 17:00.';
  return e;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return; // doble clic: se ignora, el botón sigue habilitado para no perder el foco
  const locales = validarLocal();
  if (Object.keys(locales).length) return mostrarErrores(locales, 'Revisa estos campos:');

  enviando = true;
  boton.textContent = 'Enviando…';
  boton.setAttribute('aria-disabled', 'true');
  limpiarErrores();
  try {
    const respuesta = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.ok && datos.ok) {
      const r = datos.resumen || {};
      const dia = r.fecha ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
      resultado.textContent = r.fecha
        ? `¡Listo! Recibimos tu solicitud de ${r.tratamiento} para el ${dia} a las ${r.hora}. Te llamaremos para confirmar la cita.`
        : '¡Listo! Recibimos tu solicitud. Te llamaremos para confirmar la cita.';
      resultado.hidden = false;
      form.reset();
      form.hidden = true;
      resultado.focus();
      resultado.scrollIntoView({ block: 'center' });
    } else {
      mostrarErrores(datos.errores || {}, datos.mensaje || `No pudimos enviar tu solicitud. Llámanos al ${TELEFONO}.`);
    }
  } catch {
    mostrarErrores({}, `No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo, o llámanos al ${TELEFONO}.`);
  } finally {
    enviando = false;
    boton.textContent = 'Enviar solicitud';
    boton.removeAttribute('aria-disabled');
  }
});
