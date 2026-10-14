const formulario = document.getElementById('formulario');
const estado = document.getElementById('estado');
const boton = formulario.querySelector('button[type="submit"]');

function mostrar(texto, tipo) {
  estado.textContent = texto;
  estado.className = tipo;
}

// Envío sin JavaScript: el servidor redirige aquí con ?enviado=1.
if (new URLSearchParams(location.search).has('enviado')) {
  mostrar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario));

  if (!datos.nombre.trim() || !datos.correo.trim() || !datos.mensaje.trim()) {
    return mostrar('Completa nombre, correo y mensaje.', 'error');
  }
  if (!formulario.correo.checkValidity()) {
    return mostrar('Escribe un correo válido.', 'error');
  }

  boton.disabled = true;
  mostrar('Enviando…', '');
  try {
    const respuesta = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar.');
    formulario.reset();
    mostrar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
  } catch (error) {
    mostrar(error.message || 'No se pudo enviar. Intenta de nuevo.', 'error');
  } finally {
    boton.disabled = false;
  }
});
