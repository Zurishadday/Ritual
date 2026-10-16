// Formulario de cita (la página también funciona sin este archivo: el formulario se envía normal).
const CIERRE = 18 * 60;
const form = document.getElementById('formulario');
const boton = document.getElementById('enviar');
const resumen = document.getElementById('resumen-errores');
const exito = document.getElementById('exito');
const selTrat = document.getElementById('tratamiento');
const selHora = document.getElementById('hora');
const inpFecha = document.getElementById('fecha');
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora', 'comentario'];
const ETIQUETAS = { nombre: 'Nombre', telefono: 'Teléfono', correo: 'Correo', tratamiento: 'Tratamiento', fecha: 'Día', hora: 'Hora', comentario: 'Comentario' };
const TEL_TEXTO = '55 0000 0000';

const pad = (n) => String(n).padStart(2, '0');
const hoy = new Date();
inpFecha.min = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;

// Las horas que no alcanzan antes de las 18:00 se deshabilitan según el tratamiento
function ajustarHoras() {
  const min = Number(selTrat.selectedOptions[0]?.dataset.min || 0);
  for (const o of selHora.options) {
    if (!o.value) continue;
    const [h, m] = o.value.split(':').map(Number);
    o.disabled = min > 0 && h * 60 + m + min > CIERRE;
  }
  if (selHora.selectedOptions[0]?.disabled) selHora.value = '';
}
selTrat.addEventListener('change', ajustarHoras);

function esFinDeSemana(valor) {
  const [a, m, d] = valor.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia === 0 || dia === 6;
}

function limpiarErrores() {
  resumen.hidden = true;
  resumen.textContent = '';
  for (const c of CAMPOS) {
    const el = form.elements[c];
    document.getElementById('error-' + c).textContent = '';
    el.removeAttribute('aria-invalid');
    el.closest('.campo').classList.remove('con-error');
  }
}

function mostrarErrores(errores) {
  const claves = CAMPOS.filter((c) => errores[c]);
  for (const c of claves) {
    const el = form.elements[c];
    document.getElementById('error-' + c).textContent = errores[c];
    el.setAttribute('aria-invalid', 'true');
    el.closest('.campo').classList.add('con-error');
  }
  resumen.textContent = '';
  const t = document.createElement('strong');
  t.textContent = claves.length === 1 ? 'Hay 1 dato por corregir:' : `Hay ${claves.length} datos por corregir:`;
  const ul = document.createElement('ul');
  for (const c of claves) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + c;
    a.textContent = `${ETIQUETAS[c]}: ${errores[c]}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      form.elements[c].focus();
    });
    li.append(a);
    ul.append(li);
  }
  resumen.append(t, ul);
  resumen.hidden = false;
  resumen.focus();
  resumen.scrollIntoView({ block: 'center' });
}

function validarLocal() {
  const e = {};
  const v = (n) => form.elements[n].value.trim();
  if (v('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
  const dig = v('telefono').replace(/\D/g, '').length;
  if (dig < 8 || dig > 15) e.telefono = 'Escribe un teléfono válido, por ejemplo 55 1234 5678.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('correo'))) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (!v('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
  if (!v('fecha')) e.fecha = 'Elige un día.';
  else if (v('fecha') < inpFecha.min) e.fecha = 'Ese día ya pasó.';
  else if (esFinDeSemana(v('fecha'))) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
  if (!v('hora')) e.hora = 'Elige una hora entre las 9:00 y las 18:00.';
  return e;
}

let enviando = false;
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return; // doble clic: el botón sigue enabled (no pierde el foco), solo se ignora
  limpiarErrores();
  const locales = validarLocal();
  if (Object.keys(locales).length) return mostrarErrores(locales);

  enviando = true;
  const textoOriginal = boton.textContent;
  boton.setAttribute('aria-busy', 'true');
  boton.textContent = 'Enviando…';
  try {
    const r = await fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)),
    });
    let datos = {};
    try {
      datos = await r.json();
    } catch {}
    if (r.ok) {
      const nombre = form.elements.nombre.value.trim().split(/\s+/)[0];
      exito.textContent = '';
      const h = document.createElement('h3');
      h.textContent = `¡Listo, ${nombre}! Recibimos tu solicitud.`;
      const p1 = document.createElement('p');
      p1.textContent = datos.resumen ? `Pediste: ${datos.resumen}.` : '';
      const p2 = document.createElement('p');
      p2.textContent = 'Te llamaremos para confirmar tu cita. Todavía no está confirmada hasta que hablemos contigo.';
      const otra = document.createElement('button');
      otra.type = 'button';
      otra.className = 'boton boton-claro';
      otra.textContent = 'Pedir otra cita';
      otra.addEventListener('click', () => {
        exito.hidden = true;
        form.hidden = false;
        form.elements.nombre.focus();
      });
      exito.append(h, p1, p2, otra);
      form.reset();
      ajustarHoras();
      form.hidden = true;
      exito.hidden = false;
      exito.focus();
      exito.scrollIntoView({ block: 'center' });
    } else if (r.status === 422 && datos.errores) {
      mostrarErrores(datos.errores);
    } else {
      resumen.textContent = datos.error || `No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos al ${TEL_TEXTO}.`;
      resumen.hidden = false;
      resumen.focus();
    }
  } catch {
    resumen.textContent = `No hay conexión con el servidor. Tus datos siguen aquí: inténtalo de nuevo o llámanos al ${TEL_TEXTO}.`;
    resumen.hidden = false;
    resumen.focus();
  } finally {
    enviando = false;
    boton.removeAttribute('aria-busy');
    boton.textContent = textoOriginal;
  }
});
