---
title: "Proč je formátování SQL pořád divočina — a jak to mění pg_procrustes"
description: "Jak pg_procrustes řeší letitý problém formátování PostgreSQL SQL kódu pomocí nativního parseru a detailní konfigurace — a proč chce být gofmtem pro databázový svět."
locale: "cs"
categories: ["PostgreSQL"]
date: 2026-07-14
tags: ["PostgreSQL", "pg_procrustes", "SQL", "formátování", "DDL"]
draft: false
translation_id: "2026-07-14_1"
---

V moderním vývoji softwaru dnes bereme automatické formátování kódu jako samozřejmost. Jazyk Go má `gofmt` integrovaný přímo v toolchainu — nikdo neřeší, jak má vypadat odsazení nebo závorky, protože to za všechny rozhodl stroj. Rust má `rustfmt`, Python má `black` (nesmlouvavý, žádné možnosti — a to je dobře), JavaScriptový ekosystém se sjednotil na `prettieru`.

A pak je tu **SQL**.

Země, kde si každý vývojář, každý tým a každá firma definuje vlastní „standard“. Někdo píše klíčová slova velkými písmeny, někdo malými, někdo kombinovaně. Někdo odsazuje čtyřmi mezerami, někdo dvěma, někdo tabulátorem. Někdo píše `INNER JOIN` na jeden řádek, někdo lámeme každou klauzuli zvlášť.

Tento článek vysvětluje, proč je formátování SQL specifická disciplína, která se vzpírá jednoduchým řešením, a představuje nový nástroj [pg_procrustes](https://pg_procrustes.80.cz), který k problému přistupuje radikálně jinak — používá stejný parser jako PostgreSQL samotný.

---

## 1. SQL není jako jiné jazyky

Důvod, proč u SQL neexistuje celosvětově uznávaný formatter, není lenost komunity. SQL je objektivně těžší naformátovat než většina běžných programovacích jazyků.

### SQL není strukturovaný jako imperativní jazyky

V Go nebo Rustu je kód posloupnost příkazů, které se vykonávají shora dolů. Formátovací pravidla jsou relativně přímočará: odsadit blok, zarovnat parametry, sjednotit mezery.

SQL je deklarativní. Příkaz `SELECT` se skládá z klauzulí (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`), ale jejich pořadí není dáno vykonáváním — je dáno logikou dotazu. Formátovač musí těmto klauzulím rozumět, aby je mohl smysluplně rozložit na řádky.

```sql
-- Toto je sémanticky stejné:
SELECT a FROM b WHERE c = 1 GROUP BY d ORDER BY e;

-- Ale tohle je pro člověka čitelnější:
SELECT a
FROM b
WHERE c = 1
GROUP BY d
ORDER BY e;
```

Aby formátovač věděl, že `SELECT`, `FROM`, `WHERE` jsou klauzule stejné úrovně (a ne například vnořené bloky), musí **skutečně rozumět gramatice SQL**.

### DDL je ještě horší

Data Definition Language (DDL) — příkazy jako `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` — přináší další vrstvu komplexity.

`CREATE TABLE` totiž není homogenní seznam. Obsahuje:
- definice sloupců s datovými typy,
- constrainty (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`),
- storage parametry (`WITH (fillfactor = 90)`),
- `TABLESPACE`,
- `COMMENT ON`,
- a to vše může být v libovolném pořadí (až na pár výjimek daných PostgreSQL parserem).

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

Jak tohle naformátovat? Každý má jinou představu. Někdo chce constrainty pod sloupce odsazené, někdo je chce na stejné úrovni jako sloupce. Někdo chce storage parametry na zvláštní řádek, někomu stačí na konci hlavičky.

Žádný formátovač založený na regulárních výrazech tohle nemůže řešit spolehlivě — potřebujete **skutečný parser**, který rozumí tomu, co je sloupec, co je constraint a co je storage parametr.

---

## 2. Proč existující nástroje nestačí

Když se podíváme na současnou nabídku SQL formatterů, narazíme na několik opakujících se problémů.

### Regexové formattery

Nástroje jako `pg_format` (známý také jako `sqlformat`) jsou napsané v Perlu a pracují převážně na úrovni regulárních výrazů. Pro jednoduché `SELECT` příkazy fungují obstojně, ale jakmile narazí na složitější syntaxi — PL/pgSQL bloky s vnořenými podmínkami, `CREATE POLICY`, složené datové typy — začnou selhávat.

Regulární výrazy totiž nejsou stavové. Nemohou správně určit, kde končí `CASE` výraz a kde začíná nový `WHEN`, protože by k tomu potřebovaly znát kontext — kolik úrovní zanoření aktuálně zpracovávají.

### Univerzální formatter s vlastním parserem

Nástroj jako `SQLFluff` je napsaný v Pythonu a má vlastní parser SQL. Je extrémně flexibilní (má stovky konfigurovatelných pravidel), ale jeho parser není stejný jako parser PostgreSQL. To znamená, že může dojít k situacím, kdy SQLFluff interpretuje syntaxi jinak než databáze.

Navíc je SQLFluff pomalejší — analýza a přepis velkého migračního souboru může trvat sekundy až desítky sekund. Pro interaktivní použití v editoru je to znát.

### Formatter, který PostgreSQL nerozumí

Žádný z existujících nástrojů nepoužívá **libpg_query** — knihovnu, která zapouzdřuje skutečný C parser PostgreSQL. To je zásadní rozdíl. Pokud formátovač nepoužívá stejný parser jako databáze, bude vždy existovat třída chyb, kde se liší interpretace.

---

## 3. pg_procrustes: Formátovač s PostgreSQL parserem uvnitř

[pg_procrustes](https://pg_procrustes.80.cz) je nový formátovač napsaný v Go, který k problému přistupuje radikálně odlišně:

**Používá `libpg_query` — stejný parser jako PostgreSQL.**

To znamená, že pokud PostgreSQL dokáže váš SQL příkaz přečíst a vytvořit z něj abstraktní syntaktický strom (AST), pg_procrustes mu rozumí úplně stejně. Není zde prostor pro interpretační rozdíly.

### Princip: Prokrustovo lože

Název nástroje není náhodný. V řecké mytologii Prokrustes nabízel pocestným nocleh — a pak je natáhl nebo usekl, aby se vešli na jeho železné lože. pg_procrustes funguje stejně: **vy definujete lože (konfigurační pravidla) a váš SQL se do něj vejde. Ať se mu to líbí nebo ne.**

### Defaultní chování: Nic

Zásadní filozofický rozdíl oproti jiným formatterům: pg_procrustes defaultně nic nemění. Všechna nastavení jsou na hodnotě `preserve`. Pokud `.pg_procrustes.yaml` neexistuje, formátovač projde soubor a neudělá žádnou změnu.

```yaml
# Toto je kompletní konfigurace — nic se nezmění:
```

Tento přístup je důležitý pro adopci v existujících projektech. Můžete pg_procrustes nasadit hned teď, aniž by cokoliv změnil, a postupně zapínat pravidla v míře, která vašemu týmu vyhovuje.

---

## 4. Co všechno se dá konfigurovat

Konfigurace se píše do YAML souboru `.pg_procrustes.yaml`. Rozdělme si možnosti do několika oblastí.

### Casing — každý token zvlášť

PostgreSQL parser rozlišuje desítky různých tříd tokenů. pg_procrustes umožňuje nastavit casing pro každou z nich samostatně:

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

A také méně obvyklé, ale důležité kategorie:

```yaml
plpgsql_variables: { case: upper }        # NEW, OLD, TG_OP, FOUND
plpgsql_keywords:  { case: upper }        # RAISE, PERFORM, LOOP, EXIT
```

Pro každou kategorii lze navíc definovat seznam výjimek — slov, která si zachovají svůj specifický casing bez ohledu na zbytek pravidel:

```yaml
columns:
  case: lower
  exceptions:
    - ID        # zůstane "ID", ne "id"
    - URL
    - CreatedAt
```

### Layout — konec hádek o odsazení

pg_procrustes podporuje odsazení mezerami i tabulátory, nastavitelnou šířku a normalizaci. Ale důležitější je inteligentní lámání klauzulí a obsahu:

```yaml
layout:
  line_length: 120
  indent:
    size: 3
    type: spaces

  clauses:
    break: auto       # lámat klauzule, když délka přesáhne line_length
    align: indent
    join:  { break: always }   # JOIN vždy na nový řádek
    limit: { break: never }    # LIMIT nechat na stejném řádku
```

Obsah uvnitř klauzulí (selektor sloupců, WHERE podmínky, VALUES) lze konfigurovat zvlášť:

```yaml
layout:
  content:
    break: auto
    first_item: break    # break = první položka na novém řádku
    select_list:  { break: always, first_item: inline }
    where_conds:  { break: always, first_item: inline }
    join_on:      { break: always }
    values_list:  { break: always }
```

Můžete tak dosáhnout například tohoto stylu:

```sql
SELECT column1,
       column2,
       column3
FROM schema.table
WHERE condition1 = TRUE
  AND condition2 = FALSE
INNER JOIN other ON other.id = schema.table.ref_id
```

Nebo tohoto (podle nastavení `first_item`):

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

### Interpunkce a detaily

pg_procrustes řeší i stovky drobností, které dělají z formátování řemeslo:

```yaml
trailing_whitespace:  strip       # odstranit prázdné znaky na konci řádků
semicolons:           add         # přidat chybějící středníky
inequality_op:        c           # != místo <>
cast_style:           operator    # x::integer místo CAST(x AS integer)
order_asc:            remove      # smazat redundantní ASC
not_in:               not_in      # NOT IN místo != ALL( ... )
paren_spacing:        remove      -- bez mezer uvnitř závorek
quoted_identifiers:   remove_safe # bezpečně odstranit uvozovky tam, kde nejsou potřeba
schema_qualification: remove_public  # odstranit public. prefix
```

### DDL — formátování CREATE TABLE

pg_procrustes parsuje DDL příkazy stejně jako PostgreSQL, takže umí inteligentně formátovat `CREATE TABLE` i s constrainty, storage parametry a tabulkovými prostory:

Příklad vstupu:

```sql
CREATE TABLE public.orders (id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,user_id integer NOT NULL,total numeric(10,2) DEFAULT 0 NOT NULL,status text DEFAULT 'pending'::text NOT NULL,created_at timestamp with time zone DEFAULT now(),CONSTRAINT orders_pkey PRIMARY KEY (id),CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Výstup:

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

Všimněte si, že datový typ `timestamp with time zone` se zkrátil na `timestamptz` podle nastavení `form: short`.

### PL/pgSQL — uvnitř těla funkcí

Jedna z nejobtížnějších oblastí formátování SQL je PL/pgSQL. Většina nástrojů tělo funkce uvnitř `$$` vůbec nezpracovává, nebo ho zpracovává chybně.

pg_procrustes formátuje rekurzivně i těla dollar-quoted funkcí:

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

Konfigurace PL/pgSQL bloků umožňuje nastavit odsazení pro `DECLARE`, `BEGIN`, `END`, formátování `IF/CASE/LOOP` konstrukcí, přidávání či odebírání středníků za `END` a stovky dalších detailů.

---

## 5. Nasazení do projektu

### CLI rozhraní

pg_procrustes je jeden binární soubor (stažený přes Homebrew nebo z GitHub Releases), žádné závislosti:

```bash
# Formátovat soubor na místě
pg_procrustes -w query.sql

# Formátovat celou složku migrací
pg_procrustes -w migrations/*.sql

# Zkontrolovat v CI — exit 1, pokud by se něco změnilo
pg_procrustes --check migrations/*.sql

# Ukázat diff, ale neměnit soubory
pg_procrustes --diff query.sql
```

### CI/CD

Nejjednodušší způsob, jak udržet konzistentní formátování v týmu, je přidat kontrolu do CI pipeline:

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

## 6. Ambice: Být gofmtem pro PostgreSQL

Když se podíváme na úspěch `gofmt`, `rustfmt` nebo `prettier`, vidíme společný vzorec:

1. **Jeden nástroj, kterému komunita důvěřuje.**
2. **Natolik konfigurovatelný, že pokryje 99 % potřeb.**
3. **Natolik pevný, že eliminuje nekonečné diskuze o formátování v code review.**

pg_procrustes má ambici být tímto nástrojem pro PostgreSQL ekosystém. Použití nativního parseru `libpg_query` je klíčová výhoda — pokud formátovač rozumí vašemu kódu stejně jako databáze, odpadá celá třída chyb, kde formátovač něco „poladí“ tak, že to změní význam dotazu.

Nástroj je aktuálně ve fázi aktivního vývoje. Zpětná vazba od reálných uživatelů je to, co rozhodne o jeho dalším směřování. Pokud vás formátování SQL trápí, zkuste ho a dejte vědět, co chybí nebo co by fungovalo jinak.

---

## Závěr: SQL formátování není beznadějné

Automatické formátování SQL je těžší než u většiny programovacích jazyků. SQL je deklarativní, má složitou gramatiku, DDL přidává vlastní vrstvu komplexity a PL/pgSQL je prakticky samostatný jazyk uvnitř jazyka.

Ale není to nemožné. Když k problému přistoupíte s respektem ke skutečné gramatice PostgreSQL (místo regulárních výrazů nebo vlastních parserů), otevře se cesta k nástroji, který může sjednotit formátování SQL kódu napříč týmy, projekty a firmami.

pg_procrustes není další pokus o SQL formatter. Je to pokus udělat to správně.

Více na [pg_procrustes.80.cz](https://pg_procrustes.80.cz) a [GitHubu](https://github.com/heptau/pg_procrustes).
