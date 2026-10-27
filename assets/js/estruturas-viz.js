/*
  Visualizações de estruturas de dados — núcleo compartilhado pelas aulas de Estruturas de Dados.
  Cada widget é um <div class="edviz" data-viz="nome" data-...></div> dentro de um slide.
  As aulas registram seus widgets em um arquivo próprio (assets/js/ed-viz/<aula>.js), carregado
  depois deste e antes de aula-interativa.js:
    EDViz.register('nome', (box, ds) => { ... });   // ds = box.dataset
  Peças prontas para montar os widgets:
    EDViz.player(box, { render(frame, stage) })  → controles passo a passo; .load(frames) troca os quadros.
        Cada quadro: { note: "texto", counts: { "comparações": 3 }, ...dados livres para o render }.
    EDViz.array(alvo, valores, { cls, tags, name, idx })   vetor com índices e marcadores (lo, mid, hi…)
    EDViz.bars(alvo, valores, { cls })                     barras para ordenação
    EDViz.chain(alvo, valores, { cls, tags, double, circular, end })  lista encadeada
    EDViz.tree(alvo, raiz, { left, right, key, cls, badge })  árvore binária em SVG
    EDViz.graph(alvo, { nodes, edges, directed, ncls, ecls, nbadge })  grafo em SVG
  cls e tags são objetos { índice: "classe" } ou funções. Estados prontos no CSS:
    on (atual), cmp (comparando), swap (trocando), done (pronto), found (encontrado), path (caminho), dim (apagado), new (novo).
*/
(function(){
'use strict';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pick = (m, k, x) => typeof m === 'function' ? m(k, x) : (m && m[k]) || '';
const NS = 'http://www.w3.org/2000/svg';

function el(tag, cls, html){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/* ---------- Passo a passo ---------- */
const SPEED = { 'lento': 1300, 'normal': 750, 'rápido': 300 };
function player(box, opt){
  const ctl = el('div', 'ev-ctl'), stage = el('div', 'ev-stage');
  const note = el('div', 'ev-note'); note.setAttribute('aria-live', 'polite');
  const bar = el('div', 'ev-play');
  bar.innerHTML =
    '<button type="button" class="ev-first" title="Voltar ao início">⏮</button>' +
    '<button type="button" class="ev-prev">◀ Voltar</button>' +
    '<button type="button" class="ev-next">Próximo passo ▶</button>' +
    '<button type="button" class="ev-auto">⏵ Animar</button>' +
    '<select class="ev-speed" aria-label="Velocidade">' + Object.keys(SPEED).map(k => '<option' + (k === 'normal' ? ' selected' : '') + '>' + k + '</option>').join('') + '</select>' +
    '<span class="ev-count"></span><span class="ev-counts"></span>';
  box.append(ctl, stage, note, bar);
  const $ = s => bar.querySelector(s);
  const VAZIO = [{ note: '', vazio: true }];
  let frames = VAZIO, k = 0, timer = 0;
  function draw(){
    const f = frames[k];
    stage.innerHTML = '';
    if (!f.vazio) opt.render(f, stage, k, frames);
    note.innerHTML = f.note || '';
    $('.ev-count').textContent = frames.length > 1 ? 'Passo ' + k + ' de ' + (frames.length - 1) : '';
    $('.ev-counts').innerHTML = Object.keys(f.counts || {}).map(c => '<span class="ev-chip">' + esc(c) + ': <b>' + esc(f.counts[c]) + '</b></span>').join('');
    $('.ev-first').disabled = $('.ev-prev').disabled = k === 0;
    $('.ev-next').disabled = $('.ev-auto').disabled = k === frames.length - 1;
    if (k === frames.length - 1) stop();
  }
  function stop(){ clearInterval(timer); timer = 0; $('.ev-auto').textContent = '⏵ Animar'; }
  function step(d){ k = Math.max(0, Math.min(frames.length - 1, k + d)); draw(); }
  $('.ev-first').addEventListener('click', () => { stop(); k = 0; draw(); });
  $('.ev-prev').addEventListener('click', () => { stop(); step(-1); });
  $('.ev-next').addEventListener('click', () => { stop(); step(1); });
  $('.ev-auto').addEventListener('click', () => {
    if (timer){ stop(); return; }
    $('.ev-auto').textContent = '⏸ Pausar';
    timer = setInterval(() => step(1), SPEED[$('.ev-speed').value]);
  });
  $('.ev-speed').addEventListener('change', () => { if (timer){ stop(); $('.ev-auto').click(); } });
  const api = {
    ctl, stage, note,
    load(fr, toEnd){ stop(); frames = fr && fr.length ? fr : VAZIO; k = toEnd ? frames.length - 1 : 0; draw(); },
    last(){ stop(); k = frames.length - 1; draw(); },
    get frame(){ return frames[k]; }
  };
  if (opt.frames) api.load(opt.frames); else draw();
  return api;
}

/* Campos de entrada para os widgets: EDViz.field(ctl, 'rótulo', 'valor', largura) → <input> */
function field(ctl, label, value, width, type){
  const l = el('label', 'ev-field');
  l.innerHTML = esc(label) + ' <input spellcheck="false">';
  const i = l.querySelector('input');
  i.value = value === undefined ? '' : value;
  if (type) i.type = type;
  if (width) i.style.width = width;
  ctl.appendChild(l);
  return i;
}
function button(ctl, label, fn, cls){
  const b = el('button', 'ev-btn' + (cls ? ' ' + cls : ''));
  b.type = 'button'; b.textContent = label;
  b.addEventListener('click', fn);
  ctl.appendChild(b);
  return b;
}
function select(ctl, label, options, value){
  const l = el('label', 'ev-field');
  l.innerHTML = (label ? esc(label) + ' ' : '') + '<select>' + options.map(o => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>';
  }).join('') + '</select>';
  ctl.appendChild(l);
  return l.querySelector('select');
}
/* "5, 3 8" → [5, 3, 8] (ignora o que não for número) */
function nums(s){ return String(s).split(/[\s,;]+/).filter(x => x !== '' && !isNaN(x)).map(Number); }

/* ---------- Vetor ---------- */
function array(target, vals, o){
  o = o || {};
  const wrap = el('div', 'ev-arrwrap');
  if (o.name) wrap.appendChild(el('span', 'ev-arrname', esc(o.name)));
  const row = el('div', 'ev-arr');
  vals.forEach((v, i) => {
    const c = el('div', 'ev-cell ' + pick(o.cls, i, v));
    c.innerHTML = '<span class="ev-tag">' + esc(pick(o.tags, i, v)) + '</span>' +
      '<span class="ev-val">' + (v === null || v === undefined ? '' : esc(v)) + '</span>' +
      (o.idx === false ? '' : '<span class="ev-idx">' + (o.base !== undefined ? esc(o.base(i)) : i) + '</span>');
    row.appendChild(c);
  });
  wrap.appendChild(row);
  target.appendChild(wrap);
  return wrap;
}

/* ---------- Barras ---------- */
function bars(target, vals, o){
  o = o || {};
  const max = Math.max(1, ...vals.map(Math.abs));
  const row = el('div', 'ev-bars');
  vals.forEach((v, i) => {
    const b = el('div', 'ev-barcol ' + pick(o.cls, i, v));
    b.innerHTML = '<span class="ev-tag">' + esc(pick(o.tags, i, v)) + '</span><span class="ev-bar" style="height:' + (8 + 92 * Math.abs(v) / max) + '%"></span><span class="ev-bv">' + esc(v) + '</span>';
    row.appendChild(b);
  });
  target.appendChild(row);
  return row;
}

/* ---------- Lista encadeada ---------- */
function chain(target, vals, o){
  o = o || {};
  const wrap = el('div', 'ev-chainwrap');
  const row = el('div', 'ev-chain');
  if (o.head !== false) row.appendChild(el('span', 'ev-head', esc(o.head || 'início') + ' <span class="ev-link">→</span>'));
  vals.forEach((v, i) => {
    const n = el('div', 'ev-node ' + pick(o.cls, i, v));
    n.innerHTML = '<span class="ev-tag">' + esc(pick(o.tags, i, v)) + '</span><span class="ev-nbox">' +
      (o.double ? '<span class="ev-np">•</span>' : '') + '<span class="ev-nv">' + esc(v) + '</span><span class="ev-np">•</span></span>';
    row.appendChild(n);
    if (i < vals.length - 1) row.appendChild(el('span', 'ev-link', o.double ? '⇄' : '→'));
  });
  if (!vals.length) row.appendChild(el('span', 'ev-null', 'None'));
  else if (!o.circular) row.appendChild(el('span', 'ev-link', '→ <span class="ev-null">' + esc(o.end || 'None') + '</span>'));
  wrap.appendChild(row);
  if (o.circular && vals.length) wrap.appendChild(el('div', 'ev-circ', '<span>o último aponta de volta para o primeiro</span>'));
  target.appendChild(wrap);
  return wrap;
}

/* ---------- SVG ---------- */
function svg(w, h, cls){
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  s.setAttribute('class', 'ev-svg ' + (cls || ''));
  s.style.maxWidth = w + 'px';
  return s;
}
function add(parent, tag, attrs, text){
  const e = document.createElementNS(NS, tag);
  Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/* ---------- Árvore binária ----------
   Posição x = ordem em-ordem do nó; y = profundidade. Funciona com qualquer objeto
   ({ chave, esq, dir } por padrão; mude com left/right/key). */
function tree(target, root, o){
  o = o || {};
  const L = o.left || 'esq', R = o.right || 'dir', K = o.key || 'chave';
  const pos = []; let n = 0, depth = 0;
  (function walk(nd, d){
    if (!nd) return;
    walk(nd[L], d + 1);
    pos.push({ nd, x: n++, d });
    depth = Math.max(depth, d);
    walk(nd[R], d + 1);
  })(root, 0);
  if (!root){ target.appendChild(el('div', 'ev-empty', o.empty || 'Árvore vazia (raiz = None)')); return null; }
  const DX = o.dx || 46, DY = o.dy || 62, P = 28;
  const W = Math.max(n * DX + P, 120), H = (depth + 1) * DY + P - 10;
  const s = svg(W, H, 'ev-tree');
  const at = new Map(pos.map(p => [p.nd, { x: P / 2 + DX / 2 + p.x * DX - (n * DX + P - W) / 2, y: 26 + p.d * DY }]));
  pos.forEach(p => [L, R].forEach(side => {
    const c = p.nd[side];
    if (!c) return;
    const a = at.get(p.nd), b = at.get(c);
    add(s, 'line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'ev-edge ' + (o.ecls ? o.ecls(p.nd, c) || '' : '') });
  }));
  pos.forEach(p => {
    const a = at.get(p.nd);
    const g = add(s, 'g', { class: 'ev-tnode ' + (o.cls ? o.cls(p.nd) || '' : ''), transform: 'translate(' + a.x + ',' + a.y + ')' });
    add(g, 'circle', { r: 17 });
    add(g, 'text', { y: 5, 'text-anchor': 'middle' }, p.nd[K]);
    const b = o.badge ? o.badge(p.nd) : '';
    if (b !== '' && b !== undefined && b !== null) add(g, 'text', { x: 20, y: -14, class: 'ev-badge' }, b);
  });
  target.appendChild(s);
  return s;
}

/* ---------- Grafo ----------
   nodes: [{ id, x, y, label? }] em coordenadas livres; edges: [{ a, b, w? }]. */
function graph(target, g, o){
  o = o || {};
  const xs = g.nodes.map(v => v.x), ys = g.nodes.map(v => v.y);
  const minX = Math.min(...xs) - 34, minY = Math.min(...ys) - 34;
  const W = Math.max(...xs) - minX + 34, H = Math.max(...ys) - minY + 34;
  const s = svg(W, H, 'ev-graph');
  const id = 'evarr' + Math.random().toString(36).slice(2, 8);
  if (g.directed){
    const defs = add(s, 'defs', {});
    const m = add(defs, 'marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    add(m, 'path', { d: 'M0,0 L10,5 L0,10 z', class: 'ev-arrowhead' });
  }
  const byId = new Map(g.nodes.map(v => [String(v.id), v]));
  g.edges.forEach(e => {
    const a = byId.get(String(e.a)), b = byId.get(String(e.b));
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, r = 20;
    const attrs = { x1: a.x - minX + dx / len * r, y1: a.y - minY + dy / len * r, x2: b.x - minX - dx / len * r, y2: b.y - minY - dy / len * r, class: 'ev-gedge ' + (o.ecls ? o.ecls(e) || '' : '') };
    if (g.directed) attrs['marker-end'] = 'url(#' + id + ')';
    add(s, 'line', attrs);
    if (e.w !== undefined){
      const mx = (a.x + b.x) / 2 - minX, my = (a.y + b.y) / 2 - minY;
      add(s, 'text', { x: mx - dy / len * 11, y: my + dx / len * 11 + 4, class: 'ev-gw', 'text-anchor': 'middle' }, e.w);
    }
  });
  g.nodes.forEach(v => {
    const gr = add(s, 'g', { class: 'ev-tnode ' + (o.ncls ? o.ncls(v.id) || '' : ''), transform: 'translate(' + (v.x - minX) + ',' + (v.y - minY) + ')' });
    add(gr, 'circle', { r: 18 });
    add(gr, 'text', { y: 5, 'text-anchor': 'middle' }, v.label !== undefined ? v.label : v.id);
    const b = o.nbadge ? o.nbadge(v.id) : '';
    if (b !== '' && b !== undefined && b !== null) add(gr, 'text', { x: 21, y: -15, class: 'ev-badge' }, b);
  });
  target.appendChild(s);
  return s;
}

/* ---------- Registro ---------- */
const registry = {};
function register(name, fn){
  registry[name] = fn;
  document.querySelectorAll('.edviz[data-viz="' + name + '"]').forEach(box => {
    try { fn(box, box.dataset); }
    catch(e){ box.textContent = 'Erro ao montar a visualização: ' + e.message; if (window.console) console.error(e); }
  });
}

window.EDViz = { register, player, field, button, select, nums, array, bars, chain, tree, graph, svg, add, el, esc };
})();
