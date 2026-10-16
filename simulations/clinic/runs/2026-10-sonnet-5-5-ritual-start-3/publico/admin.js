(() => {
  const $ = (id) => document.getElementById(id);
  const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
  const TRATAMIENTOS = { rodilla: 'Rehabilitación de rodilla', espalda: 'Dolor de espalda', masaje: 'Masaje deportivo' };
  let filtro = '';
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

  async function cargar(primera) {
    let r;
    try {
      r = await api(`/api/admin/citas${filtro ? `?estado=${filtro}` : ''}`);
    } catch {
      if (primera) verLogin('No hay conexión con el servidor.');
      return;
    }
    if (r.estado === 401) return verLogin(primera ? '' : 'Tu sesión terminó. Entra de nuevo.');
    if (!r.ok) return verLogin(r.datos.error || 'Error inesperado.');
    verPanel();
    conteo = r.datos.conteo;
    dibujarFiltros();
    const avisos = [];
    if (r.datos.danadas) avisos.push(`${r.datos.danadas} línea(s) del archivo de citas están dañadas y se ignoraron. Revisa datos/citas.jsonl.`);
    if (r.datos.coinciden > r.datos.mostradas) avisos.push(`Se muestran las ${r.datos.mostradas} más recientes de ${r.datos.coinciden}. Elimina las que ya no necesites.`);
    $('aviso').hidden = !avisos.length;
    $('aviso').textContent = avisos.join(' ');
    $('lista').replaceChildren(...(r.datos.citas.length
      ? r.datos.citas.map(tarjeta)
      : [el('p', { texto: 'No hay solicitudes en esta vista.' })]));
  }

  cargar(true);
})();
