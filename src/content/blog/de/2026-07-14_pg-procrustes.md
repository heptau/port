---
title: "Warum SQL-Formatierung immer noch Wilder Westen ist — und wie pg_procrustes das ändert"
description: "Wie pg_procrustes das uralte Problem der Formatierung von PostgreSQL-SQL-Code mit einem nativen Parser und detaillierter Konfiguration löst — und warum es der gofmt der Datenbankwelt werden will."
locale: "de"
categories: ["PostgreSQL"]
date: 2026-07-14
tags: ["PostgreSQL", "pg_procrustes", "SQL", "Formatierung", "DDL"]
draft: false
translation_id: "2026-07-14_1"
---

In der modernen Softwareentwicklung ist automatische Code-Formatierung selbstverständlich. Go hat `gofmt` direkt in die Toolchain integriert — niemand diskutiert über Einrückungen oder Klammerpositionen, weil die Maschine es für alle entschieden hat. Rust hat `rustfmt`, Python hat `black` (kompromisslos, keine Optionen — und das ist gut so), und das JavaScript-Ökosystem hat sich auf `prettier` geeinigt.

Und dann ist da **SQL**.

Ein Land, in dem jeder Entwickler, jedes Team, jedes Unternehmen seinen eigenen „Standard“ definiert. Manche schreiben Schlüsselwörter in Großbuchstaben, manche in Kleinbuchstaben, manche gemischt. Manche rücken mit vier Leerzeichen ein, manche mit zwei, manche mit Tabs. Manche schreiben `INNER JOIN` in eine Zeile, andere brechen jede Klausel einzeln um.

Dieser Artikel erklärt, warum SQL-Formatierung eine einzigartige Herausforderung ist, die sich einfachen Lösungen widersetzt, und stellt [pg_procrustes](https://pg_procrustes.80.cz) vor — ein neues Tool, das einen radikal anderen Ansatz verfolgt: Es verwendet denselben Parser wie PostgreSQL selbst.

---

## 1. SQL ist nicht wie andere Sprachen

Der Grund, warum SQL keinen universell akzeptierten Formatierer hat, ist nicht Trägheit der Community. SQL ist objektiv schwieriger zu formatieren als die meisten gängigen Programmiersprachen.

### SQL ist nicht wie imperative Sprachen strukturiert

In Go oder Rust ist Code eine Folge von Anweisungen, die von oben nach unten ausgeführt werden. Formatierungsregeln sind relativ einfach: Block einrücken, Parameter ausrichten, Leerzeichen normalisieren.

SQL ist deklarativ. Eine `SELECT`-Anweisung besteht aus Klauseln (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`), aber ihre Reihenfolge hat nichts mit Ausführung zu tun — sie folgt der Abfragelogik. Ein Formatierer muss diese Klauseln verstehen, um sie sinnvoll anzuordnen.

```sql
-- Diese sind semantisch identisch:
SELECT a FROM b WHERE c = 1 GROUP BY d ORDER BY e;

-- Aber das ist für Menschen lesbarer:
SELECT a
FROM b
WHERE c = 1
GROUP BY d
ORDER BY e;
```

Damit ein Formatierer weiß, dass `SELECT`, `FROM` und `WHERE` Klauseln auf derselben Ebene sind (und keine verschachtelten Blöcke), muss er **die SQL-Grammatik tatsächlich verstehen**.

### DDL ist noch schwieriger

Data Definition Language (DDL) — Anweisungen wie `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` — fügt eine weitere Komplexitätsebene hinzu.

`CREATE TABLE` ist keine homogene Liste. Es enthält:
- Spaltendefinitionen mit Datentypen,
- Constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`),
- Storage-Parameter (`WITH (fillfactor = 90)`),
- `TABLESPACE`,
- `COMMENT ON`,
- all das kann in beliebiger Reihenfolge vorkommen (bis auf wenige Ausnahmen, die der PostgreSQL-Parser vorgibt).

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

Wie formatiert man das? Jeder hat eine andere Vorstellung. Manche wollen Constraints eingerückt unter den Spalten, manche auf derselben Ebene. Manche wollen Storage-Parameter in einer separaten Zeile, andere sind zufrieden, wenn sie am Ende des Headers stehen.

Kein auf regulären Ausdrücken basierender Formatierer kann das zuverlässig handhaben — man braucht einen **echten Parser**, der versteht, was eine Spalte, was ein Constraint und was ein Storage-Parameter ist.

---

## 2. Warum bestehende Werkzeuge nicht ausreichen

Bei der Betrachtung der aktuellen Landschaft von SQL-Formatierern fallen mehrere wiederkehrende Probleme auf.

### Regex-basierte Formatierer

Werkzeuge wie `pg_format` (auch bekannt als `sqlformat`) sind in Perl geschrieben und arbeiten hauptsächlich auf Regex-Ebene. Sie verarbeiten einfache `SELECT`-Anweisungen einigermaßen gut, aber sobald sie auf komplexere Syntax stoßen — PL/pgSQL-Blöcke mit verschachtelten Bedingungen, `CREATE POLICY`, zusammengesetzte Datentypen — beginnen sie zu versagen.

Reguläre Ausdrücke sind zustandslos. Sie können nicht korrekt bestimmen, wo ein `CASE`-Ausdruck endet und ein neues `WHEN` beginnt, weil sie den Kontext kennen müssten — wie viele Verschachtelungsebenen sie gerade verarbeiten.

### Universelle Formatierer mit eigenem Parser

Ein Tool wie `SQLFluff` ist in Python geschrieben und hat einen eigenen SQL-Parser. Es ist extrem flexibel (hunderte konfigurierbare Regeln), aber sein Parser ist nicht derselbe wie der von PostgreSQL. Das bedeutet, dass Situationen auftreten können, in denen SQLFluff die Syntax anders interpretiert als die Datenbank.

Außerdem ist SQLFluff langsamer — das Analysieren und Umschreiben einer großen Migrationsdatei kann Sekunden bis zu mehreren zehn Sekunden dauern. Für die interaktive Nutzung im Editor ist das spürbar.

### Formatierer, die PostgreSQL nicht verstehen

Keines der bestehenden Tools verwendet **libpg_query** — die Bibliothek, die den echten C-Parser von PostgreSQL kapselt. Das ist ein grundlegender Unterschied. Wenn ein Formatierer nicht denselben Parser wie die Datenbank verwendet, gibt es immer eine Klasse von Fehlern, bei denen die Interpretationen auseinandergehen.

---

## 3. pg_procrustes: Ein Formatierer mit PostgreSQLs Parser im Inneren

[pg_procrustes](https://pg_procrustes.80.cz) ist ein neuer, in Go geschriebener Formatierer, der einen radikal anderen Ansatz verfolgt:

**Er verwendet `libpg_query` — denselben Parser wie PostgreSQL.**

Das bedeutet: Wenn PostgreSQL deine SQL-Anweisung lesen und einen abstrakten Syntaxbaum (AST) daraus erstellen kann, versteht pg_procrustes sie auf genau dieselbe Weise. Es gibt keinen Raum für Interpretationsunterschiede.

### Das prokrusteische Prinzip

Der Name des Tools ist kein Zufall. In der griechischen Mythologie bot Prokrustes Reisenden eine Nachtruhe an — und streckte oder schnitt sie dann zurecht, damit sie in sein eisernes Bett passten. pg_procrustes funktioniert genauso: **du definierst das Bett (Konfigurationsregeln) und dein SQL wird hineinpassen. Ob es will oder nicht.**

### Standardverhalten: Nichts

Ein grundlegender philosophischer Unterschied zu anderen Formatierern: pg_procrustes ändert standardmäßig nichts. Alle Einstellungen haben den Wert `preserve`. Wenn keine `.pg_procrustes.yaml` existiert, liest der Formatierer die Datei und nimmt keine Änderungen vor.

```yaml
# Dies ist eine vollständige Konfiguration — nichts wird sich ändern:
```

Dieser Ansatz ist entscheidend für die Einführung in bestehenden Projekten. Du kannst pg_procrustes sofort einsetzen, ohne dass es etwas ändert, und nach und nach Regeln aktivieren, in dem Maße, wie dein Team sich wohlfühlt.

---

## 4. Was konfiguriert werden kann

Die Konfiguration erfolgt in einer YAML-Datei `.pg_procrustes.yaml`. Lassen wir uns die verfügbaren Optionen ansehen.

### Casing — jede Token-Klasse einzeln

Der PostgreSQL-Parser unterscheidet Dutzende von Token-Klassen. pg_procrustes erlaubt es, die Schreibweise für jede einzelne unabhängig festzulegen:

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

Plus weniger bekannte, aber wichtige Kategorien:

```yaml
plpgsql_variables: { case: upper }        # NEW, OLD, TG_OP, FOUND
plpgsql_keywords:  { case: upper }        # RAISE, PERFORM, LOOP, EXIT
```

Jede Kategorie akzeptiert auch eine Ausnahmeliste — Wörter, die ihre spezifische Schreibweise unabhängig von der allgemeinen Regel behalten:

```yaml
columns:
  case: lower
  exceptions:
    - ID        # bleibt "ID", nicht "id"
    - URL
    - CreatedAt
```

### Layout — Ende der Einrückungsdebatten

pg_procrustes unterstützt Leerzeichen und Tabs mit konfigurierbarer Breite und Normalisierung. Noch wichtiger ist aber das intelligente Umbrechen von Klauseln und Inhalten:

```yaml
layout:
  line_length: 120
  indent:
    size: 3
    type: spaces

  clauses:
    break: auto       # Klauseln umbrechen, wenn Länge line_length überschreitet
    align: indent
    join:  { break: always }   # JOIN immer in neuer Zeile
    limit: { break: never }    # LIMIT bleibt in derselben Zeile
```

Inhalte innerhalb von Klauseln (Select-Listen, WHERE-Bedingungen, VALUES) können separat konfiguriert werden:

```yaml
layout:
  content:
    break: auto
    first_item: break    # break = erstes Element in neuer Zeile
    select_list:  { break: always, first_item: inline }
    where_conds:  { break: always, first_item: inline }
    join_on:      { break: always }
    values_list:  { break: always }
```

So kannst du Stile wie diesen erreichen:

```sql
SELECT column1,
       column2,
       column3
FROM schema.table
WHERE condition1 = TRUE
  AND condition2 = FALSE
INNER JOIN other ON other.id = schema.table.ref_id
```

Oder diesen (abhängig von der `first_item`-Einstellung):

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

### Zeichensetzung und Details

pg_procrustes behandelt hunderte kleiner Details, die Formatierung zu einem Handwerk machen:

```yaml
trailing_whitespace:  strip       # Leerzeichen am Zeilenende entfernen
semicolons:           add         # fehlende Semikolons hinzufügen
inequality_op:        c           # != statt <>
cast_style:           operator    # x::integer statt CAST(x AS integer)
order_asc:            remove      # redundantes ASC entfernen
not_in:               not_in      # NOT IN statt != ALL( ... )
paren_spacing:        remove      -- keine Leerzeichen in Klammern
quoted_identifiers:   remove_safe # Anführungszeichen sicher entfernen, wo unnötig
schema_qualification: remove_public  # public.-Präfix entfernen
```

### DDL — CREATE TABLE formatieren

pg_procrustes parst DDL-Anweisungen genauso wie PostgreSQL, sodass es `CREATE TABLE` mit Constraints, Storage-Parametern und Tablespaces intelligent formatieren kann:

Eingabe:

```sql
CREATE TABLE public.orders (id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,user_id integer NOT NULL,total numeric(10,2) DEFAULT 0 NOT NULL,status text DEFAULT 'pending'::text NOT NULL,created_at timestamp with time zone DEFAULT now(),CONSTRAINT orders_pkey PRIMARY KEY (id),CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Ausgabe:

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

Beachte, dass `timestamp with time zone` gemäß der Einstellung `form: short` zu `timestamptz` verkürzt wurde.

### PL/pgSQL — im Inneren von Funktionsrümpfen

Einer der schwierigsten Bereiche der SQL-Formatierung ist PL/pgSQL. Die meisten Tools verarbeiten den Funktionsrumpf innerhalb von `$$` entweder gar nicht oder inkorrekt.

pg_procrustes formatiert rekursiv auch dollar-quotierte Funktionsrümpfe:

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

Die Konfiguration von PL/pgSQL-Blöcken erlaubt es, Einrückungen für `DECLARE`, `BEGIN`, `END`, die Formatierung von `IF/CASE/LOOP`-Konstrukten, das Hinzufügen oder Entfernen von Semikolons nach `END` und hunderte weitere Details einzustellen.

---

## 5. Einsatz im Projekt

### CLI-Schnittstelle

pg_procrustes ist eine einzelne Binärdatei (installiert über Homebrew oder GitHub Releases), keine Abhängigkeiten:

```bash
# Datei direkt formatieren
pg_procrustes -w query.sql

# Ganzen Migrationsordner formatieren
pg_procrustes -w migrations/*.sql

# CI-Prüfung — exit 1, wenn sich etwas ändern würde
pg_procrustes --check migrations/*.sql

# Diff anzeigen, ohne Dateien zu ändern
pg_procrustes --diff query.sql
```

### CI/CD

Der einfachste Weg, konsistente Formatierung im Team zu gewährleisten, ist die Integration in die CI-Pipeline:

```yaml
# GitHub Actions
- name: Check SQL formatting
  run: pg_procrustes --check migrations/*.sql
```

### Pre-commit-Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/heptau/pg_procrustes
    rev: v0.1.0
    hooks:
      - id: pg-procrustes
```

---

## 6. Ambition: Der gofmt von PostgreSQL werden

Betrachtet man den Erfolg von `gofmt`, `rustfmt` oder `prettier`, erkennt man ein gemeinsames Muster:

1. **Ein einzelnes Tool, dem die Community vertraut.**
2. **Konfigurierbar genug, um 99 % der Bedürfnisse abzudecken.**
3. **Fest genug, um endlose Formatierungsdebatten im Code-Review zu eliminieren.**

pg_procrustes strebt danach, dieses Tool für das PostgreSQL-Ökosystem zu sein. Die Verwendung des nativen `libpg_query`-Parsers ist sein entscheidender Vorteil — wenn der Formatierer deinen Code genauso versteht wie die Datenbank, entfällt eine ganze Klasse von Fehlern, bei denen ein Formatierer etwas „optimiert“ und dadurch die Bedeutung der Abfrage ändert.

Das Tool befindet sich derzeit in aktiver Entwicklung. Rückmeldungen von echten Benutzern werden seine Richtung bestimmen. Wenn dich SQL-Formatierung frustriert, probiere es aus und lass uns wissen, was fehlt oder was anders funktionieren könnte.

---

## Fazit: SQL-Formatierung ist nicht hoffnungslos

Automatische SQL-Formatierung ist schwieriger als bei den meisten Programmiersprachen. SQL ist deklarativ, hat eine komplexe Grammatik, DDL fügt eine eigene Komplexitätsebene hinzu und PL/pgSQL ist praktisch eine Sprache in der Sprache.

Aber es ist nicht unmöglich. Wenn man das Problem mit Respekt für die tatsächliche Grammatik von PostgreSQL angeht (anstatt mit regulären Ausdrücken oder eigenen Parsern), eröffnet sich ein Weg zu einem Tool, das SQL-Formatierung teams-, projekt- und unternehmensübergreifend vereinheitlichen kann.

pg_procrustes ist kein weiterer Versuch eines SQL-Formatierers. Es ist der Versuch, es richtig zu machen.

Mehr unter [pg_procrustes.80.cz](https://pg_procrustes.80.cz) und [GitHub](https://github.com/heptau/pg_procrustes).
