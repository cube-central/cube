/* cube-tema.js — tema compartido de Cube (Light · Dark · Live)
   Se incluye UNA vez en el <head> de cada página:  <script src="cube-tema.js"></script>
   - Light (predeterminado): tema claro.
   - Dark: tema oscuro.
   - Live: claro de día y oscuro de noche, según la hora local del dispositivo del usuario.
   La elección se guarda en localStorage ("cube_tema"), así que vale para todas las páginas
   del mismo sitio (cube.html, cube-obtener.html, inventario.html, lotes.html...). */
(function () {
  'use strict';
  var KEY = 'cube_tema';
  var NOCHE_DESDE = 19;   // 19:00
  var NOCHE_HASTA = 6;    // 06:00
  var raiz = document.documentElement;

  function preferencia() {
    try {
      var t = localStorage.getItem(KEY);
      return (t === 'dark' || t === 'live' || t === 'light') ? t : 'light';
    } catch (e) { return 'light'; }
  }
  function esNoche() {
    var h = new Date().getHours();
    return h >= NOCHE_DESDE || h < NOCHE_HASTA;
  }
  function efectivo(pref) {
    if (pref === 'live') return esNoche() ? 'dark' : 'light';
    return pref === 'dark' ? 'dark' : 'light';
  }

  var actual = null;
  function aplicar() {
    var pref = preferencia(), ef = efectivo(pref);
    raiz.setAttribute('data-tema-pref', pref);
    raiz.setAttribute('data-tema', ef);
    raiz.style.colorScheme = ef;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', ef === 'dark' ? '#111313' : '#ECECEC');
    if (actual !== ef) {
      actual = ef;
      try { window.dispatchEvent(new CustomEvent('cube:tema', { detail: { pref: pref, efectivo: ef } })); } catch (e) {}
    }
  }

  // Variables de color compartidas: las páginas que usan estos nombres cambian solas de tema.
  var css =
    ':root[data-tema="light"]{--fondo:#ECECEC;--panel:#FFFFFF;--tarjeta:#FFFFFF;--texto:#0A0A0A;--texto-suave:#6B6F68;--tinta:#0A0A0A;--acento:#0A0A0A;--linea:#D6D8D3;--sutil:rgba(0,0,0,.06)}' +
    ':root[data-tema="dark"]{--fondo:#111313;--panel:#1D2220;--tarjeta:#1D2220;--texto:#F4F5F2;--texto-suave:#858D87;--tinta:#F4F5F2;--acento:#C6FF00;--linea:#2A302D;--sutil:rgba(244,245,242,.06)}' +
    ':root[data-tema]{--verde:#C6FF00;--negro:#0A0A0A}';
  var st = document.createElement('style');
  st.id = 'cube-tema-vars';
  st.textContent = css;
  (document.head || raiz).appendChild(st);

  aplicar();

  // Live: se revisa cada minuto y al volver a la pestaña.
  setInterval(function () { if (preferencia() === 'live') aplicar(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) aplicar(); });
  // Si el tema se cambia en otra pestaña o página, esta se actualiza sola.
  window.addEventListener('storage', function (e) { if (e.key === KEY) aplicar(); });

  window.cubeTema = {
    get: preferencia,                 // 'light' | 'dark' | 'live'
    efectivo: efectivo,               // 'light' | 'dark' (ya resuelto)
    esNoche: esNoche,
    set: function (t) {
      if (t !== 'light' && t !== 'dark' && t !== 'live') t = 'light';
      try { localStorage.setItem(KEY, t); } catch (e) {}
      aplicar();
    }
  };
})();
