const form = document.getElementById('form');
const estado = document.getElementById('estado');
const mostrar = (texto, clase) => { estado.textContent = texto; estado.className = clase; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = form.querySelector('button');
  boton.disabled = true;
  mostrar('Enviando…', '');
  try {
    const r = await fetch('/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const datos = await r.json();
    if (!r.ok) throw new Error(datos.error || 'No se pudo enviar.');
    form.reset();
    mostrar('¡Gracias! Recibimos tu mensaje y te respondemos pronto.', 'ok');
  } catch (err) {
    mostrar(err.message === 'Failed to fetch' ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message, 'error');
  } finally {
    boton.disabled = false;
  }
});
