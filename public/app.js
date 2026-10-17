const EMOJIS = { LEAO: '🦁', LEOPARDO: '🐆', CROCODILO: '🐊', MACACO: '🐒', GAZELA: '🦌', HIPOPOTAMO: '🦛' };

const el = {
  form: document.getElementById('form'),
  animais: document.getElementById('animais'),
  quantidade: document.getElementById('quantidade'),
  menos: document.getElementById('menos'),
  mais: document.getElementById('mais'),
  aviso: document.getElementById('aviso'),
  resumo: document.getElementById('resumo'),
  recintos: document.getElementById('recintos'),
  confirmacao: document.getElementById('confirmacao'),
  redefinir: document.getElementById('redefinir'),
  botao: document.querySelector('#form .botao')
};

let catalogo = { animais: [], recintos: [] };
// Lote da análise que está na tela: é ele que o botão "Colocar aqui" coloca no recinto.
let loteAtual = null;

const plural = (nome, qtd) => {
  const n = nome.toLowerCase();
  if (qtd === 1) return n;
  return n.endsWith('ão') ? n.slice(0, -2) + 'ões' : n + 's';
};

/** Cria um elemento com texto (sempre via textContent, nunca innerHTML com dados da API). */
function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

const classeBioma = (bioma) => `bioma-${bioma.replaceAll(' ', '-')}`;

function moradores(animais) {
  const caixa = criar('div', 'recinto__moradores');
  const itens = Object.entries(animais);
  if (itens.length === 0) {
    caixa.append(criar('small', '', 'Recinto vazio'));
    return caixa;
  }
  for (const [chave, qtd] of itens) {
    caixa.append(criar('span', '', `${EMOJIS[chave] ?? '🐾'}×${qtd}  `));
  }
  return caixa;
}

/** Barra de ocupação: já ocupado + novo lote (+ espaço extra), proporcional ao tamanho do recinto. */
function medidor(recinto, avaliacao, extra) {
  const total = recinto.tamanhoTotal;
  const ocupado = total - recinto.espacoLivre;
  // Só mostra o lote novo nos recintos onde ele realmente entraria.
  const entra = Boolean(avaliacao?.viavel);
  const novo = entra ? avaliacao.espacoLivreAntes - avaliacao.espacoLivreDepois - extra : 0;
  const pct = (n) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;

  const barra = criar('div', 'medidor');
  barra.setAttribute('role', 'img');
  barra.setAttribute('aria-label', `${ocupado} de ${total} espaços ocupados`);
  const a = criar('div', 'medidor__ocupado');
  a.style.width = pct(ocupado);
  const b = criar('div', 'medidor__novo');
  b.style.width = pct(novo);
  const c = criar('div', 'medidor__extra');
  c.style.width = entra ? pct(extra) : '0%';
  barra.append(a, b, c);
  return barra;
}

function cartaoRecinto(recinto, avaliacao) {
  const viavel = avaliacao?.viavel;
  const cartao = criar('article', `recinto${avaliacao ? (viavel ? ' viavel' : ' recusado') : ''}`);

  const topo = criar('div', 'recinto__topo');
  const titulo = criar('div');
  titulo.append(criar('h3', 'recinto__numero', `Recinto ${recinto.numero}`), criar('span', `recinto__bioma ${classeBioma(recinto.bioma)}`, recinto.bioma));
  topo.append(titulo);
  if (avaliacao) topo.append(criar('span', `selo ${viavel ? 'sim' : 'nao'}`, viavel ? 'Serve' : 'Não serve'));

  cartao.append(topo, moradores(recinto.animais));

  // O espaço extra aparece quando o recinto passaria a ter mais de uma espécie.
  cartao.append(medidor(recinto, avaliacao, avaliacao?.espacoExtra ?? 0));
  cartao.append(criar('p', 'legenda', `${recinto.espacoLivre} de ${recinto.tamanhoTotal} espaços livres agora`));

  if (avaliacao) {
    if (viavel) {
      cartao.append(criar('p', 'livre-depois', `Depois do lote sobram ${avaliacao.espacoLivreDepois} espaços.`));
      const colocar = criar('button', 'botao botao--colocar', 'Colocar aqui');
      colocar.type = 'button';
      colocar.addEventListener('click', () => colocarNoRecinto(recinto.numero, colocar));
      cartao.append(colocar);
    } else {
      const lista = criar('ul', 'motivos');
      for (const m of avaliacao.motivos) lista.append(criar('li', '', m));
      cartao.append(lista);
    }
  }
  return cartao;
}

function mostrarRecintos(recintos, avaliacoes) {
  el.recintos.replaceChildren(
    ...recintos.map((r) => cartaoRecinto(r, avaliacoes?.find((a) => a.numero === r.numero)))
  );
}

function mostrarAviso(texto) {
  el.aviso.textContent = texto ?? '';
  el.aviso.hidden = !texto;
}

function mostrarConfirmacao(texto) {
  el.confirmacao.textContent = texto ?? '';
  el.confirmacao.hidden = !texto;
}

function limparResultado(textoResumo = 'Escolha um animal para ver quais recintos servem.') {
  loteAtual = null;
  el.resumo.className = 'resumo';
  el.resumo.textContent = textoResumo;
  mostrarRecintos(catalogo.recintos);
}

function montarAnimais(animais) {
  el.animais.replaceChildren(
    ...animais.map((a, i) => {
      const rotulo = criar('label', 'animal');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'animal';
      radio.value = a.chave;
      if (i === 0) radio.checked = true;
      const cartao = criar('span', 'animal__cartao');
      cartao.append(
        criar('span', 'animal__emoji', EMOJIS[a.chave] ?? '🐾'),
        criar('span', 'animal__nome', a.nome),
        criar('span', 'animal__info', `${a.carnivoro ? 'carnívoro' : 'herbívoro'} · ocupa ${a.tamanho}`)
      );
      rotulo.append(radio, cartao);
      return rotulo;
    })
  );
}

async function carregar() {
  try {
    const resp = await fetch('/api/recintos');
    if (!resp.ok) throw new Error();
    const dados = await resp.json();
    catalogo = dados;
    montarAnimais(dados.animais);
    mostrarRecintos(dados.recintos);
  } catch {
    mostrarAviso('Não consegui falar com o servidor. Ele está rodando? (npm start)');
  }
}

async function analisar(evento) {
  evento.preventDefault();
  mostrarAviso();

  const animal = el.form.elements.animal.value;
  const quantidade = Number(el.quantidade.value);
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    mostrarAviso('Informe uma quantidade inteira, de 1 em diante.');
    return;
  }

  el.botao.disabled = true;
  try {
    const resp = await fetch('/api/avaliar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animal, quantidade })
    });
    const dados = await resp.json();
    if (!resp.ok) {
      mostrarAviso(dados.erro ?? 'Algo deu errado.');
      return;
    }

    mostrarConfirmacao();
    catalogo.recintos = dados.recintos;
    loteAtual = { animal: dados.animal, quantidade };
    const nome = catalogo.animais.find((a) => a.chave === dados.animal)?.nome ?? dados.animal;
    const viaveis = dados.avaliacoes.filter((a) => a.viavel);
    el.resumo.className = viaveis.length ? 'resumo' : 'resumo sem-recinto';
    el.resumo.replaceChildren(
      document.createTextNode(`${quantidade} ${plural(nome, quantidade)}: `),
      criar('strong', '', viaveis.length ? `${viaveis.length} recinto${viaveis.length > 1 ? 's servem' : ' serve'}` : 'não há recinto viável')
    );

    // Recintos que servem primeiro, depois os recusados, ambos por número.
    const ordem = [...dados.avaliacoes].sort((a, b) => Number(b.viavel) - Number(a.viavel) || a.numero - b.numero);
    const recintos = ordem.map((a) => catalogo.recintos.find((r) => r.numero === a.numero));
    mostrarRecintos(recintos, ordem);
  } catch {
    mostrarAviso('Não consegui falar com o servidor.');
  } finally {
    el.botao.disabled = false;
  }
}

async function colocarNoRecinto(numero, botao) {
  if (!loteAtual) return;
  mostrarAviso();
  botao.disabled = true;
  try {
    const resp = await fetch('/api/alocar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...loteAtual, recinto: numero })
    });
    const dados = await resp.json();
    if (!resp.ok) {
      mostrarAviso([dados.erro, ...(dados.motivos ?? [])].join(' '));
      botao.disabled = false;
      return;
    }

    const { colocado } = dados;
    const nome = catalogo.animais.find((a) => a.chave === colocado.animal)?.nome ?? colocado.animal;
    catalogo.recintos = dados.recintos;
    limparResultado('Lote guardado. Escolha o próximo animal para continuar.');
    mostrarConfirmacao(
      `${colocado.quantidade} ${plural(nome, colocado.quantidade)} ${colocado.quantidade > 1 ? 'foram colocados' : 'foi colocado'} no Recinto ${colocado.recinto}. Sobram ${colocado.espacoLivre} espaços.`
    );
  } catch {
    mostrarAviso('Não consegui falar com o servidor.');
    botao.disabled = false;
  }
}

async function redefinirDesafio() {
  if (!window.confirm('Redefinir o desafio? Todos os animais colocados serão removidos e os recintos voltam ao estado inicial.')) return;
  mostrarAviso();
  try {
    const resp = await fetch('/api/reiniciar', { method: 'POST' });
    if (!resp.ok) throw new Error();
    catalogo.recintos = (await resp.json()).recintos;
    el.quantidade.value = 1;
    const primeiro = el.form.querySelector('input[name="animal"]');
    if (primeiro) primeiro.checked = true;
    limparResultado();
    mostrarConfirmacao('Desafio redefinido: os recintos voltaram ao estado inicial.');
  } catch {
    mostrarAviso('Não consegui redefinir. O servidor está rodando?');
  }
}

const ajustar = (delta) => {
  const atual = Number(el.quantidade.value) || 1;
  el.quantidade.value = Math.min(99, Math.max(1, atual + delta));
};

el.menos.addEventListener('click', () => ajustar(-1));
el.mais.addEventListener('click', () => ajustar(1));
el.form.addEventListener('submit', analisar);
el.redefinir.addEventListener('click', redefinirDesafio);
carregar();
