const form = document.getElementById('form-cita');
const mensaje = document.getElementById('mensaje');
const fecha = document.getElementById('fecha');
const hora = document.getElementById('hora');
const enviar = document.getElementById('enviar');
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'];

const p2 = (n) => String(n).padStart(2, '0');
function aISO(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
const hoy = new Date();
fecha.min = aISO(hoy);
fecha.max = aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 180));

function esFinDeSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia === 0 || dia === 6;
}

// Si el día elegido es hoy, las horas que ya pasaron no se pueden elegir.
function actualizarHoras() {
  const ahora = new Date();
  const esHoy = fecha.value === aISO(ahora);
  const minsAhora = ahora.getHours() * 60 + ahora.getMinutes();
  for (const o of hora.options) {
    if (!o.value) continue;
    const [h, m] = o.value.split(':').map(Number);
    o.disabled = esHoy && h * 60 + m <= minsAhora;
    if (o.disabled && o.selected) hora.value = '';
  }
}

function avisar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + (tipo || '');
}

function errorCampo(campo, texto) {
  const el = form.elements[campo];
  document.getElementById('err-' + campo).textContent = texto || '';
  if (texto) el.setAttribute('aria-invalid', 'true');
  else el.removeAttribute('aria-invalid');
}
function limpiarErrores() {
  for (const c of CAMPOS) errorCampo(c, '');
  errorCampo('comentario', '');
}

// Marca el campo, lo enfoca y lo trae a la vista junto con su explicación.
function fallar(campo, texto) {
  errorCampo(campo, texto);
  avisar(texto, 'error');
  const el = form.elements[campo];
  el.focus();
  el.scrollIntoView({ block: 'center' });
}

fecha.addEventListener('change', () => {
  errorCampo('fecha', '');
  if (fecha.value && esFinDeSemana(fecha.value)) {
    fecha.value = '';
    fallar('fecha', 'Atendemos de lunes a viernes. Elige otro día.');
  } else {
    avisar('');
  }
  actualizarHoras();
});
for (const c of CAMPOS) form.elements[c].addEventListener('input', () => errorCampo(c, ''));

// Mismas reglas que el servidor, campo por campo.
function revisar(d) {
  const t = (k) => String(d[k] || '').trim();
  if (t('nombre').length < 2) return ['nombre', 'Escribe tu nombre.'];
  const tel = t('telefono');
  if (!tel) return ['telefono', 'Escribe tu teléfono.'];
  const dig = tel.replace(/\D/g, '');
  if (!/^[\d\s()+\-.]+$/.test(tel) || dig.length < 8 || dig.length > 15)
    return ['telefono', 'Escribe un teléfono válido, solo con números (8 a 15 dígitos).'];
  if (!t('correo')) return ['correo', 'Escribe tu correo.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t('correo')))
    return ['correo', 'Escribe un correo válido, por ejemplo nombre@correo.com.'];
  if (!t('tratamiento')) return ['tratamiento', 'Elige un tratamiento.'];
  if (!t('fecha')) return ['fecha', 'Elige un día.'];
  if (esFinDeSemana(t('fecha'))) return ['fecha', 'Atendemos de lunes a viernes.'];
  if (!t('hora')) return ['hora', 'Elige una hora.'];
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (enviar.getAttribute('aria-disabled') === 'true') return; // no usamos disabled: así el foco se queda
  limpiarErrores();
  avisar('');
  const datos = Object.fromEntries(new FormData(form));
  const mal = revisar(datos);
  if (mal) return fallar(mal[0], mal[1]);

  enviar.setAttribute('aria-disabled', 'true');
  avisar('Enviando…');
  try {
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (j.campo && CAMPOS.includes(j.campo)) return fallar(j.campo, j.error);
      throw new Error(j.error || 'No se pudo enviar. Intenta de nuevo o llámanos.');
    }
    form.reset();
    actualizarHoras();
    avisar('¡Solicitud enviada! Te confirmaremos tu cita pronto.', 'ok');
    mensaje.scrollIntoView({ block: 'center' });
  } catch (err) {
    avisar(err.message, 'error');
    mensaje.scrollIntoView({ block: 'center' });
  } finally {
    enviar.removeAttribute('aria-disabled');
  }
});
