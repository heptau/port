---
title: "Architektura bez boilerplate: Když se databáze stane API bránou a AI uživatelským rozhraním"
description: "Jak eliminovat celou backendovou vrstvu pomocí PgArachne a MCP, distribuovat systém z jediného binárního souboru a nechat AI agenty fungovat jako uživatelské rozhraní."
locale: "cs"
categories: ["AI", "PostgreSQL"]
date: 2026-06-23
tags: ["PostgreSQL", "PgArachne", "MCP", "AI", "architektura"]
draft: false
translation_id: "2026-06-23_1"
---

V softwarovém inženýrství existuje dlouhodobý sklon k vrstvení abstrakcí. Když dnes stavíme běžnou webovou aplikaci, typický technologický stack zahrnuje relační databázi, ORM vrstvu (Object-Relational Mapping), backendový framework (Node.js, Python, Go, .NET), validační knihovny, serializátory do formátu JSON a teprve na konci HTTP server, který tato data vystaví do sítě.

Ve výsledku tráví backendoví vývojáři obrovské množství času psaním takzvaného „boilerplate“ kódu – mechanickým překládáním databázových struktur do HTTP rout a validováním toho, co už často na úrovni databáze validováno je.

Pokud je ale byznys logika aplikace pevně spjatá s datovým modelem a integritou dat, nabízí se legitimní otázka: *Skutečně potřebujeme samostatnou backendovou aplikaci jen jako průtokový ohřívač na JSON?*

Přístup „databáze jako backend“ (Database-as-a-Backend) není konceptuálně nový. Nicméně v kombinaci s nástrojem [PgArachne](https://www.pgarachne.com) a novým standardem Model Context Protocol (MCP) získává zcela nový architektonický rozměr. Tento text podrobně rozebírá, jak lze s tímto stackem eliminovat celou jednu vrstvu aplikací, distribuovat kompletní systém z jediného binárního souboru a umožnit AI agentům fungovat jako samotné uživatelské rozhraní.

---

## 1. Architektonický posun: Od controllerů k čisté databázové logice

Tradiční REST API vyžaduje pro každou entitu definici routy, controlleru, middleware pro validaci, ošetření chyb a mapování na SQL dotaz. Pokud se změní struktura tabulky nebo business pravidlo, vývojář musí upravit kód na několika místech backendu a následně i na frontendu.

PgArachne tuto prostřední vrstvu kompletně eliminuje. Backendový vývoj se zde smršťuje do definice databázového schématu a PL/pgSQL (případně PL/v8 či PL/Python) funkcí. Nástroj sám funguje jako tenká, vysoce výkonná API brána napsaná v Go, která běží přímo před PostgreSQL a automaticky mapuje uložené procedury a funkce na **JSON-RPC 2.0 API**.

### Jak reflexe funguje v praxi

Jakmile v databázi existuje funkce přijímající a vracející datový typ `jsonb`, PgArachne ji skrze reflexi systémových katalogů PostgreSQL (`pg_proc`, `pg_namespace`, `pg_argument`) okamžitě zaregistruje a vystaví světu. Žádné restarty serveru, žádné kompilace.

Představme si jednoduchou funkci pro registraci uživatele:

```sql
CREATE OR REPLACE FUNCTION api.register_user(params jsonb)
RETURNS jsonb AS $$
DECLARE
   new_user_id uuid;
   user_email text;
BEGIN
   user_email := lower(trim(params->>'email'));

  -- Validace přímo v databázi
   IF user_email !~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'
   THEN
      RAISE EXCEPTION 'Invalid email address' USING ERRCODE = '22000';
   END IF;

   INSERT INTO users (email, password_hash)
   VALUES (user_email, crypt(params->>'password', gen_salt('bf')))
   RETURNING id INTO new_user_id;

   RETURN jsonb_build_object(
      'status', 'success',
      'user_id', new_user_id
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION api.register_user(jsonb) IS 'Registers a new user and returns the user ID. Expects email and password fields.';
```

PgArachne tuto funkci automaticky mapuje na JSON-RPC endpoint. Klientská aplikace (nebo AI agent) pak posílá standardní POST požadavek s tělem:

```json
{
   "jsonrpc": "2.0",
   "method": "api.register_user",
   "params": {
      "email": "user@port80.cz",
      "password": "SuperSecretPassword123"
   },
   "id": 1
}
```

### Hybridní přístup: Od univerzálního CRUDu k přísné logice

Tento model často naráží na obavy z přílišné rigidity. Co když na začátku projektu nechci psát SQL funkci pro každou tabulku? A co když naopak později potřebuji extrémně komplexní validace? PgArachne podporuje hybridní strategii:

1. **Univerzální funkce (Rychlé MVP):** Na startu projektu lze povolit generické CRUD funkce, které umožňují klientské aplikaci přímo dotazovat, filtrovat a modifikovat tabulky (podobně jako to dělá PostgREST). Vývoj frontendu tak může běžet okamžitě.
2. **Dedikované RPC funkce (Produkční hardening):** Jakmile projekt roste a vyžaduje striktní byznys procesy (např. transakční zpracování objednávky s vazbou na stav skladu), univerzální přístup se pro danou entitu uzavře a nahradí se izolovanou SQL funkcí. Pro klientskou aplikaci se navenek nic nemění – stále komunikuje JSON-RPC protokolem.

---

## 2. Bezpečnostní model: Přepínání identit přes `SET LOCAL ROLE`

Jednou z nejčastějších námitek proti architektuře „databáze jako backend“ je otázka bezpečnosti. Pokud klientská aplikace komunikuje přímo s databázovou bránou, jak zabránit tomu, aby uživatel A nečetl data uživatele B?

PgArachne nespravuje autorizaci ani přístupová práva ve vlastní režii. Místo toho stoprocentně deleguje bezpečnost na prověřené jádro PostgreSQL a mechanismus **Row-Level Security (RLS)**.

### Jak to funguje v databázi:

1. **Autentizace (BYO-JWT):** PgArachne podporuje model *Bring Your Own JWT*. Můžete použít jakéhokoli externího poskytovatele identit (Auth0, Clerk, Supabase Auth, nebo vlastní mikroslužbu), který podepisuje tokeny. Bráně pouze předáte veřejný klíč (JWKS) pro ověření signatury.
2. **Kontext požadavku:** Když přijde HTTP požadavek, PgArachne ověří JWT, extrahuje z něj claims (např. ID uživatele a jeho roli) a otevře transakci do PostgreSQL.
3. **Izolace na úrovni transakce:** Na samém začátku transakce vykoná brána sérii příkazů nastavení kontextu:
 ```sql
   SET LOCAL ROLE authenticated;
   SELECT set_config('app.current_user_id', '123e4567-e89b-12d3-a456-426614174000', true);
   ```
4. **Uplatnění pravidel RLS:** Pokud máte nad tabulkou `orders` definovanou RLS politiku, PostgreSQL automaticky zajistí, že jakýkoli následný dotaz (i vnořený uvnitř komplexní funkce) uvidí pouze data patřící danému uživateli:
 ```sql
   CREATE POLICY order_isolation_policy ON orders
   FOR ALL
   TO authenticated
   USING (user_id = current_setting('app.current_user_id')::uuid);
   ```

Díky tomuto přístupu je zcela eliminována celá třída bezpečnostních zranitelností typu IDOR (Insecure Direct Object Reference), které běžně vznikají chybou vývojáře v backendových controllerech. Bezpečnost je definována deklarativně přímo u dat.

---

## 3. Distribuce z jednoho bináru: Statický frontend a JAMstack bez kompromisů

Moderní deployment často připomíná infrastrukturní noční můru. Potřebujete spravovat Docker kontejnery pro Node.js backend, nastavit CDN (Content Delivery Network) pro distribuci Single Page Aplikace (React/Vue/Svelte), vyřešit CORS (Cross-Origin Resource Sharing) politiky a nakonfigurovat reverzní proxy (Nginx/Traefik), která to celé spojí dohromady.

PgArachne k tomuto přistupuje s pragmatickou jednoduchostí jazyka Go. Obsahuje v sobě integrovaný, vysoce optimalizovaný server pro statické soubory. To umožňuje kompletně změnit strategii nasazení aplikace.

### Monolitická distribuce s výhodami microservices

Celou klientskou aplikaci můžete postavit jako čistě statický frontend – bez server-side renderingu (SSR), pouze optimalizované HTML, CSS a klientský JavaScript. Tyto soubory se nahrají do složky, kterou PgArachne servíruje.

Výhody tohoto přístupu jsou zásadní:

* **Nulová režie na straně API:** Klientská aplikace i API běží na stejné doméně, stejném portu a ze stejného binárního souboru. Tím odpadá jakákoli konfigurace CORS a snižuje se režie na síťový handshake (vše běží přes jedno HTTP/2 nebo HTTP/3 spojení).
* **Dokonalá cachovatelnost:** Statické assety jsou neměnné. PgArachne jim automaticky generuje správné hlavičky `ETag` a `Cache-Control`. Celý frontend tak může být extrémně efektivně cachován přímo v prohlížeči uživatele nebo na okraji sítě (Edge/Cloudflare), zatímco PgArachne zpracovává pouze čistá JSON-RPC data.
* **Jednoduchost CI/CD:** Nasazení nové verze aplikace znamená pouze stažení jednoho binárního souboru, nakopírování složky se statickým frontendem a spuštění. Žádné závislosti na `node_modules` v produkčním prostředí, žádné riziko memory leaků z těžkých backendových runtime prostředí.

### Real-time komunikace bez komplexity WebSocketů

Pokud klientská aplikace vyžaduje živá data – například real-time notifikace, aktualizace skladových zásob nebo chat – vývojáři obvykle sahají po WebSocketech. Ty jsou však náročné na zdroje, špatně se škálují přes load balancery a vyžadují komplexní stavovou logiku na backendu.

PgArachne tento problém řeší nativní podporou pro **Server-Sent Events (SSE)** spojenou s databázovým mechanismem `LISTEN/NOTIFY`.

Když se v databázi stane změna (např. přes trigger), PostgreSQL vyvolá událost:
```sql
NOTIFY channel_orders_updates, '{"order_id": 501, "status": "shipped"}';
```
PgArachne zachytí ono oznámení a okamžitě ho přepošle přes otevřené HTTP spojení na frontend pomocí standardního klientského rozhraní `EventSource` v JavaScriptu:

```javascript
const evtSource = new EventSource("/api/stream?channel=orders_updates");
evtSource.onmessage = (event) => {
   const data = JSON.parse(event.data);
   console.log("Objednávka aktualizována:", data);
};
```
Vše běží jednosměrně, efektivně, přes standardní HTTP protokol a bez nutnosti implementovat dedikované message brokery typu Redis.

---

## 4. Model Context Protocol (MCP): Éra aplikací bez grafického rozhraní (Zero-UI)

Nejzajímavější technologický zlom, který PgArachne přináší, se však netýká úspory řádků kódu u klasického webového vývoje, ale integrace s ekosystémem umělé inteligence skrze **Model Context Protocol (MCP)**.

MCP je otevřený protokol (původně navržený společností Anthropic), který definuje uniformní způsob, jakým mohou LLM modely (jako Claude, GPT či lokální modely) bezpečně komunikovat s externími datovými zdroji, souborovými systémy a aplikačními rozhraními. PgArachne v sobě obsahuje nativní implementaci MCP serveru.

### Sebedokumentující API jako sada nástrojů (Tools)

Když propojíte PgArachne s vývojovým prostředím (např. Cursor, Claude Desktop, nebo vlastní autonomní agent), brána provede introspekci dostupných SQL funkcí a představí je AI modelu jako jeho interní nástroje (*tools*).

Klíčovým prvkem jsou standardní SQL komentáře. AI modely nepotřebují číst zdrojový kód tabulek, potřebují srozumitelnou sémantiku. PgArachne bere text z příkazu `COMMENT ON FUNCTION` a předává ho LLM jako systémovou instrukci pro daný nástroj.

Pokud model dostane za úkol zjistit stav byznysu, podívá se do schématu nástrojů a najde funkci s popisem: *„Vrátí celkový obrat a počet objednávek za specifikované období.“* Model sám pochopí, jaké parametry (`date_from`, `date_to`) musí vygenerovat, sestaví validní JSON-RPC požadavek, PgArachne ho bezpečně vykoná a model interpretuje surová data uživateli do srozumitelného textu či grafu.

### Koncept Zero-UI: Když grafické rozhraní vůbec nevznikne

U velkého množství interních podnikových systémů, analytických nástrojů, B2 B rozhraní nebo správcovských konzolí je tvorba grafického uživatelského rozhraní (GUI) čistým plýtváním inženýrským časem. Vývojáři tráví týdny tvorbou tabulek, filtrů, select-boxů a grafů jen proto, aby manažer nebo analytik mohl kliknutím vyexportovat data.

S architekturou PgArachne + MCP se otevírá cesta k takzvanému **Zero-UI (nulovému rozhraní)**:

1. **Žádný frontendový kód:** Nevytváříte žádný React, žádné formuláře, žádné CSS.
2. **Přirozený jazyk jako univerzální rozhraní:** Uživatel komunikuje přímo s AI agentem (např. přes chat nebo hlasové rozhraní).
3. **Autonomní exekuce:** Uživatel zadá: *„Najdi mi top 5 zákazníků, kteří u nás tento měsíc utratili nejvíce peněz, ale jejichž poslední objednávka byla před více než 10 dny. Chci jim poslat retenční e-mail.“*
4. **Zpracování:** AI agent identifikuje potřebné funkce vystavené přes PgArachne, v transakčním a bezpečném režimu (přes RLS) vytáhne přesná data, zformátuje je do přehledné tabulky a rovnou navrhne texty e-mailů.

Byznys logika a integrita zůstávají stoprocentně pod kontrolou v PostgreSQL, přenos dat zajišťuje bleskový Go server a flexibilní uživatelskou vrstvu generuje AI dynamicky podle aktuální potřeby uživatele.

---

## 5. Kdy tuto architekturu (ne)nasadit: Limity a rizika

Každé architektonické rozhodnutí je kompromis (trade-off). Architektura „databáze jako backend“ není stříbrnou kulkou a má specifické limity, které je nutné před nasazením vyhodnotit.

### Vhodné scénáře (Sweet Spots)
* **Datově intenzivní aplikace a MVP:** Projekty, kde je rychlost uvedení na trh klíčová a kde většina operací jsou transakce nad databázovým schématem.
* **Interní firemní nástroje a ERP sub-systémy:** Systémy, kde je primárním požadavkem bezpečnost, rychlost vyhledávání a možnost snadné integrace s AI agenty pro reportování.
* **Aplikace s vysokými nároky na real-time aktualizace:** Díky přímému propojení SSE a `NOTIFY` bez nutnosti stavět komplexní infrastrukturu pro WebSockety.

### Nevhodné scénáře (Kdy raději zvolit klasický backend)
* **Silná závislost na externích třetích stranách:** Pokud vaše API musí při každém požadavku komunikovat se třemi dalšími REST API (Stripe, Salesforce, interní mikroslužby), psaní těchto integrací přímo v PL/pgSQL (např. přes extenzi `http`) bývá neohrabané a špatně se testuje. Zde je klasický backend v Go či Node.js vhodnější.
* **Těžké výpočetní operace (CPU-bound):** PostgreSQL je navržen pro efektivní I/O operace a správu dat. Pokud aplikace vyžaduje komplexní zpracování obrazu, pokročilou kryptografii nebo těžké matematické simulace, exekuce uvnitř databázového procesu by mohla zablokovat zdroje pro ostatní transakce.
* **Komplexní orchestrace mikroslužeb:** V distribuovaných systémech, kde je databáze pouze jedním z mnoha komponentů a byznys logika vyžaduje koordinaci podle vzorů jako Saga nebo Event Sourcing, plní klasická backendová vrstva roli orchestrátoru, kterou databáze sama o sobě efektivně nezvládne.

---

## Závěr: Pragmatická štíhlost pro moderní éru

Architektura postavená na kombinaci PostgreSQL, PgArachne a Model Context Protocol představuje radikální návrat k technické střízlivosti. Ukazuje, že velká část komplexity, kterou do moderních softwarových projektů vnášíme, je způsoena pouze snahou neustále přenášet a transformovat data mezi nekompatibilními vrstvami.

Odstraněním mezivrstev – tedy zrušením klasické backendové aplikace a jejím nahrazením tenkou, vysoce optimalizovanou bránou – získáváme systém, který vykazuje minimální režii, je extrémně snadno nasaditelný a nativně připravený pro integraci s AI. Budoucnost vývoje nemusí spočívat v psaní tisíců řádků tranzitního kódu, ale v precizním definování datového modelu a byznys logiky přímo tam, kde jsou data doma.
