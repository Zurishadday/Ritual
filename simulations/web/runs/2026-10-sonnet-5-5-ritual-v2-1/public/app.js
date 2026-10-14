// Mejora el formulario: envía sin recargar y muestra el resultado junto al botón.
// Sin este archivo, el formulario sigue funcionando con un envío normal (POST /contacto).
const form = document.getElementById('form-contacto');
const estado = document.getElementById('estado');
const campos = ['nombre', 'correo', 'mensaje'];
let enviando = false;

form.noValidate = true; // validamos nosotros para mostrar los mensajes junto a cada campo

function mostrarErrores(errores) {
  let primero = null;
  for (const c of campos) {
    const input = form.elements[c];
    const span = document.getElementById('error-' + c);
    const msg = errores[c] || '';
    span.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) {
      input.setAttribute('aria-describedby', span.id);
      primero ??= input;
    } else input.removeAttribute('aria-describedby');
  }
  return primero;
}

function avisar(texto, tipo) {
  estado.textContent = texto;
  estado.className = 'estado ' + tipo;
}

function validarLocal() {
  const e = {};
  const v = (c) => form.elements[c].value.trim();
  if (!v('nombre')) e.nombre = 'Escribe tu nombre.';
  if (!v('correo')) e.correo = 'Escribe tu correo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('correo'))) e.correo = 'Revisa el correo; debe verse como nombre@ejemplo.com.';
  if (!v('mensaje')) e.mensaje = 'Escribe tu mensaje.';
  else if (v('mensaje').length < 5) e.mensaje = 'El mensaje es muy corto.';
  return e;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return; // dos clics seguidos envían un solo mensaje
  const locales = validarLocal();
  const primero = mostrarErrores(locales);
  if (primero) {
    avisar('Revisa los campos marcados.', 'mal');
    primero.focus();
    return;
  }
  enviando = true;
  form.setAttribute('aria-busy', 'true');
  avisar('Enviando…', '');
  let r, datos;
  try {
    r = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    datos = await r.json();
  } catch {
    avisar('No pudimos conectar con el servidor. Tu mensaje sigue aquí; inténtalo de nuevo.', 'mal');
    estado.focus();
    return;
  } finally {
    enviando = false;
    form.removeAttribute('aria-busy');
  }
  if (datos.ok) {
    form.reset();
    mostrarErrores({});
    avisar('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', 'ok');
    estado.focus();
  } else {
    const primero = mostrarErrores(datos.errores || {});
    avisar(datos.mensaje || 'No se pudo enviar el mensaje.', 'mal');
    (primero || estado).focus();
  }
});
