import { criarApp } from './app.js';

const porta = Number(process.env.PORT) || 3030;

criarApp().listen(porta, () => {
  console.log(`Zoológico rodando em http://localhost:${porta}`);
});
