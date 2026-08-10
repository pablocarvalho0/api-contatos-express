# API de Contatos — Express + TypeScript + Drizzle

API REST de contatos construída como projeto de estudo, com foco em entender o
modelo mental do Express (ciclo de vida de uma requisição, escopo de middlewares,
tratamento centralizado de erros) e, agora, a integração com Postgres via
**Drizzle ORM**.

O CRUD completo já roda contra o Postgres, leitura e escrita, através da camada
de `services/`. O que sobrou de divergente entre o que a API faz e o que ela
deveria fazer está listado em [Dívidas conhecidas](#dívidas-conhecidas), com o
teste que exercita cada uma — saber o que ainda não está certo é parte do valor
do repo.

O objetivo aqui não é a API em si, e sim a arquitetura: cada decisão de estrutura
está documentada com o *porquê*, incluindo o que deliberadamente **não** foi
implementado ainda e qual problema justificaria implementar.

**Stack:** Node.js · TypeScript · Express 5 · Drizzle ORM 0.45 · postgres.js ·
Postgres 16 (Docker Compose) · tsx (dev runtime)

> O ponto de partida deste projeto é o módulo de Node + Express do curso da
> [B7Web](https://b7web.com.br). A implementação, a estrutura de pastas e a
> documentação de arquitetura abaixo são desenvolvimento próprio a partir dali.

---

## Como rodar

O banco agora é obrigatório: a API abre a conexão no boot.

```bash
npm install
cp .env.example .env         # DATABASE_URL já aponta pro Postgres do compose
docker compose up -d --wait  # Postgres 16 em localhost:12345, já com o schema
npm run db:seed              # massa de teste: 20 contatos, 4 grupos, 10 vínculos
npm run dev                  # servidor em modo watch na porta 3000
```

Numa máquina limpa isso basta: `src/db/init.sql` é montado em
`/docker-entrypoint-initdb.d/`, e a imagem do Postgres roda esse DDL na criação
do volume — o banco sobe com as três tabelas prontas. O `--wait` segura o
comando até o healthcheck passar; sem ele o compose devolve o terminal antes de
o init terminar, e o `db:seed` da linha seguinte encontra um banco pela metade.

Para voltar ao estado inicial a qualquer momento:

```bash
docker compose down -v && docker compose up -d --wait && npm run db:seed
```

O `-v` apaga o volume, e é justamente isso que faz o `init.sql` rodar de novo:
em volume que já existe, o entrypoint do Postgres ignora a pasta de init.

Outros comandos:

```bash
npm run test         # roda a coleção de requests (Bruno) contra o servidor no ar
npm run build        # compila TypeScript
npm run db:pull      # introspecta o banco e regenera schema.ts + relations.ts
npm run db:generate  # gera migration a partir do schema
npm run db:migrate   # aplica as migrations pendentes
npm run db:seed      # apaga tudo e recria a massa de teste (20 contatos, 4 grupos)
```

O seed é destrutivo e idempotente: rodar duas vezes produz o mesmo banco, com os
mesmos ids. Ele existe porque a coleção Bruno escreve — cada execução de
`npm run test` deixa um contato criado para trás —, e assertions que dependem de
contagem (`?name=juliana` devolve 4) só valem contra uma massa conhecida.
Rodar o seed antes dos testes devolve o banco ao ponto de partida.

### Variáveis de ambiente

Só uma: `DATABASE_URL` — lida de duas formas diferentes, e vale saber quais.

- **A API** recebe o `.env` via flag do próprio Node no script `dev`
  (`node --env-file=.env`). Sem dependência de `dotenv`.
- **O drizzle-kit** (`db:pull`, `db:generate`, `db:migrate`) carrega o `.env`
  sozinho, por conta própria.

A porta HTTP (`3000`) segue fixa no `server.ts`. Ela entra no `.env` junto com a
pasta `config/` (ver [Horizonte](#horizonte-o-que-ainda-não-existe--e-por-quê)).

Detalhe que custou tempo e está anotado no `.env.example`: **não coloque query
params na URL de conexão**. O driver postgres.js repassa cada um como parâmetro
de conexão do Postgres, então algo como `?schema=public` derruba a conexão com
`unrecognized configuration parameter`.

### A coleção de requests (`api-contatos/`)

Os testes de rota vivem numa coleção do [Bruno](https://usebruno.com), em
`api-contatos/`, no formato OpenCollection — YAML legível, versionado junto do
código, sem estado escondido em nuvem de terceiro. Cada request é um arquivo com
o método, o corpo, as assertions e um bloco `docs` explicando o que se espera e
por quê.

Antes da primeira execução, crie o environment a partir do template (o arquivo
real é ignorado pelo git, para nenhum segredo escapar por ele):

```bash
cp api-contatos/environments/local.example.yml api-contatos/environments/local.yml
npm run test              # roda a coleção inteira — precisa do servidor no ar
```

Três decisões que valem explicação:

- **Nenhum id fica chumbado.** A request `listar contatos` guarda o id do
  primeiro contato numa variável, e `buscar contato por id` consome ela. Id fixo
  só existe no banco de quem escreveu o teste — em qualquer outra máquina ele
  vira um `404` que parece bug.
- **Assertion de status não basta.** O filtro por nome confere que *todo* item
  devolvido contém o trecho buscado. Sem isso, um filtro quebrado que devolve a
  lista inteira passa como verde — foi exatamente o que aconteceu ao testar com
  `?name=ana`, que casa com Ana, Mariana e Juliana.
- **A escrita limpa o que sujou.** As requests de `POST`, `PUT` e `DELETE` formam
  um ciclo: criam um contato com e-mail gerado em runtime, editam esse contato e
  o removem no fim. Rodar a coleção duas vezes seguidas dá verde nas duas, sem
  acumular lixo no banco e sem esbarrar no `UNIQUE` do e-mail. E nenhuma escrita
  toca dado que ela mesma não criou.

As requests estão marcadas com tags (`leitura`, `escrita`, `caminho-triste`) para
rodar recortes com `bru run --tags`.

---

## Endpoints

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/ping` | healthcheck (`{ pong: true }`) |
| `GET` | `/contacts` | lista todos os contatos, ordenados por nome |
| `GET` | `/contacts?name=` | busca por nome (parcial) |
| `POST` | `/contacts` | cria um contato (id gerado pelo banco) |
| `GET` | `/contacts/:id` | busca um contato |
| `PUT` | `/contacts/:id` | atualiza um contato |
| `DELETE` | `/contacts/:id` | remove um contato |

Rotas com `:id` passam pelo middleware `validar-id` antes do controller.

### Status codes por caso

| Situação | Status |
|----------|--------|
| Contato criado | `201` |
| Leitura, atualização e remoção com sucesso | `200` |
| Payload incompleto, e-mail malformado ou id fora do formato UUID | `400` |
| UUID bem formado, contato inexistente | `404` |
| E-mail já cadastrado | `409` |

A regra que organiza a tabela: `400` é "você errou o pedido", `404` é "o pedido
está certo, o recurso não existe", `409` é "o pedido está certo e o recurso
existe demais". Quem consome a API decide o que fazer com base no status, então
ele é contrato — não decoração.

O ciclo inteiro está coberto pela coleção Bruno, caso feliz e casos tristes, e as
20 requests passam contra o banco.

### Dívidas conhecidas

Três divergências estão documentadas no `docs` das requests que as exercitam, com
a assertion escrita contra o comportamento **real** de hoje. Quando cada uma for
corrigida, o teste quebra — e a quebra é o lembrete de que o trabalho foi feito:

- **`POST /contacts` devolve `contact` como array**, enquanto os outros verbos
  devolvem objeto (`db.insert().returning()` sem o `[0]` que os demais services
  aplicam).
- **`PUT` faz atualização parcial**, que é a semântica de `PATCH`. Ou o verbo
  muda, ou o `PUT` passa a exigir o recurso completo.
- **Reenviar o próprio e-mail no `PUT` devolve `409`.** A checagem de unicidade
  não exclui o contato que está sendo editado, então ele conflita consigo mesmo —
  o que trava qualquer formulário de edição que reenvie o registro inteiro.

Some-se a isso o `500` genérico do error-handler para corpo JSON malformado, que
deveria ser `400`. Todas apontam para o mesmo conserto de fundo: a pasta
`errors/` do [Horizonte](#horizonte-o-que-ainda-não-existe--e-por-quê), que
traduz tipo de erro em status code num lugar só.

---

## Camada de dados: Drizzle com introspecção primeiro

A escolha central aqui foi **banco primeiro, código depois** (*database-first*):
as tabelas nasceram em SQL escrito à mão, e o TypeScript foi derivado delas com
`drizzle-kit introspect` (`npm run db:pull`), não o contrário.

O motivo é de estudo: escrever o DDL na mão obriga a pensar em constraint,
índice e `ON DELETE` — coisas que o schema declarativo do ORM esconde atrás de
uma API fluente. O trade-off é conhecido: a fonte da verdade é o banco, então
mudança de estrutura começa lá e volta pro código via `db:pull`.

Quatro arquivos, quatro papéis:

- **`db/init.sql`** — o DDL. É a fonte da verdade do schema e o único lugar onde
  ele existe fora do banco: o compose monta este arquivo na pasta de init do
  Postgres, então volume novo já nasce com as tabelas. Mudança de estrutura
  começa aqui e volta pro código via `db:pull`.
- **`db/schema.ts`** — as tabelas, geradas pela introspecção. Não editar à mão:
  o `db:pull` sobrescreve.
- **`db/relations.ts`** — as relações entre elas, também geradas. Ficam separadas
  do schema porque servem a outro propósito: só o `db.query.*` as usa, para
  resolver os joins do `with`.
- **`db/index.ts`** — a conexão. É onde `schema` e `relations` são fundidos no
  mesmo objeto passado ao `drizzle()`. Sem esse merge, `db.query.*` não encontra
  as relações — foi um bug real neste repo, e é a razão do comentário no arquivo.

O `client` é exportado junto com o `db` para permitir shutdown gracioso
(`await client.end()`) quando houver desligamento controlado.

### O tipo `Contact` sai do schema

`types/contact.ts` não redeclara os campos — deriva do schema:

```ts
export type Contact = typeof contacts.$inferInsert
```

Uma coluna nova na tabela aparece no tipo sozinha, e o TypeScript passa a
reclamar em todo lugar que precisa saber dela. Duplicar a definição garantiria o
contrário: dois lugares divergindo em silêncio.

### A migration vem comentada — e está certo

`src/db/drizzle/0000_workable_prowler.sql` tem todo o DDL dentro de um bloco de
comentário. Não é bug: quando a migration é gerada *a partir de uma introspecção*,
ela descreve tabelas que **já existem**. Rodar como está recriaria tudo e
quebraria. Ela serve como retrato inicial do schema — o ponto de partida para as
próximas migrations, essas sim geradas por diferença e aplicáveis.

A consequência prática só aparece na primeira máquina limpa: como o DDL está
comentado, `npm run db:migrate` não cria tabela nenhuma. Foi o que motivou o
`init.sql` — antes dele, o schema só existia *dentro* do volume do Postgres, e
volume não é backup. Um `docker compose down -v` levava o banco embora sem
deixar no repo nada capaz de recriá-lo.

### O schema é maior que a API

O banco tem três tabelas — `contacts`, `groups` e a tabela de junção
`contact_groups` (com unique composta e `ON DELETE CASCADE` nas duas pontas). A
API só expõe `contacts` hoje.

Foi de propósito: modelar o muitos-para-muitos era o exercício de banco, e vale
por si. Expor grupos via HTTP é outro exercício, e entra depois — sem inventar
endpoint antes de existir uso.

---

## Arquitetura: os dois eixos

A ideia central da estrutura de pastas é que ela vive em **dois eixos
diferentes**, não num só. Tratar tudo como uma pilha hierárquica única é a fonte
mais comum de confusão — daí a distinção explícita.

### Eixo vertical — o fluxo da requisição

```
server.ts  →  routes/  →  controllers/  →  services/  →  db/
```

Aqui **há hierarquia**: o request desce por essas camadas, na ordem. Uma chama a
próxima. É a "esteira". Neste eixo, "uma camada chama outra" significa ordem e
dependência de verdade.

A entrada de `services/` e `db/` no fim dessa fila é a mudança desta fase: antes
o controller terminava nele mesmo, mexendo num array em memória.

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

### Por que `services/` e ainda não `repositories/`

`services/` era item do Horizonte e virou realidade nesta fase, com uma divisão
simples de defender:

- **controller** — traduz HTTP: lê `req`, decide status code, monta `res`. Não
  sabe que existe Drizzle.
- **service** — fala com o banco e devolve dado ou `null`. Não sabe que existe
  HTTP: nenhum `req`/`res`/status code entra ali.

Repare em `getContactById`: ele devolve `null` quando não acha, e é o controller
que transforma isso em `404`. Essa fronteira é o ponto todo — o dia em que a
mesma consulta for chamada por um job ou por um CLI, ela não arrasta Express
consigo.

`repositories/` continua fora porque a dor que justifica não apareceu: hoje o
service tem um consumidor só e a query do Drizzle é legível dentro dele. Uma
camada a mais agora seria repasse de chamada. O gatilho está no
[Horizonte](#horizonte-o-que-ainda-não-existe--e-por-quê).

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

Com banco na jogada ele ganha um trabalho novo, ainda não feito: erro de Postgres
hoje cairia aqui como `500` genérico, e violação de constraint deveria virar
`409`. Está no Horizonte, junto com `errors/`.

---

## Estrutura de pastas

```
src/
├── controllers/   # servem UMA rota; traduzem req → res (eixo vertical)
├── services/      # acesso a dados e regra de negócio; sem req/res (eixo vertical)
├── db/            # conexão, schema e relations gerados pelo drizzle-kit
│   └── drizzle/   # migrations + snapshots (artefatos da ferramenta)
├── middlewares/   # transversais: logger, validar-id, error-handler (eixo horizontal)
├── routes/        # router.ts: mapa de endpoints (verbo + caminho → controller)
├── types/         # definições de tipo, derivadas do schema (eixo horizontal)
├── utils/         # funções puras: validate-email, validate-uuid
└── server.ts      # infra: parse, log global, error-handler, listen na porta

api-contatos/      # coleção Bruno: um arquivo YAML por request, com assertions
└── environments/  # local.example.yml versionado; o local.yml real é ignorado
```

Não há mais utilitário de dado falso: ele saiu junto com a última rota que
passou a escrever no banco.

---

## Convenções

- **Respostas sempre em JSON**, formato `{ error: ... }` pros erros — inclusive
  os que o Express pega sozinho (via error-handler central).
- **Status codes têm semântica:** `4xx` = culpa do cliente (mandou errado ou
  pediu algo inexistente), `5xx` = culpa do servidor (algo quebrou). Ex.: `400`
  id malformado, `404` id válido mas inexistente, `500` erro não previsto.
- **Service não conhece HTTP:** devolve dado ou `null`; quem escolhe status code
  é o controller.
- **Schema não se edita à mão:** mudança de estrutura começa no banco e volta pro
  código via `npm run db:pull`.
- **Colocação de middleware = escopo:** monta no nível cuja largura bate com a
  necessidade.
  - *app-level* (`app.use` no server) → toda requisição. Ex.: `logger`, `error-handler`.
  - *route-level* (`router.get('/x', mw, ctrl)`) → só aquela rota. Ex.: `validar-id`.
  - *router-level* (`router.use`) → todas as rotas de um router (ainda não usado).

---

## Horizonte: o que ainda NÃO existe — e por quê

Nem toda pasta ausente é esquecimento. As de baixo aparecem em arquiteturas mais
completas e não estão aqui porque a **dor que as justifica ainda não apareceu**.
Documentar o gatilho evita tanto abstração prematura quanto esquecer o motivo
depois.

**O próximo passo concreto** é quitar as [dívidas conhecidas](#dívidas-conhecidas),
e a que puxa as outras é a pasta `errors/`:

- a checagem de e-mail duplicado hoje mora no controller, que consulta antes de
  escrever. Entre a leitura e a escrita cabe outra requisição, e aí quem barra é
  a constraint `contacts_email_key` — mas a violação chega ao handler como `500`
  genérico. Deixar o banco decidir exige traduzir o erro do Postgres em `409`.
- essa mesma checagem não exclui o contato que está sendo editado, então um `PUT`
  que reenvia o próprio e-mail conflita consigo mesmo.
- `PUT` continua fazendo atualização parcial sob o verbo de substituição —
  divergência conhecida, a resolver de propósito e não por acidente.

| Pasta | Nasce quando |
|-------|--------------|
| `repositories/` | a mesma consulta tiver mais de um consumidor, ou as queries crescerem ao ponto de a regra de negócio ficar ilegível no meio delas |
| `errors/` | quiser status por tipo de erro em vez de `500` genérico — classes tipo `NotFoundError` e `ConflictError` com status embutido, e o handler lendo `err.status`. Vira urgente com o `409` do e-mail duplicado |
| `config/` | a config espalhar: hoje é só `DATABASE_URL` no `.env` mais a porta fixa no `server.ts` — duas fontes já é uma a mais do que o ideal |
| split `app.ts`/`server.ts` | quiser testar rotas sem abrir porta de rede — importar `app` puro, sem `listen`. É o pré-requisito pros testes de integração com Vitest, que cobrem o que a coleção Bruno não alcança: rodar sem servidor de pé e sem depender do estado do banco |
| rotas de `groups` | houver uso real pra associação contato↔grupo; o modelo de dados já está pronto e esperando |

---

## Contribuindo

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para o passo a passo de adicionar um
recurso novo dentro da arquitetura atual, com o raciocínio por trás de cada
etapa.

---

## Licença

[MIT](LICENSE) — use, copie e adapte livremente.
</content>
