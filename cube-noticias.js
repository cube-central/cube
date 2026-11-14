/* Cube · capa de datos de Noticias (Supabase). Usa el cliente global window.cubeDb. */
(function () {
  const LOTE = 10;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const db = () => window.cubeDb;
  const uno = x => Array.isArray(x) ? x[0] : x;
  const dos = n => String(n).padStart(2, '0');

  function fecha(ts) {
    const d = new Date(ts);
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + dos(d.getHours()) + ':' + dos(d.getMinutes());
  }
  const rellenar = (txt, vars) => String(txt == null ? '' : txt).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null) ? vars[k] : m);

  let plantillasCache = null;
  async function plantillas() {
    if (plantillasCache) return plantillasCache;
    const { data, error } = await db().from('news_templates').select('id,structure');
    if (error) throw error;
    plantillasCache = {};
    (data || []).forEach(p => { plantillasCache[p.id] = p.structure || {}; });
    return plantillasCache;
  }
  // título/resumen/cuerpo propios; si faltan, salen de la plantilla + variables
  function textos(n, pl) {
    const st = (n.template_id && pl[n.template_id]) || {}, v = n.variables || {};
    return {
      t: n.title || rellenar(st.title, v),
      r: n.summary || rellenar(st.summary, v),
      b: n.body || rellenar(st.body, v)
    };
  }

  // Lista paginada: solo publicadas y vigentes, de más nueva a más vieja
  async function cargar(desde) {
    const { data, error } = await db().from('news')
      .select('id,title,summary,template_id,variables,category,importance,tone,seed,image_url,published_at')
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false }).order('id')
      .range(desde || 0, (desde || 0) + LOTE - 1);
    if (error) throw error;
    const rows = data || [];
    const pl = rows.some(n => n.template_id) ? await plantillas() : {};
    return rows.map(n => {
      const x = textos(n, pl);
      return { id: n.id, f: fecha(n.published_at), t: x.t, r: x.r, tono: n.tone, s: n.seed, img: n.image_url, cat: n.category, imp: n.importance };
    });
  }

  // Detalle bajo demanda: cuerpo, opciones y (si hay sesión) la decisión ya tomada
  async function detalle(id) {
    const { data: n, error } = await db().from('news')
      .select('title,summary,body,template_id,variables,news_choices(id,label,position)').eq('id', id).single();
    if (error) throw error;
    const pl = n.template_id ? await plantillas() : {};
    const x = textos(n, pl);
    const out = { b: x.b, opciones: (n.news_choices || []).slice().sort((a, b) => a.position - b.position), decision: null };
    const u = window.usuario && window.usuario();
    if (u) {
      const { data: d } = await db().from('user_decisions')
        .select('choice_id,news_choices(label,news_outcomes(text,effect))').eq('news_id', id).maybeSingle();
      if (d) {
        const c = uno(d.news_choices) || {}, o = uno(c.news_outcomes) || {};
        out.decision = { choice_id: d.choice_id, opcion: c.label || '', texto: o.text || '', efecto: o.effect || null };
      }
    }
    return out;
  }

  // Guarda la decisión (una por noticia; si ya existía, simplemente la devuelve)
  async function elegir(newsId, choiceId) {
    const { error } = await db().from('user_decisions').insert({ news_id: newsId, choice_id: choiceId });
    if (error && error.code !== '23505') throw error;
    return detalle(newsId);
  }

  // Historial completo de decisiones del usuario con sus resultados
  async function historial() {
    const { data, error } = await db().from('user_decisions')
      .select('news_id,created_at,news_choices(label,news_outcomes(text,effect)),news(title)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  window.cubeNoticias = { LOTE, cargar, detalle, elegir, historial };
})();
