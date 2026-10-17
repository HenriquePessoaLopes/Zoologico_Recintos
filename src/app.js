import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ANIMAIS, RecintosZoo } from './recintos-zoo.js';

const pastaPublica = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Monta a aplicação Express (sem abrir porta), para poder ser usada nos testes. */
export function criarApp() {
  const app = express();
  const zoo = new RecintosZoo();

  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(pastaPublica));

  // Catálogo de animais e situação atual dos recintos (usado pela interface).
  app.get('/api/recintos', (_req, res) => {
    res.json({
      animais: Object.entries(ANIMAIS).map(([chave, a]) => ({ chave, ...a })),
      recintos: zoo.listarRecintos()
    });
  });

  // Formato do desafio: { recintosViaveis: [...] } ou { erro }.
  app.post('/analisaRecintos', (req, res) => {
    const { animal, quantidade } = req.body ?? {};
    const resultado = zoo.analisaRecintos(animal, quantidade);
    const entradaInvalida = resultado.erro === 'Animal inválido' || resultado.erro === 'Quantidade inválida';
    res.status(entradaInvalida ? 400 : 200).json(resultado);
  });

  // Versão detalhada: avalia todos os recintos e explica cada recusa.
  app.post('/api/avaliar', (req, res) => {
    const { animal, quantidade } = req.body ?? {};
    const resultado = zoo.avaliaRecintos(animal, quantidade);
    // Junto vai o estado atual dos recintos, para a tela nunca ficar desatualizada.
    res.status(resultado.erro ? 400 : 200).json(resultado.erro ? resultado : { ...resultado, recintos: zoo.listarRecintos() });
  });

  // Coloca o lote no recinto escolhido (se servir) e guarda no estado do zoológico.
  app.post('/api/alocar', (req, res) => {
    const { animal, quantidade, recinto } = req.body ?? {};
    const resultado = zoo.alocar(animal, quantidade, recinto);
    if (!resultado.erro) return res.json({ ...resultado, recintos: zoo.listarRecintos() });
    const naoServe = resultado.erro === 'Este recinto não serve para o lote';
    return res.status(naoServe ? 409 : 400).json(resultado);
  });

  // Redefine o desafio: todos os recintos voltam ao estado inicial.
  app.post('/api/reiniciar', (_req, res) => {
    zoo.reiniciar();
    res.json({ recintos: zoo.listarRecintos() });
  });

  app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

  // JSON malformado e demais erros
  // eslint-disable-next-line no-unused-vars
  app.use((erro, _req, res, _next) => {
    const status = erro.status && erro.status < 500 ? erro.status : 500;
    res.status(status).json({ erro: status === 500 ? 'Erro interno' : 'Requisição inválida' });
  });

  return app;
}
