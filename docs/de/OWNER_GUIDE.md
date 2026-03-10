# Ainova Cloud Core — Entwickler- & Eigentümerhandbuch

> Dieses Dokument richtet sich an Sie als Softwareentwickler und Eigentümer. Es enthält alle wesentlichen Informationen über die Funktionsweise des Systems, wo Sie Dinge finden und wie Sie es für den Verkauf vorbereiten.

---

## I. SYSTEMFUNKTION

### 1. Erststart — Setup-Assistent

Bei der erstmaligen Installation beim Kunden (oder Docker-Start):

1. Browser öffnet: `http://localhost:3000/setup`
2. **Admin-Konto** erstellen (Benutzername + Passwort)
3. **Branding** einrichten (Firmenname, Sprache)
4. **Module** auswählen (welche verwendet werden)
5. **Lizenzschlüssel** eingeben (optional — ohne Basic-Paket)
6. → System einsatzbereit, Weiterleitung zum Login

### 2. Anmeldevorgang

```
Benutzer → /login → POST /api/auth/login
  ├── SessionAdapter: DB-gestützte Session-Cookie (Standard)
  └── JwtAdapter: HMAC-SHA256 Access-Token (optional)
```

### 3. Eigentümer-/Superadmin-Zugang

Ein fest codierter Eigentümer-Login ist eingebaut:

- **Benutzername:** `ainova_owner`
- **Passwort:** `AiNova#Core2025!SuperAdmin`
- **Rolle:** admin (Vollzugriff)

Deaktivierung: `DISABLE_SUPERADMIN=true`

### 4. Dashboard & Modulladung

Jedes Modul ist ein eigenständiges Plugin:
```
modules/[modulId]/
├── manifest.ts            # Modulregistrierung
├── migrations/            # SQL-Schema
├── api/route.ts           # REST-API
├── components/            # UI-Komponente
└── i18n/                  # Übersetzungen
```

---

## II. VERFÜGBARE MODULE

| Stufe | Modul | Beschreibung |
|-------|-------|-------------|
| Basic | Personalverwaltung | Mitarbeiterplanung, Anwesenheit |
| Basic | Tracking | Produktionsauftragsverfolgung |
| Basic | Fuhrpark | Fahrzeugflottenverwaltung |
| Basic | Dateiimport | Generischer Dateiimport |
| Basic | Berichte | Berichtsgenerator |
| Professional | Leistung | KPIs, Effizienzkennzahlen |
| Professional | Planung | Kapazitätsplanung |
| Professional | Lieferung | Lieferverwaltung |
| Professional | Bestand | Bestandsverwaltung |
| Enterprise | OEE | Gesamtanlageneffektivität |
| Enterprise | Schichtplanung | Schichtzuweisung |
| Enterprise | Qualität | Qualitätskontrolle, Inspektionen |
| Enterprise | Instandhaltung | Vorbeugende Wartung |
| Enterprise | SPS-Anbindung | SPS-Datenerfassung (S7, Modbus, MQTT) |
| Enterprise | Digitaler Zwilling | 2D-Fabrikvisualisierung |

---

## III. ADMIN-PANEL

- **Benutzerverwaltung** — Erstellen/Bearbeiten/Deaktivieren
- **Rollen & Berechtigungen** — Berechtigungsmatrix
- **Modulaktivierung** — Ein-/Ausschalten mit Abhängigkeitsprüfung
- **Branding** — Firmenname, Logo, Sprache
- **Maßeinheiten** — Benutzerdefinierte Einheiten

---

## IV. LIZENZIERUNG

| Stufe | Module | Max. Benutzer |
|-------|--------|---------------|
| Basic | 5 Kernmodule | 10 |
| Professional | + 4 Professional-Module | 50 |
| Enterprise | + 6 Enterprise-Module | Unbegrenzt |

---

## V. BEREITSTELLUNG

### Docker
```bash
docker build -t ainova-cloud-core:latest .
docker-compose up -d
```

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|-------------|---------|
| `DB_ADAPTER` | Datenbanktyp (mssql/postgres/sqlite) | `mssql` |
| `DB_SERVER` | Datenbankserver | — |
| `AUTH_ADAPTER` | Auth-Typ (session/jwt) | `session` |
| `DEFAULT_LOCALE` | Standardsprache | `en` |
| `OPENAI_API_KEY` | KI-Assistent API-Schlüssel | — |
| `DISABLE_SUPERADMIN` | Eigentümer-Backdoor deaktivieren | `false` |

### Befehle

```bash
npm run dev              # Entwicklungsserver (Port 3000)
npm run build            # Produktions-Build
npm run type-check       # TypeScript-Prüfung
npm run test             # Unit-Tests (vitest)
npx tsx scripts/migrate-all.ts        # DB-Migrationen
npx tsx scripts/bootstrap-admin.ts    # Admin-Konto
npx tsx scripts/generate-license.ts   # Lizenzgenerierung
npx tsx scripts/seed-demo-data.ts     # Demo-Daten generieren
```

---

## VI. NEUE FUNKTIONEN (v1.1+)

- **PDF/Excel-Export** — Modulweise Datenexport mit Formatierung
- **Globale Suche (Strg+K)** — Command Palette mit Tastaturnavigation
- **Sprachumschalter (EN/HU/DE)** — Sofortige Sprachumschaltung im Header
- **E-Mail-Benachrichtigungen** — SMTP-Konfiguration, Vorlagen
- **Echtzeit-Updates (SSE)** — Server-Sent Events für Live-Daten
- **Workflow-Automatisierung** — No-Code Regelmotor
- **API-Gateway** — Externer Zugriff über API-Schlüssel
- **KI-Assistent** — OpenAI GPT-4o-mini, natürliche Sprachabfragen
- **SPS-Anbindung** — Siemens S7, Modbus TCP, MQTT
- **Digitaler Zwilling** — 2D-Fabrikvisualisierung
- **Dashboard-Builder** — Benutzerspezifische Layouts
- **PWA** — Installierbare Web-App mit Offline-Cache
- **Tests & CI** — vitest, GitHub Actions Pipeline
