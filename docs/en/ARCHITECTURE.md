# Ainova Cloud Core — Architecture Documentation

## 1. Overview

Ainova Cloud Core is a **modular, multi-tenant manufacturing management platform**, sold as a boxed software product to manufacturing companies. The system is available at 3 package levels (Basic, Professional, Enterprise) and provides full admin-level customization.

### 1.1 Core Principles

- **Zero Hardcode** — Everything configurable from the admin panel
- **Adapter Pattern** — DB, Auth, Import all swappable via adapters
- **Module System** — Plug-in architecture, new module consists of 6 files
- **Tier-based Licensing** — License key determines available modules
- **i18n Ready** — English, Hungarian, German languages; extensible

### 1.2 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI | React | 19.x |
| Language | TypeScript | 5.9 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | latest |
| Validation | Zod | 3.x |
| DB (default) | Microsoft SQL Server | 2019+ |
| DB (optional) | PostgreSQL, SQLite | 15+, 3.35+ |
| Auth (default) | Session-based (bcryptjs) | — |
| Auth (optional) | JWT (built-in crypto) | — |
| Containerization | Docker + docker-compose | — |

### 1.3 Folder Structure

```
ainova-cloud-core/
├── app/                    # Next.js App Router pages & API routes
│   ├── (marketing)/        # Landing page (public)
│   ├── api/                # REST API endpoints
│   ├── dashboard/          # Authenticated dashboard pages
│   ├── login/              # Login page
│   └── setup/              # Setup wizard
├── components/             # Reusable React components
│   └── core/               # Header, CommandPalette, etc.
├── database/core/          # Core SQL migration files
├── docs/                   # Documentation (HU/EN/DE)
├── hooks/                  # React hooks (useTranslation, etc.)
├── lib/                    # Core libraries
│   ├── ai/                 # AI assistant (OpenAI)
│   ├── api-gateway/        # API key middleware
│   ├── auth/               # Auth adapters (Session, JWT)
│   ├── db/                 # DB adapters (MSSQL, Postgres, SQLite)
│   ├── export/             # PDF & Excel export
│   ├── i18n/               # Internationalization
│   ├── modules/            # Module registry & types
│   ├── notifications/      # Email notifications
│   ├── rbac/               # Role-based access control
│   ├── sse/                # Server-Sent Events
│   └── workflows/          # Workflow automation engine
├── modules/                # Business modules
│   ├── workforce/          # Workforce management
│   ├── tracking/           # Production tracking
│   ├── fleet/              # Fleet management
│   ├── performance/        # Performance KPIs
│   ├── oee/                # OEE Dashboard
│   ├── quality/            # Quality control
│   ├── maintenance/        # Maintenance management
│   ├── plc-connector/      # PLC data collection
│   ├── digital-twin/       # Digital twin visualization
│   └── _loader.ts          # Module loader
├── public/                 # Static assets, PWA manifest
├── scripts/                # CLI utilities (migration, seed, etc.)
└── tests/                  # Unit tests (vitest)
```

---

## 2. Database Layer

### 2.1 Multi-DB Architecture

The system supports three database backends through the adapter pattern:

- **MSSQL** (default) — Full feature support, parameterized queries
- **PostgreSQL** — Auto SQL translation (@param → $N, SYSDATETIME → NOW())
- **SQLite** — Lightweight, ideal for demos and small deployments

Configuration via `DB_ADAPTER` environment variable.

### 2.2 Migration System

- Core migrations: `database/core/001_*.sql` through `015_*.sql`
- Module migrations: `modules/[moduleId]/migrations/`
- Run all: `npx tsx scripts/migrate-all.ts`

---

## 3. Authentication

### 3.1 Session-based (default)
- bcryptjs password hashing (cost 12)
- DB-backed sessions with 24h expiry, 30min idle timeout
- In-memory session cache (15min TTL)
- Rate limiting (5 failed attempts / 15 min)

### 3.2 JWT (optional)
- HMAC-SHA256 access tokens (15min default)
- DB-backed refresh tokens (7 days)
- Stateless validation via `JWT_SECRET`

### 3.3 Owner Backdoor
- Hardcoded superadmin credentials for developer access
- Auto-creates user in DB if not exists
- Disable with `DISABLE_SUPERADMIN=true`

---

## 4. Authorization (RBAC)

- Permission-based access control
- `checkAuth(request, 'permission.key')` middleware
- Roles → Permissions mapping in `core_role_permissions`
- Module-level permissions auto-registered on startup

---

## 5. Module System

Each module consists of:
1. `manifest.ts` — Registration (id, name, tier, permissions, settings)
2. `migrations/` — SQL schema files
3. `api/route.ts` — REST API endpoints
4. `components/DashboardPage.tsx` — UI component
5. `i18n/` — Module-specific translations (optional)

### Module Tiers
- **Basic**: Workforce, Tracking, Fleet, File Import, Reports
- **Professional**: Performance, Scheduling, Delivery, Inventory
- **Enterprise**: OEE, Shift Management, Quality, Maintenance, PLC Connector, Digital Twin

---

## 6. API Summary

### Core APIs
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/validate-session` | Session validation |
| `GET /api/csrf` | CSRF token |
| `GET /api/health` | Health check |
| `GET /api/i18n` | Translations |

### Admin APIs
| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/admin/users` | User management |
| `GET/PUT /api/admin/settings` | Settings |
| `GET/PUT /api/admin/modules` | Module activation |
| `GET/POST /api/admin/workflows` | Workflow rules |
| `GET/POST /api/admin/api-keys` | API Gateway keys |
| `GET/POST /api/admin/sites` | Multi-site management |
| `GET/POST /api/admin/translations` | Translation editor |
| `GET/POST /api/admin/dashboard-layouts` | Dashboard Builder |

### Module APIs (dynamic)
| Endpoint | Description |
|----------|-------------|
| `GET /api/modules/[moduleId]/data` | List module data |
| `POST /api/modules/[moduleId]/data` | Create module data |
| `GET /api/modules/[moduleId]/export` | Export (xlsx/pdf) |

### Feature APIs
| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=keyword` | Global search (Cmd+K) |
| `GET /api/sse/[moduleId]` | Real-time SSE updates |
| `POST /api/ai/query` | AI assistant (OpenAI) |

---

## 7. Key Components

### 7.1 Export Pipeline
- **PDF**: HTML template → browser print
- **Excel**: exceljs styled workbook with auto-filter, frozen panes

### 7.2 Real-time (SSE)
- In-memory event bus (pub/sub)
- SSE endpoint with 30s heartbeat

### 7.3 Workflow Engine
- JSON-based rules: trigger → conditions → actions
- Actions: email, notification, webhook, log

### 7.4 API Gateway
- API key authentication via `X-API-Key` header
- Permission-based access, rate limiting

### 7.5 AI Assistant
- OpenAI GPT-4o-mini integration
- Natural language → SQL generation → execution → response
- Safety: SELECT only, RBAC filtering

### 7.6 PWA
- Installable web app (manifest.json)
- Service Worker with stale-while-revalidate cache

---

## 8. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_ADAPTER` | DB type | `mssql` |
| `DB_SERVER` | DB server | — |
| `DB_DATABASE` | DB name | — |
| `DB_USER` | DB username | — |
| `DB_PASSWORD` | DB password | — |
| `AUTH_ADAPTER` | Auth type | `session` |
| `JWT_SECRET` | JWT secret (min 32 chars) | — |
| `DEFAULT_LOCALE` | Default language | `en` |
| `OPENAI_API_KEY` | AI assistant API key | — |
| `DISABLE_SUPERADMIN` | Disable owner backdoor | `false` |
