// Formulario de citas. Sin este archivo el formulario también funciona:
// el navegador lo envía normal y el servidor responde con una página.
(() => {
  const form = document.getElementById('form-cita');
  const boton = document.getElementById('enviar');
  const resultado = document.getElementById('resultado');
  const { tratamiento, fecha, hora } = form.elements;
  const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora'];
  const CIERRE = 18 * 60;
  let enviando = false;

  form.noValidate = true; // los mensajes los damos nosotros, en español y junto a cada campo

  const pad = (n) => String(n).padStart(2, '0');
  const hoy = new Date();
  fecha.min = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;

  const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  // Día y hora actuales del consultorio (el servidor decide; esto solo ayuda a elegir).
  let ahora = null;
  fetch('/api/ahora').then((r) => r.json()).then((a) => {
    if (!a || !a.fecha) return;
    ahora = a;
    fecha.min = a.fecha;
    actualizarHoras();
  }).catch(() => {});
  fecha.addEventListener('change', actualizarHoras);

  // Deshabilita las horas en las que la sesión terminaría después de las 18:00
  // y, si el día es hoy, las que ya pasaron.
  function actualizarHoras() {
    const dur = Number(tratamiento.selectedOptions[0]?.dataset.min) || 0;
    const hoyYa = ahora && fecha.value === ahora.fecha ? ahora.minutos : -1;
    for (const op of hora.options) {
      if (op.value) op.disabled = (dur > 0 && minutos(op.value) + dur > CIERRE) || minutos(op.value) <= hoyYa;
    }
    if (hora.selectedOptions[0]?.disabled) hora.value = '';
    document.getElementById('ayuda-hora').textContent = dur
      ? `La sesión dura ${dur} min y debe terminar antes de las 18:00.`
      : 'Entre 09:00 y 18:00.';
  }
  tratamiento.addEventListener('change', actualizarHoras);
  actualizarHoras();

  function ponerError(campo, mensaje) {
    const el = form.elements[campo];
    document.getElementById(`err-${campo}`).textContent = mensaje;
    el.setAttribute('aria-invalid', 'true');
  }
  function quitarError(campo) {
    document.getElementById(`err-${campo}`).textContent = '';
    form.elements[campo].removeAttribute('aria-invalid');
  }
  function limpiarTodo() {
    CAMPOS.forEach(quitarError);
    resultado.textContent = '';
    resultado.className = 'resultado';
  }
  for (const c of CAMPOS) form.elements[c].addEventListener('input', () => quitarError(c));
  for (const c of ['tratamiento', 'fecha', 'hora']) form.elements[c].addEventListener('change', () => quitarError(c));

  function validar() {
    const e = {};
    const v = (n) => form.elements[n].value.trim();
    if (v('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
    const digitos = v('telefono').replace(/\D/g, '').length;
    if (!/^[\d\s+()\-.]+$/.test(v('telefono')) || digitos < 8 || digitos > 15) e.telefono = 'Escribe un teléfono válido, con al menos 8 dígitos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('correo'))) e.correo = 'Escribe un correo válido, como nombre@correo.com.';
    if (!v('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
    if (!v('fecha')) e.fecha = 'Elige un día.';
    else {
      const [y, m, d] = v('fecha').split('-').map(Number);
      const dia = new Date(y, m - 1, d).getDay();
      if (dia === 0 || dia === 6) e.fecha = 'Atendemos de lunes a viernes. Elige un día entre semana.';
      else if (v('fecha') < fecha.min) e.fecha = 'Ese día ya pasó. Elige uno a partir de hoy.';
    }
    if (!v('hora')) e.hora = 'Elige una hora.';
    else if (ahora && v('fecha') === ahora.fecha && minutos(v('hora')) <= ahora.minutos) e.hora = 'Esa hora ya pasó hoy. Elige una más tarde.';
    return e;
  }

  function mostrarErrores(errores) {
    let primero = null;
    for (const c of CAMPOS) {
      if (errores[c]) { ponerError(c, errores[c]); primero = primero || c; }
    }
    resultado.className = 'resultado fallo';
    resultado.textContent = 'Revisa los campos marcados en rojo y vuelve a intentar.';
    if (primero) form.elements[primero].focus();
  }

  function mensaje(clase, texto) {
    resultado.className = `resultado ${clase}`;
    resultado.textContent = texto;
    resultado.focus(); // el lector de pantalla lo lee y el siguiente Tab sigue desde aquí
    resultado.scrollIntoView({ block: 'nearest' });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviando) return;
    limpiarTodo();
    const errores = validar();
    if (Object.keys(errores).length) return mostrarErrores(errores);

    enviando = true;
    boton.setAttribute('aria-disabled', 'true'); // no usamos "disabled": así el foco no se pierde
    boton.textContent = 'Enviando…';
    try {
      const resp = await fetch('/api/citas', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)),
      });
      const datos = await resp.json().catch(() => ({}));
      if (resp.ok) {
        form.reset();
        actualizarHoras();
        mensaje('ok', 'Listo, recibimos tu solicitud. Te contactaremos para confirmar tu cita.');
      } else if (datos.errores) {
        mostrarErrores(datos.errores);
      } else {
        mensaje('fallo', datos.error || 'No pudimos enviar tu solicitud. Llámanos al 55 1234 5678.');
      }
    } catch {
      mensaje('fallo', 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo, o llámanos al 55 1234 5678.');
    } finally {
      enviando = false;
      boton.removeAttribute('aria-disabled');
      boton.textContent = 'Pedir cita';
    }
  });
})();
