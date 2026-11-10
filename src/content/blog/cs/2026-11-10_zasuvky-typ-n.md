---
title: "Evropa sjednotila napětí, ale ne zásuvky. Šlo by to napravit, aniž by kdokoli musel vyměnit jedinou"
description: "Typ N (IEC 60906-1) je bezpečnější, menší a mezinárodně standardizovaný. Evropa ho nemusí nařizovat. Stačilo by ho povolit a nechat trh, aby se postupně sjednotil sám."
locale: "cs"
categories: ["Standards & Society"]
date: 2026-11-10
tags: ["zásuvky", "typ N", "IEC 60906-1", "230 V", "EU", "bezpečnost", "standardizace", "jednotný trh"]
draft: false
translation_id: "2026-11-10_1"
---

Napětí v zásuvce máme v celé Evropě od přelomu tisíciletí stejné: 230 V, 50 Hz. Jenže jakmile přejedete hranici, často potřebujete adaptér. Unie umí sjednotit nabíječky mobilů, ale zásuvky, do kterých se ty nabíječky zapojují, zůstaly tak, jak je před sto lety vymyslel každý stát zvlášť.

![Přehled zásuvek a zástrček používaných v Evropě i ve světě, kolíky ve stejném měřítku; čárkované jsou neověřené rozměry](/images/2026-11-10_zasuvky-prehled.svg)

Zkusil jsem zjistit, proč. A zjistil jsem dvě věci. Za prvé existuje mezinárodní norma, která byla navržena právě jako společná zásuvka pro oblasti s 230 V. Za druhé: Evropa o sjednocení zásuvek už několikrát vážně uvažovala a pokaždé to ztroskotalo na jediné věci — **na ceně nucené výměny**. Dnes si myslím, že existuje cesta, která žádnou výměnu nepotřebuje.

## Zásuvka, která měla být společná

Norma **IEC 60 906–1** (první vydání 1986, současné z roku 2009) popisuje třípólovou zásuvku a zástrčku na 16 A / 250 V, označovanou jako **typ N**. Její vlastnosti jsou jasné: zástrčku nelze zasunout obráceně, takže polarita je dána tvarem; zásuvka má clonky na živých otvorech; kolíky fáze a nuláku jsou u základny izolované; ochranný kolík se spojí jako první. Kolíky mají průměr 4,5 mm, rozteč 19 mm a zemní kolík je odsazený o 3 mm.

Je to zároveň malá zásuvka. Zástrčka typu N má plochu asi 4,6 cm², zatímco Schuko asi 10 cm². Dvě zásuvky N se prý vejdou na místo jedné Schuko nebo britské BS 1363.

Typ N je velmi podobný švýcarskému typu J, který se ve Švýcarsku používá od padesátých let. Rozdíl je v detailech: J má kolíky Ø 4,0 mm, zem odsazenou o 5 mm a opačnou polaritu. Není to náhoda; typ N vznikl jako dotažení stejné myšlenky.

![Typ N (plné kolíky) a švýcarský typ J (červeně čárkovaně) přes sebe: stejná rozteč 19 mm, jiný průměr kolíků a odsazení zemního kolíku](/images/2026-11-10_zasuvky-n-vs-j.svg)

Důležitá je i zpětná kompatibilita. Dvoukolíkový **Europlug** (Ø 4,0 mm, rozteč 19 mm) do zásuvky N podle dostupných zdrojů zapadne: v Jižní Africe, kde je typ N zavedený, se uvádí, že tamní zásuvka Europlug přijímá a že je to dokonce výslovně počítáno (norma SANS 164–5 pro Europlug a SANS 164–2 pro zásuvku). Rozteč 19 mm je stejná jako u většiny evropských zásuvek. Proč přesně to tvůrci normy navrhli, se mi dohledat nepodařilo; je to ale přesně ta vlastnost, která by v Evropě přechod usnadnila, protože nabíječky, routery a spousta dalších zařízení by do nové zásuvky zapadla beze změny.

A ještě jedna drobnost, ke které jsem v dostupných zdrojích nenašel definitivní odpověď: **kde má být u zásuvky zemní kolík, nahoře, nebo dole.** Jedna z dostupných informací říká jen to, že při zemním kontaktu nahoře je fáze vpravo a nulák vlevo, což by naznačovalo, že montáž sama není předepsaná, jen polarita vzhledem k zemi. Jestli to norma upřesňuje, nevím. Z hlediska bezpečnosti bych dal přednost **zemi dole**: když těžší kabel zástrčku vytahuje ze zásuvky, otáčí se kolem dolní hrany a horní kontakty se rozpojí jako první. Zem by tak zůstala spojená nejdéle. Je to můj technický úsudek, ne ověřený fakt, a protože je u typu N odsazení zemního kolíku jen 3 mm, bude rozdíl nejspíš malý. Podstatnější jsou délka kolíků, přítlak kontaktů, izolované kolíky a clonky.

## Co se dnes děje s polaritou

U nejrozšířenějších evropských zásuvek se dá zástrčka CEE 7/7 zapojit do Schuko dvěma způsoby. Fáze a nulák se tak dají zapojit opačně. Spotřebič s jednopólovým vypínačem pak může zůstat po vypnutí pod napětím. Při instalaci se navíc zvyklosti liší: v Česku se zapojuje fáze vlevo při ochranném kolíku nahoře, ve Francii se podle řady zdrojů zavedla praxe fáze vpravo. Žádná z těch zvyklostí se u spotřebiče nedá zaručit.

Nechci to přehánět. Platforma REFIT při Evropské komisi v roce 2017 konstatovala, že všechny používané systémy lze považovat za bezpečné. Jenže „nepředstavuje riziko za obvyklých podmínek“ není totéž co „je navržené tak, aby riziko nemohlo vzniknout“. Typ N je z druhé kategorie.

## A co v Česku?

U nás by typ N v domácí elektroinstalaci neprošel. Podle normy ČSN 33 2130 (vnitřní elektrické rozvody) musí zásuvky do 16 A odpovídat příslušným národním normám, což je v praxi ČSN 35 4516, a musí mít ochranný kontakt připojený na ochranný vodič. Typ N mezi národními normami není, a tak by ho revizní technik, který kontroluje shodu instalace s ČSN, nejspíš neschválil. Stejné pravidlo znamená, že u nás nelze nainstalovat ani zásuvku jen pro dvoupólové zástrčky, i když se v domácnosti většina přístrojů (nabíječky, lampičky, router) zapojuje právě takhle. Každá zásuvka tak zabírá místo kvůli kolíku, který se často nepoužije.

Pro úplnost: ČSN 33 2130 má od 1. ledna 2025 čtvrté vydání, takže přesné znění je třeba brát z něj; to, co tu uvádím, vychází ze staršího vydání a z toho, že ČSN 35 4516 definuje českou zásuvku. České normy navíc nejsou obecně závazné: podle judikatury se závaznými stávají jen tam, kde na ně odkazuje právní předpis, a ČSN 33 1500 (revize) sama říká, že požadavky bezpečnosti se považují za splněné, pokud zařízení odpovídá normám. Revizní technik tedy posuzuje shodu s ČSN, ne s IEC, a zásuvka, která žádné české normě neodpovídá, by revizí zřejmě neprošla. Že by ji někde výslovně zakazoval právní předpis, jsem ale nenašel. Je to tedy výklad, ne citace.

## Proč to nikdo nesjednotil

V polovině devadesátých let se o společné evropské zásuvce vážně jednalo v CENELEC. Odborníci se podle dostupných zdrojů na technických parametrech dohodli, ale hlasování o normě skončilo neúspěchem a CENELEC prohlásil, že v dohledné době žádný harmonizovaný evropský systém nebude.

V roce 2017 se věcí zabývala platforma REFIT, která posuzuje, jak zjednodušit unijní předpisy. Reagovala na podnět občana, který žádal jednu zásuvku pro celou EU. Doporučila **nesjednocovat**, a její důvody stojí za přečtení. Varianta, kterou posuzovala, totiž počítala se **sjednocením vynuceným legislativou**: vyměnit zásuvky i zástrčky spotřebičů v celé Evropě. Odhad byl **100 miliard eur**, **přechod delší než 75 let** a asi **700 tisíc tun elektroodpadu**. Při takové ceně dává „ne“ smysl.

Z dokumentu se ale dá vyčíst i něco jiného. Šestnáct členských států podpořilo doporučení nesjednocovat legislativně, ale dva státy navrhly, aby Komise zkoumala sjednocení v rámci existujících systémů prostřednictvím normalizace. Jeden stát navrhl zvážit, zda zásuvky zařadit pod směrnici o nízkém napětí. Skupina odborníků LVD AdCo už měla návrh na sjednocení francouzského a německého systému. Jiný stát poznamenal, že výrobky s více druhy zástrček nejsou na jednotném trhu volně obchodovatelné a že sjednocení sníží používání adaptérů, které jsou jen dočasným řešením. Nikdo neříkal, že se status quo líbí; říkali, že vyměňování je příliš drahé.

## Co když nikdo nic vyměňovat nemusí

Právě tohle mění pohled. Nenavrhuju, aby EU nařídila typ N a všichni vyměnili zásuvky. Navrhuju něco mnohem skromnějšího: aby **typ N byl v celé Unii přípustný vedle stávajících zásuvek**. Žádná povinnost, žádný termín, žádné náklady pro domácnosti, které si s tím nechtějí dělat starosti.

Rozdíl proti variantě z REFIT je zásadní:

| | Nucená výměna (REFIT, varianta B) | Povolení typu N |
|---|---|---|
| Co se nařizuje | výměna zásuvek i zástrček | nic |
| Náklady pro domácnosti | odhad 100 mld. € | žádné |
| Přechod | více než 75 let | podle trhu |
| Elektroodpad | asi 700 tis. tun | žádný navíc |

Co by to přineslo? Nové budovy a rekonstrukce by mohly postupně přecházet na jednu bezpečnější zásuvku. Výrobci by si časem mohli dovolit jednu zástrčku místo několika. Jen jedno dlouhodobé nebezpečí: dočasné souběžné používání adaptérů. To je cena každého přechodu, a Jižní Afrika ji platí už dnes.

## Příklady, že to jde

**Jižní Afrika** přijala IEC 60 906–1 jako normu SANS 164–2, kterou podle zpráv SABS pro nové instalace **povinně zavedla**. Počítá se s přechodným obdobím 10–20 let, během kterého se nová zástrčka dá přes adaptér zapojit do staré zásuvky. Nová zásuvka přitom prý přijímá i Europlug. Nic se nevyhazuje; nová zásuvka se prostě objevuje v nových budovách.

**Brazílie** zavedla vlastní, IEC podobnou normu NBR 14 136 (10 A a 20 A, bez clonek) s konečným termínem 1. července 2011, kdy skončil prodej starých zástrček. Brazílie měla dřív směs různých zástrček a dvě napětí. Přechod zvládla.

**Paraguay** převzala IEC 60 906–1 v roce 2022, zatím dobrovolně.

A v samotné Evropě: **USB-C**. Po letech dobrovolných slibů výrobců stanovila směrnice (EU) 2022/2380 jednu nabíječku pro telefony, tablety a další zařízení od 28. prosince 2024 a pro notebooky od 28. dubna 2026. Nikdo nepochybuje, že to uživatelům i výrobcům pomohlo. U zásuvek stačí méně: ne přikázat standard, jen ho nezakazovat.

## Co by mohla Evropa udělat

Zásuvky pro domácnost jsou dnes ze směrnice o nízkém napětí 2014/35/EU **vyňaty** a spadají do národních předpisů. Proto se na úrovni EU nic neděje: není nástroj, kterým by se dalo začít. Ale nástroje existují. Komise může požádat CENELEC o normu, která by IEC 60 906–1 uznala jako přípustný systém. Může zvážit, zda zásuvky zařadit pod směrnici o nízkém napětí, jak navrhoval jeden z členských států v rámci REFIT. A může se opřít o práci, kterou už skupina LVD AdCo odvedla na sjednocení francouzského a německého systému.

Nepotřebujeme revoluci. Potřebujeme jedno rozhodnutí: že lepší standard nebude zakázaný jen proto, že existuje starý.

## Shrnutí

| | Dnes | Po povolení typu N |
|---|---|---|
| Typů zásuvek v EU | několik, nejednotných | stejné, plus jedna uznaná alternativa |
| Polarita | záleží na instalaci a zvyklostech | daná tvarem |
| Velikost | ≈ 10 cm² (Schuko) | ≈ 4,6 cm² |
| Cena pro domácnosti | — | žádná |
| Přechod | žádný | postupný, podle trhu |

*Pracoval jsem především s dokumentem platformy REFIT z 21. 9. 2017, textem normy IEC 60 906–1 a veřejnými zprávami; kde mohou být zdroje nepřesné, upozorňuju na to v textu. Chyby nebo doplnění mi klidně napište.*
