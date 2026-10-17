import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../src/app.js';

let servidor;
let base;

const post = (caminho, corpo, bruto = false) =>
  fetch(base + caminho, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bruto ? corpo : JSON.stringify(corpo)
  });

before(async () => {
  servidor = criarApp().listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

describe('API', () => {
  it('POST /analisaRecintos responde no formato do desafio', async () => {
    const resp = await post('/analisaRecintos', { animal: 'MACACO', quantidade: 2 });
    assert.equal(resp.status, 200);
    assert.deepEqual(await resp.json(), {
      recintosViaveis: [
        'Recinto 1 (espaço livre: 5 total: 10)',
        'Recinto 2 (espaço livre: 3 total: 5)',
        'Recinto 3 (espaço livre: 2 total: 7)'
      ]
    });
  });

  it('"Não há recinto viável" é uma resposta válida (200)', async () => {
    const resp = await post('/analisaRecintos', { animal: 'MACACO', quantidade: 10 });
    assert.equal(resp.status, 200);
    assert.deepEqual(await resp.json(), { erro: 'Não há recinto viável' });
  });

  it('entrada inválida responde 400', async () => {
    assert.equal((await post('/analisaRecintos', { animal: 'UNICORNIO', quantidade: 1 })).status, 400);
    assert.equal((await post('/analisaRecintos', { animal: 'LEAO', quantidade: 0 })).status, 400);
    assert.equal((await post('/analisaRecintos', { animal: 'LEAO', quantidade: '2' })).status, 400);
    assert.equal((await post('/analisaRecintos', {})).status, 400);
  });

  it('JSON malformado responde 400 em JSON', async () => {
    const resp = await post('/analisaRecintos', '{isto nao e json', true);
    assert.equal(resp.status, 400);
    assert.deepEqual(await resp.json(), { erro: 'Requisição inválida' });
  });

  it('GET /api/recintos lista animais e recintos', async () => {
    const dados = await (await fetch(`${base}/api/recintos`)).json();
    assert.equal(dados.animais.length, 6);
    assert.equal(dados.recintos.length, 5);
    assert.deepEqual(dados.recintos[0].animais, { MACACO: 3 });
  });

  it('POST /api/avaliar devolve a explicação de cada recinto', async () => {
    const dados = await (await post('/api/avaliar', { animal: 'leão', quantidade: 1 })).json();
    assert.equal(dados.animal, 'LEAO');
    assert.equal(dados.avaliacoes.length, 5);
    assert.ok(dados.avaliacoes.every((a) => typeof a.viavel === 'boolean' && Array.isArray(a.motivos)));
  });

  it('rota /api desconhecida responde 404 em JSON', async () => {
    const resp = await fetch(`${base}/api/nada`);
    assert.equal(resp.status, 404);
    assert.deepEqual(await resp.json(), { erro: 'Rota não encontrada' });
  });
});

describe('API: colocar animais e redefinir', () => {
  const reiniciar = () => post('/api/reiniciar', {});
  const recintos = async () => (await (await fetch(`${base}/api/recintos`)).json()).recintos;

  after(reiniciar);

  it('POST /api/alocar coloca o lote e o estado fica salvo', async () => {
    await reiniciar();
    const resp = await post('/api/alocar', { animal: 'MACACO', quantidade: 2, recinto: 2 });
    assert.equal(resp.status, 200);
    const corpo = await resp.json();
    assert.deepEqual(corpo.colocado, { animal: 'MACACO', quantidade: 2, recinto: 2, espacoLivre: 3 });
    assert.deepEqual(corpo.recintos[1].animais, { MACACO: 2 });
    assert.deepEqual((await recintos())[1].animais, { MACACO: 2 });
  });

  it('a análise seguinte considera os animais colocados', async () => {
    await reiniciar();
    await post('/api/alocar', { animal: 'CROCODILO', quantidade: 1, recinto: 4 });
    const dados = await (await post('/analisaRecintos', { animal: 'CROCODILO', quantidade: 2 })).json();
    assert.deepEqual(dados, { erro: 'Não há recinto viável' });
  });

  it('recinto que não serve responde 409 com os motivos', async () => {
    await reiniciar();
    const resp = await post('/api/alocar', { animal: 'LEAO', quantidade: 1, recinto: 1 });
    assert.equal(resp.status, 409);
    assert.ok((await resp.json()).motivos.length > 0);
    assert.deepEqual((await recintos())[0].animais, { MACACO: 3 });
  });

  it('entradas inválidas respondem 400', async () => {
    assert.equal((await post('/api/alocar', { animal: 'MACACO', quantidade: 1, recinto: 99 })).status, 400);
    assert.equal((await post('/api/alocar', { animal: 'MACACO', quantidade: 0, recinto: 1 })).status, 400);
    assert.equal((await post('/api/alocar', {})).status, 400);
  });

  it('POST /api/reiniciar devolve os recintos ao estado inicial', async () => {
    await post('/api/alocar', { animal: 'MACACO', quantidade: 2, recinto: 2 });
    const resp = await post('/api/reiniciar', {});
    assert.equal(resp.status, 200);
    const corpo = await resp.json();
    assert.deepEqual(corpo.recintos[1].animais, {});
    assert.deepEqual(corpo.recintos[0].animais, { MACACO: 3 });
  });
});
