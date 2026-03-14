# Ainova Cloud Core — Complete Product Overview

**Prepared for:** Bryan (Branding & Marketing)  
**Date:** March 15, 2026  
**Purpose:** Full understanding of what Ainova is, what it does, and how it works

---

## What is Ainova Cloud Core?

Ainova Cloud Core is a **web-based manufacturing management software** designed to help factories and production facilities track, manage, and optimize their daily operations. Think of it as a digital control center for everything happening on the factory floor.

Instead of using spreadsheets, paper forms, or multiple disconnected systems, Ainova brings everything into one place that employees can access from any web browser — no installation needed.

---

## Who Uses It? (The Real-World Context)

**Primary users:**
- Production managers who need to see what's happening in real-time
- Shift supervisors tracking worker attendance and tasks
- Warehouse staff managing inventory and materials
- Quality control teams logging defects and inspections
- Maintenance crews scheduling equipment repairs
- Plant managers reviewing performance reports

**Company size:**
- Small to medium manufacturers (10-200 employees)
- Companies tired of Excel spreadsheets but can't afford SAP or Siemens
- Factories looking to modernize without spending €100,000+

---

## What Problems Does It Solve?

### Before Ainova (typical scenario):
- Worker attendance tracked in Excel or paper
- Production numbers written on whiteboards
- Inventory counts done manually with clipboards
- No one knows if they're meeting daily targets until the shift ends
- Reports take hours to compile manually
- Different departments use different systems that don't talk to each other

### After Ainova:
- Everything in one system, accessible from any device
- Real-time dashboards showing current status
- Automatic reports and exports
- Managers can see problems as they happen, not hours later
- Data flows between departments automatically
- Historical data for analysis and improvement

---

## Core Architecture (How It's Built)

### Technology Stack:
- **Frontend:** Next.js 16 + React 19 (modern web framework)
- **Backend:** Node.js with TypeScript (type-safe JavaScript)
- **Database:** PostgreSQL (Supabase Cloud, PgBouncer connection pooling)
- **Styling:** Tailwind CSS 4 (modern, responsive design)
- **Deployment:** Web-based (cloud or on-premise server)
- **Access:** Any modern web browser (Chrome, Edge, Firefox, Safari)

### Key Technical Features:
- **Server-side rendering** — Fast initial page loads, good for slower networks
- **Progressive Web App (PWA)** — Can be "installed" on desktop/mobile, works offline
- **Role-based access control (RBAC)** — Different permissions for different job roles
- **Multi-language support** — Hungarian, English, German (more can be added)
- **Modular system** — Features can be turned on/off based on license tier
- **API-first design** — Can integrate with other systems (ERP, PLC, etc.)

---

## The Module System (How Features Are Organized)

Ainova is built like LEGO blocks. Each **module** is a separate feature area that can be activated or deactivated. This allows:
- Customers to pay only for what they need
- Easy scaling as companies grow
- Clean separation of different business functions

### Current Modules (26 registered, 4 tiers + add-ons):

#### **STARTER Tier** (€99/month, up to 5 users)
1. **Inventory** — Stock management, material tracking, warehouse operations
2. **Invoicing** — Invoice generation, NAV-compatible billing
3. **Reports** — Standard reporting and data export
4. **File Import** — Bulk data import from Excel/CSV files

#### **BASIC Tier** (€299/month, up to 15 users)
All Starter modules plus:
5. **Workforce** — Employee attendance, shift tracking, headcount management
6. **Tracking** — Task and job tracking, work order management
7. **Fleet** — Vehicle management, mileage tracking, maintenance schedules
8. **Purchasing** — Purchase orders, supplier management, approvals
9. **POS** — Point-of-sale, cash register, receipt printing

*Basic Add-on modules (individually priced):*
- **Recipes** — Bill of materials, recipe management (€29/month)
- **Appointments** — Booking, scheduling, calendar (€29/month)
- **Projects** — Project planning, milestones, Gantt (€49/month)
- **E-commerce** — Online store, product catalog (€49/month)

#### **PROFESSIONAL Tier** (€599/month, up to 50 users)
All Basic modules plus:
8. **Performance** — KPI dashboards, performance analytics
9. **Scheduling** — Production scheduling, resource planning
10. **Delivery** — Shipping, receiving, logistics tracking
11. **CRM** — Customer relationship management, pipeline
12. **Worksheets** — Digital work instructions, checklists

*Professional Add-on modules:*
- **SAP Import** — Direct integration with SAP ERP system (€99/month)
- **API Gateway** — External API access, rate limiting, key management (€99/month)

#### **ENTERPRISE Tier** (€1199/month, unlimited users)
All Professional modules plus:
13. **OEE** — Overall Equipment Effectiveness (manufacturing gold standard)
14. **PLC Connector** — Direct machine data (Siemens S7, Modbus, OPC UA)
15. **Shift Management** — Complex shift patterns, rotation planning
16. **Quality** — Quality control, inspections, defect tracking, 8D workflow
17. **Maintenance** — Preventive & corrective maintenance, work orders
18. **Digital Twin** — 2D/3D visualization of factory layout and processes

*Enterprise Add-on module:*
- **Multi-site** — Multi-location management (€199/month)

#### **Additional**
- **AI Assistant** — ChatGPT-powered helper for data queries and insights (all tiers)
- **LAC Napi Perces** — Custom module for LAC company (disabled by default)

---

## User Interface & Experience

### Dashboard (Main Screen)
When someone logs in, they see:
- **Header bar** — Logo, user name, language selector, search, logout
- **Module tiles** — Large clickable cards for each active module
- **Quick stats** — Key numbers at a glance (today's attendance, active tasks, etc.)
- **Navigation** — Clean, simple menu structure

### Module Pages
Each module has its own dedicated page with:
- **Data tables** — Sortable, filterable lists of records
- **Forms** — Add/edit entries with validation
- **Charts & graphs** — Visual representation of data (using Recharts library)
- **Export buttons** — Download data as CSV or Excel
- **Action buttons** — Edit, delete, view details

### Admin Panel
Special area for system administrators with 10 sections:
1. **Users** — Create/manage user accounts
2. **Roles & Permissions** — Define who can do what
3. **Modules** — Activate/deactivate features
4. **Branding & Settings** — Company name, logo, colors, language
5. **Language & Formats** — Translation management, date/time formats
6. **Units** — Define measurement units (kg, pieces, hours, etc.)
7. **Import Configs** — Set up automated data imports
8. **Diagnostics** — System health checks, logs
9. **Audit Log** — Track who changed what and when
10. **License** — View/manage software license

### Setup Wizard
First-time installation walks through:
1. Welcome screen
2. Create admin account
3. Set company name and language
4. Choose which modules to activate
5. Enter license key (optional)

---

## Data Flow & Business Logic

### Example: Workforce Module (Attendance Tracking)

**User story:** A shift supervisor needs to record who showed up for work today.

1. Supervisor logs in → Dashboard
2. Clicks "Workforce" tile → Workforce module page
3. Sees a table of all employees with today's date
4. Clicks "New Entry" button
5. Form appears: Select employee, shift, date, status (present/absent/late)
6. Clicks "Save"
7. Data is validated (e.g., can't mark someone present twice)
8. Saved to database
9. Dashboard updates with new headcount
10. Manager can see real-time attendance from their office
11. End-of-day report automatically generated

**Behind the scenes:**
- Frontend sends data to `/api/modules/workforce/data` endpoint
- Backend validates session (is user logged in?)
- Checks permissions (does user have "workforce.create" permission?)
- Validates data (required fields, date format, etc.)
- Writes to `workforce_entries` database table
- Returns success/error message
- Frontend updates UI

### Example: Multi-language System

**How it works:**
1. System has fallback translation files (JSON) for HU/EN/DE
2. Admin can override translations in the database
3. User selects language from dropdown in header
4. Selection saved to database (`core_settings.app_locale`)
5. Page reloads with new language
6. All text pulled from translation system using keys like `workforce.title`
7. If translation missing, falls back to English

---

## Database Structure

### Core Tables (15 tables for system functions):
- `core_users` — User accounts
- `core_sessions` — Login sessions (who's logged in)
- `core_roles` — Job roles (admin, manager, operator, etc.)
- `core_permissions` — What each role can do
- `core_modules` — Which modules are active
- `core_settings` — System configuration (language, company name, etc.)
- `core_translations` — Custom text translations
- `core_units` — Measurement units
- `core_import_configs` — Automated import settings
- `core_notifications` — Email/alert queue
- `core_audit_log` — Change history
- `core_license` — License validation
- `workflow_rules` — Automation rules
- `api_keys` — External API access
- `sites` — Multi-location support

### Module Tables (each module has its own):
- `workforce_entries` — Attendance records
- `tracking_tasks` — Work orders and jobs
- `fleet_vehicles` — Vehicle registry
- `inventory_items` — Stock items
- `quality_inspections` — QC records
- etc.

---

## Security & Access Control

### Authentication:
- **Session-based** — Cookie stored in browser after login
- **Password hashing** — Bcrypt encryption (industry standard)
- **Session timeout** — Auto-logout after 30 minutes of inactivity
- **CSRF protection** — Prevents cross-site request forgery attacks

### Authorization (RBAC):
- Every user has a **role** (e.g., "Production Manager")
- Each role has **permissions** (e.g., "workforce.view", "workforce.create")
- System checks permissions before allowing any action
- Granular control: read vs. write vs. delete

### Audit Trail:
- Every create/update/delete action logged
- Records: who, what, when, old value, new value
- Cannot be deleted (compliance requirement)

---

## Import/Export System

### Import:
- **Formats:** Excel (.xlsx), CSV
- **Use case:** Bulk upload of employee lists, inventory, historical data
- **Process:**
  1. Admin uploads file
  2. System validates format and data
  3. Shows preview of what will be imported
  4. Admin confirms
  5. Data inserted into database
  6. Summary report generated (X records added, Y errors)

### Export:
- **Formats:** CSV, Excel, PDF (planned)
- **Use case:** Reports for management, data backup, analysis in other tools
- **Process:**
  1. User clicks "Export" button on any data table
  2. System generates file with current filters applied
  3. File downloads to user's computer
  4. Can be opened in Excel, Google Sheets, etc.

---

## Reporting & Analytics

### Built-in Reports:
- Daily attendance summary
- Production output by shift
- Inventory levels and movements
- Quality defect trends
- Equipment downtime
- Custom date range filtering

### Visualization:
- **Charts:** Line, bar, pie, area (using Recharts library)
- **Dashboards:** Customizable widget layouts
- **Real-time:** Data updates without page refresh (Server-Sent Events)

### Advanced Features (Enterprise tier):
- **OEE calculation** — Industry-standard manufacturing metric
- **Trend analysis** — Compare week-over-week, month-over-month
- **Predictive insights** — AI-powered recommendations (using OpenAI GPT-4)

---

## Integration Capabilities

### Current:
- **REST API** — JSON endpoints for external systems
- **API Gateway** — External API key management, rate limiting, usage tracking
- **CSV/Excel import** — Batch data from ERP, HR systems
- **SAP Import** — Direct integration with SAP ERP
- **PLC Connector** — Direct machine data (Siemens S7, Modbus, OPC UA)
- **Email notifications** — Alerts via SMTP
- **Server-Sent Events (SSE)** — Real-time push updates to connected clients
- **PWA** — Progressive Web App with offline capability

### Planned:
- **Webhook support** — Push notifications to other systems
- **Mobile app** — Native iOS/Android (future roadmap)

---

## Deployment Options

### Cloud (Recommended):
- Hosted on customer's cloud provider (Azure, AWS, Google Cloud)
- Accessible from anywhere with internet
- Automatic backups
- Scalable (add more servers as needed)

### On-Premise:
- Installed on customer's own server
- No internet required (can run on local network)
- Customer controls all data
- Requires IT staff for maintenance

### Hybrid:
- Main system in cloud
- Local edge devices for factory floor (offline capability)
- Syncs when connection available

---

## Licensing Model

### Tiers:
1. **STARTER** — €99/month — 4 core modules (inventory, invoicing, reports, import), up to 5 users
2. **BASIC** — €299/month — +5 modules (workforce, tracking, fleet, purchasing, pos) + 4 optional add-ons, up to 15 users
3. **PROFESSIONAL** — €599/month — +5 modules + 2 optional add-ons, up to 50 users
4. **ENTERPRISE** — €1199/month — +6 modules + 1 optional add-on, unlimited users, priority support
5. **CUSTOM** — Quote-based — Tailored features, dedicated instance

### License Validation:
- License key stored in database
- System checks tier and enforces module limits
- Grace period for expired licenses (read-only mode)
- Can upgrade/downgrade tiers

---

## Customization & Flexibility

### What Customers Can Customize (No Code):
- Company branding (logo, colors, name)
- Language and translations
- Measurement units (metric vs. imperial, custom units)
- User roles and permissions
- Module activation
- Import/export templates
- Report layouts

### What Requires Development:
- New modules
- Custom integrations
- Specialized workflows
- Industry-specific features

---

## Performance & Scalability

### Current Capacity:
- Tested with 200 concurrent users
- Database: Handles millions of records
- Page load: <2 seconds on average connection
- API response: <500ms for most queries

### Optimization:
- Server-side rendering for fast initial load
- Caching for frequently accessed data
- Lazy loading for large datasets
- Database indexing on key fields

---

## Roadmap & Future Features

### Phase 0–1 (Complete — March 2026):
- Core stabilization, bug fixes, Starter tier, Landing page
- Admin panel, multi-language (HU/EN/DE), RBAC, Import/Export

### Phase 2–3 (Complete — March 2026):
- Purchasing, POS, CRM, Worksheets modules
- Sector presets (6 industries)

### Phase 4–5 (Complete — March 2026):
- Recipes, Appointments, Projects add-on modules
- Industry sector presets (Food, Automotive, Pharma, etc.)

### Phase 6–7 (Complete — March 2026):
- E-commerce module, API Gateway
- PWA v3 with OffscreenCanvas, edge auth, CSP headers

### Future:
- Dashboard Builder (drag & drop widgets)
- Multi-site management
- Marketplace for third-party modules
- Mobile app (native iOS/Android)
- IoT sensor integration

---

## Technical Debt & Known Issues

### Completed Fixes:
- ✅ Language switcher sync (Service Worker cache issue)
- ✅ Session timeout bug (SQLite timezone handling)
- ✅ Module API 404 errors (routing fix)
- ✅ Hydration mismatch warnings (client/server sync)

### Current Limitations:
- Limited test coverage (unit tests in progress)
- No mobile app yet (web-responsive only, PWA available)
- Single database per instance (no sharding)

---

## Development Workflow

### Code Structure:
```
ainova-cloud-core/
├── app/                    # Pages and API routes
│   ├── (auth)/login/       # Login page
│   ├── dashboard/          # Main application
│   ├── setup/              # First-time setup
│   └── api/                # Backend endpoints
├── components/             # Reusable UI elements
├── lib/                    # Business logic
│   ├── auth/               # Authentication
│   ├── db/                 # Database adapters
│   ├── i18n/               # Translations
│   ├── modules/            # Module system
│   └── rbac/               # Permissions
├── modules/                # Feature modules
│   ├── workforce/
│   ├── tracking/
│   └── ...
├── database/core/          # SQL migration files
└── docs/                   # Documentation
```

### Build Process:
1. Developer writes code in TypeScript
2. Next.js compiles to optimized JavaScript
3. Tailwind CSS generates minimal CSS
4. Build output ready for deployment
5. Zero TypeScript errors enforced

### Database Migrations:
- SQL files numbered sequentially (001, 002, etc.)
- Run via `npm run migrate` script
- Creates/updates tables automatically
- Safe to run multiple times (idempotent)

---

## Support & Maintenance

### What's Included:
- Bug fixes and security patches
- Minor feature updates
- Email support (response within 24 hours)
- Documentation and user guides

### Enterprise Add-ons:
- Phone support
- Dedicated account manager
- Custom training sessions
- On-site installation assistance
- SLA guarantees (99.9% uptime)

---

## Competitive Positioning

### vs. SAP MES:
- **Ainova:** €99-1199/month, setup in 1 day, simple UI
- **SAP:** €100K+ license, 6-12 month implementation, complex

### vs. MRPeasy/Katana:
- **Ainova:** More customizable, on-premise option, modular pricing, 22 modules
- **Competitors:** Fixed feature sets, cloud-only, per-user pricing

### vs. Excel Spreadsheets:
- **Ainova:** Real-time, multi-user, automated, audit trail, mobile-friendly
- **Excel:** Manual, single-user, error-prone, no history, desktop-only

---

## Success Metrics (How We Measure Value)

### For Customers:
- Time saved on manual data entry (hours per week)
- Reduction in errors (% decrease in data mistakes)
- Faster decision-making (real-time vs. end-of-day reports)
- Cost savings (vs. previous system or manual processes)

### For Us:
- Customer retention rate
- Module adoption (which features are used most)
- Support ticket volume (fewer = better UX)
- Net Promoter Score (would customers recommend us?)

---

## Summary for Branding/Marketing

**Elevator Pitch:**
Ainova Cloud Core is a modern, affordable manufacturing & business management system that replaces spreadsheets and paper forms with a single, easy-to-use web application. With 22 modules covering everything from attendance to inventory to CRM to e-commerce, it helps small and medium businesses operate smarter — all in real-time, from any device.

**Key Differentiators:**
1. **Modular** — 22 modules across 4 tiers, pay only for what you need
2. **Affordable** — From €99/month, 10x cheaper than enterprise MES
3. **Fast** — Set up in hours, not months
4. **Flexible** — Cloud or on-premise, multi-language (HU/EN/DE), customizable
5. **Modern** — Next.js 16, PWA, real-time updates, beautiful UI

**Target Message:**
"Stop managing your factory with spreadsheets. Get real-time visibility, reduce errors, and make better decisions — without breaking the bank."

---

**Questions for Bryan:**
- What additional details do you need?
- Which aspects should we emphasize in marketing materials?
- Any technical terms that need further clarification?

---

*This document is a living resource. Last updated: March 15, 2026*
