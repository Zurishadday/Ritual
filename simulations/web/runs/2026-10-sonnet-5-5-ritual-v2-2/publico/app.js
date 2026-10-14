// Mejora el formulario: envía sin recargar la página y muestra el resultado junto al botón.
// Sin este archivo el formulario sigue funcionando: el servidor recibe el envío normal en /contacto.
(() => {
  const form = document.querySelector('#form-contacto');
  const estado = document.querySelector('#estado');
  if (!form || !estado || !window.fetch) return;

  const boton = form.querySelector('button[type="submit"]');
  const textoBoton = boton.textContent;
  const campos = ['nombre', 'correo', 'mensaje'];
  let enviando = false;

  function mostrar(tipo, texto) {
    estado.className = `estado visible ${tipo}`;
    estado.textContent = texto;
  }

  function limpiarErrores() {
    for (const id of campos) {
      const el = form.elements[id];
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      el.closest('.campo').classList.remove('con-error');
      document.getElementById(`e-${id}`)?.remove();
    }
  }

  function marcarErrores(errores) {
    let primero = null;
    for (const id of campos) {
      if (!errores[id]) continue;
      const el = form.elements[id];
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', `e-${id}`);
      const p = document.createElement('p');
      p.className = 'error-campo';
      p.id = `e-${id}`;
      p.textContent = errores[id];
      el.closest('.campo').classList.add('con-error');
      el.after(p);
      primero ??= el;
    }
    return primero;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return; // un segundo clic no manda el mensaje dos veces
    enviando = true;
    form.setAttribute('aria-busy', 'true');
    boton.textContent = 'Enviando…';
    limpiarErrores();
    mostrar('info', 'Enviando tu mensaje…');

    try {
      const respuesta = await fetch('/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const datos = await respuesta.json().catch(() => null);

      if (respuesta.ok && datos?.ok) {
        form.reset();
        mostrar('ok', '¡Gracias! Recibimos tu mensaje y te responderemos pronto.');
        estado.focus();
      } else if (datos?.errores) {
        const primero = marcarErrores(datos.errores);
        mostrar('error', datos.mensaje || 'Revisa los campos marcados.');
        primero?.focus();
      } else {
        mostrar('error', datos?.mensaje || 'No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.');
      }
    } catch {
      mostrar('error', 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo; tu mensaje sigue aquí.');
    } finally {
      enviando = false;
      form.removeAttribute('aria-busy');
      boton.textContent = textoBoton;
    }
  });
})();
