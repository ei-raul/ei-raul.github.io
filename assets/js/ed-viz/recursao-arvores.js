/* Visualizações da aula "Recursão e árvores binárias de busca" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;

/* ---------- Pilha de chamadas ----------
   data-func="fatorial|soma" data-n="4" data-list="3 1 4 2" */
function drawStack(st, f){
  const box = V.el('div', 'rc-stack');
  if (!f.pilha.length) box.appendChild(V.el('div', 'ev-empty', 'Pilha vazia: nenhuma chamada em andamento.'));
  f.pilha.slice().reverse().forEach((q, k) => {
    const topo = k === 0;
    const d = V.el('div', 'rc-frame' + (topo ? (f.ret ? ' ret' : ' top') : ''));
    d.innerHTML = '<span class="rc-call">' + esc(q.call) + '</span><span class="rc-st">' + esc(q.st) + '</span>';
    box.appendChild(d);
  });
  box.appendChild(V.el('div', 'rc-base', 'base da pilha'));
  st.appendChild(box);
}
V.register('pilha', (box, ds) => {
  const p = V.player(box, { render: (f, st) => drawStack(st, f) });
  const func = V.select(p.ctl, 'função', [['fatorial', 'fatorial(n)'], ['soma', 'soma(lista)']], ds.func || 'fatorial');
  const fN = V.field(p.ctl, 'n =', ds.n || 4, '3.5rem', 'number');
  const fL = V.field(p.ctl, 'lista =', ds.list || '3 1 4 2', '8rem');
  V.button(p.ctl, 'Montar passos', build, 'main');
  func.addEventListener('change', () => { show(); build(); });
  function show(){ fN.parentNode.style.display = func.value === 'fatorial' ? '' : 'none'; fL.parentNode.style.display = func.value === 'soma' ? '' : 'none'; }
  function build(){
    const fr = [], pilha = []; let calls = 0;
    const snap = (note, ret) => fr.push({ pilha: pilha.map(x => Object.assign({}, x)), note, ret, counts: { 'chamadas': calls, 'quadros na pilha': pilha.length } });
    let total;
    if (func.value === 'fatorial'){
      const n = Math.max(0, Math.min(8, parseInt(fN.value, 10) || 0));
      fN.value = n;
      const fat = k => {
        calls++;
        const q = { call: 'fatorial(' + k + ')', st: 'executando' };
        pilha.push(q);
        snap('Chama <code>fatorial(' + k + ')</code>: um quadro novo, com seu próprio <code>n = ' + k + '</code>, entra no topo da pilha.');
        let r;
        if (k <= 1){
          r = 1; q.st = 'caso base: devolve 1';
          snap('<code>n &lt;= 1</code>: <b>caso base</b>. Devolve 1 sem chamar ninguém. A pilha para de crescer.', true);
        } else {
          q.st = 'espera fatorial(' + (k - 1) + ')';
          snap('<code>' + k + ' * fatorial(' + (k - 1) + ')</code>: antes de multiplicar, precisa do resultado de <code>fatorial(' + (k - 1) + ')</code>. Este quadro fica parado esperando.');
          const s = fat(k - 1);
          r = k * s; q.st = 'devolve ' + k + ' × ' + s + ' = ' + r;
          snap('<code>fatorial(' + (k - 1) + ')</code> devolveu ' + s + ' e saiu da pilha. Agora <code>' + k + ' * ' + s + ' = ' + r + '</code>.', true);
        }
        pilha.pop();
        return r;
      };
      total = fat(n);
    } else {
      const v = V.nums(fL.value).slice(0, 7);
      const rep = a => '[' + a.join(', ') + ']';
      const soma = a => {
        calls++;
        const q = { call: 'soma(' + rep(a) + ')', st: 'executando' };
        pilha.push(q);
        snap('Chama <code>soma(' + rep(a) + ')</code>.');
        let r;
        if (!a.length){
          r = 0; q.st = 'caso base: devolve 0';
          snap('Lista vazia: <b>caso base</b>, devolve 0.', true);
        } else {
          q.st = 'espera soma(' + rep(a.slice(1)) + ')';
          snap('<code>' + a[0] + ' + soma(' + rep(a.slice(1)) + ')</code>: o primeiro elemento mais a soma do resto (uma lista menor).');
          const s = soma(a.slice(1));
          r = a[0] + s; q.st = 'devolve ' + a[0] + ' + ' + s + ' = ' + r;
          snap('O resto somou ' + s + '. Devolve <code>' + a[0] + ' + ' + s + ' = ' + r + '</code>.', true);
        }
        pilha.pop();
        return r;
      };
      total = soma(v);
    }
    snap('A primeira chamada terminou: o resultado final é <b>' + total + '</b>. Foram ' + calls + (calls === 1 ? ' chamada, e a pilha chegou a ter 1 quadro.' : ' chamadas, e a pilha chegou a ter ' + calls + ' quadros ao mesmo tempo.'));
    p.load(fr);
  }
  show(); build();
});

/* ---------- Árvore de chamadas de Fibonacci ----------
   data-n="5" data-memo="nao|sim" */
function cloneVis(nd, vis){
  if (!nd || !vis.has(nd.id)) return null;
  return { id: nd.id, chave: nd.chave, esq: cloneVis(nd.esq, vis), dir: cloneVis(nd.dir, vis) };
}
V.register('fib', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.tree(st, cloneVis(f.root, f.vis), { dx: 40, cls: nd => f.st[nd.id], badge: nd => f.val[nd.id] });
  } });
  const fN = V.field(p.ctl, 'n =', ds.n || 5, '3.5rem', 'number');
  const memo = V.select(p.ctl, '', [['nao', 'sem memorização'], ['sim', 'com memorização']], ds.memo || 'nao');
  V.button(p.ctl, 'Montar passos', build, 'main');
  memo.addEventListener('change', build);
  function build(){
    const usa = memo.value === 'sim';
    const n = Math.max(0, Math.min(usa ? 12 : 7, parseInt(fN.value, 10) || 0));
    fN.value = n;
    const fr = [], vis = new Set(), st = {}, val = {}, m = {};
    let calls = 0, id = 0, root = null;
    const snap = note => fr.push({ root, vis: new Set(vis), st: Object.assign({}, st), val: Object.assign({}, val), note, counts: { 'chamadas': calls } });
    const fib = (k, pai, lado) => {
      const nd = { id: id++, chave: 'f(' + k + ')', esq: null, dir: null };
      calls++; vis.add(nd.id); st[nd.id] = 'on';
      if (pai) pai[lado] = nd; else root = nd;
      if (usa && k in m){
        st[nd.id] = 'found'; val[nd.id] = m[k];
        snap('<code>fib(' + k + ')</code> já está no dicionário <code>memo</code>: devolve ' + m[k] + ' na hora, sem novas chamadas.');
        return [nd, m[k]];
      }
      if (k < 2){
        st[nd.id] = 'done'; val[nd.id] = k;
        if (usa) m[k] = k;            // como no Python: o caso base também vai para o memo
        snap('<code>fib(' + k + ')</code>: caso base, devolve ' + k + (usa ? ', guardado em <code>memo[' + k + ']</code>.' : '.'));
        return [nd, k];
      }
      snap('<code>fib(' + k + ') = fib(' + (k - 1) + ') + fib(' + (k - 2) + ')</code>: primeiro calcula <code>fib(' + (k - 1) + ')</code>.');
      st[nd.id] = 'path';
      const [, ra] = fib(k - 1, nd, 'esq');
      st[nd.id] = 'path';
      const [, rb] = fib(k - 2, nd, 'dir');
      const r = ra + rb;
      if (usa) m[k] = r;
      st[nd.id] = 'done'; val[nd.id] = r;
      snap('<code>fib(' + k + ') = ' + ra + ' + ' + rb + ' = ' + r + '</code>' + (usa ? ', guardado em <code>memo[' + k + ']</code>.' : '.'));
      return [nd, r];
    };
    const [, r] = fib(n, null);
    snap('<b>fib(' + n + ') = ' + r + '</b> com ' + calls + ' chamadas.' + (usa ? ' Com memorização, cada valor é calculado uma única vez: O(n).' : (n >= 3 ? ' Repare quantas vezes o mesmo valor foi recalculado: o número de chamadas cresce exponencialmente.' : '')));
    p.load(fr);
  }
  build();
});

/* ---------- Árvore binária de busca: utilidades ---------- */
const novo = k => ({ chave: k, esq: null, dir: null });
const clone = nd => nd ? { chave: nd.chave, esq: clone(nd.esq), dir: clone(nd.dir) } : null;
const altura = nd => nd ? 1 + Math.max(altura(nd.esq), altura(nd.dir)) : -1;
const contar = nd => nd ? 1 + contar(nd.esq) + contar(nd.dir) : 0;
function inserirSimples(raiz, k){
  if (!raiz) return novo(k);
  let a = raiz;
  for (;;){
    if (k === a.chave) return raiz;
    const lado = k < a.chave ? 'esq' : 'dir';
    if (!a[lado]){ a[lado] = novo(k); return raiz; }
    a = a[lado];
  }
}

/* ---------- Terminologia: árvore clicável ----------
   data-tree='["A", ["B", ["D"], ["E"]], ["C", null, ["F"]]]'  ([chave, esq, dir]) */
V.register('arvore', (box, ds) => {
  const conv = (t, pai, nivel) => {
    if (!t) return null;
    const nd = { chave: t[0], pai, nivel };
    nd.esq = conv(t[1], nd, nivel + 1); nd.dir = conv(t[2], nd, nivel + 1);
    return nd;
  };
  const raiz = conv(JSON.parse(ds.tree || '["A", ["B", ["D"], ["E"]], ["C", null, ["F"]]]'), null, 0);
  const stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(stage, note);
  const ordem = []; (function w(n){ if (!n) return; w(n.esq); ordem.push(n); w(n.dir); })(raiz);
  const sub = n => { const a = []; (function w(x){ if (!x) return; a.push(x); w(x.esq); w(x.dir); })(n); return a; };
  let sel = null;
  function draw(){
    stage.innerHTML = '';
    const inSub = new Set(sel ? sub(sel) : []);
    const svg = V.tree(stage, raiz, { cls: n => n === sel ? 'on' : inSub.has(n) ? 'path' : '', badge: n => 'nível ' + n.nivel });
    svg.querySelectorAll('.ev-tnode').forEach((g, k) => { g.style.cursor = 'pointer'; g.addEventListener('click', () => { sel = ordem[k]; draw(); }); });
    if (!sel){ note.innerHTML = 'Clique em um nó. O número ao lado de cada nó é o seu <b>nível</b> (distância até a raiz).'; return; }
    const filhos = [sel.esq, sel.dir].filter(Boolean);
    const tipo = !sel.pai ? 'a <b>raiz</b> (não tem pai)' : !filhos.length ? 'uma <b>folha</b> (não tem filhos)' : 'um nó <b>interno</b>';
    note.innerHTML = '<b>' + esc(sel.chave) + '</b> é ' + tipo + '. ' +
      (sel.pai ? 'Pai: ' + esc(sel.pai.chave) + '. ' : '') +
      'Filhos: ' + (filhos.length ? filhos.map(f => esc(f.chave)).join(' e ') : 'nenhum') + '. ' +
      'Nível: ' + sel.nivel + '. Altura do nó: ' + altura(sel) + '. ' +
      'A subárvore com raiz em ' + esc(sel.chave) + ' (destacada) tem ' + inSub.size + ' nó' + (inSub.size === 1 ? '' : 's') + '.';
  }
  draw();
});

/* ---------- Percursos ----------
   data-keys="50 30 70 20 40 60 80" data-ordem="pre|em|pos|nivel" */
V.register('percursos', (box, ds) => {
  const p = V.player(box, { render(f, st){
    V.tree(st, f.root, { cls: nd => f.cls[nd.chave] });
    const lab = V.el('div', 'ev-label', 'Sequência visitada'); st.appendChild(lab);
    if (f.seq.length) V.array(st, f.seq, { idx: false, cls: i => i === f.seq.length - 1 && f.novo ? 'on' : 'done' });
    else st.appendChild(V.el('div', 'ev-empty', '(nenhum nó visitado ainda)'));
    if (f.fila){
      st.appendChild(V.el('div', 'ev-label', 'Fila'));
      if (f.fila.length) V.array(st, f.fila, { idx: false, tags: { 0: 'frente' } });
      else st.appendChild(V.el('div', 'ev-empty', '(vazia)'));
    }
  } });
  const fK = V.field(p.ctl, 'chaves (inseridas em ordem) =', ds.keys || '50 30 70 20 40 60 80', '13rem');
  const ord = V.select(p.ctl, 'percurso', [['pre', 'pré-ordem'], ['em', 'em ordem'], ['pos', 'pós-ordem'], ['nivel', 'em nível']], ds.ordem || 'pre');
  V.button(p.ctl, 'Montar passos', build, 'main');
  ord.addEventListener('change', build);
  function build(){
    let root = null;
    V.nums(fK.value).slice(0, 15).forEach(k => { root = inserirSimples(root, k); });
    const fr = [], cls = {}, seq = [];
    const snap = (note, extra) => fr.push(Object.assign({ root, cls: Object.assign({}, cls), seq: seq.slice(), note }, extra || {}));
    const visita = (nd, txt) => {
      seq.push(nd.chave); cls[nd.chave] = 'on';
      snap('<b>Visita ' + nd.chave + '</b>' + (txt ? ': ' + txt : '.'), { novo: true });
      cls[nd.chave] = 'done';
    };
    const nome = { pre: 'pré-ordem: raiz, esquerda, direita', em: 'em ordem: esquerda, raiz, direita', pos: 'pós-ordem: esquerda, direita, raiz', nivel: 'em nível: nível por nível, com uma fila' }[ord.value];
    snap('Percurso ' + nome + '.', ord.value === 'nivel' ? { fila: root ? [root.chave] : [] } : {});
    if (ord.value === 'nivel'){
      const fila = root ? [root] : [];
      while (fila.length){
        const nd = fila.shift();
        seq.push(nd.chave); cls[nd.chave] = 'on';
        const filhos = [nd.esq, nd.dir].filter(Boolean);
        filhos.forEach(c => fila.push(c));
        snap('Tira <b>' + nd.chave + '</b> da frente da fila e visita.' + (filhos.length ? ' Coloca os filhos no fim da fila: ' + filhos.map(c => c.chave).join(', ') + '.' : ' Não tem filhos.'), { novo: true, fila: fila.map(c => c.chave) });
        cls[nd.chave] = 'done';
      }
      snap('A fila esvaziou: todos os nós foram visitados, de cima para baixo e da esquerda para a direita.', { fila: [] });
    } else {
      const o = ord.value;
      const rec = nd => {
        if (!nd) return;
        if (o === 'pre'){ visita(nd, 'na pré-ordem, a raiz vem antes das subárvores'); }
        else { cls[nd.chave] = 'path'; snap('Chega em ' + nd.chave + '. Ainda não visita: primeiro percorre a subárvore esquerda' + (nd.esq ? ' (' + nd.esq.chave + ')' : ', que está vazia') + '.'); }
        rec(nd.esq);
        if (o === 'em') visita(nd, 'terminou a esquerda; agora a raiz, depois a direita');
        else if (o === 'pos'){ cls[nd.chave] = 'path'; snap('Volta a ' + nd.chave + ' e percorre a subárvore direita' + (nd.dir ? ' (' + nd.dir.chave + ')' : ', que está vazia') + '.'); }
        rec(nd.dir);
        if (o === 'pos') visita(nd, 'as duas subárvores terminaram; só agora a raiz');
      };
      rec(root);
      snap('Fim do percurso: ' + seq.join(', ') + '.' + (o === 'em' ? ' Em uma ABB, o percurso em ordem sai <b>ordenado</b>!' : ''));
    }
    p.load(fr);
  }
  build();
});

/* ---------- ABB interativa ----------
   data-keys="50 30 70 20 40 60 80" */
V.register('abb', (box, ds) => {
  const p = V.player(box, { render(f, st){ V.tree(st, f.root, { cls: nd => f.cls[nd.chave], empty: 'Árvore vazia (raiz = None). Insira um valor.' }); } });
  let raiz = null;
  V.nums(ds.keys || '50 30 70 20 40 60 80').forEach(k => { raiz = inserirSimples(raiz, k); });
  const fV = V.field(p.ctl, 'valor', ds.valor || 45, '4rem');
  V.button(p.ctl, 'Inserir', () => op('ins'), 'main');
  V.button(p.ctl, 'Buscar', () => op('bus'));
  V.button(p.ctl, 'Remover', () => op('rem'));
  V.button(p.ctl, '7 aleatórios', () => {
    raiz = null; const usados = new Set();
    while (usados.size < 7) usados.add(1 + Math.floor(Math.random() * 99));
    usados.forEach(k => { raiz = inserirSimples(raiz, k); });
    estatico('Inseridos em ordem aleatória: ' + Array.from(usados).join(', ') + '.');
  });
  V.button(p.ctl, '1 a 7 em ordem', () => {
    raiz = null; for (let k = 1; k <= 7; k++) raiz = inserirSimples(raiz, k);
    estatico('Inseridos <b>já ordenados</b>: cada novo valor é maior que todos e vai sempre para a direita. A árvore virou uma lista: altura 6 para 7 nós. Buscar o 7 custa 7 comparações, como na busca sequencial.');
  });
  V.button(p.ctl, 'Limpar', () => { raiz = null; estatico('Árvore vazia.'); });
  const info = r => ({ 'nós': contar(r), 'altura': altura(r) });
  function estatico(note){ p.load([{ root: clone(raiz), cls: {}, note, counts: info(raiz) }]); }
  function op(tipo){
    const k = Number(fV.value);
    if (fV.value.trim() === '' || isNaN(k)){ estatico('Digite um número.'); return; }
    const fr = []; let cmp = 0;
    const snap = (note, cls) => fr.push({ root: clone(raiz), cls: Object.assign({}, cls || {}), note, counts: Object.assign({ 'comparações': cmp }, info(raiz)) });
    // desce a partir da raiz destacando o caminho
    const caminho = {};
    let pai = null, a = raiz;
    while (a && a.chave !== k){
      cmp++;
      const lado = k < a.chave ? 'esq' : 'dir';
      caminho[a.chave] = 'cmp';
      snap('<code>' + k + (lado === 'esq' ? ' &lt; ' : ' &gt; ') + a.chave + '</code>: ' + (lado === 'esq' ? 'vai para a esquerda' : 'vai para a direita') + '.', caminho);
      caminho[a.chave] = 'path';
      pai = a; a = a[lado];
    }
    if (a) cmp++;
    if (tipo === 'ins'){
      if (a){ caminho[k] = 'found'; snap('O ' + k + ' já está na árvore. Nesta ABB não guardamos repetidos.', caminho); }
      else {
        const nd = novo(k);
        if (!pai) raiz = nd; else pai[k < pai.chave ? 'esq' : 'dir'] = nd;
        caminho[k] = 'found';
        snap((pai ? 'Chegou a um filho vazio (None) de ' + pai.chave + ': o novo nó entra ali, como <b>folha</b>.' : 'A árvore estava vazia: o novo nó vira a raiz.') + ' Foram ' + cmp + ' comparações.', caminho);
      }
    } else if (tipo === 'bus'){
      if (a){ caminho[k] = 'found'; snap('<code>' + k + ' == ' + k + '</code>: <b>encontrado</b> com ' + cmp + ' comparações (altura da árvore: ' + altura(raiz) + ').', caminho); }
      else snap('Chegou a um None: o ' + k + ' não está na árvore. ' + cmp + ' comparações.', caminho);
    } else {
      if (!a){ snap('Chegou a um None: o ' + k + ' não está na árvore, nada a remover.', caminho); p.load(fr); return; }
      caminho[k] = 'swap';
      const filhos = (a.esq ? 1 : 0) + (a.dir ? 1 : 0);
      const troca = (velho, nv) => { if (!pai) raiz = nv; else if (pai.esq === velho) pai.esq = nv; else pai.dir = nv; };
      if (filhos < 2){
        snap('Achou o ' + k + '. Ele tem ' + (filhos ? '<b>um filho</b>: o filho sobe e ocupa o lugar dele.' : '<b>nenhum filho</b> (é folha): basta desligá-lo do pai.'), caminho);
        troca(a, a.esq || a.dir);
        delete caminho[k];
        snap('Removido. A propriedade da ABB continua valendo.', caminho);
      } else {
        snap('Achou o ' + k + ', que tem <b>dois filhos</b>. Vamos trocá-lo pelo <b>sucessor</b>: o menor valor da subárvore direita.', caminho);
        let ps = a, s = a.dir;
        caminho[s.chave] = 'cmp';
        snap('Entra na subárvore direita (' + s.chave + ') e desce sempre para a esquerda.', caminho);
        while (s.esq){ caminho[s.chave] = 'path'; ps = s; s = s.esq; caminho[s.chave] = 'cmp'; snap('Desce para a esquerda: ' + s.chave + '.', caminho); }
        caminho[s.chave] = 'found';
        snap('O sucessor é <b>' + s.chave + '</b>: não tem filho esquerdo, então tem no máximo um filho.', caminho);
        const sk = s.chave;
        if (ps === a) ps.dir = s.dir; else ps.esq = s.dir;
        a.chave = sk;
        delete caminho[k]; caminho[sk] = 'found';
        snap('Copia ' + sk + ' para o lugar do ' + k + ' e remove o nó antigo do sucessor (caso de zero ou um filho). Tudo à esquerda continua menor e tudo à direita, maior.', caminho);
      }
    }
    p.load(fr);
  }
  estatico('Use os botões para inserir, buscar e remover. O caminho percorrido aparece destacado.');
});
})();
