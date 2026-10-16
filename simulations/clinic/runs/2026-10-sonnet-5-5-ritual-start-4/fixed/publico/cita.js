// Formulario de citas. Si este archivo no carga, el formulario sigue funcionando
// con el envío normal del navegador (el servidor valida igual).
const form = document.getElementById('form-cita');
const estado = document.getElementById('estado');
const boton = document.getElementById('enviar');
const textoBoton = boton.textContent;
const CAMPOS = ['nombre', 'telefono', 'correo', 'tratamiento', 'fecha', 'hora', 'comentario'];
let enviando = false;

form.noValidate = true; // los avisos los mostramos nosotros, junto a cada campo

const dosDigitos = (n) => String(n).padStart(2, '0');
const hoy = new Date();
const hoyTexto = `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;
form.fecha.min = hoyTexto;

// Las horas disponibles dependen de cuánto dura el tratamiento: la sesión debe terminar antes de las 18:00.
function pintarHoras() {
  const minutos = Number(form.tratamiento.selectedOptions[0]?.dataset.duracion) || 30;
  const elegida = form.hora.value;
  form.hora.length = 1;
  for (let t = 9 * 60; t + minutos <= 18 * 60; t += 30) {
    const texto = `${dosDigitos(Math.floor(t / 60))}:${dosDigitos(t % 60)}`;
    form.hora.add(new Option(texto, texto));
  }
  form.hora.value = elegida; // si ya no existe, queda en "Elige una hora"
}
form.tratamiento.addEventListener('change', pintarHoras);
pintarHoras();

function mostrarErrores(errores) {
  for (const c of CAMPOS) {
    document.getElementById('err-' + c).textContent = errores[c] || '';
    if (errores[c]) form[c].setAttribute('aria-invalid', 'true'); else form[c].removeAttribute('aria-invalid');
  }
}

function validarLocal() {
  const e = {};
  const v = (c) => form[c].value.trim();
  if (v('nombre').length < 2) e.nombre = 'Escribe tu nombre.';
  if (v('telefono').replace(/\D/g, '').length < 8) e.telefono = 'Escribe un teléfono válido, con al menos 8 números.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('correo'))) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (!v('tratamiento')) e.tratamiento = 'Elige un tratamiento.';
  if (!v('fecha')) e.fecha = 'Elige un día.';
  else {
    const [a, m, d] = v('fecha').split('-').map(Number);
    const dia = new Date(a, m - 1, d).getDay();
    if (dia === 0 || dia === 6) e.fecha = 'Atendemos de lunes a viernes. Elige otro día.';
    else if (v('fecha') < hoyTexto) e.fecha = 'Ese día ya pasó. Elige uno a partir de hoy.';
  }
  if (!v('hora')) e.hora = 'Elige una hora.';
  return e;
}

function mostrarEstado(tipo, texto) {
  estado.className = 'estado ' + tipo;
  estado.textContent = texto;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (enviando) return;
  const local = validarLocal();
  mostrarErrores(local);
  const primero = CAMPOS.find((c) => local[c]);
  if (primero) {
    mostrarEstado('mal', 'Revisa los campos marcados en rojo.');
    form[primero].focus();
    return;
  }
  enviando = true;
  boton.setAttribute('aria-disabled', 'true'); // no se desactiva de verdad para no perder el foco
  boton.textContent = 'Enviando…';
  mostrarEstado('', 'Enviando tu solicitud…');
  try {
    const datos = Object.fromEntries(new FormData(form));
    const resp = await fetch('/api/citas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
    const cuerpo = await resp.json().catch(() => ({}));
    if (resp.ok) {
      form.reset();
      pintarHoras();
      mostrarErrores({});
      mostrarEstado('ok', cuerpo.mensaje || 'Recibimos tu solicitud.');
      estado.focus();
    } else if (cuerpo.errores) {
      mostrarErrores(cuerpo.errores);
      mostrarEstado('mal', cuerpo.error || 'Revisa los campos marcados en rojo.');
      form[CAMPOS.find((c) => cuerpo.errores[c])]?.focus();
    } else {
      mostrarEstado('mal', cuerpo.error || 'No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos.');
      estado.focus();
    }
  } catch {
    mostrarEstado('mal', 'No pudimos conectar con el servidor. Tus datos siguen aquí: inténtalo de nuevo o llámanos.');
    estado.focus();
  } finally {
    enviando = false;
    boton.removeAttribute('aria-disabled');
    boton.textContent = textoBoton;
  }
});
