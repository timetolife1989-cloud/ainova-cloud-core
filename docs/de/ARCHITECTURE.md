# Ainova Cloud Intelligence — Architekturdokumentation

## 1. Überblick

Ainova Cloud Intelligence ist eine **modulare, mandantenfähige Fertigungsmanagement-Plattform**, die als Standardsoftware an Fertigungsunternehmen verkauft wird. Das System ist in 3 Paketstufen erhältlich (Basic, Professional, Enterprise) und bietet vollständige Anpassbarkeit auf Admin-Ebene.

### 1.1 Grundprinzipien

- **Zero Hardcode** — Alles über das Admin-Panel konfigurierbar
- **Adapter Pattern** — DB, Auth, Import über austauschbare Adapter
- **Modul-System** — Plug-in-Architektur, neues Modul besteht aus 6 Dateien
- **Tier-basierte Lizenzierung** — Lizenzschlüssel bestimmt verfügbare Module
- **i18n Ready** — Englisch, Ungarisch, Deutsch; erweiterbar

### 1.2 Tech Stack

| Schicht | Technologie | Version |
|---------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Sprache | TypeScript | 5.9 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | latest |
| Validierung | Zod | 3.x |
| DB (Standard) | Microsoft SQL Server | 2019+ |
| DB (optional) | PostgreSQL, SQLite | 15+, 3.35+ |
| Auth (Standard) | Session-basiert (bcryptjs) | — |
| Auth (optional) | JWT (integrierte Crypto) | — |
| Container | Docker + docker-compose | — |

---

## 2. Datenbankschicht

### 2.1 Multi-DB-Architektur

Das System unterstützt drei Datenbank-Backends über das Adapter-Pattern:

- **MSSQL** (Standard) — Volle Feature-Unterstützung, parametrisierte Abfragen
- **PostgreSQL** — Automatische SQL-Übersetzung (@param → $N, SYSDATETIME → NOW())
- **SQLite** — Leichtgewichtig, ideal für Demos und kleine Installationen

Konfiguration über die Umgebungsvariable `DB_ADAPTER`.

### 2.2 Migrationssystem

- Core-Migrationen: `database/core/001_*.sql` bis `015_*.sql`
- Modul-Migrationen: `modules/[moduleId]/migrations/`
- Alle ausführen: `npx tsx scripts/migrate-all.ts`

---

## 3. Authentifizierung

### 3.1 Session-basiert (Standard)
- bcryptjs Passwort-Hashing (Kostenfaktor 12)
- DB-gestützte Sessions mit 24h Ablauf, 30min Leerlauf-Timeout
- In-Memory Session-Cache (15min TTL)
- Rate-Limiting (5 Fehlversuche / 15 Min)

### 3.2 JWT (optional)
- HMAC-SHA256 Access-Tokens (15min Standard)
- DB-gestützte Refresh-Tokens (7 Tage)
- Zustandslose Validierung über `JWT_SECRET`

---

## 4. Autorisierung (RBAC)

- Berechtigungsbasierte Zugriffskontrolle
- `checkAuth(request, 'permission.key')` Middleware
- Rollen → Berechtigungen Zuordnung in `core_role_permissions`
- Modul-Berechtigungen automatisch beim Start registriert

---

## 5. Modulsystem

Jedes Modul besteht aus:
1. `manifest.ts` — Registrierung (ID, Name, Tier, Berechtigungen, Einstellungen)
2. `migrations/` — SQL-Schema-Dateien
3. `api/route.ts` — REST-API-Endpunkte
4. `components/DashboardPage.tsx` — UI-Komponente
5. `i18n/` — Modulspezifische Übersetzungen (optional)

### Modul-Stufen
- **Basic**: Personalverwaltung, Tracking, Fuhrpark, Dateiimport, Berichte
- **Professional**: Leistungskennzahlen, Kapazitätsplanung, Lieferung, Bestandsverwaltung
- **Enterprise**: OEE, Schichtplanung, Qualitätskontrolle, Instandhaltung, SPS-Anbindung, Digitaler Zwilling

---

## 6. API-Übersicht

### Core-APIs
| Endpunkt | Beschreibung |
|----------|-------------|
| `POST /api/auth/login` | Anmeldung |
| `POST /api/auth/logout` | Abmeldung |
| `GET /api/health` | Statusprüfung |
| `GET /api/i18n` | Übersetzungen |
| `GET /api/search?q=keyword` | Globale Suche (Cmd+K) |
| `GET /api/sse/[moduleId]` | Echtzeit-SSE-Updates |
| `POST /api/ai/query` | KI-Assistent (OpenAI) |

### Admin-APIs
| Endpunkt | Beschreibung |
|----------|-------------|
| `GET/POST /api/admin/users` | Benutzerverwaltung |
| `GET/PUT /api/admin/settings` | Einstellungen |
| `GET/PUT /api/admin/modules` | Modulaktivierung |
| `GET/POST /api/admin/workflows` | Workflow-Regeln |
| `GET/POST /api/admin/api-keys` | API-Gateway-Schlüssel |
| `GET/POST /api/admin/sites` | Multi-Standort-Verwaltung |

### Modul-APIs (dynamisch)
| Endpunkt | Beschreibung |
|----------|-------------|
| `GET /api/modules/[moduleId]/data` | Moduldaten auflisten |
| `POST /api/modules/[moduleId]/data` | Moduldaten erstellen |
| `GET /api/modules/[moduleId]/export` | Export (xlsx/pdf) |

---

## 7. Schlüsselkomponenten

- **Export-Pipeline**: PDF (HTML-Template) + Excel (exceljs, Auto-Filter)
- **Echtzeit (SSE)**: In-Memory Event-Bus, 30s Heartbeat
- **Workflow-Engine**: JSON-basierte Regeln (Trigger → Bedingungen → Aktionen)
- **API-Gateway**: API-Schlüssel-Authentifizierung, Rate-Limiting
- **KI-Assistent**: OpenAI GPT-4o-mini, natürliche Sprache → SQL
- **PWA**: Installierbare Web-App, Service Worker mit Cache

---

## 8. Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|-------------|---------|
| `DB_ADAPTER` | DB-Typ | `mssql` |
| `DB_SERVER` | DB-Server | — |
| `AUTH_ADAPTER` | Auth-Typ | `session` |
| `JWT_SECRET` | JWT-Geheimnis (min. 32 Zeichen) | — |
| `DEFAULT_LOCALE` | Standardsprache | `en` |
| `OPENAI_API_KEY` | KI-Assistent API-Schlüssel | — |
