const formulario = document.getElementById('formulario');
const estado = document.getElementById('estado');

function mostrar(texto, tipo) {
  estado.textContent = texto;
  estado.className = tipo;
}

// Resultado del envío sin JavaScript (el servidor redirige con ?enviado=1 o ?error=...).
const params = new URLSearchParams(location.search);
const aviso = document.getElementById('aviso-servidor');
if (params.has('enviado') || params.has('error')) {
  aviso.hidden = false;
  aviso.textContent = params.has('enviado')
    ? '¡Gracias! Recibimos tu mensaje y te responderemos pronto.'
    : params.get('error');
  aviso.className = params.has('enviado') ? 'ok' : 'error';
  aviso.tabIndex = -1;
  aviso.focus();
}

formulario.addEventListener('submit', async (e) => {
  e.preventDefault();
  const boton = formulario.querySelector('button');
  const datos = Object.fromEntries(new FormData(formulario));

  if (!datos.nombre.trim() || !datos.correo.trim() || !datos.mensaje.trim()) {
    return mostrar('Completa todos los campos.', 'error');
  }
  if (!formulario.correo.validity.valid) {
    return mostrar('Escribe un correo válido.', 'error');
  }

  boton.disabled = true;
  mostrar('Enviando…', '');
  try {
    const r = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const resp = await r.json().catch(() => ({}));
    if (r.ok && resp.ok) {
      formulario.reset();
      mostrar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
      estado.tabIndex = -1;
      estado.focus();
    } else {
      mostrar(resp.error || 'No se pudo enviar. Intenta de nuevo.', 'error');
    }
  } catch {
    mostrar('No hay conexión con el servidor. Intenta de nuevo.', 'error');
  } finally {
    boton.disabled = false;
  }
});
