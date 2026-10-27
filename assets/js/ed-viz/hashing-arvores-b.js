/* Visualizações da aula "Hashing, árvores B/B+ e organização de arquivos" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;
const fmt = (x, d) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');

/* ---------- Tabela hash passo a passo ----------
   data-m="7" data-est="enc|linear|quad|duplo" data-keys="..." data-chave="..." */
const NOMES = { enc: 'encadeamento', linear: 'sondagem linear', quad: 'sondagem quadrática', duplo: 'hash duplo' };
const DEL = 'DEL';
V.register('hash-tabela', (box, ds) => {
  const p = V.player(box, { render });
  const fM = V.field(p.ctl, 'm =', ds.m || 7, '3.5rem', 'number');
  const est = V.select(p.ctl, '', Object.keys(NOMES).map(k => [k, NOMES[k]]), ds.est || 'enc');
  const fK = V.field(p.ctl, 'chave', ds.chave || 24, '4rem');
  V.button(p.ctl, 'Inserir', () => op('ins'), 'main');
  V.button(p.ctl, 'Buscar', () => op('busca'));
  V.button(p.ctl, 'Remover', () => op('rem'));
  V.button(p.ctl, 'Esvaziar', () => { keys = []; rebuild(); });
  let keys = V.nums(ds.keys || ''), m, tab, n;

  const h = k => ((k % m) + m) % m;
  const h2 = k => 1 + (((k % (m - 1)) + (m - 1)) % (m - 1));
  function probe(k, i){
    if (est.value === 'linear') return (h(k) + i) % m;
    if (est.value === 'quad') return (h(k) + i * i) % m;
    return (h(k) + i * h2(k)) % m;
  }
  function formula(k, i){
    if (est.value === 'linear') return '(h(' + k + ') + ' + i + ') mod ' + m;
    if (est.value === 'quad') return '(h(' + k + ') + ' + i + '²) mod ' + m;
    return '(h(' + k + ') + ' + i + ' × ' + h2(k) + ') mod ' + m;
  }
  const snap = () => est.value === 'enc' ? tab.map(b => b.slice()) : tab.slice();
  const alpha = () => fmt(n / m, 2);

  function rebuild(){
    m = Math.max(3, Math.min(23, parseInt(fM.value, 10) || 7));
    fM.value = m;
    tab = est.value === 'enc' ? Array.from({ length: m }, () => []) : new Array(m).fill(null);
    n = 0;
    const ok = [];
    keys.forEach(k => { if (insert(k, null)) ok.push(k); });
    keys = ok;
    const extra = est.value === 'duplo' ? ' Passo do hash duplo: h₂(k) = 1 + (k mod ' + (m - 1) + ').' : '';
    p.load([{ t: snap(), note: 'Tabela com m = ' + m + ' posições, ' + NOMES[est.value] + ', h(k) = k mod ' + m + '.' + extra + (n ? ' Chaves já inseridas: ' + keys.join(', ') + '.' : ' Digite uma chave e clique em Inserir.'), counts: { n, 'fator de carga': alpha() } }]);
  }

  /* insere k; rec(frame) recebe os quadros (ou null quando é silencioso). Devolve true se inseriu. */
  function insert(k, rec){
    const R = rec || (() => {});
    const b = h(k);
    if (est.value === 'enc'){
      R({ hl: { [b]: 'on' }, note: 'h(' + k + ') = ' + k + ' mod ' + m + ' = <b>' + b + '</b>: a chave vai para a lista da posição ' + b + '.', sond: 0 });
      for (let j = 0; j < tab[b].length; j++){
        R({ hl: { [b]: 'on' }, node: [b, j, 'cmp'], note: 'Compara com ' + tab[b][j] + (tab[b][j] === k ? ': <b>já existe</b>, não insere de novo.' : ': diferente, segue a lista.'), sond: j + 1 });
        if (tab[b][j] === k) return false;
      }
      tab[b].push(k); n++;
      R({ hl: { [b]: 'on' }, node: [b, tab[b].length - 1, 'found'], note: k + ' entra no fim da lista ' + b + (tab[b].length > 1 ? ' (<b>colisão</b>: a lista agora tem ' + tab[b].length + ' chaves).' : '.'), sond: tab[b].length - 1 });
      return true;
    }
    let livre = -1;
    for (let i = 0; i < m; i++){
      const q = probe(k, i), v = tab[q];
      const tags = { [q]: i === 0 ? 'h(k)' : 'i=' + i };
      const pre = i === 0 ? 'h(' + k + ') = ' + k + ' mod ' + m + ' = <b>' + q + '</b>. ' : 'Tentativa ' + i + ': ' + formula(k, i) + ' = <b>' + q + '</b>. ';
      if (v === null){
        const dest = livre >= 0 ? livre : q;
        tab[dest] = k; n++;
        R({ cls: { [dest]: 'found', [q]: dest === q ? 'found' : 'cmp' }, tags, note: pre + (dest === q ? 'Posição livre: ' + k + ' entra aqui' : 'Posição vazia: a chave não existe; ' + k + ' entra no primeiro “apagado” encontrado, a posição ' + dest) + (i ? ' depois de ' + i + ' colis' + (i === 1 ? 'ão' : 'ões') + '.' : '.'), sond: i + 1 });
        return true;
      }
      if (v === DEL){
        if (livre < 0) livre = q;
        R({ cls: { [q]: 'cmp' }, tags, note: pre + 'Marcador “apagado”: a posição pode ser reutilizada, mas a chave ainda pode estar mais adiante. Continua.', sond: i + 1 });
        continue;
      }
      if (v === k){ R({ cls: { [q]: 'found' }, tags, note: pre + k + ' <b>já está na tabela</b>.', sond: i + 1 }); return false; }
      R({ cls: { [q]: 'swap' }, tags, note: pre + 'Ocupada por ' + v + ': <b>colisão</b>, tenta a próxima.', sond: i + 1 });
    }
    if (livre >= 0){ tab[livre] = k; n++; R({ cls: { [livre]: 'found' }, note: k + ' entra no “apagado” da posição ' + livre + '.', sond: m }); return true; }
    R({ cls: {}, note: '<b>Nenhuma posição livre foi encontrada</b> depois de ' + m + ' tentativas' + (n < m ? ' (a tabela não está cheia, mas a sequência de sondagem não alcança as posições livres; por isso m costuma ser primo).' : ': a tabela está cheia.'), sond: m });
    return false;
  }

  function find(k, rec){
    const b = h(k);
    if (est.value === 'enc'){
      rec({ hl: { [b]: 'on' }, note: 'h(' + k + ') = <b>' + b + '</b>: só a lista ' + b + ' precisa ser olhada.', sond: 0 });
      for (let j = 0; j < tab[b].length; j++){
        const eq = tab[b][j] === k;
        rec({ hl: { [b]: 'on' }, node: [b, j, eq ? 'found' : 'cmp'], note: 'Compara com ' + tab[b][j] + (eq ? ': <b>encontrada</b>.' : ': diferente.'), sond: j + 1 });
        if (eq) return [b, j];
      }
      rec({ hl: { [b]: 'on' }, note: 'Fim da lista ' + b + ': ' + k + ' <b>não está</b> na tabela.', sond: tab[b].length });
      return null;
    }
    for (let i = 0; i < m; i++){
      const q = probe(k, i), v = tab[q];
      const tags = { [q]: i === 0 ? 'h(k)' : 'i=' + i };
      const pre = i === 0 ? 'h(' + k + ') = <b>' + q + '</b>. ' : 'Tentativa ' + i + ': ' + formula(k, i) + ' = <b>' + q + '</b>. ';
      if (v === null){ rec({ cls: { [q]: 'cmp' }, tags, note: pre + 'Posição vazia: se ' + k + ' existisse, teria sido colocada aqui. <b>Não está</b> na tabela.', sond: i + 1 }); return null; }
      if (v === k){ rec({ cls: { [q]: 'found' }, tags, note: pre + '<b>Encontrada</b> com ' + (i + 1) + ' sondage' + (i ? 'ns' : 'm') + '.', sond: i + 1 }); return q; }
      rec({ cls: { [q]: 'cmp' }, tags, note: pre + (v === DEL ? '“Apagado”: não para aqui, continua procurando.' : 'Tem ' + v + ': continua.'), sond: i + 1 });
    }
    rec({ cls: {}, note: 'Fez ' + m + ' tentativas sem achar: <b>não está</b> na tabela.', sond: m });
    return null;
  }

  function op(kind){
    if (!tab) rebuild();
    const k = V.nums(fK.value)[0];
    if (k === undefined || !Number.isInteger(k)){ p.load([{ t: snap(), note: 'Digite uma chave inteira.', counts: { n, 'fator de carga': alpha() } }]); return; }
    const fr = [];
    const rec = f => fr.push(Object.assign({ t: snap(), counts: { 'sondagens': f.sond, n, 'fator de carga': alpha() } }, f));
    if (kind === 'ins'){ if (insert(k, rec)) keys.push(k); }
    else if (kind === 'busca') find(k, rec);
    else {
      const r = find(k, rec);
      if (r !== null){
        if (est.value === 'enc'){ tab[r[0]].splice(r[1], 1); rec({ hl: { [r[0]]: 'on' }, note: 'Remove o nó da lista ' + r[0] + '. Nas outras listas nada muda.', sond: r[1] + 1 }); }
        else { tab[r] = DEL; rec({ cls: { [r]: 'empty' }, tags: { [r]: 'apagado' }, note: 'A posição ' + r + ' recebe o marcador “apagado” (×), e não None: assim as buscas de chaves que colidiram aqui continuam passando por ela.', sond: 0 }); }
        n--; keys = keys.filter(x => x !== k);
        fr[fr.length - 1].counts.n = n; fr[fr.length - 1].counts['fator de carga'] = alpha();
      }
    }
    p.load(fr);
  }

  function render(f, st){
    if (est.value === 'enc'){
      const wrap = V.el('div', 'hb-tab');
      f.t.forEach((lst, i) => {
        const row = V.el('div', 'hb-row ' + ((f.hl || {})[i] || ''));
        row.appendChild(V.el('span', 'hb-idx', String(i)));
        lst.forEach((k, j) => {
          row.appendChild(V.el('span', 'ev-link', '→'));
          const c = f.node && f.node[0] === i && f.node[1] === j ? f.node[2] : '';
          row.appendChild(V.el('span', 'ev-node ' + c, '<span class="ev-nbox"><span class="ev-nv">' + esc(k) + '</span><span class="ev-np">•</span></span>'));
        });
        row.appendChild(V.el('span', 'ev-link', '→ <span class="ev-null">None</span>'));
        wrap.appendChild(row);
      });
      st.appendChild(wrap);
    } else {
      V.array(st, f.t.map(v => v === null ? '' : v === DEL ? '×' : v), { name: 'T', cls: i => (f.cls || {})[i] || (f.t[i] === null || f.t[i] === DEL ? 'empty' : ''), tags: f.tags || {} });
    }
  }
  fM.addEventListener('change', rebuild);
  est.addEventListener('change', rebuild);
  rebuild();
});

/* ---------- Calculadora de acessos a disco ---------- */
V.register('disco', (box, ds) => {
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  const fN = V.field(ctl, 'registros', ds.n || 1000000, '7rem', 'number');
  const fB = V.field(ctl, 'registros por bloco', ds.b || 100, '4rem', 'number');
  const fM = V.field(ctl, 'filhos por nó (árvore B)', ds.ordem || 200, '4rem', 'number');
  const fT = V.select(ctl, 'disco', [['10', 'HDD (10 ms por acesso)'], ['0.1', 'SSD (0,1 ms por acesso)']], '10');
  const log2c = x => Math.max(1, Math.ceil(Math.log2(x + 1)));
  /* pior caso: altura máxima, com a raiz com 1 chave e os demais nós com o mínimo de ⌈m/2⌉ filhos */
  function niveis(m, n){ const t = Math.ceil(m / 2); let h = 1; while (2 * Math.pow(t, h) - 1 <= n) h++; return h; }
  function tempo(ms){
    if (ms < 1) return fmt(ms, 2) + ' ms';
    if (ms < 1000) return fmt(ms, 0) + ' ms';
    if (ms < 60000) return fmt(ms / 1000, 1) + ' s';
    if (ms < 3600000) return fmt(ms / 60000, 1) + ' min';
    return fmt(ms / 3600000, 1) + ' h';
  }
  function draw(){
    const n = Math.max(1, parseInt(fN.value, 10) || 1), b = Math.max(1, parseInt(fB.value, 10) || 1), m = Math.max(3, parseInt(fM.value, 10) || 3);
    const t = Number(fT.value), blocos = Math.ceil(n / b), idxBlocos = Math.ceil(blocos / m);
    const rows = [
      ['Arquivo sequencial (sem ordem)', 'lê bloco a bloco até achar', blocos],
      ['Arquivo ordenado + busca binária', '⌈log₂(blocos + 1)⌉', log2c(blocos)],
      ['Índice esparso (em disco) + 1 bloco de dados', 'busca binária no índice + 1', log2c(idxBlocos) + 1],
      ['Árvore B com até ' + m + ' filhos por nó', 'um bloco por nível (altura máxima)', niveis(m, n)],
      ['Arquivo hash (buckets)', 'calcula o bucket e lê', 1]
    ];
    stage.innerHTML = '<div class="tblwrap"><table class="tbl"><tr><th>Organização</th><th>Como busca</th><th>Blocos lidos (pior caso)</th><th>Tempo</th></tr>' +
      rows.map(r => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td style="font-family:var(--mono)"><b>' + r[2].toLocaleString('pt-BR') + '</b></td><td>' + tempo(r[2] * t) + '</td></tr>').join('') + '</table></div>';
    note.innerHTML = n.toLocaleString('pt-BR') + ' registros em blocos de ' + b + ' ocupam <b>' + blocos.toLocaleString('pt-BR') + ' blocos</b>. Ler um bloco do disco custa milhares de vezes mais que comparar chaves na memória: por isso contamos blocos, não comparações.';
  }
  [fN, fB, fM].forEach(f => f.addEventListener('input', draw));
  fT.addEventListener('change', draw);
  draw();
});

/* ---------- Árvore B e B+ ----------
   data-tipo="b|bplus" data-max="3" (máximo de chaves por nó) data-keys="..." */
V.register('arvore-b', (box, ds) => {
  const plus = ds.tipo === 'bplus';
  const p = V.player(box, { render(f, st){ draw(st, f); } });
  const fK = V.field(p.ctl, 'chave', ds.chave || 25, '3.5rem');
  V.button(p.ctl, 'Inserir', () => run('ins'), 'main');
  V.button(p.ctl, 'Buscar', () => run('busca'));
  let fDe, fAte;
  if (plus){
    fDe = V.field(p.ctl, 'de', ds.de || 10, '3rem');
    fAte = V.field(p.ctl, 'até', ds.ate || 30, '3rem');
    V.button(p.ctl, 'Consultar intervalo', () => run('faixa'));
  }
  const fMax = V.select(p.ctl, 'máx. de chaves por nó', [2, 3, 4], ds.max || 3);
  V.button(p.ctl, '10 aleatórias', () => {
    for (let i = 0; i < 10; i++) insert(1 + Math.floor(Math.random() * 99), null);
    p.load([frame('Inseridas 10 chaves aleatórias.')]);
  });
  V.button(p.ctl, 'Esvaziar', () => { root = null; p.load([frame('Árvore vazia. Insira chaves para vê-la crescer.')]); });
  let root = null, ids = 0, M;
  const mk = leaf => ({ id: ++ids, keys: [], kids: [], leaf });
  const clone = nd => nd && { id: nd.id, keys: nd.keys.slice(), kids: nd.kids.map(clone), leaf: nd.leaf };
  const frame = (note, o) => Object.assign({ t: clone(root), note }, o || {});
  const childIdx = (nd, k) => nd.keys.filter(x => plus ? x <= k : x < k).length;
  function leaves(nd, out){ if (!nd) return out; if (nd.leaf) out.push(nd); else nd.kids.forEach(c => leaves(c, out)); return out; }

  function insert(k, rec){
    const R = rec || (() => {});
    if (!root){ root = mk(true); root.keys = [k]; R('A árvore estava vazia: a raiz é uma folha com a chave ' + k + '.', { hl: { [root.id]: 'found' } }); return; }
    const path = [];
    let nd = root;
    while (!nd.leaf){
      if (!plus && nd.keys.includes(k)){ R(k + ' <b>já está</b> na árvore.', { hl: { [nd.id]: 'found' } }); return; }
      const i = childIdx(nd, k);
      R('Nó [' + nd.keys.join(', ') + ']: ' + k + (i === 0 ? ' é menor que ' + nd.keys[0] : i === nd.keys.length ? ' é maior' + (plus ? ' ou igual a ' : ' que ') + nd.keys[i - 1] : ' fica entre ' + nd.keys[i - 1] + ' e ' + nd.keys[i]) + ': desce pelo ponteiro ' + i + '.', { hl: { [nd.id]: 'on' }, ptr: [nd.id, i] });
      path.push([nd, i]);
      nd = nd.kids[i];
    }
    if (nd.keys.includes(k)){ R(k + ' <b>já está</b> na árvore.', { hl: { [nd.id]: 'found' } }); return; }
    const pos = childIdx(nd, k);
    nd.keys.splice(pos, 0, k);
    R('Chega à folha e insere ' + k + ' em ordem.' + (nd.keys.length <= M ? ' A folha tem espaço (' + nd.keys.length + ' de no máximo ' + M + '): pronto.' : ''), { hl: { [nd.id]: nd.keys.length > M ? 'swap' : 'on' }, hk: { [nd.id]: [pos] } });
    while (nd.keys.length > M){
      const mid = Math.floor(nd.keys.length / 2), right = mk(nd.leaf);
      let up, how;
      if (plus && nd.leaf){
        up = nd.keys[mid];
        right.keys = nd.keys.slice(mid); nd.keys = nd.keys.slice(0, mid);
        how = 'A folha estourou (' + (M + 1) + ' chaves): divide em duas e uma <b>cópia</b> de ' + up + ' sobe como separador (na B+, a chave continua na folha da direita).';
      } else {
        up = nd.keys[mid];
        right.keys = nd.keys.slice(mid + 1);
        if (!nd.leaf){ right.kids = nd.kids.slice(mid + 1); nd.kids = nd.kids.slice(0, mid + 1); }
        nd.keys = nd.keys.slice(0, mid);
        how = 'O nó estourou (' + (M + 1) + ' chaves): divide ao meio e a chave do meio, <b>' + up + '</b>, sobe para o pai.';
      }
      if (!path.length){
        const nr = mk(false); nr.keys = [up]; nr.kids = [nd, right]; root = nr;
        R(how + ' Como era a raiz, nasce uma nova raiz: a árvore cresce <b>um nível, por cima</b>, e todas as folhas continuam na mesma profundidade.', { hl: { [nr.id]: 'found', [nd.id]: 'on', [right.id]: 'on' } });
        return;
      }
      const [par, i] = path.pop();
      par.keys.splice(i, 0, up); par.kids.splice(i + 1, 0, right);
      R(how + (par.keys.length > M ? ' O pai também estourou…' : ' O pai tem espaço: pronto.'), { hl: { [par.id]: par.keys.length > M ? 'swap' : 'found', [nd.id]: 'on', [right.id]: 'on' }, hk: { [par.id]: [i] } });
      nd = par;
    }
  }

  function search(k, rec){
    let nd = root, lidos = 0;
    if (!nd){ rec('Árvore vazia.'); return; }
    for (;;){
      lidos++;
      const at = nd.keys.indexOf(k);
      if (at >= 0 && (nd.leaf || !plus)){ rec('Lê o nó [' + nd.keys.join(', ') + ']: <b>encontrou ' + k + '</b>. Blocos lidos: ' + lidos + '.', { hl: { [nd.id]: 'found' }, hk: { [nd.id]: [at] }, counts: { 'nós lidos': lidos } }); return; }
      if (nd.leaf){ rec('Lê a folha [' + nd.keys.join(', ') + ']: ' + k + ' <b>não está</b> na árvore. Blocos lidos: ' + lidos + '.', { hl: { [nd.id]: 'cmp' }, counts: { 'nós lidos': lidos } }); return; }
      const i = childIdx(nd, k);
      rec('Lê o nó [' + nd.keys.join(', ') + ']' + (at >= 0 ? ': ' + k + ' é só um separador na B+; os dados estão na folha' : '') + ': desce pelo ponteiro ' + i + '.', { hl: { [nd.id]: 'on' }, ptr: [nd.id, i], counts: { 'nós lidos': lidos } });
      nd = nd.kids[i];
    }
  }

  function range(a, b, rec){
    if (!root){ rec('Árvore vazia.'); return; }
    if (a > b){ const t = a; a = b; b = t; }
    let nd = root, lidos = 0;
    while (!nd.leaf){
      lidos++;
      const i = childIdx(nd, a);
      rec('Desce procurando o início do intervalo, ' + a + ': nó [' + nd.keys.join(', ') + '], ponteiro ' + i + '.', { hl: { [nd.id]: 'on' }, ptr: [nd.id, i], counts: { 'nós lidos': lidos, achadas: 0 } });
      nd = nd.kids[i];
    }
    const lv = leaves(root, []);
    let li = lv.indexOf(nd), achadas = [], links = [];
    for (;;){
      lidos++;
      const hk = [];
      nd.keys.forEach((x, j) => { if (x >= a && x <= b){ hk.push(j); achadas.push(x); } });
      const fim = nd.keys.length && nd.keys[nd.keys.length - 1] > b || li === lv.length - 1;
      rec('Lê a folha [' + nd.keys.join(', ') + ']' + (hk.length ? ' e pega ' + hk.map(j => nd.keys[j]).join(', ') : '') + '. ' + (fim ? 'Fim: ' + (li === lv.length - 1 ? 'era a última folha.' : 'já passou de ' + b + '.') + ' Resultado: [' + achadas.join(', ') + '] lendo ' + lidos + ' nós.' : 'Segue o ponteiro para a próxima folha, sem voltar à raiz.'), { hl: { [nd.id]: 'found' }, hk: { [nd.id]: hk }, links: links.slice(), counts: { 'nós lidos': lidos, achadas: achadas.length } });
      if (fim) return;
      links.push(nd.id);
      nd = lv[++li];
    }
  }

  function run(kind){
    M = Number(fMax.value);
    const fr = [], rec = (note, o) => fr.push(frame(note, o));
    if (kind === 'ins'){
      const k = V.nums(fK.value)[0];
      if (k === undefined) rec('Digite uma chave numérica.'); else insert(k, rec);
    } else if (kind === 'busca'){
      const k = V.nums(fK.value)[0];
      if (k === undefined) rec('Digite uma chave numérica.'); else search(k, rec);
    } else {
      const a = V.nums(fDe.value)[0], b = V.nums(fAte.value)[0];
      if (a === undefined || b === undefined) rec('Digite os dois extremos do intervalo.'); else range(a, b, rec);
    }
    p.load(fr);
  }

  /* desenho: folhas lado a lado; cada nó interno centralizado sobre os filhos */
  const KW = 30, GX = 16, DY = 78, NH = 30;
  function draw(st, f){
    const t = f.t;
    if (!t){ st.appendChild(V.el('div', 'ev-empty', 'Árvore vazia (raiz = None)')); return; }
    let cur = 8, depth = 0;
    const pos = new Map(), wd = nd => Math.max(1, nd.keys.length) * KW + 4;
    (function lay(nd, d){
      depth = Math.max(depth, d);
      if (nd.leaf){ pos.set(nd, { x: cur + wd(nd) / 2, d }); cur += wd(nd) + GX; return; }
      nd.kids.forEach(c => lay(c, d + 1));
      pos.set(nd, { x: (pos.get(nd.kids[0]).x + pos.get(nd.kids[nd.kids.length - 1]).x) / 2, d });
    })(t, 0);
    const W = Math.max(cur - GX + 8, 120), H = (depth + 1) * DY - DY + NH + 16;
    const s = V.svg(W, H, 'hb-btree');
    const id = 'hbm' + Math.random().toString(36).slice(2, 7);
    const mk2 = V.add(V.add(s, 'defs', {}), 'marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' });
    V.add(mk2, 'path', { d: 'M0,0 L10,5 L0,10 z', class: 'hb-arrow' });
    const y = d => 8 + d * DY, left = nd => pos.get(nd).x - wd(nd) / 2;
    pos.forEach((pp, nd) => nd.kids.forEach((c, i) => {
      const on = f.ptr && f.ptr[0] === nd.id && f.ptr[1] === i;
      V.add(s, 'line', { x1: left(nd) + 2 + i * KW, y1: y(pp.d) + NH, x2: pos.get(c).x, y2: y(pos.get(c).d), class: 'ev-edge' + (on ? ' path' : '') });
    }));
    if (plus){
      const lv = leaves(t, []), linked = new Set(f.links || []);
      for (let i = 0; i + 1 < lv.length; i++){
        const a = lv[i], b = lv[i + 1], ya = y(pos.get(a).d) + NH / 2;
        V.add(s, 'line', { x1: left(a) + wd(a), y1: ya, x2: left(b) - 1, y2: ya, class: 'hb-leaflink' + (linked.has(a.id) ? ' on' : ''), 'marker-end': 'url(#' + id + ')' });
      }
    }
    pos.forEach((pp, nd) => {
      const g = V.add(s, 'g', { class: 'hb-node ' + ((f.hl || {})[nd.id] || ''), transform: 'translate(' + left(nd) + ',' + y(pp.d) + ')' });
      V.add(g, 'rect', { width: wd(nd), height: NH, rx: 5 });
      const hk = (f.hk || {})[nd.id] || [];
      nd.keys.forEach((k, i) => {
        if (hk.includes(i)) V.add(g, 'rect', { x: 2 + i * KW + 2, y: 3, width: KW - 4, height: NH - 6, rx: 4, class: 'hb-khl' });
        if (i) V.add(g, 'line', { x1: 2 + i * KW, y1: 0, x2: 2 + i * KW, y2: NH, class: 'hb-sep' });
        V.add(g, 'text', { x: 2 + i * KW + KW / 2, y: NH / 2 + 5, 'text-anchor': 'middle', class: hk.includes(i) ? 'hb-kon' : '' }, k);
      });
    });
    st.appendChild(s);
  }

  M = Number(fMax.value);
  V.nums(ds.keys || '').forEach(k => insert(k, null));
  fMax.addEventListener('change', () => {
    const ks = leaves(root, []).length ? collect(root, []) : [];
    root = null; M = Number(fMax.value);
    ks.forEach(k => insert(k, null));
    p.load([frame('Árvore reconstruída com no máximo ' + M + ' chaves por nó (ordem ' + (M + 1) + ').')]);
  });
  function collect(nd, out){ if (!nd) return out; if (nd.leaf) out.push(...nd.keys); else { nd.kids.forEach(c => collect(c, out)); if (!plus) out.push(...nd.keys); } return out; }
  p.load([frame(root ? (plus ? 'Árvore B+: os dados ficam nas folhas, ligadas da esquerda para a direita. ' : 'Árvore B com no máximo ' + M + ' chaves por nó (ordem ' + (M + 1) + '). ') + 'Insira uma chave ou busque uma existente.' : 'Árvore vazia. Insira chaves para vê-la crescer.')]);
});
})();
