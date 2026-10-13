// Envío del formulario de contacto.
const form = document.getElementById('form-contacto');
const estado = document.getElementById('estado');

function mostrar(texto, tipo) {
  estado.textContent = texto;
  estado.className = tipo;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = form.nombre.value.trim();
  const correo = form.correo.value.trim();
  const mensaje = form.mensaje.value.trim();

  if (!nombre || !correo || !mensaje) {
    return mostrar('Por favor llena todos los campos.', 'error');
  }
  if (!form.correo.checkValidity()) {
    return mostrar('El correo no parece válido.', 'error');
  }

  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrar('Enviando…', '');

  try {
    const respuesta = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, correo, mensaje, web: form.web.value }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo enviar el mensaje.');
    form.reset();
    mostrar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
  } catch (err) {
    mostrar(err.message || 'No se pudo enviar el mensaje.', 'error');
  } finally {
    boton.disabled = false;
  }
});
