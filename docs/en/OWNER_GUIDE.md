# Ainova Cloud Core — Developer & Owner Guide

> This document is for you, the software developer and owner. It contains all essential knowledge about how the system works, where to find things, and how to prepare it for sale.

---

## I. HOW THE SYSTEM WORKS

### 1. First Launch — Setup Wizard

When the software is first installed at a customer site (or started in Docker):

1. Browser opens: `http://localhost:3000/setup`
2. **Admin account** creation (username + password)
3. **Branding** setup (company name, language)
4. **Modules** selection (which ones to use)
5. **License key** entry (optional — without it, Basic package)
6. → System ready to use, redirect to login

**API endpoint:** `/api/setup` — GET (status), POST (step execution)
**UI:** `app/setup/page.tsx`

### 2. Login Flow

```
User → /login → POST /api/auth/login
  ├── SessionAdapter: DB-backed session cookie (default)
  └── JwtAdapter: HMAC-SHA256 access token (optional)

Session validation on every API call:
  Request → checkSession() → checkAuth() → API handler
```

**Key files:**
- `lib/auth/index.ts` — Auth factory (SessionAdapter or JwtAdapter)
- `lib/auth/adapters/SessionAdapter.ts` — Session management, rate limiting, cache
- `lib/auth/adapters/JwtAdapter.ts` — JWT token generation and validation
- `lib/auth/superadmin.ts` — Owner backdoor credentials
- `lib/api-utils.ts` — checkSession(), checkCsrf()
- `lib/rbac/middleware.ts` — checkAuth() permission check

### 3. Owner / Superadmin Access

A hardcoded owner login is built into the system so you can always access any installation:

- **Username:** `ainova_owner`
- **Password:** `AiNova#Core2025!SuperAdmin`
- **Role:** admin (full access)

This works on both SessionAdapter and JwtAdapter. The user is auto-created in the DB on first login. To disable in customer production builds, set `DISABLE_SUPERADMIN=true`.

### 4. Dashboard & Module Loading

```
/dashboard → DashboardPage (server component)
  1. Validate session cookie
  2. Fetch user role
  3. Load active modules (filtered by role permissions)
  4. Render MenuTile grid
```

### 5. Module System

Every module is a self-contained plugin:
```
modules/workforce/
├── manifest.ts            # Module registration
├── migrations/            # SQL schema
│   └── 001_workforce.sql
├── api/
│   └── route.ts           # REST API
├── components/
│   └── DashboardPage.tsx  # UI
└── i18n/                  # Translations (optional)
```

### 6. Available Modules

| Tier | Module | Description |
|------|--------|-------------|
| Basic | Workforce | Employee scheduling, attendance |
| Basic | Tracking | Production order tracking |
| Basic | Fleet | Vehicle fleet management |
| Basic | File Import | Generic file import UI |
| Basic | Reports | Report generator |
| Professional | Performance | KPIs, efficiency metrics |
| Professional | Scheduling | Capacity planning |
| Professional | Delivery | Delivery management |
| Professional | Inventory | Inventory management |
| Enterprise | OEE | Overall Equipment Effectiveness |
| Enterprise | Shift Management | Shift scheduling |
| Enterprise | Quality | Quality control, inspections |
| Enterprise | Maintenance | Preventive maintenance |
| Enterprise | PLC Connector | PLC data collection (S7, Modbus, MQTT) |
| Enterprise | Digital Twin | 2D factory floor visualization |

---

## II. ADMIN PANEL

### 7. User Management
- Create/edit/disable users
- Assign roles
- Password reset (first login flag)

### 8. Roles & Permissions
- Create custom roles
- Permission matrix (checkboxes)
- Module-level permissions auto-registered

### 9. Module Activation
- Toggle modules on/off
- Dependency checking (cannot disable a dependency)
- License tier enforcement

### 10. Branding & Settings
- Company name, logo upload
- Date/time format
- Language selection (EN/HU/DE)

---

## III. LICENSING

### 11. License Tiers

| Tier | Modules | Max Users |
|------|---------|-----------|
| Basic | 5 core modules | 10 |
| Professional | + 4 professional modules | 50 |
| Enterprise | + 6 enterprise modules | Unlimited |

### 12. License Key Generation
```bash
npx tsx scripts/generate-license.ts
```

---

## IV. DEPLOYMENT

### 13. Docker
```bash
docker build -t ainova-cloud-core:latest .
docker-compose up -d
```

### 14. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_ADAPTER` | Database type (mssql/postgres/sqlite) | `mssql` |
| `DB_SERVER` | Database server | — |
| `DB_DATABASE` | Database name | — |
| `DB_USER` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `AUTH_ADAPTER` | Auth type (session/jwt) | `session` |
| `JWT_SECRET` | JWT secret key (min 32 chars) | — |
| `DEFAULT_LOCALE` | Default language | `en` |
| `OPENAI_API_KEY` | AI assistant API key | — |
| `DISABLE_SUPERADMIN` | Disable owner backdoor | `false` |

---

## V. QUICK REFERENCE

### Key File Locations

| What | Where |
|------|-------|
| Auth logic | `lib/auth/adapters/SessionAdapter.ts` |
| DB adapter | `lib/db/adapters/MssqlAdapter.ts` |
| Permission check | `lib/rbac/middleware.ts` |
| Module registry | `lib/modules/registry.ts` |
| Module loader | `modules/_loader.ts` |
| Settings | `lib/settings.ts` |
| License check | `lib/license.ts` |
| Core migrations | `database/core/` |
| PDF/Excel export | `lib/export/pdf.ts`, `lib/export/excel.ts` |
| Email notifications | `lib/notifications/email.ts` |
| SSE real-time | `lib/sse/event-bus.ts` |
| Workflow engine | `lib/workflows/engine.ts` |
| API Gateway | `lib/api-gateway/middleware.ts` |
| AI assistant | `lib/ai/assistant.ts` |
| Global search | `components/core/CommandPalette.tsx` |
| Landing page | `app/(marketing)/page.tsx` |
| PWA manifest | `public/manifest.json`, `public/sw.js` |
| Superadmin config | `lib/auth/superadmin.ts` |

### Commands

```bash
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run type-check       # TypeScript check
npm run test             # Unit tests (vitest)
npm run test:coverage    # Tests + coverage
npx tsx scripts/migrate-all.ts        # DB migrations
npx tsx scripts/bootstrap-admin.ts    # Admin account
npx tsx scripts/generate-license.ts   # License generation
npx tsx scripts/seed-demo-data.ts     # Generate demo data
```

---

## VI. NEW FEATURES (v1.1+)

### PDF/Excel Export
- API: `GET /api/modules/[moduleId]/export?format=xlsx` or `?format=pdf`
- Styled headers, auto-width, frozen panes, auto filter

### Global Search (Ctrl+K)
- Command Palette with keyboard navigation
- Searches pages, admin items, and active modules

### Language Switcher (EN/HU/DE)
- Header dropdown with instant switching
- All UI elements update immediately

### Email Notifications
- SMTP configuration from admin panel or environment variables
- Templates: alert, report summary, welcome email

### Real-time Updates (SSE)
- Server-Sent Events for live module data
- In-memory event bus with 30s heartbeat

### Workflow Automation
- No-code rule engine: IF condition THEN action(s)
- Actions: email, notification, webhook, log

### API Gateway
- External systems access data via API keys
- `X-API-Key` header authentication with rate limiting

### AI Assistant
- OpenAI GPT-4o-mini integration
- Natural language queries → SQL generation → response
- Requires `OPENAI_API_KEY` env var

### PLC Connector
- Automatic data collection from PLC controllers
- Supports Siemens S7, Modbus TCP, MQTT protocols

### Digital Twin
- 2D factory floor visualization
- Real-time machine status (running/idle/warning/error/maintenance)

### Dashboard Builder
- Per-user dashboard layouts with widget system
- Widget types: KPI, bar, line, pie, table, gauge, heatmap

### PWA (Progressive Web App)
- Installable web app with offline caching
- Service Worker with stale-while-revalidate strategy

### Tests & CI
- vitest unit tests
- GitHub Actions CI pipeline (type-check + build + test)
