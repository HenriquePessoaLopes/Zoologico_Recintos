/**
 * Desafio "Recintos do Zoo": dado um animal e uma quantidade, diz em quais recintos do zoológico
 * o novo lote pode ser colocado.
 *
 * Regras:
 *  1. O bioma do recinto precisa servir ao animal (o recinto "savana e rio" serve a ambos os biomas).
 *  2. Carnívoros só ficam com a própria espécie.
 *  3. Os animais que já estão no recinto precisam continuar confortáveis (as regras valem para o conjunto final).
 *  4. Hipopótamo só divide recinto com outras espécies se o bioma for "savana e rio".
 *  5. Macaco não fica confortável sozinho: precisa de outro animal no recinto (da mesma espécie ou não).
 *  6. Com mais de uma espécie no recinto, conta 1 espaço extra.
 *  7. Não se divide o lote nem se mudam os animais que já estão nos recintos.
 */

export const ANIMAIS = {
  LEAO: { nome: 'Leão', tamanho: 3, biomas: ['savana'], carnivoro: true },
  LEOPARDO: { nome: 'Leopardo', tamanho: 2, biomas: ['savana'], carnivoro: true },
  CROCODILO: { nome: 'Crocodilo', tamanho: 3, biomas: ['rio'], carnivoro: true },
  MACACO: { nome: 'Macaco', tamanho: 1, biomas: ['savana', 'floresta'], carnivoro: false },
  GAZELA: { nome: 'Gazela', tamanho: 2, biomas: ['savana'], carnivoro: false },
  HIPOPOTAMO: { nome: 'Hipopótamo', tamanho: 4, biomas: ['savana', 'rio'], carnivoro: false }
};

export const RECINTOS_PADRAO = [
  { numero: 1, bioma: 'savana', tamanhoTotal: 10, animais: { MACACO: 3 } },
  { numero: 2, bioma: 'floresta', tamanhoTotal: 5, animais: {} },
  { numero: 3, bioma: 'savana e rio', tamanhoTotal: 7, animais: { GAZELA: 1 } },
  { numero: 4, bioma: 'rio', tamanhoTotal: 8, animais: {} },
  { numero: 5, bioma: 'savana', tamanhoTotal: 9, animais: { LEAO: 1 } }
];

const clonar = (recintos) => recintos.map((r) => ({ ...r, animais: { ...r.animais } }));

/** "savana e rio" -> ['savana', 'rio'] */
const biomasDoRecinto = (bioma) => bioma.split(' e ');

/** Aceita "macaco", " Hipopótamo " etc. e devolve a chave canônica ("MACACO", "HIPOPOTAMO"). */
export function normalizarAnimal(animal) {
  if (typeof animal !== 'string') return null;
  const chave = animal
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  return Object.hasOwn(ANIMAIS, chave) ? chave : null;
}

export class RecintosZoo {
  constructor(recintos = RECINTOS_PADRAO) {
    // Cópias profundas: nem a configuração recebida nem o estado inicial são alterados por quem usa a classe.
    this.configuracaoInicial = clonar(recintos);
    this.recintos = clonar(recintos);
  }

  /** Volta o zoológico ao estado inicial do desafio. */
  reiniciar() {
    this.recintos = clonar(this.configuracaoInicial);
  }

  /**
   * Coloca o lote num recinto, se ele servir. Só aqui o estado dos recintos muda; analisar nunca altera nada.
   * Devolve { colocado } em caso de sucesso, ou { erro } (com { motivos } quando o recinto não serve).
   */
  alocar(animal, quantidade, numeroRecinto) {
    const avaliacao = this.avaliaRecintos(animal, quantidade);
    if (avaliacao.erro) return { erro: avaliacao.erro };

    const alvo = avaliacao.avaliacoes.find((a) => a.numero === numeroRecinto);
    if (!alvo) return { erro: 'Recinto inválido' };
    if (!alvo.viavel) return { erro: 'Este recinto não serve para o lote', motivos: alvo.motivos };

    const recinto = this.recintos.find((r) => r.numero === numeroRecinto);
    recinto.animais[avaliacao.animal] = (recinto.animais[avaliacao.animal] ?? 0) + quantidade;
    return { colocado: { animal: avaliacao.animal, quantidade, recinto: numeroRecinto, espacoLivre: alvo.espacoLivreDepois } };
  }

  espacoOcupado(recinto) {
    return Object.entries(recinto.animais).reduce((total, [animal, qtd]) => total + ANIMAIS[animal].tamanho * qtd, 0);
  }

  /** Estado atual dos recintos (útil para exibir na interface). */
  listarRecintos() {
    return this.recintos.map((r) => {
      const ocupado = this.espacoOcupado(r);
      return { numero: r.numero, bioma: r.bioma, tamanhoTotal: r.tamanhoTotal, espacoLivre: r.tamanhoTotal - ocupado, animais: { ...r.animais } };
    });
  }

  /**
   * Avalia o lote em TODOS os recintos e explica o porquê de cada recusa.
   * Devolve { erro } se a entrada for inválida.
   */
  avaliaRecintos(animal, quantidade) {
    const chave = normalizarAnimal(animal);
    if (!chave) return { erro: 'Animal inválido' };
    if (!Number.isInteger(quantidade) || quantidade <= 0) return { erro: 'Quantidade inválida' };

    const novo = ANIMAIS[chave];
    const avaliacoes = this.recintos.map((recinto) => {
      const motivos = [];
      const especies = new Set([...Object.keys(recinto.animais), chave]);
      const multiplasEspecies = especies.size > 1;
      const vazio = Object.keys(recinto.animais).length === 0;

      // Regra 1
      if (!novo.biomas.some((b) => biomasDoRecinto(recinto.bioma).includes(b))) {
        motivos.push(`O bioma "${recinto.bioma}" não serve para ${novo.nome}.`);
      }
      // Regras 2 e 3: se houver carnívoro no conjunto final (novo ou já presente), só pode haver uma espécie.
      if (multiplasEspecies && [...especies].some((e) => ANIMAIS[e].carnivoro)) {
        motivos.push('Carnívoros só ficam com a própria espécie.');
      }
      // Regras 3 e 4
      if (multiplasEspecies && especies.has('HIPOPOTAMO') && recinto.bioma !== 'savana e rio') {
        motivos.push('Hipopótamo só divide recinto com outras espécies em "savana e rio".');
      }
      // Regra 5
      if (chave === 'MACACO' && vazio && quantidade < 2) {
        motivos.push('Macaco não fica confortável sozinho no recinto.');
      }
      // Regra 6 e capacidade
      const extra = multiplasEspecies ? 1 : 0;
      const necessario = novo.tamanho * quantidade + extra;
      const livreAntes = recinto.tamanhoTotal - this.espacoOcupado(recinto);
      if (necessario > livreAntes) {
        motivos.push(`Espaço insuficiente: o lote precisa de ${necessario}${extra ? ' (já com 1 de espaço extra)' : ''} e há ${livreAntes} livre.`);
      }

      return {
        numero: recinto.numero,
        bioma: recinto.bioma,
        tamanhoTotal: recinto.tamanhoTotal,
        espacoLivreAntes: livreAntes,
        espacoLivreDepois: livreAntes - necessario,
        espacoExtra: extra,
        viavel: motivos.length === 0,
        motivos
      };
    });

    return { animal: chave, quantidade, avaliacoes };
  }

  /** Resposta no formato do desafio. */
  analisaRecintos(animal, quantidade) {
    const resultado = this.avaliaRecintos(animal, quantidade);
    if (resultado.erro) return { erro: resultado.erro };

    const viaveis = resultado.avaliacoes
      .filter((a) => a.viavel)
      .sort((a, b) => a.numero - b.numero)
      .map((a) => `Recinto ${a.numero} (espaço livre: ${a.espacoLivreDepois} total: ${a.tamanhoTotal})`);

    return viaveis.length > 0 ? { recintosViaveis: viaveis } : { erro: 'Não há recinto viável' };
  }
}
