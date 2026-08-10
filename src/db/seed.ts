/**
 * Popula o banco local com uma massa de dados pensada para os testes da
 * coleção Bruno (`api-contatos/`) e para exploração manual.
 *
 * Rodar:  npm run db:seed
 *
 * O seed é destrutivo e idempotente: apaga tudo das três tabelas e insere de
 * novo, sempre com os mesmos ids. Rodar duas vezes seguidas produz exatamente
 * o mesmo banco — sem isso, um teste que passou ontem pode falhar hoje só
 * porque sobrou lixo de uma execução anterior.
 */

import { db, client } from './index'
import { contacts, groups, contactGroups } from './schema'

// ─────────────────────────────────────────────────────────────────────────────
// Ids fixos
//
// Poderia deixar o `defaultRandom()` do banco gerar, mas id estável permite
// abrir a URL de um contato específico sem antes listar. O padrão `4` no
// terceiro bloco e `8` no quarto mantém os uuids bem formados, então eles
// passam pelo `validar-id` como qualquer id real.
//
// Nenhum deles é `00000000-0000-4000-8000-000000000000`: esse é o id que a
// coleção usa como "garantidamente inexistente" nos testes de 404.
// ─────────────────────────────────────────────────────────────────────────────
const id = (n: number) => `c0ffee00-0000-4000-8000-${String(n).padStart(12, '0')}`
const gid = (n: number) => `a0a0a0a0-0000-4000-8000-${String(n).padStart(12, '0')}`

const GRUPO_FAMILIA = gid(1)
const GRUPO_TRABALHO = gid(2)
const GRUPO_FACULDADE = gid(3)
const GRUPO_ARQUIVADOS = gid(4)

// ─────────────────────────────────────────────────────────────────────────────
// Contatos
//
// E-mails sempre em minúsculas, de propósito: `getContactByEmail` faz
// `email.toLowerCase()` na entrada, mas o insert grava o que veio. Se a massa
// tivesse maiúsculas, a checagem de duplicidade passaria batido e o 409 do
// POST viraria erro de constraint (500).
//
// Dois e-mails ficam deliberadamente **livres** na massa, porque a coleção os
// usa para criar contato: `fulano@teste.com` e `valido@teste.com`. Se o seed
// os ocupasse, o caminho feliz do POST responderia 409 já na primeira execução.
// ─────────────────────────────────────────────────────────────────────────────
const contatos: (typeof contacts.$inferInsert)[] = [
    {
        id: id(1),
        name: 'Ana Beatriz Nogueira',
        email: 'ana.nogueira@exemplo.com',
        phone: '(11) 98877-1122',
        // primeiro nome em ordem alfabética: é este que a requisição
        // `listar contatos` captura em `contactId`, então ele precisa ser um
        // contato completo e que ninguém apague por acidente.
    },
    {
        id: id(2),
        name: 'Ana Juliana Prado',
        email: 'ana.juliana@exemplo.com',
        phone: null,
        // "juliana" aparece no meio do nome — prova que o filtro usa
        // `ilike %termo%` e não "começa com".
    },
    {
        id: id(3),
        name: "Ana-Clara D'Ávila",
        email: 'ana.clara@exemplo.com',
        phone: '(21) 3232-7788',
        obs: 'Hífen, apóstrofo e acento no mesmo nome: útil para conferir encoding da resposta e da query string.',
    },
    {
        id: id(4),
        name: 'Bruno Salgado',
        email: 'bruno.salgado@exemplo.com',
        phone: '+55 11 3030-4040',
        // telefone em formato internacional; a API não normaliza nada hoje,
        // e a coluna é varchar(20) — 16 caracteres cabem.
    },
    {
        id: id(5),
        name: 'Carlos Eduardo Matos',
        email: 'carlos.matos+contatos@exemplo.com',
        phone: '(31) 99123-4567',
        // `+` no e-mail é válido pelo RFC e passa no EMAIL_REGEX do projeto.
    },
    {
        id: id(6),
        name: 'Danielle Rocha',
        email: 'danielle.rocha@exemplo.com',
        phone: '(41) 98080-1010',
        active: false,
        // único contato inativo. Nenhuma rota filtra por `active` hoje: ele
        // existe para que, quando esse filtro chegar, já haja dado que prove
        // que ele funciona — e para lembrar que hoje a listagem devolve todos.
    },
    {
        id: id(7),
        name: 'Éder Vasconcelos',
        email: 'eder.vasconcelos@exemplo.com',
        phone: null,
        obs: 'Nome com acento na primeira letra: expõe a collation do banco na ordenação por nome.',
    },
    {
        id: id(8),
        name: 'Fernanda Lopes',
        email: 'fernanda.lopes@exemplo.com',
        phone: '(11) 3555-0000',
        obs: 'Observação propositalmente longa, para checar que nada trunca o campo no caminho de volta: a coluna é `text`, sem limite declarado, diferente de `email` (varchar 200) e `phone` (varchar 20).',
    },
    {
        id: id(9),
        name: 'Gustavo',
        email: 'gustavo@exemplo.com',
        phone: '(85) 91234-5678',
        // nome de palavra única: quebra qualquer suposição de "nome + sobrenome".
    },
    {
        id: id(10),
        name: 'Heloísa Prado Werneck de Albuquerque Cavalcanti',
        email: 'heloisa.cavalcanti@exemplo.com',
        phone: '(51) 3232-1414',
        // nome longo, com preposição no meio.
    },
    {
        id: id(11),
        name: 'Ícaro Menezes',
        email: 'icaro.menezes@exemplo.com',
        phone: null,
    },
    {
        id: id(12),
        name: 'Juliana Alves de Souza',
        email: 'juliana.alves@exemplo.com',
        phone: '(11) 97777-3333',
    },
    {
        id: id(13),
        name: 'JULIANA CARDOSO',
        email: 'juliana.cardoso@exemplo.com',
        phone: '(11) 96666-2222',
        // caixa alta: sem `ilike`, some do filtro `?name=juliana`.
    },
    {
        id: id(14),
        name: 'juliana martins',
        email: 'juliana.martins@exemplo.com',
        phone: null,
        // caixa baixa: some do filtro `?name=JULIANA` pelo mesmo motivo.
    },
    {
        id: id(15),
        name: 'Juliána Restrepo',
        email: 'juliana.restrepo@exemplo.com',
        phone: '+57 300 111 2222',
        obs: 'Acento no "á": NÃO casa com ?name=juliana. `ilike` ignora caixa, mas não normaliza acento — isso exigiria unaccent/collation. Está aqui para documentar o limite, não como bug.',
    },
    {
        id: id(16),
        name: 'Marcos Antônio Ribeiro',
        email: 'marcos.ribeiro@exemplo.com',
        phone: null,
    },
    {
        id: id(17),
        name: 'Renata Yamamoto',
        email: 'renata.yamamoto@exemplo.com',
        phone: '(11) 94444-8888',
    },
    {
        id: id(18),
        name: 'Sofia Duarte',
        email: 'sofia.duarte@exemplo.com',
        phone: '(11) 3777-9090',
        obs: 'Contato sem nenhum grupo — serve para conferir que a ausência de vínculo não some da listagem.',
    },
    {
        id: id(19),
        name: 'Thiago Nakamura',
        email: 'thiago.nakamura@exemplo.com',
        phone: '(11) 95555-6060',
    },
    {
        id: id(20),
        name: 'Zuleica Andrade',
        email: 'zuleica.andrade@exemplo.com',
        phone: '(92) 98123-4567',
        // último em ordem alfabética: âncora fácil para conferir o `orderBy asc`.
        // Nenhum nome da massa contém "zzzzz", que é o termo do teste de
        // "filtro sem resultado" — se algum contivesse, aquele teste falharia.
    },
]

const grupos: (typeof groups.$inferInsert)[] = [
    { id: GRUPO_FAMILIA, name: 'Família' },
    { id: GRUPO_TRABALHO, name: 'Trabalho' },
    { id: GRUPO_FACULDADE, name: 'Faculdade' },
    { id: GRUPO_ARQUIVADOS, name: 'Arquivados' }, // grupo sem nenhum contato
]

// Vínculos: nenhuma rota lê `contact_groups` hoje — o CRUD implementado é só o
// de contatos. Eles existem por dois motivos: dar dado real para a hora em que
// a rota de grupos chegar, e deixar o `ON DELETE CASCADE` observável — apagar o
// contato 1 pelo DELETE /contacts/:id tem que levar embora as duas linhas dele
// aqui, sem tocar nos grupos.
const vinculos: (typeof contactGroups.$inferInsert)[] = [
    { contactId: id(1), groupId: GRUPO_FAMILIA },
    { contactId: id(1), groupId: GRUPO_TRABALHO }, // contato em dois grupos
    { contactId: id(2), groupId: GRUPO_FACULDADE },
    { contactId: id(4), groupId: GRUPO_TRABALHO },
    { contactId: id(5), groupId: GRUPO_TRABALHO },
    { contactId: id(6), groupId: GRUPO_FAMILIA },
    { contactId: id(12), groupId: GRUPO_FACULDADE },
    { contactId: id(13), groupId: GRUPO_TRABALHO },
    { contactId: id(14), groupId: GRUPO_FACULDADE },
    { contactId: id(20), groupId: GRUPO_FAMILIA },
    // 18 (Sofia) fica de fora de propósito, e "Arquivados" fica vazio.
]

async function seed() {
    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL não definida — rode com `npm run db:seed`, que carrega o .env')
    }

    // O seed apaga tudo antes de inserir. Contra banco local isso é o
    // comportamento desejado; contra qualquer outro host é acidente. Exigir
    // `--force` custa uma linha e evita o erro que não tem desfazer.
    const ehLocal = /@(localhost|127\.0\.0\.1|postgres-db)[:/]/.test(url)
    if (!ehLocal && !process.argv.includes('--force')) {
        throw new Error(
            'DATABASE_URL não aponta para um banco local e este seed apaga todos os dados. ' +
            'Se é isso mesmo que você quer, rode de novo com --force.'
        )
    }

    // Ordem importa mesmo com o CASCADE: apagar os vínculos primeiro deixa
    // explícito o que está sendo removido, em vez de depender de efeito colateral.
    await db.delete(contactGroups)
    await db.delete(contacts)
    await db.delete(groups)

    // Uma transação: ou a massa inteira entra, ou nada entra. Um seed que falha
    // no meio deixa um banco meio populado, que é pior do que banco vazio —
    // parece pronto e não está.
    await db.transaction(async (tx) => {
        await tx.insert(groups).values(grupos)
        await tx.insert(contacts).values(contatos)
        await tx.insert(contactGroups).values(vinculos)
    })

    console.log(`Seed concluído: ${contatos.length} contatos, ${grupos.length} grupos, ${vinculos.length} vínculos.`)
    console.log(`Primeiro em ordem alfabética (o que a coleção captura em contactId): ${contatos[0]!.name} — ${contatos[0]!.id}`)
    console.log('Filtro ?name=juliana deve devolver 4 contatos; ?name=zzzzz, nenhum.')
}

seed()
    .catch((err) => {
        // 42P01 = undefined_table. Acontece quando o volume do Postgres é
        // recriado (`docker compose down -v`): o container sobe, a conexão
        // funciona, e o banco está sem nenhuma tabela. O stack trace do Drizzle
        // não deixa isso óbvio, então vale traduzir.
        if (err?.cause?.code === '42P01') {
            console.error(
                'As tabelas não existem neste banco. O schema é criado pelo src/db/init.sql, que a\n' +
                'imagem do Postgres só executa quando o volume é criado — em volume já existente ele\n' +
                'é ignorado. Para recriar do zero (apaga os dados):\n\n' +
                '  docker compose down -v && docker compose up -d --wait && npm run db:seed\n'
            )
            process.exitCode = 1
            return
        }
        console.error('Seed falhou:', err)
        process.exitCode = 1
    })
    // Sem fechar a conexão o processo fica pendurado: o pool do postgres.js
    // mantém sockets abertos e o Node não tem motivo para sair.
    .finally(() => client.end())
