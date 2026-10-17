# Recintos do Zoo

Esse projeto foi feito para resolver o desafio **Recintos do Zoo**: dado um animal e uma quantidade específica desse animal, a intenção é descobrir em quais recintos do zoológico o novo lote pode ficar. Ele tem a lógica das regras em uma classe testada, uma API HTTP e uma interface web que mostra os recintos que servem e **explica por que os outros foram recusados**.

## A história

Imagine que você cuida de um zoológico pequeno, com cinco recintos: uma savana, uma floresta, um rio e mais dois espaços, cada um com seu clima, seu tamanho e, em alguns casos, animais que já moram lá. Numa manhã chega um caminhão com um lote novo: dois macacos, um hipopótamo, um crocodilo. Onde colocar?

Não dá para soltar qualquer um em qualquer lugar. O leão não divide o espaço com a gazela, o hipopótamo só aceita companhia na savana com rio, o macaco fica estressado se estiver sozinho, e quando duas espécies convivem no mesmo recinto sobra um espaço a menos para todos. Resolver isso de cabeça, a cada chegada de animais, dá dor de cabeça (e pode acabar mal para a gazela).

O projeto nasceu para responder essa pergunta. Primeiro vieram as regras, escritas numa classe que não depende de servidor nenhum, para poderem ser testadas uma a uma. Depois veio a API, para outros sistemas poderem perguntar "onde esse lote cabe?". Por fim, a interface: o tratador escolhe o animal, a quantidade, e vê os cinco recintos com os que servem destacados e, nos que não servem, o motivo da recusa, para entender a decisão em vez de só receber um "não".

## O problema

O zoológico tem 5 recintos, cada um com um bioma, um tamanho e (às vezes) animais que já moram lá:

| Recinto | Bioma | Tamanho | Animais existentes |
|---|---|---|---|
| 1 | savana | 10 | 3 macacos |
| 2 | floresta | 5 | vazio |
| 3 | savana e rio | 7 | 1 gazela |
| 4 | rio | 8 | vazio |
| 5 | savana | 9 | 1 leão |

Os animais que podem chegar:

| Animal | Tamanho | Bioma(s) | Alimentação |
|---|---|---|---|
| Leão | 3 | savana | carnívoro |
| Leopardo | 2 | savana | carnívoro |
| Crocodilo | 3 | rio | carnívoro |
| Macaco | 1 | savana ou floresta | herbívoro |
| Gazela | 2 | savana | herbívoro |
| Hipopótamo | 4 | savana ou rio | herbívoro |

Regras:

1. O bioma do recinto precisa servir ao animal (o recinto "savana e rio" serve aos dois).
2. Carnívoros só ficam com a própria espécie.
3. Quem já está no recinto precisa continuar confortável.
4. Hipopótamo só divide recinto com outras espécies em "savana e rio".
5. Macaco não fica sozinho no recinto.
6. Com mais de uma espécie no recinto, conta 1 espaço extra.
7. O lote não se divide e os animais atuais não mudam de recinto.

## Usando a interface

1. Escolha o animal e a quantidade e clique em **Analisar recintos**: os recintos que servem ficam em verde e os que não servem mostram o motivo.
2. Num recinto que serve, clique em **Colocar aqui**: o lote é guardado nele, o espaço livre diminui e as próximas análises já levam esses animais em conta (por exemplo, depois de colocar um crocodilo no recinto 4, um segundo lote de crocodilos pode já não caber lá).
3. O botão **Redefinir desafio**, no topo da página, desfaz tudo e devolve os recintos ao estado inicial da tabela acima.

Os animais colocados ficam guardados no servidor: sobrevivem a recarregar a página, mas voltam ao estado inicial quando o servidor é reiniciado.

## Como rodar

Pré-requisito: **Node.js 20+**.

```bash
npm install
npm start
```

Abra <http://localhost:3030>. (Para usar outra porta: `PORT=4000 npm start`; no PowerShell, `$env:PORT=4000; npm start`.)

### Testes

```bash
npm test
```

São 41 testes (`node:test`, sem dependências extras): validações, cada regra do desafio, os exemplos clássicos e a API (incluindo colocar animais e redefinir).

## Usando a API

`POST /analisaRecintos` responde no formato do desafio:

```bash
curl -X POST http://localhost:3030/analisaRecintos \
  -H "Content-Type: application/json" \
  -d '{"animal":"MACACO","quantidade":2}'
```

```json
{
  "recintosViaveis": [
    "Recinto 1 (espaço livre: 5 total: 10)",
    "Recinto 2 (espaço livre: 3 total: 5)",
    "Recinto 3 (espaço livre: 2 total: 7)"
  ]
}
```

O "espaço livre" é o que sobra **depois** de colocar o lote. Respostas possíveis:

| Situação | Resposta |
|---|---|
| Há recintos viáveis | `200` com `{ "recintosViaveis": [...] }`, em ordem de número |
| Nenhum recinto serve | `200` com `{ "erro": "Não há recinto viável" }` |
| Animal desconhecido | `400` com `{ "erro": "Animal inválido" }` |
| Quantidade que não é um inteiro maior que zero | `400` com `{ "erro": "Quantidade inválida" }` |

O nome do animal aceita minúsculas e acentos (`"leão"`, `" Hipopótamo "`).

Outras rotas, usadas pela interface:

- `GET /api/recintos`: catálogo de animais e situação atual dos recintos.
- `POST /api/avaliar`: mesma entrada, mas devolve **todos** os recintos com `viavel`, `motivos` (por que foi recusado) e o espaço antes/depois.
- `POST /api/alocar` (`{ "animal", "quantidade", "recinto" }`): coloca o lote no recinto, se ele servir (`409` com os `motivos` se não servir).
- `POST /api/reiniciar`: redefine o desafio (todos os recintos voltam ao estado inicial).

Atenção: `/analisaRecintos` e `/api/avaliar` consideram os animais já colocados com `/api/alocar`. Para voltar ao estado original do desafio, chame `/api/reiniciar`.

## Estrutura

```
src/recintos-zoo.js   # as regras (classe RecintosZoo)
src/app.js            # API Express e arquivos estáticos
src/index.js          # sobe o servidor
public/               # interface web (HTML, CSS e JavaScript puro)
test/                 # testes das regras e da API
```

## Decisões

- As regras ficam numa classe independente do servidor: dá para testá-la sem subir nada e reaproveitá-la.
- A configuração do zoológico é copiada ao criar a classe, então analisar nunca altera os recintos (regra 7).
- A interface monta a tela com `textContent` e nunca com `innerHTML`, então nenhum dado vindo da API vira HTML.
- A porta padrão é a 3030 para não colidir com outros projetos de front-end na 3000.
