---
title: "Apps in der Sandbox: Wenn die Isolation die Datenbank von .pgpass abschneidet"
description: "Wie ich OmniDB in die macOS-Sandbox verlegt habe und auf eine unerreichbare .pgpass-Datei stieß — und wie eine sichere, bedarfsgesteuerte Rechtevergabe unter macOS, Linux und Windows aussieht."
locale: "de"
categories: ["PostgreSQL", "Software Engineering"]
date: 2026-09-09
tags: ["Sandbox", "macOS", "Linux", "Windows", "Sicherheit", "PostgreSQL", "OmniDB", "Flatpak", "MSIX"]
draft: false
translation_id: "2026-09-09_1"
---

Als Entwickler wollen wir sichere Anwendungen bauen. Einer der besten Schritte zum Schutz der Nutzer ist es, die Anwendung in eine Sandbox (eine isolierte Umgebung) einzusperren. Eine Sandbox stellt sicher, dass ein Angreifer selbst dann, wenn in der Anwendung eine Schwachstelle gefunden wird, weder frei über die Festplatte des Nutzers streifen noch sensible Daten anderer Programme lesen kann.

Sicherheit hat allerdings ihren Preis — in Form von Hürden für Entwickler und Nutzer gleichermaßen. Kürzlich habe ich OmniDB unter macOS in die Sandbox verlegt und bin sehr schnell auf ein klassisches Problem gestoßen: Die Anwendung konnte plötzlich die Passwörter für meine PostgreSQL-Datenbanken nicht mehr laden.

---

## 1. Eine Geschichte aus der Praxis: Wo ist meine `.pgpass` — und warum ist es richtig, dass sie versteckt ist?

PostgreSQL nutzt üblicherweise die Datei `~/.pgpass` im Home-Verzeichnis des Nutzers. Diese Datei enthält Zugangsdaten im Klartext: Hosts, Ports, Datenbanken, Benutzernamen und Passwörter.

Sobald ich [OmniDB](https://www.omnidb.net) in die macOS-Sandbox gesperrt hatte, schnitt das System die Anwendung strikt vom Home-Verzeichnis ab. OmniDB konnte sich nicht mehr mit der Datenbank verbinden, weil es die `.pgpass` schlicht nicht sah.

## 2. Warum ist Zugriff „nur auf Anfrage“ eigentlich ein Sicherheitsgewinn?

Auf den ersten Blick war das eine Komplikation, im Rückblick ist es aber ein hervorragendes Sicherheitsmerkmal. Eine `.pgpass`-Datei enthält oft Dutzende Passwörter für Produktiv- und Entwicklungsdatenbanken. Wollen Sie wirklich, dass jede heruntergeladene Anwendung automatisch Zugriff auf einen solchen Schatz hat? Ganz sicher nicht. Bekäme eine ungeprüfte Anwendung vollen Zugriff auf diese Datei, könnte sie all Ihre Passwörter unbemerkt wegschicken.

## 3. Wie habe ich das unter macOS gelöst?

Statt eine pauschale Berechtigung für die gesamte Festplatte anzufordern (was den Sinn der Sandbox untergräbt), habe ich eine Lösung gewählt, die vom Nutzer gesteuert wird und dem Prinzip der geringsten Rechte folgt:

1. Wenn OmniDB versucht, sich mit einer Datenbank zu verbinden, und dies an fehlenden Rechten für `.pgpass` scheitert, zeigt die Oberfläche eine klare Fehlermeldung.
2. Teil dieser Meldung ist eine Schaltfläche zur Rechtevergabe.
3. Nach dem Klick öffnet sich ein Systemdialog (`NSOpenPanel`), in dem der Nutzer die Datei `.pgpass` manuell auswählt (oder den Zugriff darauf bestätigt).
4. macOS übergibt der Anwendung ein sogenanntes Security Scoped Bookmark — eine Ausnahme, durch die die Anwendung dauerhaften und legitimen Zugriff auf genau diese eine Datei erhält.

Der Nutzer weiß, was er der Anwendung zugänglich macht und warum, während der Rest der Festplatte und alle anderen Dateien hermetisch geschützt bleiben.

## 4. Die macOS-Sandbox aus UX- und Entwicklersicht: großartige Idee, seltsame Logik

Das Großartige an der Sandbox unter macOS ist, dass sie Teil jeder Anwendung sein kann — unabhängig davon, wie diese auf den Rechner gelangt ist: aus dem App Store, von GitHub oder als `.dmg`-Paket von der Website des Entwicklers. Bei der Arbeit damit sind mir jedoch einige Ungereimtheiten aufgefallen:

### 4.1 Von der Sandbox erfahren Sie erst, wenn es schon zu spät sein kann

Als sicherheitsbewusster Nutzer möchte ich vor dem Start einer unbekannten Anwendung wissen, ob sie in einer isolierten Sandbox läuft oder vollen Zugriff auf mein System hat.

Wo würden Sie diese Information erwarten? Logischerweise im Informationsfenster der Datei (Cmd + I im Finder). Dort findet sich allerdings keine einzige Erwähnung der Sandbox. Die grafische Oberfläche von macOS bietet genau eine Stelle, an der man es herausfinden kann: die Aktivitätsanzeige (Activity Monitor), wo man die Spalte „Sandbox“ einblenden und sich einen bereits laufenden Prozess ansehen muss. Das ist absurd: In dem Moment, in dem Sie es in der Aktivitätsanzeige sehen, läuft die gefährliche Anwendung bereits und kann schon Schaden angerichtet haben.

Vorab prüfen lässt sich das nur über die Kommandozeile:

```bash
codesign -d --entitlements - /Applications/OmniDB.app
```

In der Ausgabe suchen Sie nach `com.apple.security.app-sandbox`. Das funktioniert, aber ein normaler Nutzer — also genau derjenige, den die Sandbox schützen soll — wird das Terminal nicht öffnen.

### 4.2 Apple sollte mit Sandbox-Anwendungen nachsichtiger sein

Apple blockiert das Ausführen von Anwendungen aus unbekannten Quellen heute sehr streng (Gatekeeper, teures Entwicklerkonto, Notarisierung). Wenn ein Entwickler sich aber freiwillig entscheidet, seine Anwendung in eine strikte Sandbox einzusperren und sich damit selbst die Hände zu binden, sollte das System beim Download aus unbekannten Quellen nachsichtiger sein. Wenn eine isoliert laufende Anwendung weder auf Dateien noch auf das System zugreifen kann, sinkt das Risiko für den Nutzer dramatisch.

### 4.3 Unnötige Hürden beim Ad-hoc-Signieren

Signiert ein Entwickler seine Anwendung nur lokal bzw. ad hoc (`codesign -s -`), erlaubt macOS ihm bestimmte Sandbox-Berechtigungen (Entitlements) nicht. Der Entwickler ist gezwungen, sich ein eigenes selbstsigniertes Zertifikat zu erstellen, nur um die Sandbox mit Berechtigungen lokal testen zu können. In der Praxis bringt das aber keinerlei zusätzliche Sicherheit — es ist nur ein überflüssiger bürokratischer Schritt in der Entwicklung.

## 5. Wie überträgt man dasselbe Konzept auf Linux und Windows?

Bisher habe ich dieses System der bedarfsgesteuerten Rechtevergabe unter macOS vollständig funktionsfähig. OmniDB ist aber ein plattformübergreifendes Werkzeug, deshalb arbeite ich gerade daran, exakt dasselbe Konzept (Schaltfläche in der Anwendung → Systemdialog → Ausnahme erteilt) auf die anderen Systeme zu übertragen.

- **Linux (Flatpak und XDG Portals):** Für Linux plane ich Flatpak. Für die Kommunikation mit dem System außerhalb der Sandbox nutzt es die sogenannten XDG Desktop Portals. Architektonisch funktionieren Portale sehr ähnlich wie unter macOS: Fordert eine Anwendung über ein Portal eine Datei an, zeichnet das System den Dialog — nicht die Anwendung. Sobald der Nutzer im Dialog `.pgpass` auswählt, übergibt das Portal der Anwendung die Berechtigung, genau diese Datei zu lesen.
- **Windows (MSIX und AppContainer):** Unter Windows ist das Ziel die Paketierung als MSIX, wobei die Anwendung in einer AppContainer-Umgebung läuft. Hier kommt die System-Schnittstelle `FileOpenPicker` zum Einsatz. Wählt der Nutzer eine Datei über diesen nativen Windows-Dialog aus, erteilt der AppContainer der Anwendung ein Zugriffstoken für diese Datei.

Das Prinzip bleibt damit auf allen Plattformen identisch: Die Anwendung sieht standardmäßig nichts, aber der Nutzer kann ihr mit einem einzigen Klick im Fehlerdialog sicher genau die eine Datei zugänglich machen, die sie braucht.

## 6. Überblick über Sandboxing-Optionen: Wie sieht es auf den verschiedenen Betriebssystemen generell aus?

Über das hinaus, was ich für OmniDB einsetzen will, gibt es auf den einzelnen Plattformen eine ganze Reihe weiterer Ansätze. Sie teilen sich in native Systemlösungen und in Werkzeuge von Drittanbietern bzw. Container.

### 6.1 macOS

- **Native Lösung:** Apple App Sandbox (über Entitlements, direkt im System).
- **Alternativen:** Ausführung in Docker oder in einer leichtgewichtigen virtuellen Maschine (z. B. über Virtualization.framework, UTM, Parallels).

### 6.2 Linux

- **Native Lösungen und Paketformate:**
  - **Flatpak:** Nutzt unter der Haube `bubblewrap` (Namespaces, seccomp). Der Standard für isolierte GUI-Anwendungen.
  - **Snap:** Canonicals Lösung auf Basis von AppArmor-Profilen.
- **Alternativen für gewöhnliche Pakete (DEB, RPM, AppImage):**
  - **Firejail:** Ein hervorragendes Werkzeug, mit dem der Nutzer jede bestehende Anwendung selbst „einpacken“ und ihr etwa das Lesen von `~/.ssh` oder `~/.pgpass` verwehren kann.
  - **systemd/cgroups/bubblewrap:** Eigene Skripte zur Prozessisolation auf Systemebene.
  - **Docker/Podman:** Großartig für CLI-Tools und Server, bei GUI-Anwendungen stoßen sie jedoch auf das komplizierte Durchreichen von X11-/Wayland-Sockets.

### 6.3 Windows

- **Native Lösung:**
  - **MSIX (AppContainer):** Microsofts offizieller isolierter Container mit virtueller Registry und virtuellem Dateisystem.
- **Alternativen:**
  - **Sandboxie-Plus:** Ein populäres Open-Source-Werkzeug. Es erlaubt, jede klassische `.exe` in einem isolierten „Sandkasten“ auszuführen, ohne die Anwendung anzupassen.
  - **Windows Sandbox:** Eine schnelle Einweg-VM-Umgebung auf Basis von Hyper-V. Geeignet, um eine verdächtige Datei aus dem Internet zu testen (nach dem Schließen wird alles gelöscht).

## 7. Warum ist die native Systemlösung immer die beste Wahl?

Auch wenn es unter Linux und Windows diverse Drittanbieter-Werkzeuge (Firejail, Sandboxie) oder Container (Docker) gibt, ist es für den Entwickler einer Desktop-Anwendung immer am besten, die native Systemlösung zu wählen (App Sandbox, Flatpak, MSIX).

Die Gründe sind einfach:

1. **Nutzerkomfort (UX):** Eine native Sandbox kann dem Nutzer genau in dem Moment einen Systemdialog anzeigen, in dem die Anwendung eine Datei braucht. Der Nutzer merkt nicht einmal, dass die Anwendung isoliert läuft.
2. **Leistung:** Native Isolation nutzt direkt den Kernel des Betriebssystems (Namespaces, AppArmor, AppContainer). Darunter läuft keine schwerfällige Virtualisierung.
3. **Nachhaltigkeit:** Sie verlassen sich auf einen Standard, den der OS-Hersteller pflegt (Apple, Microsoft, die Flatpak-Community), und nicht auf Drittanbieter-Werkzeuge, die mit dem nächsten Systemupdate den Dienst quittieren können.

## 8. Fazit: Sicherheit muss für Nutzer und Entwickler Sinn ergeben

Der Fall OmniDB und `.pgpass` zeigt zweierlei:

1. **Sicherheit auf Anfrage funktioniert:** Einer Anwendung den automatischen Zugriff auf sensible Passwortdateien zu verweigern und ihn erst über eine explizite Nutzeraktion in der Oberfläche einzufordern, ist der richtige Weg zum Schutz der Privatsphäre.
2. **Die Systeme haben Lücken in der Sandbox-UX:** Es ist schade, dass macOS dem Nutzer nicht klar signalisiert (etwa in `Cmd+I`), dass er eine Anwendung in sicherer Isolation startet, und dass es Entwicklern unnötige Hürden in den Weg legt, etwa selbstsignierte Zertifikate allein für lokale Tests.

Eine Sandbox sollte für Nutzer keine „Blackbox“ und für Entwickler kein „notwendiges Übel“ sein, sondern ein transparenter Standard, von dem beide Seiten profitieren.

---

*Haben Sie ein ähnliches Sandbox-Problem in Ihrer eigenen Anwendung? Schreiben Sie mir, wie Sie es gelöst haben.*
