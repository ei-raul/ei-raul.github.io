/* Visualizações da aula "Listas encadeadas, pilhas e filas" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;

/* Pilha desenhada na vertical: o topo fica em cima. */
function stack(target, items, o){
  o = o || {};
  const w = V.el('div', 'lp-stackwrap');
  const s = V.el('div', 'lp-stack');
  items.forEach((x, i) => {
    const it = V.el('div', 'lp-item' + (i === items.length - 1 ? ' top' : '') + (o.cls && o.cls[i] ? ' ' + o.cls[i] : ''));
    it.textContent = x;
    s.appendChild(it);
  });
  w.append(s, V.el('div', 'lp-cap', esc(o.label || 'pilha') + (items.length ? '' : ' (vazia)')));
  target.appendChild(w);
  return w;
}
function code(target, txt){ if (txt) target.appendChild(V.el('div', 'lp-code', esc(txt))); }

/* ---------- Lista encadeada passo a passo ----------
   data-tipo="simples|dupla|circular" data-list="10 20 30" */
V.register('lista', (box, ds) => {
  let atual = V.nums(ds.list || '10 20 30');
  const p = V.player(box, { render(f, st){
    code(st, f.code);
    V.chain(st, f.v, { double: tipo.value === 'dupla', circular: tipo.value === 'circular', cls: f.cls, tags: f.tags, head: 'self.inicio' });
    if (f.novo !== undefined){
      const r = V.el('div', 'lp-novo');
      V.chain(r, [f.novo], { head: 'novo', cls: { 0: 'new' }, end: f.novoEnd || 'None', double: tipo.value === 'dupla' });
      st.appendChild(r);
    }
  } });
  const tipo = V.select(p.ctl, 'lista', [['simples', 'simplesmente encadeada'], ['dupla', 'duplamente encadeada'], ['circular', 'circular']], ds.tipo || 'simples');
  const op = V.select(p.ctl, '', [['ini', 'inserir no início'], ['fim', 'inserir no fim'], ['pos', 'inserir na posição'], ['rem', 'remover o valor'], ['busca', 'buscar o valor']], ds.op || 'pos');
  const fVal = V.field(p.ctl, 'valor', ds.valor || 25, '3.5rem');
  const fPos = V.field(p.ctl, 'posição', ds.pos || 2, '3.5rem', 'number');
  V.button(p.ctl, 'Executar', build, 'main');
  V.button(p.ctl, 'Lista inicial', () => { atual = V.nums(ds.list || '10 20 30'); mostrar(); });
  const posVis = () => { fPos.parentNode.style.display = op.value === 'pos' ? '' : 'none'; };
  op.addEventListener('change', posVis); posVis();
  tipo.addEventListener('change', mostrar);

  function tags(v, extra, fimIdx){
    const t = {};
    const put = (k, s) => { if (k >= 0 && k < v.length) t[k] = t[k] ? t[k] + ' ' + s : s; };
    if (v.length){ put(0, 'início'); put(fimIdx === undefined ? v.length - 1 : fimIdx, 'fim'); }
    Object.keys(extra || {}).forEach(k => put(Number(k), extra[k]));
    return t;
  }
  function mostrar(){
    const n = atual.length;
    const extra = tipo.value === 'circular' ? ' O último nó aponta de volta para o primeiro: não existe <code>None</code> no fim.' : tipo.value === 'dupla' ? ' Cada nó tem <code>ant</code> e <code>prox</code>.' : '';
    p.load([{ v: atual.slice(), cls: {}, tags: tags(atual), note: 'Lista com ' + n + ' nó' + (n === 1 ? '' : 's') + '.' + extra + ' Escolha uma operação e clique em <b>Executar</b>.' }]);
  }
  function build(){
    const v = atual.slice(), n = v.length, x = Number(fVal.value) || 0;
    const dupla = tipo.value === 'dupla', circ = tipo.value === 'circular';
    const fr = []; let vis = 0;
    const F = (o) => fr.push(Object.assign({ v: v.slice(), cls: {}, tags: tags(v) }, o));
    const kind = op.value;
    let pos = parseInt(fPos.value, 10); if (isNaN(pos)) pos = 0;
    const inserirInicio = () => {
      F({ code: 'novo = No(' + x + ')', novo: x, note: 'Cria o nó novo, ainda solto: <code>prox</code> vale <code>None</code>.' });
      F({ code: 'novo.prox = self.inicio', novo: x, novoEnd: n ? 'nó ' + v[0] : 'None', note: n ? 'O novo nó passa a apontar para o atual primeiro.' : 'A lista está vazia: <code>self.inicio</code> é <code>None</code>.' });
      if (dupla && n) F({ code: 'self.inicio.ant = novo', novo: x, novoEnd: 'nó ' + v[0], note: 'Na lista dupla, o antigo primeiro aponta para trás, para o novo.' });
      const w = [x].concat(v);
      if (circ && !n) F({ code: 'novo.prox = novo', novo: x, novoEnd: 'ele mesmo', note: 'Na circular, o único nó aponta para si mesmo.' });
      if (!n) F({ v: w, code: 'self.fim = novo', cls: { 0: 'new' }, tags: tags(w), note: 'Era vazia: o novo nó também é o último.' });
      if (circ && n) F({ v: v, code: 'self.fim.prox = novo', novo: x, novoEnd: 'nó ' + v[0], tags: tags(v), note: 'Na circular, o último precisa apontar para o novo primeiro.' });
      F({ v: w, code: 'self.inicio = novo', cls: { 0: 'found' }, tags: tags(w), note: '<b>Pronto.</b> Nenhum nó foi percorrido nem deslocado: inserir no início é O(1).' });
      return w;
    };
    const inserirFim = () => {
      if (!n) return inserirInicio();
      F({ code: 'novo = No(' + x + ')', novo: x, note: 'Cria o nó novo. Graças ao ponteiro <code>self.fim</code>, não é preciso percorrer a lista.' });
      if (circ) F({ code: 'novo.prox = self.inicio', novo: x, novoEnd: 'nó ' + v[0], note: 'Na circular, o novo último aponta para o primeiro.' });
      if (dupla) F({ code: 'novo.ant = self.fim', novo: x, tags: tags(v), note: 'O novo nó aponta para trás, para o atual último (' + v[n - 1] + ').' });
      const w = v.concat([x]);
      F({ v: w, code: 'self.fim.prox = novo', cls: { [n]: 'new' }, tags: tags(w, {}, n - 1), note: 'O atual último (' + v[n - 1] + ') passa a apontar para o novo nó.' });
      F({ v: w, code: 'self.fim = novo', cls: { [n]: 'found' }, tags: tags(w), note: '<b>Pronto.</b> Com o ponteiro para o fim, inserir no fim é O(1). Sem ele, seria preciso percorrer tudo: O(n).' });
      return w;
    };
    if (kind === 'ini' || (kind === 'pos' && pos <= 0)) atual = inserirInicio();
    else if (kind === 'fim' || (kind === 'pos' && pos >= n)) atual = inserirFim();
    else if (kind === 'pos'){
      vis = 1;
      F({ code: 'ant = self.inicio', tags: tags(v, { 0: 'ant' }), counts: { 'nós visitados': vis }, note: 'Para inserir na posição ' + pos + ', precisamos do nó <b>anterior</b> (posição ' + (pos - 1) + ').' });
      for (let i = 1; i < pos; i++){
        vis++;
        F({ code: 'ant = ant.prox', cls: { [i]: 'cmp' }, tags: tags(v, { [i]: 'ant' }), counts: { 'nós visitados': vis }, note: 'Anda um nó (volta ' + i + ' de ' + (pos - 1) + ').' });
      }
      const a = { [pos - 1]: 'ant' };
      F({ code: 'novo = No(' + x + ')', novo: x, tags: tags(v, a), counts: { 'nós visitados': vis }, note: 'Cria o nó novo.' });
      F({ code: 'novo.prox = ant.prox', novo: x, novoEnd: 'nó ' + v[pos], tags: tags(v, a), counts: { 'nós visitados': vis }, note: 'Primeiro o novo aponta para o sucessor (' + v[pos] + '). Se fizéssemos <code>ant.prox = novo</code> antes, perderíamos o resto da lista!' });
      if (dupla){
        F({ code: 'novo.ant = ant', novo: x, novoEnd: 'nó ' + v[pos], tags: tags(v, a), counts: { 'nós visitados': vis }, note: 'Na dupla: o novo aponta para trás, para ' + v[pos - 1] + '.' });
        F({ code: 'ant.prox.ant = novo', novo: x, novoEnd: 'nó ' + v[pos], tags: tags(v, a), counts: { 'nós visitados': vis }, note: 'E o sucessor (' + v[pos] + ') aponta para trás, para o novo.' });
      }
      const w = v.slice(0, pos).concat([x], v.slice(pos));
      F({ v: w, code: 'ant.prox = novo', cls: { [pos]: 'found' }, tags: tags(w, { [pos - 1]: 'ant' }), counts: { 'nós visitados': vis }, note: '<b>Pronto.</b> A ligação em si é O(1), mas chegar até o anterior exigiu visitar ' + vis + ' nó' + (vis === 1 ? '' : 's') + ': O(n) no pior caso. Nenhum elemento foi deslocado.' });
      atual = w;
    } else {
      const rem = kind === 'rem';
      if (!n){ F({ note: 'A lista está vazia: <code>self.inicio</code> é <code>None</code>, não há o que ' + (rem ? 'remover' : 'buscar') + '.' }); p.load(fr); return; }
      F({ code: rem && !dupla ? 'ant, p = None, self.inicio' : 'p = self.inicio', tags: tags(v, { 0: 'p' }), counts: { 'nós visitados': 0 }, note: 'Começa pelo primeiro nó.' + (rem && !dupla ? ' <code>ant</code> guarda o nó anterior a <code>p</code>: é ele que vai “pular” o removido.' : '') });
      let achou = -1;
      for (let i = 0; i < n; i++){
        vis++;
        const ex = { [i]: 'p' }; if (rem && !dupla && i > 0) ex[i - 1] = 'ant';
        if (v[i] === x){
          achou = i;
          F({ code: 'if p.valor == ' + x + ':', cls: { [i]: rem ? 'swap' : 'found' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: '<code>p.valor == ' + x + '</code>: ' + (rem ? '<b>encontrado</b>, vamos desligá-lo.' : '<b>encontrado</b> depois de visitar ' + vis + ' nó' + (vis === 1 ? '' : 's') + '. Buscar é O(n): não há como pular direto para o meio.') });
          break;
        }
        F({ code: rem && !dupla ? 'ant, p = p, p.prox' : 'p = p.prox', cls: { [i]: 'cmp' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: '<code>' + v[i] + ' != ' + x + '</code>: avança para o próximo.' });
      }
      if (achou < 0){
        F({ cls: () => 'dim', counts: { 'nós visitados': vis }, note: circ ? '<code>p</code> voltou a <code>self.inicio</code>: deu a volta completa sem encontrar ' + x + '.' : '<code>p</code> chegou a <code>None</code>: ' + x + ' não está na lista.' });
      } else if (rem){
        const i = achou, w = v.slice(0, i).concat(v.slice(i + 1));
        const ex = { [i]: 'p' }; if (!dupla && i > 0) ex[i - 1] = 'ant';
        if (i === 0){
          F({ code: circ && n === 1 ? 'self.inicio = None' : 'self.inicio = p.prox', cls: { 0: 'dim' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: n > 1 ? 'É o primeiro: basta o início passar a ser o segundo nó.' : 'É o único nó: o início passa a ser <code>None</code>.' });
          if (dupla && n > 1) F({ code: 'self.inicio.ant = None', cls: { 0: 'dim' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: 'Na dupla, o novo primeiro não tem anterior.' });
          if (circ && n > 1) F({ code: 'self.fim.prox = self.inicio', cls: { 0: 'dim' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: 'Na circular, o último passa a apontar para o novo primeiro.' });
        } else {
          F({ code: dupla ? 'p.ant.prox = p.prox' : 'ant.prox = p.prox', cls: { [i]: 'dim' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: 'O anterior (' + v[i - 1] + ') passa a apontar para ' + (i < n - 1 ? 'o sucessor (' + v[i + 1] + ')' : (circ ? 'o primeiro' : 'None')) + ': o nó ' + x + ' fica de fora.' });
          if (dupla && i < n - 1) F({ code: 'p.prox.ant = p.ant', cls: { [i]: 'dim' }, tags: tags(v, ex), counts: { 'nós visitados': vis }, note: 'Na dupla, o sucessor também precisa apontar para trás, para ' + v[i - 1] + '. Com um nó em mãos, a dupla remove sem precisar de <code>ant</code>.' });
        }
        if (i === n - 1 && n > 1) F({ code: dupla ? 'self.fim = p.ant' : 'self.fim = ant', cls: { [i]: 'dim' }, tags: tags(v, ex, n - 2), counts: { 'nós visitados': vis }, note: 'Era o último: o fim recua um nó.' });
        if (n === 1) F({ v: [], code: 'self.fim = None', counts: { 'nós visitados': vis }, note: 'Era o único nó: a lista ficou vazia.' });
        F({ v: w, tags: tags(w), counts: { 'nós visitados': vis }, note: '<b>Removido.</b> O nó sem referências é recolhido pelo coletor de lixo do Python.' });
        atual = w;
      }
    }
    p.load(fr);
  }
  mostrar();
});

/* ---------- Pilha ou fila interativa ----------
   data-modo="pilha|fila" data-list="..." */
V.register('pilhafila', (box, ds) => {
  const pilha = ds.modo !== 'fila';
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  let itens = V.nums(ds.list || '');
  let prox = itens.length ? Math.max(...itens) + 1 : 1;
  const fVal = V.field(ctl, 'valor', prox, '3.5rem');
  V.button(ctl, pilha ? 'Empilhar (push)' : 'Enfileirar', () => {
    const x = fVal.value.trim() === '' ? prox : fVal.value.trim();
    itens.push(isNaN(x) ? x : Number(x));
    prox = (Number(x) || prox) + 1; fVal.value = prox;
    draw(pilha ? 'append(' + esc(x) + '): entra no <b>topo</b>.' : 'append(' + esc(x) + '): entra no <b>fim</b> da fila.', 'new');
  }, 'main');
  V.button(ctl, pilha ? 'Desempilhar (pop)' : 'Desenfileirar', () => {
    if (!itens.length){ draw(pilha ? '<b>Pilha vazia!</b> <code>pop()</code> daria <code>IndexError</code>. Sempre verifique antes.' : '<b>Fila vazia!</b> Não há ninguém para atender.'); return; }
    const x = pilha ? itens.pop() : itens.shift();
    draw((pilha ? 'pop() devolveu <b>' + esc(x) + '</b>: o último que entrou é o primeiro a sair (LIFO).' : 'popleft() devolveu <b>' + esc(x) + '</b>: o primeiro que entrou é o primeiro a sair (FIFO).'));
  });
  V.button(ctl, pilha ? 'Ver topo' : 'Ver frente', () => {
    draw(itens.length ? (pilha ? 'O topo é <b>' + esc(itens[itens.length - 1]) + '</b> (<code>p[-1]</code>): olhar não remove.' : 'A frente é <b>' + esc(itens[0]) + '</b> (<code>f[0]</code>): olhar não remove.') : 'Está vazia.');
  });
  function draw(msg, last){
    stage.innerHTML = '';
    if (pilha) stack(stage, itens.map(String), { cls: last ? { [itens.length - 1]: 'new' } : {} });
    else if (itens.length) V.array(stage, itens, { name: 'fila', cls: last ? { [itens.length - 1]: 'new' } : {}, tags: i => (i === 0 ? 'frente' : '') + (i === itens.length - 1 ? (i === 0 ? ' fim' : 'fim') : '') });
    else stage.appendChild(V.el('div', 'ev-empty', 'Fila vazia'));
    note.innerHTML = (msg ? msg + ' ' : '') + 'Tamanho: <b>' + itens.length + '</b>.';
  }
  draw(pilha ? 'Pilha: só se mexe no <b>topo</b>.' : 'Fila: entra pelo <b>fim</b>, sai pela <b>frente</b>.');
});

/* ---------- Fila circular em vetor ----------
   data-cap="6" */
V.register('filacircular', (box, ds) => {
  const cap = Math.max(2, parseInt(ds.cap, 10) || 6);
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  let dados, frente, tamanho, prox;
  const fVal = V.field(ctl, 'valor', 10, '3.5rem');
  V.button(ctl, 'Enfileirar', () => {
    if (tamanho === cap){ draw('<b>Fila cheia!</b> tamanho == capacidade (' + cap + '). Seria preciso recusar ou criar um vetor maior.'); return; }
    const x = Number(fVal.value) || prox, tras = (frente + tamanho) % cap;
    dados[tras] = x; tamanho++;
    prox = x + 10; fVal.value = prox;
    draw('<code>tras = (frente + tamanho) % capacidade = (' + frente + ' + ' + (tamanho - 1) + ') % ' + cap + ' = ' + tras + '</code>; <code>dados[' + tras + '] = ' + x + '</code>.', tras);
  }, 'main');
  V.button(ctl, 'Desenfileirar', () => {
    if (!tamanho){ draw('<b>Fila vazia!</b> Nada para remover.'); return; }
    const x = dados[frente], f0 = frente;
    dados[frente] = null; frente = (frente + 1) % cap; tamanho--;
    draw('Saiu <b>' + x + '</b> de <code>dados[' + f0 + ']</code>. <code>frente = (' + f0 + ' + 1) % ' + cap + ' = ' + frente + '</code>. Ninguém foi deslocado: O(1).');
  });
  V.button(ctl, 'Esvaziar', reset);
  function reset(){ dados = new Array(cap).fill(null); frente = 0; tamanho = 0; prox = 10; fVal.value = prox; draw('Vetor de capacidade ' + cap + ' vazio.'); }
  function draw(msg, novo){
    stage.innerHTML = '';
    const tras = (frente + tamanho) % cap;
    V.array(stage, dados.map(x => x === null ? '' : x), { name: 'dados', cls: i => i === novo ? 'found' : dados[i] === null ? 'empty' : 'path', tags: i => [tamanho && i === frente ? 'frente' : '', tamanho < cap && i === tras ? 'trás' : ''].filter(Boolean).join(' ') });
    stage.appendChild(V.el('div', 'lp-info', 'frente = <b>' + frente + '</b> · tamanho = <b>' + tamanho + '</b> · próxima posição livre (trás) = <b>' + (tamanho < cap ? tras : '—') + '</b> · depois do índice ' + (cap - 1) + ' volta ao 0 ↺'));
    note.innerHTML = msg || '';
  }
  reset();
});

/* ---------- Parênteses balanceados ----------
   data-expr="(a[b]{c})" */
const PARES = { ')': '(', ']': '[', '}': '{' };
V.register('parenteses', (box, ds) => {
  const p = V.player(box, { render(f, st){
    const row = V.el('div', 'lp-row');
    const left = V.el('div');
    V.array(left, f.s, { name: 'expr', cls: f.cls, tags: f.tags });
    row.appendChild(left);
    stack(row, f.pilha, { cls: f.pcls });
    st.appendChild(row);
  } });
  const fExpr = V.field(p.ctl, 'expressão', ds.expr || '{[a+(b*c)]-d}', '13rem');
  V.button(p.ctl, 'Verificar', build, 'main');
  ['(a+b))', '([)]', '((x)'].forEach(e => V.button(p.ctl, e, () => { fExpr.value = e; build(); }));
  function build(){
    const s = Array.from(fExpr.value.replace(/\s+/g, '')).slice(0, 24), pilha = [], fr = [];
    fr.push({ s, pilha: [], cls: {}, tags: {}, note: 'Percorre a expressão da esquerda para a direita. Abriu: empilha. Fechou: o topo precisa ser o par correspondente.' });
    let ok = true;
    for (let i = 0; i < s.length && ok; i++){
      const c = s[i], base = { s, cls: k => k === i ? 'on' : k < i ? 'dim' : '', tags: { [i]: 'i' } };
      if ('([{'.includes(c)){
        pilha.push(c);
        fr.push(Object.assign({ pilha: pilha.slice(), pcls: { [pilha.length - 1]: 'new' }, note: '<code>' + c + '</code> abre: <code>pilha.append("' + c + '")</code>.' }, base));
      } else if (PARES[c]){
        if (!pilha.length){ ok = false; fr.push(Object.assign({ pilha: [], cls: k => k === i ? 'swap' : k < i ? 'dim' : '', note: '<code>' + c + '</code> fecha, mas a pilha está <b>vazia</b>: não há quem abrir. <b>Não balanceada.</b>' }, { s, tags: base.tags })); break; }
        const t = pilha[pilha.length - 1];
        if (t === PARES[c]){
          fr.push(Object.assign({ pilha: pilha.slice(), pcls: { [pilha.length - 1]: 'out' }, note: '<code>' + c + '</code> fecha e o topo é <code>' + t + '</code>: formam par. <code>pilha.pop()</code>.' }, base));
          pilha.pop();
        } else {
          ok = false;
          fr.push({ s, pilha: pilha.slice(), pcls: { [pilha.length - 1]: 'out' }, cls: k => k === i ? 'swap' : k < i ? 'dim' : '', tags: base.tags, note: '<code>' + c + '</code> fecha, mas o topo é <code>' + t + '</code>: não combinam. <b>Não balanceada.</b>' });
        }
      } else fr.push(Object.assign({ pilha: pilha.slice(), note: '<code>' + esc(c) + '</code> não é parêntese: ignora.' }, base));
    }
    if (ok) fr.push({ s, pilha: pilha.slice(), cls: () => pilha.length ? 'dim' : 'done', tags: {}, note: pilha.length ? 'Acabou a expressão, mas a pilha <b>ainda tem</b> ' + pilha.join(' ') + ': alguém abriu e não fechou. <b>Não balanceada.</b>' : 'Acabou a expressão com a pilha vazia: <b>balanceada!</b>' });
    p.load(fr);
  }
  build();
});

/* ---------- Avaliação de expressão pós-fixa ----------
   data-expr="5 1 2 + 4 * + 3 -" */
V.register('posfixa', (box, ds) => {
  const p = V.player(box, { render(f, st){
    const row = V.el('div', 'lp-row');
    const left = V.el('div');
    V.array(left, f.t, { name: 'tokens', cls: f.cls, tags: f.tags });
    row.appendChild(left);
    stack(row, f.pilha.map(String), { cls: f.pcls });
    st.appendChild(row);
  } });
  const fExpr = V.field(p.ctl, 'expressão', ds.expr || '5 1 2 + 4 * + 3 -', '13rem');
  V.button(p.ctl, 'Avaliar', build, 'main');
  const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => b === 0 ? NaN : Math.floor(a / b) };
  function build(){
    const t = fExpr.value.trim().split(/\s+/).filter(Boolean).slice(0, 20), pilha = [], fr = [];
    fr.push({ t, pilha: [], cls: {}, tags: {}, note: 'Número: empilha. Operador: desempilha dois, calcula e empilha o resultado. (Aqui <code>/</code> é a divisão inteira <code>//</code>.)' });
    let erro = false;
    for (let i = 0; i < t.length; i++){
      const tk = t[i], base = { t, cls: k => k === i ? 'on' : k < i ? 'dim' : '', tags: { [i]: 'i' } };
      if (OPS[tk]){
        if (pilha.length < 2){ erro = true; fr.push(Object.assign({ pilha: pilha.slice(), note: '<code>' + tk + '</code> precisa de dois operandos, mas a pilha tem ' + pilha.length + '. <b>Expressão inválida.</b>' }, base)); break; }
        const b = pilha.pop(), a = pilha.pop(), r = OPS[tk](a, b);
        if (isNaN(r)){ erro = true; fr.push(Object.assign({ pilha: pilha.slice(), note: 'Divisão por zero! <b>Expressão inválida.</b>' }, base)); break; }
        pilha.push(r);
        fr.push(Object.assign({ pilha: pilha.slice(), pcls: { [pilha.length - 1]: 'new' }, note: '<code>b = pop()</code> → ' + b + ', <code>a = pop()</code> → ' + a + '; empilha <code>a ' + tk + ' b = ' + a + ' ' + tk + ' ' + b + ' = ' + r + '</code>. A ordem importa em <code>-</code> e <code>/</code>!' }, base));
      } else if (/^-?\d+$/.test(tk)){
        pilha.push(Number(tk));
        fr.push(Object.assign({ pilha: pilha.slice(), pcls: { [pilha.length - 1]: 'new' }, note: 'Número ' + tk + ': empilha.' }, base));
      } else { erro = true; fr.push(Object.assign({ pilha: pilha.slice(), note: 'Símbolo desconhecido <code>' + esc(tk) + '</code>. <b>Expressão inválida.</b>' }, base)); break; }
    }
    if (!erro) fr.push({ t, pilha: pilha.slice(), cls: () => 'done', tags: {}, note: pilha.length === 1 ? 'Fim: sobrou exatamente um valor. <b>Resultado: ' + pilha[0] + '</b>.' : !pilha.length ? 'Expressão vazia: não há resultado. <b>Expressão inválida.</b>' : 'Fim, mas a pilha tem ' + pilha.length + ' valores: faltou operador. <b>Expressão inválida.</b>' });
    p.load(fr);
  }
  build();
});
})();
