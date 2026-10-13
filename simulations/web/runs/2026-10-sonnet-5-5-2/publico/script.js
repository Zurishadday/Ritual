const formulario = document.getElementById('formulario');
const estado = document.getElementById('estado');
const boton = formulario.querySelector('button');

function mostrar(texto, tipo) {
  estado.textContent = texto;
  estado.className = tipo;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!formulario.checkValidity()) {
    formulario.reportValidity();
    return;
  }

  boton.disabled = true;
  mostrar('Enviando…', '');

  try {
    const respuesta = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(formulario))),
    });
    const datos = await respuesta.json().catch(() => ({}));

    if (respuesta.ok) {
      formulario.reset();
      mostrar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
    } else {
      mostrar(datos.error || 'No se pudo enviar el mensaje. Inténtalo de nuevo.', 'error');
    }
  } catch {
    mostrar('No hay conexión con el servidor. Inténtalo de nuevo.', 'error');
  } finally {
    boton.disabled = false;
  }
});
