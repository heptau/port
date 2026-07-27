---
title: "Por qué el formateo de SQL sigue siendo el Viejo Oeste — y cómo pg_procrustes lo cambia"
description: "Cómo pg_procrustes resuelve el antiguo problema del formateo de código SQL para PostgreSQL con un parser nativo y configuración detallada — y por qué aspira a ser el gofmt del mundo de las bases de datos."
locale: "es"
categories: ["PostgreSQL"]
date: 2026-07-14
tags: ["PostgreSQL", "pg_procrustes", "SQL", "formateo", "DDL"]
draft: false
translation_id: "2026-07-14_1"
---

En el desarrollo de software moderno, damos por sentado el formateo automático del código. Go tiene `gofmt` integrado directamente en su cadena de herramientas — nadie discute sobre sangrías o posición de llaves porque la máquina lo decidió por todos. Rust tiene `rustfmt`, Python tiene `black` (inflexible, sin opciones — y eso es bueno), y el ecosistema JavaScript se ha unificado en `prettier`.

Y luego está **SQL**.

Una tierra donde cada desarrollador, cada equipo, cada empresa define su propio «estándar». Algunos escriben las palabras clave en mayúsculas, otros en minúsculas, otros combinadas. Unos sangran con cuatro espacios, otros con dos, otros con tabuladores. Unos escriben `INNER JOIN` en una línea, otros dividen cada cláusula por separado.

Este artículo explica por qué el formateo de SQL es un desafío único que se resiste a soluciones simples, y presenta [pg_procrustes](https://pg_procrustes.80.cz) — una nueva herramienta que aborda el problema de forma radicalmente diferente: utiliza el mismo parser que PostgreSQL.

---

## 1. SQL no es como otros lenguajes

La razón por la que SQL carece de un formateador universalmente aceptado no es pereza de la comunidad. SQL es objetivamente más difícil de formatear que la mayoría de los lenguajes de programación convencionales.

### SQL no está estructurado como los lenguajes imperativos

En Go o Rust, el código es una secuencia de sentencias ejecutadas de arriba abajo. Las reglas de formateo son relativamente simples: sangrar un bloque, alinear parámetros, normalizar espacios en blanco.

SQL es declarativo. Una sentencia `SELECT` se compone de cláusulas (`SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`), pero su orden no se trata de ejecución — se trata de la lógica de la consulta. Un formateador debe entender estas cláusulas para distribuirlas de manera significativa.

```sql
-- Estos son semánticamente idénticos:
SELECT a FROM b WHERE c = 1 GROUP BY d ORDER BY e;

-- Pero esto es más legible para los humanos:
SELECT a
FROM b
WHERE c = 1
GROUP BY d
ORDER BY e;
```

Para que un formateador sepa que `SELECT`, `FROM` y `WHERE` son cláusulas del mismo nivel (y no bloques anidados), debe **entender realmente la gramática de SQL**.

### DDL es aún más complejo

Data Definition Language (DDL) — sentencias como `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE` — añade otra capa de complejidad.

`CREATE TABLE` no es una lista homogénea. Contiene:
- definiciones de columnas con tipos de datos,
- restricciones (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`),
- parámetros de almacenamiento (`WITH (fillfactor = 90)`),
- `TABLESPACE`,
- `COMMENT ON`,
- todo lo cual puede aparecer en cualquier orden (con algunas excepciones impuestas por el parser de PostgreSQL).

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

¿Cómo formatear esto? Cada uno tiene una opinión diferente. Algunos quieren las restricciones sangradas debajo de las columnas, otros al mismo nivel. Algunos quieren los parámetros de almacenamiento en una línea separada, otros prefieren que estén al final del encabezado.

Ningún formateador basado en expresiones regulares puede manejar esto de forma confiable — necesitas un **parser real** que entienda qué es una columna, qué es una restricción y qué es un parámetro de almacenamiento.

---

## 2. Por qué las herramientas existentes no son suficientes

Al observar el panorama actual de formateadores SQL, surgen varios problemas recurrentes.

### Formateadores basados en regex

Herramientas como `pg_format` (también conocido como `sqlformat`) están escritas en Perl y funcionan principalmente a nivel de expresiones regulares. Manejan sentencias `SELECT` simples razonablemente bien, pero cuando se encuentran con sintaxis más compleja — bloques PL/pgSQL con condicionales anidados, `CREATE POLICY`, tipos de datos compuestos — comienzan a fallar.

Las expresiones regulares no tienen estado. No pueden determinar correctamente dónde termina una expresión `CASE` y dónde comienza un nuevo `WHEN`, porque necesitarían conocer el contexto — cuántos niveles de anidamiento están procesando actualmente.

### Formateadores universales con su propio parser

Una herramienta como `SQLFluff` está escrita en Python y tiene su propio parser SQL. Es extremadamente flexible (cientos de reglas configurables), pero su parser no es el mismo que el de PostgreSQL. Esto significa que pueden surgir situaciones donde SQLFluff interprete la sintaxis de manera diferente a la base de datos.

Además, SQLFluff es más lento — analizar y reescribir un archivo de migración grande puede llevar de segundos a decenas de segundos. Para uso interactivo en el editor, eso se nota.

### Formateadores que no entienden PostgreSQL

Ninguna de las herramientas existentes utiliza **libpg_query** — la biblioteca que encapsula el parser C real de PostgreSQL. Esa es una diferencia fundamental. Si un formateador no usa el mismo parser que la base de datos, siempre existirá una clase de errores donde las interpretaciones diverjan.

---

## 3. pg_procrustes: Un formateador con el parser de PostgreSQL en su interior

[pg_procrustes](https://pg_procrustes.80.cz) es un nuevo formateador escrito en Go que adopta un enfoque radicalmente diferente:

**Utiliza `libpg_query` — el mismo parser que PostgreSQL.**

Esto significa que si PostgreSQL puede leer tu sentencia SQL y construir un árbol sintáctico abstracto (AST) a partir de ella, pg_procrustes la entiende exactamente de la misma manera. No hay margen para diferencias de interpretación.

### El principio de Procusto

El nombre de la herramienta no es casual. En la mitología griega, Procusto ofrecía a los viajeros una noche de descanso — luego los estiraba o cortaba para que cupieran en su cama de hierro. pg_procrustes funciona igual: **tú defines la cama (reglas de configuración) y tu SQL encajará. Le guste o no.**

### Comportamiento por defecto: Nada

Una diferencia filosófica fundamental respecto a otros formateadores: pg_procrustes no cambia nada por defecto. Todos los ajustes tienen el valor `preserve`. Si no existe `.pg_procrustes.yaml`, el formateador lee el archivo y no realiza ningún cambio.

```yaml
# Esta es una configuración completa — nada cambiará:
```

Este enfoque es crucial para la adopción en proyectos existentes. Puedes implementar pg_procrustes ahora mismo sin que cambie nada, e ir activando reglas gradualmente hasta donde tu equipo se sienta cómodo.

---

## 4. Qué se puede configurar

La configuración se escribe en un archivo YAML `.pg_procrustes.yaml`. Desglosemos las opciones disponibles.

### Casing — cada clase de token por separado

El parser de PostgreSQL distingue docenas de clases de tokens. pg_procrustes permite establecer el casing para cada una de forma independiente:

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

Además de categorías menos comunes pero importantes:

```yaml
plpgsql_variables: { case: upper }        # NEW, OLD, TG_OP, FOUND
plpgsql_keywords:  { case: upper }        # RAISE, PERFORM, LOOP, EXIT
```

Cada categoría también acepta una lista de excepciones — palabras que mantienen su casing específico independientemente de la regla general:

```yaml
columns:
  case: lower
  exceptions:
    - ID        # se queda como "ID", no "id"
    - URL
    - CreatedAt
```

### Layout — fin de los debates sobre sangría

pg_procrustes admite espacios y tabuladores con ancho configurable y normalización. Pero más importante aún, ofrece ruptura inteligente de cláusulas y contenido:

```yaml
layout:
  line_length: 120
  indent:
    size: 3
    type: spaces

  clauses:
    break: auto       # romper cláusulas cuando la longitud exceda line_length
    align: indent
    join:  { break: always }   # JOIN siempre en nueva línea
    limit: { break: never }    # LIMIT se queda en la misma línea
```

El contenido dentro de las cláusulas (listas de selección, condiciones WHERE, VALUES) se puede configurar por separado:

```yaml
layout:
  content:
    break: auto
    first_item: break    # break = primer elemento en nueva línea
    select_list:  { break: always, first_item: inline }
    where_conds:  { break: always, first_item: inline }
    join_on:      { break: always }
    values_list:  { break: always }
```

Puedes lograr estilos como este:

```sql
SELECT column1,
       column2,
       column3
FROM schema.table
WHERE condition1 = TRUE
  AND condition2 = FALSE
INNER JOIN other ON other.id = schema.table.ref_id
```

O este (según la configuración de `first_item`):

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

### Puntuación y detalles

pg_procrustes maneja cientos de pequeños detalles que hacen del formateo un oficio:

```yaml
trailing_whitespace:  strip       # eliminar espacios al final de las líneas
semicolons:           add         # añadir punto y coma faltantes
inequality_op:        c           # != en lugar de <>
cast_style:           operator    # x::integer en lugar de CAST(x AS integer)
order_asc:            remove      # eliminar ASC redundante
not_in:               not_in      # NOT IN en lugar de != ALL( ... )
paren_spacing:        remove      -- sin espacios dentro de paréntesis
quoted_identifiers:   remove_safe # eliminar comillas de forma segura donde no sean necesarias
schema_qualification: remove_public  # eliminar prefijo public.
```

### DDL — formateo de CREATE TABLE

pg_procrustes analiza las sentencias DDL igual que PostgreSQL, por lo que puede formatear inteligentemente `CREATE TABLE` con restricciones, parámetros de almacenamiento y tablespaces:

Entrada:

```sql
CREATE TABLE public.orders (id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,user_id integer NOT NULL,total numeric(10,2) DEFAULT 0 NOT NULL,status text DEFAULT 'pending'::text NOT NULL,created_at timestamp with time zone DEFAULT now(),CONSTRAINT orders_pkey PRIMARY KEY (id),CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)) WITH (fillfactor = 90) TABLESPACE fast_space;
```

Salida:

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

Observa que `timestamp with time zone` se acortó a `timestamptz` según la configuración `form: short`.

### PL/pgSQL — dentro del cuerpo de funciones

Una de las áreas más difíciles del formateo SQL es PL/pgSQL. La mayoría de las herramientas no procesan el cuerpo de la función dentro de `$$`, o lo procesan incorrectamente.

pg_procrustes formatea recursivamente los cuerpos de funciones con dollar-quoting:

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

La configuración de bloques PL/pgSQL permite establecer la sangría para `DECLARE`, `BEGIN`, `END`, el formateo de construcciones `IF/CASE/LOOP`, añadir o eliminar punto y coma después de `END`, y cientos de otros detalles.

---

## 5. Despliegue en proyectos

### Interfaz CLI

pg_procrustes es un solo binario (instalado vía Homebrew o GitHub Releases), sin dependencias:

```bash
# Formatear un archivo in situ
pg_procrustes -w query.sql

# Formatear toda una carpeta de migraciones
pg_procrustes -w migrations/*.sql

# Verificación en CI — exit 1 si algo cambiaría
pg_procrustes --check migrations/*.sql

# Mostrar diff sin modificar archivos
pg_procrustes --diff query.sql
```

### CI/CD

La forma más sencilla de mantener un formateo consistente en un equipo es añadir una verificación a tu pipeline de CI:

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

## 6. Ambición: Ser el gofmt de PostgreSQL

Al observar el éxito de `gofmt`, `rustfmt` o `prettier`, vemos un patrón común:

1. **Una sola herramienta en la que la comunidad confía.**
2. **Suficientemente configurable para cubrir el 99 % de las necesidades.**
3. **Suficientemente firme para eliminar los interminables debates sobre formateo en las revisiones de código.**

pg_procrustes aspira a ser esa herramienta para el ecosistema PostgreSQL. Usar el parser nativo `libpg_query` es su ventaja clave — si el formateador entiende tu código igual que la base de datos, desaparece toda una clase de errores donde un formateador «ajusta» algo y cambia el significado de la consulta.

La herramienta está actualmente en desarrollo activo. La retroalimentación de usuarios reales determinará su dirección. Si el formateo SQL te frustra, pruébala y dinos qué falta o qué podría funcionar de otra manera.

---

## Conclusión: El formateo SQL no es una causa perdida

El formateo automático de SQL es más difícil que el de la mayoría de los lenguajes de programación. SQL es declarativo, tiene una gramática compleja, DDL añade su propia capa de complejidad y PL/pgSQL es prácticamente un lenguaje dentro de un lenguaje.

Pero no es imposible. Al abordar el problema con respeto por la gramática real de PostgreSQL (en lugar de expresiones regulares o parsers personalizados), se abre un camino hacia una herramienta que puede unificar el formateo SQL entre equipos, proyectos y empresas.

pg_procrustes no es otro intento de formateador SQL. Es un intento de hacerlo bien.

Más en [pg_procrustes.80.cz](https://pg_procrustes.80.cz) y [GitHub](https://github.com/heptau/pg_procrustes).
