// Formulario de cita. Sin JavaScript el formulario también funciona (envío normal al servidor).
(() => {
  const form = document.getElementById('form-cita');
  if (!form) return;
  const estado = document.getElementById('estado-form');
  const boton = form.querySelector('button[type="submit"]');
  const fecha = form.elements.fecha;
  const ayudaFecha = document.getElementById('ayuda-fecha');
  const textoBoton = boton.textContent;
  const AYUDA_FECHA = ayudaFecha.textContent;
  const NOMBRES = {
    rodilla: 'rehabilitación de rodilla',
    espalda: 'dolor de espalda',
    masaje: 'masaje deportivo',
  };

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const limite = new Date();
  limite.setDate(limite.getDate() + 90);
  fecha.min = iso(manana);
  fecha.max = iso(limite);

  // Aviso inmediato (y visible) si el día elegido es fin de semana.
  function revisarFecha() {
    let mensaje = '';
    if (fecha.value) {
      const [a, m, d] = fecha.value.split('-').map(Number);
      const dia = new Date(a, m - 1, d).getDay();
      if (dia === 0 || dia === 6) mensaje = 'Atendemos de lunes a viernes. Elige un día entre semana.';
    }
    fecha.setCustomValidity(mensaje);
    ayudaFecha.textContent = mensaje || AYUDA_FECHA;
    ayudaFecha.classList.toggle('ayuda-error', Boolean(mensaje));
  }
  fecha.addEventListener('input', revisarFecha);
  fecha.addEventListener('change', revisarFecha);

  // «Pedir esta cita» en cada tratamiento deja elegido ese tratamiento.
  document.querySelectorAll('[data-trat]').forEach((enlace) => {
    enlace.addEventListener('click', () => { form.elements.tratamiento.value = enlace.dataset.trat; });
  });

  function mostrar(tipo, texto, lista) {
    estado.hidden = false;
    estado.className = `estado estado-${tipo}`;
    estado.setAttribute('role', tipo === 'ok' ? 'status' : 'alert');
    estado.replaceChildren();
    const p = document.createElement('p');
    p.textContent = texto;
    estado.append(p);
    if (lista && lista.length) {
      const ul = document.createElement('ul');
      lista.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
      estado.append(ul);
    }
    estado.focus();
  }

  let enviando = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando) return; // segundo clic mientras se envía
    enviando = true;
    boton.setAttribute('aria-disabled', 'true'); // no se usa «disabled» para no perder el foco
    boton.textContent = 'Enviando…';
    const datos = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const [a, m, d] = datos.fecha.split('-').map(Number);
        const dia = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(a, m - 1, d));
        form.reset();
        revisarFecha();
        mostrar('ok', `¡Listo, ${datos.nombre}! Recibimos tu solicitud de ${NOMBRES[datos.tratamiento] || 'cita'} para el ${dia} a las ${datos.hora}. Todavía no es una cita confirmada: te llamaremos o escribiremos para confirmarla.`);
      } else {
        mostrar('error', j.error || 'No pudimos enviar tu solicitud. Intenta de nuevo o llámanos.', j.errores ? Object.values(j.errores) : null);
      }
    } catch {
      mostrar('error', 'No hay conexión con el servidor. Tus datos siguen en el formulario: intenta de nuevo en un momento o llámanos.');
    } finally {
      enviando = false;
      boton.removeAttribute('aria-disabled');
      boton.textContent = textoBoton;
    }
  });
})();
