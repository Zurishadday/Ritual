const form = document.getElementById('form-cita');
const mensaje = document.getElementById('mensaje');
const selHora = form.elements.hora;
const inputFecha = form.elements.fecha;

// Horas de 9:00 a 17:00 cada media hora (la sesión más larga dura 1 h y se atiende hasta las 18:00).
for (let h = 9; h <= 17; h++) {
  for (const m of h < 17 ? ['00', '30'] : ['00']) {
    const v = `${String(h).padStart(2, '0')}:${m}`;
    selHora.append(new Option(v, v));
  }
}

const hoy = new Date();
inputFecha.min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

function diaSemana(texto) {
  const [y, m, d] = texto.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function mostrar(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo || '';
}

inputFecha.addEventListener('change', () => {
  if (inputFecha.value && [0, 6].includes(diaSemana(inputFecha.value))) {
    mostrar('Atendemos de lunes a viernes. Elige otro día.', 'error');
    inputFecha.value = '';
  } else {
    mostrar('');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrar('');
  const datos = Object.fromEntries(new FormData(form));
  const faltan = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'].some((k) => !String(datos[k] || '').trim());
  if (faltan) return mostrar('Completa todos los campos obligatorios.', 'error');
  if (!form.elements.correo.checkValidity()) return mostrar('Escribe un correo válido.', 'error');

  const boton = form.querySelector('button');
  boton.disabled = true;
  try {
    const r = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return mostrar(cuerpo.error || 'No se pudo enviar. Inténtalo de nuevo.', 'error');
    form.reset();
    mostrar('¡Listo! Recibimos tu solicitud y te contactaremos para confirmar.', 'ok');
  } catch {
    mostrar('No hay conexión con el servidor. Inténtalo de nuevo.', 'error');
  } finally {
    boton.disabled = false;
  }
});
