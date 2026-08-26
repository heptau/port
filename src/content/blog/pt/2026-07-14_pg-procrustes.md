---
title: "Por que a formatação de SQL ainda é o Velho Oeste — e como o pg_procrustes muda isso"
description: "Como o pg_procrustes resolve o antigo problema de formatação de código SQL para PostgreSQL usando um parser nativo e configuração detalhada — e por que ambiciona ser o gofmt do mundo dos bancos de dados."
locale: "pt"
categories: ["PostgreSQL"]
date: 2026-07-14
tags: ["PostgreSQL", "pg_procrustes", "SQL", "formatação", "DDL"]
draft: false
translation_id: "2026-07-14_1"
---

No desenvolvimento de software moderno, a formatação automática de código é algo natural. Go tem `gofmt` integrado diretamente em seu toolchain — ninguém discute sobre indentação ou posicionamento de chaves porque a máquina decidiu por todos. Rust tem `rustfmt`, Python tem `black` (inflexível, sem opções — e isso é bom), e o ecossistema JavaScript se unificou em torno do `prettier`.

E aí tem **SQL**.

Uma terra onde cada desenvolvedor, cada equipe, cada empresa define seu próprio «padrão». Alguns escrevem palavras-chave em maiúsculas, outros em minúsculas, outros de forma mista. Uns indentam com quatro espaços, outros com dois, outros com tabs. Uns escrevem `INNER JOIN` em uma linha, outros quebram cada cláusula separadamente.

Este artigo explica por que a formatação de SQL é um desafio único que resiste a soluções simples, e apresenta [pg_procrustes](https://pg_procrustes.80.cz) — uma nova ferramenta que adota uma abordagem radicalmente diferente: usa o mesmo parser que o próprio PostgreSQL.

---

## 1. SQL não é como outras linguagens

O motivo pelo qual SQL não tem um formatador universalmente aceito não é preguiça da comunidade. SQL é objetivamente mais difícil de formatar do que a maioria das linguagens de programação convencionais.

### SQL não é estruturado como linguagens imperativas

Em Go ou Rust, o código é uma sequência de instruções executadas de cima para baixo. As regras de formatação são relativamente simples: indentar um bloco, alinhar parâmetros, normalizar espaços em branco.

SQL é declarativo. Uma instrução `SELECT` consiste em cláusulas (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`), mas sua ordem não é sobre execução — é sobre a lógica da consulta. Um formatador precisa entender essas cláusulas para dispor de forma significativa.

```sql
-- Estes são semanticamente idênticos:
SELECT a FROM b WHERE c = 1 GROUP BY d ORDER BY e;

-- Mas isto é mais legível para humanos:
SELECT a
FROM b
WHERE c = 1
GROUP BY d
ORDER BY e;
```

Para que um formatador saiba que `SELECT`, `FROM` e `WHERE` são cláusulas do mesmo nível (e não blocos aninhados), ele precisa **realmente entender a gramática do SQL**.

### DDL é ainda mais complexo

Data Definition Language (DDL) — instruções como `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` — adiciona outra camada de complexidade.

`CREATE TABLE` não é uma lista homogênea. Contém:
- definições de colunas com tipos de dados,
- constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`),
- parâmetros de armazenamento (`WITH (fillfactor = 90)`),
- `TABLESPACE`,
- `COMMENT ON`,
- tudo isso pode aparecer em qualquer ordem (com poucas exceções impostas pelo parser do PostgreSQL).

```sql
CREATE TABLE public.orders (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Como formatar isso? Cada um tem uma opinião diferente. Alguns querem constraints indentadas abaixo das colunas, outros no mesmo nível. Alguns querem parâmetros de armazenamento em uma linha separada, outros preferem no final do cabeçalho.

Nenhum formatador baseado em expressões regulares consegue lidar com isso de forma confiável — você precisa de um **parser real** que entenda o que é uma coluna, o que é uma constraint e o que é um parâmetro de armazenamento.

---

## 2. Por que as ferramentas existentes não bastam

Ao olhar para o cenário atual de formatadores SQL, vários problemas recorrentes surgem.

### Formatadores baseados em regex

Ferramentas como `pg_format` (também conhecido como `sqlformat`) são escritas em Perl e funcionam principalmente no nível de expressões regulares. Elas lidam com instruções `SELECT` simples razoavelmente bem, mas quando encontram sintaxe mais complexa — blocos PL/pgSQL com condicionais aninhados, `CREATE POLICY`, tipos de dados compostos — começam a falhar.

Expressões regulares não têm estado. Elas não conseguem determinar corretamente onde uma expressão `CASE` termina e onde um novo `WHEN` começa, porque precisariam saber o contexto — quantos níveis de aninhamento estão processando atualmente.

### Formatadores universais com parser próprio

Uma ferramenta como `SQLFluff` é escrita em Python e tem seu próprio parser SQL. É extremamente flexível (centenas de regras configuráveis), mas seu parser não é o mesmo que o do PostgreSQL. Isso significa que podem surgir situações em que o SQLFluff interpreta a sintaxe de forma diferente do banco de dados.

Além disso, o SQLFluff é mais lento — analisar e reescrever um arquivo de migração grande pode levar de segundos a dezenas de segundos. Para uso interativo no editor, isso é perceptível.

### Formatadores que não entendem PostgreSQL

Nenhuma das ferramentas existentes usa **libpg_query** — a biblioteca que encapsula o verdadeiro parser C do PostgreSQL. Essa é uma diferença fundamental. Se um formatador não usa o mesmo parser que o banco de dados, sempre existirá uma classe de erros onde as interpretações divergem.

---

## 3. pg_procrustes: Um formatador com o parser do PostgreSQL internamente

[pg_procrustes](https://pg_procrustes.80.cz) é um novo formatador escrito em Go que adota uma abordagem radicalmente diferente:

**Ele usa `libpg_query` — o mesmo parser que o PostgreSQL.**

Isso significa que, se o PostgreSQL consegue ler sua instrução SQL e construir uma árvore sintática abstrata (AST) a partir dela, o pg_procrustes a entende exatamente da mesma forma. Não há espaço para diferenças de interpretação.

### O princípio de Procrusto

O nome da ferramenta não é acidental. Na mitologia grega, Procrusto oferecia aos viajantes uma noite de descanso — e então os esticava ou cortava para caberem em sua cama de ferro. pg_procrustes funciona da mesma forma: **você define a cama (regras de configuração) e seu SQL vai caber. Goste ele ou não.**

### Comportamento padrão: Nada

Uma diferença filosófica fundamental em relação a outros formatadores: pg_procrustes não muda nada por padrão. Todas as configurações têm o valor `preserve`. Se `.pg_procrustes.yaml` não existir, o formatador lê o arquivo e não faz nenhuma alteração.

```yaml
# Esta é uma configuração completa — nada mudará:
```

Esta abordagem é crucial para adoção em projetos existentes. Você pode implantar pg_procrustes agora mesmo sem que ele mude nada, e gradualmente ativar regras até o ponto em que sua equipe se sinta confortável.

---

## 4. O que pode ser configurado

A configuração é feita em um arquivo YAML `.pg_procrustes.yaml`. Vamos detalhar as opções disponíveis.

### Casing — cada classe de token separadamente

O parser do PostgreSQL distingue dezenas de classes de tokens. pg_procrustes permite definir o casing para cada uma delas independentemente:

```yaml
reserved_keywords: { case: upper }        # SELECT, FROM, WHERE
keywords:          { case: upper }        # ANALYZE, CASCADE
data_types:        { case: lower, form: short }  # integer -> int, timestamp with time zone -> timestamptz
literals:          { case: upper }        # TRUE, FALSE, NULL
operators:         { case: upper }        # AND, OR, NOT, IN
schemas:           { case: lower }
tables:            { case: lower }
columns:           { case: lower }
functions:         { case: lower }
conditional_functions: { case: upper }    # COALESCE, NULLIF
system_functions:      { case: upper }    # CURRENT_DATE, SESSION_USER
```

Além de categorias menos comuns, mas importantes:

```yaml
plpgsql_variables: { case: upper }        # NEW, OLD, TG_OP, FOUND
plpgsql_keywords:  { case: upper }        # RAISE, PERFORM, LOOP, EXIT
```

Cada categoria também aceita uma lista de exceções — palavras que mantêm seu casing específico independentemente da regra geral:

```yaml
columns:
  case: lower
  exceptions:
    - ID        # permanece "ID", não "id"
    - URL
    - CreatedAt
```

### Layout — fim dos debates sobre indentação

pg_procrustes suporta espaços e tabs com largura configurável e normalização. Mas mais importante, oferece quebra inteligente de cláusulas e conteúdo:

```yaml
layout:
  line_length: 120
  indent:
    size: 3
    type: spaces

  clauses:
    break: auto       # quebrar cláusulas quando o comprimento exceder line_length
    align: indent
    join:  { break: always }   # JOIN sempre em nova linha
    limit: { break: never }    # LIMIT permanece na mesma linha
```

O conteúdo dentro das cláusulas (listas de seleção, condições WHERE, VALUES) pode ser configurado separadamente:

```yaml
layout:
  content:
    break: auto
    first_item: break    # break = primeiro item em nova linha
    select_list:  { break: always, first_item: inline }
    where_conds:  { break: always, first_item: inline }
    join_on:      { break: always }
    values_list:  { break: always }
```

Você pode alcançar estilos como este:

```sql
SELECT column1,
       column2,
       column3
FROM schema.table
WHERE condition1 = TRUE
  AND condition2 = FALSE
INNER JOIN other ON other.id = schema.table.ref_id
```

Ou este (dependendo da configuração de `first_item`):

```sql
SELECT
    column1,
    column2,
    column3
FROM schema.table
WHERE
    condition1 = TRUE
    AND condition2 = FALSE
```

### Pontuação e detalhes

pg_procrustes lida com centenas de pequenos detalhes que fazem da formatação um ofício:

```yaml
trailing_whitespace:  strip       # remover espaços no final das linhas
semicolons:           add         # adicionar ponto e vírgula faltantes
inequality_op:        c           # != em vez de <>
cast_style:           operator    # x::integer em vez de CAST(x AS integer)
order_asc:            remove      # remover ASC redundante
not_in:               not_in      # NOT IN em vez de != ALL( ... )
paren_spacing:        remove      -- sem espaços dentro de parênteses
quoted_identifiers:   remove_safe # remover aspas com segurança onde desnecessário
schema_qualification: remove_public  # remover prefixo public.
```

### DDL — formatação de CREATE TABLE

pg_procrustes analisa instruções DDL da mesma forma que o PostgreSQL, portanto pode formatar inteligentemente `CREATE TABLE` com constraints, parâmetros de armazenamento e tablespaces:

Entrada:

```sql
CREATE TABLE public.orders (id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,user_id integer NOT NULL,total numeric(10,2) DEFAULT 0 NOT NULL,status text DEFAULT 'pending'::text NOT NULL,created_at timestamp with time zone DEFAULT now(),CONSTRAINT orders_pkey PRIMARY KEY (id),CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Saída:

```sql
CREATE TABLE public.orders (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Observe que `timestamp with time zone` foi encurtado para `timestamptz` de acordo com a configuração `form: short`.

### PL/pgSQL — dentro de corpos de funções

Uma das áreas mais difíceis da formatação SQL é PL/pgSQL. A maioria das ferramentas não processa o corpo da função dentro de `$$`, ou o processa incorretamente.

pg_procrustes formata recursivamente corpos de funções com dollar-quoting:

```sql
CREATE OR REPLACE FUNCTION public.process_order(p_order_id integer)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_total numeric;
    v_status text;
BEGIN
    SELECT total, status INTO v_total, v_status
    FROM orders WHERE id = p_order_id;

    IF v_status = 'pending' THEN
        UPDATE orders SET status = 'processing' WHERE id = p_order_id;
        RETURN jsonb_build_object('status', 'started');
    ELSIF v_status = 'processing' THEN
        RAISE EXCEPTION 'Order is already being processed'
            USING HINT = 'Wait for the current transaction to complete';
    ELSE
        RAISE EXCEPTION 'Cannot process order in status: %', v_status;
    END IF;
END;
$$;
```

A configuração de blocos PL/pgSQL permite definir indentação para `DECLARE`, `BEGIN`, `END`, formatação de construções `IF/CASE/LOOP`, adicionar ou remover ponto e vírgula após `END`, e centenas de outros detalhes.

---

## 5. Implantação em projetos

### Interface CLI

pg_procrustes é um único binário (instalado via Homebrew ou GitHub Releases), sem dependências:

```bash
# Formatar um arquivo in loco
pg_procrustes -w query.sql

# Formatar uma pasta inteira de migrações
pg_procrustes -w migrations/*.sql

# Verificação em CI — exit 1 se algo mudar
pg_procrustes --check migrations/*.sql

# Mostrar diff sem modificar arquivos
pg_procrustes --diff query.sql
```

### CI/CD

A maneira mais simples de manter formatação consistente em uma equipe é adicionar uma verificação ao pipeline de CI:

```yaml
# GitHub Actions
- name: Check SQL formatting
  run: pg_procrustes --check migrations/*.sql
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/heptau/pg_procrustes
    rev: v0.1.0
    hooks:
      - id: pg-procrustes
```

---

## 6. Ambição: Ser o gofmt do PostgreSQL

Observando o sucesso de `gofmt`, `rustfmt` ou `prettier`, vemos um padrão comum:

1. **Uma única ferramenta em que a comunidade confia.**
2. **Configurável o suficiente para cobrir 99 % das necessidades.**
3. **Firme o suficiente para eliminar intermináveis debates sobre formatação em code review.**

pg_procrustes ambiciona ser essa ferramenta para o ecossistema PostgreSQL. Usar o parser nativo `libpg_query` é sua vantagem principal — se o formatador entende seu código da mesma forma que o banco de dados, uma classe inteira de erros desaparece, onde um formatador «ajusta» algo e muda o significado da consulta.

A ferramenta está atualmente em desenvolvimento ativo. O feedback de usuários reais determinará sua direção. Se a formatação SQL te frustra, experimente e nos diga o que está faltando ou o que poderia funcionar de forma diferente.

---

## Conclusão: A formatação SQL não é uma causa perdida

A formatação automática de SQL é mais difícil do que a da maioria das linguagens de programação. SQL é declarativo, tem uma gramática complexa, DDL adiciona sua própria camada de complexidade e PL/pgSQL é praticamente uma linguagem dentro de uma linguagem.

Mas não é impossível. Ao abordar o problema com respeito pela gramática real do PostgreSQL (em vez de expressões regulares ou parsers personalizados), abre-se um caminho para uma ferramenta que pode unificar a formatação SQL entre equipes, projetos e empresas.

pg_procrustes não é mais uma tentativa de formatador SQL. É uma tentativa de fazer certo.

Mais em [pg_procrustes.80.cz](https://pg_procrustes.80.cz) e [GitHub](https://github.com/heptau/pg_procrustes).
