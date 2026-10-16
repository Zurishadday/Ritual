const form = document.getElementById('form-cita');
const mensaje = document.getElementById('mensaje');
const inputFecha = form.elements.fecha;
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'];
let enviando = false;

// Con JS la validación la hacemos nosotros (mensajes propios); sin JS queda la del navegador.
form.noValidate = true;

const hoy = new Date();
inputFecha.min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

function diaSemana(texto) {
  const [y, m, d] = texto.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function limpiarErrores() {
  for (const el of form.elements) el.removeAttribute('aria-invalid');
}

function mostrar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo || '';
}

// errores: { campo: texto }. Marca cada campo, lista los problemas y lleva el foco al primero.
function mostrarErrores(errores) {
  limpiarErrores();
  const campos = Object.keys(errores);
  for (const c of campos) {
    form.elements[c].setAttribute('aria-invalid', 'true');
    form.elements[c].setAttribute('aria-describedby', 'mensaje');
  }
  mostrar(campos.map((c) => errores[c]).join(' '), 'error');
  const primero = CAMPOS.concat(['comentario']).find((c) => errores[c]);
  if (primero) form.elements[primero].focus();
}

function validar(d) {
  const e = {};
  const t = (k) => String(d[k] || '').trim();
  if (t('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
  if (t('telefono').replace(/\D/g, '').length < 8 || !/^[\d\s()+\-.]{8,30}$/.test(t('telefono'))) e.telefono = 'Escribe un teléfono válido (al menos 8 dígitos).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t('correo'))) e.correo = 'Escribe un correo válido.';
  if (!t('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
  if (!t('fecha')) e.fecha = 'Elige un día.';
  else if ([0, 6].includes(diaSemana(t('fecha')))) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  if (!t('hora')) e.hora = 'Elige una hora.';
  return e;
}

inputFecha.addEventListener('change', () => {
  if (inputFecha.value && [0, 6].includes(diaSemana(inputFecha.value))) {
    mostrarErrores({ fecha: 'Atendemos de lunes a viernes. Elige otro día.' });
  } else if (inputFecha.getAttribute('aria-invalid')) {
    inputFecha.removeAttribute('aria-invalid');
    mostrar('');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (enviando) return;
  mostrar('');
  limpiarErrores();
  const datos = Object.fromEntries(new FormData(form));
  const errores = validar(datos);
  if (Object.keys(errores).length) return mostrarErrores(errores);

  // aria-disabled en vez de disabled: el botón conserva el foco mientras se envía.
  const boton = form.querySelector('button[type="submit"]');
  enviando = true;
  boton.setAttribute('aria-disabled', 'true');
  try {
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const texto = cuerpo.error || 'No se pudo enviar. Inténtalo de nuevo.';
      if (cuerpo.campo && form.elements[cuerpo.campo]) mostrarErrores({ [cuerpo.campo]: texto });
      else {
        mostrar(texto, 'error');
        boton.focus();
      }
      return;
    }
    form.reset();
    mostrar('¡Listo! Recibimos tu solicitud y te contactaremos para confirmar.', 'ok');
    mensaje.focus();
  } catch {
    mostrar('No hay conexión con el servidor. Inténtalo de nuevo.', 'error');
    boton.focus();
  } finally {
    enviando = false;
    boton.removeAttribute('aria-disabled');
  }
});
