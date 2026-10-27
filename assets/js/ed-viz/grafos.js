/* Visualizações da aula "Grafos" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;

/* Grafos de exemplo com coordenadas fixas. Arestas [a, b] ou [a, b, peso]. */
const BASE = {
  nodes: [{ id: 0, x: 60, y: 60 }, { id: 1, x: 200, y: 40 }, { id: 2, x: 340, y: 70 }, { id: 3, x: 70, y: 200 },
          { id: 4, x: 210, y: 170 }, { id: 5, x: 350, y: 210 }, { id: 6, x: 210, y: 290 }],
  edges: [[0, 1], [0, 3], [1, 2], [4, 1], [3, 4], [2, 5], [5, 4], [4, 6]]
};
const PESOS = {
  nodes: [{ id: 0, x: 50, y: 150 }, { id: 1, x: 190, y: 50 }, { id: 2, x: 190, y: 250 }, { id: 3, x: 340, y: 60 },
          { id: 4, x: 340, y: 240 }, { id: 5, x: 470, y: 150 }],
  edges: [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 5], [2, 3, 8], [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3]]
};
const DISC = ['Lógica de Programação', 'Estruturas de Dados', 'Programação Orientada a Objetos', 'Banco de Dados', 'Linguagens Web', 'Projeto Integrador'];
const DAG = {
  nodes: [{ id: 0, x: 50, y: 110, label: 'LP' }, { id: 1, x: 190, y: 40, label: 'ED' }, { id: 2, x: 190, y: 180, label: 'POO' },
          { id: 3, x: 190, y: 290, label: 'BD' }, { id: 4, x: 330, y: 230, label: 'WEB' }, { id: 5, x: 450, y: 120, label: 'PI' }],
  edges: [[0, 1], [0, 2], [2, 4], [3, 4], [1, 5], [4, 5]]
};

/* Lista de adjacência com vizinhos em ordem crescente (como nos códigos da aula). */
function adj(g, directed){
  const a = {};
  g.nodes.forEach(v => { a[v.id] = []; });
  g.edges.forEach(e => {
    a[e[0]].push({ w: e[1], p: e[2] });
    if (!directed) a[e[1]].push({ w: e[0], p: e[2] });
  });
  Object.keys(a).forEach(k => a[k].sort((x, y) => x.w - y.w));
  return a;
}
const key = (a, b) => a < b ? a + '-' + b : b + '-' + a;
const edgesOf = (g, directed) => ({ nodes: g.nodes, directed, edges: g.edges.map(e => ({ a: e[0], b: e[1], w: e[2] })) });
function panel(target, title){
  const d = V.el('div');
  d.appendChild(V.el('div', 'ev-label', esc(title)));
  target.appendChild(d);
  return d;
}

/* Representações: grafo, matriz e lista lado a lado. Clique em um vértice. */
V.register('grafo-rep', (box, ds) => {
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  const tipo = V.select(ctl, 'grafo', [['nd', 'não dirigido'], ['d', 'dirigido']], ds.tipo || 'nd');
  let sel = -1;
  tipo.addEventListener('change', draw);
  function draw(){
    const dir = tipo.value === 'd', n = BASE.nodes.length, a = adj(BASE, dir);
    stage.innerHTML = '';
    const split = V.el('div', 'ev-split');
    stage.appendChild(split);
    const left = V.el('div'), right = V.el('div');
    split.append(left, right);
    const s = V.graph(left, edgesOf(BASE, dir), {
      ncls: id => id === sel ? 'on' : (sel >= 0 && a[sel].some(x => x.w === id)) ? 'path' : '',
      ecls: e => sel >= 0 && (e.a === sel || (!dir && e.b === sel)) ? 'path' : ''
    });
    s.querySelectorAll('.ev-tnode').forEach((g, i) => {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => { sel = sel === i ? -1 : i; draw(); });
    });
    const pm = panel(right, 'Matriz de adjacência');
    let h = '<div class="tblwrap"><table class="gf-mat"><tr><th></th>' + BASE.nodes.map(v => '<th>' + v.id + '</th>').join('') + '</tr>';
    for (let i = 0; i < n; i++){
      h += '<tr' + (i === sel ? ' class="sel"' : '') + '><th>' + i + '</th>';
      for (let j = 0; j < n; j++){
        const on = a[i].some(x => x.w === j);
        h += '<td class="' + (on ? 'um' : '') + '">' + (on ? 1 : 0) + '</td>';
      }
      h += '</tr>';
    }
    pm.insertAdjacentHTML('beforeend', h + '</table></div>');
    const pl = panel(right, 'Lista de adjacência');
    pl.insertAdjacentHTML('beforeend', '<div class="gf-list">' + BASE.nodes.map(v =>
      '<div' + (v.id === sel ? ' class="sel"' : '') + '><b>' + v.id + '</b>: [' + a[v.id].map(x => x.w).join(', ') + ']</div>').join('') + '</div>');
    const E = BASE.edges.length;
    if (sel < 0) note.innerHTML = 'V = ' + n + ', E = ' + E + '. A matriz sempre ocupa V × V = ' + n * n + ' posições; a lista guarda ' + (dir ? 'E = ' + E : '2E = ' + 2 * E) + ' vizinhos. Clique em um vértice.';
    else {
      const sai = a[sel].length, ent = BASE.edges.filter(e => e[1] === sel).length;
      note.innerHTML = 'Vértice <b>' + sel + '</b>: a linha ' + sel + ' da matriz e a entrada <code>g[' + sel + ']</code> da lista mostram os mesmos vizinhos. ' +
        (dir ? 'Grau de saída ' + sai + ', grau de entrada ' + ent + '.' : 'Grau ' + sai + '.') +
        ' Na matriz, achar os vizinhos percorre a linha inteira (V posições); na lista, só os ' + sai + ' vizinhos.';
    }
  }
  draw();
});

/* BFS e DFS passo a passo. data-modo="bfs|dfs" data-origem="0" */
V.register('percurso', (box, ds) => {
  const a = adj(BASE, false), G = edgesOf(BASE, false);
  const p = V.player(box, { render(f, st){
    const split = V.el('div', 'ev-split'); st.appendChild(split);
    const left = V.el('div'), right = V.el('div'); split.append(left, right);
    V.graph(left, G, {
      ncls: id => id === f.cur ? 'on' : f.vis.includes(id) ? 'done' : f.front.includes(id) ? 'cmp' : '',
      ecls: e => key(e.a, e.b) === f.edge ? 'on' : f.tree.includes(key(e.a, e.b)) ? 'path' : '',
      nbadge: id => f.badge[id] === undefined ? '' : f.badge[id]
    });
    const pf = panel(right, f.bfs ? 'Fila (sai pela esquerda)' : 'Pilha de chamadas (topo à direita)');
    if (f.list.length) V.array(pf, f.list, { idx: false, cls: { [f.bfs ? 0 : f.list.length - 1]: 'path' } });
    else pf.appendChild(V.el('div', 'ev-empty', 'vazia'));
    const po = panel(right, 'Ordem de visita');
    if (f.vis.length) V.array(po, f.vis, { idx: false, cls: () => 'done' });
    else po.appendChild(V.el('div', 'ev-empty', 'ninguém visitado ainda'));
  } });
  const modo = V.select(p.ctl, 'percurso', [['bfs', 'em largura (BFS)'], ['dfs', 'em profundidade (DFS)']], ds.modo || 'bfs');
  const orig = V.select(p.ctl, 'origem', BASE.nodes.map(v => v.id), ds.origem || 0);
  modo.addEventListener('change', build); orig.addEventListener('change', build);
  function build(){
    const s = Number(orig.value), fr = [];
    const push = (o, note) => fr.push(Object.assign({ cur: -1, vis: [], front: [], tree: [], badge: {}, list: [], edge: '' }, o, { note }));
    if (modo.value === 'bfs'){
      const dist = { [s]: 0 }, fila = [s], vis = [], tree = [];
      push({ bfs: true, front: [s], list: fila.slice(), badge: Object.assign({}, dist) }, 'Início: <code>dist[' + s + '] = 0</code> e a fila recebe a origem. Os números acima dos vértices são as distâncias (em arestas).');
      while (fila.length){
        const v = fila.shift(); vis.push(v);
        push({ bfs: true, cur: v, vis: vis.slice(), front: fila.slice(), tree: tree.slice(), list: fila.slice(), badge: Object.assign({}, dist) }, '<code>v = fila.popleft()</code> → ' + v + '. Agora olhamos os vizinhos de ' + v + ': ' + (a[v].map(x => x.w).join(', ') || 'nenhum') + '.');
        for (const { w } of a[v]){
          if (dist[w] === undefined){
            dist[w] = dist[v] + 1; fila.push(w); tree.push(key(v, w));
            push({ bfs: true, cur: v, vis: vis.slice(), front: fila.slice(), tree: tree.slice(), list: fila.slice(), badge: Object.assign({}, dist), edge: key(v, w) }, w + ' ainda não foi descoberto: <code>dist[' + w + '] = dist[' + v + '] + 1 = ' + dist[w] + '</code> e ' + w + ' entra no fim da fila.');
          } else {
            push({ bfs: true, cur: v, vis: vis.slice(), front: fila.slice(), tree: tree.slice(), list: fila.slice(), badge: Object.assign({}, dist), edge: key(v, w) }, w + ' já foi descoberto (distância ' + dist[w] + '): ignora.');
          }
        }
      }
      push({ bfs: true, vis: vis.slice(), tree: tree.slice(), badge: Object.assign({}, dist) }, 'Fila vazia: fim. A BFS visita por <b>camadas</b> de distância 0, 1, 2… e as arestas em destaque formam a árvore de caminhos mínimos.');
    } else {
      const vis = [], tree = [], pilha = [], ordem = {};
      push({ list: [] }, 'DFS recursiva a partir de ' + s + ': cada chamada <code>dfs(v)</code> visita v e mergulha no primeiro vizinho ainda não visitado. Os números acima dos vértices são a ordem de visita.');
      const dfs = (v, pai) => {
        vis.push(v); ordem[v] = vis.length; pilha.push(v);
        if (pai !== undefined) tree.push(key(pai, v));
        push({ cur: v, vis: vis.slice(), front: pilha.slice(), tree: tree.slice(), list: pilha.slice(), badge: Object.assign({}, ordem), edge: pai !== undefined ? key(pai, v) : '' }, '<code>dfs(' + v + ')</code>: visita ' + v + ' (' + vis.length + 'º). Vizinhos: ' + (a[v].map(x => x.w).join(', ') || 'nenhum') + '.');
        for (const { w } of a[v]){
          if (!vis.includes(w)) dfs(w, v);
          else push({ cur: v, vis: vis.slice(), front: pilha.slice(), tree: tree.slice(), list: pilha.slice(), badge: Object.assign({}, ordem), edge: key(v, w) }, 'Em <code>dfs(' + v + ')</code>: ' + w + ' já foi visitado, ignora.');
        }
        pilha.pop();
        push({ cur: pilha.length ? pilha[pilha.length - 1] : -1, vis: vis.slice(), front: pilha.slice(), tree: tree.slice(), list: pilha.slice(), badge: Object.assign({}, ordem) }, '<code>dfs(' + v + ')</code> terminou: todos os vizinhos de ' + v + ' foram tratados. Volta (backtracking) para ' + (pilha.length ? '<code>dfs(' + pilha[pilha.length - 1] + ')</code>' : 'quem chamou: fim do percurso') + '.');
      };
      dfs(s);
    }
    p.load(fr);
  }
  build();
});

/* Dijkstra passo a passo. data-origem="0" */
V.register('dijkstra', (box, ds) => {
  const a = adj(PESOS, false), G = edgesOf(PESOS, false), n = PESOS.nodes.length;
  const fmt = d => d === Infinity ? '∞' : d;
  const p = V.player(box, { render(f, st){
    const split = V.el('div', 'ev-split'); st.appendChild(split);
    const left = V.el('div'), right = V.el('div'); split.append(left, right);
    V.graph(left, G, {
      ncls: id => id === f.cur ? 'on' : f.upd === id ? 'cmp' : f.done.includes(id) ? 'done' : '',
      ecls: e => key(e.a, e.b) === f.edge ? 'on' : (f.pai[e.a] === e.b || f.pai[e.b] === e.a) ? 'path' : '',
      nbadge: id => fmt(f.dist[id])
    });
    const pt = panel(right, 'Distâncias a partir da origem');
    let h = '<div class="tblwrap"><table class="tbl gf-dist"><tr><th>vértice</th>' + PESOS.nodes.map(v => '<th>' + v.id + '</th>').join('') + '</tr><tr><td>dist</td>' +
      PESOS.nodes.map(v => '<td class="' + (f.upd === v.id ? 'upd' : f.done.includes(v.id) ? 'fix' : '') + '">' + fmt(f.dist[v.id]) + '</td>').join('') + '</tr><tr><td>pai</td>' +
      PESOS.nodes.map(v => '<td>' + (f.pai[v.id] === undefined ? '–' : f.pai[v.id]) + '</td>').join('') + '</tr></table></div>';
    pt.insertAdjacentHTML('beforeend', h);
    const ph = panel(right, 'Fila de prioridade (heap): (distância, vértice)');
    const hp = f.heap.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    if (hp.length) V.array(ph, hp.map(x => '(' + x[0] + ', ' + x[1] + ')'), { idx: false, cls: { 0: 'path' } });
    else ph.appendChild(V.el('div', 'ev-empty', 'vazia'));
  } });
  const orig = V.select(p.ctl, 'origem', PESOS.nodes.map(v => v.id), ds.origem || 0);
  orig.addEventListener('change', build);
  function build(){
    const s = Number(orig.value), fr = [];
    const dist = {}, pai = {}, done = [];
    PESOS.nodes.forEach(v => { dist[v.id] = Infinity; });
    dist[s] = 0;
    let heap = [[0, s]];
    const push = (o, note) => fr.push(Object.assign({ cur: -1, upd: -1, edge: '' }, o, { dist: Object.assign({}, dist), pai: Object.assign({}, pai), done: done.slice(), heap: heap.slice(), note }));
    push({}, 'Início: distância 0 para a origem ' + s + ' e ∞ para os demais. A fila de prioridade sempre entrega o par de <b>menor distância</b>.');
    while (heap.length){
      heap.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      const [d, u] = heap.shift();
      if (d > dist[u] || done.includes(u)){
        push({ cur: u }, '<code>heappop</code> → (' + d + ', ' + u + '): entrada antiga, pois dist[' + u + '] já é ' + dist[u] + '. Ignora.');
        continue;
      }
      done.push(u);
      push({ cur: u }, '<code>heappop</code> → (' + d + ', ' + u + '). A distância de ' + u + ' agora é <b>definitiva</b>: ' + d + '. Relaxa as arestas que saem de ' + u + '.');
      for (const { w, p: peso } of a[u]){
        if (done.includes(w)) continue;
        const nd = dist[u] + peso;
        if (nd < dist[w]){
          const antes = fmt(dist[w]);
          dist[w] = nd; pai[w] = u; heap.push([nd, w]);
          push({ cur: u, upd: w, edge: key(u, w) }, 'Aresta ' + u + '–' + w + ' (peso ' + peso + '): ' + dist[u] + ' + ' + peso + ' = ' + nd + ' &lt; ' + antes + '. <b>Melhorou!</b> <code>dist[' + w + '] = ' + nd + '</code>, pai de ' + w + ' = ' + u + ', e (' + nd + ', ' + w + ') entra na fila.');
        } else {
          push({ cur: u, edge: key(u, w) }, 'Aresta ' + u + '–' + w + ' (peso ' + peso + '): ' + dist[u] + ' + ' + peso + ' = ' + nd + ' não é menor que ' + fmt(dist[w]) + '. Nada muda.');
        }
      }
    }
    push({}, 'Fila vazia: fim. As arestas em destaque (pai → filho) formam a árvore de caminhos mínimos a partir de ' + s + '.');
    p.load(fr);
  }
  build();
});

/* Ordenação topológica (algoritmo de Kahn) passo a passo. */
V.register('topologica', (box, ds) => {
  const p = V.player(box, { render(f, st){
    const split = V.el('div', 'ev-split'); st.appendChild(split);
    const left = V.el('div'), right = V.el('div'); split.append(left, right);
    V.graph(left, f.g, {
      ncls: id => id === f.cur ? 'on' : f.out.includes(id) ? 'done' : f.prontos.includes(id) ? 'cmp' : '',
      ecls: e => e.a === f.cur ? 'on' : f.out.includes(e.a) ? 'dim' : '',
      nbadge: id => f.out.includes(id) ? '' : f.grau[id]
    });
    const pp = panel(right, 'Prontos: grau de entrada 0 (sai o menor)');
    if (f.prontos.length) V.array(pp, f.prontos.map(i => DAG.nodes[i].label), { idx: false, cls: { 0: 'path' } });
    else pp.appendChild(V.el('div', 'ev-empty', 'nenhum'));
    const po = panel(right, 'Ordem topológica');
    if (f.out.length) V.array(po, f.out.map(i => DAG.nodes[i].label), { cls: () => 'done' });
    else po.appendChild(V.el('div', 'ev-empty', 'vazia'));
    right.appendChild(V.el('div', 'sv-legend', DAG.nodes.map(v => '<b>' + v.label + '</b> ' + DISC[v.id]).join(' · ')));
  } });
  const qual = V.select(p.ctl, 'grafo', [['ok', 'pré-requisitos do curso'], ['ciclo', 'com a aresta PI → LP (ciclo)']], ds.grafo || 'ok');
  qual.addEventListener('change', build);
  function build(){
    const g = { nodes: DAG.nodes, edges: DAG.edges.concat(qual.value === 'ciclo' ? [[5, 0]] : []) };
    const G = edgesOf(g, true), a = adj(g, true), n = g.nodes.length, fr = [];
    const grau = {}; g.nodes.forEach(v => { grau[v.id] = 0; });
    g.edges.forEach(e => { grau[e[1]]++; });
    let prontos = g.nodes.map(v => v.id).filter(i => grau[i] === 0);
    const out = [];
    const push = (o, note) => fr.push(Object.assign({ cur: -1 }, o, { g: G, grau: Object.assign({}, grau), prontos: prontos.slice(), out: out.slice(), note }));
    push({}, 'Uma seta u → v diz que u é pré-requisito de v. O número acima de cada vértice é o <b>grau de entrada</b>: quantos pré-requisitos faltam. Quem tem 0 está pronto.');
    while (prontos.length){
      prontos.sort((x, y) => x - y);
      const u = prontos.shift(); out.push(u);
      const lib = [];
      for (const { w } of a[u]){ grau[w]--; if (grau[w] === 0){ prontos.push(w); lib.push(DAG.nodes[w].label); } }
      push({ cur: u }, 'Sai <b>' + g.nodes[u].label + '</b> (o menor pronto) e vai para a ordem. Suas setas são removidas: o grau de entrada de ' + (a[u].map(x => g.nodes[x.w].label).join(', ') || 'ninguém') + ' diminui.' + (lib.length ? ' Ficaram prontos: ' + lib.join(', ') + '.' : ''));
    }
    if (out.length === n) push({}, 'Todos os ' + n + ' vértices saíram: esta é uma ordem válida para cursar as disciplinas. Custo O(V + E).');
    else push({}, '<b>Travou:</b> sobraram ' + (n - out.length) + ' vértices, mas nenhum com grau 0. Isso só acontece quando há um <b>ciclo</b>: não existe ordem topológica.');
    p.load(fr);
  }
  build();
});
})();
