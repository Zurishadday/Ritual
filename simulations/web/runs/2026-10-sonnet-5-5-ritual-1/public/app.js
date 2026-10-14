const formulario = document.getElementById('formulario');
const estado = document.getElementById('estado');

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = formulario.querySelector('button');
  const datos = Object.fromEntries(new FormData(formulario));
  estado.className = '';
  estado.textContent = '';

  if (!formulario.checkValidity()) {
    estado.className = 'error';
    estado.textContent = 'Completa todos los campos con un correo válido.';
    formulario.querySelector(':invalid')?.focus();
    return;
  }

  boton.disabled = true;
  try {
    const r = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(cuerpo.error || 'No se pudo enviar el mensaje.');
    formulario.reset();
    estado.className = 'ok';
    estado.textContent = '¡Gracias! Recibimos tu mensaje y te responderemos pronto.';
  } catch (err) {
    estado.className = 'error';
    estado.textContent = err.message || 'Error de conexión, intenta de nuevo.';
  } finally {
    boton.disabled = false;
  }
});
