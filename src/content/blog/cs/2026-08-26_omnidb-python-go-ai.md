---
title: "Konec věku Pythonu? Jak mi AI pomohla přepsat 10 let starý nástroj do Go"
description: "Přepis OmniDB z Pythonu do Go jako případová studie — proč v éře AI přestává dávat smysl obětovat runtime výkon na oltář pohodlného psaní kódu."
locale: "cs"
categories: ["AI", "PostgreSQL", "Software Engineering"]
date: 2026-08-26
tags: ["OmniDB", "Python", "Go", "AI", "PostgreSQL", "Rust", "přepis softwaru"]
draft: false
translation_id: "2026-08-26_1"
---

Je to jen můj dojem, nebo se v poslední době vyplácí sáhnout po kompilovaném jazyku i tam, kde by se dřív automaticky sáhlo po Pythonu?

OmniDB byl svého času oblíbený PostgreSQL GUI nástroj — postavený na Pythonu/Djangu, s desktopovým frontendem, který začínal na Electronu a později byl vyměněn za lehčí NW.js. Projekt postupně zamrzl. Ne proto, že by byl koncepčně špatný, ale protože údržba monolitního Python stacku se stala neúnosnou. Tenhle článek není návod na přepis. Je to zamyšlení nad tím, proč podobné projekty umírají — a jak moderní stack spolu s AI mění pravidla hry.

**Teze:** Přepisovat starý software se dřív považovalo skoro za sebevraždu („nikdy nepřepisuj od nuly“). Dnes, díky posunu v technologiích a AI, se z přepisu čím dál častěji stává racionální volba — a nejsem s tím pozorováním sám, jak ukážu na pár známých příkladech z praxe velkých firem.

---

## 1. Staré dogma: čas vývojáře je dražší než CPU

> „Hardware je levný, čas vývojáře je drahý.“

Tenhle princip vyhrál posledních patnáct let válku jazyků. Vývoj v Pythonu byl rychlý, syntaxe přívětivá, knihoven habaděj. Že aplikace žere 150 MB RAM a startuje pár vteřin? Nevadí — počkáme, koupíme silnější stroj. Prakticky všechny populární jazyky té éry (Python, JavaScript/TypeScript, Java) jsou buď interpretované, nebo běží na virtuálním stroji. Runtime efektivita nikoho moc nezajímala, protože „hardware to dožene".

## 2. AI mění rovnici

AI dnes přebírá psaní boilerplate kódu, refaktoring i konverzi logiky mezi jazyky. Čas strávený psaním typovaného/kompilovaného kódu už není automaticky několikanásobně delší než v Pythonu — AI ho dnes zvládne vygenerovat za pár sekund.

Důsledek: pokud cena vývoje klesá, do popředí se vrací **efektivita runtime, rychlost odezvy a paměťová stopa** — tedy přesně to, co se posledních patnáct let ochotně obětovávalo za pohodlí psaní.

Otázka k zamyšlení: dává ještě smysl platit výkonem aplikace za „pohodlné psaní kódu", když už ten kód z velké části stejně píše LLM?

## 3. Iluze pohodlí aneb Python deployment peklo

Python je pohodlný na **psaní** — ale dostat ho k uživateli je jiná píseň:

- virtuální prostředí a konflikty závislostí,
- různé verze interpretru na Linuxu/macOS/Windows,
- C-knihovny, které se musí zvlášť zkompilovat pro každou platformu,
- PyInstaller/cx_Freeze jako výsledek: obří adresář plný `.so`/`.dll` souborů,
- vlastní CI konfigurace pro každý cílový systém.

Go řeší tohle všechno jinak:

- **jedna statická binárka** — žádný runtime, žádné závislosti,
- **cross-kompilace jedním příkazem** (`GOOS=linux`, `GOOS=darwin`, `GOOS=windows`) přímo z jednoho stroje,
- **dlouhodobá udržitelnost** — za deset let stačí stáhnout binárku a spustit. Žádné `pip install` tance, žádné rozbité dependency chainy.

Paradox: vývoj v Go je ve výsledku jednodušší a udržitelnější, protože odpadá správcovský balast okolo deploymentu. To, co zdánlivě šetří čas na začátku (pohodlný Python), se vrací jako dluh při každém release.

## 4. Nejsem v tom sám — podobné přepisy dělají i velké firmy

Tohle není jen pocit jednoho vývojáře oživujícího desetiletý side-projekt. Stejným směrem — pryč od pohodlného, ale pomalejšího runtime k rychlejšímu a předvídatelnějšímu — jde v posledních letech i řada velkých firem:

- **Discord** přepsal svoji službu Read States (sledování přečtených zpráv) z Go do Rustu. Důvod nebyl „Go je špatné", ale konkrétní bolest: garbage collector v Go způsoboval latenční špičky při vysoké zátěži. Rust bez GC problém vyřešil — a i jen se základní optimalizací překonal ručně laděnou Go verzi ([Discord Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)).
- **Dropbox** přepsal jádro svého synchronizačního enginu (interní jméno Nucleus) z Pythonu do Rustu. Starý model dat neměl stabilní identifikátory souborů napříč přesuny a limity paměťové stopy se nedaly odstranit postupnými opravami — bylo potřeba nové, deterministické jednovláknové jádro, které jde dnes i masivně fuzzovat. Podle vlastních slov týmu byl Rust „force multiplier" a jedno z nejlepších rozhodnutí, která udělali ([Dropbox Tech](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)).
- **Uber** přepsal worker uzly své datastore vrstvy Schemaless z Pythonu (Flask/uWSGI, jeden request na proces) do Go, aby využil lehkou concurrency a přestal škálovat čistě přidáváním dalších procesů. Podobným směrem šla později i větší část jejich platformy — Python a Node.js přestávaly stačit na latenční rozpočty při jejich objemu provozu ([Uber Blog](https://www.uber.com/en-IT/blog/schemaless-rewrite/)).
- **Cloudflare** v únoru 2026 zveřejnil, jak jeden inženýr s pomocí AI během jediného týdne postavil od nuly **vinext** — kompletní reimplementaci Next.js na Vite místo Turbopacku, nasaditelnou přímo na Cloudflare Workers. Pokrývá 94 % API povrchu Next.js 16, buildí 4,4× rychleji (1,67 s vs. 7,38 s) a klientský bundle je o 57 % menší (72,9 KB vs. 168,9 KB gzipped). Cena: zhruba 1 100 USD v API tokenech přes ~800 OpenCode sezení. Podle vlastních slov Cloudflare „téměř každý řádek kódu ve vinext napsala AI" — člověk se staral o architekturu, prioritizaci a korekci, když AI zabloudila do slepé uličky ([Cloudflare Blog](https://blog.cloudflare.com/vinext/)).

Společný jmenovatel prvních tří případů: nešlo o módu ani o „přepišme to, protože Go/Rust je trendy". Šlo vždy o konkrétní, měřitelný strop — latenci, paměť, předvídatelnost — který se v původním jazyce nedal odstranit bez zásadní změny architektury. Cloudflare pak jde ještě dál a ukazuje samotnou tezi tohoto článku v akci: to, co by dřív znamenalo tým na měsíce, tu zvládl jeden člověk za týden a řádově nižší náklady než plat jednoho vývojáře.

## 5. Případová studie: OmniDB v číslech

Konkrétní srovnání starého OmniDB 3.2 (Python/Django + NW.js) a nové verze OmniDB 4.2 (Go/Wails), změřeno na stejném stroji:

| Metrika | Staré OmniDB 3.2 (Python/NW.js) | Nové OmniDB 4.2 (Go/Wails) | Rozdíl |
|---|---|---|---|
| Velikost `.app` | 478 MB | 73 MB | −405 MB (−85 %) |
| Archiv ke stažení | 201 MB | 28 MB | −173 MB (−86 %) |
| Start backend serveru (do stavu „listening") | 0,32 s | 0,05 s | ~6× rychleji |
| RSS backendu v klidu | 104 MB | 19 MB | ~5× méně |

Poctivá poznámka k metodice: číslo pro start celé GUI aplikace (NW.js/Chromium vs. Wails/systémový webview) neuvádím — rozdíl bude patrně ještě větší, ale bez čistého měření bych ho jen odhadoval. Stejně tak se nedá poctivě srovnat RAM celé aplikace: NW.js si nese Chromium celé v sobě, zatímco Wails používá systémový WebKit, jehož paměť se na macOS účtuje zvlášť pod `com.apple. WebKit.*` procesy. Proto výše platí jen srovnání backend serveru — je to menší, ale ověřitelné tvrzení.

Co se přepisem ztratilo: plugin systém (Python pluginy) a krokový PL/pgSQL debugger, který potřeboval vlastní C extension v `shared_preload_libraries` — na dnešním managed Postgresu by stejně nikdy nešel nahrát. Spolu s nimi odešly i tři plugin integrace na dávno mrtvý upstream (pglogical, Postgres-BDR, Postgres-XL). Ne každý přepis je bezeztrátový, a nemá cenu to zamlčovat.

## 6. Python v AI éře — skutečný vs. zdánlivý výkon

Python dnes zažívá boom díky AI/ML, ale je v tom háček: v trénování a inferenci modelů funguje především jako „lepidlo" (glue language) — skutečné výpočty běží v C++/CUDA/PyTorch na pozadí. Pro desktopové nástroje, CLI utility a databázové klienty ale Python přináší plnou zátěž svého runtimu — pomalý start, vyšší paměťová stopa — aniž by uživatel z jeho flexibility cokoli reálně profitoval. Jen za ni platí.

Stejně tak je potřeba rozlišit druhou roli, ve které se Python v AI éře objevuje čím dál častěji: jako **prováděcí jazyk pro samotné AI agenty**. Nástroje typu code interpreter, sandboxované prostředí pro zpracování souborů nebo agentní frameworky téměř vždy sahají po Pythonu — má bohatou knihovnu pro práci s daty (pandas, openpyxl, Pillow), je to jazyk, ve kterém mají LLM nejvíc trénovacích dat, a hlavně: skript, který agent vygeneruje a jednou spustí, se nikam nedistribuuje. Žije pár sekund v izolovaném sandboxu a pak zmizí.

To je zásadně jiná situace než aplikace, kterou si stovky lidí instalují na svůj počítač a spouští každý den. Rychlost startu jednorázového skriptu v sandboxu nikoho netrápí — rychlost startu desktopové aplikace, kterou otevíráte desetkrát denně, ano. Python jako „lepidlo" pro agenty a Python jako runtime pro distribuovanou desktopovou aplikaci jsou dvě různé úlohy s různými nároky, a je chyba je házet do jednoho pytle jen proto, že jde o stejný jazyk.

## 7. Závěr: poučení pro budoucí projekty

1. Přepsat projekt do efektivnějšího jazyka už není elitářský rozmar — AI výrazně zlevnila konverzi i údržbu kódu, a dělají to i velké firmy typu Discord, Dropbox, Uber nebo Cloudflare, když narazí na konkrétní strop výkonu nebo chtějí využít nové možnosti AI-assisted vývoje.
2. Python si zaslouží svoje místo tam, kde dominuje — datová věda, AI prototyping, jednorázové agentní skriptování.
3. Pro distribuované nástroje a klientské aplikace ale dnes dává smysl vrátit se ke kompilovaným, soběstačným jazykům — Go, Rust, Zig.
4. Nebojte se oživovat staré dobré nástroje — moderní stack a AI jim dokážou vdechnout druhý život s minimálními náklady na údržbu.

Nové OmniDB 4.2 je ke stažení zdarma na 🔗 [www.omnidb.net](https://www.omnidb.net).

---

*Máte podobnou zkušenost s přepisem starého nástroje do jiného jazyka? Napište mi o tom.*
