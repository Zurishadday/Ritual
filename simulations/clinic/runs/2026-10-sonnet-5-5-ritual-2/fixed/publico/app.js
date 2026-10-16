// Mejora del formulario: avisos junto a cada campo y envío sin recargar.
// Si este archivo no carga, el formulario sigue funcionando con un envío normal.
(() => {
  const form = document.getElementById('form-cita');
  const mensaje = document.getElementById('mensaje');
  const boton = document.getElementById('enviar');
  const fecha = document.getElementById('fecha');
  const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora', 'comentario'];
  let enviando = false;

  const hoy = new Date();
  fecha.min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  function limpiar() {
    for (const c of CAMPOS) {
      document.getElementById('error-' + c).textContent = '';
      document.getElementById(c).removeAttribute('aria-invalid');
      document.getElementById(c).removeAttribute('aria-describedby');
    }
  }

  function mostrarErrores(errores) {
    limpiar();
    for (const e of errores) {
      const campo = document.getElementById(e.campo);
      if (!campo) continue;
      document.getElementById('error-' + e.campo).textContent = e.mensaje;
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', 'error-' + e.campo);
    }
    mensaje.className = 'mensaje mal';
    mensaje.replaceChildren();
    mensaje.append('Revisa estos datos para poder enviar tu solicitud:');
    const ul = document.createElement('ul');
    for (const e of errores) { const li = document.createElement('li'); li.textContent = e.mensaje; ul.append(li); }
    mensaje.append(ul);
    mensaje.hidden = false;
    mensaje.focus();
  }

  function aviso(tipo, texto) {
    mensaje.className = 'mensaje ' + tipo;
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.focus();
  }

  function validarLocal(d) {
    const e = [];
    if (d.nombre.trim().length < 2) e.push({ campo: 'nombre', mensaje: 'Escribe tu nombre.' });
    const dig = d.telefono.replace(/\D/g, '');
    if (!/^[\d\s+()-]+$/.test(d.telefono.trim()) || dig.length < 8) e.push({ campo: 'telefono', mensaje: 'Escribe un teléfono válido, con al menos 8 números.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim())) e.push({ campo: 'correo', mensaje: 'Escribe un correo válido, como nombre@correo.com.' });
    if (!d.tratamiento) e.push({ campo: 'tratamiento', mensaje: 'Elige un tratamiento de la lista.' });
    if (!d.fecha) e.push({ campo: 'fecha', mensaje: 'Elige un día en el calendario.' });
    else {
      const [y, m, dia] = d.fecha.split('-').map(Number);
      const dow = new Date(y, m - 1, dia).getDay();
      if (d.fecha < fecha.min) e.push({ campo: 'fecha', mensaje: 'Ese día ya pasó. Elige uno a partir de hoy.' });
      else if (dow === 0 || dow === 6) e.push({ campo: 'fecha', mensaje: 'Atendemos de lunes a viernes. Elige un día entre semana.' });
    }
    if (!d.hora) e.push({ campo: 'hora', mensaje: 'Elige una hora entre 9:00 y 17:00.' });
    return e;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviando) return; // doble clic: se ignora (el botón sigue activo para no perder el foco)
    const datos = Object.fromEntries(new FormData(form));
    const locales = validarLocal(datos);
    if (locales.length) {
      mostrarErrores(locales);
      document.getElementById(locales[0].campo).focus();
      return;
    }
    limpiar();
    enviando = true;
    boton.setAttribute('aria-busy', 'true');
    boton.textContent = 'Enviando…';
    mensaje.hidden = true;
    try {
      const r = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(datos),
      });
      const cuerpo = await r.json().catch(() => ({}));
      if (r.ok) {
        form.reset();
        aviso('ok', '¡Listo! Recibimos tu solicitud. Te contactaremos pronto para confirmar tu cita.');
      } else if (cuerpo.errores) {
        mostrarErrores(cuerpo.errores);
      } else {
        aviso('mal', cuerpo.mensaje || 'No pudimos guardar tu solicitud. Intenta de nuevo o llámanos (el teléfono está en Contacto).');
      }
    } catch {
      aviso('mal', 'No hay conexión con el servidor. Tus datos siguen en el formulario; intenta de nuevo o llámanos (el teléfono está en Contacto).');
    } finally {
      enviando = false;
      boton.removeAttribute('aria-busy');
      boton.textContent = 'Enviar solicitud';
    }
  });
})();
