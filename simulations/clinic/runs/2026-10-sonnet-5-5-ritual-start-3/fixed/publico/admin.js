(() => {
  const $ = (id) => document.getElementById(id);
  const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
  const TRATAMIENTOS = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
  let filtro = '';
  let busqueda = '';
  let mostradas = 0;
  let coinciden = 0;
  let conteo = { total: 0, pendiente: 0, confirmada: 0, cancelada: 0 };

  // Crea elementos con textContent: nunca interpreta lo que escribió el visitante como HTML.
  function el(tag, props = {}, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'texto') e.textContent = v;
      else if (k === 'clase') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    e.append(...hijos);
    return e;
  }

  async function api(ruta, opciones = {}) {
    const resp = await fetch(ruta, {
      ...opciones,
      headers: { 'Content-Type': 'application/json' },
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    });
    const datos = await resp.json().catch(() => ({}));
    return { ok: resp.ok, estado: resp.status, datos };
  }

  function verLogin(mensaje = '') {
    $('panel').hidden = true;
    $('login').hidden = false;
    $('err-login').textContent = mensaje;
    $('contrasena').focus();
  }
  function verPanel() {
    $('login').hidden = true;
    $('panel').hidden = false;
  }

  $('form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const boton = $('entrar');
    if (boton.getAttribute('aria-disabled')) return;
    boton.setAttribute('aria-disabled', 'true');
    boton.textContent = 'Entrando…';
    $('err-login').textContent = '';
    try {
      const r = await api('/api/admin/login', { method: 'POST', body: { contrasena: $('contrasena').value } });
      if (r.ok) {
        $('contrasena').value = '';
        await cargar(true);
      } else {
        $('err-login').textContent = r.datos.error || 'No se pudo entrar.';
        $('contrasena').select();
        $('contrasena').focus();
      }
    } catch {
      $('err-login').textContent = 'No hay conexión con el servidor.';
    } finally {
      boton.removeAttribute('aria-disabled');
      boton.textContent = 'Entrar';
    }
  });

  $('salir').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    verLogin();
  });

  function dibujarFiltros() {
    const opciones = [['', `Todas (${conteo.total})`], ['pendiente', `Pendientes (${conteo.pendiente})`],
      ['confirmada', `Confirmadas (${conteo.confirmada})`], ['cancelada', `Canceladas (${conteo.cancelada})`]];
    $('filtros').replaceChildren(...opciones.map(([valor, texto]) =>
      el('button', {
        type: 'button', clase: 'boton boton-sec boton-chico', texto, 'aria-pressed': String(filtro === valor),
        onclick: async () => {
          filtro = valor;
          await cargar(false);
          $('filtros').querySelector('[aria-pressed="true"]')?.focus(); // los botones se redibujan
        },
      })));
  }

  function formatoDia(f) {
    const [y, m, d] = f.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return Number.isNaN(fecha.getTime()) ? f
      : fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function tarjeta(c) {
    const etiqueta = el('span', { clase: `etiqueta ${c.estado}`, texto: ETIQUETA[c.estado] || c.estado });
    const nota = el('span', { clase: 'nota', role: 'status' });
    const art = el('article', { clase: `solicitud estado-${c.estado}` });

    async function cambiar(estado) {
      nota.textContent = 'Guardando…';
      const r = await api(`/api/admin/citas/${encodeURIComponent(c.id)}/estado`, { method: 'POST', body: { estado } }).catch(() => null);
      if (!r || !r.ok) { nota.textContent = (r && r.datos.error) || 'No se pudo guardar. Inténtalo de nuevo.'; return; }
      c.estado = estado;
      art.className = `solicitud estado-${estado}`;
      etiqueta.className = `etiqueta ${estado}`;
      etiqueta.textContent = ETIQUETA[estado];
      nota.textContent = `Guardado: ${ETIQUETA[estado].toLowerCase()}.`;
      conteo = r.datos.conteo;
      dibujarFiltros();
    }
    async function eliminar() {
      if (!confirm(`¿Eliminar la solicitud de ${c.nombre}? No se puede deshacer.`)) return;
      const r = await api(`/api/admin/citas/${encodeURIComponent(c.id)}`, { method: 'DELETE' }).catch(() => null);
      if (!r || !r.ok) { nota.textContent = (r && r.datos.error) || 'No se pudo eliminar.'; return; }
      art.remove();
      mostradas--; coinciden--;
      $('resumen').textContent = coinciden ? `Mostrando ${mostradas} de ${coinciden}.` : '';
      conteo = r.datos.conteo;
      dibujarFiltros();
      $('titulo-lista').focus(); // la tarjeta con el foco desapareció
    }

    art.append(
      el('h3', { texto: c.nombre || '(sin nombre)' }), ' ', etiqueta,
      el('p', {}, el('strong', { texto: TRATAMIENTOS[c.tratamiento] || c.tratamiento })),
      el('p', { texto: `${formatoDia(c.fecha)} · ${c.hora}` }),
      el('p', {}, 'Tel. ', el('a', { href: `tel:${c.telefono.replace(/[^\d+]/g, '')}`, texto: c.telefono }),
        ' · ', el('a', { href: `mailto:${c.correo}`, texto: c.correo })),
      c.comentario ? el('p', { texto: `Comentario: ${c.comentario}` }) : '',
      el('p', { clase: 'recibida', texto: `Recibida el ${new Date(c.creada).toLocaleString('es')}` }),
      el('div', { clase: 'acciones' },
        el('button', { type: 'button', clase: 'boton boton-chico', texto: 'Confirmar', onclick: () => cambiar('confirmada') }),
        el('button', { type: 'button', clase: 'boton boton-sec boton-chico', texto: 'Cancelar', onclick: () => cambiar('cancelada') }),
        el('button', { type: 'button', clase: 'boton boton-peligro boton-chico', texto: 'Eliminar', onclick: eliminar }),
        nota),
    );
    return art;
  }

  function consulta(desde) {
    const p = new URLSearchParams();
    if (filtro) p.set('estado', filtro);
    if (busqueda) p.set('q', busqueda);
    if (desde) p.set('desde', String(desde));
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  // anexar = true: añade la página siguiente sin borrar lo que ya se ve.
  async function cargar(primera, anexar = false) {
    let r;
    try {
      r = await api(`/api/admin/citas${consulta(anexar ? mostradas : 0)}`);
    } catch {
      if (primera) verLogin('No hay conexión con el servidor.');
      else $('resumen').textContent = 'No hay conexión con el servidor.';
      return;
    }
    if (r.estado === 401) return verLogin(primera ? '' : 'Tu sesión terminó. Entra de nuevo.');
    if (!r.ok) return verLogin(r.datos.error || 'Error inesperado.');
    verPanel();
    conteo = r.datos.conteo;
    coinciden = r.datos.coinciden;
    dibujarFiltros();
    $('aviso').hidden = !r.datos.danadas;
    $('aviso').textContent = r.datos.danadas
      ? `${r.datos.danadas} línea(s) dañadas del archivo de citas se copiaron a datos/lineas-danadas.txt.` : '';
    const tarjetas = r.datos.citas.map(tarjeta);
    if (anexar) { $('lista').append(...tarjetas); mostradas += tarjetas.length; }
    else {
      mostradas = tarjetas.length;
      $('lista').replaceChildren(...(tarjetas.length ? tarjetas : [el('p', { texto: 'No hay solicitudes en esta vista.' })]));
    }
    $('resumen').textContent = coinciden ? `Mostrando ${mostradas} de ${coinciden}, las más nuevas primero.` : '';
    $('mas').hidden = mostradas >= coinciden;
    const lote = $('borrar-lote');
    lote.hidden = !(filtro || busqueda) || !coinciden;
    lote.textContent = `Eliminar las ${coinciden} solicitudes de esta vista`;
  }

  $('buscar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    busqueda = $('q').value.trim();
    cargar(false);
  });
  $('mas').addEventListener('click', () => cargar(false, true));
  $('borrar-lote').addEventListener('click', async () => {
    const que = [filtro && `estado «${ETIQUETA[filtro].toLowerCase()}»`, busqueda && `búsqueda «${busqueda}»`].filter(Boolean).join(' y ');
    if (!confirm(`¿Eliminar las ${coinciden} solicitudes con ${que}? No se puede deshacer.`)) return;
    const r = await api('/api/admin/citas/eliminar', { method: 'POST', body: { estado: filtro, q: busqueda } }).catch(() => null);
    if (!r || !r.ok) { $('resumen').textContent = (r && r.datos.error) || 'No se pudo eliminar.'; return; }
    await cargar(false);
    $('resumen').textContent = `Se eliminaron ${r.datos.eliminadas} solicitudes.`;
    $('titulo-lista').focus();
  });

  cargar(true);
})();
