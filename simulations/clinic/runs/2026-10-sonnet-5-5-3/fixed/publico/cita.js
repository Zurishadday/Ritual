const form = document.getElementById('formulario');
const resultado = document.getElementById('resultado');
const boton = form.querySelector('button[type="submit"]');

// No permitir días pasados
const hoy = new Date();
form.elements.fecha.min =
  `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

function mostrarErrores(errores = {}) {
  form.querySelectorAll('[data-error]').forEach((el) => {
    el.textContent = errores[el.dataset.error] || '';
  });
}

form.elements.fecha.addEventListener('change', () => {
  const v = form.elements.fecha.value;
  if (!v) return;
  const dia = new Date(v + 'T00:00:00').getDay();
  mostrarErrores(dia === 0 || dia === 6 ? { fecha: 'Atendemos de lunes a viernes.' } : {});
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErrores();
  resultado.className = '';
  resultado.textContent = '';
  boton.disabled = true;
  try {
    const datos = Object.fromEntries(new FormData(form));
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (r.ok) {
      form.reset();
      resultado.className = 'ok';
      resultado.textContent = '¡Gracias! Recibimos tu solicitud y te contactaremos para confirmar tu cita.';
    } else {
      mostrarErrores(cuerpo.errores);
      resultado.className = 'mal';
      resultado.textContent = cuerpo.error || 'No pudimos enviar la solicitud. Inténtalo de nuevo o llámanos.';
    }
  } catch {
    resultado.className = 'mal';
    resultado.textContent = 'No hay conexión con el servidor. Inténtalo de nuevo o llámanos.';
  } finally {
    boton.disabled = false;
  }
});
