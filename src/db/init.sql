-- Schema do banco. Esta é a fonte da verdade: o TypeScript de `schema.ts` e
-- `relations.ts` é derivado daqui por introspecção (`npm run db:pull`), não o
-- contrário.
--
-- O arquivo é montado em /docker-entrypoint-initdb.d/ pelo docker-compose.yml.
-- A imagem do Postgres executa tudo que está nessa pasta **na primeira vez que
-- o volume de dados é criado** — ou seja, `docker compose up -d` numa máquina
-- limpa já sobe com as tabelas prontas. Em volume que já existe, o entrypoint
-- ignora a pasta inteira: para reaplicar, é preciso `docker compose down -v`,
-- que apaga os dados.
--
-- Os nomes de constraint e índice abaixo são explícitos de propósito. Eles
-- aparecem em `schema.ts` (`contacts_email_key`, `contact_groups_unique`, ...);
-- deixar o Postgres nomear sozinho faria o nome mudar conforme a ordem de
-- criação, e a introspecção passaria a gerar diff onde não houve mudança.

CREATE TABLE contacts (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name    text NOT NULL,
    email   varchar(200) NOT NULL,
    phone   varchar(20),
    active  boolean DEFAULT true,
    obs     text DEFAULT 'no obs',

    -- Unicidade de e-mail é regra do banco, não do código. Checar antes de
    -- inserir abre corrida entre a leitura e a escrita: dois pedidos simultâneos
    -- passam pela checagem e um estoura aqui. A API checa antes para responder
    -- 409 com mensagem clara, mas quem garante é esta constraint.
    CONSTRAINT contacts_email_key UNIQUE (email)
);

CREATE TABLE groups (
    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name  text NOT NULL,

    CONSTRAINT groups_name_key UNIQUE (name)
);

-- Junção muitos-para-muitos: um contato está em vários grupos, um grupo tem
-- vários contatos. A API não expõe nada disso ainda — a tabela existe porque
-- modelar o muitos-para-muitos era o exercício de banco.
CREATE TABLE contact_groups (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id  uuid NOT NULL,
    group_id    uuid NOT NULL,

    -- CASCADE nas duas pontas: apagar um contato ou um grupo leva embora os
    -- vínculos, nunca a outra ponta. Sem isso, DELETE /contacts/:id falharia
    -- por violação de FK em todo contato que estivesse em algum grupo.
    CONSTRAINT contact_groups_contact_id_fkey
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
    CONSTRAINT contact_groups_group_id_fkey
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,

    -- Impede o mesmo contato entrar duas vezes no mesmo grupo.
    CONSTRAINT contact_groups_unique UNIQUE (contact_id, group_id)
);

-- A unique composta acima já indexa (contact_id, group_id), o que serve para
-- "quais grupos deste contato". O caminho inverso — "quais contatos deste
-- grupo" — não aproveita esse índice, porque group_id é a segunda coluna.
CREATE INDEX idx_contact_groups_group_id ON contact_groups USING btree (group_id);
