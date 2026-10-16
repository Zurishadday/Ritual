(() => {
  const $ = (id) => document.getElementById(id);
  const NOMBRES = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
  const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
  const NOMBRE_FILTRO = { todas: 'todas', pendiente: 'pendientes', confirmada: 'confirmadas', cancelada: 'canceladas' };
  // El servidor entrega las solicitudes de 50 en 50; aquí solo se dibuja la página actual.
  let pagina = 1, paginas = 1, total = 0, citas = [];

  async function pedir(url, opciones = {}) {
    const r = await fetch(url, { ...opciones, headers: { 'Content-Type': 'application/json' } });
    const cuerpo = await r.json().catch(() => ({}));
    return { ok: r.ok, estado: r.status, cuerpo };
  }

  function mostrar(vista) {
    $('vista-login').hidden = vista !== 'login';
    $('vista-panel').hidden = vista !== 'panel';
  }

  function aviso(texto, tipo = 'ok') {
    const a = $('aviso');
    a.className = 'mensaje ' + tipo;
    a.textContent = texto;
    a.hidden = false;
  }

  const consulta = () => new URLSearchParams({ estado: $('filtro').value, q: $('buscar').value.trim() });

  async function cargar() {
    const p = consulta(); p.set('pagina', String(pagina));
    const r = await pedir('/api/admin/citas?' + p);
    if (r.estado === 401) { mostrar('login'); $('clave').focus(); return false; }
    if (!r.ok) { mostrar('panel'); aviso('No se pudieron cargar las solicitudes. Recarga la página.', 'mal'); return false; }
    ({ citas, total, pagina, paginas } = r.cuerpo);
    mostrar('panel');
    pintar(r.cuerpo.cuentas);
    return true;
  }

  function fechaBonita(f) {
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function linea(texto, ...nodos) { const p = document.createElement('p'); p.append(texto, ...nodos); return p; }
  function enlace(href, texto) { const a = document.createElement('a'); a.href = href; a.textContent = texto; return a; }
  function boton(texto, clase, accion, id, pulsado) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'boton ' + clase; b.textContent = texto;
    b.dataset.id = id; b.dataset.accion = accion;
    if (pulsado !== undefined) b.setAttribute('aria-pressed', String(pulsado));
    return b;
  }

  function pintar(cuentas) {
    $('conteo').textContent = `${total} coinciden · ${cuentas.pendiente} pendientes · ${cuentas.todas} en total`;
    $('pagina').textContent = `Página ${pagina} de ${paginas}`;
    $('nuevas').disabled = pagina <= 1;
    $('viejas').disabled = pagina >= paginas;
    const borrar = $('eliminar-todas');
    borrar.hidden = total === 0;
    borrar.textContent = `Eliminar las ${total} solicitudes que coinciden…`;
    const ul = $('lista');
    ul.replaceChildren();
    if (!citas.length) {
      const li = document.createElement('li');
      li.textContent = cuentas.todas ? 'No hay solicitudes con ese filtro.' : 'Todavía no hay solicitudes.';
      ul.append(li);
      return;
    }
    const filas = document.createDocumentFragment();
    for (const c of citas) {
      const li = document.createElement('li');
      li.className = 'cita ' + c.estado;
      const h = document.createElement('h2');
      const et = document.createElement('span');
      et.className = 'etiqueta'; et.textContent = ETIQUETA[c.estado];
      h.append(`${fechaBonita(c.fecha)}, ${c.hora} `, et);
      li.append(h,
        linea(`${c.nombre} · ${NOMBRES[c.tratamiento] || c.tratamiento}`),
        linea('Tel: ', enlace('tel:' + c.telefono.replace(/[^\d+]/g, ''), c.telefono), ' · ', enlace('mailto:' + c.correo, c.correo)));
      if (c.comentario) li.append(linea('Comentario: ' + c.comentario));
      li.append(linea('Recibida: ' + new Date(c.creada).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })));
      const ac = document.createElement('div');
      ac.className = 'acciones';
      ac.append(
        boton('Confirmar', 'secundario', 'confirmada', c.id, c.estado === 'confirmada'),
        boton('Cancelar', 'peligro', 'cancelada', c.id, c.estado === 'cancelada'),
        boton('Eliminar', 'secundario', 'eliminar', c.id));
      li.append(ac);
      filas.append(li);
    }
    ul.append(filas);
  }

  function enfocar(id, accion) {
    const b = document.querySelector(`[data-id="${id}"][data-accion="${accion}"]`);
    (b || $('filtro')).focus();
  }

  $('lista').addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    const { id, accion } = b.dataset;
    const cita = citas.find((c) => c.id === id);
    if (!cita) return;
    if (accion === 'eliminar') {
      if (!confirm(`¿Eliminar para siempre la solicitud de ${cita.nombre}? No se puede deshacer.`)) return;
      const r = await pedir('/api/admin/citas/' + id, { method: 'DELETE' });
      if (r.ok || r.estado === 404) { await cargar(); aviso(`Solicitud de ${cita.nombre} eliminada.`); $('filtro').focus(); }
      else aviso(r.cuerpo.mensaje || 'No se pudo eliminar. Intenta de nuevo.', 'mal');
      return;
    }
    const r = await pedir('/api/admin/citas/' + id, { method: 'PATCH', body: JSON.stringify({ estado: accion }) });
    if (r.estado === 401) { mostrar('login'); $('clave').focus(); return; }
    if (!r.ok) { aviso(r.cuerpo.mensaje || 'No se pudo guardar el cambio. Intenta de nuevo.', 'mal'); return; }
    if (await cargar()) { aviso(`Solicitud de ${cita.nombre} marcada como ${ETIQUETA[accion].toLowerCase()}.`); enfocar(id, accion); }
  });

  $('eliminar-todas').addEventListener('click', async () => {
    const q = $('buscar').value.trim(), est = $('filtro').value;
    const que = `${total} solicitudes (${NOMBRE_FILTRO[est]}${q ? ` que contienen «${q}»` : ''})`;
    if (!confirm(`¿Eliminar para siempre ${que}? No se puede deshacer.`)) return;
    const r = await pedir('/api/admin/citas?' + consulta(), { method: 'DELETE' });
    if (r.estado === 401) { mostrar('login'); $('clave').focus(); return; }
    if (!r.ok) { aviso(r.cuerpo.mensaje || 'No se pudo eliminar. Intenta de nuevo.', 'mal'); return; }
    pagina = 1;
    await cargar();
    aviso(`${r.cuerpo.eliminadas} solicitudes eliminadas.`);
    $('filtro').focus();
  });

  const cambiarFiltro = () => { pagina = 1; cargar(); };
  $('filtro').addEventListener('change', cambiarFiltro);
  let espera;
  $('buscar').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(cambiarFiltro, 300); });
  $('nuevas').addEventListener('click', () => { pagina--; cargar(); });
  $('viejas').addEventListener('click', () => { pagina++; cargar(); });

  $('form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('error-login');
    err.textContent = '';
    if (!$('clave').value) { err.textContent = 'Escribe la contraseña.'; $('clave').focus(); return; }
    const r = await pedir('/api/admin/entrar', { method: 'POST', body: JSON.stringify({ clave: $('clave').value }) });
    if (!r.ok) { err.textContent = r.cuerpo.mensaje || 'No se pudo entrar.'; $('clave').select(); return; }
    $('clave').value = '';
    await cargar();
    $('filtro').focus();
  });

  $('salir').addEventListener('click', async () => {
    await pedir('/api/admin/salir', { method: 'POST' });
    citas = [];
    mostrar('login');
    $('clave').focus();
  });

  cargar();
})();
