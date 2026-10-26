/*
  Terminal Linux simulado para as aulas interativas — complementa aula-interativa.js.
  Carregue ANTES de aula-interativa.js: os terminais se registram em window.aulaPlugins
  e entram no progresso salvo do aluno (os comandos digitados são guardados e repetidos).

  Terminal:
    <div class="term" data-label="nome" data-cwd="~" data-setup="mkdir x; touch x/a" data-cmds="ls|pwd"></div>
    data-setup roda comandos antes, sem mostrar; data-cmds vira botões com sugestões.
  Missão (terminal com correção automática):
    data-check='[{"t":"dir","p":"~/x","d":"Descrição mostrada ao aluno"}, ...]'
      dir / file  p (texto ou lista) existe; file aceita "has" (texto ou lista), "nao" e "eq" (conteúdo exato)
      none        p não existe
      mode        p tem o modo octal "m" (ex.: "755")
      cwd         o diretório atual é p
      out         algum comando contendo "cmd" mostrou todos os textos de "has" e nenhum de "nao"
      count       o diretório p tem "n" itens que casam com o curinga "g"
  Outros componentes: .fhs (explorador da hierarquia), .pathviz (resolução de caminhos),
  .permcalc (calculadora de permissões), .explain (explicação por partes), pre.sh (comandos estáticos).
*/
(function(){
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const bytes = s => new TextEncoder().encode(s).length;

const HOST = 'unicatolica';
const HOME = '/home/aluno';
const USERS = {
  root:  { uid: 0,    group: 'root',  groups: ['root'] },
  aluno: { uid: 1000, group: 'aluno', groups: ['aluno', 'sudo'] },
  maria: { uid: 1001, group: 'maria', groups: ['maria'] }
};
const GIDS = { root: 0, adm: 4, disk: 6, sudo: 27, shadow: 42, aluno: 1000, maria: 1001 };
const MESES = 'jan fev mar abr mai jun jul ago set out nov dez'.split(' ');
const DIAS = 'dom seg ter qua qui sex sáb'.split(' ');
const ERR = {
  ENOENT: 'Arquivo ou diretório inexistente', ENOTDIR: 'Não é um diretório', EACCES: 'Permissão negada',
  EISDIR: 'É um diretório', EEXIST: 'Arquivo existe', ENOTEMPTY: 'Diretório não vazio', EPERM: 'Operação não permitida'
};
const ELF = '\u007fELF\u0002\u0001\u0001\u0000 (programa compilado: não é texto)\n';
const DAY = 86400000;

/* Marcas de cor na saída: \u0001 + código + texto + \u0002 (removidas fora do terminal) */
const C = (code, t) => '\u0001' + code + t + '\u0002';
const strip = s => s.replace(/\u0001\w/g, '').replace(/\u0002/g, '');
const paint = s => esc(s).replace(/\u0001(\w)([^\u0002]*)\u0002/g, (m, c, t) => '<span class="c-' + c + '">' + t + '</span>');

/* ---------- Sistema de arquivos inicial ---------- */
const SEED_TIME = Date.now();
const BIN = 'bash cat chmod chown cp date echo find grep head less ls man mkdir mv pwd rm rmdir sort su tail tar touch tree uniq wc whoami'.split(' ');
const SBIN = 'fdisk mkfs reboot shutdown ip useradd'.split(' ');
const FILES = {
  '/etc/hostname': HOST + '\n',
  '/etc/hosts': '127.0.0.1\tlocalhost\n127.0.1.1\t' + HOST + '\n',
  '/etc/os-release': 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian\n',
  '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\naluno:x:1000:1000:Aluno de SI:/home/aluno:/bin/bash\nmaria:x:1001:1001:Maria:/home/maria:/bin/bash\n',
  '/etc/group': 'root:x:0:\nadm:x:4:\ndisk:x:6:\nsudo:x:27:aluno\nshadow:x:42:\naluno:x:1000:\nmaria:x:1001:\n',
  '/etc/shadow': 'root:$6$Qx8...:19800:0:99999:7:::\naluno:$6$kP2...:19800:0:99999:7:::\nmaria:$6$Ze4...:19800:0:99999:7:::\n',
  '/etc/fstab': '# <sistema de arquivos>  <ponto de montagem>  <tipo>  <opções>  <dump> <pass>\n/dev/sda2  /      ext4  defaults  0 1\n/dev/sda1  /boot  vfat  umask=0077  0 1\n',
  '/etc/resolv.conf': '# servidor de nomes (DNS)\nnameserver 127.0.0.53\n',
  '/etc/issue': 'Ubuntu 24.04.1 LTS \\n \\l\n',
  '/boot/vmlinuz-6.8.0-45-generic': ELF,
  '/boot/initrd.img-6.8.0-45-generic': ELF,
  '/boot/grub/grub.cfg': '# Configuração do carregador de inicialização GRUB\nmenuentry "Ubuntu" {\n  linux /boot/vmlinuz-6.8.0-45-generic root=/dev/sda2\n  initrd /boot/initrd.img-6.8.0-45-generic\n}\n',
  '/lib/x86_64-linux-gnu/libc.so.6': ELF,
  '/lib/x86_64-linux-gnu/libm.so.6': ELF,
  '/lib/x86_64-linux-gnu/libc.a': ELF,
  '/proc/cpuinfo': 'processor\t: 0\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Core(TM) i5-1235U\ncpu MHz\t\t: 1300.000\ncpu cores\t: 4\n\nprocessor\t: 1\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Core(TM) i5-1235U\ncpu MHz\t\t: 1300.000\ncpu cores\t: 4\n',
  '/proc/meminfo': 'MemTotal:        8040132 kB\nMemFree:         2311420 kB\nMemAvailable:    5120784 kB\nSwapTotal:       2097148 kB\n',
  '/proc/version': 'Linux version 6.8.0-45-generic (buildd@lcy02) (gcc 13.2.0) #45-Ubuntu SMP\n',
  '/proc/uptime': '5821.34 22110.08\n',
  '/proc/1/status': 'Name:\tsystemd\nState:\tS (sleeping)\nPid:\t1\nPPid:\t0\nUid:\t0\t0\t0\t0\n',
  '/root/.bashrc': '# configurações do shell do root\n',
  '/root/segredo.txt': 'Só o root consegue ler este arquivo.\n',
  '/tmp/sessao_a1b2c3.tmp': 'temporário\n',
  '/opt/vscode/code': ELF,
  '/usr/include/stdio.h': '/* Cabeçalho padrão de entrada e saída da linguagem C */\nint printf(const char *format, ...);\n',
  '/usr/share/doc/bash/README': 'Bash é o shell do projeto GNU (Bourne Again SHell).\n',
  '/var/log/syslog': 'out 20 08:00:01 unicatolica systemd[1]: Started Daily apt download activities.\nout 20 08:15:42 unicatolica kernel: usb 1-2: new high-speed USB device number 5\n',
  '/var/log/auth.log': 'out 20 08:16:10 unicatolica sudo: aluno : TTY=pts/0 ; PWD=/home/aluno ; USER=root ; COMMAND=/usr/bin/apt update\n',
  '/var/log/dpkg.log': '2026-10-01 09:12:01 install python3:amd64 <none> 3.12.3\n2026-10-01 09:12:05 install gcc:amd64 <none> 13.2.0\n2026-10-03 14:40:12 remove firefox:amd64 130.0 <none>\n2026-10-05 10:02:33 install tree:amd64 <none> 2.1.1\n2026-10-08 16:21:09 install vim:amd64 <none> 9.1\n2026-10-10 11:05:47 remove vim:amd64 9.1 <none>\n2026-10-12 08:30:00 install git:amd64 <none> 2.43.0\n',
  '/var/www/html/index.html': '<h1>Servidor da turma de SO</h1>\n',
  '/media/aluno/PENDRIVE/backup_fotos.zip': 'PK (arquivo compactado)\n',
  '/home/maria/diario.txt': 'Querido diário: hoje aprendi chmod.\n',
  '/home/aluno/.bashrc': '# ~/.bashrc: executado a cada novo terminal\nalias ll=\'ls -alF\'\nexport EDITOR=nano\n',
  '/home/aluno/.profile': '# ~/.profile: executado no login\n',
  '/home/aluno/notas.txt': 'Lembrar: entregar o trabalho de SO até sexta.\nEstudar permissões (chmod).\n',
  '/home/aluno/script.sh': '#!/bin/bash\n# Meu primeiro script\necho "Olá, $USER! Este script está rodando."\necho "Hoje é:"\ndate\n',
  '/home/aluno/Documentos/relatorio.txt': 'Relatório da disciplina de Sistemas Operacionais\nO Linux organiza tudo em uma única árvore de diretórios.\nNo linux, dispositivos também aparecem como arquivos em /dev.\nO kernel do LINUX foi criado por Linus Torvalds em 1991.\nPermissões controlam quem lê, grava e executa cada arquivo.\n',
  '/home/aluno/Documentos/frutas.txt': 'uva\nbanana\nmaçã\nabacaxi\nlaranja\nbanana\nmanga\ncaju\nacerola\nuva\nbanana\n',
  '/home/aluno/Documentos/numeros.txt': '10\n2\n33\n4\n100\n7\n',
  '/home/aluno/Documentos/alunos.csv': 'nome;curso;semestre;nota\nAna;SI;2;9.5\nBeatriz;SI;2;8.0\nCarlos;SI;4;7.5\nDiego;ES;2;6.0\nEduarda;CC;6;9.0\nFelipe;SI;2;5.5\nGabriela;ES;4;8.5\nHeitor;CC;2;7.0\n',
  '/home/aluno/Downloads/foto_praia.jpg': 'JPEG (imagem)\n',
  '/home/aluno/Downloads/selfie.png': 'PNG (imagem)\n',
  '/home/aluno/Downloads/wallpaper.jpg': 'JPEG (imagem)\n',
  '/home/aluno/Downloads/aula7.pdf': '%PDF-1.7 (documento)\n',
  '/home/aluno/Downloads/trabalho_final.pdf': '%PDF-1.7 (documento)\n',
  '/home/aluno/Downloads/musica.mp3': 'ID3 (áudio)\n',
  '/home/aluno/Downloads/instalador.deb': '!<arch> (pacote de instalação)\n'
};
const DIRS = ['/home/aluno/Imagens', '/home/aluno/Música', '/home/aluno/.config', '/mnt', '/srv', '/usr/local/bin', '/usr/lib', '/var/cache', '/var/tmp'];
const MODES = {
  '/root': 0o700, '/tmp': 0o1777, '/var/tmp': 0o1777, '/home/maria': 0o750, '/etc/shadow': 0o640,
  '/var/log/syslog': 0o640, '/var/log/auth.log': 0o640, '/proc': 0o555, '/root/segredo.txt': 0o600
};
const GROUPS = { '/etc/shadow': 'shadow', '/var/log/syslog': 'adm', '/var/log/auth.log': 'adm' };
const AGES = { '/home/aluno/script.sh': 1, '/home/aluno/notas.txt': 2, '/home/aluno/Documentos/relatorio.txt': 3, '/home/aluno/Downloads/aula7.pdf': 0.2, '/home/aluno/Downloads/instalador.deb': 9, '/home/aluno/Downloads/musica.mp3': 30, '/home/aluno/Downloads/trabalho_final.pdf': 1.5 };

function ownerOf(p){ return p.startsWith('/home/aluno') || p.startsWith('/media/aluno') ? 'aluno' : p.startsWith('/home/maria') ? 'maria' : 'root'; }
function seedTime(p){
  if (AGES[p] !== undefined) return SEED_TIME - AGES[p] * DAY;
  let h = 0; for (const ch of p) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return p.startsWith('/home') ? SEED_TIME - (4 + h % 20) * DAY - h * 60000 : SEED_TIME - (60 + h % 200) * DAY;
}
function buildSeed(){
  const mk = (t, p) => {
    const o = ownerOf(p);
    const n = { t, mode: MODES[p] !== undefined ? MODES[p] : (t === 'd' ? 0o755 : 0o644), owner: o, group: GROUPS[p] || (o === 'root' ? 'root' : o), mtime: seedTime(p) };
    if (t === 'd') n.kids = {}; else n.data = '';
    return n;
  };
  const root = mk('d', '/');
  const ensure = path => {
    let node = root, cur = '';
    for (const part of path.split('/').filter(Boolean)){
      cur += '/' + part;
      if (!node.kids[part]) node.kids[part] = mk('d', cur);
      node = node.kids[part];
    }
    return node;
  };
  const file = (path, data, mode) => {
    const i = path.lastIndexOf('/');
    const n = mk('f', path); n.data = data; if (mode !== undefined) n.mode = mode;
    ensure(path.slice(0, i)).kids[path.slice(i + 1)] = n;
    return n;
  };
  'bin boot dev etc home lib media mnt opt proc root sbin tmp usr var'.split(' ').forEach(d => ensure('/' + d));
  DIRS.forEach(ensure);
  BIN.forEach(b => file('/bin/' + b, ELF, 0o755));
  BIN.concat(['python3', 'nano', 'vim', 'gcc']).forEach(b => file('/usr/bin/' + b, ELF, 0o755));
  SBIN.forEach(b => file('/sbin/' + b, ELF, 0o755));
  Object.keys(FILES).forEach(p => file(p, FILES[p]));
  file('/opt/vscode/code', ELF, 0o755);
  [['sda', 'b', 0o660, 'disk'], ['sda1', 'b', 0o660, 'disk'], ['sda2', 'b', 0o660, 'disk'], ['null', 'c', 0o666], ['zero', 'c', 0o666], ['random', 'c', 0o666], ['tty', 'c', 0o666]].forEach(([n, t, m, g]) => {
    const d = file('/dev/' + n, '', m); d.dev = t; if (g) d.group = g;
  });
  Object.keys(root.kids.proc.kids).forEach(k => { const n = root.kids.proc.kids[k]; if (n.t === 'f') n.mode = 0o444; });
  return root;
}
function clone(n){
  const c = Object.assign({}, n);
  if (n.kids){ c.kids = {}; Object.keys(n.kids).forEach(k => { c.kids[k] = clone(n.kids[k]); }); }
  return c;
}
let SEED = null;
const seed = () => clone(SEED || (SEED = buildSeed()));

/* ---------- Formatação ---------- */
function modeStr(n){
  const m = n.mode;
  const t = n.t === 'd' ? 'd' : (n.dev || '-');
  const tri = (v, special, ch) => (v & 4 ? 'r' : '-') + (v & 2 ? 'w' : '-') + (special ? (v & 1 ? ch : ch.toUpperCase()) : (v & 1 ? 'x' : '-'));
  return t + tri((m >> 6) & 7, m & 0o4000, 's') + tri((m >> 3) & 7, m & 0o2000, 's') + tri(m & 7, m & 0o1000, 't');
}
const octal = m => (m & 0o7777).toString(8).padStart(4, '0');
const pad2 = n => String(n).padStart(2, '0');
function lsDate(t){
  const d = new Date(t);
  const recent = Math.abs(Date.now() - t) < 182 * DAY;
  return MESES[d.getMonth()] + ' ' + String(d.getDate()).padStart(2) + ' ' + (recent ? pad2(d.getHours()) + ':' + pad2(d.getMinutes()) : ' ' + d.getFullYear());
}
function isoDate(t){
  const d = new Date(t);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
function human(n){
  if (n < 1024) return String(n);
  const u = ['K', 'M', 'G']; let v = n, i = -1;
  do { v /= 1024; i++; } while (v >= 1024 && i < 2);
  return (v < 10 ? (Math.ceil(v * 10) / 10).toFixed(1).replace('.', ',') : String(Math.ceil(v))) + u[i];
}
const size = n => n.t === 'd' ? 4096 : bytes(n.data);
const collate = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', ignorePunctuation: true }) || (a < b ? -1 : a > b ? 1 : 0);
const colorName = (name, n) => n.t === 'd' ? C('D', name) : n.dev ? C('V', name) : (n.mode & 0o111) ? C('X', name) : name;
const lines = s => { const l = s.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; };
const joinLines = l => l.length ? l.join('\n') + '\n' : '';

function globRe(p, icase){
  let r = '^';
  for (let i = 0; i < p.length; i++){
    const c = p[i];
    if (c === '\\' && i + 1 < p.length) r += reEsc(p[++i]);
    else if (c === '*') r += '[^/]*';
    else if (c === '?') r += '[^/]';
    else if (c === '['){
      const j = p.indexOf(']', i + 2);
      if (j < 0) r += '\\[';
      else { let cls = p.slice(i + 1, j); if (cls[0] === '!') cls = '^' + cls.slice(1); r += '[' + cls.replace(/\\/g, '\\\\') + ']'; i = j; }
    } else r += reEsc(c);
  }
  return new RegExp(r + '$', icase ? 'i' : '');
}
const hasMeta = s => /(^|[^\\])[*?[]/.test(s);
const unescape = s => s.replace(/\\(.)/g, '$1');
const escGlob = s => s.replace(/[*?[\\]/g, '\\$&');

/* ---------- Manual (man e --help) ---------- */
const MAN = {
  whoami: ['mostra o nome do usuário atual', 'whoami', 'Mostra o nome do usuário associado à sessão atual.'],
  echo: ['mostra uma linha de texto', 'echo [-n] [-e] [TEXTO]...', 'Escreve os TEXTOs na saída padrão, separados por espaço.\n  -n   não quebra a linha no final\n  -e   interpreta \\n (nova linha) e \\t (tabulação)'],
  man: ['manual de referência dos comandos', 'man COMANDO', 'Mostra a página de manual do COMANDO.'],
  pwd: ['mostra o diretório de trabalho atual', 'pwd', 'Mostra o caminho absoluto do diretório em que você está (Print Working Directory).'],
  cd: ['muda o diretório atual', 'cd [DIRETÓRIO]', 'Muda o diretório de trabalho (Change Directory).\n  cd        vai para a pasta pessoal (~)\n  cd ..     sobe um nível (diretório pai)\n  cd -      volta para o diretório anterior\n  cd /      vai para a raiz'],
  ls: ['lista o conteúdo de diretórios', 'ls [OPÇÕES] [ARQUIVO]...', 'Lista arquivos e diretórios (por padrão, o diretório atual).\n  -a   mostra também os ocultos (que começam com .)\n  -l   formato longo: permissões, dono, grupo, tamanho e data\n  -h   tamanhos legíveis (K, M, G); use com -l\n  -S   ordena por tamanho, do maior para o menor\n  -t   ordena pela data de modificação, do mais novo para o mais antigo\n  -r   inverte a ordem\n  -R   lista os subdiretórios recursivamente\n  -d   mostra o próprio diretório, não o conteúdo\n  -1   um item por linha'],
  mkdir: ['cria diretórios', 'mkdir [-p] [-v] DIRETÓRIO...', 'Cria os DIRETÓRIOs, se ainda não existirem (Make Directory).\n  -p   cria também os diretórios intermediários e não reclama se já existir\n  -v   mostra uma mensagem para cada diretório criado'],
  rmdir: ['remove diretórios vazios', 'rmdir DIRETÓRIO...', 'Remove os DIRETÓRIOs, desde que estejam vazios (Remove Directory).'],
  touch: ['cria arquivos vazios ou atualiza a data', 'touch ARQUIVO...', 'Atualiza a data de modificação de cada ARQUIVO para agora.\nSe o ARQUIVO não existir, cria um arquivo vazio.'],
  cat: ['concatena e mostra arquivos', 'cat [-n] [ARQUIVO]...', 'Concatena os ARQUIVOs e mostra o resultado na saída padrão.\n  -n   numera as linhas'],
  sort: ['ordena linhas de texto', 'sort [OPÇÕES] [ARQUIVO]...', 'Mostra as linhas de todos os ARQUIVOs, ordenadas.\n  -r   ordem inversa\n  -n   compara como números (2 antes de 10)\n  -u   remove as linhas repetidas\n  -f   ignora maiúsculas/minúsculas'],
  uniq: ['remove linhas repetidas consecutivas', 'uniq [-c] [ARQUIVO]', 'Remove linhas repetidas que estão em sequência (por isso costuma vir depois do sort).\n  -c   mostra quantas vezes cada linha aparece'],
  grep: ['procura padrões em textos', 'grep [OPÇÕES] PADRÃO [ARQUIVO]...', 'Mostra as linhas que contêm o PADRÃO.\n  -i   ignora maiúsculas/minúsculas\n  -n   mostra o número da linha\n  -v   inverte: mostra as linhas que NÃO contêm o padrão\n  -c   mostra só a quantidade de linhas encontradas\n  -r   procura em todos os arquivos dos diretórios, recursivamente\n  -l   mostra só o nome dos arquivos que contêm o padrão\n  -w   só palavras inteiras'],
  find: ['procura arquivos e diretórios', 'find [CAMINHO]... [EXPRESSÃO]', 'Percorre a árvore a partir de CAMINHO (padrão: .) e mostra o que satisfaz a EXPRESSÃO.\n  -name PADRÃO    nome casa com o PADRÃO (use aspas: "*.txt")\n  -iname PADRÃO   igual, ignorando maiúsculas/minúsculas\n  -type f         só arquivos comuns\n  -type d         só diretórios\n  -maxdepth N     desce no máximo N níveis\n  -empty          arquivos ou diretórios vazios\n  -user NOME      pertencentes ao usuário NOME'],
  cp: ['copia arquivos e diretórios', 'cp [-r] [-v] ORIGEM... DESTINO', 'Copia ORIGEM para DESTINO. Se DESTINO for um diretório existente, a cópia vai para dentro dele.\n  -r   copia diretórios e todo o seu conteúdo (recursivo)\n  -v   mostra o que está sendo feito'],
  mv: ['move ou renomeia arquivos', 'mv [-v] ORIGEM... DESTINO', 'Move ORIGEM para DESTINO. Se DESTINO não existir, ORIGEM é renomeado.\nDiretórios são movidos sem precisar de opção.\n  -v   mostra o que está sendo feito'],
  rm: ['remove arquivos ou diretórios', 'rm [-r] [-f] [-v] ARQUIVO...', 'Remove os ARQUIVOs. Não existe lixeira: o que é removido não volta.\n  -r   remove diretórios e todo o seu conteúdo\n  -f   ignora arquivos inexistentes e não pergunta nada\n  -i   pergunta antes de cada remoção (não disponível no simulador)\n  -v   mostra o que está sendo feito'],
  chmod: ['altera as permissões de acesso', 'chmod [-R] [-v] MODO ARQUIVO...', 'Altera as permissões de cada ARQUIVO para MODO.\nMODO octal: três dígitos (dono, grupo, outros), somando r=4, w=2, x=1. Ex.: 754\nMODO simbólico: [ugoa][+-=][rwx]. Ex.: u+x, go-w, a=r, u=rwx,g=rx,o=\n  -R   aplica recursivamente\n  -v   mostra cada alteração'],
  chown: ['altera dono e grupo', 'chown [-R] DONO[:GRUPO] ARQUIVO...', 'Altera o dono (e opcionalmente o grupo) dos ARQUIVOs. Exige privilégio de root (sudo).'],
  head: ['mostra o início de arquivos', 'head [-n N] [ARQUIVO]...', 'Mostra as primeiras 10 linhas (ou N, com -n N).'],
  tail: ['mostra o fim de arquivos', 'tail [-n N] [ARQUIVO]...', 'Mostra as últimas 10 linhas (ou N, com -n N).'],
  wc: ['conta linhas, palavras e bytes', 'wc [-l] [-w] [-c] [ARQUIVO]...', 'Conta linhas, palavras e bytes.\n  -l   só linhas\n  -w   só palavras\n  -c   só bytes'],
  tree: ['mostra diretórios em forma de árvore', 'tree [-a] [-d] [-L N] [DIRETÓRIO]', 'Desenha a árvore de diretórios.\n  -a   inclui ocultos\n  -d   só diretórios\n  -L N desce no máximo N níveis'],
  stat: ['mostra detalhes de um arquivo', 'stat ARQUIVO...', 'Mostra tamanho, tipo, permissões (em octal e simbólico), dono e datas.'],
  sudo: ['executa um comando como root', 'sudo COMANDO', 'Executa o COMANDO com privilégios de superusuário (root). Use com cuidado.'],
  history: ['mostra os comandos digitados', 'history', 'Lista os comandos já executados neste terminal. Use ↑ e ↓ para reaproveitá-los.'],
  clear: ['limpa a tela', 'clear', 'Limpa a tela do terminal (atalho: Ctrl+L).'],
  date: ['mostra a data e a hora', 'date', 'Mostra a data e a hora do sistema.'],
  uname: ['mostra informações do sistema', 'uname [-a] [-r]', 'Mostra o nome do kernel.\n  -a   todas as informações\n  -r   versão do kernel'],
  hostname: ['mostra o nome da máquina', 'hostname', 'Mostra o nome desta máquina na rede.'],
  id: ['mostra usuário e grupos', 'id', 'Mostra o identificador do usuário (uid), do grupo principal (gid) e os grupos.'],
  groups: ['mostra os grupos do usuário', 'groups', 'Mostra os grupos dos quais o usuário atual faz parte.'],
  which: ['mostra onde está um comando', 'which COMANDO...', 'Mostra o caminho completo do programa executado por COMANDO.'],
  df: ['mostra o uso dos sistemas de arquivos', 'df [-h]', 'Mostra os sistemas de arquivos montados, seu tamanho e uso.\n  -h   tamanhos legíveis'],
  help: ['lista os comandos do simulador', 'help', 'Lista os comandos disponíveis neste terminal simulado.']
};
function manPage(c){
  const m = MAN[c];
  return 'NOME\n    ' + c + ' - ' + m[0] + '\n\nSINOPSE\n    ' + m[1] + '\n\nDESCRIÇÃO\n    ' + m[2].replace(/\n/g, '\n    ') + '\n';
}
const NAO_SIM = {
  nano: 'editores interativos', vim: 'editores interativos', vi: 'editores interativos', gedit: 'editores interativos', code: 'editores interativos',
  ln: 'links', tar: 'compactação', zip: 'compactação', unzip: 'compactação', gzip: 'compactação', ps: 'processos', top: 'processos', kill: 'processos',
  apt: 'instalação de pacotes', 'apt-get': 'instalação de pacotes', ssh: 'rede', ping: 'rede', wget: 'rede', curl: 'rede', git: 'git',
  python: 'Python', python3: 'Python', gcc: 'compilação', su: 'troca de usuário', passwd: 'troca de senha', mount: 'montagem', umount: 'montagem'
};

/* ---------- Shell ---------- */
function Shell(){ this.reset(); }
Shell.prototype.reset = function(){
  this.root = seed();
  this.user = 'aluno';
  this.cwd = HOME; this.old = HOME;
  this.env = { HOME, USER: 'aluno', SHELL: '/bin/bash', PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'pt_BR.UTF-8' };
  this.hist = [];      // comandos digitados (para history e ↑ ↓)
  this.log = [];       // { cmd, out } para as missões
  this.status = 0;
  this.depth = 0;
};
Shell.prototype.uinfo = function(){ return USERS[this.user]; };
Shell.prototype.can = function(n, bit){
  if (this.user === 'root') return bit !== 1 || n.t === 'd' || (n.mode & 0o111) !== 0;
  const u = this.uinfo();
  const m = n.owner === this.user ? (n.mode >> 6) : u.groups.includes(n.group) ? (n.mode >> 3) : n.mode;
  return (m & bit) !== 0;
};
Shell.prototype.parts = function(p){
  if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
  const parts = p.startsWith('/') ? [] : this.cwd.split('/').filter(Boolean);
  p.split('/').forEach(c => { if (!c || c === '.') return; if (c === '..') parts.pop(); else parts.push(c); });
  return parts;
};
Shell.prototype.abs = function(p){ return '/' + this.parts(p).join('/'); };
/* Percorre o caminho: exige x em cada diretório atravessado */
Shell.prototype.look = function(p){
  const parts = this.parts(p);
  let node = this.root, parent = null;
  for (let i = 0; i < parts.length; i++){
    if (node.t !== 'd') return { err: 'ENOTDIR' };
    if (!this.can(node, 1)) return { err: 'EACCES' };
    parent = node;
    node = node.kids[parts[i]];
    if (!node) return { err: 'ENOENT', parent: i === parts.length - 1 ? parent : null, name: parts[i], path: '/' + parts.join('/') };
  }
  if (/\/$/.test(p) && node.t !== 'd') return { err: 'ENOTDIR' };
  return { node, parent, name: parts[parts.length - 1] || '/', path: '/' + parts.join('/') };
};
Shell.prototype.newNode = function(t, data){
  const n = { t, mode: t === 'd' ? 0o755 : 0o644, owner: this.user, group: this.uinfo().group, mtime: Date.now() };
  if (t === 'd') n.kids = {}; else n.data = data || '';
  return n;
};
/* Cria (ou acha) o arquivo para escrita. Devolve { node } ou { err } */
Shell.prototype.openWrite = function(p){
  const r = this.look(p);
  if (r.node){
    if (r.node.t === 'd') return { err: 'EISDIR' };
    if (!this.can(r.node, 2)) return { err: 'EACCES' };
    return { node: r.node };
  }
  if (r.err !== 'ENOENT' || !r.parent) return { err: r.err === 'ENOENT' ? 'ENOENT' : r.err };
  if (!this.can(r.parent, 2) || !this.can(r.parent, 1)) return { err: 'EACCES' };
  const n = this.newNode('f');
  r.parent.kids[r.name] = n;
  r.parent.mtime = Date.now();
  return { node: n };
};
Shell.prototype.write = function(n, data, append){
  if (n.dev) return;
  n.data = append ? n.data + data : data;
  n.mtime = Date.now();
};
Shell.prototype.read = function(p){
  const r = this.look(p);
  if (r.err) return { err: r.err };
  if (r.node.t === 'd') return { err: 'EISDIR' };
  if (!this.can(r.node, 4)) return { err: 'EACCES' };
  if (r.node.dev) return { data: r.name === 'random' ? 'ã¥ÿ#Ò~Ñz\n' : '' };
  return { data: r.node.data };
};
Shell.prototype.prompt = function(){
  const d = this.cwd === HOME ? '~' : this.cwd.startsWith(HOME + '/') ? '~' + this.cwd.slice(HOME.length) : this.cwd;
  return { user: this.user + '@' + HOST, dir: d, sym: this.user === 'root' ? '#' : '$' };
};

/* ----- Análise da linha de comando ----- */
Shell.prototype.lex = function(line){
  const toks = [], n = line.length, env = this.env;
  let i = 0;
  const readVar = j => {
    let m = line.slice(j + 1).match(/^\{(\w+)\}|^(\w+)|^\?/);
    if (!m) return { v: '$', i: j + 1 };
    if (m[0] === '?') return { v: String(this.status), i: j + 2 };
    const k = m[1] || m[2];
    return { v: k === 'PWD' ? this.cwd : (env[k] !== undefined ? env[k] : ''), i: j + 1 + m[0].length };
  };
  while (i < n){
    const c = line[i];
    if (c === ' ' || c === '\t'){ i++; continue; }
    if (c === '#') break;
    const op = ['2>>', '&&', '||', '2>', '>>', '|', ';', '>', '<', '&'].find(o => line.startsWith(o, i));
    if (op){ toks.push({ op }); i += op.length; continue; }
    let text = '', pat = '', glob = false;
    const start = i;
    while (i < n){
      const ch = line[i];
      if (ch === ' ' || ch === '\t' || '|;<>&'.includes(ch)) break;
      if (ch === "'"){
        const j = line.indexOf("'", i + 1);
        if (j < 0) return { err: 'aspas simples sem fechamento' };
        const s = line.slice(i + 1, j); text += s; pat += escGlob(s); i = j + 1; continue;
      }
      if (ch === '"'){
        i++; let s = '';
        while (i < n && line[i] !== '"'){
          if (line[i] === '\\' && i + 1 < n && '"\\$`'.includes(line[i + 1])){ s += line[i + 1]; i += 2; continue; }
          if (line[i] === '$'){ const r = readVar(i); s += r.v; i = r.i; continue; }
          s += line[i++];
        }
        if (i >= n) return { err: 'aspas duplas sem fechamento' };
        i++; text += s; pat += escGlob(s); continue;
      }
      if (ch === '\\'){ if (i + 1 < n){ text += line[i + 1]; pat += escGlob(line[i + 1]); } i += 2; continue; }
      if (ch === '$'){ const r = readVar(i); text += r.v; pat += escGlob(r.v); i = r.i; continue; }
      if (ch === '~' && i === start && (i + 1 >= n || ' \t/'.includes(line[i + 1]))){ text += env.HOME; pat += escGlob(env.HOME); i++; continue; }
      if ('*?['.includes(ch)) glob = true;
      text += ch; pat += ch; i++;
    }
    toks.push({ w: text, pat, glob });
  }
  return { toks };
};
Shell.prototype.parse = function(toks){
  const list = []; let pipe = [], cmd = { words: [], redir: [] }, sep = null;
  const bad = t => ({ err: 'erro de sintaxe próximo ao token inesperado \'' + t + '\'' });
  for (let k = 0; k < toks.length; k++){
    const t = toks[k];
    if (t.w !== undefined){ cmd.words.push(t); continue; }
    if (t.op === '&') return { err: 'execução em segundo plano (&) não é suportada no simulador' };
    if (['>', '>>', '<', '2>', '2>>'].includes(t.op)){
      const nx = toks[k + 1];
      if (!nx || nx.w === undefined) return bad(nx ? nx.op : 'newline');
      cmd.redir.push({ op: t.op, target: nx.w }); k++; continue;
    }
    if (!cmd.words.length && !cmd.redir.length) return bad(t.op);
    pipe.push(cmd); cmd = { words: [], redir: [] };
    if (t.op !== '|'){ list.push({ pipe, sep }); pipe = []; sep = t.op; }
  }
  if (cmd.words.length || cmd.redir.length) pipe.push(cmd);
  else if (pipe.length) return bad('newline');
  if (pipe.length) list.push({ pipe, sep });
  return { list };
};
Shell.prototype.expand = function(words){
  const out = [];
  words.forEach(w => {
    if (!w.glob || !hasMeta(w.pat)){ out.push(w.w); return; }
    const m = this.glob(w.pat);
    if (m.length) out.push(...m); else out.push(w.w);
  });
  return out;
};
Shell.prototype.glob = function(pat){
  const absolute = pat.startsWith('/');
  const segs = pat.split('/').filter(Boolean);
  const join = (a, b) => a === '' ? b : (a.endsWith('/') ? a + b : a + '/' + b);
  let cands = [{ disp: absolute ? '/' : '', path: absolute ? '/' : this.cwd }];
  segs.forEach(seg => {
    const next = [];
    cands.forEach(c => {
      if (!hasMeta(seg)){ next.push({ disp: join(c.disp, unescape(seg)), path: join(c.path, unescape(seg)) }); return; }
      const r = this.look(c.path);
      if (!r.node || r.node.t !== 'd' || !this.can(r.node, 4)) return;
      const re = globRe(seg);
      Object.keys(r.node.kids).sort(collate).forEach(k => {
        if (k[0] === '.' && seg[0] !== '.') return;
        if (re.test(k)) next.push({ disp: join(c.disp, k), path: join(c.path, k) });
      });
    });
    cands = next;
  });
  return cands.filter(c => !this.look(c.path).err).map(c => c.disp);
};

/* ----- Execução ----- */
/* sink: { out(s), err(s), clear(), tty } */
Shell.prototype.run = function(line, sink){
  const lx = this.lex(line);
  if (lx.err){ sink.err('bash: ' + lx.err + '\n'); this.status = 2; return; }
  if (!lx.toks.length) return;
  const ps = this.parse(lx.toks);
  if (ps.err){ sink.err('bash: ' + ps.err + '\n'); this.status = 2; return; }
  ps.list.forEach(item => {
    if (item.sep === '&&' && this.status !== 0) return;
    if (item.sep === '||' && this.status === 0) return;
    this.status = this.pipeline(item.pipe, sink);
  });
};
Shell.prototype.pipeline = function(cmds, sink){
  let input = null, status = 0;
  for (let k = 0; k < cmds.length; k++){
    const c = cmds[k], last = k === cmds.length - 1;
    const argv = this.expand(c.words);
    if (argv.length === 1 && cmds.length === 1 && !c.redir.length && /^[A-Za-z_]\w*=/.test(argv[0])){
      const i = argv[0].indexOf('='); this.env[argv[0].slice(0, i)] = argv[0].slice(i + 1); return 0;
    }
    const io = { stdin: input, out: '', err: '', tty: last && sink.tty && !c.redir.some(r => r.op === '>' || r.op === '>>'), sink };
    let outFile = null, errFile = null, failed = false;
    c.redir.forEach(r => {
      if (failed) return;
      if (r.op === '<'){
        const rd = this.read(r.target);
        if (rd.err){ sink.err('bash: ' + r.target + ': ' + ERR[rd.err] + '\n'); failed = true; } else io.stdin = rd.data;
        return;
      }
      const w = this.openWrite(r.target);
      if (w.err){ sink.err('bash: ' + r.target + ': ' + ERR[w.err] + '\n'); failed = true; return; }
      const append = r.op.endsWith('>>');
      if (!append) this.write(w.node, '');
      if (r.op[0] === '2') errFile = { node: w.node }; else outFile = { node: w.node };
    });
    if (failed){ status = 1; input = ''; continue; }
    status = argv.length ? this.exec(argv, io) : 0;
    if (errFile) this.write(errFile.node, strip(io.err), true); else if (io.err) sink.err(io.err);
    if (outFile){ this.write(outFile.node, strip(io.out), true); input = ''; }
    else if (last){ if (io.out) sink.out(io.tty ? io.out : strip(io.out)); }
    else input = strip(io.out);
  }
  return status;
};
Shell.prototype.exec = function(argv, io){
  const name = argv[0], args = argv.slice(1);
  if (name === 'sudo'){
    if (!args.length){ io.err += 'uso: sudo COMANDO\n'; return 1; }
    const u = this.user; this.user = 'root';
    try { return this.exec(args, io); } finally { this.user = u; }
  }
  if (name.includes('/')) return this.execFile(name, args, io, true);
  if (name === 'bash' || name === 'sh'){
    if (args.length) return this.execFile(args[0], args.slice(1), io, false);
    io.err += name + ': o simulador não abre um shell dentro do outro. Use ' + name + ' ARQUIVO para rodar um script.\n'; return 1;
  }
  const fn = CMDS[name];
  if (fn){
    if (args[0] === '--help' && MAN[name] && name !== 'echo'){ io.out += 'Uso: ' + MAN[name][1] + '\n' + MAN[name][2] + '\n'; return 0; }
    return fn.call(this, args, io, name);
  }
  if (NAO_SIM[name]){ io.err += name + ': ' + NAO_SIM[name] + ' não estão disponíveis neste terminal simulado.' + (NAO_SIM[name] === 'editores interativos' ? ' Para escrever em arquivos use echo "texto" > arquivo (ou >> para acrescentar).' : '') + '\n'; return 127; }
  io.err += name + ': comando não encontrado\n';
  return 127;
};
/* ./script.sh exige permissão x; bash script.sh só exige r */
Shell.prototype.execFile = function(path, args, io, needX){
  const who = 'bash: ' + path;
  const r = this.look(path);
  if (r.err){ io.err += who + ': ' + ERR[r.err] + '\n'; return 127; }
  if (r.node.t === 'd'){ io.err += who + ': ' + ERR.EISDIR + '\n'; return 126; }
  if ((needX && !this.can(r.node, 1)) || !this.can(r.node, 4)){ io.err += who + ': ' + ERR.EACCES + '\n'; return 126; }
  if (r.node.data.startsWith('\u007fELF')){
    const fn = CMDS[r.name];
    if (fn) return fn.call(this, args, io, r.name);
    io.err += who + ': este programa não pode ser executado no simulador\n'; return 126;
  }
  if (this.depth > 4){ io.err += who + ': muitos scripts aninhados\n'; return 1; }
  const saved = this.cwd;
  this.depth++;
  const sub = { out: s => { io.out += s; }, err: s => { io.err += s; }, clear(){}, tty: io.tty };
  lines(r.node.data).forEach(l => this.run(l, sub));
  this.depth--;
  this.cwd = saved;
  return this.status;
};

/* ----- Opções ----- */
function getopt(args, letters, withVal, long){
  withVal = withVal || ''; long = long || {};
  const f = {}, ops = [];
  for (let i = 0; i < args.length; i++){
    const a = args[i];
    if (a === '--'){ ops.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')){
      const k = a.slice(2).split('=')[0];
      if (long[k]){ f[long[k]] = a.includes('=') ? a.slice(a.indexOf('=') + 1) : true; continue; }
      return { bad: a, long: true };
    }
    if (a[0] === '-' && a.length > 1){
      for (let j = 1; j < a.length; j++){
        const c = a[j];
        if (withVal.includes(c)){
          const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
          if (v === undefined) return { bad: c, missing: true };
          f[c] = v; break;
        }
        if (!letters.includes(c)) return { bad: c };
        f[c] = true;
      }
      continue;
    }
    ops.push(a);
  }
  return { f, ops };
}
function badOpt(name, g, io){
  if (g.missing) io.err += name + ': a opção requer um argumento -- \'' + g.bad + '\'\n';
  else if (g.long) io.err += name + ': opção não reconhecida \'' + g.bad + '\'\n';
  else io.err += name + ': opção inválida -- \'' + g.bad + '\'\n';
  io.err += 'Tente "' + name + ' --help" para mais informações.\n';
  return 2;
}
/* Lê os arquivos (ou a entrada do pipe). Devolve null se não houver de onde ler. */
function gather(sh, name, files, io){
  if (!files.length){
    if (io.stdin === null){ io.err += name + ': informe um arquivo (ou envie dados com | ou <). O simulador não lê do teclado.\n'; return null; }
    return [{ name: '-', data: io.stdin }];
  }
  const res = [];
  files.forEach(f => {
    const r = sh.read(f);
    if (r.err) io.err += name + ': ' + f + ': ' + ERR[r.err] + '\n';
    else res.push({ name: f, data: r.data });
  });
  return res;
}
const childPath = (base, k) => base === '/' ? '/' + k : base.replace(/\/$/, '') + '/' + k;

/* ---------- Comandos ---------- */
const CMDS = {
  whoami(a, io){ io.out += this.user + '\n'; return 0; },
  pwd(a, io){ io.out += this.cwd + '\n'; return 0; },
  echo(a, io){
    let nl = true, e = false;
    while (a.length && /^-[ne]+$/.test(a[0])){ if (a[0].includes('n')) nl = false; if (a[0].includes('e')) e = true; a = a.slice(1); }
    let s = a.join(' ');
    if (e) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    io.out += s + (nl ? '\n' : '');
    return 0;
  },
  man(a, io){
    if (!a.length){ io.err += 'Qual página de manual você deseja?\nPor exemplo, tente \'man man\'.\n'; return 1; }
    let st = 0;
    a.forEach(c => { if (MAN[c]) io.out += manPage(c) + '\n'; else { io.err += 'Nenhuma entrada de manual para ' + c + '\n'; st = 16; } });
    return st;
  },
  help(a, io){
    io.out += 'Comandos disponíveis neste terminal simulado:\n\n';
    Object.keys(MAN).sort().forEach(c => { io.out += '  ' + c.padEnd(9) + MAN[c][0] + '\n'; });
    io.out += '\nTambém funcionam: uniq, head, tail, less, ./script e bash script, e os operadores | > >> < ; &&.\nUse "man COMANDO" para ver as opções de cada um. Tab completa nomes; ↑ e ↓ recuperam comandos.\n';
    return 0;
  },
  history(a, io){ this.hist.forEach((c, i) => { io.out += String(i + 1).padStart(5) + '  ' + c + '\n'; }); return 0; },
  clear(a, io){ io.sink.clear(); return 0; },
  date(a, io){
    const d = new Date();
    io.out += DIAS[d.getDay()] + ' ' + pad2(d.getDate()) + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ' -03\n';
    return 0;
  },
  uname(a, io){
    if (a.includes('-a')) io.out += 'Linux ' + HOST + ' 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux\n';
    else if (a.includes('-r')) io.out += '6.8.0-45-generic\n';
    else io.out += 'Linux\n';
    return 0;
  },
  hostname(a, io){ io.out += HOST + '\n'; return 0; },
  id(a, io){
    const u = this.uinfo();
    io.out += 'uid=' + u.uid + '(' + this.user + ') gid=' + GIDS[u.group] + '(' + u.group + ') grupos=' + u.groups.map(g => GIDS[g] + '(' + g + ')').join(',') + '\n';
    return 0;
  },
  groups(a, io){ io.out += this.uinfo().groups.join(' ') + '\n'; return 0; },
  which(a, io){
    let st = 0;
    a.forEach(c => { if (CMDS[c] && !['cd', 'history', 'help', 'clear'].includes(c)) io.out += '/usr/bin/' + c + '\n'; else st = 1; });
    return st;
  },
  df(a, io){
    const h = a.includes('-h');
    io.out += 'Sist. Arq.      ' + (h ? 'Tam. Usado Disp. Uso%' : '1K-blocos    Usado  Disponível Uso%') + ' Montado em\n';
    io.out += h ? '/dev/sda2        98G   41G   52G  45% /\n/dev/sda1       1,1G  6,1M  1,1G   1% /boot\n/dev/sdb1        15G  3,2G   12G  22% /media/aluno/PENDRIVE\n'
                : '/dev/sda2      102187652 42815632  54135840  45% /\n/dev/sda1        1098632     6220   1092412   1% /boot\n/dev/sdb1       15718400  3355443  12362957  22% /media/aluno/PENDRIVE\n';
    return 0;
  },
  cd(a, io){
    if (a.length > 1){ io.err += 'bash: cd: número excessivo de argumentos\n'; return 1; }
    let t = a[0];
    if (t === undefined || t === '') t = HOME;
    const back = t === '-';
    if (back) t = this.old;
    const r = this.look(t);
    if (r.err){ io.err += 'bash: cd: ' + t + ': ' + ERR[r.err] + '\n'; return 1; }
    if (r.node.t !== 'd'){ io.err += 'bash: cd: ' + t + ': ' + ERR.ENOTDIR + '\n'; return 1; }
    if (!this.can(r.node, 1)){ io.err += 'bash: cd: ' + t + ': ' + ERR.EACCES + '\n'; return 1; }
    this.old = this.cwd; this.cwd = r.path;
    if (back) io.out += this.cwd + '\n';
    return 0;
  },
  ls(a, io){
    const g = getopt(a, 'alhStrR1dA', '', { all: 'a', 'human-readable': 'h', reverse: 'r', recursive: 'R', directory: 'd' });
    if (g.bad) return badOpt('ls', g, io);
    const f = g.f, ops = g.ops.length ? g.ops : ['.'];
    let st = 0;
    const sortE = es => {
      es.sort((x, y) => collate(x.name, y.name));
      if (f.S) es.sort((x, y) => size(y.node) - size(x.node));
      else if (f.t) es.sort((x, y) => y.node.mtime - x.node.mtime);
      if (f.r) es.reverse();
      return es;
    };
    const render = es => {
      if (!f.l) return io.tty && !f['1'] ? (es.length ? es.map(e => colorName(e.name, e.node)).join('  ') + '\n' : '') : es.map(e => colorName(e.name, e.node) + '\n').join('');
      const rows = es.map(e => {
        const n = e.node;
        const links = n.t === 'd' ? 2 + Object.values(n.kids).filter(k => k.t === 'd').length : 1;
        return [modeStr(n), String(links), n.owner, n.group, n.dev ? '0' : (f.h ? human(size(n)) : String(size(n))), lsDate(n.mtime), colorName(e.name, n)];
      });
      const w = [0, 1, 2, 3, 4].map(i => Math.max(0, ...rows.map(r => r[i].length)));
      return rows.map(r => r[0] + ' ' + r[1].padStart(w[1]) + ' ' + r[2].padEnd(w[2]) + ' ' + r[3].padEnd(w[3]) + ' ' + r[4].padStart(w[4]) + ' ' + r[5] + ' ' + r[6] + '\n').join('');
    };
    const files = [], dirs = [];
    ops.forEach(p => {
      const r = this.look(p);
      if (r.err){ io.err += 'ls: não foi possível acessar \'' + p + '\': ' + ERR[r.err] + '\n'; st = 2; return; }
      if (r.node.t === 'd' && !f.d) dirs.push({ name: p, node: r.node, path: r.path });
      else files.push({ name: p, node: r.node });
    });
    let out = render(sortE(files));
    const many = ops.length > 1 || f.R;
    const listDir = (d, first) => {
      if (many) out += (first && !files.length ? '' : '\n') + d.name + ':\n';
      if (!this.can(d.node, 4)){ io.err += 'ls: não foi possível abrir o diretório \'' + d.name + '\': ' + ERR.EACCES + '\n'; st = 2; return; }
      let es = Object.keys(d.node.kids).filter(k => f.a || f.A || k[0] !== '.').map(k => ({ name: k, node: d.node.kids[k] }));
      sortE(es);
      if (f.a){
        const parent = this.look(d.path === '/' ? '/' : d.path + '/..').node || d.node;
        es = [{ name: '.', node: d.node }, { name: '..', node: parent }].concat(es);
      }
      if (f.l) out += 'total ' + es.reduce((s, e) => s + (e.node.t === 'd' ? 4 : Math.ceil(size(e.node) / 4096) * 4), 0) + '\n';
      out += render(es);
      if (f.R) es.filter(e => e.node.t === 'd' && e.name !== '.' && e.name !== '..').forEach(e => listDir({ name: childPath(d.name, e.name), node: e.node, path: childPath(d.path, e.name) }, false));
    };
    sortE(dirs).forEach((d, i) => listDir(d, i === 0));
    io.out += out;
    return st;
  },
  tree(a, io){
    const g = getopt(a, 'ad', 'L');
    if (g.bad) return badOpt('tree', g, io);
    const p = g.ops[0] || '.', max = g.f.L ? parseInt(g.f.L, 10) : Infinity;
    const r = this.look(p);
    if (r.err || r.node.t !== 'd'){ io.out += p + '  [erro ao abrir o diretório]\n\n0 diretórios, 0 arquivos\n'; return 2; }
    let nd = 0, nf = 0;
    io.out += C('D', p) + '\n';
    const walk = (node, pre, depth) => {
      if (depth > max) return;
      if (!this.can(node, 4)){ io.out += pre + '└── [erro ao abrir o diretório]\n'; return; }
      const ks = Object.keys(node.kids).filter(k => (g.f.a || k[0] !== '.') && (!g.f.d || node.kids[k].t === 'd')).sort(collate);
      ks.forEach((k, i) => {
        const c = node.kids[k], lastK = i === ks.length - 1;
        io.out += pre + (lastK ? '└── ' : '├── ') + colorName(k, c) + '\n';
        if (c.t === 'd'){ nd++; walk(c, pre + (lastK ? '    ' : '│   '), depth + 1); } else nf++;
      });
    };
    walk(r.node, '', 1);
    io.out += '\n' + nd + ' diretório' + (nd === 1 ? '' : 's') + (g.f.d ? '' : ', ' + nf + ' arquivo' + (nf === 1 ? '' : 's')) + '\n';
    return 0;
  },
  mkdir(a, io){
    const g = getopt(a, 'pv', '', { parents: 'p', verbose: 'v' });
    if (g.bad) return badOpt('mkdir', g, io);
    if (!g.ops.length){ io.err += 'mkdir: falta o operando\nTente "mkdir --help" para mais informações.\n'; return 1; }
    let st = 0;
    g.ops.forEach(p => {
      const fail = e => { io.err += 'mkdir: não foi possível criar o diretório \'' + p + '\': ' + ERR[e] + '\n'; st = 1; };
      if (g.f.p){
        const parts = this.parts(p); let node = this.root, cur = '';
        for (const part of parts){
          cur += '/' + part;
          if (node.t !== 'd') return fail('ENOTDIR');
          if (!this.can(node, 1)) return fail('EACCES');
          if (!node.kids[part]){
            if (!this.can(node, 2)) return fail('EACCES');
            node.kids[part] = this.newNode('d'); node.mtime = Date.now();
            if (g.f.v) io.out += 'mkdir: foi criado o diretório \'' + cur + '\'\n';
          }
          node = node.kids[part];
        }
        if (node.t !== 'd') fail('EEXIST');
        return;
      }
      const r = this.look(p);
      if (r.node) return fail('EEXIST');
      if (r.err !== 'ENOENT' || !r.parent) return fail(r.err === 'ENOENT' ? 'ENOENT' : r.err);
      if (!this.can(r.parent, 2) || !this.can(r.parent, 1)) return fail('EACCES');
      r.parent.kids[r.name] = this.newNode('d'); r.parent.mtime = Date.now();
      if (g.f.v) io.out += 'mkdir: foi criado o diretório \'' + p + '\'\n';
    });
    return st;
  },
  rmdir(a, io){
    const g = getopt(a, 'v', '');
    if (g.bad) return badOpt('rmdir', g, io);
    if (!g.ops.length){ io.err += 'rmdir: falta o operando\n'; return 1; }
    let st = 0;
    g.ops.forEach(p => {
      const fail = e => { io.err += 'rmdir: falhou em remover \'' + p + '\': ' + ERR[e] + '\n'; st = 1; };
      const r = this.look(p);
      if (r.err) return fail(r.err);
      if (r.node.t !== 'd') return fail('ENOTDIR');
      if (!r.parent) return fail('EPERM');
      if (Object.keys(r.node.kids).length) return fail('ENOTEMPTY');
      if (!this.can(r.parent, 2)) return fail('EACCES');
      delete r.parent.kids[r.name]; r.parent.mtime = Date.now();
      if (g.f.v) io.out += 'rmdir: removendo o diretório \'' + p + '\'\n';
    });
    return st;
  },
  touch(a, io){
    const g = getopt(a, 'c', '');
    if (g.bad) return badOpt('touch', g, io);
    if (!g.ops.length){ io.err += 'touch: falta o operando arquivo\nTente "touch --help" para mais informações.\n'; return 1; }
    let st = 0;
    g.ops.forEach(p => {
      const r = this.look(p);
      if (r.node){
        if (r.node.owner !== this.user && this.user !== 'root' && !this.can(r.node, 2)){ io.err += 'touch: não foi possível tocar \'' + p + '\': ' + ERR.EACCES + '\n'; st = 1; return; }
        r.node.mtime = Date.now(); return;
      }
      if (g.f.c) return;
      const w = this.openWrite(p);
      if (w.err){ io.err += 'touch: não foi possível tocar \'' + p + '\': ' + ERR[w.err] + '\n'; st = 1; }
    });
    return st;
  },
  cat(a, io, name){
    const g = getopt(a, 'n', '', { number: 'n' });
    if (g.bad) return badOpt(name, g, io);
    const fs = gather(this, name, g.ops, io);
    if (!fs) return 1;
    let s = fs.map(x => x.data).join('');
    if (g.f.n) s = joinLines(lines(s).map((l, i) => String(i + 1).padStart(6) + '\t' + l));
    io.out += s;
    return fs.length === Math.max(1, g.ops.length) ? 0 : 1;
  },
  head(a, io, name){
    a = a.map(x => /^-\d+$/.test(x) ? '-n' + x.slice(1) : x);
    const g = getopt(a, '', 'n', { lines: 'n' });
    if (g.bad) return badOpt(name, g, io);
    const n = g.f.n !== undefined ? parseInt(g.f.n, 10) : 10;
    if (isNaN(n)){ io.err += name + ': número de linhas inválido: \'' + g.f.n + '\'\n'; return 1; }
    const fs = gather(this, name, g.ops, io);
    if (!fs) return 1;
    fs.forEach((x, i) => {
      if (fs.length > 1) io.out += (i ? '\n' : '') + '==> ' + x.name + ' <==\n';
      const l = lines(x.data);
      io.out += joinLines(name === 'head' ? l.slice(0, n) : l.slice(Math.max(0, l.length - n)));
    });
    return fs.length === Math.max(1, g.ops.length) ? 0 : 1;
  },
  wc(a, io){
    const g = getopt(a, 'lwc', '', { lines: 'l', words: 'w', bytes: 'c' });
    if (g.bad) return badOpt('wc', g, io);
    const fs = gather(this, 'wc', g.ops, io);
    if (!fs) return 1;
    const sel = g.f.l || g.f.w || g.f.c ? ['l', 'w', 'c'].filter(k => g.f[k]) : ['l', 'w', 'c'];
    const cnt = d => ({ l: (d.match(/\n/g) || []).length, w: d.split(/\s+/).filter(Boolean).length, c: bytes(d) });
    const rows = fs.map(x => Object.assign(cnt(x.data), { name: x.name === '-' ? '' : x.name }));
    if (rows.length > 1) rows.push(rows.reduce((t, r) => ({ l: t.l + r.l, w: t.w + r.w, c: t.c + r.c, name: 'total' }), { l: 0, w: 0, c: 0 }));
    const wd = rows.length > 1 || sel.length > 1 ? Math.max(1, ...rows.map(r => String(Math.max(r.l, r.w, r.c)).length)) : 1;
    rows.forEach(r => { io.out += sel.map(k => String(r[k]).padStart(wd)).join(' ') + (r.name ? ' ' + r.name : '') + '\n'; });
    return fs.length === Math.max(1, g.ops.length) ? 0 : 1;
  },
  sort(a, io){
    const g = getopt(a, 'rnuf', '', { reverse: 'r', 'numeric-sort': 'n', unique: 'u', 'ignore-case': 'f' });
    if (g.bad) return badOpt('sort', g, io);
    const fs = gather(this, 'sort', g.ops, io);
    if (!fs) return 1;
    let l = lines(fs.map(x => x.data.endsWith('\n') || !x.data ? x.data : x.data + '\n').join(''));
    const num = s => { const m = s.trim().match(/^-?\d+([.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0; };
    l.sort(g.f.n ? (x, y) => num(x) - num(y) || collate(x, y) : collate);
    const same = (x, y) => g.f.n ? num(x) === num(y) : g.f.f ? x.toLowerCase() === y.toLowerCase() : x === y;
    if (g.f.u) l = l.filter((x, i) => i === 0 || !same(x, l[i - 1]));
    if (g.f.r) l.reverse();
    io.out += joinLines(l);
    return fs.length === Math.max(1, g.ops.length) ? 0 : 1;
  },
  uniq(a, io){
    const g = getopt(a, 'cdi', '', { count: 'c' });
    if (g.bad) return badOpt('uniq', g, io);
    const fs = gather(this, 'uniq', g.ops.slice(0, 1), io);
    if (!fs) return 1;
    const groups = [];
    lines(fs.map(x => x.data).join('')).forEach(l => {
      const last = groups[groups.length - 1];
      if (last && (g.f.i ? last.l.toLowerCase() === l.toLowerCase() : last.l === l)) last.n++; else groups.push({ l, n: 1 });
    });
    groups.filter(x => !g.f.d || x.n > 1).forEach(x => { io.out += (g.f.c ? String(x.n).padStart(7) + ' ' : '') + x.l + '\n'; });
    return 0;
  },
  grep(a, io){
    const g = getopt(a, 'invcrRlwEHh', 'e', { 'ignore-case': 'i', 'line-number': 'n', 'invert-match': 'v', count: 'c', recursive: 'r', 'files-with-matches': 'l', 'word-regexp': 'w' });
    if (g.bad) return badOpt('grep', g, io);
    const f = g.f, ops = g.ops.slice();
    let pat = f.e !== undefined ? f.e : ops.shift();
    if (pat === undefined){ io.err += 'Uso: grep [OPÇÃO]... PADRÕES [ARQUIVO]...\nTente "grep --help" para mais informações.\n'; return 2; }
    let src = pat;
    if (!f.E) src = src.replace(/\\([+?|(){}])|([+?|(){}])/g, (m, esc1, lit) => esc1 ? esc1 : '\\' + lit);
    if (f.w) src = '(?<![\\wÀ-ÿ])(?:' + src + ')(?![\\wÀ-ÿ])';
    let re;
    try { re = new RegExp(src, 'g' + (f.i ? 'i' : '')); } catch(e){ re = new RegExp(reEsc(pat), 'g' + (f.i ? 'i' : '')); }
    const rec = f.r || f.R;
    const noPrefix = !ops.length && rec;   // grep -r sem caminho: procura em . e mostra nomes sem "./"
    if (noPrefix) ops.push('.');
    let st = 1, errs = false;
    const files = [];
    if (!ops.length){
      if (io.stdin === null){ io.err += 'grep: informe um arquivo (ou envie dados com | ou <). O simulador não lê do teclado.\n'; return 2; }
      files.push({ name: '', data: io.stdin });
    }
    const walk = (p, disp) => {
      const r = this.look(p);
      if (r.err){ io.err += 'grep: ' + disp + ': ' + ERR[r.err] + '\n'; errs = true; return; }
      if (r.node.t === 'd'){
        if (!rec){ io.err += 'grep: ' + disp + ': ' + ERR.EISDIR + '\n'; errs = true; return; }
        if (!this.can(r.node, 4) || !this.can(r.node, 1)){ io.err += 'grep: ' + disp + ': ' + ERR.EACCES + '\n'; errs = true; return; }
        Object.keys(r.node.kids).sort(collate).forEach(k => walk(childPath(r.path, k), noPrefix && disp === '.' ? k : childPath(disp, k)));
        return;
      }
      if (r.node.dev) return;
      if (!this.can(r.node, 4)){ io.err += 'grep: ' + disp + ': ' + ERR.EACCES + '\n'; errs = true; return; }
      files.push({ name: disp, data: r.node.data });
    };
    ops.forEach(p => walk(p, p));
    const prefix = !f.h && (f.H || files.length > 1 || rec);
    files.forEach(x => {
      if (x.data.startsWith('\u007fELF')){ re.lastIndex = 0; if (re.test(x.data) !== !!f.v){ io.out += 'grep: ' + x.name + ': arquivo binário corresponde\n'; st = 0; } return; }
      let count = 0;
      lines(x.data).forEach((l, i) => {
        re.lastIndex = 0;
        const hit = re.test(l);
        if (hit === !!f.v) return;
        count++;
        if (f.c || f.l) return;
        const shown = f.v ? l : l.replace(re, m => m ? C('M', m) : m);
        io.out += (prefix && x.name ? C('F', x.name) + ':' : '') + (f.n ? C('N', String(i + 1)) + ':' : '') + shown + '\n';
      });
      if (count) st = 0;
      if (f.l && count) io.out += C('F', x.name || '(entrada padrão)') + '\n';
      else if (f.c) io.out += (prefix && x.name ? C('F', x.name) + ':' : '') + count + '\n';
    });
    return errs && st ? 2 : st;
  },
  find(a, io){
    const paths = [];
    let i = 0;
    while (i < a.length && !/^[-!(]/.test(a[i])) paths.push(a[i++]);
    if (!paths.length) paths.push('.');
    const tests = []; let maxd = Infinity, mind = 0;
    while (i < a.length){
      const t = a[i++], v = a[i];
      const need = () => { if (v === undefined){ io.err += 'find: faltando argumento para \'' + t + '\'\n'; return false; } i++; return true; };
      if (t === '-name' || t === '-iname'){ if (!need()) return 1; const re = globRe(v, t === '-iname'); tests.push((n, name) => re.test(name)); }
      else if (t === '-type'){ if (!need()) return 1; if (v !== 'f' && v !== 'd'){ io.err += 'find: Argumento desconhecido para -type: ' + v + '\n'; return 1; } tests.push(n => v === 'd' ? n.t === 'd' : n.t === 'f' && !n.dev); }
      else if (t === '-maxdepth' || t === '-mindepth'){ if (!need()) return 1; if (t === '-maxdepth') maxd = parseInt(v, 10); else mind = parseInt(v, 10); }
      else if (t === '-user'){ if (!need()) return 1; tests.push(n => n.owner === v); }
      else if (t === '-empty') tests.push(n => n.t === 'd' ? !Object.keys(n.kids).length : !n.data);
      else if (/^[-!(]/.test(t)){ io.err += 'find: predicado desconhecido \'' + t + '\'\n'; return 1; }
      else { io.err += 'find: caminhos devem preceder a expressão: \'' + t + '\'\nDica: coloque o padrão entre aspas, ex.: find . -name "*.txt"\n'; return 1; }
    }
    let st = 0;
    const visit = (n, disp, depth) => {
      if (depth >= mind && tests.every(t => t(n, disp.split('/').filter(Boolean).pop() || disp))) io.out += disp + '\n';
      if (n.t !== 'd' || depth >= maxd) return;
      if (!this.can(n, 4) || !this.can(n, 1)){ io.err += 'find: \'' + disp + '\': ' + ERR.EACCES + '\n'; st = 1; return; }
      Object.keys(n.kids).sort(collate).forEach(k => visit(n.kids[k], disp.endsWith('/') ? disp + k : disp + '/' + k, depth + 1));
    };
    paths.forEach(p => {
      const r = this.look(p);
      if (r.err){ io.err += 'find: \'' + p + '\': ' + ERR[r.err] + '\n'; st = 1; return; }
      visit(r.node, p, 0);
    });
    return st;
  },
  cp(a, io){ return transfer.call(this, 'cp', a, io); },
  mv(a, io){ return transfer.call(this, 'mv', a, io); },
  rm(a, io){
    const g = getopt(a, 'rRfvid', '', { recursive: 'r', force: 'f', verbose: 'v', 'no-preserve-root': 'nopr' });
    if (g.bad) return badOpt('rm', g, io);
    const f = g.f, rec = f.r || f.R;
    if (f.i){ io.err += 'rm: a opção -i (pedir confirmação) não está disponível no simulador. No terminal real, ela pergunta antes de cada remoção.\n'; return 1; }
    if (!g.ops.length){ if (!f.f) io.err += 'rm: falta o operando\nTente "rm --help" para mais informações.\n'; return f.f ? 0 : 1; }
    let st = 0;
    const del = (parent, name, node, disp) => {
      if (node.t === 'd' && Object.keys(node.kids).length){
        if (!this.can(node, 4) || !this.can(node, 2) || !this.can(node, 1)){ io.err += 'rm: não foi possível remover \'' + disp + '\': ' + ERR.EACCES + '\n'; st = 1; return; }
        Object.keys(node.kids).forEach(k => del(node, k, node.kids[k], childPath(disp, k)));
        if (Object.keys(node.kids).length) return;
      }
      if (!this.can(parent, 2) || !this.can(parent, 1)){ io.err += 'rm: não foi possível remover \'' + disp + '\': ' + ERR.EACCES + '\n'; st = 1; return; }
      if ((parent.mode & 0o1000) && this.user !== 'root' && node.owner !== this.user){ io.err += 'rm: não foi possível remover \'' + disp + '\': ' + ERR.EPERM + '\n'; st = 1; return; }
      delete parent.kids[name]; parent.mtime = Date.now();
      if (f.v) io.out += (node.t === 'd' ? 'diretório removido: ' : 'removido ') + '\'' + disp + '\'\n';
    };
    g.ops.forEach(p => {
      const base = p.replace(/\/+$/, '').split('/').pop();
      if (base === '.' || base === '..'){ io.err += 'rm: recusa-se a remover os diretórios \'.\' ou \'..\': pulando \'' + p + '\'\n'; st = 1; return; }
      const r = this.look(p);
      if (r.err){ if (!f.f){ io.err += 'rm: não foi possível remover \'' + p + '\': ' + ERR[r.err] + '\n'; st = 1; } return; }
      if (!r.parent){
        if (rec && !f.nopr){ io.err += 'rm: é perigoso operar recursivamente em \'/\'\nrm: use --no-preserve-root para ignorar esta falha de segurança\n'; st = 1; return; }
        if (!rec){ io.err += 'rm: não foi possível remover \'/\': ' + ERR.EISDIR + '\n'; st = 1; return; }
        Object.keys(this.root.kids).forEach(k => del(this.root, k, this.root.kids[k], '/' + k));
        return;
      }
      if (r.node.t === 'd' && !rec && !(f.d && !Object.keys(r.node.kids).length)){ io.err += 'rm: não foi possível remover \'' + p + '\': ' + ERR.EISDIR + '\n'; st = 1; return; }
      del(r.parent, r.name, r.node, p);
    });
    return st;
  },
  chmod(a, io){
    let rec = false, verb = false, mode = null; const files = [];
    for (const x of a){
      if (mode === null && (x === '-R' || x === '--recursive')){ rec = true; continue; }
      if (mode === null && (x === '-v' || x === '--verbose')){ verb = true; continue; }
      if (mode === null && (x === '-Rv' || x === '-vR')){ rec = verb = true; continue; }
      if (mode === null) mode = x; else files.push(x);
    }
    if (mode === null){ io.err += 'chmod: falta o operando\nTente "chmod --help" para mais informações.\n'; return 1; }
    if (!files.length){ io.err += 'chmod: falta o operando após \'' + mode + '\'\nTente "chmod --help" para mais informações.\n'; return 1; }
    const apply = parseMode(mode);
    if (!apply){ io.err += 'chmod: modo inválido: \'' + mode + '\'\nTente "chmod --help" para mais informações.\n'; return 1; }
    let st = 0;
    const set = (n, disp) => {
      if (this.user !== 'root' && n.owner !== this.user){ io.err += 'chmod: alterando as permissões de \'' + disp + '\': ' + ERR.EPERM + '\n'; st = 1; return; }
      const before = n.mode;
      n.mode = apply(n.mode, n.t === 'd');
      if (verb) io.out += before === n.mode
        ? 'o modo de \'' + disp + '\' foi mantido como ' + octal(n.mode) + ' (' + modeStr(n).slice(1) + ')\n'
        : 'o modo de \'' + disp + '\' foi alterado de ' + octal(before) + ' (' + modeStr({ t: n.t, mode: before }).slice(1) + ') para ' + octal(n.mode) + ' (' + modeStr(n).slice(1) + ')\n';
      if (rec && n.t === 'd') Object.keys(n.kids).forEach(k => set(n.kids[k], childPath(disp, k)));
    };
    files.forEach(p => {
      const r = this.look(p);
      if (r.err){ io.err += 'chmod: não foi possível acessar \'' + p + '\': ' + ERR[r.err] + '\n'; st = 1; return; }
      set(r.node, p);
    });
    return st;
  },
  chown(a, io){
    const g = getopt(a, 'Rv', '');
    if (g.bad) return badOpt('chown', g, io);
    if (g.ops.length < 2){ io.err += 'chown: falta o operando\nTente "chown --help" para mais informações.\n'; return 1; }
    const spec = g.ops[0].split(':'), own = spec[0], grp = spec[1];
    if (own && !USERS[own]){ io.err += 'chown: usuário inválido: \'' + g.ops[0] + '\'\n'; return 1; }
    if (grp && GIDS[grp] === undefined){ io.err += 'chown: grupo inválido: \'' + g.ops[0] + '\'\n'; return 1; }
    let st = 0;
    const set = (n, disp) => {
      if (this.user !== 'root'){ io.err += 'chown: alterando o dono de \'' + disp + '\': ' + ERR.EPERM + '\n'; st = 1; return; }
      if (own) n.owner = own;
      if (grp) n.group = grp;
      if (g.f.R && n.t === 'd') Object.keys(n.kids).forEach(k => set(n.kids[k], childPath(disp, k)));
    };
    g.ops.slice(1).forEach(p => {
      const r = this.look(p);
      if (r.err){ io.err += 'chown: não foi possível acessar \'' + p + '\': ' + ERR[r.err] + '\n'; st = 1; return; }
      set(r.node, p);
    });
    return st;
  },
  stat(a, io){
    if (!a.length){ io.err += 'stat: falta o operando\n'; return 1; }
    let st = 0;
    a.forEach(p => {
      const r = this.look(p);
      if (r.err){ io.err += 'stat: não foi possível obter estado de \'' + p + '\': ' + ERR[r.err] + '\n'; st = 1; return; }
      const n = r.node;
      const tipo = n.t === 'd' ? 'diretório' : n.dev === 'b' ? 'arquivo especial de bloco' : n.dev === 'c' ? 'arquivo especial de caractere' : (size(n) ? 'arquivo comum' : 'arquivo comum vazio');
      io.out += '  Arquivo: ' + p + '\n  Tamanho: ' + String(size(n)).padEnd(10) + 'Tipo: ' + tipo + '\n' +
        'Acesso: (' + octal(n.mode) + '/' + modeStr(n) + ')  Uid: (' + String(USERS[n.owner].uid).padStart(5) + '/' + n.owner.padStart(8) + ')   Gid: (' + String(GIDS[n.group]).padStart(5) + '/' + n.group.padStart(8) + ')\n' +
        'Modificação: ' + isoDate(n.mtime) + ' -0300\n';
    });
    return st;
  },
  true(){ return 0; },
  false(){ return 1; },
  exit(a, io){ io.err += 'logout (o terminal simulado continua aberto; use ↺ para reiniciá-lo)\n'; return 0; },
  logout(a, io){ return CMDS.exit.call(this, a, io); },
  export(a){ a.forEach(x => { const i = x.indexOf('='); if (i > 0) this.env[x.slice(0, i)] = x.slice(i + 1); }); return 0; }
};
CMDS.tail = CMDS.head;
CMDS.less = CMDS.more = CMDS.cat;

/* Interpreta o modo do chmod. Devolve função (modoAtual, éDiretório) → novoModo, ou null se inválido. */
function parseMode(s){
  if (/^[0-7]{1,4}$/.test(s)){ const v = parseInt(s, 8); return (m, d) => (s.length <= 3 && d ? (m & 0o6000) : 0) | v; }
  const clauses = s.split(',');
  const ok = clauses.every(c => /^[ugoa]*([+\-=][rwxXst]*)+$/.test(c));
  if (!ok) return null;
  return (m, isDir) => {
    clauses.forEach(c => {
      const given = c.match(/^[ugoa]*/)[0];
      const who = (given || 'a').replace('a', 'ugo');
      (c.slice(given.length).match(/[+\-=][rwxXst]*/g) || []).forEach(act => {
        const op = act[0], perms = act.slice(1);
        let bits = 0, special = 0;
        for (const p of perms){
          const v = p === 'r' ? 4 : p === 'w' ? 2 : p === 'x' ? 1 : p === 'X' ? ((isDir || (m & 0o111)) ? 1 : 0) : 0;
          for (const w of who){
            const sh = w === 'u' ? 6 : w === 'g' ? 3 : 0;
            bits |= v << sh;
            if (p === 's' && w !== 'o') special |= w === 'u' ? 0o4000 : 0o2000;
          }
          if (p === 't') special |= 0o1000;
        }
        if (!given && op !== '-') bits &= ~0o022;   // sem u/g/o, a umask (022) protege grupo e outros contra escrita
        let mask = 0;
        for (const w of who) mask |= 7 << (w === 'u' ? 6 : w === 'g' ? 3 : 0);
        if (op === '+') m |= bits | special;
        else if (op === '-') m &= ~(bits | special);
        else m = (m & ~mask) | bits | special;
      });
    });
    return m;
  };
}

/* cp e mv compartilham a lógica de destino */
function transfer(name, a, io){
  const g = name === 'cp' ? getopt(a, 'rRvfai', '', { recursive: 'r', verbose: 'v', force: 'f' }) : getopt(a, 'vfni', '', { verbose: 'v', force: 'f' });
  if (g.bad) return badOpt(name, g, io);
  if (g.f.i){ io.err += name + ': a opção -i (pedir confirmação) não está disponível no simulador. No terminal real, ela pergunta antes de sobrescrever.\n'; return 1; }
  const ops = g.ops;
  if (ops.length < 2){
    io.err += ops.length ? name + ': falta o operando arquivo de destino após \'' + ops[0] + '\'\n' : name + ': falta o operando arquivo\n';
    io.err += 'Tente "' + name + ' --help" para mais informações.\n'; return 1;
  }
  const destArg = ops[ops.length - 1], srcs = ops.slice(0, -1);
  const dr = this.look(destArg);
  const intoDir = dr.node && dr.node.t === 'd';
  if (srcs.length > 1 && !intoDir){ io.err += name + ': o destino \'' + destArg + '\' não é um diretório\n'; return 1; }
  const rec = g.f.r || g.f.R || g.f.a;
  let st = 0;
  const copy = n => { const c = clone(n); const fix = x => { x.owner = this.user; x.group = this.uinfo().group; x.mtime = Date.now(); if (x.kids) Object.values(x.kids).forEach(fix); }; fix(c); return c; };
  srcs.forEach(s => {
    const sr = this.look(s);
    if (sr.err){ io.err += name + ': não foi possível obter estado de \'' + s + '\': ' + ERR[sr.err] + '\n'; st = 1; return; }
    if (!sr.parent){ io.err += name + ': não é possível ' + (name === 'cp' ? 'copiar' : 'mover') + ' a raiz \'/\'\n'; st = 1; return; }
    if (name === 'cp' && sr.node.t === 'd' && !rec){ io.err += 'cp: -r não especificado; omitindo diretório \'' + s + '\'\n'; st = 1; return; }
    const base = sr.name;
    const tPath = intoDir ? childPath(dr.path, base) : this.abs(destArg);
    const tDisp = intoDir ? childPath(destArg, base) : destArg;
    if (tPath === sr.path){ io.err += name + ': \'' + s + '\' e \'' + tDisp + '\' são o mesmo arquivo\n'; st = 1; return; }
    if (sr.node.t === 'd' && (tPath + '/').startsWith(sr.path + '/')){
      io.err += name === 'cp' ? 'cp: não é possível copiar um diretório, \'' + s + '\', para dentro de si mesmo, \'' + tDisp + '\'\n'
                              : 'mv: não foi possível mover \'' + s + '\' para um subdiretório de si mesmo, \'' + tDisp + '\'\n';
      st = 1; return;
    }
    if (name === 'cp' && !this.can(sr.node, 4)){ io.err += 'cp: não foi possível abrir \'' + s + '\' para leitura: ' + ERR.EACCES + '\n'; st = 1; return; }
    if (name === 'mv' && (!this.can(sr.parent, 2) || ((sr.parent.mode & 0o1000) && this.user !== 'root' && sr.node.owner !== this.user))){
      io.err += 'mv: não foi possível mover \'' + s + '\' para \'' + tDisp + '\': ' + ERR.EACCES + '\n'; st = 1; return;
    }
    const tr = this.look(tPath);
    if (tr.err && (tr.err !== 'ENOENT' || !tr.parent)){ io.err += name + ': não foi possível criar \'' + tDisp + '\': ' + ERR[tr.err] + '\n'; st = 1; return; }
    const tParent = tr.parent, tName = tr.name;
    if (!this.can(tParent, 2) || !this.can(tParent, 1)){ io.err += name + ': não foi possível criar \'' + tDisp + '\': ' + ERR.EACCES + '\n'; st = 1; return; }
    if (tr.node){
      if (tr.node.t === 'd' && sr.node.t !== 'd'){ io.err += name + ': não é possível sobrescrever o diretório \'' + tDisp + '\' com um não-diretório\n'; st = 1; return; }
      if (tr.node.t !== 'd' && sr.node.t === 'd'){ io.err += name + ': não é possível sobrescrever o não-diretório \'' + tDisp + '\' com o diretório \'' + s + '\'\n'; st = 1; return; }
      if (tr.node.t === 'd' && Object.keys(tr.node.kids).length && name === 'mv'){ io.err += 'mv: não foi possível mover \'' + s + '\' para \'' + tDisp + '\': ' + ERR.ENOTEMPTY + '\n'; st = 1; return; }
      if (g.f.n) return;
    }
    if (name === 'cp'){
      if (tr.node && tr.node.t === 'd'){ Object.keys(sr.node.kids).forEach(k => { tr.node.kids[k] = copy(sr.node.kids[k]); }); }
      else if (tr.node && tr.node.t === 'f'){ tr.node.data = sr.node.data; tr.node.mtime = Date.now(); }
      else tParent.kids[tName] = copy(sr.node);
    } else {
      delete sr.parent.kids[sr.name]; sr.parent.mtime = Date.now();
      tParent.kids[tName] = sr.node;
      if (sr.node.t === 'd' && (this.cwd + '/').startsWith(sr.path + '/')) this.cwd = tPath + this.cwd.slice(sr.path.length);
    }
    tParent.mtime = Date.now();
    if (g.f.v) io.out += (name === 'mv' ? 'renomeado ' : '') + '\'' + s + '\' -> \'' + tDisp + '\'\n';
  });
  return st;
}

/* ---------- Realce de comandos (blocos estáticos e quiz) ---------- */
function shCmd(line){
  let out = '', first = true, m;
  const re = /(\s+)|('[^']*'|"[^"]*")|(&&|\|\||2>>|2>|>>|[|;<>])|(#.*$)|([^\s|;<>'"]+)/g;
  while ((m = re.exec(line))){
    if (m[1]) out += m[1];
    else if (m[2]) { out += '<span class="t-str">' + esc(m[2]) + '</span>'; first = false; }
    else if (m[3]) { out += '<span class="t-op">' + esc(m[3]) + '</span>'; first = m[3] !== '>' && m[3] !== '>>' && m[3] !== '<' && m[3] !== '2>' && m[3] !== '2>>'; }
    else if (m[4]) out += '<span class="t-com">' + esc(m[4]) + '</span>';
    else {
      const w = m[5];
      if (first){ out += '<span class="t-cmd">' + esc(w) + '</span>'; first = w === 'sudo'; }
      else if (/^-/.test(w)) out += '<span class="t-opt">' + esc(w) + '</span>';
      else out += esc(w);
    }
  }
  return out;
}
function shHl(src){
  return src.replace(/\n$/, '').split('\n').map(l =>
    /^\$ /.test(l) ? '<span class="sh-p">$</span> ' + shCmd(l.slice(2)) :
    /^# /.test(l) ? '<span class="t-com">' + esc(l) + '</span>' :
    '<span class="sh-o">' + esc(l) + '</span>').join('\n') + '\n';
}
window.aulaHl = shHl;

/* ---------- Componente: terminal ---------- */
const terms = [];
const notify = () => { if (window.aulaAutosave) window.aulaAutosave(); };

function makeTerm(el){
  const label = el.dataset.label || 'terminal';
  const checks = el.dataset.check ? JSON.parse(el.dataset.check) : null;
  const sugest = el.dataset.cmds ? el.dataset.cmds.split('|') : [];
  el.innerHTML =
    '<div class="tbar"><span class="tdots"><i></i><i></i><i></i></span><span class="tlabel"></span>' +
    '<span class="thint">Tab completa · ↑ ↓ histórico · Ctrl+L limpa</span>' +
    '<button type="button" class="tb-reset" title="Reiniciar este terminal (desfaz tudo o que foi feito nele)">↺ Reiniciar</button></div>' +
    '<div class="tscreen"><div class="tlines" aria-live="polite"></div>' +
    '<div class="tin-line"><span class="tprompt"></span><input class="tin" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Comando"></div></div>' +
    (sugest.length ? '<div class="tchips"><span>Experimente:</span></div>' : '') +
    (checks ? '<div class="tcheck"><div class="tc-head">Objetivos da missão</div><ul></ul></div>' : '');
  $('.tlabel', el).textContent = label;
  const scr = $('.tscreen', el), out = $('.tlines', el), inp = $('.tin', el), pr = $('.tprompt', el);
  const t = { el, label, checks, sh: new Shell(), cmds: [], ok: false, hpos: 0, lastOut: '' };

  const promptHtml = () => {
    const p = t.sh.prompt();
    return '<span class="p-user">' + esc(p.user) + '</span>:<span class="p-dir">' + esc(p.dir) + '</span>' + p.sym + ' ';
  };
  const sink = {
    tty: true,
    out(s){ const d = document.createElement('div'); d.className = 'to'; d.innerHTML = paint(s.replace(/\n$/, '')); out.appendChild(d); t.lastOut += strip(s); },
    err(s){ const d = document.createElement('div'); d.className = 'to te'; d.textContent = s.replace(/\n$/, ''); out.appendChild(d); t.lastOut += s; },
    clear(){ out.innerHTML = ''; }
  };
  const quiet = { tty: false, out(){}, err(){}, clear(){} };
  const scroll = () => { scr.scrollTop = scr.scrollHeight; };
  const syncPrompt = () => { pr.innerHTML = promptHtml(); };

  t.setup = () => {
    t.sh.reset();
    out.innerHTML = '';
    if (el.dataset.setup){ const u = t.sh.user; t.sh.user = 'aluno'; el.dataset.setup.split('\n').forEach(l => t.sh.run(l, quiet)); t.sh.user = u; }
    const c = el.dataset.cwd || '~';
    t.sh.cwd = t.sh.abs(c); t.sh.old = t.sh.cwd;
    t.sh.status = 0;
    t.sh.log = [];
    if (!el.dataset.quiet){
      const w = document.createElement('div'); w.className = 'to tw';
      w.textContent = 'Terminal simulado (bash). Digite help para ver os comandos disponíveis.';
      out.appendChild(w);
    }
    syncPrompt();
  };
  t.exec = (line, record) => {
    const echo = document.createElement('div'); echo.className = 'tcmd';
    echo.innerHTML = promptHtml() + '<span>' + esc(line) + '</span>';
    out.appendChild(echo);
    t.lastOut = '';
    if (line.trim()){
      t.sh.hist.push(line);
      t.sh.run(line, sink);
      t.sh.log.push({ cmd: line, out: t.lastOut });
      if (record){ t.cmds.push(line); if (t.cmds.length > 400) t.cmds.shift(); }
    }
    while (out.children.length > 600) out.removeChild(out.firstChild);
    syncPrompt();
    t.hpos = t.sh.hist.length;
    evaluate(t);
    scroll();
  };
  t.run = line => { t.exec(line, true); notify(); };
  t.reset = () => { t.cmds = []; t.setup(); evaluate(t); };

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter'){ e.preventDefault(); const v = inp.value; inp.value = ''; t.run(v); return; }
    if (e.key === 'ArrowUp'){ e.preventDefault(); if (t.hpos > 0){ t.hpos--; inp.value = t.sh.hist[t.hpos]; } return; }
    if (e.key === 'ArrowDown'){ e.preventDefault(); if (t.hpos < t.sh.hist.length){ t.hpos++; inp.value = t.sh.hist[t.hpos] || ''; } return; }
    if (e.key === 'Tab'){ e.preventDefault(); complete(t, inp, sink, scroll); return; }
    if ((e.key === 'l' || e.key === 'L') && e.ctrlKey){ e.preventDefault(); out.innerHTML = ''; return; }
    if ((e.key === 'c' || e.key === 'C') && e.ctrlKey && inp.selectionStart === inp.selectionEnd){
      e.preventDefault();
      const d = document.createElement('div'); d.className = 'tcmd'; d.innerHTML = promptHtml() + '<span>' + esc(inp.value) + '^C</span>';
      out.appendChild(d); inp.value = ''; scroll();
    }
  });
  scr.addEventListener('click', () => { if (!window.getSelection().toString()) inp.focus({ preventScroll: true }); });
  $('.tb-reset', el).addEventListener('click', () => {
    if (t.cmds.length && !confirm('Reiniciar este terminal? Tudo o que você fez nele será desfeito.')) return;
    t.reset(); notify();
  });
  sugest.forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = c;
    b.title = 'Executar este comando';
    b.addEventListener('click', () => { t.run(c); inp.focus({ preventScroll: true }); });
    $('.tchips', el).appendChild(b);
  });
  if (checks){
    const ul = $('.tcheck ul', el);
    checks.forEach(c => { const li = document.createElement('li'); li.textContent = c.d; ul.appendChild(li); });
  }
  t.setup();
  evaluate(t);
  el.term = t;
  terms.push(t);
}

/* Tab: completa comando (1ª palavra) ou caminho */
function complete(t, inp, sink, scroll){
  const v = inp.value.slice(0, inp.selectionStart), rest = inp.value.slice(inp.selectionStart);
  const m = v.match(/(^|[\s|;&<>])([^\s|;&<>]*)$/);
  const word = m[2], before = v.slice(0, v.length - word.length);
  const isCmd = !before.trim() || /[|;&]\s*$/.test(before) || /^\s*sudo\s+$/.test(before);
  let cands = [];
  if (isCmd && !word.includes('/')){
    cands = Object.keys(CMDS).concat(['sudo', 'bash']).filter(c => c.startsWith(word)).sort().map(c => ({ full: c, show: c, dir: false }));
  } else {
    const raw = word.replace(/^~(?=\/|$)/, HOME);
    const i = raw.lastIndexOf('/');
    const dirPart = i >= 0 ? raw.slice(0, i + 1) : '', pre = i >= 0 ? raw.slice(i + 1) : raw;
    const r = t.sh.look(dirPart || '.');
    if (r.node && r.node.t === 'd' && t.sh.can(r.node, 4)){
      const shownDir = i >= 0 ? word.slice(0, word.length - pre.length) : '';
      cands = Object.keys(r.node.kids).filter(k => k.startsWith(pre) && (pre[0] === '.' || k[0] !== '.')).sort(collate)
        .map(k => ({ full: shownDir + k.replace(/([ '"\\$*?])/g, '\\$1'), show: k, dir: r.node.kids[k].t === 'd' }));
    }
  }
  if (!cands.length) return;
  if (cands.length === 1){
    const c = cands[0];
    inp.value = before + c.full + (c.dir ? '/' : ' ') + rest;
  } else {
    let common = cands[0].full;
    cands.forEach(c => { while (!c.full.startsWith(common)) common = common.slice(0, -1); });
    if (common.length > word.length) inp.value = before + common + rest;
    else {
      const d = document.createElement('div'); d.className = 'tcmd';
      d.innerHTML = $('.tprompt', t.el).innerHTML + '<span>' + esc(inp.value) + '</span>';
      $('.tlines', t.el).appendChild(d);
      sink.out(cands.map(c => c.dir ? C('D', c.show + '/') : c.show).join('  ') + '\n');
      scroll();
    }
  }
  const pos = inp.value.length - rest.length;
  inp.setSelectionRange(pos, pos);
}

/* ---------- Verificação das missões ---------- */
function test(sh, c){
  const list = v => v === undefined ? [] : Array.isArray(v) ? v : [v];
  const u = sh.user; sh.user = 'root';
  try {
    const node = p => sh.look(p).node;
    switch (c.t){
      case 'dir': return list(c.p).every(p => { const n = node(p); return n && n.t === 'd'; });
      case 'file': return list(c.p).every(p => {
        const n = node(p);
        if (!n || n.t !== 'f') return false;
        const d = n.data.toLowerCase();
        if (c.eq !== undefined && n.data.replace(/\s+$/, '') !== c.eq.replace(/\s+$/, '')) return false;
        return list(c.has).every(h => d.includes(h.toLowerCase())) && list(c.nao).every(h => !d.includes(h.toLowerCase()));
      });
      case 'none': return list(c.p).every(p => !node(p));
      case 'mode': { const n = node(c.p); return !!n && (n.mode & 0o777).toString(8) === c.m; }
      case 'cwd': return sh.cwd === sh.abs(c.p);
      case 'count': { const n = node(c.p); if (!n || n.t !== 'd') return false; const re = globRe(c.g); return Object.keys(n.kids).filter(k => re.test(k)).length === c.n; }
      case 'out': return sh.log.some(e => (!c.cmd || e.cmd.includes(c.cmd)) && list(c.has).every(h => e.out.toLowerCase().includes(h.toLowerCase())) && list(c.nao).every(h => !e.out.toLowerCase().includes(h.toLowerCase())));
    }
    return false;
  } finally { sh.user = u; }
}
function evaluate(t){
  if (!t.checks) return;
  const lis = $$('.tcheck li', t.el);
  let all = true;
  t.checks.forEach((c, i) => { const ok = test(t.sh, c); lis[i].classList.toggle('done', ok); if (!ok) all = false; });
  if (all !== t.ok){
    t.ok = all;
    t.el.classList.toggle('solved', all);
    let b = $('.tok', t.el);
    if (all && !b){ b = document.createElement('span'); b.className = 'tok'; b.textContent = '✓ missão cumprida'; $('.tlabel', t.el).after(b); }
    if (!all && b) b.remove();
  }
}

/* ---------- Componente: explorador da hierarquia ---------- */
function makeFhs(box){
  const info = $('.fhs-info', box);
  const term = () => { const el = document.getElementById(box.dataset.term); return el && el.term; };
  const show = b => {
    $$('[data-dir]', box).forEach(x => x.classList.toggle('on', x === b));
    const dir = b.dataset.dir;
    info.innerHTML = '<div class="fi-path"><i class="bx bx-folder-open"></i> <code></code></div><p class="fi-desc"></p>' +
      (b.dataset.ex ? '<p class="fi-ex"><strong>Exemplos:</strong> <span></span></p>' : '') +
      (term() ? '<button type="button" class="fi-go">Abrir no terminal ↓</button>' : '');
    $('code', info).textContent = dir;
    $('.fi-desc', info).textContent = b.dataset.info;
    if (b.dataset.ex) $('.fi-ex span', info).textContent = b.dataset.ex;
    const go = $('.fi-go', info);
    if (go) go.addEventListener('click', () => {
      const tt = term(); tt.run('cd ' + dir); tt.run('ls');
      tt.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  $$('[data-dir]', box).forEach(b => b.addEventListener('click', () => show(b)));
  info.innerHTML = '<p class="fi-hint">Clique em um diretório para ver para que ele serve.</p>';
}

/* ---------- Componente: resolução de caminhos ---------- */
function makePathViz(box){
  const ref = new Shell(); ref.user = 'root';
  box.innerHTML =
    '<div class="pv-controls"><label>Diretório atual <input class="pv-cwd" spellcheck="false"></label>' +
    '<label>Caminho digitado <input class="pv-path" spellcheck="false"></label></div>' +
    '<div class="pv-presets"><span>Exemplos:</span></div><ol class="pv-steps"></ol><div class="pv-res"></div>';
  const cwd = $('.pv-cwd', box), path = $('.pv-path', box);
  cwd.value = box.dataset.cwd || HOME; path.value = box.dataset.path || '..';
  (box.dataset.presets || '').split('|').filter(Boolean).forEach(p => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = p;
    b.addEventListener('click', () => { path.value = p; draw(); });
    $('.pv-presets', box).appendChild(b);
  });
  function draw(){
    const steps = $('.pv-steps', box), res = $('.pv-res', box);
    steps.innerHTML = ''; res.innerHTML = '';
    let c = cwd.value.trim() || '/';
    if (!c.startsWith('/')){ res.innerHTML = '<span class="bad">O diretório atual precisa ser um caminho absoluto (começando com /).</span>'; return; }
    let p = path.value.trim();
    const add = (tok, html) => { const li = document.createElement('li'); li.innerHTML = '<span class="pv-tok">' + esc(tok) + '</span> ' + html; steps.appendChild(li); };
    let parts;
    if (p.startsWith('/')){ parts = []; add('/', 'começa na <strong>raiz</strong>: caminho <strong>absoluto</strong>, não depende de onde você está'); }
    else if (p === '~' || p.startsWith('~/')){ parts = HOME.split('/').filter(Boolean); add('~', 'atalho para a pasta pessoal: <code>' + HOME + '</code>'); p = p.slice(1); }
    else { parts = c.split('/').filter(Boolean); add('.', 'caminho <strong>relativo</strong>: começa no diretório atual <code>' + esc('/' + parts.join('/')) + '</code>'); }
    p.split('/').filter(Boolean).forEach(x => {
      if (x === '.') add('.', 'continua no mesmo diretório: <code>' + esc('/' + parts.join('/')) + '</code>');
      else if (x === '..'){
        if (!parts.length) add('..', 'já está na raiz; <code>..</code> da raiz é a própria raiz <code>/</code>');
        else { parts.pop(); add('..', 'sobe para o diretório pai: <code>' + esc('/' + parts.join('/')) + '</code>'); }
      } else { parts.push(x); add(x, 'entra em <code>' + esc(x) + '</code>: <code>' + esc('/' + parts.join('/')) + '</code>'); }
    });
    const abs = '/' + parts.join('/');
    const r = ref.look(abs);
    res.innerHTML = 'Caminho absoluto: <code>' + esc(abs) + '</code> ' +
      (r.node ? '<span class="ok">existe (' + (r.node.t === 'd' ? 'diretório' : 'arquivo') + ')</span>' : '<span class="bad">não existe neste sistema</span>');
  }
  cwd.addEventListener('input', draw); path.addEventListener('input', draw);
  draw();
}

/* ---------- Componente: calculadora de permissões ---------- */
function makePermCalc(box){
  const who = [['u', 'Dono (u)'], ['g', 'Grupo (g)'], ['o', 'Outros (o)']];
  const what = [['r', 4, 'leitura'], ['w', 2, 'gravação'], ['x', 1, 'execução']];
  box.innerHTML =
    '<div class="pc-top"><label>Tipo <select class="pc-type"><option value="f">arquivo</option><option value="d">diretório</option></select></label>' +
    '<label>Octal <input class="pc-oct" maxlength="3" inputmode="numeric" spellcheck="false"></label><span class="pc-presets"></span></div>' +
    '<div class="tblwrap"><table class="tbl pc-tab"><tr><th></th>' + what.map(w => '<th>' + w[0] + ' <small>(' + w[1] + ')</small><br><small>' + w[2] + '</small></th>').join('') + '<th>Soma</th></tr>' +
    who.map(w => '<tr data-w="' + w[0] + '"><th>' + w[1] + '</th>' + what.map(x => '<td><input type="checkbox" data-b="' + x[1] + '" aria-label="' + w[1] + ': ' + x[2] + '"></td>').join('') + '<td class="pc-sum"></td></tr>').join('') +
    '</table></div><div class="pc-out"><div class="pc-big"></div><div class="pc-cmds"></div><ul class="pc-say"></ul></div>';
  const oct = $('.pc-oct', box), type = $('.pc-type', box);
  let mode = parseInt(box.dataset.mode || '644', 8);
  if (box.dataset.type === 'd') type.value = 'd';
  const file = () => box.dataset.file || (type.value === 'd' ? 'pasta' : 'arquivo');
  ['644', '755', '600', '700', '750', '777'].forEach(p => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = p;
    b.addEventListener('click', () => { mode = parseInt(p, 8); draw(true); });
    $('.pc-presets', box).appendChild(b);
  });
  function draw(updOct){
    $$('tr[data-w]', box).forEach((tr, i) => {
      const v = (mode >> (6 - 3 * i)) & 7;
      $$('input', tr).forEach(c => { c.checked = (v & +c.dataset.b) !== 0; });
      $('.pc-sum', tr).textContent = v;
    });
    const o = (mode & 0o777).toString(8).padStart(3, '0');
    if (updOct) oct.value = o;
    const isDir = type.value === 'd';
    const sym = modeStr({ t: isDir ? 'd' : 'f', mode });
    $('.pc-big', box).innerHTML = '<span class="pc-sym"><span class="pc-t">' + sym[0] + '</span><span class="pc-u">' + sym.slice(1, 4) + '</span><span class="pc-g">' + sym.slice(4, 7) + '</span><span class="pc-o">' + sym.slice(7) + '</span></span><span class="pc-num">' + o + '</span>';
    const trio = i => { const v = (mode >> (6 - 3 * i)) & 7; return (v & 4 ? 'r' : '') + (v & 2 ? 'w' : '') + (v & 1 ? 'x' : ''); };
    $('.pc-cmds', box).innerHTML = shHl('$ chmod ' + o + ' ' + file() + '\n$ chmod u=' + trio(0) + ',g=' + trio(1) + ',o=' + trio(2) + ' ' + file());
    const verbs = isDir ? { r: 'listar o conteúdo', w: 'criar, renomear e apagar itens dentro', x: 'entrar (cd) e acessar os itens' } : { r: 'ler', w: 'alterar', x: 'executar' };
    $('.pc-say', box).innerHTML = who.map((w, i) => {
      const v = (mode >> (6 - 3 * i)) & 7;
      const can = what.filter(x => v & x[1]).map(x => verbs[x[0]]);
      return '<li><strong>' + w[1].replace(/ \(.\)/, '') + '</strong>: ' + (can.length ? 'pode ' + can.join(', ').replace(/, ([^,]*)$/, ' e $1') : 'não tem nenhum acesso') + '.</li>';
    }).join('');
  }
  box.addEventListener('change', e => {
    if (e.target.type === 'checkbox'){
      mode = 0;
      $$('tr[data-w]', box).forEach((tr, i) => $$('input', tr).forEach(c => { if (c.checked) mode |= (+c.dataset.b) << (6 - 3 * i); }));
    }
    draw(true);
  });
  oct.addEventListener('input', () => { if (/^[0-7]{3}$/.test(oct.value)){ mode = parseInt(oct.value, 8); draw(false); } });
  draw(true);
}

/* ---------- Componente: explicação por partes ---------- */
function makeExplain(box){
  const info = $('.ex-info', box);
  const parts = $$('[data-info]', box);
  const show = b => { parts.forEach(x => x.classList.toggle('on', x === b)); info.textContent = b.dataset.info; };
  parts.forEach(b => { b.addEventListener('click', () => show(b)); b.addEventListener('mouseenter', () => show(b)); });
  info.textContent = box.dataset.hint || 'Passe o mouse ou clique em cada parte.';
}

/* ---------- Progresso ---------- */
(window.aulaPlugins = window.aulaPlugins || []).push({
  name: 'terminais',
  collect(){
    const terminais = {}, missoes = {};
    terms.forEach((t, i) => {
      if (t.cmds.length) terminais[i] = { rotulo: t.label, comandos: t.cmds.slice() };
      if (t.ok) missoes[i] = t.label;
    });
    return { terminais, missoes };
  },
  apply(st){
    terms.forEach((t, i) => {
      t.reset();
      const d = st && st.terminais && st.terminais[i];
      if (!d || d.rotulo !== t.label || !Array.isArray(d.comandos)) return;
      d.comandos.forEach(c => { if (typeof c === 'string') t.exec(c, true); });
    });
  },
  summary(){
    const m = terms.filter(t => t.checks), ok = m.filter(t => t.ok).length;
    const used = terms.filter(t => t.cmds.length).length;
    const parts = [];
    if (m.length) parts.push(ok + ' de ' + m.length + ' missões cumpridas');
    parts.push(used + (used === 1 ? ' terminal usado' : ' terminais usados'));
    return parts;
  }
});

/* ---------- Inicialização ---------- */
$$('pre.sh').forEach(p => { p.innerHTML = shHl(p.textContent); });
$$('.term').forEach(makeTerm);
$$('.fhs').forEach(makeFhs);
$$('.pathviz').forEach(makePathViz);
$$('.permcalc').forEach(makePermCalc);
$$('.explain').forEach(makeExplain);
})();
