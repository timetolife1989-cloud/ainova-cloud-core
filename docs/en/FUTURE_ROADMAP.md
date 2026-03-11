# Ainova Cloud Intelligence — Product Roadmap

## Implementation Status

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | PDF/Excel Export | 1 | ✅ Done |
| 2 | Demo Environment | 1 | ✅ Done |
| 3 | Landing Page | 1 | ✅ Done |
| 4 | Email Notifications | 1 | ✅ Done |
| 5 | Dashboard Builder | 2 | ✅ Done |
| 6 | PWA + Offline | 2 | ✅ Done |
| 7 | Global Search (Cmd+K) | 2 | ✅ Done |
| 8 | Real-time SSE | 2 | ✅ Done |
| 9 | Language Switcher (EN/HU/DE) | 2 | ✅ Done |
| 10 | Translation Editor | 2 | ✅ Done |
| 11 | AI Assistant | 3 | ✅ Done |
| 12 | PLC Connector | 3 | ✅ Done |
| 13 | Digital Twin | 3 | ✅ Done |
| 14 | Workflow Engine | 3 | ✅ Done |
| 15 | API Gateway | 3 | ✅ Done |
| 16 | Multi-site | 3 | ✅ Done |
| 17 | Tests & CI | T | ✅ Done |
| 18 | Marketplace | 4 | ⏳ Planned |
| 19 | Mobile App | 4 | ⏳ Planned |
| 20 | Multi-tenant SaaS | 4 | ⏳ Planned |
| 21 | Embedded BI | 4 | ⏳ Planned |

---

## Phase 1 — Sales-Ready (✅ Complete)

### 1.1 PDF/Excel Export
- Per-module data export via API
- Excel: styled headers, auto-width, frozen panes, auto-filter
- PDF: HTML template with company branding

### 1.2 Demo Environment
- Seed script generating 30 days of realistic data
- Demo users: admin, manager, operator
- Run: `npx tsx scripts/seed-demo-data.ts`

### 1.3 Landing Page
- Marketing page at `/` with Hero, Features, Pricing, CTA
- Responsive design, animated sections
- EUR pricing (€299/€599/€1,199 per month)

### 1.4 Email Notifications
- SMTP configuration from admin panel or environment variables
- Templates: alert, report summary, welcome email
- nodemailer integration (optional dependency)

---

## Phase 2 — Competitive Advantage (✅ Complete)

### 2.1 Dashboard Builder
- Per-user dashboard layouts with widget system
- Widget types: KPI, bar, line, pie, table, gauge, heatmap
- API: `GET/POST /api/admin/dashboard-layouts`

### 2.2 Real-time SSE
- Server-Sent Events for live module data updates
- In-memory event bus with 30s heartbeat
- Auto-reconnect on client side

### 2.3 Global Search (Ctrl+K)
- Command Palette with keyboard navigation
- Static pages + dynamic module search via API
- Keyboard shortcuts: ↑↓ Enter Esc

### 2.4 PWA
- Installable web app (manifest.json)
- Service Worker with stale-while-revalidate cache
- Apple mobile web app support

### 2.5 Language Switcher
- Header dropdown: EN 🇬🇧 / HU 🇭🇺 / DE 🇩🇪
- Instant switching with page reload
- DB-backed translation overrides

### 2.6 Translation Editor
- Admin API for managing translation overrides
- Bulk import/export support
- Per-locale key-value management

---

## Phase 3 — Innovation (✅ Complete)

### 3.1 AI Assistant
- OpenAI GPT-4o-mini integration
- Natural language → SQL generation → execution → response
- Safety: SELECT only, RBAC filtering
- Requires `OPENAI_API_KEY` env var

### 3.2 Workflow Engine
- No-code rule engine: IF conditions THEN actions
- Actions: email, notification, webhook, log
- JSON-based rule definitions in `core_workflow_rules`

### 3.3 API Gateway
- External system access via API keys
- `X-API-Key` header authentication
- Rate limiting, permission-based access
- Admin API for key management

### 3.4 Multi-site
- Multiple facility management
- `core_sites` table with site metadata
- Default site: "Headquarters" (HQ)

### 3.5 PLC Connector
- Automatic data collection from PLC controllers
- Protocols: Siemens S7, Modbus TCP, MQTT
- Device management dashboard
- Register-based data polling

### 3.6 Digital Twin
- 2D factory floor visualization on canvas
- Real-time machine status indicators
- Machine types: CNC, press, welder, paint, assembly, packing
- Click → detail popup

---

## Phase 4 — Platform Scale (Planned)

### 4.1 Marketplace
- Third-party module marketplace
- Module package format, upload, install
- Developer documentation and SDK

### 4.2 Mobile App
- React Native (Expo)
- Barcode scanner integration
- Offline sync capability

### 4.3 Multi-tenant SaaS
- Central tenant registry
- Auto DB provisioning per tenant
- Subdomain routing
- Billing integration

### 4.4 Embedded BI
- Drag-and-drop report builder
- Scheduled email reports
- Custom chart and dashboard creation

---

## Technical Debt

### T1. Testing & CI (✅ Done)
- vitest unit tests
- GitHub Actions CI pipeline
- Coverage reporting (v8)

### T2. Performance Monitoring (Planned)
- Response time tracking
- DB query profiling
- Health check dashboard

### T3. Documentation Generation (Planned)
- TypeDoc — API documentation
- Storybook — UI component catalog
- OpenAPI spec — Swagger UI

> **Note:** Phase 1-3 features are fully implemented. Phase 4 features require platform-level architectural work and should only be started after establishing a stable customer base.
