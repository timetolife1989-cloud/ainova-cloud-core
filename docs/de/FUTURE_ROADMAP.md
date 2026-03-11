# Ainova Cloud Intelligence — Produkt-Roadmap

## Implementierungsstatus

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | PDF/Excel-Export | 1 | ✅ Fertig |
| 2 | Demo-Umgebung | 1 | ✅ Fertig |
| 3 | Landing Page | 1 | ✅ Fertig |
| 4 | E-Mail-Benachrichtigungen | 1 | ✅ Fertig |
| 5 | Dashboard-Builder | 2 | ✅ Fertig |
| 6 | PWA + Offline | 2 | ✅ Fertig |
| 7 | Globale Suche (Strg+K) | 2 | ✅ Fertig |
| 8 | Echtzeit-SSE | 2 | ✅ Fertig |
| 9 | Sprachumschalter (EN/HU/DE) | 2 | ✅ Fertig |
| 10 | Übersetzungseditor | 2 | ✅ Fertig |
| 11 | KI-Assistent | 3 | ✅ Fertig |
| 12 | SPS-Anbindung | 3 | ✅ Fertig |
| 13 | Digitaler Zwilling | 3 | ✅ Fertig |
| 14 | Workflow-Engine | 3 | ✅ Fertig |
| 15 | API-Gateway | 3 | ✅ Fertig |
| 16 | Multi-Standort | 3 | ✅ Fertig |
| 17 | Tests & CI | T | ✅ Fertig |
| 18 | Marktplatz | 4 | ⏳ Geplant |
| 19 | Mobile App | 4 | ⏳ Geplant |
| 20 | Multi-Tenant SaaS | 4 | ⏳ Geplant |
| 21 | Embedded BI | 4 | ⏳ Geplant |

---

## Phase 1 — Verkaufsbereit (✅ Abgeschlossen)

### 1.1 PDF/Excel-Export
- Modulweiser Datenexport über API
- Excel: Formatierte Header, Auto-Breite, fixierte Zeilen, Auto-Filter
- PDF: HTML-Vorlage mit Firmen-Branding

### 1.2 Demo-Umgebung
- Seed-Skript generiert 30 Tage realistische Daten
- Demo-Benutzer: admin, manager, operator
- Ausführen: `npx tsx scripts/seed-demo-data.ts`

### 1.3 Landing Page
- Marketing-Seite mit Hero, Features, Preise, CTA
- Responsives Design, animierte Abschnitte
- EUR-Preise (299€/599€/1.199€ pro Monat)

### 1.4 E-Mail-Benachrichtigungen
- SMTP-Konfiguration über Admin-Panel oder Umgebungsvariablen
- Vorlagen: Warnung, Berichtszusammenfassung, Willkommens-E-Mail

---

## Phase 2 — Wettbewerbsvorteil (✅ Abgeschlossen)

- **Dashboard-Builder** — Benutzerspezifische Layouts mit Widget-System
- **Echtzeit-SSE** — Server-Sent Events für Live-Moduldaten
- **Globale Suche (Strg+K)** — Command Palette mit Tastaturnavigation
- **PWA** — Installierbare Web-App mit Offline-Cache
- **Sprachumschalter** — EN/HU/DE sofortige Umschaltung
- **Übersetzungseditor** — Admin-API für Übersetzungsverwaltung

---

## Phase 3 — Innovation (✅ Abgeschlossen)

- **KI-Assistent** — OpenAI GPT-4o-mini, natürliche Sprache → SQL
- **Workflow-Engine** — No-Code-Regelmotor (Wenn-Dann-Aktionen)
- **API-Gateway** — Externer Zugriff über API-Schlüssel mit Rate-Limiting
- **Multi-Standort** — Mehrere Betriebsstätten verwalten
- **SPS-Anbindung** — Siemens S7, Modbus TCP, MQTT Datenerfassung
- **Digitaler Zwilling** — 2D-Fabrikvisualisierung mit Echtzeit-Maschinenstatus

---

## Phase 4 — Plattform-Skalierung (Geplant)

### 4.1 Marktplatz
- Drittanbieter-Modul-Marktplatz
- Modulpaketformat, Upload, Installation

### 4.2 Mobile App
- React Native (Expo)
- Barcode-Scanner-Integration
- Offline-Synchronisation

### 4.3 Multi-Tenant SaaS
- Zentrale Mandantenregistrierung
- Automatische DB-Bereitstellung pro Mandant
- Subdomain-Routing

### 4.4 Embedded BI
- Drag-and-Drop-Berichtserstellung
- Geplante E-Mail-Berichte
- Benutzerdefinierte Diagramme und Dashboards

---

> **Hinweis:** Phase 1-3 Features sind vollständig implementiert. Phase 4 erfordert architektonische Arbeit auf Plattformebene und sollte erst nach Aufbau eines stabilen Kundenstamms begonnen werden.
