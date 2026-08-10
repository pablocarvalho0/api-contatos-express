# Como adicionar um recurso novo

A regra geral é simples: **espelhe o padrão do `contact`**. Todo recurso novo
segue o mesmo caminho pelos dois eixos descritos no [README](README.md#arquitetura-os-dois-eixos).

Abaixo, o passo a passo com o *porquê* de cada etapa — a ideia é permitir
re-derivar a lógica, não copiar mecanicamente. Exemplo trabalhado ao longo do
guia: adicionar um recurso **`empresa`**.

> Este guia acompanha o estado atual do projeto: dados em Postgres, via Drizzle,
> com camada de `services/`. Se você abrir um controller de `contact` e encontrar
> array em memória comentado, é resquício da migração — o padrão a seguir é o
> descrito aqui.

---

## Antes de começar: qual é o caminho de um recurso?

Um recurso REST precisa de peças em lugares diferentes, e agora a fila começa
**no banco**, não no código:

```
tabela (SQL)  →  db:pull  →  tipo (types/)  →  validação (utils/)
              →  service (services/)  →  controller (controllers/)  →  rota (routes/)
```

E, quando a rota recebe `:id`, uma peça transversal: o middleware `validar-id`,
plugado na rota (não no recurso — é decisão de escopo, ver passo 6).

---

## Passo 1 — Criar a tabela no banco

O projeto é **database-first**: a estrutura nasce em SQL, escrito à mão, e o
TypeScript é derivado dela depois. Então o primeiro movimento é escrever o DDL.

Ele vai em **`src/db/init.sql`**, e não só no `psql`. Esse arquivo é a única
cópia do schema fora do volume do Postgres — é o que a imagem executa quando o
volume é criado, e o que faz uma máquina limpa subir com o banco pronto. Tabela
que existe só no seu banco local desaparece no primeiro `docker compose down -v`
e quebra o setup de quem clonar o repo.

Como o init só roda em volume novo, aplique a mudança nas duas pontas: escreva
no `init.sql` e rode o mesmo SQL no banco que já está de pé (ou recrie tudo com
`docker compose down -v && docker compose up -d --wait && npm run db:seed`).

```sql
CREATE TABLE empresas (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj varchar(14) NOT NULL UNIQUE,
  phone varchar(20)
);
```

**Por quê no banco primeiro:** é onde as garantias moram de verdade. `NOT NULL`,
`UNIQUE` e `ON DELETE` são cumpridos pelo Postgres mesmo que o código erre, e
valem para qualquer cliente — inclusive um `psql` aberto na mão. Declarar isso em
SQL também obriga a pensar nas constraints em vez de aceitar o default de uma API
fluente.

Pense agora, não depois: o que é único? o que é obrigatório? o que acontece com
as linhas filhas quando o pai é apagado?

---

## Passo 2 — Regenerar o schema com `db:pull`

```bash
npm run db:pull
```

O `drizzle-kit introspect` lê o banco e reescreve `src/db/schema.ts` e
`src/db/relations.ts`.

**Nunca edite esses dois arquivos à mão** — o próximo `db:pull` sobrescreve. Se
alguma coluna saiu diferente do esperado, corrija no banco e rode de novo.

Se a tabela tem relação com outra (uma FK, ou uma tabela de junção como
`contact_groups`), confira se ela apareceu em `relations.ts`. É de lá que o
`db.query.*` tira os joins do `with`.

---

## Passo 3 — Derivar o tipo em `types/empresa.ts`

O tipo não se escreve à mão: sai do schema.

```typescript
import { empresas } from "../db/schema"

export type Empresa = typeof empresas.$inferInsert
```

**Por quê derivar em vez de declarar:** o tipo escrito à mão diverge do banco em
silêncio. Derivado, uma coluna nova aparece sozinha e o TypeScript passa a
reclamar em todo lugar que precisa saber dela. É uma fonte da verdade, não duas.

`$inferInsert` marca como opcional o que o banco preenche (`id`, colunas com
default) — que é justamente a forma de um payload de criação. Para o formato
**lido** do banco, com todas as colunas presentes, existe o `$inferSelect`.

---

## Passo 4 — Validação em `utils/` (se precisar)

Se o recurso tem regra de validação de formato reutilizável, ela vira uma função
**pura** em `utils/` — sem `req`/`res`, só entrada → booleano. Espelha
`validate-email.ts` / `validate-uuid.ts`.

```typescript
// utils/validate-cnpj.ts
export function isValidCnpj(cnpj: string): boolean {
  // ... regra de validação
}
```

**Por quê em utils e não no controller:** é lógica pura, transversal, testável
isolada, reutilizável. Eixo horizontal. Se amanhã outra parte precisar validar
CNPJ, pega a mesma função.

**O que NÃO validar aqui:** unicidade. "Esse CNPJ já existe?" é pergunta pro
banco, respondida pela constraint `UNIQUE` — e não por uma consulta seguida de um
insert, que tem corrida entre as duas. A constraint garante; o código só traduz a
violação em `409`.

---

## Passo 5 — Service em `services/empresas.ts`

O service é quem fala com o banco. Uma função por operação, nomeada pela
intenção. Espelha `services/contacts.ts`.

```typescript
import { asc, eq } from "drizzle-orm"
import { db } from "../db"
import { empresas } from "../db/schema"

export async function getAllEmpresas() {
  return await db.select().from(empresas).orderBy(asc(empresas.name))
}

export async function getEmpresaById(id: string) {
  const empresa = await db.select().from(empresas).where(eq(empresas.id, id))
  if (empresa.length > 0) return empresa[0]
  return null    // "não achei" — sem status code, sem res
}
```

**A regra que define a camada: o service não conhece HTTP.** Nenhum `req`, nenhum
`res`, nenhum número de status. Ele devolve dado ou `null`, e quem traduz isso em
resposta é o controller.

Não é purismo. É o que permite chamar `getEmpresaById` de um script, de um job
agendado ou de um teste sem arrastar o Express inteiro. No dia em que a chamada
vier de fora do HTTP, ela funciona sem adaptação.

Vale notar que `.where(eq(...))` sempre devolve array, mesmo buscando por chave
primária — daí o `length > 0` antes de devolver `[0]`.

---

## Passo 6 — Controller em `controllers/empresa.ts`

O controller **serve as rotas de empresa** (eixo vertical). O trabalho dele é
traduzir HTTP: ler `req` (params, body), chamar o service, decidir o status code,
montar a resposta em `res`. Espelha `controllers/contact.ts`.

```typescript
import { RequestHandler } from 'express'
import { isValidCnpj } from '../utils/validate-cnpj'
import { getAllEmpresas, getEmpresaById } from '../services/empresas'

export const getAll: RequestHandler = async (req, res) => {
  const empresas = await getAllEmpresas()
  res.status(200).json({ empresas })
}

export const getOne: RequestHandler = async (req, res) => {
  const { id } = req.params              // o :id capturado da URL

  const empresa = await getEmpresaById(id as string)
  if (!empresa) {                        // o null do service vira 404 AQUI
    res.status(404).json({ error: 'Empresa não encontrada' })
    return
  }

  res.status(200).json({ empresa })
}

export const createEmpresa: RequestHandler = async (req, res) => {
  const { name, cnpj } = req.body        // req.body só existe porque express.json() rodou antes
  // valida presença → 400 se faltar
  // valida cnpj com isValidCnpj → 400 se inválido
  // chama o service, responde 201 com o registro criado
}
```

**O controller virou `async`.** Duas consequências:

- Todo acesso a dado é `await`. Esquecer o `await` não dá erro de compilação
  óbvio — devolve uma Promise no JSON, que serializa como `{}`. Se a resposta
  vier vazia sem motivo, é o primeiro suspeito.
- Erro assíncrono não precisa de `try/catch` só para ser encaminhado: o Express 5
  captura Promise rejeitada em handler e manda pro error-handler central
  sozinho — comportamento novo, que no Express 4 exigia o `catch` explícito. Use
  `try/catch` quando quiser *tratar* o erro, não para repassá-lo.

**Nota de escopo:** regra de negócio leve pode morar no controller; acesso a dado,
não — isso é service desde o primeiro dia do recurso. Se as queries de um recurso
crescerem ao ponto de esconder a regra no meio delas, aí nasce `repositories/`
(ver [Horizonte](README.md#horizonte-o-que-ainda-não-existe--e-por-quê)). Não
antecipe.

---

## Passo 7 — Registrar as rotas em `routes/router.ts`

Aqui você pluga o controller na esteira, mapeando **verbo HTTP + caminho**. E é
aqui que a decisão de escopo do middleware acontece.

```typescript
import * as empresaController from '../controllers/empresa'
import { validarIdMiddleware } from '../middlewares/validar-id'

mainRoutes.get('/empresas', empresaController.getAll)
mainRoutes.post('/empresas', empresaController.createEmpresa)

// rotas com :id ganham o validar-id ANTES do controller
mainRoutes.get('/empresas/:id', validarIdMiddleware, empresaController.getOne)
mainRoutes.put('/empresas/:id', validarIdMiddleware, empresaController.updateEmpresa)
mainRoutes.delete('/empresas/:id', validarIdMiddleware, empresaController.deleteEmpresa)
```

**A decisão de escopo (importante):** por que `validarIdMiddleware` vai *na
rota* e não global no server? Porque ele só faz sentido onde existe `:id` pra
validar. `POST /empresas` e `GET /empresas` não têm id — não recebem o guarda.
Escopo route-level. É a mesma régua do README: monte o middleware no nível cuja
largura bate com a necessidade.

**A ordem importa:** `validarIdMiddleware` vem *antes* do controller. Se o id for
lixo, ele responde 400 e o controller nunca roda (barra na porta). Só id válido
chega até `getOne`, que aí pode devolver 404 se não existir.

**Filtro não é rota nova.** Buscar empresa por nome é `GET /empresas?name=acme` —
query string na rota de listagem, lida com `req.query.name`. Não crie
`/empresas/:name`: aquele caminho já pertence ao `:id`, e o `validar-id` vai
rejeitar o texto com `400` antes de qualquer coisa. Rota identifica recurso;
query string refina a busca.

---

## Passo 8 — Testar (adicionar requests à coleção)

Cristalize os casos na coleção Bruno, em `api-contatos/` — um arquivo YAML por
request, caminho feliz **e** tristes. Sempre teste os erros, não só o sucesso; é
onde os bugs moram.

```yaml
info:
  name: buscar empresa por id malformado
  type: http
  seq: 21
  tags:
    - leitura
    - caminho-triste

http:
  method: GET
  url: "{{baseUrl}}/empresas/abc"
  auth: inherit

runtime:
  assertions:
    - expression: res.status
      operator: eq
      value: "400"
    - expression: res.body.error
      operator: eq
      value: ID inválido

settings:
  encodeUrl: true
  timeout: 0
  followRedirects: true
  maxRedirects: 5

docs: |-
  # Por que 400 e não 404
  Explique aqui o que se espera e o motivo.
```

Rode com `npm run test`. Preveja o resultado **antes**; se surpreender, tem
aprendizado ali.

Cinco hábitos que valem mais que a quantidade de requests:

- **Assertion que prova, não que passa.** Status `200` não diz que o filtro
  filtrou. Para busca, um bloco `runtime.scripts` do tipo `tests` percorrendo a
  resposta e exigindo que todo item case com o critério vale mais do que dez
  assertions de status.
- **Nada de id chumbado.** Capture o id com `bru.setVar` num `after-response` da
  listagem e consuma com `{{variavel}}`. Id fixo funciona só no seu banco.
- **Escolha o dado de teste com má-fé.** Se todo registro do banco casa com o
  termo buscado, o teste passa mesmo com o filtro quebrado. Procure o termo que
  recorta.
- **A escrita cria o que vai usar e apaga no fim.** As requests de `POST`, `PUT`
  e `DELETE` de contato formam um ciclo: cria, edita o que criou, remove. Duas
  consequências, e as duas importam. A coleção fica **repetível** (rodar de novo
  dá verde de novo, sem lixo acumulado); e nenhuma escrita toca dado que ela não
  criou — rodar a suíte não pode editar nem apagar registro de verdade. Se o
  recurso tiver coluna `UNIQUE`, gere o valor em runtime num `before-request`
  (`bru.setVar` com `Date.now()`): valor chumbado passa na primeira rodada e
  devolve `409` na segunda.
- **Rota ainda não implementada entra com tag `pendente`.** Sem assertion (não há
  resposta para afirmar nada) e com `timeout` curto, para não pendurar a suíte. O
  `docs` dela vira a especificação do que falta.

Duas limitações conhecidas dessa abordagem: precisa do servidor de pé e depende
do estado do banco. Testar sem nenhuma das duas coisas pede o split
`app.ts`/`server.ts` e Vitest — está no Horizonte.

---

## Passo 9 — Commit

Commit pequeno, mensagem com o *porquê* — não "wip":

```bash
git add .
git commit -m "add recurso empresa: tabela, schema regenerado, service, controller e rotas"
```

Se a mensagem não sai com honestidade, provavelmente a decisão ainda não está
fechada.

Mudança de banco costuma render dois commits, não um: o que regenera schema e
relations (artefato de ferramenta) e o que escreve service, controller e rotas
(código à mão). Separar deixa o diff legível.

---

## Checklist rápido

- [ ] Tabela criada no banco, com as constraints pensadas (`NOT NULL`, `UNIQUE`, FK)
- [ ] DDL da tabela escrito em `src/db/init.sql` — senão o schema some no
      próximo `down -v` e a máquina limpa não sobe
- [ ] Massa de teste em `src/db/seed.ts` cobrindo os casos que a coleção afirma
- [ ] `npm run db:pull` rodado — schema e relations regenerados, **não editados à mão**
- [ ] Tipo em `types/` derivado do schema (`$inferInsert` / `$inferSelect`)
- [ ] Validação pura em `utils/` (se houver regra de formato) — unicidade fica no banco
- [ ] Service em `services/` — sem `req`/`res`/status code; devolve dado ou `null`
- [ ] Controller em `controllers/` — `async`, `await` em todo acesso a dado, traduz req→res
- [ ] Rotas em `routes/router.ts` — verbo + caminho → controller; filtro é query string
- [ ] `validar-id` plugado **só** nas rotas com `:id`, **antes** do controller
- [ ] Casos felizes E tristes na coleção `api-contatos/`, com assertion de status
      e, em busca/filtro, um `tests` que prove o recorte
- [ ] Status codes semânticos: 400 (cliente errou), 404 (não existe), 409 (conflito), 201 (criado)
- [ ] Commit pequeno, mensagem com o porquê

---

## O que este guia deliberadamente NÃO cobre

**Tradução de erro do Postgres.** Violação de constraint hoje chega ao
error-handler central e sai como `500` genérico — não como o `409` que ela
deveria ser. Consertar isso é o trabalho da pasta `errors/`, com classes que
carregam o próprio status e um handler que lê `err.status`.

**`repositories/`.** A separação entre "quem monta a query" e "quem aplica a
regra de negócio" só se paga quando a mesma consulta tem mais de um consumidor.
Enquanto o service resolve as duas coisas com clareza, uma camada extra seria
repasse de chamada.

**Migrations geradas a partir do schema.** Este guia assume o fluxo
database-first (`SQL → db:pull`). O caminho inverso — mudar `schema.ts` e gerar o
DDL com `db:generate` + `db:migrate` — existe nos scripts, mas mistura as duas
fontes da verdade se usado no meio do outro. Escolha um dos dois por mudança.

Os dois primeiros estão no
[Horizonte](README.md#horizonte-o-que-ainda-não-existe--e-por-quê), com o gatilho
de cada um.
