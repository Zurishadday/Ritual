// Panel de solicitudes. Todo el texto de los clientes se inserta con textContent (nunca como HTML).
(() => {
  const $ = (id) => document.getElementById(id);
  const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
  const FILTROS = { todas: 'Todas', pendiente: 'Pendientes', confirmada: 'Confirmadas', cancelada: 'Canceladas' };
  let citas = [];
  let filtro = 'todas';
  let enviandoLogin = false;
  let ocupado = false;

  async function api(ruta, opciones = {}) {
    const r = await fetch(ruta, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opciones });
    let cuerpo = {};
    try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
    return { ok: r.ok, status: r.status, cuerpo };
  }

  function el(etiqueta, clase, texto) {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // ---- Vistas ----
  function verLogin(mensaje) {
    $('vista-panel').hidden = true;
    $('btn-salir').hidden = true;
    $('vista-login').hidden = false;
    const err = $('error-login');
    err.hidden = !mensaje;
    err.textContent = mensaje || '';
    $('clave').focus();
  }
  function verPanel() {
    $('vista-login').hidden = true;
    $('vista-panel').hidden = false;
    $('btn-salir').hidden = false;
  }

  async function cargar({ enfocar = false } = {}) {
    const r = await api('/api/admin/citas');
    if (r.status === 401) return verLogin(enfocar ? '' : '');
    if (!r.ok) return anunciar('error', r.cuerpo.error || 'No se pudo cargar la lista. Intenta de nuevo.');
    citas = r.cuerpo.citas;
    const aviso = $('aviso-almacen');
    aviso.hidden = !r.cuerpo.aviso;
    aviso.textContent = r.cuerpo.aviso || '';
    verPanel();
    $('actualizado').textContent = 'Actualizado a las ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    pintar();
    if (enfocar) $('t-panel').focus();
  }

  // ---- Lista ----
  function contar(estado) { return estado === 'todas' ? citas.length : citas.filter((c) => c.estado === estado).length; }

  function pintarFiltros() {
    document.querySelectorAll('#filtros button').forEach((b) => {
      const f = b.dataset.filtro;
      b.textContent = `${FILTROS[f]} (${contar(f)})`;
      b.setAttribute('aria-pressed', String(f === filtro));
    });
  }

  function pintar() {
    pintarFiltros();
    const lista = $('lista');
    lista.replaceChildren();
    const q = $('buscar').value.trim().toLowerCase();
    const visibles = citas.filter((c) => (filtro === 'todas' || c.estado === filtro) &&
      (!q || `${c.nombre} ${c.telefono} ${c.correo}`.toLowerCase().includes(q)));
    if (!visibles.length) {
      lista.append(el('p', 'vacio', citas.length ? 'No hay solicitudes con este filtro.' : 'Todavía no hay solicitudes.'));
      return;
    }
    visibles.forEach((c) => lista.append(tarjeta(c)));
  }

  function fechaLarga(iso) {
    if (!iso) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  }

  function fila(etiqueta, contenido) {
    const f = el('div', 'fila');
    f.append(el('dt', '', etiqueta));
    const dd = el('dd');
    if (typeof contenido === 'string') dd.textContent = contenido; else dd.append(contenido);
    f.append(dd);
    return f;
  }

  function tarjeta(c) {
    const art = el('article', `cita cita-${c.estado}`);
    art.dataset.id = c.id;
    art.tabIndex = -1;

    const cab = el('div', 'cita-cab');
    cab.append(el('h2', 'cita-nombre', c.nombre));
    cab.append(el('span', `insignia insignia-${c.estado}`, ETIQUETA[c.estado]));
    art.append(cab);

    const dl = el('dl', 'cita-datos');
    dl.append(fila('Tratamiento', c.tratamientoNombre));
    dl.append(fila('Día y hora', `${fechaLarga(c.fecha)}, ${c.hora}`));
    const tel = el('a', '', c.telefono);
    tel.href = 'tel:' + c.telefono.replace(/[^\d+]/g, '');
    dl.append(fila('Teléfono', tel));
    const mail = el('a', '', c.correo);
    mail.href = 'mailto:' + c.correo;
    dl.append(fila('Correo', mail));
    if (c.comentario) dl.append(fila('Comentario', c.comentario));
    dl.append(fila('Recibida', new Date(c.creadaEn).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })));
    art.append(dl);

    const acc = el('div', 'cita-acciones');
    const boton = (texto, clase, fn) => {
      const b = el('button', `boton ${clase}`, texto);
      b.type = 'button';
      b.addEventListener('click', fn);
      acc.append(b);
    };
    if (c.estado !== 'confirmada') boton('Confirmar', '', () => cambiar(c, 'confirmada'));
    if (c.estado !== 'cancelada') boton('Cancelar', 'boton-borde', () => cambiar(c, 'cancelada'));
    if (c.estado !== 'pendiente') boton('Volver a pendiente', 'boton-borde', () => cambiar(c, 'pendiente'));
    boton('Eliminar', 'boton-peligro', () => eliminar(c));
    art.append(acc);
    return art;
  }

  function anunciar(tipo, texto) {
    const a = $('anuncio');
    a.hidden = false;
    a.className = `estado estado-${tipo}`;
    a.textContent = texto;
  }

  function sesionTerminada() { verLogin('Tu sesión terminó. Vuelve a entrar.'); }

  async function cambiar(c, estado) {
    if (ocupado) return;
    ocupado = true;
    try {
      const r = await api('/api/admin/citas/' + c.id, { method: 'PATCH', body: JSON.stringify({ estado }) });
      if (r.status === 401) return sesionTerminada();
      if (!r.ok) return anunciar('error', r.cuerpo.error || 'No se pudo guardar el cambio.');
      const i = citas.findIndex((x) => x.id === c.id);
      citas[i] = r.cuerpo.cita;
      // Se cambia solo esa tarjeta (aunque ya no cumpla el filtro) para que se vea el resultado donde estaba.
      const vieja = document.querySelector(`[data-id="${c.id}"]`);
      const nueva = tarjeta(r.cuerpo.cita);
      if (vieja) vieja.replaceWith(nueva); else pintar();
      pintarFiltros();
      anunciar('ok', `Solicitud de ${c.nombre}: ${ETIQUETA[estado].toLowerCase()}.`);
      nueva.focus();
    } catch {
      anunciar('error', 'No hay conexión con el servidor. Intenta de nuevo.');
    } finally {
      ocupado = false;
    }
  }

  async function eliminar(c) {
    if (ocupado) return;
    if (!confirm(`¿Eliminar la solicitud de ${c.nombre}? No se puede deshacer.`)) return;
    ocupado = true;
    try {
      const r = await api('/api/admin/citas/' + c.id, { method: 'DELETE' });
      if (r.status === 401) return sesionTerminada();
      if (!r.ok && r.status !== 404) return anunciar('error', r.cuerpo.error || 'No se pudo eliminar.');
      citas = citas.filter((x) => x.id !== c.id);
      pintar();
      anunciar('ok', `Solicitud de ${c.nombre} eliminada.`);
      $('anuncio').focus();
    } catch {
      anunciar('error', 'No hay conexión con el servidor. Intenta de nuevo.');
    } finally {
      ocupado = false;
    }
  }

  async function eliminarEnBloque(estado, plural) {
    if (ocupado) return;
    const n = contar(estado);
    if (!n) return anunciar('ok', `No hay solicitudes ${plural}.`);
    if (!confirm(`¿Eliminar las ${n} solicitudes ${plural}? No se puede deshacer.`)) return;
    ocupado = true;
    try {
      const r = await api('/api/admin/citas?estado=' + estado, { method: 'DELETE' });
      if (r.status === 401) return sesionTerminada();
      if (!r.ok) return anunciar('error', r.cuerpo.error || 'No se pudo eliminar.');
      ocupado = false;
      await cargar();
      anunciar('ok', `${r.cuerpo.borradas} solicitudes ${plural} eliminadas.`);
    } catch {
      anunciar('error', 'No hay conexión con el servidor. Intenta de nuevo.');
    } finally {
      ocupado = false;
    }
  }

  // ---- Eventos ----
  $('buscar').addEventListener('input', pintar);
  $('borrar-canceladas').addEventListener('click', () => eliminarEnBloque('cancelada', 'canceladas'));
  $('borrar-confirmadas').addEventListener('click', () => eliminarEnBloque('confirmada', 'confirmadas'));
  $('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviandoLogin) return;
    enviandoLogin = true;
    const boton = e.target.querySelector('button[type="submit"]');
    boton.setAttribute('aria-disabled', 'true');
    boton.textContent = 'Entrando…';
    try {
      const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ clave: $('clave').value }) });
      if (r.ok) {
        $('clave').value = '';
        await cargar({ enfocar: true });
      } else {
        const err = $('error-login');
        err.hidden = false;
        err.textContent = r.cuerpo.error || 'No se pudo entrar. Intenta de nuevo.';
        $('clave').focus();
        $('clave').select();
      }
    } catch {
      const err = $('error-login');
      err.hidden = false;
      err.textContent = 'No hay conexión con el servidor.';
    } finally {
      enviandoLogin = false;
      boton.removeAttribute('aria-disabled');
      boton.textContent = 'Entrar';
    }
  });

  $('filtros').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filtro]');
    if (!b) return;
    filtro = b.dataset.filtro;
    $('anuncio').hidden = true;
    pintar();
  });
  $('btn-actualizar').addEventListener('click', async () => {
    $('anuncio').hidden = true;
    await cargar();
  });
  $('btn-salir').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    citas = [];
    verLogin('');
  });

  cargar();
})();
