---
title: "Aplikace v sandboxu: Když izolace odřízne databázi od .pgpass"
description: "Jak jsem převedl OmniDB do macOS Sandboxu a narazil na nepřístupný soubor .pgpass — a jak vypadá bezpečný UX udělování práv na vyžádání na macOS, Linuxu i Windows."
locale: "cs"
categories: ["PostgreSQL", "Software Engineering"]
date: 2026-09-09
tags: ["sandbox", "macOS", "Linux", "Windows", "bezpečnost", "PostgreSQL", "OmniDB", "Flatpak", "MSIX"]
draft: false
translation_id: "2026-09-09_1"
---

Jako vývojáři chceme dělat bezpečné aplikace. Jedním z nejlepších kroků k ochraně uživatele je zavřít aplikaci do sandboxu (izolovaného prostředí). Sandbox zajistí, že i kdyby se v aplikaci našla zranitelnost, útočník nemůže volně procházet uživatelský disk ani číst citlivá data jiných programů.

Jenže bezpečí má svou daň v podobě vývojářských i uživatelských překážek. Nedávno jsem převáděl OmniDB do sandboxu na macOS a velmi rychle narazil na klasický problém: aplikace zničehonic nemohla načíst hesla k PostgreSQL databázím.

---

## 1. Příběh z praxe: Kde je můj `.pgpass` a proč je správně, že je schovaný?

PostgreSQL běžně používá soubor `~/.pgpass` uložený v domovském adresáři uživatele. Tento soubor obsahuje v čistém textu přístupové údaje (hostitele, porty, databáze, uživatele a hesla).

Jakmile jsem [OmniDB](https://www.omnidb.net) zavřel do macOS Sandboxu, systém aplikaci striktně odřízl od domovského adresáře. OmniDB se nemohl k databázi připojit, protože `.pgpass` jednoduše neviděl.

## 2. Proč je přístup „jen na vyžádání“ vlastně výhra pro bezpečnost?

Na první pohled to byla komplikace, ale zpětně vzato jde o skvělý bezpečnostní prvek. Soubor `.pgpass` často obsahuje desítky hesel k produkčním i vývojovým databázím. Opravdu chcete, aby libovolná stažená aplikace měla automaticky přístup k takovému „pokladu“? Rozhodně ne. Pokud by neprověřená aplikace získala plný přístup k tomuto souboru, mohla by všechna vaše hesla bez vědomí odeslat pryč.

## 3. Jak jsem to vyřešil na macOS?

Místo žádosti o široké oprávnění k celému disku (což popírá smysl sandboxu) jsem zvolil řešení řízené uživatelem a principem minimálních práv:

1. Pokud se OmniDB pokusí připojit k databázi a selže to kvůli chybějícím právům k `.pgpass`, rozhraní zobrazí jasnou chybovou hlášku.
2. Součástí hlášky je tlačítko pro udělení práv.
3. Po kliknutí se otevře systémový dialog (`NSOpenPanel`), kde uživatel ručně vybere soubor `.pgpass` (nebo mu potvrdí přístup).
4. Systém macOS předá aplikaci tzv. Security Scoped Bookmark — výjimku, díky které aplikace získá k tomuto konkrétnímu souboru trvalý a legitimní přístup.

Uživatel ví, co a proč aplikaci zpřístupňuje, a zbytek disku i ostatní soubory zůstávají neprodyšně chráněny.

## 4. macOS Sandbox z pohledu UX a vývojáře: skvělá myšlenka, ale zvláštní logika

Na macOS je na sandboxu skvělé to, že může být součástí jakékoliv aplikace, bez ohledu na to, jak se do počítače dostala — z App Store, GitHubu nebo jako `.dmg` balíček ze stránek vývojáře. Při práci s ním mě ale zarazilo několik nelogičností:

### 4.1 Poznáte sandbox až ve chvíli, kdy už může být pozdě

Jako uživatel, který dbá na bezpečnost, bych chtěl před spuštěním neznámé aplikace vědět, zda poběží v izolovaném sandboxu, nebo má plný přístup k mému systému.

Kde byste takovou informaci čekali? Logicky v okně informací o souboru (Cmd + I ve Finderu). Jenže tam o sandboxu nenajdete ani zmínku. Grafické rozhraní macOS nabízí jediné místo, kde se to dá zjistit — Monitor aktivity (Activity Monitor), kde je potřeba zapnout sloupec Sandbox a podívat se na již spuštěný proces. To je ale absurdní: ve chvíli, kdy to v Monitoru aktivity zjistíte, už nebezpečná aplikace běží a mohla napáchat škody.

Zjistit to dopředu jde jen z příkazové řádky:

```bash
codesign -d --entitlements - /Applications/OmniDB.app
```

Ve výpisu hledáte `com.apple.security.app-sandbox`. Funguje to, ale běžný uživatel — tedy přesně ten, koho má sandbox chránit — do Terminálu nepůjde.

### 4.2 Apple by měl být k sandboxovaným aplikacím mírnější

Apple dnes velmi přísně blokuje spouštění aplikací z neznámých zdrojů (Gatekeeper, nutnost drahého vývojářského účtu a notarizace). Pokud se ale vývojář sám rozhodne svou aplikaci dobrovolně uzavřít do striktního sandboxu a svázat si ruce, měl by být systém při stahování z neznámých míst mírnější. Pokud aplikace běžící v izolaci nemá přístup k souborům ani systému, riziko pro uživatele dramaticky klesá.

### 4.3 Zbytečné překážky při ad-hoc podepisování

Pokud vývojář aplikaci podepíše pouze lokálně/ad-hoc (`codesign -s -`), macOS mu neumožní nastavit určité sandboxové nároky (entitlements). Vývojář je nucen vytvořit si vlastní self-signed certifikát, jen aby mohl sandbox s oprávněními lokálně testovat. V praxi to ale nepřináší vůbec žádnou reálnou bezpečnost navíc — je to jen zbytečný byrokratický krok při vývoji.

## 5. Jak přenést stejný koncept na Linux a Windows?

Zatím mám tento systém udělování práv na vyžádání plně funkční na macOS. OmniDB je ale multiplatformní nástroj, takže nyní řeším, jak přesně stejný koncept (tlačítko v aplikaci → systémový dialog → udělení výjimky) přenést na ostatní systémy.

- **Linux (Flatpak a XDG Portals):** Pro Linux plánuji použít Flatpak. Ten pro komunikaci se systémem mimo sandbox používá tzv. XDG Desktop Portals. Portály fungují architektonicky velmi podobně jako macOS — když aplikace požádá o výběr souboru přes portál, dialog vykresluje přímo systém (nikoliv aplikace). Jakmile uživatel v dialogu vybere `.pgpass`, portál aplikaci předá oprávnění číst tento konkrétní soubor.
- **Windows (MSIX a AppContainer):** Na Windows je cílem zabalení do MSIX, kde aplikace běží v prostředí AppContainer. Zde se využije systémové rozhraní `FileOpenPicker`. Pokud uživatel vybere soubor skrz tento nativní dialog Windows, AppContainer udělí aplikaci přístupový token k danému souboru.

Princip tak zůstane na všech platformách totožný: aplikace v základu nevidí nic, ale uživatel jí může jedním kliknutím v chybovém okně bezpečně zpřístupnit přesně ten jeden soubor, který potřebuje.

## 6. Přehled možností sandboxování: jak je to na různých OS obecně?

Kromě toho, co plánuji použít pro OmniDB, existuje na jednotlivých platformách celá řada dalších přístupů. Rozdělují se na systémová (nativní) řešení a na nástroje třetích stran či kontejnery.

### 6.1 macOS

- **Nativní řešení:** Apple App Sandbox (pomocí entitlements přímo v systému).
- **Alternativy:** Spuštění v Dockeru nebo v lightweight virtuálním stroji (např. přes Virtualization.framework, UTM, Parallels).

### 6.2 Linux

- **Nativní/balíčkovací řešení:**
  - **Flatpak:** Využívá pod kapotou `bubblewrap` (namespaces, seccomp). Standard pro izolované GUI aplikace.
  - **Snap:** Řešení od Canonicalu využívající AppArmor profily.
- **Alternativy pro běžné balíčky (DEB, RPM, AppImage):**
  - **Firejail:** Skvělý nástroj, kterým může uživatel sám „obalit“ libovolnou existující aplikaci a zamezit jí čtení např. `~/.ssh` nebo `~/.pgpass`.
  - **systemd/cgroups/bubblewrap:** Vlastní skripty pro izolaci procesů na úrovni systému.
  - **Docker/Podman:** Skvělé pro CLI a servery, ale u GUI aplikací naráží na složité předávání X11/Wayland socketů.

### 6.3 Windows

- **Nativní řešení:**
  - **MSIX (AppContainer):** Oficiální izolovaný kontejner od Microsoftu s virtuálním registrem i souborovým systémem.
- **Alternativy:**
  - **Sandboxie-Plus:** Populární open-source nástroj. Umožňuje spustit jakýkoliv klasický `.exe` v izolovaném „pískovišti“ bez úpravy aplikace.
  - **Windows Sandbox:** Rychlé jednorázové virtuální prostředí založené na Hyper-V. Vhodné na otestování podezřelého souboru ze sítě (po zavření se vše smaže).

## 7. Proč je nativní systémové řešení vždycky nejlepší volba?

I když na Linuxu či Windows existují různé nástroje třetích stran (Firejail, Sandboxie) nebo kontejnery (Docker), pro vývojáře desktopové aplikace je vždy nejlepší zvolit nativní systémové řešení (App Sandbox, Flatpak, MSIX).

Důvody jsou jednoduché:

1. **Uživatelský komfort (UX):** Nativní sandbox umí uživateli zobrazit systémový dialog ve chvíli, kdy aplikace potřebuje soubor. Uživatel ani nepozná, že aplikace běží v izolaci.
2. **Výkon:** Nativní izolace využívá přímo jádro operačního systému (namespaces, AppArmor, AppContainer). Neběží pod ní žádná těžkopádná virtualizace.
3. **Udržitelnost:** Spoléháte na standard, který udržuje tvůrce OS (Apple, Microsoft, komunita Flatpaku), ne na nástroje třetích stran, které mohou s další aktualizací systému přestat fungovat.

## 8. Závěr: bezpečnost musí dávat smysl uživateli i vývojáři

Případ s OmniDB a souborem `.pgpass` ukazuje dvě věci:

1. **Bezpečnost na vyžádání funguje:** Odepřít aplikaci automatický přístup k citlivým souborům s hesly a vyžádat si ho až přes explicitní akci uživatele v UI je správná cesta k ochraně soukromí.
2. **Systémy mají v UX sandboxu mezery:** Je škoda, že macOS nedává uživateli jasně najevo (např. v `Cmd+I`), že spouští aplikaci v bezpečné izolaci, a že vývojářům klade do cesty zbytečné překážky jako nutnost self-signed certifikátů pro pouhé lokální testování.

Sandbox by neměl být pro uživatele „černá skříňka“ a pro vývojáře „nutné zlo“, ale transparentní standard, ze kterého těží obě strany.

---

*Řešíte podobný problém se sandboxem ve své aplikaci? Napište mi, jak jste ho vyřešili.*
