---
title: "Why SQL Formatting Is Still the Wild West — and How pg_procrustes Changes It"
description: "How pg_procrustes tackles the age-old problem of formatting PostgreSQL SQL code with a native parser and fine-grained configuration — and why it aims to become the gofmt of the database world."
locale: "en"
categories: ["PostgreSQL"]
date: 2026-07-14
tags: ["PostgreSQL", "pg_procrustes", "SQL", "formatting", "DDL"]
draft: false
translation_id: "2026-07-14_1"
---

In modern software development, we take automatic code formatting for granted. Go has `gofmt` built right into the toolchain — nobody argues about indentation or bracket placement because the machine decided it for everyone. Rust has `rustfmt`, Python has `black` (uncompromising, no options — and that's a good thing), and the JavaScript ecosystem has settled on `prettier`.

And then there's **SQL**.

A land where every developer, every team, every company defines their own "standard." Some write keywords in uppercase, some in lowercase, some mixed. Some indent with four spaces, some with two, some with tabs. Some write `INNER JOIN` on one line, others break every clause separately.

This article explains why SQL formatting is a unique challenge that resists simple solutions, and introduces [pg_procrustes](https://pg_procrustes.80.cz) — a new tool that takes a radically different approach: it uses the same parser as PostgreSQL itself.

---

## 1. SQL Is Not Like Other Languages

The reason SQL lacks a universally accepted formatter isn't community laziness. SQL is objectively harder to format than most mainstream programming languages.

### SQL isn't structured like imperative languages

In Go or Rust, code is a sequence of statements executed from top to bottom. Formatting rules are relatively straightforward: indent a block, align parameters, normalize whitespace.

SQL is declarative. A `SELECT` statement consists of clauses (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`), but their order isn't about execution — it's about query logic. A formatter must understand these clauses to lay them out meaningfully.

```sql
-- These are semantically identical:
SELECT a FROM b WHERE c = 1 GROUP BY d ORDER BY e;

-- But this is more readable for humans:
SELECT a
FROM b
WHERE c = 1
GROUP BY d
ORDER BY e;
```

For a formatter to know that `SELECT`, `FROM`, and `WHERE` are same-level clauses (not nested blocks), it must **actually understand SQL grammar**.

### DDL is even harder

Data Definition Language (DDL) — statements like `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` — adds another layer of complexity.

A `CREATE TABLE` isn't a homogeneous list. It contains:
- column definitions with data types,
- constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`),
- storage parameters (`WITH (fillfactor = 90)`),
- `TABLESPACE`,
- `COMMENT ON`,
- all of which may appear in any order (with a few exceptions imposed by the PostgreSQL parser).

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

How do you format this? Everyone has a different opinion. Some want constraints indented below columns, some want them at the same level. Some want storage parameters on a separate line, others are fine with them at the end of the header.

No regex-based formatter can handle this reliably — you need a **real parser** that understands what is a column, what is a constraint, and what is a storage parameter.

---

## 2. Why Existing Tools Fall Short

Looking at the current landscape of SQL formatters, several recurring problems emerge.

### Regex-based formatters

Tools like `pg_format` (also known as `sqlformat`) are written in Perl and work primarily at the regex level. They handle simple `SELECT` statements reasonably well, but as soon as they encounter more complex syntax — PL/pgSQL blocks with nested conditionals, `CREATE POLICY`, composite data types — they start failing.

Regular expressions are stateless. They cannot correctly determine where a `CASE` expression ends and a new `WHEN` begins, because they would need to know the context — how many nesting levels they're currently processing.

### Universal formatters with their own parser

A tool like `SQLFluff` is written in Python and has its own SQL parser. It's extremely flexible (hundreds of configurable rules), but its parser isn't the same as PostgreSQL's parser. This means situations can arise where SQLFluff interprets syntax differently than the database.

Moreover, SQLFluff is slower — analyzing and rewriting a large migration file can take seconds to tens of seconds. For interactive editor use, that's noticeable.

### Formatters that don't understand PostgreSQL

None of the existing tools use **libpg_query** — the library that encapsulates the real C parser of PostgreSQL. That's a fundamental difference. If a formatter doesn't use the same parser as the database, there will always be a class of errors where interpretations diverge.

---

## 3. pg_procrustes: A Formatter with PostgreSQL's Parser Inside

[pg_procrustes](https://pg_procrustes.80.cz) is a new formatter written in Go that takes a radically different approach:

**It uses `libpg_query` — the same parser as PostgreSQL.**

This means if PostgreSQL can read your SQL statement and build an abstract syntax tree (AST) from it, pg_procrustes understands it exactly the same way. There is no room for interpretation gaps.

### The Procrustean principle

The tool's name is no accident. In Greek mythology, Procrustes offered travelers a night's rest — then stretched or cut them to fit his iron bed. pg_procrustes works the same way: **you define the bed (configuration rules) and your SQL will fit. Whether it likes it or not.**

### Default behavior: Nothing

A fundamental philosophical difference from other formatters: pg_procrustes changes nothing by default. All settings default to `preserve`. If no `.pg_procrustes.yaml` exists, the formatter reads the file and makes no changes.

```yaml
# This is a complete configuration — nothing will change:
```

This approach is crucial for adoption in existing projects. You can deploy pg_procrustes right now without it changing a thing, and gradually enable rules to the extent your team is comfortable with.

---

## 4. What Can Be Configured

Configuration lives in a YAML file `.pg_procrustes.yaml`. Let's break down the available options.

### Casing — every token class separately

The PostgreSQL parser distinguishes dozens of token classes. pg_procrustes lets you set casing for each one independently:

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

Plus less common but important categories:

```yaml
plpgsql_variables: { case: upper }        # NEW, OLD, TG_OP, FOUND
plpgsql_keywords:  { case: upper }        # RAISE, PERFORM, LOOP, EXIT
```

Each category also accepts an exceptions list — words that keep their specific casing regardless of the surrounding rule:

```yaml
columns:
  case: lower
  exceptions:
    - ID        # stays "ID", not "id"
    - URL
    - CreatedAt
```

### Layout — ending indentation debates

pg_procrustes supports spaces and tabs with configurable width and normalization. But more importantly, it offers intelligent clause and content breaking:

```yaml
layout:
  line_length: 120
  indent:
    size: 3
    type: spaces

  clauses:
    break: auto       # break clauses when length exceeds line_length
    align: indent
    join:  { break: always }   # JOIN always on a new line
    limit: { break: never }    # LIMIT stays on the same line
```

Content inside clauses (select lists, WHERE conditions, VALUES) can be configured separately:

```yaml
layout:
  content:
    break: auto
    first_item: break    # break = first item on a new line
    select_list:  { break: always, first_item: inline }
    where_conds:  { break: always, first_item: inline }
    join_on:      { break: always }
    values_list:  { break: always }
```

You can achieve styles like this:

```sql
SELECT column1,
       column2,
       column3
FROM schema.table
WHERE condition1 = TRUE
  AND condition2 = FALSE
INNER JOIN other ON other.id = schema.table.ref_id
```

Or this (depending on the `first_item` setting):

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

### Punctuation and details

pg_procrustes handles hundreds of small details that make formatting a craft:

```yaml
trailing_whitespace:  strip       # remove trailing whitespace
semicolons:           add         # add missing semicolons
inequality_op:        c           # != instead of <>
cast_style:           operator    # x::integer instead of CAST(x AS integer)
order_asc:            remove      # remove redundant ASC
not_in:               not_in      # NOT IN instead of != ALL( ... )
paren_spacing:        remove      -- no spaces inside parentheses
quoted_identifiers:   remove_safe # safely remove quotes where unnecessary
schema_qualification: remove_public  # remove public. prefix
```

### DDL — formatting CREATE TABLE

pg_procrustes parses DDL statements the same way PostgreSQL does, so it can intelligently format `CREATE TABLE` with constraints, storage parameters, and tablespaces:

Input:

```sql
CREATE TABLE public.orders (id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,user_id integer NOT NULL,total numeric(10,2) DEFAULT 0 NOT NULL,status text DEFAULT 'pending'::text NOT NULL,created_at timestamp with time zone DEFAULT now(),CONSTRAINT orders_pkey PRIMARY KEY (id),CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Output:

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

Note that `timestamp with time zone` was shortened to `timestamptz` according to the `form: short` setting.

### PL/pgSQL — inside function bodies

One of the hardest areas of SQL formatting is PL/pgSQL. Most tools either don't process the function body inside `$$` at all, or process it incorrectly.

pg_procrustes recursively formats dollar-quoted function bodies:

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

PL/pgSQL block configuration lets you set indentation for `DECLARE`, `BEGIN`, `END`, formatting of `IF/CASE/LOOP` constructs, adding or removing semicolons after `END`, and hundreds of other details.

---

## 5. Project Deployment

### CLI interface

pg_procrustes is a single binary (installed via Homebrew or GitHub Releases), no dependencies:

```bash
# Format a file in place
pg_procrustes -w query.sql

# Format an entire migration folder
pg_procrustes -w migrations/*.sql

# CI check — exit 1 if anything would change
pg_procrustes --check migrations/*.sql

# Show a diff without modifying files
pg_procrustes --diff query.sql
```

### CI/CD

The simplest way to maintain consistent formatting in a team is to add a check to your CI pipeline:

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

## 6. Ambition: To Be the gofmt of PostgreSQL

Looking at the success of `gofmt`, `rustfmt`, or `prettier`, we see a common pattern:

1. **A single tool the community trusts.**
2. **Configurable enough to cover 99% of needs.**
3. **Firm enough to eliminate endless formatting debates in code review.**

pg_procrustes aspires to be that tool for the PostgreSQL ecosystem. Using the native `libpg_query` parser is its key advantage — if the formatter understands your code the same way the database does, an entire class of errors disappears where a formatter "tweaks" something and changes the query's meaning.

The tool is currently in active development. Feedback from real users is what will determine its direction. If SQL formatting frustrates you, give it a try and let us know what's missing or what could work differently.

---

## Conclusion: SQL Formatting Is Not Hopeless

Automatic SQL formatting is harder than for most programming languages. SQL is declarative, has a complex grammar, DDL adds its own layer of complexity, and PL/pgSQL is practically a language within a language.

But it's not impossible. By approaching the problem with respect for PostgreSQL's actual grammar (instead of regular expressions or custom parsers), a path opens to a tool that can unify SQL formatting across teams, projects, and companies.

pg_procrustes is not another attempt at a SQL formatter. It's an attempt to do it right.

More at [pg_procrustes.80.cz](https://pg_procrustes.80.cz) and [GitHub](https://github.com/heptau/pg_procrustes).
