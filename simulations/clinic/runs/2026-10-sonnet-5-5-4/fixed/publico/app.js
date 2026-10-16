const form = document.getElementById('formulario');
const resultado = document.getElementById('resultado');
const boton = form.querySelector('button[type="submit"]');
const selTrat = form.tratamiento, selHora = form.hora, inpFecha = form.fecha;
const APERTURA = 9 * 60, CIERRE = 18 * 60;
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'];

form.noValidate = true; // los mensajes los mostramos nosotros, junto a cada campo
let enviando = false;

const pad = n => String(n).padStart(2, '0');
const aFecha = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoy = new Date();
inpFecha.min = aFecha(hoy);
inpFecha.max = aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 180));

// Horas disponibles: cada 30 min, la sesión debe terminar a las 18:00 como máximo y no pueden ser horas que ya pasaron.
function llenarHoras() {
  const min = Number(selTrat.selectedOptions[0]?.dataset.min) || 30;
  const previa = selHora.value;
  const ahora = new Date();
  const esHoy = inpFecha.value === aFecha(ahora);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  selHora.replaceChildren(new Option('Elige una hora…', ''));
  for (let t = APERTURA; t + min <= CIERRE; t += 30) {
    if (esHoy && t <= minAhora) continue;
    const h = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    selHora.add(new Option(h, h));
  }
  selHora.value = previa; // si ya no existe, queda en "Elige una hora…"
}
llenarHoras();
selTrat.addEventListener('change', llenarHoras);

function mostrarError(campo, msg) {
  const caja = form.querySelector(`[data-para="${campo}"]`);
  if (caja) caja.textContent = msg || '';
  if (form[campo]) form[campo].setAttribute('aria-invalid', msg ? 'true' : 'false');
}

function mensajeDe(campo) {
  const el = form[campo], v = el.value.trim();
  if (campo === 'nombre') return v.length < 2 ? 'Escribe tu nombre.' : '';
  if (campo === 'telefono') {
    return /^[\d\s()+\-.]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7
      ? '' : 'Escribe un teléfono válido, solo números (por ejemplo 55 1234 5678).';
  }
  if (campo === 'correo') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Escribe un correo válido, como nombre@correo.com.';
  if (campo === 'tratamiento') return v ? '' : 'Elige un tratamiento.';
  if (campo === 'fecha') {
    if (!v) return 'Elige un día.';
    if (v < inpFecha.min) return 'Elige un día de hoy en adelante.';
    if (v > inpFecha.max) return 'Solo agendamos con hasta 6 meses de anticipación.';
    const [a, m, d] = v.split('-').map(Number);
    const dia = new Date(a, m - 1, d).getDay();
    return dia === 0 || dia === 6 ? 'Atendemos de lunes a viernes.' : '';
  }
  if (campo === 'hora') return v ? '' : 'Elige una hora.';
  return '';
}

inpFecha.addEventListener('change', () => { llenarHoras(); mostrarError('fecha', mensajeDe('fecha')); });
for (const c of ['nombre', 'telefono', 'correo']) form[c].addEventListener('blur', () => { if (form[c].value) mostrarError(c, mensajeDe(c)); });

// Mensaje general (éxito o fallo): se enfoca para que se vea y se lea, aunque el botón esté lejos de la pantalla.
function avisar(texto, clase) {
  resultado.textContent = texto;
  resultado.className = clase;
  resultado.focus();
}

function enfocarPrimerError() {
  const caja = [...form.querySelectorAll('.error')].find(e => e.textContent);
  caja?.closest('label')?.querySelector('input, select, textarea')?.focus();
}

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (enviando) return; // doble clic / Enter repetido
  resultado.textContent = ''; resultado.className = '';

  let hayError = false;
  for (const campo of CAMPOS) {
    const msg = mensajeDe(campo);
    mostrarError(campo, msg);
    if (msg) hayError = true;
  }
  if (hayError) return enfocarPrimerError();

  // aria-disabled (y no "disabled") para que el botón no pierda el foco del teclado
  enviando = true;
  boton.setAttribute('aria-disabled', 'true');
  try {
    const datos = Object.fromEntries(new FormData(form));
    const r = await fetch('/api/solicitudes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      form.reset(); llenarHoras();
      for (const c of CAMPOS) mostrarError(c, '');
      avisar('¡Solicitud enviada! Te contactaremos para confirmar tu cita.', 'ok');
    } else if (j.errores) {
      for (const [c, m] of Object.entries(j.errores)) mostrarError(c, m);
      avisar('Revisa los campos marcados.', 'mal');
      enfocarPrimerError();
    } else {
      avisar(j.error || 'No se pudo enviar. Inténtalo de nuevo o llámanos.', 'mal');
    }
  } catch {
    avisar('No se pudo enviar. Revisa tu conexión, inténtalo de nuevo o llámanos.', 'mal');
  } finally {
    enviando = false;
    boton.removeAttribute('aria-disabled');
  }
});
