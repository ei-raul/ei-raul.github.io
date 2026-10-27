/* Visualizações da aula "Heap, fila de prioridade e ordenação" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;
const lista = s => '[' + s.join(', ') + ']';

/* ---------- Heap: árvore e vetor lado a lado ----------
   data-list="..." (valores iniciais; vira heap com "construir") data-tipo="max|min" */
function heapTree(h, cls){
  const nodes = h.map((x, i) => ({ chave: x, i }));
  nodes.forEach((n, i) => { n.esq = nodes[2 * i + 1] || null; n.dir = nodes[2 * i + 2] || null; });
  return { root: nodes[0] || null, cls: n => cls[n.i] || '' };
}
V.register('heap', (box, ds) => {
  const p = V.player(box, { render(f, st){
    const sp = V.el('div', 'ev-split'), a = V.el('div'), b = V.el('div');
    sp.append(a, b); st.appendChild(sp);
    a.appendChild(V.el('div', 'ev-label', 'Como árvore'));
    const t = heapTree(f.h, f.cls || {});
    V.tree(a, t.root, { cls: t.cls, badge: n => n.i, empty: 'Heap vazio' });
    b.appendChild(V.el('div', 'ev-label', 'Como vetor (o que fica na memória)'));
    if (f.h.length) V.array(b, f.h, { name: 'h', cls: f.cls || {}, tags: f.tags || {} });
    else b.appendChild(V.el('div', 'ev-empty', 'h = []'));
    b.appendChild(V.el('p', 'ev-hint', 'pai(i) = (i − 1) // 2 · filhos: 2i + 1 e 2i + 2'));
  } });
  const tipo = V.select(p.ctl, 'heap', [['max', 'máximo'], ['min', 'mínimo']], ds.tipo || 'max');
  const fVal = V.field(p.ctl, 'valor', ds.valor || 10, '3.5rem');
  V.button(p.ctl, 'Inserir', () => run(inserir), 'main');
  V.button(p.ctl, 'Remover topo', () => run(remover));
  const fList = V.field(p.ctl, 'vetor', ds.list || '4 10 3 5 1 8 7', '11rem');
  V.button(p.ctl, 'Construir heap', () => run(construir));
  let h = [];
  const prio = (a, b) => tipo.value === 'max' ? a > b : a < b;   // a tem mais prioridade que b?
  const nome = () => tipo.value === 'max' ? 'maior' : 'menor';
  function run(op){ const fr = []; const c = { 'comparações': 0, trocas: 0 }; op(fr, c); p.load(fr); }
  function push(fr, c, cls, note, tags){ fr.push({ h: h.slice(), cls: cls || {}, tags: tags || {}, note, counts: Object.assign({}, c) }); }
  function descer(fr, c, i, n){
    while (true){
      const l = 2 * i + 1, r = l + 1;
      if (l >= n){ push(fr, c, { [i]: 'done' }, 'h[' + i + '] não tem filhos: parou de descer.'); return; }
      let m = l;
      c['comparações']++;
      if (r < n){ c['comparações']++; if (prio(h[r], h[l])) m = r; }
      const cls = { [i]: 'on', [l]: 'cmp' }; if (r < n) cls[r] = 'cmp';
      push(fr, c, cls, 'Compara h[' + i + '] = ' + h[i] + ' com os filhos; o filho de ' + nome() + ' prioridade é h[' + m + '] = ' + h[m] + '.');
      if (!prio(h[m], h[i])){ push(fr, c, { [i]: 'done' }, h[i] + ' não perde para nenhum filho: parou de descer.'); return; }
      [h[i], h[m]] = [h[m], h[i]]; c.trocas++;
      push(fr, c, { [i]: 'swap', [m]: 'swap' }, 'Troca h[' + i + '] com h[' + m + ']: ' + h[m] + ' desce um nível.');
      i = m;
    }
  }
  function inserir(fr, c){
    const x = Number(fVal.value);
    if (isNaN(x)){ push(fr, c, {}, 'Digite um número.'); return; }
    if (h.length >= 31){ push(fr, c, {}, 'Para caber na tela, o heap vai até 31 elementos. Remova alguns.'); return; }
    h.push(x);
    let i = h.length - 1;
    push(fr, c, { [i]: 'new' }, '<code>h.append(' + esc(x) + ')</code>: entra na primeira posição livre, a ' + i + '. A forma de árvore quase completa se mantém; agora o valor <b>sobe</b> enquanto tiver prioridade sobre o pai.');
    while (i > 0){
      const pai = Math.floor((i - 1) / 2);
      c['comparações']++;
      push(fr, c, { [i]: 'on', [pai]: 'cmp' }, 'pai de ' + i + ' é (' + i + ' − 1) // 2 = ' + pai + '. Compara ' + h[i] + ' com ' + h[pai] + '.');
      if (!prio(h[i], h[pai])){ push(fr, c, { [i]: 'done' }, 'Não passa do pai: a propriedade de heap está valendo. Fim da inserção, O(log n).'); return; }
      [h[i], h[pai]] = [h[pai], h[i]]; c.trocas++;
      push(fr, c, { [i]: 'swap', [pai]: 'swap' }, 'Troca com o pai: ' + h[pai] + ' sobe para a posição ' + pai + '.');
      i = pai;
    }
    push(fr, c, { 0: 'found' }, 'Chegou à raiz: ' + h[0] + ' é o novo topo.');
  }
  function remover(fr, c){
    if (!h.length){ push(fr, c, {}, 'O heap está vazio.'); return; }
    const topo = h[0];
    push(fr, c, { 0: 'found' }, 'O topo h[0] = ' + topo + ' é o elemento de ' + nome() + ' prioridade: é ele que sai.');
    const ult = h.pop();
    if (!h.length){ push(fr, c, {}, 'Era o único elemento. Removido: ' + topo + '.'); return; }
    h[0] = ult;
    push(fr, c, { 0: 'new' }, 'O último elemento (' + ult + ') vai para a raiz, para a árvore continuar quase completa. Agora ele <b>desce</b>.');
    descer(fr, c, 0, h.length);
    push(fr, c, { 0: 'found' }, 'Removido: ' + topo + '. Novo topo: ' + h[0] + '. Custo: a altura da árvore, O(log n).');
  }
  function construir(fr, c){
    h = V.nums(fList.value).slice(0, 31);
    const n = h.length;
    push(fr, c, {}, 'Vetor original, ainda sem a propriedade de heap. As folhas (posições ' + Math.floor(n / 2) + ' em diante) já são heaps de um elemento; descemos cada nó interno, <b>do último para a raiz</b>.');
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--){
      push(fr, c, { [i]: 'on' }, 'Desce h[' + i + '] = ' + h[i] + '.');
      descer(fr, c, i, n);
    }
    push(fr, c, { 0: 'found' }, 'Heap pronto com ' + c.trocas + ' trocas. Construir de baixo para cima custa O(n), não O(n log n): a maioria dos nós está perto das folhas e desce pouco.');
  }
  tipo.addEventListener('change', () => run(construir));
  run(construir); p.last();
});

/* ---------- Ordenação com barras ----------
   data-algo="bubble|selection|insertion|merge|quick|heap" data-n="12" data-entrada="aleatoria|ordenada|invertida|quase"
   data-fixo (esconde o seletor de algoritmo) */
const NOMES = { bubble: 'bubble sort', selection: 'selection sort', insertion: 'insertion sort', merge: 'merge sort', quick: 'quick sort', heap: 'heapsort' };
function sortFrames(algo, v0){
  const v = v0.slice(), n = v.length, fr = [], done = new Set();
  let cmp = 0, sw = 0;
  const lab = algo === 'merge' ? 'escritas' : 'trocas';
  const push = (cls, note, tags) => fr.push({ v: v.slice(), cls: cls || {}, tags: tags || {}, done: Array.from(done), note, counts: { 'comparações': cmp, [lab]: sw } });
  const swap = (i, j) => { [v[i], v[j]] = [v[j], v[i]]; sw++; };
  push({}, 'Vetor inicial. Use <b>Próximo passo</b> ou <b>Animar</b>.');
  if (algo === 'bubble'){
    for (let fim = n - 1; fim > 0; fim--){
      let trocou = false;
      for (let j = 0; j < fim; j++){
        cmp++; push({ [j]: 'cmp', [j + 1]: 'cmp' }, 'Compara v[' + j + '] = ' + v[j] + ' com v[' + (j + 1) + '] = ' + v[j + 1] + '.');
        if (v[j] > v[j + 1]){ swap(j, j + 1); trocou = true; push({ [j]: 'swap', [j + 1]: 'swap' }, 'Fora de ordem: troca. O maior vai “borbulhando” para a direita.'); }
      }
      done.add(fim);
      if (!trocou){ for (let k = 0; k < fim; k++) done.add(k); push({}, 'Uma passada inteira sem trocas: o vetor já está ordenado, pode parar.'); break; }
      push({}, 'Fim da passada: o maior dos restantes chegou à posição ' + fim + '.');
    }
  } else if (algo === 'selection'){
    for (let i = 0; i < n - 1; i++){
      let m = i;
      for (let j = i + 1; j < n; j++){
        cmp++; push({ [m]: 'on', [j]: 'cmp' }, 'Menor até agora: v[' + m + '] = ' + v[m] + '. Compara com v[' + j + '] = ' + v[j] + '.', { [m]: 'menor', [i]: (m === i ? 'menor ' : '') + 'i' });
        if (v[j] < v[m]) m = j;
      }
      if (m !== i){ swap(i, m); push({ [i]: 'swap', [m]: 'swap' }, 'Troca o menor (' + v[i] + ') com v[' + i + ']. Uma troca por passada, no máximo.'); }
      done.add(i);
      push({}, 'Posição ' + i + ' definitiva.');
    }
    done.add(n - 1);
  } else if (algo === 'insertion'){
    if (n) done.add(0);
    for (let i = 1; i < n; i++){
      let j = i;
      push({ [i]: 'on' }, 'Insere v[' + i + '] = ' + v[i] + ' no trecho já ordenado à esquerda.');
      while (j > 0){
        cmp++; push({ [j - 1]: 'cmp', [j]: 'on' }, 'Compara ' + v[j - 1] + ' com ' + v[j] + '.');
        if (v[j - 1] <= v[j]){ push({ [j]: 'on' }, v[j - 1] + ' ≤ ' + v[j] + ': achou o lugar.'); break; }
        swap(j - 1, j); push({ [j - 1]: 'swap', [j]: 'swap' }, 'Maior que o inserido: troca, o inserido anda para a esquerda.');
        j--;
      }
      done.add(i);
    }
  } else if (algo === 'merge'){
    (function ms(lo, hi){
      if (hi - lo < 1) return;
      const mid = Math.floor((lo + hi) / 2);
      ms(lo, mid); ms(mid + 1, hi);
      const reg = {}; for (let k = lo; k <= hi; k++) reg[k] = 'path';
      push(reg, 'Intercala v[' + lo + '..' + mid + '] e v[' + (mid + 1) + '..' + hi + '], que já estão ordenados.', { [lo]: 'ini', [mid + 1]: 'meio', [hi]: 'fim' });
      const aux = v.slice(lo, hi + 1);
      let i = 0, j = mid + 1 - lo, k = lo;
      const ie = mid - lo, je = hi - lo;
      while (i <= ie && j <= je){
        cmp++;
        const tira = aux[i] <= aux[j] ? aux[i++] : aux[j++];
        v[k] = tira; sw++;
        push(Object.assign({}, reg, { [k]: 'swap' }), 'Compara as cabeças das metades; o menor (' + tira + ') é escrito em v[' + k + '].');
        k++;
      }
      while (i <= ie){ v[k] = aux[i++]; sw++; push(Object.assign({}, reg, { [k]: 'swap' }), 'Copia o que sobrou da metade esquerda.'); k++; }
      while (j <= je){ v[k] = aux[j++]; sw++; push(Object.assign({}, reg, { [k]: 'swap' }), 'Copia o que sobrou da metade direita.'); k++; }
      if (lo === 0 && hi === n - 1) for (let t = 0; t < n; t++) done.add(t);
    })(0, n - 1);
  } else if (algo === 'quick'){
    (function qs(lo, hi){
      if (lo > hi) return;
      if (lo === hi){ done.add(lo); return; }
      const p = v[hi]; let i = lo;
      push({ [hi]: 'on' }, 'Partição de v[' + lo + '..' + hi + ']: pivô = último = ' + p + '.', { [hi]: 'pivô', [lo]: 'i' });
      for (let j = lo; j < hi; j++){
        cmp++;
        push({ [hi]: 'on', [j]: 'cmp' }, v[j] + ' &lt; ' + p + '? ' + (v[j] < p ? 'Sim: vai para a parte dos menores (posição i).' : 'Não: fica à direita.'), { [hi]: 'pivô', [i]: (i === j ? 'i j' : 'i'), [j]: (i === j ? 'i j' : 'j') });
        if (v[j] < p){ if (i !== j){ swap(i, j); push({ [i]: 'swap', [j]: 'swap', [hi]: 'on' }, 'Troca v[' + i + '] e v[' + j + '].'); } i++; }
      }
      if (i !== hi){ swap(i, hi); }
      done.add(i);
      push({ [i]: 'found' }, 'Pivô ' + p + ' vai para a posição ' + i + ': menores à esquerda, maiores ou iguais à direita. Ele não sai mais dali.');
      qs(lo, i - 1); qs(i + 1, hi);
    })(0, n - 1);
  } else if (algo === 'heap'){
    const descer = (i, m) => {
      while (true){
        const l = 2 * i + 1, r = l + 1; let g = i;
        if (l < m){ cmp++; if (v[l] > v[g]) g = l; }
        if (r < m){ cmp++; if (v[r] > v[g]) g = r; }
        const c = { [i]: 'on' }; if (l < m) c[l] = 'cmp'; if (r < m) c[r] = 'cmp';
        if (l < m) push(c, 'Desce v[' + i + '] = ' + v[i] + ': compara com os filhos (posições ' + l + (r < m ? ' e ' + r : '') + ').');
        if (g === i) return;
        swap(i, g); push({ [i]: 'swap', [g]: 'swap' }, 'Filho maior sobe, ' + v[g] + ' desce.');
        i = g;
      }
    };
    push({}, 'Fase 1: transformar o vetor em um heap máximo (construção de baixo para cima).');
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) descer(i, n);
    push({ 0: 'on' }, 'Heap máximo pronto: o maior (' + v[0] + ') está em v[0]. Fase 2: troca o topo com o último e desce a nova raiz.');
    for (let fim = n - 1; fim > 0; fim--){
      swap(0, fim); done.add(fim);
      push({ 0: 'swap', [fim]: 'swap' }, 'O maior (' + v[fim] + ') vai para a posição ' + fim + ', que fica definitiva. O heap encolhe.');
      descer(0, fim);
    }
    if (n) done.add(0);
  }
  for (let t = 0; t < n; t++) done.add(t);
  push({}, '<b>Ordenado!</b> ' + NOMES[algo] + ': ' + cmp + ' comparações e ' + sw + ' ' + lab + ' para n = ' + n + '.');
  return fr;
}
function entrada(tipo, n){
  const v = []; for (let i = 0; i < n; i++) v.push(1 + Math.floor(Math.random() * 30));
  if (tipo === 'ordenada') v.sort((a, b) => a - b);
  if (tipo === 'invertida') v.sort((a, b) => b - a);
  if (tipo === 'quase'){
    v.sort((a, b) => a - b);
    for (let k = 0; k < Math.max(1, Math.floor(n / 6)); k++){ const i = Math.floor(Math.random() * (n - 1)); [v[i], v[i + 1]] = [v[i + 1], v[i]]; }
  }
  return v;
}
window.EDOrdenacao = { sortFrames, entrada };   // usado também nos testes automáticos
V.register('ordenacao', (box, ds) => {
  const p = V.player(box, { render(f, st){ const d = new Set(f.done); V.bars(st, f.v, { cls: i => f.cls[i] || (d.has(i) ? 'done' : ''), tags: f.tags }); } });
  const algo = V.select(p.ctl, 'algoritmo', Object.keys(NOMES).map(k => [k, NOMES[k]]), ds.algo || 'bubble');
  if (ds.fixo !== undefined) algo.parentNode.style.display = 'none';
  const tipo = V.select(p.ctl, 'entrada', [['aleatoria', 'aleatória'], ['ordenada', 'ordenada'], ['invertida', 'invertida'], ['quase', 'quase ordenada']], ds.entrada || 'aleatoria');
  const fN = V.field(p.ctl, 'n', ds.n || 12, '3.5rem', 'number');
  const fList = V.field(p.ctl, 'v =', ds.list || '', '12rem');
  V.button(p.ctl, 'Gerar e ordenar', () => { fList.value = entrada(tipo.value, Math.max(2, Math.min(30, parseInt(fN.value, 10) || 12))).join(' '); build(); }, 'main');
  V.button(p.ctl, 'Ordenar este vetor', build);
  algo.addEventListener('change', build);
  tipo.addEventListener('change', () => p.ctl.querySelector('.ev-btn.main').click());
  function build(){
    let v = V.nums(fList.value).slice(0, 30);
    if (v.length < 2){ v = entrada(tipo.value, 12); fList.value = v.join(' '); }
    p.load(sortFrames(algo.value, v));
  }
  if (!fList.value) fList.value = entrada(tipo.value, parseInt(fN.value, 10) || 12).join(' ');
  build();
});

/* ---------- Intercalação (merge) de dois vetores ordenados ----------
   data-a="..." data-b="..." */
V.register('intercalacao', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.array(st, f.a, { name: 'a', cls: k => k < f.i ? 'dim' : k === f.i ? f.ca || 'on' : '', tags: { [f.i]: 'i' } });
    V.array(st, f.b, { name: 'b', cls: k => k < f.j ? 'dim' : k === f.j ? f.cb || 'on' : '', tags: { [f.j]: 'j' } });
    if (f.c.length) V.array(st, f.c, { name: 'c', cls: { [f.c.length - 1]: f.novo ? 'found' : '' } });
    else st.appendChild(V.el('div', 'ev-empty', 'c = []'));
  } });
  const fa = V.field(p.ctl, 'a =', ds.a || '2 5 8 11', '9rem');
  const fb = V.field(p.ctl, 'b =', ds.b || '1 3 9 10 14', '9rem');
  V.button(p.ctl, 'Intercalar', build, 'main');
  function build(){
    const a = V.nums(fa.value).sort((x, y) => x - y), b = V.nums(fb.value).sort((x, y) => x - y);
    const c = [], fr = []; let i = 0, j = 0, cmp = 0;
    const push = (note, extra) => fr.push(Object.assign({ a, b, c: c.slice(), i, j, note, counts: { 'comparações': cmp, 'em c': c.length } }, extra || {}));
    push('Duas listas já ordenadas. <code>i</code> e <code>j</code> apontam para o menor elemento ainda não usado de cada uma.');
    while (i < a.length && j < b.length){
      cmp++;
      push('Compara a[' + i + '] = ' + a[i] + ' com b[' + j + '] = ' + b[j] + '.', { ca: 'cmp', cb: 'cmp' });
      if (a[i] <= b[j]){ c.push(a[i]); i++; push('O menor é ' + c[c.length - 1] + ', de a: vai para c e i avança.', { novo: true }); }
      else { c.push(b[j]); j++; push('O menor é ' + c[c.length - 1] + ', de b: vai para c e j avança.', { novo: true }); }
    }
    while (i < a.length){ c.push(a[i]); i++; push('b acabou: o resto de a é copiado sem comparar.', { novo: true }); }
    while (j < b.length){ c.push(b[j]); j++; push('a acabou: o resto de b é copiado sem comparar.', { novo: true }); }
    push('Pronto: ' + c.length + ' elementos com ' + cmp + ' comparações. Intercalar custa O(n + m): cada passo coloca um elemento em c.');
    p.load(fr);
  }
  build();
});

/* ---------- Partição de Lomuto (quick sort) ----------
   data-list="..." (o pivô é o último) */
V.register('particao', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.array(st, f.v, { name: 'v', cls: k => f.cls[k] || (k === f.hi ? 'on' : k < f.i ? 'path' : k < f.j ? 'swap' : ''), tags: f.tags });
  } });
  const fl = V.field(p.ctl, 'v =', ds.list || '7 2 9 4 1 8 3 6 5', '13rem');
  V.button(p.ctl, 'Particionar', build, 'main');
  function build(){
    const v = V.nums(fl.value).slice(0, 20), fr = [], hi = v.length - 1;
    if (hi < 1){ p.load([{ v, cls: {}, tags: {}, i: 0, j: 0, hi, note: 'Digite pelo menos dois números.' }]); return; }
    const piv = v[hi]; let i = 0, cmp = 0, sw = 0;
    const push = (j, note, cls) => fr.push({ v: v.slice(), i, j, hi, cls: cls || {}, tags: { [hi]: 'pivô', [i]: (i === j && j < hi ? 'i j' : 'i'), ...(j < hi && j !== i ? { [j]: 'j' } : {}) }, note, counts: { 'comparações': cmp, trocas: sw } });
    push(0, 'Pivô = último elemento = ' + piv + '. Verde-claro: menores que o pivô (antes de i). Rosa: maiores ou iguais (entre i e j). <code>j</code> examina um por um.');
    for (let j = 0; j < hi; j++){
      cmp++;
      if (v[j] < piv){
        push(j, v[j] + ' &lt; ' + piv + ': pertence à parte dos menores.', { [j]: 'cmp' });
        const trocou = i !== j;
        if (trocou){ [v[i], v[j]] = [v[j], v[i]]; sw++; }
        i++;
        push(j + 1, (trocou ? 'Troca para a posição i e ' : '') + 'i avança: a parte dos menores cresceu.');
      } else push(j + 1, v[j] + ' ≥ ' + piv + ': fica onde está (parte dos maiores).', { [j]: 'cmp' });
    }
    const fim = i !== hi;
    if (fim){ [v[i], v[hi]] = [v[hi], v[i]]; sw++; }
    fr.push({ v: v.slice(), i, j: hi, hi: -1, cls: { [i]: 'found' }, tags: { [i]: 'pivô' }, note: (fim ? 'Por fim o pivô troca com v[i]: está' : 'Todos os outros são menores: o pivô já está') + ' na posição definitiva ' + i + '. À esquerda, só menores; à direita, só maiores ou iguais. Agora o quick sort ordena cada lado separadamente.', counts: { 'comparações': cmp, trocas: sw } });
    p.load(fr);
  }
  build();
});

/* ---------- Counting sort ----------
   data-list="..." (inteiros de 0 a k pequenos) */
V.register('contagem', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.array(st, f.v, { name: 'v', cls: { [f.vi]: 'on' } });
    V.array(st, f.cont, { name: 'cont', cls: { [f.ci]: f.ccls || 'cmp' } });
    if (f.out.length) V.array(st, f.out, { name: 'saída', cls: { [f.out.length - 1]: f.novo ? 'found' : '' } });
    else st.appendChild(V.el('div', 'ev-empty', 'saída = []'));
  } });
  const fl = V.field(p.ctl, 'v =', ds.list || '3 1 4 1 0 3 2 4 3', '13rem');
  V.button(p.ctl, 'Ordenar por contagem', build, 'main');
  function build(){
    const v = V.nums(fl.value).map(x => Math.max(0, Math.min(15, Math.round(x)))).slice(0, 20);
    fl.value = v.join(' ');
    const k = v.length ? Math.max(...v) : 0, cont = new Array(k + 1).fill(0), out = [], fr = [];
    let ops = 0;
    const push = (note, x) => fr.push(Object.assign({ v, cont: cont.slice(), out: out.slice(), vi: -1, ci: -1, note, counts: { 'operações': ops } }, x || {}));
    push('Os valores vão de 0 a ' + k + '. Criamos <code>cont</code> com k + 1 = ' + (k + 1) + ' zeros. Nenhuma comparação entre elementos será feita!');
    v.forEach((x, i) => { cont[x]++; ops++; push('v[' + i + '] = ' + x + ': <code>cont[' + x + '] += 1</code>.', { vi: i, ci: x }); });
    push('Contagem pronta: cont[x] diz quantas vezes x aparece. Agora percorremos cont em ordem.');
    for (let x = 0; x <= k; x++){
      if (!cont[x]){ ops++; push('cont[' + x + '] = 0: nenhum ' + x + '.', { ci: x, ccls: 'dim' }); continue; }
      while (cont[x] > 0){ out.push(x); cont[x]--; ops++; push('Escreve ' + x + ' na saída (restam ' + cont[x] + ').', { ci: x, novo: true }); }
    }
    push('<b>Ordenado</b> em ' + ops + ' operações: O(n + k), com n = ' + v.length + ' e k = ' + k + '. Só vale a pena quando k (o maior valor) é pequeno.');
    p.load(fr);
  }
  build();
});

/* ---------- Radix sort (LSD, base 10) ----------
   data-list="..." */
V.register('radix', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.array(st, f.v, { name: 'v', cls: { [f.vi]: 'on' }, tags: f.v.reduce((o, x, i) => { o[i] = String(Math.floor(x / f.base) % 10); return o; }, {}) });
    const g = V.el('div', 'ho-buckets');
    f.b.forEach((b, d) => {
      const col = V.el('div', 'ho-bucket' + (d === f.bd ? ' on' : ''));
      col.innerHTML = '<span class="ho-bd">' + d + '</span>' + b.map(x => '<span class="ho-bv">' + x + '</span>').join('');
      g.appendChild(col);
    });
    st.appendChild(V.el('div', 'ev-label', 'Baldes pelo dígito das ' + f.casa));
    st.appendChild(g);
  } });
  const fl = V.field(p.ctl, 'v =', ds.list || '170 45 75 90 802 24 2 66', '14rem');
  V.button(p.ctl, 'Ordenar por dígitos', build, 'main');
  const CASAS = ['unidades', 'dezenas', 'centenas', 'unidades de milhar'];
  function build(){
    let v = V.nums(fl.value).map(x => Math.max(0, Math.min(9999, Math.round(x)))).slice(0, 14);
    fl.value = v.join(' ');
    const fr = [], max = v.length ? Math.max(...v) : 0;
    let base = 1, d = 0;
    const vazio = () => Array.from({ length: 10 }, () => []);
    do {
      const b = vazio(), casa = CASAS[d];
      const push = (note, x) => fr.push(Object.assign({ v: v.slice(), b: b.map(c => c.slice()), base, casa, vi: -1, bd: -1, note }, x || {}));
      push('Passada ' + (d + 1) + ': distribui pelo dígito das <b>' + casa + '</b> (o número pequeno acima de cada caixa).');
      v.forEach((x, i) => { const dg = Math.floor(x / base) % 10; b[dg].push(x); push(x + ' tem dígito ' + dg + ' nas ' + casa + ': vai para o balde ' + dg + '.', { vi: i, bd: dg }); });
      v = [].concat(...b);
      push('Recolhe os baldes do 0 ao 9, mantendo a ordem dentro de cada balde (estabilidade!): v = ' + lista(v) + '.');
      base *= 10; d++;
    } while (base <= max && d < 4);
    fr.push(Object.assign({}, fr[fr.length - 1], { note: '<b>Ordenado</b> em ' + d + ' passada' + (d > 1 ? 's' : '') + ', uma por dígito do maior número (' + max + '). Custo O(d · (n + 10)).' }));
    p.load(fr);
  }
  build();
});
})();
