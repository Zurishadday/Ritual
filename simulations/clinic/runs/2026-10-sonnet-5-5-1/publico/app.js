const form = document.getElementById('form-cita');
const mensaje = document.getElementById('mensaje');
const fecha = document.getElementById('fecha');
const hora = document.getElementById('hora');

// Horas cada 30 min, de 9:00 a 17:00 (la última cita termina antes de las 18:00).
for (let m = 9 * 60; m <= 17 * 60; m += 30) {
  const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  hora.add(new Option(t, t));
}

function aISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
fecha.min = aISO(new Date());

function esFinDeSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia === 0 || dia === 6;
}

function avisar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + (tipo || '');
}

fecha.addEventListener('change', () => {
  if (fecha.value && esFinDeSemana(fecha.value)) {
    fecha.value = '';
    avisar('Atendemos de lunes a viernes. Elige otro día.', 'error');
  } else {
    avisar('');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(form));
  for (const campo of ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora']) {
    if (!String(datos[campo] || '').trim()) {
      avisar('Completa todos los campos obligatorios.', 'error');
      form.elements[campo].focus();
      return;
    }
  }
  if (!form.elements.correo.checkValidity()) {
    avisar('Escribe un correo válido.', 'error');
    form.elements.correo.focus();
    return;
  }
  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  avisar('Enviando…');
  try {
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo enviar. Intenta de nuevo o llámanos.');
    form.reset();
    avisar('¡Solicitud enviada! Te confirmaremos tu cita pronto.', 'ok');
  } catch (err) {
    avisar(err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});
