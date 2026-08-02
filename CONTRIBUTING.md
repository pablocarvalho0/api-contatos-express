# Como adicionar um recurso novo

A regra geral é simples: **espelhe o padrão do `contact`**. Todo recurso novo
segue o mesmo caminho pelos dois eixos descritos no [README](README.md#arquitetura-os-dois-eixos).

Abaixo, o passo a passo com o *porquê* de cada etapa — a ideia é permitir
re-derivar a lógica, não copiar mecanicamente. Exemplo trabalhado ao longo do
guia: adicionar um recurso **`empresa`**.

---

## Antes de começar: qual é o caminho de um recurso?

Um recurso REST precisa de quatro peças, uma em cada lugar:

```
tipo (types/)  →  validação (utils/)  →  controller (controllers/)  →  rota (routes/)
```

E, quando a rota recebe `:id`, uma peça transversal: o middleware `validar-id`,
plugado na rota (não no recurso — é decisão de escopo, ver passo 4).

---

## Passo 1 — Definir o tipo em `types/empresa.ts`

Antes de qualquer lógica, defina o formato do dado. É o contrato: o que uma
empresa *é*.

```typescript
export type Empresa = {
  id: string
  name: string
  cnpj: string
  phone?: string   // '?' = opcional; pode não existir no dado (igual ao phone do contact)
}
```

**Por quê primeiro:** todas as outras camadas vão importar este tipo. Ele é o
vocabulário compartilhado. O `?` não é detalhe — ele decide se o campo pode
faltar no JSON que trafega, e portanto se o consumidor precisa lidar com a
ausência.

---

## Passo 2 — Validação em `utils/` (se precisar)

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

---

## Passo 3 — Controller em `controllers/empresa.ts`

O controller **serve as rotas de empresa** (eixo vertical). O trabalho dele é
traduzir HTTP: ler `req` (params, body), decidir, montar a resposta em `res`.
Espelha `controllers/contact.ts`.

```typescript
import { Request, Response } from 'express'

export const getAll = (req: Request, res: Response) => {
  // busca todas, responde
  res.status(200).json({ empresas: /* ... */ [] })
}

export const getOne = (req: Request, res: Response) => {
  const { id } = req.params        // o :id capturado da URL
  // busca por id; se não achar → 404
}

export const createEmpresa = (req: Request, res: Response) => {
  const { name, cnpj } = req.body  // req.body só existe porque express.json() rodou antes
  // valida presença → 400 se faltar
  // valida cnpj com isValidCnpj → 400 se inválido
  // cria (servidor gera o id), responde 201
}
```

**Nota de escopo — quando a lógica engordar:** hoje a regra de negócio pode
morar aqui dentro. Quando ela ficar gorda (ou existir um `repository`), ela sai
pra um `service` e o controller vira só tradução req→res. Isso é o gatilho da
pasta `services/` (ver [Horizonte](README.md#horizonte-o-que-ainda-não-existe--e-por-quê)).
Não antecipe.

---

## Passo 4 — Registrar as rotas em `routes/router.ts`

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

---

## Passo 5 — Testar (adicionar ao smoke test)

Cristalize os casos no `src/tests/test-rotas.sh` — caminho feliz **e** tristes.
Sempre teste os erros, não só o sucesso; é onde os bugs moram.

```bash
echo "=== GET todas as empresas ==="
curl -s "$BASE/empresas" | jq

echo "=== POST empresa (feliz) ==="
curl -s -w "\n→ HTTP %{http_code}\n" -X POST "$BASE/empresas" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","cnpj":"12345678000190"}'

echo "=== GET id inválido (deve dar 400) ==="
curl -s -w "\n→ HTTP %{http_code}\n" "$BASE/empresas/abc"

echo "=== GET id válido inexistente (deve dar 404) ==="
curl -s -w "\n→ HTTP %{http_code}\n" "$BASE/empresas/00000000-0000-4000-8000-000000000000"
```

Preveja o resultado **antes** de rodar. Se o resultado surpreender, tem
aprendizado ali.

---

## Passo 6 — Commit

Commit pequeno, mensagem com o *porquê* — não "wip":

```bash
git add .
git commit -m "add recurso empresa: type, validação de cnpj, controller e rotas com validar-id"
```

Se a mensagem não sai com honestidade, provavelmente a decisão ainda não está
fechada.

---

## Checklist rápido

- [ ] Tipo em `types/` — contrato do dado, campos opcionais com `?`
- [ ] Validação pura em `utils/` (se houver regra de formato)
- [ ] Controller em `controllers/` — traduz req→res, um por recurso
- [ ] Rotas em `routes/router.ts` — verbo + caminho → controller
- [ ] `validar-id` plugado **só** nas rotas com `:id`, **antes** do controller
- [ ] Casos felizes E tristes no `test-rotas.sh`, com status code
- [ ] Status codes semânticos: 400 (cliente errou), 404 (não existe), 201 (criado)
- [ ] Commit pequeno, mensagem com o porquê

---

## O que este guia deliberadamente NÃO cobre

Se o recurso novo precisar de **banco de verdade**, o passo de acesso a dados
não é fake-backend — é `repositories/` (Drizzle). E regra de negócio pesada vai
pra `services/`. Ambos estão no
[Horizonte](README.md#horizonte-o-que-ainda-não-existe--e-por-quê). Quando
chegarem, este guia ganha um passo entre o 2 e o 3 (repository) e outro entre o
3 e o 4 (service). Por ora, o fake-backend em memória basta.
