---
title: "Das Ende der Python-Ära? Wie mir KI half, ein 10 Jahre altes Tool in Go neu zu schreiben"
description: "Die Neuentwicklung von OmniDB von Python zu Go als Fallstudie — warum es im KI-Zeitalter keinen Sinn mehr ergibt, Laufzeitleistung auf dem Altar bequemer Programmierung zu opfern."
locale: "de"
categories: ["AI", "PostgreSQL"]
date: 2026-08-26
tags: ["OmniDB", "Python", "Go", "AI", "PostgreSQL", "Rust", "Software-Neuentwicklung"]
draft: false
translation_id: "2026-08-26_1"
---

Ist es nur mein Eindruck, oder lohnt es sich in letzter Zeit zunehmend, zu einer kompilierten Sprache zu greifen — auch dort, wo man früher automatisch Python gewählt hätte?

OmniDB war einst ein beliebtes PostgreSQL-GUI-Tool — aufgebaut auf Python/Django, mit einem Desktop-Frontend, das zunächst auf Electron lief und später gegen das leichtere NW.js ausgetauscht wurde. Das Projekt geriet nach und nach ins Stocken. Nicht, weil die Idee schlecht war, sondern weil die Wartung eines monolithischen Python-Stacks untragbar wurde. Dieser Artikel ist keine Anleitung zum Neuschreiben. Er ist eine Reflexion darüber, warum solche Projekte sterben — und wie ein moderner Stack zusammen mit KI die Spielregeln verändert.

**These:** Altsoftware neu zu schreiben, galt früher fast als Selbstmord („never rewrite from scratch“). Heute wird ein Rewrite dank des technologischen Wandels und der KI zunehmend zu einer rationalen Entscheidung — und ich bin mit dieser Beobachtung nicht allein, wie ein paar bekannte Beispiele großer Unternehmen zeigen.

---

## 1. Das alte Dogma: Entwicklerzeit ist teurer als CPU

> „Hardware ist billig, Entwicklerzeit ist teuer.“

Dieses Prinzip hat die Sprachenkriege der letzten fünfzehn Jahre gewonnen. Entwicklung in Python war schnell, die Syntax freundlich, die Bibliotheksauswahl riesig. Dass die Anwendung 150 MB RAM frisst und ein paar Sekunden zum Starten braucht? Egal — wir warten, kaufen eine stärkere Maschine. Praktisch alle populären Sprachen jener Ära (Python, JavaScript/TypeScript, Java) sind entweder interpretiert oder laufen auf einer virtuellen Maschine. Laufzeiteffizienz interessierte kaum jemanden, denn „die Hardware holt das schon auf.“

## 2. KI verändert die Gleichung

KI übernimmt heute das Schreiben von Boilerplate-Code, Refactoring und sogar die Konvertierung von Logik zwischen Sprachen. Die Zeit für das Schreiben von typisiertem, kompiliertem Code ist nicht mehr automatisch ein Vielfaches länger als in Python — KI kann ihn heute in Sekunden generieren.

Die Konsequenz: Wenn die Entwicklungskosten sinken, rücken **Laufzeiteffizienz, Reaktionsgeschwindigkeit und Speicherbedarf** wieder in den Vordergrund — genau das, was in den letzten fünfzehn Jahren bereitwillig für Entwicklerkomfort geopfert wurde.

Eine Frage zum Nachdenken: Ergibt es noch Sinn, für „bequemes Programmieren“ mit der Leistung der Anwendung zu bezahlen, wenn ein LLM den Code größtenteils ohnehin selbst schreibt?

## 3. Die Illusion der Bequemlichkeit, oder: Python-Deployment-Hölle

Python ist bequem zum **Schreiben** — aber es zum Nutzer zu bringen, ist eine andere Geschichte:

- virtuelle Umgebungen und Abhängigkeitskonflikte,
- unterschiedliche Interpreter-Versionen unter Linux/macOS/Windows,
- C-Bibliotheken, die für jede Plattform separat kompiliert werden müssen,
- PyInstaller/cx_Freeze als „Lösung“ — das Ergebnis: ein riesiger Ordner voller `.so`/`.dll`-Dateien,
- eine eigene CI-Konfiguration für jede Zielplattform.

Go löst das alles anders:

- **eine einzige statische Binärdatei** — keine Laufzeitumgebung, keine Abhängigkeiten,
- **Cross-Kompilierung mit einem Befehl** (`GOOS=linux`, `GOOS=darwin`, `GOOS=windows`) direkt von einer einzigen Maschine aus,
- **langfristige Wartbarkeit** — in zehn Jahren reicht es, die Binärdatei herunterzuladen und auszuführen. Kein `pip install`-Tanz, keine kaputten Abhängigkeitsketten.

Das Paradox: Die Entwicklung in Go ist am Ende einfacher und nachhaltiger, weil der Verwaltungsballast rund um das Deployment wegfällt. Was Pythons Bequemlichkeit am Anfang scheinbar an Zeit spart, kommt bei jedem Release als Schuld zurück.

## 4. Ich bin nicht allein — ähnliche Rewrites machen auch große Unternehmen

Das ist nicht nur das Gefühl eines einzelnen Entwicklers, der ein zehn Jahre altes Nebenprojekt wiederbelebt. In die gleiche Richtung — weg von bequemer, aber langsamerer Laufzeit hin zu schnellerer und vorhersehbarerer — bewegen sich in den letzten Jahren auch viele große Unternehmen:

- **Discord** hat seinen Read-States-Dienst (Nachverfolgung gelesener Nachrichten) von Go nach Rust neu geschrieben. Der Grund war nicht „Go ist schlecht“, sondern ein konkretes Problem: Der Garbage Collector in Go verursachte Latenzspitzen unter hoher Last. Rust ohne GC löste das Problem — und übertraf schon mit grundlegender Optimierung die handoptimierte Go-Version ([Discord Blog](https://discord.com/blog/why-discord-is-switching-from-go-to-rust)).
- **Dropbox** hat den Kern seiner Sync-Engine (interner Codename Nucleus) von Python nach Rust neu geschrieben. Das alte Datenmodell hatte keine stabilen Datei-Identifikatoren über Verschiebungen hinweg, und die Grenzen des Speicherbedarfs ließen sich nicht durch schrittweise Fixes beheben — nötig war ein neuer, deterministischer Single-Thread-Kern, der sich heute massiv per Fuzzing testen lässt. Nach eigenen Worten des Teams war Rust ein „Force Multiplier“ und eine der besten Entscheidungen, die sie getroffen haben ([Dropbox Tech](https://dropbox.tech/infrastructure/rewriting-the-heart-of-our-sync-engine)).
- **Uber** hat die Worker-Knoten seiner Schemaless-Datastore-Schicht von Python (Flask/uWSGI, ein Request pro Prozess) nach Go neu geschrieben, um leichtgewichtige Nebenläufigkeit zu nutzen, statt nur durch das Hinzufügen weiterer Prozesse zu skalieren. In eine ähnliche Richtung ging später ein größerer Teil ihrer Plattform — Python und Node.js reichten bei ihrem Verkehrsaufkommen nicht mehr für die Latenzbudgets aus ([Uber Blog](https://www.uber.com/en-IT/blog/schemaless-rewrite/)).
- **Cloudflare** veröffentlichte im Februar 2026, wie ein einzelner Ingenieur mit Hilfe von KI innerhalb einer Woche **vinext** von Grund auf neu gebaut hat — eine vollständige Neuimplementierung von Next.js auf Vite statt Turbopack, direkt auf Cloudflare Workers deploybar. Sie deckt 94 % der API-Oberfläche von Next.js 16 ab, baut 4,4 x schneller (1,67 s vs. 7,38 s), und das Client-Bundle ist 57 % kleiner (72,9 KB vs. 168,9 KB gzipped). Kosten: rund 1.100 USD an API-Tokens über ~800 OpenCode-Sitzungen. Nach eigenen Worten von Cloudflare wurde „fast jede Zeile Code in vinext von KI geschrieben“ — der Mensch kümmerte sich um Architekturentscheidungen, Priorisierung und Korrekturen, wenn die KI in eine Sackgasse geriet ([Cloudflare Blog](https://blog.cloudflare.com/vinext/)).

Der gemeinsame Nenner der ersten drei Fälle: Es ging nie um Mode oder „lass uns das neu schreiben, weil Go/Rust gerade angesagt ist.“ Es ging immer um eine konkrete, messbare Grenze — Latenz, Speicher, Vorhersehbarkeit —, die sich in der ursprünglichen Sprache nicht ohne grundlegende Architekturänderung beseitigen ließ. Cloudflare geht dann noch einen Schritt weiter und zeigt die These dieses Artikels selbst in Aktion: Was früher ein Team über Monate gebraucht hätte, schaffte hier eine Person in einer Woche — zu Kosten, die weit unter dem Monatsgehalt eines einzelnen Entwicklers liegen.

## 5. Fallstudie: OmniDB in Zahlen

Ein direkter Vergleich des alten OmniDB 3.2 (Python/Django + NW.js) und der neuen Version OmniDB 4.2 (Go/Wails), gemessen auf derselben Maschine:

| Metrik | Altes OmniDB 3.2 (Python/NW.js) | Neues OmniDB 4.2 (Go/Wails) | Unterschied |
|---|---|---|---|
| Größe der `.app` | 478 MB | 73 MB | −405 MB (−85 %) |
| Download-Archiv | 201 MB | 28 MB | −173 MB (−86 %) |
| Start des Backend-Servers (bis „listening“) | 0,32 s | 0,05 s | ~6 x schneller |
| RSS des Backends im Leerlauf | 104 MB | 19 MB | ~5 x weniger |

Eine ehrliche Anmerkung zur Methodik: Eine Zahl für den Start der gesamten GUI-Anwendung (NW.js/Chromium vs. Wails/System-Webview) gebe ich nicht an — der Unterschied dürfte noch größer sein, aber ohne saubere Messung wäre das nur eine Schätzung. Ebenso lässt sich der RAM-Verbrauch der gesamten Anwendung nicht fair vergleichen: NW.js trägt sein gesamtes Chromium in sich, während Wails das System-WebKit nutzt, dessen Speicher unter macOS separat unter `com.apple. WebKit.*`-Prozessen erfasst wird. Deshalb gilt oben nur der Vergleich des Backend-Servers — eine kleinere, aber überprüfbare Aussage.

Was beim Rewrite verloren ging: das Plugin-System (Python-Plugins) und der schrittweise PL/pgSQL-Debugger, der eine eigene C-Extension in `shared_preload_libraries` benötigte — die auf einem heutigen Managed-Postgres ohnehin nie geladen werden dürfte. Mit ihnen verschwanden auch drei Plugin-Integrationen für längst tote Upstream-Projekte (pglogical, Postgres-BDR, Postgres-XL). Nicht jeder Rewrite ist verlustfrei, und es lohnt sich nicht, das zu verschweigen.

## 6. Python im KI-Zeitalter — echte vs. vermeintliche Leistung

Python erlebt gerade dank AI/ML einen Boom, aber es gibt einen Haken: Beim Training und der Inferenz von Modellen fungiert es hauptsächlich als „Klebstoff“ (Glue Language) — die eigentlichen Berechnungen laufen im Hintergrund in C++/CUDA/PyTorch. Für Desktop-Tools, CLI-Utilities und Datenbank-Clients bringt Python jedoch die volle Last seiner Laufzeitumgebung mit — langsamer Start, höherer Speicherbedarf —, ohne dass der Nutzer von seiner Flexibilität tatsächlich profitiert. Er bezahlt nur dafür.

Ebenso lohnt es sich, eine zweite Rolle zu unterscheiden, in der Python im KI-Zeitalter immer häufiger auftaucht: als **Ausführungssprache für die KI-Agenten selbst**. Code-Interpreter, sandboxed Umgebungen zur Dateiverarbeitung oder Agenten-Frameworks greifen fast immer zu Python — es hat eine reiche Bibliothek für Datenverarbeitung (pandas, openpyxl, Pillow), es ist die Sprache, für die LLMs die meisten Trainingsdaten haben, und vor allem: Ein Skript, das ein Agent generiert und einmal ausführt, wird nirgendwo verteilt. Es lebt ein paar Sekunden in einer isolierten Sandbox und verschwindet dann.

Das ist eine grundlegend andere Situation als eine Anwendung, die sich Hunderte Menschen auf ihrem Computer installieren und täglich öffnen. Die Startgeschwindigkeit eines einmaligen Sandbox-Skripts stört niemanden — die Startgeschwindigkeit einer Desktop-Anwendung, die man zehnmal am Tag öffnet, dagegen schon. Python als „Klebstoff“ für Agenten und Python als Laufzeitumgebung für eine verteilte Desktop-Anwendung sind zwei unterschiedliche Aufgaben mit unterschiedlichen Anforderungen — und es ist ein Fehler, sie nur deshalb in einen Topf zu werfen, weil es dieselbe Sprache ist.

## 7. Fazit: Lehren für zukünftige Projekte

1. Ein Projekt in eine effizientere Sprache neu zu schreiben, ist kein elitärer Luxus mehr — KI hat sowohl die Konvertierung als auch die laufende Wartung deutlich verbilligt, und das machen auch große Unternehmen wie Discord, Dropbox, Uber oder Cloudflare, sobald sie an eine konkrete Leistungsgrenze stoßen oder die neuen Möglichkeiten KI-gestützter Entwicklung nutzen wollen.
2. Python verdient seinen Platz dort, wo es dominiert — Data Science, KI-Prototyping, einmaliges agentisches Scripting.
3. Für verteilte Tools und Client-Anwendungen ergibt es heute aber Sinn, zu kompilierten, eigenständigen Sprachen zurückzukehren — Go, Rust, Zig.
4. Scheuen Sie sich nicht, gute alte Tools wiederzubeleben — ein moderner Stack plus KI kann ihnen mit minimalem Wartungsaufwand ein zweites Leben einhauchen.

Das neue OmniDB 4.2 steht kostenlos zum Download bereit unter 🔗 [www.omnidb.net](https://www.omnidb.net).

---

*Haben Sie eine ähnliche Erfahrung mit der Neuentwicklung eines alten Tools in einer anderen Sprache gemacht? Schreiben Sie mir davon.*
