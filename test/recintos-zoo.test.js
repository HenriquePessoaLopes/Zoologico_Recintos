import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RecintosZoo, normalizarAnimal, RECINTOS_PADRAO } from '../src/recintos-zoo.js';

const analisa = (animal, quantidade, recintos) => new RecintosZoo(recintos).analisaRecintos(animal, quantidade);

describe('validações', () => {
  it('rejeita animal desconhecido', () => {
    assert.deepEqual(analisa('UNICORNIO', 1), { erro: 'Animal inválido' });
  });

  it('rejeita animal que não é texto', () => {
    assert.deepEqual(analisa(undefined, 1), { erro: 'Animal inválido' });
    assert.deepEqual(analisa(42, 1), { erro: 'Animal inválido' });
  });

  it('rejeita quantidade zero, negativa, fracionada ou que não é número', () => {
    for (const q of [0, -1, 1.5, NaN, '2', null, undefined]) {
      assert.deepEqual(analisa('MACACO', q), { erro: 'Quantidade inválida' }, `quantidade ${String(q)}`);
    }
  });

  it('aceita nome em minúsculas, com acento e com espaços', () => {
    assert.equal(normalizarAnimal(' hipopótamo '), 'HIPOPOTAMO');
    assert.equal(normalizarAnimal('Leão'), 'LEAO');
    assert.deepEqual(analisa('crocodilo', 1), analisa('CROCODILO', 1));
  });

  it('responde que não há recinto quando o lote não cabe em lugar nenhum', () => {
    assert.deepEqual(analisa('MACACO', 10), { erro: 'Não há recinto viável' });
  });
});

describe('exemplos do desafio', () => {
  it('1 crocodilo só cabe no recinto 4', () => {
    assert.deepEqual(analisa('CROCODILO', 1), { recintosViaveis: ['Recinto 4 (espaço livre: 5 total: 8)'] });
  });

  it('1 macaco: recintos 1 e 3 (sozinho no recinto 2 ele não fica confortável)', () => {
    assert.deepEqual(analisa('MACACO', 1), {
      recintosViaveis: ['Recinto 1 (espaço livre: 6 total: 10)', 'Recinto 3 (espaço livre: 3 total: 7)']
    });
  });

  it('2 macacos: recintos 1, 2 e 3 (o 3 tem espaço extra por causa da gazela)', () => {
    assert.deepEqual(analisa('MACACO', 2), {
      recintosViaveis: [
        'Recinto 1 (espaço livre: 5 total: 10)',
        'Recinto 2 (espaço livre: 3 total: 5)',
        'Recinto 3 (espaço livre: 2 total: 7)'
      ]
    });
  });

  it('1 hipopótamo: recinto 3 (savana e rio, com a gazela) e recinto 4 (rio vazio)', () => {
    assert.deepEqual(analisa('HIPOPOTAMO', 1), {
      recintosViaveis: ['Recinto 3 (espaço livre: 0 total: 7)', 'Recinto 4 (espaço livre: 4 total: 8)']
    });
  });

  it('1 leão só entra no recinto 5, onde já há um leão', () => {
    assert.deepEqual(analisa('LEAO', 1), { recintosViaveis: ['Recinto 5 (espaço livre: 3 total: 9)'] });
  });

  it('1 gazela: recintos 1 e 3', () => {
    assert.deepEqual(analisa('GAZELA', 1), {
      recintosViaveis: ['Recinto 1 (espaço livre: 4 total: 10)', 'Recinto 3 (espaço livre: 3 total: 7)']
    });
  });
});

describe('regras', () => {
  const recintos = (...lista) => lista.map(([numero, bioma, tamanhoTotal, animais = {}]) => ({ numero, bioma, tamanhoTotal, animais }));

  it('carnívoro não divide recinto com outra espécie (nem outra espécie com ele)', () => {
    // Leopardo no recinto 5 com um leão: não pode.
    assert.deepEqual(analisa('LEOPARDO', 1), { erro: 'Não há recinto viável' });
    // Gazela num recinto com leopardo: também não.
    assert.deepEqual(analisa('GAZELA', 1, recintos([1, 'savana', 10, { LEOPARDO: 1 }])), { erro: 'Não há recinto viável' });
  });

  it('carnívoro divide recinto com a própria espécie', () => {
    assert.deepEqual(analisa('LEOPARDO', 2, recintos([1, 'savana', 10, { LEOPARDO: 1 }])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 4 total: 10)']
    });
  });

  it('o bioma precisa servir ao animal', () => {
    assert.deepEqual(analisa('CROCODILO', 1, recintos([1, 'savana', 10])), { erro: 'Não há recinto viável' });
    assert.deepEqual(analisa('GAZELA', 1, recintos([1, 'floresta', 10])), { erro: 'Não há recinto viável' });
    assert.deepEqual(analisa('MACACO', 2, recintos([1, 'floresta', 10])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 8 total: 10)']
    });
  });

  it('hipopótamo só divide recinto com outras espécies em "savana e rio"', () => {
    assert.deepEqual(analisa('HIPOPOTAMO', 1, recintos([1, 'savana', 10, { GAZELA: 1 }])), { erro: 'Não há recinto viável' });
    assert.deepEqual(analisa('HIPOPOTAMO', 1, recintos([1, 'savana e rio', 10, { GAZELA: 1 }])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 3 total: 10)']
    });
    // Sozinho, o hipopótamo aceita savana ou rio comuns.
    assert.deepEqual(analisa('HIPOPOTAMO', 1, recintos([1, 'savana', 10], [2, 'rio', 10])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 6 total: 10)', 'Recinto 2 (espaço livre: 6 total: 10)']
    });
  });

  it('não coloca outra espécie num recinto que já tem hipopótamo fora de "savana e rio"', () => {
    assert.deepEqual(analisa('GAZELA', 1, recintos([1, 'savana', 10, { HIPOPOTAMO: 1 }])), { erro: 'Não há recinto viável' });
  });

  it('macaco sozinho não fica num recinto vazio, mas fica com outros animais', () => {
    assert.deepEqual(analisa('MACACO', 1, recintos([1, 'floresta', 5])), { erro: 'Não há recinto viável' });
    assert.deepEqual(analisa('MACACO', 1, recintos([1, 'savana', 5, { GAZELA: 1 }])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 1 total: 5)']
    });
  });

  it('conta 1 espaço extra quando há mais de uma espécie', () => {
    // Gazela (2) + 1 macaco (1) + extra (1) = 4 de 4: cabe, sobra 0.
    assert.deepEqual(analisa('MACACO', 1, recintos([1, 'savana', 4, { GAZELA: 1 }])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 0 total: 4)']
    });
    // Com 3 de capacidade o extra não cabe.
    assert.deepEqual(analisa('MACACO', 1, recintos([1, 'savana', 3, { GAZELA: 1 }])), { erro: 'Não há recinto viável' });
    // Mesma espécie: sem extra. 2 gazelas (4) + 1 gazela (2) = 6 de 6.
    assert.deepEqual(analisa('GAZELA', 1, recintos([1, 'savana', 6, { GAZELA: 2 }])), {
      recintosViaveis: ['Recinto 1 (espaço livre: 0 total: 6)']
    });
  });

  it('devolve os recintos em ordem de número', () => {
    const r = analisa('GAZELA', 1, recintos([7, 'savana', 10], [2, 'savana', 10], [5, 'savana', 10]));
    assert.deepEqual(
      r.recintosViaveis.map((s) => s.split(' ')[1]),
      ['2', '5', '7']
    );
  });
});

describe('integridade', () => {
  it('analisar não altera os animais que já estão nos recintos', () => {
    const zoo = new RecintosZoo();
    const antes = JSON.stringify(zoo.listarRecintos());
    zoo.analisaRecintos('MACACO', 2);
    zoo.avaliaRecintos('GAZELA', 1);
    assert.equal(JSON.stringify(zoo.listarRecintos()), antes);
  });

  it('não altera a configuração padrão exportada', () => {
    const antes = JSON.stringify(RECINTOS_PADRAO);
    new RecintosZoo().analisaRecintos('LEAO', 1);
    assert.equal(JSON.stringify(RECINTOS_PADRAO), antes);
  });

  it('avaliaRecintos explica a recusa em cada recinto', () => {
    const { avaliacoes } = new RecintosZoo().avaliaRecintos('LEAO', 1);
    assert.equal(avaliacoes.length, 5);
    const r1 = avaliacoes.find((a) => a.numero === 1);
    assert.equal(r1.viavel, false);
    assert.ok(r1.motivos.some((m) => m.includes('Carnívoros')));
    assert.equal(avaliacoes.find((a) => a.numero === 5).viavel, true);
  });
});

describe('alocar e reiniciar', () => {
  it('coloca o lote no recinto escolhido e guarda no estado', () => {
    const zoo = new RecintosZoo();
    const r = zoo.alocar('MACACO', 2, 2);
    assert.deepEqual(r.colocado, { animal: 'MACACO', quantidade: 2, recinto: 2, espacoLivre: 3 });
    assert.deepEqual(zoo.listarRecintos()[1].animais, { MACACO: 2 });
    assert.equal(zoo.listarRecintos()[1].espacoLivre, 3);
  });

  it('soma com os animais da mesma espécie que já estão lá', () => {
    const zoo = new RecintosZoo();
    zoo.alocar('MACACO', 2, 1);
    assert.deepEqual(zoo.listarRecintos()[0].animais, { MACACO: 5 });
  });

  it('as colocações mudam as análises seguintes', () => {
    const zoo = new RecintosZoo();
    // Um crocodilo no recinto 4 deixa 5 de espaço: mais 2 crocodilos (6) não cabem, mais 1 (3) cabe.
    zoo.alocar('CROCODILO', 1, 4);
    assert.deepEqual(zoo.analisaRecintos('CROCODILO', 2), { erro: 'Não há recinto viável' });
    assert.deepEqual(zoo.analisaRecintos('CROCODILO', 1), { recintosViaveis: ['Recinto 4 (espaço livre: 2 total: 8)'] });
  });

  it('recusa recinto que não serve, sem alterar nada', () => {
    const zoo = new RecintosZoo();
    const antes = JSON.stringify(zoo.listarRecintos());
    const r = zoo.alocar('LEAO', 1, 1);
    assert.equal(r.erro, 'Este recinto não serve para o lote');
    assert.ok(r.motivos.length > 0);
    assert.equal(JSON.stringify(zoo.listarRecintos()), antes);
  });

  it('recusa entradas inválidas', () => {
    const zoo = new RecintosZoo();
    assert.equal(zoo.alocar('UNICORNIO', 1, 1).erro, 'Animal inválido');
    assert.equal(zoo.alocar('MACACO', 0, 1).erro, 'Quantidade inválida');
    assert.equal(zoo.alocar('MACACO', 1, 99).erro, 'Recinto inválido');
    assert.equal(zoo.alocar('MACACO', 1, '1').erro, 'Recinto inválido');
  });

  it('reiniciar volta ao estado inicial do desafio', () => {
    const zoo = new RecintosZoo();
    const inicial = JSON.stringify(zoo.listarRecintos());
    zoo.alocar('MACACO', 2, 2);
    zoo.alocar('CROCODILO', 1, 4);
    assert.notEqual(JSON.stringify(zoo.listarRecintos()), inicial);
    zoo.reiniciar();
    assert.equal(JSON.stringify(zoo.listarRecintos()), inicial);
  });

  it('alocar não altera a configuração padrão exportada', () => {
    const antes = JSON.stringify(RECINTOS_PADRAO);
    const zoo = new RecintosZoo();
    zoo.alocar('MACACO', 2, 2);
    zoo.reiniciar();
    assert.equal(JSON.stringify(RECINTOS_PADRAO), antes);
  });
});
