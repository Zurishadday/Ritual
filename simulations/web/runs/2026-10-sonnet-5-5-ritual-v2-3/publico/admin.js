// Mejoras de la página de administración (funciona sin esto, pero sin "marcar todos" ni confirmación).
const form = document.getElementById('form-borrar');
if (form) {
  const lugar = document.getElementById('marcar-todos-lugar');
  const cajas = () => [...form.querySelectorAll('input[name="id"]')];

  const etiqueta = document.createElement('label');
  const todos = document.createElement('input');
  todos.type = 'checkbox';
  etiqueta.append(todos, ' Marcar todos los de esta página');
  lugar.append(etiqueta);
  todos.addEventListener('change', () => cajas().forEach((c) => (c.checked = todos.checked)));

  form.addEventListener('submit', (ev) => {
    const n = cajas().filter((c) => c.checked).length;
    if (n === 0) return; // el servidor avisa que no se seleccionó nada
    const texto = n === 1 ? '¿Borrar 1 mensaje? No se puede deshacer.' : `¿Borrar ${n} mensajes? No se puede deshacer.`;
    if (!confirm(texto)) ev.preventDefault();
  });
}
