const form = document.getElementById('formulario');
const estado = document.getElementById('estado');

function avisar(texto, clase) {
  estado.textContent = texto;
  estado.className = clase;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const boton = form.querySelector('button');
  boton.disabled = true;
  avisar('Enviando…', '');
  try {
    const r = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.error || 'No se pudo enviar el mensaje.');
    form.reset();
    avisar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
  } catch (err) {
    avisar(err.message === 'Failed to fetch' ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});
