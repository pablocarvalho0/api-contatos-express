# API de Contatos — Express + TypeScript

API REST de contatos construída como projeto de estudo, com foco em entender o
modelo mental do Express: o ciclo de vida de uma requisição, escopo de
middlewares e tratamento centralizado de erros. Os dados vivem em um
fake-backend em memória — a troca por Postgres real (via Drizzle) é o próximo
passo planejado.

O objetivo aqui não é a API em si, e sim a arquitetura: cada decisão de estrutura
está documentada com o *porquê*, incluindo o que deliberadamente **não** foi
implementado ainda e qual problema justificaria implementar.

**Stack:** Node.js · TypeScript · Express 5 · tsx (dev runtime) · Docker Compose
(Postgres provisionado, ainda não integrado)

> O ponto de partida deste projeto é o módulo de Node + Express do curso da
> [B7Web](https://b7web.com.br). A implementação, a estrutura de pastas e a
> documentação de arquitetura abaixo são desenvolvimento próprio a partir dali.

---

## Como rodar

```bash
npm install
npm run dev     # sobe o servidor em modo watch na porta 3000
npm run test    # smoke test das rotas (src/tests/test-rotas.sh)
npm run build   # compila TypeScript
```

Não há variáveis de ambiente por enquanto: a porta (`3000`) está fixa no
`server.ts`. Config externa entra quando houver banco real (ver
[Horizonte](#horizonte-o-que-ainda-não-existe--e-por-quê)).

O smoke test usa `curl` e `jq`, e assume o servidor já rodando em outro
terminal.

### Postgres (opcional, ainda não usado pela API)

O repositório inclui um `docker-compose.yml` com Postgres 16 — legado do
exercício de Docker que originou o repo, e base pronta para a migração do
fake-backend:

```bash
docker compose up -d    # Postgres em localhost:12345
```

A API não se conecta a ele ainda. Não é necessário para rodar nada acima.

---

## Endpoints

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/ping` | healthcheck (`{ pong: true }`) |
| `GET` | `/contacts` | lista todos os contatos |
| `POST` | `/contacts` | cria um contato (id gerado pelo servidor) |
| `GET` | `/contacts/:id` | busca um contato |
| `PUT` | `/contacts/:id` | atualiza um contato |
| `DELETE` | `/contacts/:id` | remove um contato |

Rotas com `:id` passam pelo middleware `validar-id` antes do controller.

---

## Arquitetura: os dois eixos

A ideia central da estrutura de pastas é que ela vive em **dois eixos
diferentes**, não num só. Tratar tudo como uma pilha hierárquica única é a fonte
mais comum de confusão — daí a distinção explícita.

### Eixo vertical — o fluxo da requisição

```
server.ts  →  routes/  →  controllers/
```

Aqui **há hierarquia**: o request desce por essas camadas, na ordem. Uma chama a
próxima. É a "esteira". Neste eixo, "uma camada chama outra" significa ordem e
dependência de verdade.

### Eixo horizontal — caixas de ferramentas transversais

```
types/     middlewares/     utils/
```

Estas **não são camadas do fluxo**. São caixas de ferramentas que *qualquer*
ponto do eixo vertical pode pegar emprestado. Não estão acima nem abaixo de
ninguém — estão de lado. Por isso é normal e desejável que `server.ts` e
`routes/` importem ambos de `middlewares/`: não são duas camadas hierárquicas
puxando do mesmo lugar, são dois pontos do fluxo consumindo da mesma toolbox.

**Régua pra classificar qualquer função nova:** ela serve UMA rota específica
(→ controller, eixo vertical) ou é atravessada por VÁRIAS (→ middleware/util,
eixo horizontal)?

---

## O ciclo de uma requisição (a esteira)

Toda requisição atravessa uma esteira de funções (middlewares), **na ordem em
que foram registradas**. Cada middleware é `(req, res, next)` e faz uma de duas
coisas: chama `next()` (passa pra próxima estação) ou responde via `res`
(encerra a esteira). Se não fizer nenhuma das duas, o request fica pendurado.

Fluxo global montado no `server.ts`:

```
express.json()  →  logger  →  routes  →  (error-handler, no fim)
```

- **`express.json()`** — lê o corpo cru e transforma em objeto em `req.body`.
  Fica em primeiro de propósito: se viesse depois das rotas, o controller acharia
  `req.body` vazio. É *aqui* que JSON malformado é detectado (o parser chama
  `next(err)`).
- **`logger`** — loga toda requisição que passa. Transversal, app-level.
- **`routes`** — o Router acha a rota certa pelo verbo HTTP + caminho.
- **`error-handler`** — registrado por último. Captura tudo que chegou via
  `next(err)`.

### Os três canais de um middleware

| Ação | O que significa | Pra onde vai o request |
|------|-----------------|------------------------|
| `next()` | terminei, passa adiante | próxima estação normal |
| `res.json(...)` | respondi, encerrei | volta pro cliente, esteira acaba |
| `next(err)` | deu erro aqui | **pula** os middlewares normais, cai no error-handler |

### O error-handler

É um middleware especial de **4 parâmetros**: `(err, req, res, next)`. O Express
descobre que é tratador de erro **pela quantidade de parâmetros** (aridade), não
pelos nomes — 3 params = normal, 4 params = erro. Precisa listar os 4 mesmo sem
usar o `next`, senão o Express conta 3 e trata como middleware comum.

Ele é o "único try/catch no fim": o lugar onde todo erro converge e vira resposta
consistente. Devolve JSON no mesmo formato do resto (`{ error: ... }`) e
**conscientemente não vaza** stack trace nem caminhos internos — coisa que o
error-handler default do Express faz.

---

## Estrutura de pastas

```
src/
├── controllers/   # servem UMA rota; traduzem req → res (eixo vertical)
├── middlewares/   # transversais: logger, validar-id, error-handler (eixo horizontal)
├── routes/        # router.ts: mapa de endpoints (verbo + caminho → controller)
├── types/         # definições de tipo (eixo horizontal)
├── utils/         # funções puras: validate-email, validate-uuid, create-fake-data
├── tests/         # test-rotas.sh: smoke test versionado
└── server.ts      # infra: parse, log global, error-handler, listen na porta
```

---

## Convenções

- **Respostas sempre em JSON**, formato `{ error: ... }` pros erros — inclusive
  os que o Express pega sozinho (via error-handler central).
- **Status codes têm semântica:** `4xx` = culpa do cliente (mandou errado ou
  pediu algo inexistente), `5xx` = culpa do servidor (algo quebrou). Ex.: `400`
  id malformado, `404` id válido mas inexistente, `500` erro não previsto.
- **Colocação de middleware = escopo:** monta no nível cuja largura bate com a
  necessidade.
  - *app-level* (`app.use` no server) → toda requisição. Ex.: `logger`, `error-handler`.
  - *route-level* (`router.get('/x', mw, ctrl)`) → só aquela rota. Ex.: `validar-id`.
  - *router-level* (`router.use`) → todas as rotas de um router (ainda não usado).

---

## Horizonte: o que ainda NÃO existe — e por quê

Estas pastas aparecem em arquiteturas mais completas. Não estão aqui porque a
**dor que as justifica ainda não apareceu**. Cada uma entra quando seu problema
específico surgir — não antes. Documentar o gatilho evita tanto abstração
prematura quanto esquecer o motivo depois.

| Pasta | Nasce quando |
|-------|--------------|
| `repositories/` | o acesso a dados vira banco real (Drizzle + o Postgres do compose, substituindo o fake-backend) |
| `services/` | a regra de negócio engorda no controller; com controller *e* repository, o service é a cola no meio |
| `errors/` | quiser status por tipo de erro em vez de 500 genérico — classes tipo `NotFoundError` com status embutido, e o handler lendo `err.status` |
| `config/` | config espalhada virar bagunça (provável junto com o banco: connection string, porta, ambiente) |
| split `app.ts`/`server.ts` | quiser testar rotas sem abrir porta de rede — importar `app` puro, sem `listen` (pré-requisito pra testes de integração com Vitest) |

---

## Contribuindo

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para o passo a passo de adicionar um
recurso novo dentro da arquitetura atual, com o raciocínio por trás de cada
etapa.

---

## Licença

[MIT](LICENSE) — use, copie e adapte livremente.
