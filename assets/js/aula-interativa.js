/*
  Aulas interativas — motor compartilhado.
  Cada página define <script type="application/json" id="aula-config"> com:
    { "id": "...", "mods": { chave: { "name": "...", "color": "#..." } }, "quizzes": { chave: [ ... ] } }
  Cada <div class="quiz" data-quiz="chave"> usa a lista correspondente.
  Itens do quiz: { "q" e/ou "code", "opts": [...], "ans": índice, "why": "..." }
  Exercícios: <textarea class="py" data-tests='[{"in": "...", "out": [...], "nao": [...]}]'>
    passa quando a saída contém cada texto de "out" e nenhum de "nao"
    (sem diferenciar maiúsculas e ignorando espaços repetidos).
  Componentes extras (ex.: terminal-linux.js) entram no progresso registrando-se, antes deste
  script, em window.aulaPlugins: { name, collect(), apply(estado|null), summary() → [textos] },
  e avisam mudanças com window.aulaAutosave(). window.aulaHl, se definido, realça o código do quiz.
*/
window.pyReady = function(){
  const st = document.getElementById('pystatus');
  if (!st) return;
  st.classList.add('ok'); st.classList.remove('fail');
  st.querySelector('span').textContent = 'Python pronto';
};

(function(){
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, v); } catch(e){} }
};
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const CFG = JSON.parse($('#aula-config').textContent);
const KEY = 'aula-' + CFG.id + '-';

/* ---------- Realce de sintaxe ---------- */
const KW = new Set('False None True and as assert break class continue def del elif else except finally for from global if import in is lambda not or pass raise return try while with yield'.split(' '));
const BI = new Set('print len input int float str bool list tuple dict set range type sorted sum max min enumerate zip abs round reversed isinstance'.split(' '));
const TOK = /(#[^\n]*)|((?:[rRbBfF]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ÿ][\wÀ-ÿ]*)|([\s\S])/g;
function hl(src){
  let out = '', m; TOK.lastIndex = 0;
  while ((m = TOK.exec(src))){
    if (m[1]) out += '<span class="t-com">'+esc(m[1])+'</span>';
    else if (m[2]) out += '<span class="t-str">'+esc(m[2])+'</span>';
    else if (m[3]) out += '<span class="t-num">'+m[3]+'</span>';
    else if (m[4]){
      const w = m[4];
      const cls = KW.has(w) ? 't-kw' : (src[m.index-1] === '.' ? 't-fn' : (BI.has(w) ? 't-bi' : ''));
      out += cls ? '<span class="'+cls+'">'+w+'</span>' : w;
    } else out += esc(m[5]);
  }
  return out + '\n';
}

/* ---------- Executor de código ---------- */
const HINTS = {
  IndexError: 'Índice fora do intervalo. Os índices válidos vão de 0 até len() - 1.',
  KeyError: 'Essa chave não existe no dicionário. Consulte com in ou use .get() para evitar o erro.',
  TypeError: 'Operação incompatível com o tipo do valor. Lembre: strings e tuplas não podem ser alteradas por índice.',
  NameError: 'Nome não definido. Verifique se a variável foi criada antes e se está escrita do mesmo jeito.',
  ValueError: 'Valor inválido para a operação. Ex.: converter texto que não é número, ou remover item que não está na lista.',
  SyntaxError: 'Erro de escrita. Confira parênteses, aspas, vírgulas e os dois-pontos após for, if e while.',
  IndentationError: 'Recuo incorreto. As linhas dentro de um bloco precisam ter o mesmo recuo (4 espaços).',
  AttributeError: 'Esse tipo não possui esse método. Ex.: tuplas e strings não têm append().',
  ZeroDivisionError: 'Divisão por zero. Verifique se a lista não está vazia antes de dividir por len().'
};
function autosize(t){ t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
function autosizeVisible(){ $$(document.body.classList.contains('view-all') ? 'textarea.src' : '.slide.active textarea.src').forEach(autosize); }

function makeRunner(src){
  const orig = src.value.replace(/\s+$/, '');
  const hasStdin = src.hasAttribute('data-stdin');
  const wrap = document.createElement('div'); wrap.className = 'runner';
  wrap.innerHTML =
    '<div class="rbar"><span class="rlabel"></span><span class="rhint">Ctrl+Enter executa</span>' +
    '<button type="button" class="btn-run">▶ Executar</button>' +
    (src.hasAttribute('data-tests') ? '<button type="button" class="btn-check" title="Testar com várias entradas">✓ Verificar</button>' : '') +
    '<button type="button" class="btn-reset" title="Restaurar o código original">↺</button></div>' +
    '<div class="editor"><pre class="hl" aria-hidden="true"></pre><textarea class="src" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Código Python"></textarea></div>' +
    (hasStdin ? '<div class="stdin"><span>Entrada<br>(1 por linha)</span><textarea class="in" spellcheck="false" aria-label="Valores para input()"></textarea></div>' : '') +
    '<div class="output" hidden></div><div class="checks" hidden></div>';
  $('.rlabel', wrap).textContent = src.dataset.label || 'python';
  const area = $('textarea.src', wrap), pre = $('pre.hl', wrap), out = $('.output', wrap);
  const stdin = $('textarea.in', wrap);
  const origIn = hasStdin ? (src.getAttribute('data-stdin') || '') : '';
  if (stdin) stdin.value = origIn;
  area.value = orig;
  src.replaceWith(wrap);
  const sync = () => { pre.innerHTML = hl(area.value); autosize(area); };
  const r = { area, pre, out, stdin, orig, origIn, sync, wrap, label: $('.rlabel', wrap).textContent, ok: false };
  if (src.hasAttribute('data-tests')){
    r.tests = JSON.parse(src.dataset.tests);
    r.checks = $('.checks', wrap);
    $('.btn-check', wrap).addEventListener('click', () => runTests(r));
  }
  area.addEventListener('input', () => { sync(); autosave(); });
  if (stdin) stdin.addEventListener('input', autosave);
  area.addEventListener('keydown', e => onEditorKey(e, r));
  $('.btn-run', wrap).addEventListener('click', () => run(r));
  $('.btn-reset', wrap).addEventListener('click', () => {
    area.value = orig; if (stdin) stdin.value = origIn; sync(); out.hidden = true; out.innerHTML = '';
    if (r.checks) r.checks.hidden = true;
    autosave();
  });
  sync();
  runners.push(r);
}
const runners = [];

function insertText(area, text){
  area.focus();
  let ok = false;
  try { ok = document.execCommand('insertText', false, text); } catch(e){ ok = false; }
  if (!ok){
    area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end');
    area.dispatchEvent(new Event('input'));
  }
}
function onEditorKey(e, r){
  const a = r.area;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); run(r); return; }
  if (e.key === 'Escape'){ a.blur(); return; }
  if (e.key === 'Tab' && !e.shiftKey){ e.preventDefault(); insertText(a, '    '); return; }
  if (e.key === 'Tab' && e.shiftKey){
    e.preventDefault();
    const s = a.selectionStart, lineStart = a.value.lastIndexOf('\n', s - 1) + 1;
    const m = a.value.slice(lineStart).match(/^ {1,4}/);
    if (m){ a.setSelectionRange(lineStart, lineStart + m[0].length); insertText(a, ''); }
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    const s = a.selectionStart, lineStart = a.value.lastIndexOf('\n', s - 1) + 1;
    const line = a.value.slice(lineStart, s);
    let ind = (line.match(/^\s*/) || [''])[0];
    if (/:\s*(#.*)?$/.test(line)) ind += '    ';
    insertText(a, '\n' + ind);
  }
}

function run(r){
  const o = r.out;
  o.hidden = false; o.innerHTML = '';
  if (r.checks) r.checks.hidden = true;
  if (typeof window.runPython !== 'function'){
    o.innerHTML = '<div class="empty">O interpretador Python ainda está carregando. Aguarde alguns segundos e tente de novo.</div>';
    return;
  }
  let res;
  try { res = String(window.runPython(r.area.value, r.stdin ? r.stdin.value : '')); }
  catch(err){ res = '\u0000' + (err && err.message ? err.message : String(err)); }
  const cut = res.indexOf('\u0000');
  const text = cut >= 0 ? res.slice(0, cut) : res;
  const errMsg = cut >= 0 ? res.slice(cut + 1) : '';
  const head = document.createElement('div'); head.className = 'ohead'; head.textContent = 'Saída'; o.appendChild(head);
  if (text){
    const p = document.createElement('pre'); p.textContent = text.replace(/\n$/, ''); o.appendChild(p);
  } else if (!errMsg){
    const p = document.createElement('div'); p.className = 'empty'; p.textContent = 'Nenhuma saída. Use print() para mostrar valores.'; o.appendChild(p);
  }
  if (errMsg){
    const er = document.createElement('div'); er.className = 'err'; er.textContent = errMsg; o.appendChild(er);
    const name = (errMsg.match(/^(\w+)/) || [])[1];
    if (HINTS[name]){ const h = document.createElement('div'); h.className = 'hint'; h.textContent = 'Dica: ' + HINTS[name]; o.appendChild(h); }
  }
  o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash');
}

/* ---------- Verificação automática dos exercícios ---------- */
const norm = s => String(s).toLowerCase().replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');
function setSolved(r, ok){
  r.ok = ok;
  r.wrap.classList.toggle('solved', ok);
  let b = $('.rok', r.wrap);
  if (ok && !b){ b = document.createElement('span'); b.className = 'rok'; b.textContent = '✓ resolvido'; $('.rlabel', r.wrap).after(b); }
  if (!ok && b) b.remove();
}
function runTests(r){
  const box = r.checks;
  box.hidden = false; box.innerHTML = '';
  r.out.hidden = true;
  if (typeof window.runPython !== 'function'){
    box.innerHTML = '<div class="empty">O interpretador Python ainda está carregando. Aguarde alguns segundos e tente de novo.</div>';
    return;
  }
  let passed = 0;
  const list = document.createElement('ol'); list.className = 'ck-list';
  r.tests.forEach((t, k) => {
    let res;
    try { res = String(window.runPython(r.area.value, t.in || '', true)); }
    catch(err){ res = '\u0000' + (err && err.message ? err.message : String(err)); }
    const cut = res.indexOf('\u0000');
    const text = cut >= 0 ? res.slice(0, cut) : res;
    const errMsg = cut >= 0 ? res.slice(cut + 1) : '';
    const got = norm(text);
    const want = (t.out || []).map(w => [w, got.includes(norm(w))]);
    const avoid = (t.nao || []).map(w => [w, !got.includes(norm(w))]);
    const ok = !errMsg && want.every(x => x[1]) && avoid.every(x => x[1]);
    if (ok) passed++;
    const li = document.createElement('li'); li.className = ok ? 'ck-ok' : 'ck-bad';
    const head = document.createElement('div'); head.className = 'ck-head';
    head.textContent = (ok ? '✓ ' : '✗ ') + 'Teste ' + (k + 1) + (t.in ? ' · entrada: ' + t.in.split('\n').join(' ⏎ ') : ' · sem entrada');
    li.appendChild(head);
    if (!ok){
      const ul = document.createElement('ul');
      want.forEach(([w, hit]) => { const i = document.createElement('li'); i.className = hit ? 'hit' : 'miss'; i.textContent = (hit ? '✓ mostrou ' : '✗ faltou mostrar ') + JSON.stringify(w); ul.appendChild(i); });
      avoid.forEach(([w, hit]) => { if (!hit){ const i = document.createElement('li'); i.className = 'miss'; i.textContent = '✗ não deveria mostrar ' + JSON.stringify(w); ul.appendChild(i); } });
      li.appendChild(ul);
      if (errMsg){
        const er = document.createElement('div'); er.className = 'err'; er.textContent = errMsg; li.appendChild(er);
        const name = (errMsg.match(/^(\w+)/) || [])[1];
        if (name === 'EOFError'){ const h = document.createElement('div'); h.className = 'hint'; h.textContent = 'Dica: o programa pediu mais input() do que o teste fornece. Confira quantas leituras o enunciado pede.'; li.appendChild(h); }
        else if (HINTS[name]){ const h = document.createElement('div'); h.className = 'hint'; h.textContent = 'Dica: ' + HINTS[name]; li.appendChild(h); }
      }
      const p = document.createElement('pre'); p.textContent = text.replace(/\n$/, '').slice(0, 800) || '(nenhuma saída)';
      const lab = document.createElement('div'); lab.className = 'ohead'; lab.textContent = 'Sua saída';
      li.append(lab, p);
    }
    list.appendChild(li);
  });
  const all = passed === r.tests.length;
  const sum = document.createElement('div'); sum.className = 'ck-sum ' + (all ? 'ck-ok' : 'ck-bad');
  sum.textContent = all ? '🎉 Todos os ' + passed + ' testes passaram. Exercício resolvido!' : passed + ' de ' + r.tests.length + ' testes passaram. Veja abaixo o que falta.';
  box.append(sum, list);
  box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  if (all && !r.ok){ setSolved(r, true); autosave(); }
}

/* ---------- Visualizador de índices e fatias ---------- */
function pyRepr(v){
  if (typeof v === 'string') return "'" + v.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + "'";
  return String(v);
}
function sliceIdx(n, a, b, c){
  if (c === null) c = 1;
  if (c === 0) return null;
  const idx = [];
  if (c > 0){
    a = a === null ? 0 : (a < 0 ? Math.max(a + n, 0) : Math.min(a, n));
    b = b === null ? n : (b < 0 ? Math.max(b + n, 0) : Math.min(b, n));
    for (let i = a; i < b; i += c) idx.push(i);
  } else {
    a = a === null ? n - 1 : (a < 0 ? Math.max(a + n, -1) : Math.min(a, n - 1));
    b = b === null ? -1 : (b < 0 ? Math.max(b + n, -1) : Math.min(b, n - 1));
    for (let i = a; i > b; i += c) idx.push(i);
  }
  return idx;
}
function makeSeqViz(box){
  const mode = box.dataset.mode;
  const isList = box.hasAttribute('data-list');
  const name = box.dataset.label || 's';
  let items = isList ? box.dataset.list.split(',') : Array.from(box.dataset.text || '');
  const ctr = document.createElement('div'); ctr.className = 'sv-controls';
  const cells = document.createElement('div'); cells.className = 'sv-cells';
  const out = document.createElement('div'); out.className = 'sv-out';
  const leg = document.createElement('div'); leg.className = 'sv-legend';
  box.append(ctr, cells, out, leg);

  let inA, inB, inC;
  if (!isList){
    ctr.innerHTML = '<label>' + esc(name) + ' = <input class="txt" maxlength="16" spellcheck="false" aria-label="Texto"></label>';
    const txt = $('input', ctr); txt.value = box.dataset.text;
    txt.addEventListener('input', () => { items = Array.from(txt.value); draw(); });
  }
  if (mode === 'slice'){
    const mk = (lab, val) => { const l = document.createElement('label'); l.innerHTML = lab + ' <input class="num" type="number" placeholder="—">'; const i = $('input', l); i.value = val || ''; ctr.appendChild(l); i.addEventListener('input', () => draw()); return i; };
    inA = mk('início', box.dataset.start); inB = mk('fim', box.dataset.stop); inC = mk('passo', box.dataset.step);
    leg.textContent = 'Deixe um campo vazio para omiti-lo. Os números pequenos acima das caixas mostram a ordem em que os elementos são pegos.';
  } else {
    leg.textContent = 'Clique em um elemento. Em cima: índice positivo. Embaixo: índice negativo.';
  }
  const num = i => i.value.trim() === '' ? null : parseInt(i.value, 10);
  const show = v => isList ? pyRepr(v) : (v === ' ' ? '␣' : v);

  function draw(sel){
    const n = items.length;
    cells.innerHTML = '';
    let picked = [];
    if (mode === 'slice'){
      picked = sliceIdx(n, num(inA), num(inB), num(inC));
    } else if (sel !== undefined){ picked = [sel]; }
    items.forEach((ch, i) => {
      const c = document.createElement('button'); c.type = 'button';
      const ord = picked ? picked.indexOf(i) : -1;
      c.className = 'cell' + (ord >= 0 ? ' on' : '');
      c.innerHTML = '<span class="ord"></span><span class="ip">' + i + '</span><span class="ch"></span><span class="in">' + (i - n) + '</span>';
      const chEl = $('.ch', c);
      chEl.textContent = show(ch);
      if (isList){ chEl.style.width = 'auto'; chEl.style.padding = '0 .6rem'; chEl.style.fontSize = '1.05rem'; }
      if (mode === 'slice' && ord >= 0 && picked.length > 1) $('.ord', c).textContent = ord + 1;
      if (mode === 'index') c.addEventListener('click', () => draw(i));
      cells.appendChild(c);
    });
    if (mode === 'slice'){
      const a = inA.value.trim(), b = inB.value.trim(), cc = inC.value.trim();
      const expr = name + '[' + a + ':' + b + (cc !== '' ? ':' + cc : '') + ']';
      if (picked === null){ out.innerHTML = esc(expr) + '  →  <span class="bad">ValueError: o passo não pode ser 0</span>'; return; }
      const val = isList ? '[' + picked.map(i => pyRepr(items[i])).join(', ') + ']' : pyRepr(picked.map(i => items[i]).join(''));
      out.innerHTML = esc(expr) + '  →  <b>' + esc(val) + '</b>';
    } else if (sel !== undefined){
      const v = esc(pyRepr(items[sel]));
      out.innerHTML = esc(name) + '[' + sel + ']  →  <b>' + v + '</b>      ' + esc(name) + '[' + (sel - n) + ']  →  <b>' + v + '</b>';
    } else {
      out.innerHTML = 'len(' + esc(name) + ')  →  <b>' + n + '</b>';
    }
  }
  draw();
}

/* ---------- Visualizador de matrizes ---------- */
function makeMatViz(box){
  const m = JSON.parse(box.dataset.rows);
  const name = box.dataset.label || 'm';
  const fmt = v => typeof v === 'string' ? pyRepr(v) : String(v);
  const grid = document.createElement('div'); grid.className = 'mv-grid';
  grid.style.gridTemplateColumns = 'auto repeat(' + m[0].length + ', minmax(2.9rem, auto))';
  const out = document.createElement('div'); out.className = 'sv-out';
  const leg = document.createElement('div'); leg.className = 'sv-legend';
  leg.textContent = 'Clique em um valor para ver m[linha][coluna], ou no número de uma linha para ver a linha inteira.';
  box.append(grid, out, leg);
  function draw(si, sj){
    grid.innerHTML = '<span></span>' + m[0].map((_, j) => '<span class="mv-ix">' + j + '</span>').join('');
    m.forEach((row, i) => {
      const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'mv-ix mv-row'; rb.textContent = i;
      rb.title = 'Linha ' + i; rb.addEventListener('click', () => draw(i, -1));
      grid.appendChild(rb);
      row.forEach((v, j) => {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'mv-cell';
        if (i === si && (j === sj || sj === -1)) c.classList.add('on');
        else if (i === si || j === sj) c.classList.add('near');
        c.textContent = fmt(v);
        c.addEventListener('click', () => draw(i, j));
        grid.appendChild(c);
      });
    });
    const n = esc(name);
    if (si === undefined) out.innerHTML = 'len(' + n + ')  →  <b>' + m.length + '</b> linhas      len(' + n + '[0])  →  <b>' + m[0].length + '</b> colunas';
    else if (sj === -1) out.innerHTML = n + '[' + si + ']  →  <b>' + esc('[' + m[si].map(fmt).join(', ') + ']') + '</b>';
    else out.innerHTML = n + '[' + si + ']  →  ' + esc('[' + m[si].map(fmt).join(', ') + ']') + '      ' + n + '[' + si + '][' + sj + ']  →  <b>' + esc(fmt(m[si][sj])) + '</b>';
  }
  draw();
}

/* ---------- Teste de mesa ---------- */
function makeTrace(box){
  const code = box.dataset.code.split('\n');
  const steps = JSON.parse(box.dataset.steps);
  const vars = JSON.parse(box.dataset.vars);
  box.innerHTML =
    '<div class="tr-grid"><div><div class="tr-code"></div><div class="sv-legend">Faixa colorida: linha que acabou de executar. Faixa amarela: próxima linha.</div></div>' +
    '<div><div class="tr-ctrl"><button type="button" class="tb-prev">◀ Voltar</button><button type="button" class="tb-next">Executar próxima linha ▶</button>' +
    '<button type="button" class="tb-reset">↺ Reiniciar</button><span class="tr-count"></span></div>' +
    '<div class="tr-note" aria-live="polite"></div><div class="tr-tabwrap"><table class="tbl tr-tab"></table></div>' +
    '<div class="ohead tr-oh">Saída</div><pre class="tr-out"></pre></div></div>';
  const cbox = $('.tr-code', box);
  code.forEach((l, i) => {
    const d = document.createElement('div'); d.className = 'tl';
    d.innerHTML = '<span class="ln">' + (i + 1) + '</span><span>' + hl(l).replace(/\n$/, '') + '</span>';
    cbox.appendChild(d);
  });
  const lines = $$('.tl', cbox), tab = $('.tr-tab', box), wrapT = $('.tr-tabwrap', box);
  const bPrev = $('.tb-prev', box), bNext = $('.tb-next', box);
  let k = 0;
  function draw(){
    lines.forEach(l => l.classList.remove('done', 'next'));
    const last = steps[k - 1];
    if (last) lines[last.line - 1].classList.add('done');
    if (k < steps.length) lines[steps[k].line - 1].classList.add('next');
    $('.tr-count', box).textContent = 'Passo ' + k + ' de ' + steps.length;
    let note;
    if (k === 0) note = 'Clique em “Executar próxima linha” para começar.';
    else {
      note = 'Linha ' + last.line + ' executada' + (last.note ? ': ' + last.note : '.');
      if (k === steps.length) note += ' Fim do programa.';
    }
    $('.tr-note', box).textContent = note;
    let h = '<tr><th>Passo</th><th>Linha</th>' + vars.map(v => '<th>' + esc(v) + '</th>').join('') + '<th>Observação</th></tr>';
    for (let s = 0; s < k; s++){
      const st = steps[s], prev = s > 0 ? steps[s - 1].vars : {};
      h += '<tr' + (s === k - 1 ? ' class="cur"' : '') + '><td>' + (s + 1) + '</td><td>' + st.line + '</td>' +
        vars.map(v => {
          const val = st.vars[v];
          const chg = val !== undefined && val !== prev[v];
          return '<td' + (chg ? ' class="chg"' : '') + '>' + (val === undefined ? '' : esc(val)) + '</td>';
        }).join('') + '<td>' + (st.note ? esc(st.note) : '') + '</td></tr>';
    }
    tab.innerHTML = h;
    wrapT.scrollTop = wrapT.scrollHeight;
    $('.tr-out', box).textContent = last ? last.out.replace(/\n$/, '') : '';
    bPrev.disabled = k === 0; bNext.disabled = k === steps.length;
  }
  bNext.addEventListener('click', () => { if (k < steps.length){ k++; draw(); } });
  bPrev.addEventListener('click', () => { if (k > 0){ k--; draw(); } });
  $('.tb-reset', box).addEventListener('click', () => { k = 0; draw(); });
  draw();
}

/* ---------- Quiz ---------- */
/* A primeira resposta de cada questão fica registrada (resp[q] = índice escolhido). */
function makeQuiz(el, items){
  let q = 0, resp = {};
  const label = el.dataset.label || 'Questão';
  function draw(){
    const item = items[q];
    el.innerHTML = '<div class="q-count"></div>' + (item.q ? '<div class="q-text"></div>' : '') + (item.code ? '<pre class="q-code"></pre>' : '') + '<div class="q-opts"></div><div class="q-fb" aria-live="polite"></div>';
    const feitas = Object.keys(resp).length;
    const acertos = Object.keys(resp).filter(i => items[i] && resp[i] === items[i].ans).length;
    $('.q-count', el).textContent = label + ' ' + (q + 1) + ' de ' + items.length +
      (feitas ? ' · ' + acertos + ' acerto' + (acertos === 1 ? '' : 's') + ' em ' + feitas + ' respondida' + (feitas === 1 ? '' : 's') : '');
    if (item.q) $('.q-text', el).textContent = item.q;
    if (item.code) $('.q-code', el).innerHTML = (window.aulaHl || hl)(item.code);
    const box = $('.q-opts', el), fb = $('.q-fb', el);
    const buttons = item.opts.map((o, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o;
      b.addEventListener('click', () => {
        if (q in resp){ reveal(k); return; }
        resp[q] = k; draw(); autosave();
      });
      box.appendChild(b);
      return b;
    });
    function reveal(k){
      buttons.forEach((x, j) => { x.classList.remove('right', 'wrong'); if (j === item.ans) x.classList.add('right'); });
      if (k !== item.ans) buttons[k].classList.add('wrong');
      fb.innerHTML = '';
      const p = document.createElement('div');
      p.innerHTML = k === item.ans ? '<strong>Correto.</strong> ' : '<strong>Resposta: ' + esc(item.opts[item.ans]) + '.</strong> ';
      p.appendChild(document.createTextNode(item.why));
      fb.appendChild(p);
      const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'q-next';
      nx.textContent = q < items.length - 1 ? 'Próxima' : 'Recomeçar';
      nx.addEventListener('click', () => { q = (q + 1) % items.length; draw(); autosave(); });
      fb.appendChild(nx);
    }
    if (q in resp) reveal(resp[q]);
  }
  draw();
  return {
    get: () => ({ atual: q, respostas: resp }),
    set(st){
      resp = {};
      Object.keys(st.respostas || {}).forEach(i => {
        const k = st.respostas[i];
        if (items[i] && Number.isInteger(k) && k >= 0 && k < items[i].opts.length) resp[i] = k;
      });
      q = Number.isInteger(st.atual) && st.atual >= 0 && st.atual < items.length ? st.atual : 0;
      draw();
    },
    reset(){ q = 0; resp = {}; draw(); }
  };
}

/* ---------- Progresso do aluno ----------
   Guarda só o que difere do original: códigos editados, entradas, respostas do quiz e etapa atual.
   Fica salvo automaticamente neste navegador e pode ser baixado/carregado como arquivo JSON. */
const FORMATO = 'aula-interativa-progresso';
const quizzes = {};
const plugins = window.aulaPlugins || [];
let ready = false, saveTimer = 0;

function collect(){
  const codigos = {};
  runners.forEach((r, i) => {
    const d = {};
    if (r.area.value !== r.orig) d.codigo = r.area.value;
    if (r.stdin && r.stdin.value !== r.origIn) d.entrada = r.stdin.value;
    if (Object.keys(d).length){ d.arquivo = r.label; codigos[i] = d; }
  });
  const resolvidos = {};
  runners.forEach((r, i) => { if (r.ok) resolvidos[i] = r.label; });
  const quiz = {};
  Object.keys(quizzes).forEach(k => { quiz[k] = quizzes[k].get(); });
  return {
    formato: FORMATO, versao: 2, aula: CFG.id, salvoEm: new Date().toISOString(),
    etapa: cur, modo: isAll() ? 'pagina-unica' : 'etapas',
    codigos, resolvidos, quiz,
    extras: plugins.reduce((o, p) => { o[p.name] = p.collect(); return o; }, {})
  };
}
function apply(st, nav){
  let n = 0;
  runners.forEach((r, i) => {
    const d = (st.codigos || {})[i] || {};
    if (d.arquivo && d.arquivo !== r.label) return;   // a aula mudou: não aplica no editor errado
    r.area.value = typeof d.codigo === 'string' ? d.codigo : r.orig;
    if (r.stdin) r.stdin.value = typeof d.entrada === 'string' ? d.entrada : r.origIn;
    r.out.hidden = true; r.out.innerHTML = '';
    r.sync();
    if (typeof d.codigo === 'string' || typeof d.entrada === 'string') n++;
    if (r.checks){ r.checks.hidden = true; r.checks.innerHTML = ''; }
    if (r.tests) setSolved(r, (st.resolvidos || {})[i] === r.label);
  });
  Object.keys(quizzes).forEach(k => { const q = (st.quiz || {})[k]; if (q) quizzes[k].set(q); else quizzes[k].reset(); });
  plugins.forEach(p => p.apply((st.extras || {})[p.name] || null));
  if (nav){
    if (Number.isInteger(st.etapa)) cur = Math.max(0, Math.min(slides.length - 1, st.etapa));
    setView(st.modo === 'pagina-unica');
  }
  autosizeVisible();
  return n;
}
function autosave(){
  if (!ready) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { store.set(KEY + 'estado', JSON.stringify(collect())); progSummary(); }, 600);
}
function progSummary(){
  const st = collect();
  const n = Object.keys(st.codigos).length;
  const ex = runners.filter(r => r.tests).length, ok = Object.keys(st.resolvidos).length;
  let qt = 0, qr = 0;
  Object.keys(quizzes).forEach(k => { qt += CFG.quizzes[k].length; qr += Object.keys(st.quiz[k].respostas).length; });
  const parts = [];
  if (ex) parts.push(ok + ' de ' + ex + ' exercícios resolvidos');
  if (qt) parts.push(qr + ' de ' + qt + ' questões respondidas');
  plugins.forEach(p => parts.push(...p.summary()));
  if (runners.length) parts.push(n + ' código' + (n === 1 ? '' : 's') + ' alterado' + (n === 1 ? '' : 's'));
  $('#progInfo').textContent = parts.join(' · ') + '.';
}
function progMsg(text, bad){
  const m = $('#progMsg'); m.textContent = text; m.classList.toggle('bad', !!bad);
}
function download(){
  const st = collect();
  const blob = new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'progresso-' + CFG.id + '-' + st.salvoEm.slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  progMsg('Arquivo baixado. Guarde-o para continuar em outro computador.');
}
function upload(file){
  const rd = new FileReader();
  rd.onload = () => {
    let st;
    try { st = JSON.parse(rd.result); } catch(e){ progMsg('Este arquivo não é um JSON válido.', true); return; }
    if (!st || st.formato !== FORMATO){ progMsg('Este arquivo não é um progresso de aula interativa.', true); return; }
    if (st.aula !== CFG.id){ progMsg('Este arquivo é de outra aula (' + st.aula + '). Abra a aula correspondente para carregá-lo.', true); return; }
    const n = apply(st, true);
    store.set(KEY + 'estado', JSON.stringify(collect()));
    progSummary();
    const quando = st.salvoEm ? new Date(st.salvoEm).toLocaleString('pt-BR') : '';
    progMsg('Progresso carregado' + (quando ? ' (salvo em ' + quando + ')' : '') + (runners.length ? ': ' + n + ' código' + (n === 1 ? '' : 's') + ' restaurado' + (n === 1 ? '' : 's') : '') + '.');
  };
  rd.onerror = () => progMsg('Não foi possível ler o arquivo.', true);
  rd.readAsText(file);
}
function clearProgress(){
  if (!confirm('Apagar todas as suas alterações nesta aula e voltar ao estado original?')) return;
  apply({ codigos: {}, resolvidos: {}, quiz: {} }, false);
  store.set(KEY + 'estado', '');
  progSummary();
  progMsg('Progresso apagado. Tudo voltou ao original.');
}

/* ---------- Navegação ---------- */
const slides = $$('.slide');
const MOD = CFG.mods;
let cur = 0;

Object.keys(MOD).forEach(k => document.documentElement.style.setProperty('--c-' + k, MOD[k].color));
slides.forEach(s => s.style.setProperty('--mod', MOD[s.dataset.mod].color));

function buildToc(){
  const list = $('#tocList'); let lastMod = null;
  slides.forEach((s, i) => {
    const mod = s.dataset.mod;
    if (mod !== lastMod){
      const h = document.createElement('h4'); h.textContent = MOD[mod].name;
      h.style.color = MOD[mod].color; list.appendChild(h); lastMod = mod;
    }
    const a = document.createElement('a'); a.href = '#' + (i + 1); a.textContent = (i + 1) + '. ' + s.dataset.title;
    a.addEventListener('click', e => { e.preventDefault(); go(i, true); toggleToc(false); });
    list.appendChild(a);
  });
}
function isAll(){ return document.body.classList.contains('view-all'); }
function mark(i){
  cur = i;
  const s = slides[i];
  document.body.style.setProperty('--mod', MOD[s.dataset.mod].color);
  $('#chip').textContent = MOD[s.dataset.mod].name;
  $('#slideName').textContent = s.dataset.title;
  $('#counter').textContent = (i + 1) + ' / ' + slides.length;
  $('#bar').style.width = ((i + 1) / slides.length * 100) + '%';
  $('#prev').disabled = i === 0;
  $('#next').disabled = i === slides.length - 1;
  $$('#tocList a').forEach((a, k) => a.classList.toggle('cur', k === i));
  store.set(KEY + 'slide', String(i));
  try { history.replaceState(null, '', '#' + (i + 1)); } catch(e){}
}
function go(i, scroll){
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (isAll()){
    mark(i);
    if (scroll) slides[i].scrollIntoView({ block: 'start' });
    return;
  }
  slides[cur].classList.remove('active');
  slides[i].classList.add('active');
  mark(i);
  /* O deck é a área rolável; em telas baixas (sem rolagem própria) quem rola é a janela */
  const deck = $('#deck');
  deck.scrollTop = 0;
  const top = deck.getBoundingClientRect().top + window.scrollY - $('.aula-bar').offsetHeight;
  if (window.scrollY > top) window.scrollTo(0, top);
  $$('textarea.src', slides[i]).forEach(autosize);
}
function setView(all, init){
  document.body.classList.toggle('view-all', all);
  const b = $('#btnView');
  $('i', b).className = all ? 'bx bx-carousel' : 'bx bx-spreadsheet';
  $('.lbl', b).textContent = all ? 'Por etapas' : 'Página única';
  store.set(KEY + 'view', all ? 'all' : 'steps');
  slides.forEach((s, k) => s.classList.toggle('active', k === cur));
  autosizeVisible();
  go(cur, !(init && cur === 0));
}
function toggleToc(open){
  const t = $('#toc'), sc = $('#scrim');
  const on = open === undefined ? !t.classList.contains('open') : open;
  t.classList.toggle('open', on); sc.classList.toggle('on', on);
}
function setScale(d){
  const cs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
  const v = Math.max(0.7, Math.min(1.8, Math.round((cs + d) * 10) / 10));
  document.documentElement.style.setProperty('--scale', v);
  store.set(KEY + 'escala', String(v));
  autosizeVisible();
}
function fullscreen(){
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  } catch(e){}
}

document.addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const steps = !isAll();
  if (steps && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')){ e.preventDefault(); go(cur + 1); }
  else if (steps && (e.key === 'ArrowLeft' || e.key === 'PageUp')){ e.preventDefault(); go(cur - 1); }
  else if (steps && e.key === 'Home'){ go(0); }
  else if (steps && e.key === 'End'){ go(slides.length - 1); }
  else if (e.key === 'm' || e.key === 'M'){ toggleToc(); }
  else if (e.key === 'Escape'){ toggleToc(false); }
  else if (e.key === 'f' || e.key === 'F'){ fullscreen(); }
  else if (e.key === 'v' || e.key === 'V'){ setView(!isAll()); }
  else if (e.key === '+' || e.key === '='){ setScale(0.1); }
  else if (e.key === '-'){ setScale(-0.1); }
});

/* Em página única, a etapa atual acompanha a rolagem */
let ticking = false;
function onScroll(){
  if (!isAll() || ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const lim = $('.aula-bar').getBoundingClientRect().bottom + 60;
    let k = 0;
    slides.forEach((s, i) => { if (s.getBoundingClientRect().top <= lim) k = i; });
    if (k !== cur) mark(k);
  });
}
$('#deck').addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Inicialização ---------- */
const savedScale = store.get(KEY + 'escala'); if (savedScale) document.documentElement.style.setProperty('--scale', savedScale);

$$('textarea.py').forEach(makeRunner);
$$('.seqviz').forEach(makeSeqViz);
$$('.trace').forEach(makeTrace);
$$('pre.stat').forEach(p => { p.innerHTML = hl(p.textContent); });
$$('.matviz').forEach(makeMatViz);
$$('.quiz[data-quiz]').forEach(el => { const items = (CFG.quizzes || {})[el.dataset.quiz]; if (items) quizzes[el.dataset.quiz] = makeQuiz(el, items); });
buildToc();

$('#prev').addEventListener('click', () => go(cur - 1));
$('#next').addEventListener('click', () => go(cur + 1));
$('#btnToc').addEventListener('click', () => toggleToc());
$('#tocClose').addEventListener('click', () => toggleToc(false));
$('#scrim').addEventListener('click', () => toggleToc(false));
$('#btnBigger').addEventListener('click', () => setScale(0.1));
$('#btnSmaller').addEventListener('click', () => setScale(-0.1));
$('#btnView').addEventListener('click', () => setView(!isAll()));
$('#btnFull').addEventListener('click', fullscreen);
$('#btnProg').addEventListener('click', () => { toggleToc(true); $('#toc').scrollTop = 0; });
$('#progSave').addEventListener('click', download);
$('#progLoad').addEventListener('click', () => $('#progFile').click());
$('#progFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) upload(f); e.target.value = ''; });
$('#progClear').addEventListener('click', clearProgress);
$$('[data-goto]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const k = slides.findIndex(s => s.dataset.mod === a.dataset.goto);
  if (k >= 0) go(k, true);
}));
$$('details.sol').forEach(d => d.addEventListener('toggle', () => $$('textarea.src', d).forEach(autosize)));
window.addEventListener('resize', autosizeVisible);

let start = parseInt((location.hash || '').slice(1), 10) - 1;
if (isNaN(start)) start = parseInt(store.get(KEY + 'slide') || '0', 10) || 0;
cur = Math.max(0, Math.min(slides.length - 1, start));
setView(store.get(KEY + 'view') === 'all', true);

try {
  const saved = JSON.parse(store.get(KEY + 'estado') || 'null');
  if (saved && saved.formato === FORMATO && saved.aula === CFG.id) apply(saved, false);
} catch(e){}
ready = true;
window.aulaAutosave = autosave;
progSummary();

if (document.fonts && document.fonts.ready) document.fonts.ready.then(autosizeVisible);

setTimeout(() => {
  const st = $('#pystatus');
  if (st && typeof window.runPython !== 'function'){
    st.classList.add('fail');
    $('span', st).textContent = 'Python indisponível (verifique a internet)';
  }
}, 25000);
})();
