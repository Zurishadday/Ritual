// Formulario de contacto: mejora el envío normal con validación y respuesta en la misma página.
// Si este archivo no carga, el formulario funciona igual con el envío tradicional.
const form = document.getElementById('form-contacto');

if (form) {
  const CAMPOS = ['nombre', 'correo', 'mensaje'];
  const estado = document.getElementById('estado');
  const boton = document.getElementById('boton-enviar');
  const textoBoton = boton.textContent;
  let enviando = false;

  form.noValidate = true; // los mensajes los damos nosotros, junto a cada campo

  function validar(d) {
    const e = {};
    const nombre = d.nombre.trim();
    const correo = d.correo.trim();
    const mensaje = d.mensaje.trim();
    if (!nombre) e.nombre = 'Escribe tu nombre.';
    else if (nombre.length > 100) e.nombre = 'El nombre es demasiado largo (máximo 100 caracteres).';
    if (!correo) e.correo = 'Escribe tu correo para poder responderte.';
    else if (correo.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
      e.correo = 'Ese correo no parece válido. Revisa que tenga la forma nombre@ejemplo.com.';
    if (!mensaje) e.mensaje = 'Escribe tu mensaje.';
    else if (mensaje.length > 2000) e.mensaje = 'El mensaje es demasiado largo (máximo 2000 caracteres).';
    return e;
  }

  // Pinta los errores junto a cada campo y devuelve el primer campo con error.
  function mostrarErrores(errores) {
    let primero = null;
    for (const c of CAMPOS) {
      const input = form.elements[c];
      const aviso = document.getElementById('error-' + c);
      if (errores[c]) {
        aviso.textContent = errores[c];
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'error-' + c);
        primero = primero || input;
      } else {
        aviso.textContent = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    }
    return primero;
  }

  function decir(texto, esError) {
    estado.textContent = texto;
    estado.classList.toggle('estado-error', Boolean(esError));
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviando) return;

    const datos = Object.fromEntries(new FormData(form));
    const primero = mostrarErrores(validar(datos));
    if (primero) {
      decir('Revisa los campos marcados.', true);
      primero.focus();
      return;
    }

    enviando = true;
    form.setAttribute('aria-busy', 'true');
    boton.textContent = 'Enviando…';
    decir('Enviando tu mensaje…', false);

    try {
      const r = await fetch('/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        const nombre = datos.nombre.trim();
        form.reset();
        mostrarErrores({});
        decir(`¡Gracias, ${nombre}! Recibimos tu mensaje y te responderemos por correo.`, false);
        estado.focus();
      } else if (j.errores) {
        const campo = mostrarErrores(j.errores);
        decir('Revisa los campos marcados.', true);
        if (campo) campo.focus();
      } else {
        decir(j.mensaje || 'No pudimos enviar tu mensaje. Inténtalo de nuevo en un momento.', true);
        estado.focus();
      }
    } catch {
      decir('No pudimos conectar con el servidor. Tu mensaje sigue aquí; revisa tu conexión e inténtalo de nuevo.', true);
      estado.focus();
    } finally {
      enviando = false;
      form.removeAttribute('aria-busy');
      boton.textContent = textoBoton;
    }
  });
}
