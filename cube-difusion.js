/* Cube · Difusión de notificaciones.
   - Todos los usuarios: reciben los envíos del admin dentro de Cube (en vivo y al volver a abrir).
   - Solo el admin (is_news_admin): ve "Subir notificaciones" en su perfil y puede enviar las predeterminadas. */
(function () {
  const db = () => window.cubeDb;
  const usuario = () => window.usuario && window.usuario();
  const aviso = t => { if (window.cubeAviso) window.cubeAviso(t); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TIPOS = ['bienvenida', 'estreno', 'tv', 'evento', 'oferta', 'sistema'];
  const urlOk = u => (/^[\w\-./]+(\?[\w\-=&.]*)?(#[\w\-]*)?$/.test(u || '') && !/^javascript/i.test(u)) ? u : '';

  /* ---------- Recibir ---------- */
  function estado() {
    const u = usuario(); if (!u) return {};
    try { return JSON.parse(localStorage.getItem('cube_notif_' + u.email) || '{}'); } catch (e) { return {}; }
  }
  function nativa(b) {   // si Cube está en segundo plano y el usuario activó el push
    try {
      const est = estado();
      if (!(est.pushEnabled && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator)) return;
      navigator.serviceWorker.ready.then(reg => reg.showNotification(b.titulo, { body: b.texto, tag: 'bc-' + b.id, data: { url: urlOk(b.url) } }));
    } catch (e) {}
  }
  function recibir(b, vivo) {
    if (!usuario() || !window.cubeNotificar) return;
    const id = 'bc-' + b.id, est = estado();
    if ((est.borradas || []).includes(id)) return;              // el usuario ya la borró
    const ya = (est.items || []).some(n => n.id === id);
    const n = window.cubeNotificar({
      id, tipo: TIPOS.includes(b.tipo) ? b.tipo : 'sistema',
      titulo: esc(b.titulo), texto: esc(b.texto), url: urlOk(b.url), ts: Date.parse(b.created_at) || Date.now()
    });
    if (vivo && n && !ya) { aviso(b.titulo); if (document.hidden) nativa(b); }
  }
  async function importar() {   // envíos de los últimos 7 días que todavía no están en sus notificaciones
    if (!usuario() || !db()) return;
    try {
      const desde = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data } = await db().from('broadcasts').select('id,tipo,titulo,texto,url,created_at')
        .gte('created_at', desde).order('created_at', { ascending: true });
      (data || []).forEach(b => recibir(b, false));
    } catch (e) {}
  }
  let canal = null;
  function suscribir() {
    if (canal || !db()) return;
    try {
      canal = db().channel('cube-difusion')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, p => recibir(p.new, true))
        .subscribe();
    } catch (e) { canal = null; }
  }
  function cortar() { if (canal && db()) { try { db().removeChannel(canal); } catch (e) {} } canal = null; }

  /* ---------- Admin: panel "Subir notificaciones" ---------- */
  const ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M18 6a8 8 0 0 1 0 12"/></svg>';
  const FLECHA = '<svg class="opcion-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';
  let presets = [], elegida = null;

  (function estilos() {
    const s = document.createElement('style');
    s.textContent = `
#cdOverlay{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);animation:cdIn .25s ease both}
#cdOverlay[hidden]{display:none}
.cd-hoja{width:100%;max-width:480px;max-height:86svh;overflow:auto;padding:12px 6% calc(env(safe-area-inset-bottom,0px) + 22px);border-radius:26px 26px 0 0;background:var(--panel,#fff);color:var(--tinta,#0A0A0A);font-family:'Open Sans',sans-serif}
.cd-barra{width:42px;height:4px;margin:0 auto 14px;border-radius:9px;background:rgba(128,128,128,.4)}
.cd-hoja h2{font:700 1.15rem 'Poppins',sans-serif}
.cd-sub{margin-top:4px;font-size:.8rem;color:var(--texto-suave,#6d706a)}
.cd-lista{display:grid;gap:9px;margin-top:16px}
.cd-item{display:grid;gap:3px;width:100%;text-align:left;padding:13px 16px;border-radius:18px;background:var(--fondo,#f2f2f2);border:1.5px solid transparent;color:inherit}
.cd-item b{font:600 .92rem 'Poppins',sans-serif}
.cd-item span{font-size:.78rem;line-height:1.4;color:var(--texto-suave,#6d706a)}
.cd-prev{margin-top:16px;padding:14px 16px;border-radius:18px;background:var(--fondo,#f2f2f2);border:1.5px solid var(--verde,#C6FF00)}
.cd-prev b{display:block;font:600 .95rem 'Poppins',sans-serif}
.cd-prev span{display:block;margin-top:4px;font-size:.82rem;line-height:1.45;color:var(--texto-suave,#6d706a)}
.cd-btns{display:grid;gap:9px;margin-top:16px}
.cd-btn{height:46px;border-radius:999px;font:700 .88rem 'Poppins',sans-serif;background:var(--fondo,#f2f2f2);color:inherit}
.cd-btn.pri{background:var(--verde,#C6FF00);color:#0A0A0A}
.cd-btn:disabled{opacity:.55}
.cd-ok{padding:26px 0 6px;text-align:center}
.cd-ok b{display:block;font:700 1.1rem 'Poppins',sans-serif}
.cd-ok span{display:block;margin-top:6px;font-size:.84rem;color:var(--texto-suave,#6d706a)}
@keyframes cdIn{from{opacity:0}to{opacity:1}}`;
    document.head.appendChild(s);
  })();

  function hoja(html) { return '<div class="cd-hoja"><div class="cd-barra"></div>' + html + '</div>'; }
  function vistaLista(o) {
    o.innerHTML = hoja('<h2>Subir notificaciones</h2><p class="cd-sub">Toca una para enviarla a todos los usuarios.</p>' +
      '<div class="cd-lista">' + (presets.length
        ? presets.map((p, i) => `<button class="cd-item" type="button" data-cd="elegir" data-i="${i}"><b>${esc(p.titulo)}</b><span>${esc(p.texto)}</span></button>`).join('')
        : '<p class="cd-sub">No hay notificaciones predeterminadas.</p>') +
      '</div><div class="cd-btns"><button class="cd-btn" type="button" data-cd="cerrar">Cerrar</button></div>');
  }
  function vistaConfirmar(o) {
    o.innerHTML = hoja('<h2>¿Enviar a todos?</h2><p class="cd-sub">Les llegará a todos los usuarios de Cube.</p>' +
      `<div class="cd-prev"><b>${esc(elegida.titulo)}</b><span>${esc(elegida.texto)}</span></div>` +
      '<div class="cd-btns"><button class="cd-btn pri" type="button" data-cd="enviar">Enviar a todos</button><button class="cd-btn" type="button" data-cd="volver">Volver</button></div>');
  }
  function vistaListo(o) {
    o.innerHTML = hoja('<div class="cd-ok"><b>¡Enviada!</b><span>La notificación ya está llegando a todos los usuarios.</span></div>' +
      '<div class="cd-btns"><button class="cd-btn" type="button" data-cd="cerrar">Cerrar</button></div>');
  }
  async function abrirPanel() {
    if (window.cerrarModales) { try { window.cerrarModales(); } catch (e) {} }
    let o = document.getElementById('cdOverlay');
    if (!o) {
      o = document.createElement('div'); o.id = 'cdOverlay'; document.body.appendChild(o);
      o.addEventListener('click', clic);
    }
    o.hidden = false; vistaLista(o);
    try {
      const { data, error } = await db().from('notification_presets').select('id,tipo,titulo,texto,url').eq('activa', true).order('orden');
      if (error) throw error;
      presets = data || []; vistaLista(o);
    } catch (e) { aviso('No se pudieron cargar las notificaciones.'); }
  }
  async function clic(e) {
    const o = document.getElementById('cdOverlay');
    if (e.target === o) { o.hidden = true; return; }
    const b = e.target.closest('[data-cd]'); if (!b) return;
    const a = b.dataset.cd;
    if (a === 'cerrar') o.hidden = true;
    else if (a === 'volver') vistaLista(o);
    else if (a === 'elegir') { elegida = presets[+b.dataset.i]; if (elegida) vistaConfirmar(o); }
    else if (a === 'enviar' && elegida) {
      b.disabled = true; b.textContent = 'Enviando…';
      const { error } = await db().from('broadcasts').insert({
        preset_id: elegida.id, tipo: elegida.tipo, titulo: elegida.titulo, texto: elegida.texto, url: elegida.url
      });
      if (error) {
        b.disabled = false; b.textContent = 'Enviar a todos';
        aviso(/hace menos de 10 minutos/.test(error.message || '') ? 'Esa notificación ya se envió hace poco.' : 'No se pudo enviar la notificación.');
        return;
      }
      vistaListo(o);
    }
  }
  function ponerOpcion() {
    const cont = document.querySelector('#perfilModal .perfil-opciones');
    if (!cont || document.getElementById('irSubirNotif')) return;
    const b = document.createElement('button');
    b.className = 'perfil-opcion'; b.id = 'irSubirNotif'; b.type = 'button';
    b.innerHTML = '<span class="opcion-izq">' + ICONO + '<span>Subir notificaciones</span></span>' + FLECHA;
    b.onclick = abrirPanel;
    const ref = document.getElementById('irNotificaciones');
    if (ref && ref.parentNode === cont) ref.after(b); else cont.appendChild(b);
  }
  function quitarOpcion() { const b = document.getElementById('irSubirNotif'); if (b) b.remove(); }
  async function revisarAdmin() {
    let ok = false;
    try { const { data } = await db().rpc('is_news_admin'); ok = data === true; } catch (e) {}
    if (ok && usuario()) ponerOpcion(); else quitarOpcion();
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    if (!db()) return;
    if (usuario()) { importar(); suscribir(); revisarAdmin(); }
    else { cortar(); quitarOpcion(); }
  }
  window.addEventListener('cube:usuario-listo', iniciar);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && usuario()) importar(); });
  setInterval(() => { if (!document.hidden && usuario()) importar(); }, 5 * 60 * 1000);
  setTimeout(iniciar, 1500);

  // el enlace "cube.html#noticias" de una notificación abre directamente la sección Noticias
  window.addEventListener('load', () => {
    if (location.hash === '#noticias') { const n = document.getElementById('navNoticias'); if (n) setTimeout(() => n.click(), 400); }
  });
})();
