const form = document.getElementById('formulario');
const resultado = document.getElementById('resultado');
const selTrat = form.tratamiento, selHora = form.hora, inpFecha = form.fecha;
const APERTURA = 9 * 60, CIERRE = 18 * 60;

const pad = n => String(n).padStart(2, '0');
const hoy = new Date();
inpFecha.min = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;

// Horas disponibles según la duración: la sesión debe terminar a las 18:00 como máximo.
function llenarHoras() {
  const min = Number(selTrat.selectedOptions[0]?.dataset.min);
  const previa = selHora.value;
  selHora.replaceChildren(new Option(min ? 'Elige una hora…' : 'Elige primero el tratamiento', ''));
  if (!min) return;
  for (let t = APERTURA; t + min <= CIERRE; t += 30) {
    const h = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    selHora.add(new Option(h, h));
  }
  selHora.value = previa;
}
selTrat.addEventListener('change', llenarHoras);

// Fecha en lunes-viernes
inpFecha.addEventListener('change', () => {
  const [a, m, d] = inpFecha.value.split('-').map(Number);
  const dia = inpFecha.value ? new Date(a, m - 1, d).getDay() : 1;
  inpFecha.setCustomValidity(dia === 0 || dia === 6 ? 'Atendemos de lunes a viernes.' : '');
  mostrarError('fecha', inpFecha.validationMessage);
});

function mostrarError(campo, msg) {
  form.querySelector(`[data-para="${campo}"]`).textContent = msg || '';
}

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  resultado.textContent = ''; resultado.className = '';
  form.querySelectorAll('.error').forEach(e => (e.textContent = ''));

  let hayError = false;
  for (const campo of ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora']) {
    const el = form[campo];
    if (!el.checkValidity()) {
      mostrarError(campo, el.validationMessage || 'Revisa este campo.');
      hayError = true;
    }
  }
  if (hayError) return form.querySelector('.error:not(:empty)')?.previousElementSibling?.focus();

  const boton = form.querySelector('button');
  boton.disabled = true;
  try {
    const datos = Object.fromEntries(new FormData(form));
    const r = await fetch('/api/solicitudes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      form.reset(); llenarHoras();
      resultado.textContent = '¡Solicitud enviada! Te contactaremos para confirmar tu cita.';
      resultado.className = 'ok';
    } else if (j.errores) {
      for (const [c, m] of Object.entries(j.errores)) mostrarError(c, m);
    } else {
      throw new Error();
    }
  } catch {
    resultado.textContent = 'No se pudo enviar. Inténtalo de nuevo o llámanos.';
    resultado.className = 'mal';
  } finally {
    boton.disabled = false;
  }
});
