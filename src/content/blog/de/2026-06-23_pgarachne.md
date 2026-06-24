---
title: "Architektur ohne Boilerplate: Wenn die Datenbank zur API-Gateway wird und KI zur Benutzeroberfläche"
description: "Wie man die gesamte Backend-Schicht mit PgArachne und MCP eliminiert, das System aus einer einzigen Binärdatei verteilt und KI-Agenten als Benutzeroberfläche fungieren lässt."
locale: "de"
categories: ["AI", "PostgreSQL"]
date: 2026-06-23
tags: ["PostgreSQL", "PgArachne", "MCP", "AI", "Architektur"]
draft: false
translation_id: "2026-06-23_1"
---

Im Software-Engineering gibt es eine langfristige Tendenz zur Schichtung von Abstraktionen. Wenn wir heute eine gewöhnliche Webanwendung bauen, umfasst der typische Technologie-Stack eine relationale Datenbank, eine ORM-Schicht (Object-Relational Mapping), ein Backend-Framework (Node.js, Python, Go,. NET), Validierungsbibliotheken, JSON-Serialisierer und erst am Ende einen HTTP-Server, der diese Daten ins Netzwerk exponiert.

Im Ergebnis verbringen Backend-Entwickler enorme Mengen an Zeit mit dem Schreiben von sogenanntem „Boilerplate"-Code – dem mechanischen Übersetzen von Datenbankstrukturen in HTTP-Routen und dem Validieren von Dingen, die auf Datenbankebene oft bereits validiert sind.

Wenn jedoch die Geschäftslogik der Anwendung eng mit dem Datenmodell und der Datenintegrität verknüpft ist, stellt sich eine legitime Frage: *Brauchen wir wirklich eine separate Backend-Anwendung nur als Durchlauferhitzer für JSON?*

Der Ansatz „Database-as-a-Backend" ist konzeptionell nicht neu. In Kombination mit dem Tool [PgArachne](https://www.pgarachne.com) und dem neuen Standard Model Context Protocol (MCP) erhält er jedoch eine völlig neue architektonische Dimension. Dieser Text analysiert detailliert, wie man mit diesem Stack eine ganze Anwendungsschicht eliminieren, ein vollständiges System aus einer einzigen Binärdatei verteilen und KI-Agenten als eigentliche Benutzeroberfläche einsetzen kann.

---

## 1. Architektonischer Wandel: Von Controllern zur reinen Datenbanklogik

Eine traditionelle REST API erfordert für jede Entität die Definition von Route, Controller, Validierungs-Middleware, Fehlerbehandlung und Mapping auf eine SQL-Abfrage. Wenn sich die Tabellenstruktur oder eine Geschäftsregel ändert, muss der Entwickler den Code an mehreren Stellen im Backend und anschließend auch im Frontend anpassen.

PgArachne eliminiert diese Zwischenschicht vollständig. Die Backend-Entwicklung reduziert sich hier auf die Definition des Datenbankschemas und PL/pgSQL-Funktionen (oder PL/v8 bzw. PL/Python). Das Tool selbst fungiert als schlankes, hochperformantes API-Gateway, das in Go geschrieben ist, direkt vor PostgreSQL läuft und gespeicherte Prozeduren und Funktionen automatisch auf ein **JSON-RPC 2.0 API** abbildet.

### Wie die Reflexion in der Praxis funktioniert

Sobald in der Datenbank eine Funktion existiert, die den Datentyp `jsonb` akzeptiert und zurückgibt, registriert PgArachne sie durch Reflexion der PostgreSQL-Systemkataloge (`pg_proc`, `pg_namespace`, `pg_argument`) sofort und exponiert sie nach außen. Keine Server-Neustarts, keine Kompilierungen.

Betrachten wir eine einfache Funktion zur Benutzerregistrierung:

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

PgArachne bildet diese Funktion automatisch auf einen JSON-RPC-Endpunkt ab. Die Client-Anwendung (oder ein KI-Agent) sendet dann eine standardmäßige POST-Anfrage mit folgendem Body:

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

### Hybrider Ansatz: Vom universellen CRUD zur strikten Logik

Dieses Modell stößt häufig auf Bedenken hinsichtlich übermäßiger Starrheit. Was, wenn ich zu Projektbeginn nicht für jede Tabelle eine SQL-Funktion schreiben möchte? Und was, wenn ich später äußerst komplexe Validierungen benötige? PgArachne unterstützt eine hybride Strategie:

1. **Universelle Funktionen (schnelles MVP):** Zu Projektbeginn können generische CRUD-Funktionen aktiviert werden, die es der Client-Anwendung ermöglichen, Tabellen direkt abzufragen, zu filtern und zu modifizieren (ähnlich wie PostgREST). Die Frontend-Entwicklung kann dadurch sofort beginnen.
2. **Dedizierte RPC-Funktionen (Production Hardening):** Wenn das Projekt wächst und strikte Geschäftsprozesse erfordert (z. B. transaktionale Auftragsverarbeitung mit Bezug auf den Lagerstand), wird der universelle Zugang für die betreffende Entität geschlossen und durch eine isolierte SQL-Funktion ersetzt. Für die Client-Anwendung ändert sich nach außen nichts – sie kommuniziert weiterhin über das JSON-RPC-Protokoll.

---

## 2. Sicherheitsmodell: Identitätswechsel über `SET LOCAL ROLE`

Einer der häufigsten Einwände gegen die Architektur „Database-as-a-Backend" ist die Frage der Sicherheit. Wenn die Client-Anwendung direkt mit dem Datenbank-Gateway kommuniziert, wie verhindert man, dass Benutzer A die Daten von Benutzer B liest?

PgArachne verwaltet Autorisierung und Zugriffsrechte nicht in eigener Regie. Stattdessen delegiert es die Sicherheit zu hundert Prozent an den bewährten PostgreSQL-Kern und den Mechanismus **Row-Level Security (RLS)**.

### Wie es in der Datenbank funktioniert:

1. **Authentifizierung (BYO-JWT):** PgArachne unterstützt das *Bring Your Own JWT*-Modell. Sie können jeden externen Identity-Provider (Auth0, Clerk, Supabase Auth oder einen eigenen Microservice) verwenden, der Tokens signiert. Dem Gateway übergeben Sie lediglich den öffentlichen Schlüssel (JWKS) zur Signaturverifizierung.
2. **Anfrage-Kontext:** Wenn eine HTTP-Anfrage eingeht, verifiziert PgArachne das JWT, extrahiert daraus Claims (z. B. Benutzer-ID und Rolle) und öffnet eine Transaktion zu PostgreSQL.
3. **Isolierung auf Transaktionsebene:** Zu Beginn der Transaktion führt das Gateway eine Reihe von Kontext-Setzungsbefehlen aus:
 ```sql
   SET LOCAL ROLE authenticated;
   SELECT set_config('app.current_user_id', '123e4567-e89b-12d3-a456-426614174000', true);
   ```
4. **Anwendung der RLS-Regeln:** Wenn Sie über der Tabelle `orders` eine RLS-Policy definiert haben, stellt PostgreSQL automatisch sicher, dass jede nachfolgende Abfrage (auch verschachtelte innerhalb komplexer Funktionen) nur die Daten des jeweiligen Benutzers sieht:
 ```sql
   CREATE POLICY order_isolation_policy ON orders
   FOR ALL
   TO authenticated
   USING (user_id = current_setting('app.current_user_id')::uuid);
   ```

Durch diesen Ansatz wird eine ganze Klasse von Sicherheitslücken vom Typ IDOR (Insecure Direct Object Reference) vollständig eliminiert, die üblicherweise durch Entwicklerfehler in Backend-Controllern entstehen. Sicherheit wird deklarativ direkt bei den Daten definiert.

---

## 3. Verteilung aus einer einzigen Binärdatei: Statisches Frontend und JAMstack ohne Kompromisse

Modernes Deployment ähnelt oft einem infrastrukturellen Albtraum. Man muss Docker-Container für das Node.js-Backend verwalten, ein CDN (Content Delivery Network) für die Distribution der Single Page Application (React/Vue/Svelte) einrichten, CORS-Richtlinien (Cross-Origin Resource Sharing) lösen und einen Reverse Proxy (Nginx/Traefik) konfigurieren, der alles zusammenhält.

PgArachne geht dies mit der pragmatischen Einfachheit von Go an. Es enthält einen integrierten, hochoptimierten Server für statische Dateien. Dies ermöglicht eine vollständige Änderung der Deployment-Strategie.

### Monolithische Verteilung mit Microservices-Vorteilen

Die gesamte Client-Anwendung kann als rein statisches Frontend gebaut werden – ohne Server-Side Rendering (SSR), nur optimiertes HTML, CSS und client-seitiges JavaScript. Diese Dateien werden in einen Ordner hochgeladen, den PgArachne bereitstellt.

Die Vorteile dieses Ansatzes sind grundlegend:

* **Null Overhead auf API-Seite:** Client-Anwendung und API laufen auf derselben Domain, demselben Port und aus derselben Binärdatei. Dadurch entfällt jegliche CORS-Konfiguration und der Overhead für den Netzwerk-Handshake wird reduziert (alles läuft über eine einzige HTTP/2- oder HTTP/3-Verbindung).
* **Perfekte Cachierbarkeit:** Statische Assets sind unveränderlich. PgArachne generiert für sie automatisch korrekte `ETag`- und `Cache-Control`-Header. Das gesamte Frontend kann damit äußerst effizient direkt im Browser des Benutzers oder am Netzwerkrand (Edge/Cloudflare) gecacht werden, während PgArachne nur reine JSON-RPC-Daten verarbeitet.
* **Einfachheit von CI/CD:** Das Deployment einer neuen Anwendungsversion bedeutet nur das Herunterladen einer einzigen Binärdatei, das Kopieren des Ordners mit dem statischen Frontend und das Starten. Keine Abhängigkeiten von `node_modules` in der Produktionsumgebung, kein Risiko von Memory-Leaks aus schweren Backend-Runtime-Umgebungen.

### Echtzeit-Kommunikation ohne WebSocket-Komplexität

Wenn die Client-Anwendung Live-Daten benötigt – beispielsweise Echtzeit-Benachrichtigungen, Lagerstandsaktualisierungen oder Chat – greifen Entwickler üblicherweise zu WebSockets. Diese sind jedoch ressourcenintensiv, skalieren schlecht über Load Balancer und erfordern komplexe zustandsbehaftete Logik im Backend.

PgArachne löst dieses Problem durch native Unterstützung für **Server-Sent Events (SSE)** in Verbindung mit dem Datenbankm echanismus `LISTEN/NOTIFY`.

Wenn in der Datenbank eine Änderung stattfindet (z. B. über einen Trigger), löst PostgreSQL ein Ereignis aus:
```sql
NOTIFY channel_orders_updates, '{"order_id": 501, "status": "shipped"}';
```
PgArachne fängt diese Benachrichtigung ab und leitet sie sofort über die offene HTTP-Verbindung an das Frontend weiter, mittels der Standard-Client-Schnittstelle `EventSource` in JavaScript:

```javascript
const evtSource = new EventSource("/api/stream?channel=orders_updates");
evtSource.onmessage = (event) => {
   const data = JSON.parse(event.data);
   console.log("Objednávka aktualizována:", data);
};
```
Alles läuft unidirektional, effizient, über das Standard-HTTP-Protokoll und ohne die Notwendigkeit, dedizierte Message Broker wie Redis zu implementieren.

---

## 4. Model Context Protocol (MCP): Das Zeitalter der Anwendungen ohne grafische Oberfläche (Zero-UI)

Der interessanteste technologische Durchbruch, den PgArachne bringt, betrifft jedoch nicht die Einsparung von Codezeilen bei der klassischen Webentwicklung, sondern die Integration mit dem KI-Ökosystem durch das **Model Context Protocol (MCP)**.

MCP ist ein offenes Protokoll (ursprünglich von Anthropic entworfen), das eine einheitliche Art und Weise definiert, wie LLM-Modelle (wie Claude, GPT oder lokale Modelle) sicher mit externen Datenquellen, Dateisystemen und Anwendungsschnittstellen kommunizieren können. PgArachne enthält eine native MCP-Server-Implementierung.

### Selbstdokumentierendes API als Toolset (Tools)

Wenn Sie PgArachne mit einer Entwicklungsumgebung verbinden (z. B. Cursor, Claude Desktop oder einem eigenen autonomen Agenten), führt das Gateway eine Introspektion der verfügbaren SQL-Funktionen durch und präsentiert sie dem KI-Modell als dessen interne Werkzeuge (*tools*).

Das Schlüsselelement sind Standard-SQL-Kommentare. KI-Modelle müssen keinen Quellcode von Tabellen lesen, sie benötigen verständliche Semantik. PgArachne nimmt den Text aus dem Befehl `COMMENT ON FUNCTION` und übergibt ihn dem LLM als Systemanweisung für das jeweilige Werkzeug.

Wenn das Modell die Aufgabe erhält, den Geschäftsstatus zu ermitteln, schaut es in das Tool-Schema und findet eine Funktion mit der Beschreibung: *„Gibt den Gesamtumsatz und die Anzahl der Bestellungen für einen angegebenen Zeitraum zurück.“* Das Modell versteht selbst, welche Parameter (`date_from`, `date_to`) es generieren muss, erstellt eine gültige JSON-RPC-Anfrage, PgArachne führt sie sicher aus und das Modell interpretiert die Rohdaten für den Benutzer in verständlichen Text oder ein Diagramm.

### Das Zero-UI-Konzept: Wenn die grafische Oberfläche gar nicht erst entsteht

Bei einer großen Anzahl interner Unternehmenssysteme, Analyse-Tools, B2 B-Schnittstellen oder Verwaltungskonsolen ist die Erstellung einer grafischen Benutzeroberfläche (GUI) reine Verschwendung von Entwicklungszeit. Entwickler verbringen Wochen damit, Tabellen, Filter, Select-Boxen und Diagramme zu erstellen, nur damit ein Manager oder Analyst per Klick Daten exportieren kann.

Mit der PgArachne + MCP-Architektur öffnet sich der Weg zum sogenannten **Zero-UI (Null-Interface)**:

1. **Kein Frontend-Code:** Sie erstellen kein React, keine Formulare, kein CSS.
2. **Natürliche Sprache als universelle Schnittstelle:** Der Benutzer kommuniziert direkt mit dem KI-Agenten (z. B. über Chat oder Sprachschnittstelle).
3. **Autonome Ausführung:** Der Benutzer gibt ein: *„Finde mir die Top 5 Kunden, die diesen Monat am meisten Geld bei uns ausgegeben haben, aber deren letzte Bestellung vor mehr als 10 Tagen war. Ich möchte ihnen eine Retentions-E-Mail schicken.“*
4. **Verarbeitung:** Der KI-Agent identifiziert die notwendigen, über PgArachne exponierten Funktionen, extrahiert im transaktionalen und sicheren Modus (über RLS) die genauen Daten, formatiert sie in eine übersichtliche Tabelle und schlägt direkt E-Mail-Texte vor.

Geschäftslogik und Integrität bleiben zu hundert Prozent unter Kontrolle in PostgreSQL, den Datentransfer stellt ein blitzschneller Go-Server sicher, und die flexible Benutzerschicht generiert die KI dynamisch nach dem aktuellen Bedarf des Benutzers.

---

## 5. Wann diese Architektur (nicht) eingesetzt werden sollte: Grenzen und Risiken

Jede architektonische Entscheidung ist ein Kompromiss (Trade-off). Die Architektur „Database-as-a-Backend" ist keine Wunderwaffe und hat spezifische Grenzen, die vor dem Einsatz bewertet werden müssen.

### Geeignete Szenarien (Sweet Spots)
* **Datenintensive Anwendungen und MVPs:** Projekte, bei denen Geschwindigkeit der Markteinführung entscheidend ist und bei denen die meisten Operationen Transaktionen über das Datenbankschema sind.
* **Interne Unternehmenstools und ERP-Subsysteme:** Systeme, bei denen die primären Anforderungen Sicherheit, Suchgeschwindigkeit und die Möglichkeit zur einfachen Integration mit KI-Agenten für das Reporting sind.
* **Anwendungen mit hohen Anforderungen an Echtzeit-Updates:** Dank der direkten Verbindung von SSE und `NOTIFY` ohne die Notwendigkeit, eine komplexe WebSocket-Infrastruktur aufzubauen.

### Ungeeignete Szenarien (Wann besser ein klassisches Backend wählen)
* **Starke Abhängigkeit von externen Drittanbietern:** Wenn Ihre API bei jeder Anfrage mit drei weiteren REST-APIs kommunizieren muss (Stripe, Salesforce, interne Microservices), ist das Schreiben dieser Integrationen direkt in PL/pgSQL (z. B. über die Extension `http`) oft unhandlich und schwer zu testen. Hier ist ein klassisches Backend in Go oder Node.js besser geeignet.
* **Schwere Rechenoperationen (CPU-bound):** PostgreSQL ist für effiziente I/O-Operationen und Datenverwaltung konzipiert. Wenn die Anwendung komplexe Bildverarbeitung, fortgeschrittene Kryptografie oder schwere mathematische Simulationen erfordert, könnte die Ausführung innerhalb des Datenbankprozesses Ressourcen für andere Transaktionen blockieren.
* **Komplexe Microservices-Orchestrierung:** In verteilten Systemen, wo die Datenbank nur eine von vielen Komponenten ist und die Geschäftslogik eine Koordination nach Mustern wie Saga oder Event Sourcing erfordert, übernimmt die klassische Backend-Schicht die Rolle des Orchestrators, die die Datenbank allein nicht effektiv erfüllen kann.

---

## Fazit: Pragmatische Schlankheit für die moderne Ära

Die auf der Kombination PostgreSQL, PgArachne und Model Context Protocol aufgebaute Architektur stellt eine radikale Rückkehr zur technischen Nüchternheit dar. Sie zeigt, dass ein Großteil der Komplexität, die wir in moderne Softwareprojekte einbringen, nur durch das ständige Bestreben entsteht, Daten zwischen inkompatiblen Schichten zu übertragen und zu transformieren.

Durch die Entfernung der Zwischenschichten – also die Abschaffung der klassischen Backend-Anwendung und deren Ersatz durch ein schlankes, hochoptimiertes Gateway – erhalten wir ein System mit minimalem Overhead, das äußerst einfach zu deployen und nativ für die KI-Integration vorbereitet ist. Die Zukunft der Entwicklung muss nicht im Schreiben von Tausenden von Zeilen Transitcode liegen, sondern in der präzisen Definition des Datenmodells und der Geschäftslogik genau dort, wo die Daten zu Hause sind.
