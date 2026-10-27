/* Visualizações da aula "Árvores balanceadas: AVL e rubro-negra" (usa assets/js/estruturas-viz.js).
   Convenção da aula: altura(None) = 0, folha = 1; fb = altura(esq) − altura(dir). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;

/* ---------- Utilidades de árvore ---------- */
const alt = n => n ? 1 + Math.max(alt(n.esq), alt(n.dir)) : 0;
const sinal = b => b > 0 ? '+' + b : String(b);
/* Cópia para desenhar (sem ponteiro para o pai, com altura recalculada) */
function copia(n){
  if (!n) return null;
  const c = { chave: n.chave, cor: n.cor, esq: copia(n.esq), dir: copia(n.dir) };
  c.fb = alt(c.esq) - alt(c.dir);
  return c;
}

/* ---------- AVL ---------- */
const h = n => n ? n.h : 0;
const upd = n => { n.h = 1 + Math.max(h(n.esq), h(n.dir)); };
const bal = n => h(n.esq) - h(n.dir);
function rotDir(z){ const y = z.esq; z.esq = y.dir; y.dir = z; upd(z); upd(y); return y; }
function rotEsq(z){ const y = z.dir; z.dir = y.esq; y.esq = z; upd(z); upd(y); return y; }

/* Insere k na AVL st.root. emit(texto, destaques) é chamado a cada passo (pode ser nulo).
   Atualiza st.simples / st.duplas. */
function avlInserir(st, k, emit){
  emit = emit || (() => {});
  const path = [];
  let cur = st.root;
  while (cur){
    if (k === cur.chave){ emit(esc(k) + ' já está na árvore: chaves repetidas são ignoradas.', { [k]: 'found' }); return; }
    path.push(cur);
    const vai = k < cur.chave ? 'esquerda' : 'direita';
    emit(esc(k) + (k < cur.chave ? ' &lt; ' : ' &gt; ') + esc(cur.chave) + ': desce para a ' + vai + '.', { [cur.chave]: 'cmp' });
    cur = k < cur.chave ? cur.esq : cur.dir;
  }
  const novo = { chave: k, esq: null, dir: null, h: 1 };
  if (!path.length) st.root = novo;
  else { const p = path[path.length - 1]; if (k < p.chave) p.esq = novo; else p.dir = novo; }
  emit(esc(k) + ' entra como folha. Agora, voltando para cima, recalculamos alturas e fatores de balanceamento.', { [k]: 'new' });
  let rot = false;
  for (let i = path.length - 1; i >= 0; i--){
    const z = path[i];
    upd(z);
    const b = bal(z);
    if (Math.abs(b) <= 1) continue;
    const pai = i > 0 ? path[i - 1] : null;
    const prende = s => { if (!pai) st.root = s; else if (pai.esq === z) pai.esq = s; else pai.dir = s; };
    let caso, nome, sub;
    if (b > 1){
      const dupla = bal(z.esq) < 0;
      caso = dupla ? 'LR' : 'LL'; nome = dupla ? 'rotação dupla esquerda-direita' : 'rotação simples à direita';
      emit('fb(' + esc(z.chave) + ') = ' + sinal(b) + ': <b>desbalanceado</b>, pesado à esquerda. O filho esquerdo tem fb ' + sinal(bal(z.esq)) + ': caso <b>' + caso + '</b> → ' + nome + '.', { [z.chave]: 'swap', [z.esq.chave]: 'cmp' });
      if (dupla){ z.esq = rotEsq(z.esq); emit('1ª rotação: à esquerda no filho ' + esc(z.esq.esq.chave) + '. Agora o caso virou LL.', { [z.chave]: 'swap', [z.esq.chave]: 'on' }); }
      sub = rotDir(z);
    } else {
      const dupla = bal(z.dir) > 0;
      caso = dupla ? 'RL' : 'RR'; nome = dupla ? 'rotação dupla direita-esquerda' : 'rotação simples à esquerda';
      emit('fb(' + esc(z.chave) + ') = ' + sinal(b) + ': <b>desbalanceado</b>, pesado à direita. O filho direito tem fb ' + sinal(bal(z.dir)) + ': caso <b>' + caso + '</b> → ' + nome + '.', { [z.chave]: 'swap', [z.dir.chave]: 'cmp' });
      if (dupla){ z.dir = rotDir(z.dir); emit('1ª rotação: à direita no filho ' + esc(z.dir.dir.chave) + '. Agora o caso virou RR.', { [z.chave]: 'swap', [z.dir.chave]: 'on' }); }
      sub = rotEsq(z);
    }
    if (caso === 'LL' || caso === 'RR') st.simples++; else st.duplas++;
    prende(sub);
    rot = true;
    emit((caso === 'LR' || caso === 'RL' ? '2ª rotação' : 'Rotação') + ' em ' + esc(z.chave) + ': ' + esc(sub.chave) + ' sobe e vira a raiz da subárvore. Todos os fatores voltaram a −1, 0 ou +1.', { [sub.chave]: 'found' });
  }
  if (!rot) emit('Todos os fatores estão entre −1 e +1: nenhuma rotação necessária.', {});
}

/* ---------- Rubro-negra (com ponteiro para o pai; None faz o papel do NIL preto) ---------- */
const R = 'R', B = 'B';
function rbRot(st, x, lado){            // lado 'esq': rotação à esquerda em x
  const o = lado === 'esq' ? 'dir' : 'esq';
  const y = x[o];
  x[o] = y[lado];
  if (y[lado]) y[lado].pai = x;
  y.pai = x.pai;
  if (!x.pai) st.root = y; else if (x === x.pai.esq) x.pai.esq = y; else x.pai.dir = y;
  y[lado] = x; x.pai = y;
}
const cor = n => n ? n.cor : B;
function rbInserir(st, k, emit){
  emit = emit || (() => {});
  let pai = null, cur = st.root;
  while (cur){
    if (k === cur.chave){ emit(esc(k) + ' já está na árvore: ignorado.', { [k]: 'on' }); return; }
    pai = cur;
    emit(esc(k) + (k < cur.chave ? ' &lt; ' : ' &gt; ') + esc(cur.chave) + ': desce para a ' + (k < cur.chave ? 'esquerda' : 'direita') + '.', { [cur.chave]: 'on' });
    cur = k < cur.chave ? cur.esq : cur.dir;
  }
  let z = { chave: k, cor: R, esq: null, dir: null, pai };
  if (!pai) st.root = z; else if (k < pai.chave) pai.esq = z; else pai.dir = z;
  emit(esc(k) + ' entra como folha <b>vermelha</b> (não muda a altura preta de ninguém).', { [k]: 'on' });
  while (z.pai && z.pai.cor === R){
    const p = z.pai, a = p.pai;
    const ladoP = p === a.esq ? 'esq' : 'dir', outro = ladoP === 'esq' ? 'dir' : 'esq';
    const tio = a[outro];
    if (cor(tio) === R){
      p.cor = B; tio.cor = B; a.cor = R;
      st.recolor++;
      emit('Pai ' + esc(p.chave) + ' e tio ' + esc(tio.chave) + ' vermelhos: <b>caso 1, recolorir</b>. Pai e tio ficam pretos, o avô ' + esc(a.chave) + ' fica vermelho e o problema sobe para ele.', { [a.chave]: 'on' });
      z = a;
      continue;
    }
    if (z === p[outro]){
      rbRot(st, p, ladoP);
      st.rot++;
      emit('Tio preto e ' + esc(z.chave) + ' forma um “triângulo” com pai e avô: <b>caso 2</b>, rotação ' + (ladoP === 'esq' ? 'à esquerda' : 'à direita') + ' no pai ' + esc(p.chave) + '. Agora é uma “linha”.', { [p.chave]: 'on', [z.chave]: 'on' });
      z = p;
    }
    const p2 = z.pai;
    p2.cor = B; a.cor = R;
    rbRot(st, a, outro);
    st.rot++;
    emit('Tio preto e nós em “linha”: <b>caso 3</b>. ' + esc(p2.chave) + ' fica preto, ' + esc(a.chave) + ' fica vermelho e rotação ' + (outro === 'esq' ? 'à esquerda' : 'à direita') + ' no avô. Pronto.', { [p2.chave]: 'on' });
  }
  if (st.root.cor === R){ st.root.cor = B; emit('A raiz ficou vermelha: pinta de <b>preto</b> (a altura preta de todos os caminhos aumenta 1).', { [st.root.chave]: 'on' }); }
  else if (!z.pai || z.pai.cor === B) emit('Nenhum vermelho com filho vermelho: todas as propriedades valem.', {});
}
/* Confere as 5 propriedades; devolve a altura preta (contando a raiz) ou lança erro */
function rbValida(n, ehRaiz){
  if (!n) return 0;
  if (ehRaiz && n.cor !== B) throw new Error('raiz vermelha');
  if (n.cor === R && (cor(n.esq) === R || cor(n.dir) === R)) throw new Error('vermelho com filho vermelho');
  if (n.esq && (n.esq.chave >= n.chave || n.esq.pai !== n)) throw new Error('ordem/pai esq');
  if (n.dir && (n.dir.chave <= n.chave || n.dir.pai !== n)) throw new Error('ordem/pai dir');
  const a = rbValida(n.esq), b = rbValida(n.dir);
  if (a !== b) throw new Error('altura preta diferente');
  return a + (n.cor === B ? 1 : 0);
}

/* ---------- Widget genérico de inserção (AVL ou RB) ---------- */
function montarInsercao(box, ds, tipo){
  let st, frames;
  const novo = () => ({ root: null, simples: 0, duplas: 0, rot: 0, recolor: 0 });
  const p = V.player(box, { render(f, stage){
    V.tree(stage, f.arv, {
      cls: n => (tipo === 'rb' ? (n.cor === R ? 'red' : 'black') + ' ' : '') + (f.hl[n.chave] || ''),
      badge: tipo === 'avl' ? (n => sinal(n.fb)) : null
    });
  } });
  const fVal = V.field(p.ctl, 'inserir', ds.valores || '', '11rem');
  V.button(p.ctl, 'Inserir', () => inserir(V.nums(fVal.value), false), 'main');
  V.button(p.ctl, 'Crescente 1–10', () => inserir([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], true));
  V.button(p.ctl, 'Aleatória', () => {
    const s = new Set(); while (s.size < 10) s.add(1 + Math.floor(Math.random() * 99));
    inserir(Array.from(s), true);
  });
  V.button(p.ctl, 'Limpar', () => { st = novo(); p.load([quadro('Árvore vazia. Digite valores e clique em Inserir.', {})]); });
  function quadro(note, hl){
    const c = { nós: contar(st.root), altura: alt(st.root) };
    if (tipo === 'avl'){ c['rotações simples'] = st.simples; c['duplas'] = st.duplas; }
    else { c['rotações'] = st.rot; c['recolorações'] = st.recolor; }
    return { arv: copia(st.root), hl: hl || {}, note, counts: c };
  }
  const contar = n => n ? 1 + contar(n.esq) + contar(n.dir) : 0;
  function inserir(vals, zera){
    if (zera || !st) st = novo();
    frames = [quadro(vals.length ? 'Vamos inserir: ' + vals.map(esc).join(', ') + '.' : 'Digite um ou mais valores.', {})];
    vals.forEach(k => {
      const emit = (txt, hl) => frames.push(quadro('<b>Inserindo ' + esc(k) + '.</b> ' + txt, hl));
      if (tipo === 'avl') avlInserir(st, k, emit); else rbInserir(st, k, emit);
    });
    p.load(frames);
  }
  st = novo();
  inserir(V.nums(ds.inicial || ''), true);
  if (ds.inicial) p.last();
}
V.register('avl', (box, ds) => montarInsercao(box, ds, 'avl'));
V.register('rubronegra', (box, ds) => montarInsercao(box, ds, 'rb'));

/* ---------- As quatro rotações, com subárvores T1..T4 ---------- */
const T = (n, a) => ({ chave: 'T' + n, sub: true, alt: a, esq: null, dir: null });
const N = (k, fb, e, d) => ({ chave: k, fb, esq: e, dir: d });
const CASOS = {
  LL: { titulo: 'Caso LL: rotação simples à direita', q: [
    { arv: N('z', '+2', N('y', '+1', T(1, 'h+1'), T(2, 'h')), T(3, 'h')), hl: { z: 'swap', y: 'cmp' }, note: 'z tem fb +2 e o filho esquerdo y tem fb +1: o peso extra está na <b>esquerda da esquerda</b>.' },
    { arv: N('y', '0', T(1, 'h+1'), N('z', '0', T(2, 'h'), T(3, 'h'))), hl: { y: 'found' }, note: '<code>z.esq = y.dir</code> (T2 muda de dono) e <code>y.dir = z</code>. y sobe; a ordem em-ordem T1 y T2 z T3 continua a mesma.' }
  ] },
  RR: { titulo: 'Caso RR: rotação simples à esquerda', q: [
    { arv: N('z', '-2', T(1, 'h'), N('y', '-1', T(2, 'h'), T(3, 'h+1'))), hl: { z: 'swap', y: 'cmp' }, note: 'z tem fb −2 e o filho direito y tem fb −1: o peso extra está na <b>direita da direita</b>.' },
    { arv: N('y', '0', N('z', '0', T(1, 'h'), T(2, 'h')), T(3, 'h+1')), hl: { y: 'found' }, note: '<code>z.dir = y.esq</code> (T2 muda de dono) e <code>y.esq = z</code>. É o espelho do caso LL.' }
  ] },
  LR: { titulo: 'Caso LR: rotação dupla esquerda-direita', q: [
    { arv: N('z', '+2', N('y', '-1', T(1, 'h'), N('x', '+1', T(2, 'h'), T(3, 'h−1'))), T(4, 'h')), hl: { z: 'swap', y: 'cmp', x: 'cmp' }, note: 'z tem fb +2, mas o filho esquerdo y tem fb −1: o peso está na <b>direita da esquerda</b>. Uma rotação simples em z não resolve (teste no laboratório!).' },
    { arv: N('z', '+2', N('x', '+2', N('y', '0', T(1, 'h'), T(2, 'h')), T(3, 'h−1')), T(4, 'h')), hl: { z: 'swap', x: 'on' }, note: '1ª rotação: <b>à esquerda em y</b>. Agora o caso virou LL.' },
    { arv: N('x', '0', N('y', '0', T(1, 'h'), T(2, 'h')), N('z', '−1', T(3, 'h−1'), T(4, 'h'))), hl: { x: 'found' }, note: '2ª rotação: <b>à direita em z</b>. O neto x vira a raiz da subárvore, com y e z como filhos.' }
  ] },
  RL: { titulo: 'Caso RL: rotação dupla direita-esquerda', q: [
    { arv: N('z', '-2', T(1, 'h'), N('y', '+1', N('x', '−1', T(2, 'h−1'), T(3, 'h')), T(4, 'h'))), hl: { z: 'swap', y: 'cmp', x: 'cmp' }, note: 'z tem fb −2, mas o filho direito y tem fb +1: o peso está na <b>esquerda da direita</b>.' },
    { arv: N('z', '-2', T(1, 'h'), N('x', '−2', T(2, 'h−1'), N('y', '0', T(3, 'h'), T(4, 'h')))), hl: { z: 'swap', x: 'on' }, note: '1ª rotação: <b>à direita em y</b>. Agora o caso virou RR.' },
    { arv: N('x', '0', N('z', '+1', T(1, 'h'), T(2, 'h−1')), N('y', '0', T(3, 'h'), T(4, 'h'))), hl: { x: 'found' }, note: '2ª rotação: <b>à esquerda em z</b>. O neto x sobe com z à esquerda e y à direita.' }
  ] }
};
V.register('rotacoes', (box, ds) => {
  const p = V.player(box, { render(f, stage){
    stage.appendChild(V.el('div', 'ev-label', esc(f.titulo)));
    V.tree(stage, f.arv, { cls: n => n.sub ? 'sub' : f.hl[n.chave] || '', badge: n => n.sub ? n.alt : n.fb, dx: 52 });
  } });
  const sel = V.select(p.ctl, 'caso', [['LL', 'LL → simples à direita'], ['RR', 'RR → simples à esquerda'], ['LR', 'LR → dupla esquerda-direita'], ['RL', 'RL → dupla direita-esquerda']], ds.caso || 'LL');
  const load = () => { const c = CASOS[sel.value]; p.load(c.q.map(q => Object.assign({ titulo: c.titulo }, q))); };
  sel.addEventListener('change', load);
  load();
});

/* ---------- Alturas: ABB × AVL × rubro-negra ---------- */
function abbAltura(vals){
  let root = null, H = 0;
  vals.forEach(k => {
    if (!root){ root = { chave: k }; H = 1; return; }
    let c = root, d = 1;
    for (;;){
      d++;
      const lado = k < c.chave ? 'esq' : 'dir';
      if (k === c.chave) return;
      if (!c[lado]){ c[lado] = { chave: k }; H = Math.max(H, d); return; }
      c = c[lado];
    }
  });
  return H;
}
function rbAltura(n){ return n ? 1 + Math.max(rbAltura(n.esq), rbAltura(n.dir)) : 0; }
V.register('alturas', (box, ds) => {
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  const fN = V.field(ctl, 'n =', ds.n || 1000, '6rem', 'number');
  const ord = V.select(ctl, 'chaves', [['cres', 'em ordem crescente'], ['alea', 'em ordem aleatória']], ds.ordem || 'cres');
  V.button(ctl, 'Calcular', draw, 'main');
  ord.addEventListener('change', draw);
  function draw(){
    const n = Math.max(1, Math.min(100000, parseInt(fN.value, 10) || 1));
    fN.value = n;
    const vals = Array.from({ length: n }, (_, i) => i + 1);
    if (ord.value === 'alea') for (let i = n - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    const avl = { root: null, simples: 0, duplas: 0 }, rb = { root: null, rot: 0, recolor: 0 };
    vals.forEach(k => { avlInserir(avl, k); rbInserir(rb, k); });
    const hABB = ord.value === 'cres' ? n : abbAltura(vals);
    const lg = Math.log2(n + 1), otima = Math.ceil(lg);
    const linhas = [
      ['ABB comum', hABB, '—'],
      ['AVL', avl.root.h, (avl.simples + avl.duplas) + ' (' + avl.simples + ' simples, ' + avl.duplas + ' duplas)'],
      ['Rubro-negra', rbAltura(rb.root), rb.rot + ' rotações, ' + rb.recolor + ' recolorações']
    ];
    const max = Math.max(hABB, 2);
    stage.innerHTML = '<div class="tblwrap"><table class="tbl ev-growth"><tr><th>Árvore</th><th>Altura</th><th style="width:38%">Comparação</th><th>Ajustes na inserção</th></tr>' +
      linhas.map(l => '<tr><td>' + l[0] + '</td><td style="font-family:var(--mono)">' + l[1].toLocaleString('pt-BR') + '</td><td><span class="ev-gbar" style="width:' + Math.max(1.5, 100 * l[1] / max) + '%"></span></td><td>' + l[2] + '</td></tr>').join('') +
      '</table></div>';
    note.innerHTML = 'Altura mínima possível com ' + n.toLocaleString('pt-BR') + ' chaves: <b>' + otima + '</b>. Garantias: AVL &lt; 1,44 log₂(n + 2) ≈ ' + (1.44 * Math.log2(n + 2)).toFixed(1).replace('.', ',') +
      '; rubro-negra ≤ 2 log₂(n + 1) ≈ ' + (2 * lg).toFixed(1).replace('.', ',') + '. A altura é o número máximo de comparações de uma busca.';
  }
  draw();
});

V.arvoresBalanceadas = { avlInserir, rbInserir, rbValida, alt };
})();
