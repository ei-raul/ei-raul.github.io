/* Visualizações da aula "Complexidade, vetores e busca" (usa assets/js/estruturas-viz.js). */
(function(){
'use strict';
const V = window.EDViz, esc = V.esc;

/* Vetor na memória: clique em uma posição para ver o cálculo do endereço.
   data-list="..." data-base="1000" data-size="4" */
V.register('memoria', (box, ds) => {
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  const vals = V.nums(ds.list || '7 3 9 4 1 8');
  const fBase = V.field(ctl, 'endereço inicial', ds.base || 1000, '6rem', 'number');
  const fSize = V.field(ctl, 'bytes por elemento', ds.size || 4, '4rem', 'number');
  let sel = -1;
  function draw(){
    const base = parseInt(fBase.value, 10) || 0, size = parseInt(fSize.value, 10) || 1;
    stage.innerHTML = '';
    const w = V.array(stage, vals, { name: 'v', cls: i => i === sel ? 'on' : '', tags: i => String(base + i * size) });
    w.querySelectorAll('.ev-cell').forEach((c, i) => { c.style.cursor = 'pointer'; c.addEventListener('click', () => { sel = i; draw(); }); });
    note.innerHTML = sel < 0
      ? 'Os números acima de cada caixa são os endereços. Clique em uma posição.'
      : 'endereço de <code>v[' + sel + ']</code> = ' + base + ' + ' + sel + ' × ' + size + ' = <b>' + (base + sel * size) + '</b>. Uma conta só, qualquer que seja o tamanho do vetor: acesso em tempo constante.';
  }
  fBase.addEventListener('input', draw); fSize.addEventListener('input', draw);
  draw();
});

/* Inserir/remover no meio de um vetor: cada passo é um deslocamento.
   data-list="..." data-pos="2" data-valor="5" */
V.register('deslocamento', (box, ds) => {
  const p = V.player(box, { render(f, st){ V.array(st, f.v, { name: 'v', cls: f.cls || {}, tags: f.tags || {} }); } });
  const fList = V.field(p.ctl, 'v =', ds.list || '2 4 6 8 10 12', '11rem');
  const op = V.select(p.ctl, '', [['ins', 'inserir'], ['rem', 'remover']], 'ins');
  const fVal = V.field(p.ctl, 'valor', ds.valor || 5, '3.5rem');
  const fPos = V.field(p.ctl, 'na posição', ds.pos || 2, '3.5rem', 'number');
  V.button(p.ctl, 'Montar passos', build, 'main');
  op.addEventListener('change', () => { fVal.parentNode.style.display = op.value === 'ins' ? '' : 'none'; build(); });
  function build(){
    const v = V.nums(fList.value), n = v.length;
    let pos = parseInt(fPos.value, 10); if (isNaN(pos)) pos = 0;
    const fr = []; let moves = 0;
    if (op.value === 'ins'){
      const x = Number(fVal.value) || 0;
      pos = Math.max(0, Math.min(n, pos));
      const w = v.concat([null]);
      fr.push({ v: w.slice(), cls: { [n]: 'empty' }, note: 'O vetor ganha uma posição no fim. Para abrir espaço na posição ' + pos + ', os elementos de ' + pos + ' em diante andam uma casa para a direita, <b>começando pelo último</b>.', counts: { deslocamentos: 0 } });
      for (let i = n; i > pos; i--){
        w[i] = w[i - 1]; moves++;
        fr.push({ v: w.slice(), cls: { [i]: 'swap', [i - 1]: 'cmp' }, tags: { [i]: 'i' }, note: '<code>v[' + i + '] = v[' + (i - 1) + ']</code>: o ' + esc(w[i]) + ' anda para a direita.', counts: { deslocamentos: moves } });
      }
      w[pos] = x;
      fr.push({ v: w.slice(), cls: { [pos]: 'found' }, note: '<code>v[' + pos + '] = ' + esc(x) + '</code>. Foram ' + moves + ' deslocamento' + (moves === 1 ? '' : 's') + ' para ' + n + ' elementos. Inserir no início desloca todos: O(n).', counts: { deslocamentos: moves } });
    } else {
      if (!n){ p.load([{ v: [], note: 'O vetor está vazio.' }]); return; }
      pos = Math.max(0, Math.min(n - 1, pos));
      const w = v.slice();
      fr.push({ v: w.slice(), cls: { [pos]: 'swap' }, note: 'Remover <code>v[' + pos + ']</code> = ' + esc(w[pos]) + ': os elementos à direita andam uma casa para a esquerda, <b>começando pelo mais próximo</b>.', counts: { deslocamentos: 0 } });
      for (let i = pos; i < n - 1; i++){
        w[i] = w[i + 1]; moves++;
        fr.push({ v: w.slice(), cls: { [i]: 'swap', [i + 1]: 'cmp' }, tags: { [i]: 'i' }, note: '<code>v[' + i + '] = v[' + (i + 1) + ']</code>', counts: { deslocamentos: moves } });
      }
      w.pop();
      fr.push({ v: w.slice(), cls: {}, note: 'A última posição é descartada. ' + moves + ' deslocamento' + (moves === 1 ? '' : 's') + '. Remover do fim não desloca nada: O(1); do início, desloca todos: O(n).', counts: { deslocamentos: moves } });
    }
    p.load(fr);
  }
  build();
});

/* Crescimento das funções: valores e tempo estimado para um n escolhido. */
const fmtBig = x => !isFinite(x) ? '∞' : x < 1e6 ? (Math.round(x * 10) / 10).toLocaleString('pt-BR') : x.toExponential(1).replace('e+', ' × 10^').replace('.', ',');
function fmtTime(s){
  if (s < 1e-6) return (s * 1e9).toFixed(1).replace('.', ',') + ' ns';
  if (s < 1e-3) return (s * 1e6).toFixed(1).replace('.', ',') + ' µs';
  if (s < 1) return (s * 1e3).toFixed(1).replace('.', ',') + ' ms';
  if (s < 60) return s.toFixed(1).replace('.', ',') + ' s';
  if (s < 3600) return (s / 60).toFixed(1).replace('.', ',') + ' min';
  if (s < 86400) return (s / 3600).toFixed(1).replace('.', ',') + ' h';
  if (s < 3.15e7) return (s / 86400).toFixed(1).replace('.', ',') + ' dias';
  if (s < 4.4e17) return fmtBig(s / 3.15e7) + ' anos';
  return 'mais que a idade do universo';
}
V.register('crescimento', (box, ds) => {
  const ctl = V.el('div', 'ev-ctl'), stage = V.el('div', 'ev-stage'), note = V.el('div', 'ev-note');
  box.append(ctl, stage, note);
  const fN = V.field(ctl, 'n =', ds.n || 1000, '7rem', 'number');
  [10, 100, 1000, 100000, 1000000].forEach(n => V.button(ctl, n.toLocaleString('pt-BR'), () => { fN.value = n; draw(); }));
  const OPS = 1e8;
  const F = [
    ['O(1)', 'constante', n => 1],
    ['O(log n)', 'logarítmica', n => Math.max(1, Math.log2(n))],
    ['O(n)', 'linear', n => n],
    ['O(n log n)', 'linearítmica', n => n * Math.max(1, Math.log2(n))],
    ['O(n²)', 'quadrática', n => n * n],
    ['O(n³)', 'cúbica', n => n * n * n],
    ['O(2ⁿ)', 'exponencial', n => Math.pow(2, n)]
  ];
  function draw(){
    const n = Math.max(1, parseInt(fN.value, 10) || 1);
    const vals = F.map(f => f[2](n));
    const top = Math.log10(Math.max(10, ...vals.filter(isFinite)));
    stage.innerHTML = '<div class="tblwrap"><table class="tbl ev-growth"><tr><th>Ordem</th><th>Nome</th><th>Operações</th><th style="width:34%">Escala (log)</th><th>Tempo a 100 milhões de op/s</th></tr>' +
      F.map((f, k) => {
        const v = vals[k], w = isFinite(v) ? Math.max(1.5, 100 * Math.log10(Math.max(1, v)) / top) : 100;
        return '<tr><td><code>' + f[0] + '</code></td><td>' + f[1] + '</td><td style="font-family:var(--mono)">' + fmtBig(v) + '</td>' +
          '<td><span class="ev-gbar" style="width:' + Math.min(100, w) + '%"></span></td><td>' + fmtTime(v / OPS) + '</td></tr>';
      }).join('') + '</table></div>';
    note.innerHTML = 'Com n = ' + n.toLocaleString('pt-BR') + ', um algoritmo O(n²) faz ' + fmtBig(n * n) + ' operações, contra ' + fmtBig(Math.max(1, Math.log2(n))) + ' de um O(log n). Experimente valores grandes de n.';
  }
  fN.addEventListener('input', draw);
  draw();
});

/* Busca sequencial e binária, passo a passo.
   data-list="..." data-alvo="23" data-modo="seq|bin" */
V.register('busca', (box, ds) => {
  const p = V.player(box, { render(f, st){ V.array(st, f.v, { name: 'v', cls: f.cls, tags: f.tags }); } });
  const fList = V.field(p.ctl, 'v =', ds.list || '3 8 12 17 23 31 42 50 64 77', '15rem');
  const fAlvo = V.field(p.ctl, 'alvo', ds.alvo || 42, '3.5rem');
  const modo = V.select(p.ctl, 'busca', [['seq', 'sequencial'], ['bin', 'binária']], ds.modo || 'bin');
  V.button(p.ctl, 'Buscar', build, 'main');
  V.button(p.ctl, 'Sortear vetor ordenado', () => {
    const n = 10 + Math.floor(Math.random() * 6), v = []; let x = Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++){ x += 1 + Math.floor(Math.random() * 9); v.push(x); }
    fList.value = v.join(' ');
    fAlvo.value = Math.random() < .75 ? v[Math.floor(Math.random() * n)] : x + 3;
    build();
  });
  modo.addEventListener('change', build);
  function build(){
    const v = V.nums(fList.value), alvo = Number(fAlvo.value), fr = [];
    let cmp = 0;
    if (fAlvo.value.trim() === '' || isNaN(alvo)){ p.load([{ v, cls: {}, tags: {}, note: 'Digite um número como alvo.' }]); return; }
    if (modo.value === 'seq'){
      fr.push({ v, cls: {}, tags: {}, note: 'Busca sequencial: compara o alvo com cada elemento, da esquerda para a direita.', counts: { 'comparações': 0 } });
      let achou = -1;
      for (let i = 0; i < v.length; i++){
        cmp++;
        const eq = v[i] === alvo;
        fr.push({ v, cls: k => k === i ? (eq ? 'found' : 'cmp') : k < i ? 'dim' : '', tags: { [i]: 'i' }, note: '<code>v[' + i + '] == ' + esc(alvo) + '</code>? ' + (eq ? '<b>Sim! Encontrado na posição ' + i + '.</b>' : 'Não (' + esc(v[i]) + '). Próximo.'), counts: { 'comparações': cmp } });
        if (eq){ achou = i; break; }
      }
      if (achou < 0) fr.push({ v, cls: () => 'dim', tags: {}, note: 'Chegou ao fim sem encontrar: <b>' + cmp + ' comparações</b>, uma para cada elemento. Esse é o pior caso: O(n).', counts: { 'comparações': cmp } });
    } else {
      const sorted = v.every((x, i) => i === 0 || v[i - 1] <= x);
      fr.push({ v, cls: {}, tags: {}, note: sorted ? 'Busca binária: olha o meio do trecho e descarta a metade onde o alvo não pode estar.' : '<b>Atenção:</b> este vetor <b>não está ordenado</b>. A busca binária pode descartar justamente a metade onde está o alvo!', counts: { 'comparações': 0 } });
      let ini = 0, fim = v.length - 1, achou = -1;
      while (ini <= fim){
        const meio = Math.floor((ini + fim) / 2);
        cmp++;
        const tags = {}; tags[ini] = 'ini'; tags[fim] = (tags[fim] ? tags[fim] + ' ' : '') + 'fim'; tags[meio] = (tags[meio] ? tags[meio] + ' ' : '') + 'meio';
        const a = ini, b = fim;
        let msg = 'ini = ' + ini + ', fim = ' + fim + ', <code>meio = (' + ini + ' + ' + fim + ') // 2 = ' + meio + '</code>. ';
        if (v[meio] === alvo){
          achou = meio;
          fr.push({ v, cls: k => k === meio ? 'found' : (k < a || k > b) ? 'dim' : 'path', tags, note: msg + '<code>v[' + meio + '] == ' + esc(alvo) + '</code>: <b>encontrado!</b>', counts: { 'comparações': cmp } });
          break;
        }
        if (v[meio] < alvo){ msg += esc(v[meio]) + ' &lt; ' + esc(alvo) + ': o alvo só pode estar à direita, <code>ini = meio + 1</code>.'; ini = meio + 1; }
        else { msg += esc(v[meio]) + ' &gt; ' + esc(alvo) + ': o alvo só pode estar à esquerda, <code>fim = meio - 1</code>.'; fim = meio - 1; }
        fr.push({ v, cls: k => k === meio ? 'cmp' : (k < a || k > b) ? 'dim' : 'path', tags, note: msg, counts: { 'comparações': cmp } });
      }
      if (achou < 0) fr.push({ v, cls: () => 'dim', tags: {}, note: 'ini (' + ini + ') passou de fim (' + fim + '): o trecho ficou vazio, o alvo não está no vetor. Foram ' + cmp + ' comparações para ' + v.length + ' elementos' + (v.length ? ' (log₂ ' + v.length + ' ≈ ' + Math.log2(v.length).toFixed(1).replace('.', ',') + ')' : '') + '.', counts: { 'comparações': cmp } });
    }
    p.load(fr);
  }
  build();
});
})();
