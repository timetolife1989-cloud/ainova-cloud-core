# Ainova Cloud Intelligence (ACI)

## Complete Product & Project Reference

**Version:** 2.0  
**Last Updated:** March 15, 2026  
**Status:** Production-ready (Phase 0–7 complete)

---

## Table of Contents

1. [Company & Vision](#1-company--vision)
2. [Product Definition](#2-product-definition)
3. [Target Market](#3-target-market)
4. [Module Architecture](#4-module-architecture)
5. [Licensing & Pricing Model](#5-licensing--pricing-model)
6. [User Interface & Experience](#6-user-interface--experience)
7. [Administration System](#7-administration-system)
8. [Technology Stack](#8-technology-stack)
9. [Database Architecture](#9-database-architecture)
10. [Security Model](#10-security-model)
11. [Deployment Options](#11-deployment-options)
12. [Integration Capabilities](#12-integration-capabilities)
13. [Competitive Landscape](#13-competitive-landscape)
14. [Project Structure](#14-project-structure)
15. [Development Status](#15-development-status)
16. [Glossary](#16-glossary)

---

## 1. Company & Vision

**Ainova** is a technology company building industrial intelligence software. The company's goal is to make manufacturing management software accessible and affordable for small and medium-sized factories — companies that currently run on spreadsheets, paper, and disconnected tools because enterprise solutions like SAP or Siemens are too expensive and too complex.

**Core philosophy:** A 50-person factory should have access to the same level of digital management as a 5,000-person corporation — without the enterprise price tag.

**Business model:** Software-as-a-Service (SaaS) with flat monthly pricing (not per-user), plus optional on-premise deployment for companies with strict data sovereignty requirements.

**Headquarters:** Hungary (EU)  
**Markets:** Central Europe (primary), Western Europe and English-speaking markets (expansion)  
**Languages supported:** Hungarian, English, German (extensible to any language)

---

## 2. Product Definition

**Ainova Cloud Intelligence (ACI)** is a modular, web-based manufacturing and business management platform. It replaces fragmented tools (Excel, paper forms, whiteboards, disconnected software) with a single system accessible from any web browser on any device.

### What ACI Does

ACI covers the full operational spectrum of a manufacturing or service company:

- **People management** — Who showed up for work, which shift, overtime, absences
- **Production tracking** — What is being produced, at what rate, with what quality
- **Inventory control** — What materials are in stock, what needs reordering
- **Equipment management** — Machine status, maintenance schedules, downtime tracking
- **Quality assurance** — Inspection records, defect tracking, 8D problem-solving workflows
- **Sales & customers** — CRM pipeline, invoicing, order management
- **Logistics** — Delivery tracking, fleet management, vehicle logs
- **Analytics** — Real-time dashboards, KPI tracking, OEE calculations, custom reports
- **Integration** — SAP connectivity, PLC/machine data, API access for third-party systems

### What ACI Is Not

- **Not an ERP** — ACI is a focused operational tool, not a full enterprise resource planning system. It can work alongside an ERP or replace parts of it.
- **Not a general-purpose project management tool** — It has project tracking capabilities, but its core strength is factory-floor operations.
- **Not hardware-dependent** — It runs in any web browser. No proprietary terminals or devices required (though it can connect to PLCs and machines).

---

## 3. Target Market

### Primary Segments

| Segment | Company Size | Pain Point | ACI Value Proposition |
|---|---|---|---|
| **Micro manufacturers** | 1–10 employees | Running on Excel/paper, no budget for ERP | Starter tier at €99/month replaces spreadsheets |
| **Small factories** | 10–50 employees | Growing pains, need to track people and production | Basic/Professional tier centralizes all operations |
| **Medium factories** | 50–200 employees | Using disconnected systems, poor visibility | Professional/Enterprise tier with real-time dashboards, OEE, machine connectivity |
| **Service companies** | 5–50 employees | Need worksheets, appointments, CRM, invoicing | Professional tier covers the full service workflow |

### Industry Verticals

ACI includes built-in sector presets for rapid deployment:

| Sector | Key Modules | Example Customer |
|---|---|---|
| **General Manufacturing** | Workforce, Tracking, Inventory, OEE, Quality | Metal fabrication shop, plastics factory |
| **Food & Beverage** | Recipes, Inventory, Quality, Maintenance | Bakery, dairy, brewery |
| **Automotive Supply Chain** | OEE, Quality (8D reports), Shift Management, PLC | Tier 2/3 automotive supplier |
| **Pharmaceuticals** | Quality, Maintenance, Inventory, Audit Log | Supplement manufacturer, chemical plant |
| **Logistics & Warehousing** | Fleet, Delivery, Inventory, Tracking | Distribution center, courier company |
| **Field Service** | Worksheets, Appointments, CRM, Fleet | HVAC installer, equipment maintenance company |

### Geographic Focus

- **Phase 1 (current):** Hungary and neighboring countries (Austria, Slovakia, Romania, Germany)
- **Phase 2 (planned):** Western Europe (UK, Benelux, Nordics)
- **Phase 3 (future):** Global English-speaking markets

The platform supports full multi-language capability. All UI text, labels, and error messages are managed through a translation system. An administrator can customize any translation without code changes.

---

## 4. Module Architecture

ACI uses a modular architecture. Each module is a self-contained feature area with its own database tables, API endpoints, and user interface. Modules can be activated or deactivated per customer based on their license tier.

### 4.1 Starter Tier Modules (4 modules)

**Inventory**
Stock management with real-time tracking. Supports goods receipt, goods issue, stock adjustments, and threshold alerts. Tracks movement history with timestamps and user attribution. Warehouse locations and bin management supported.

**Invoicing**
Invoice creation with Hungarian NAV (tax authority) compatibility. Supports 5 VAT rates, automatic invoice numbering, PDF generation, and XML export for NAV electronic reporting. Can auto-generate invoices from worksheets and purchase orders.

**Reports**
Customizable report builder. Users can select data sources, apply date filters, choose chart types (line, bar, pie, area), and save report configurations for reuse. Export to CSV and Excel. Reports can be scheduled for automatic generation.

**File Import**
Drag-and-drop file upload for Excel (.xlsx) and CSV files. Intelligent column mapping suggests field matches. Preview mode shows data before commitment. Supports bulk insert and update operations. Import configurations can be saved and reused.

### 4.2 Basic Tier Modules (+5 modules)

Everything in Starter, plus:

**Workforce**
Daily headcount and attendance tracking. Shift supervisors record present/absent/late/overtime status per worker per shift. Supports multiple shifts per day. Generates daily, weekly, and monthly summaries with automatic overtime calculations.

**Tracking**
Task and work order management with configurable status workflows. An order progresses through states (e.g., Planned → In Progress → Completed → Archived) with full timestamp history. Filter by status, date range, assigned worker, or priority.

**Fleet**
Vehicle and equipment registry. Tracks trips, fuel consumption, mileage, and maintenance status per vehicle. Supports vehicle categories (forklift, truck, van, company car). Calculates cost-per-kilometer and maintenance intervals.

**Purchasing**
Supplier management and purchase order workflow. Create purchase orders, track approval status, log goods receipt against orders. Automatic inventory update on receipt confirmation. Supplier performance tracking (delivery time, quality rating).

**POS (Point of Sale)**
Sales terminal for retail or factory shop operations. Product catalog, barcode scanning support, multiple payment methods, receipt printing, and daily closing/reconciliation. Integrates with Inventory module for automatic stock deduction.

### 4.3 Basic Add-on Modules (4 modules, individually purchasable)

**Recipes** (€29/month)
Bill of materials management. Define products as recipes with ingredient lists and quantities. When a recipe is produced, ingredients are automatically deducted from inventory. Supports multi-level recipes (a recipe can contain another recipe).

**Appointments** (€29/month)
Scheduling and booking system. Calendar view with time slots, capacity management, and double-booking prevention. Client database with contact information. Supports recurring appointments and automated reminders.

**Projects** (€49/month)
Project management with tasks, milestones, Kanban board view, and budget tracking. Track time spent vs. estimated. Assign team members to tasks. Budget vs. actual cost comparison with visual progress indicators.

**E-commerce** (€49/month)
Integration with online stores (WooCommerce, Shopify). Automatic order import, stock level synchronization, and order status updates. Product catalog management with pricing tiers.

### 4.4 Professional Tier Modules (+5 modules)

Everything in Basic, plus:

**Performance**
KPI dashboards for individual and team performance measurement. Compares standard time vs. actual time per task. Efficiency percentage calculated and tracked over time. Visual dashboards with trend lines and target markers.

**Scheduling**
Production capacity planning. Allocate resources (machines, work areas, personnel) to time blocks. Visual calendar with drag-and-drop. Shows utilization percentage per resource. Conflict detection when resources are overbooked.

**Delivery**
Shipment management. Track outgoing deliveries by customer, date, carrier, and status. Summary view with on-time delivery rate. Delivery notes generation with item lists and quantities. Route planning support.

**CRM (Customer Relationship Management)**
Contact management with company and person records. Sales pipeline with customizable stages (Lead → Qualified → Proposal → Negotiation → Won/Lost). Interaction logging (calls, emails, meetings). Revenue forecasting based on pipeline values.

**Worksheets**
Digital work orders for field service and on-site work. Record labor hours, materials used, and work performed. Customer signature capture on tablet/phone. Automatic PDF generation. Direct conversion to invoice with one click.

### 4.5 Professional Add-on Modules (2 modules, individually purchasable)

**SAP Import** (€99/month)
Bidirectional data integration with SAP ERP systems. Imports material master data, production orders, and inventory levels from SAP via RFC or OData protocols. Requires active SAP connectivity license on the customer side.

**API Gateway** (€99/month)
External REST API with authentication. Customers or third-party systems can read and write ACI data programmatically. Features API key management, rate limiting (100 requests/minute default), usage logging, and documentation portal.

### 4.6 Enterprise Tier Modules (+6 modules)

Everything in Professional, plus:

**OEE (Overall Equipment Effectiveness)**
The manufacturing industry's gold-standard metric. Calculates OEE = Availability × Performance × Quality for each machine or production line. World-class is 85%. Visual gauges with color coding (red/amber/green). Historical trend tracking. Benchmark comparison across machines.

**Shift Management**
Complex shift scheduling. Define shift patterns (morning/afternoon/night, rotating, flexible). Assign workers to shifts with conflict detection (prevents double-scheduling). Calendar view for shift overview. Integration with Workforce module for attendance validation.

**Quality**
Quality control with inspection records, defect tracking, and the full 8D problem-solving methodology (Define → Measure → Analyze → Improve → Control). Used extensively in automotive supply chains where 8D reports are required by OEMs. Defect categorization and Pareto analysis.

**Maintenance**
Preventive and corrective maintenance management. Define maintenance schedules based on time intervals or usage hours. Automatic due-date calculation with visual status (green = OK, amber = due soon, red = overdue). Maintenance work orders with parts list and labor tracking.

**PLC Connector**
Direct machine data acquisition. Supports industrial communication protocols: Siemens S7, Modbus TCP/RTU, MQTT, and OPC-UA. Reads sensor values (temperature, speed, cycle count, status) directly from programmable logic controllers. No manual data entry required for machine metrics. Requires on-site hardware setup.

**Digital Twin**
2D visual representation of the factory floor. SVG-based interactive map showing machine positions, status indicators, and real-time data overlays. Click on a machine to see its current OEE, last maintenance date, and production status. Includes 7 demo machine definitions for immediate demonstration.

### 4.7 Enterprise Add-on Module

**Multi-site** (€199/month)
Multi-location management for companies operating multiple factories or branches. Separate data per site with consolidated reporting at the corporate level. User access can be scoped to specific sites.

### 4.8 System-Level Features (All Tiers)

**AI Assistant**
Natural language interface for data queries. Users can ask questions like "What was last week's OEE for production line A?" and receive answers pulled from the database. Powered by OpenAI GPT-4. Requires an OpenAI API key configured by the administrator.

**Search**
Global search across all active modules. Type-ahead suggestions with recent search history. Searches records, users, and system settings.

**Notifications**
Event-driven notification system. Configurable alerts for threshold breaches (e.g., inventory below minimum), overdue tasks, and maintenance deadlines. Delivered via in-app notification center and optional email (SMTP).

**Real-time Updates**
Server-Sent Events (SSE) push data changes to all connected clients in real-time. When one user creates a record, all other users see it instantly without refreshing the page.

---

## 5. Licensing & Pricing Model

### 5.1 Subscription Tiers

| Tier | Monthly Price | Max Users | What's Included |
|---|---|---|---|
| **Starter** | €99 | 5 | 4 modules: Inventory, Invoicing, Reports, File Import |
| **Basic** | €299 | 15 | Starter + 5 modules: Workforce, Tracking, Fleet, Purchasing, POS |
| **Professional** | €599 | 50 | Basic + 5 modules: Performance, Scheduling, Delivery, CRM, Worksheets |
| **Enterprise** | €1,199 | Unlimited | Professional + 6 modules: OEE, Shift Mgmt, Quality, Maintenance, PLC, Digital Twin |

### 5.2 Add-on Modules

Available for purchase on top of the tier package. Each add-on has a minimum tier requirement:

| Add-on | Price/Month | Min. Tier | Category |
|---|---|---|---|
| Recipes | €29 | Starter | Production |
| Appointments | €29 | Starter | Service |
| Projects | €49 | Basic | Management |
| E-commerce | €49 | Basic | Sales |
| SAP Import | €99 | Professional | Integration |
| API Gateway | €99 | Professional | Integration |
| Multi-site | €199 | Enterprise | Infrastructure |

### 5.3 Implementation Fees (One-time)

| Tier | Implementation Fee | What's Included |
|---|---|---|
| Starter | €299 | Remote setup, initial configuration, 2h training |
| Basic | €599 | Remote setup, data migration assistance, 4h training |
| Professional | €1,499 | On-site or remote setup, full data migration, 8h training, workflow configuration |
| Enterprise | €2,999 | On-site setup, SAP/PLC integration, custom branding, 16h training, dedicated project manager |

### 5.4 Pricing Philosophy

**Flat monthly fee, not per-user.** This is ACI's primary pricing advantage. Competitors like SAP, Odoo, and Microsoft Dynamics charge €20–€100 per user per month. A 50-person factory would pay:

| System | 50-User Monthly Cost |
|---|---|
| **ACI Professional** | **€599** |
| Odoo | ~€1,000 |
| Katana | ~€799 |
| SAP Business One | ~€5,000 |
| Microsoft Dynamics | ~€3,500 |

At scale, ACI is **5-10x cheaper** than traditional enterprise software.

### 5.5 License Enforcement

The license system is built into the platform:
- License key stored in the database (`core_license` table)
- System checks tier, allowed modules, user count, and expiration date on every request
- When a license expires, the system enters read-only mode (data remains accessible, but no new entries can be created)
- Custom module lists can override tier defaults for negotiated packages

---

## 6. User Interface & Experience

### 6.1 Design Principles

- **Dark theme** with industrial-grade color palette (professional, reduces eye strain)
- **Responsive design** — works on desktop monitors, tablets, and phones
- **Progressive Web App (PWA)** — can be installed on desktop/mobile, works with limited connectivity
- **Consistent patterns** — every module follows the same layout: data table → detail view → forms
- **Real-time** — changes appear immediately without page refresh

### 6.2 Main Application Flow

1. **Login page** → Username/password authentication
2. **Dashboard** → Grid of module tiles (only shows modules the user has permission to access)
3. **Module page** → Data table with search, filter, sort, and pagination
4. **Detail/edit view** → Form with validation, action buttons
5. **Admin panel** → System configuration (admin users only)

### 6.3 Navigation Elements

- **Header bar** — Company logo, user name, language selector, search icon, logout
- **Module tiles** — Large, clickable cards with module name, icon, and description
- **Command Palette** — Keyboard shortcut (Ctrl+K) for power users to jump to any module or action
- **Breadcrumbs** — Show current location within the application

### 6.4 Data Table Features

Every module's main view is a data table with:
- Column sorting (click header to sort ascending/descending)
- Full-text search
- Date range filtering
- Status filtering (active, completed, archived)
- Pagination with configurable page size
- Export button (CSV/Excel)
- Inline action icons (view, edit, delete)

### 6.5 Form Patterns

All create/edit forms follow the same pattern:
- Field labels in the selected language
- Required fields marked with asterisk
- Real-time validation (immediate feedback on errors)
- Save/Cancel buttons
- Confirmation dialog for destructive actions (delete)

---

## 7. Administration System

ACI includes a comprehensive admin panel accessible only to users with the Administrator role.

### 7.1 User Management
Create, edit, deactivate user accounts. Assign roles. Force password reset. View last login date and session history.

### 7.2 Roles & Permissions (RBAC)
Role-Based Access Control with granular permissions. Each module defines permissions like `module.view`, `module.create`, `module.edit`, `module.delete`. Roles are collections of permissions. Built-in roles: Administrator, Manager, Operator, Viewer. Custom roles can be created.

### 7.3 Module Control
Activate or deactivate modules. View module dependencies (e.g., POS depends on Inventory). Toggle modules without data loss — deactivated module data remains in the database and reappears when reactivated.

### 7.4 Branding & Settings
Company name, logo upload, primary and accent colors, favicon. These are applied across the entire application — login page, header, reports, PDF exports.

### 7.5 Language Management
Select default language (HU/EN/DE). Edit any translation string from the admin panel without code changes. Translations are stored in the database and override the built-in defaults. Missing translations fall back to English.

### 7.6 Units of Measurement
Define custom measurement units (kg, pieces, meters, liters, hours, etc.). Units are used across Inventory, Recipes, Purchasing, and other modules for consistent measurements.

### 7.7 Import Configuration
Define reusable import templates. Map Excel/CSV columns to database fields. Set validation rules. Save configurations for repeated imports (e.g., daily production report from an older system).

### 7.8 Diagnostics
System health dashboard showing database connection status, application version, build information, Node.js version, memory usage, and uptime.

### 7.9 Audit Log
Complete history of every action performed in the system. Records include: timestamp, user, action type (login, create, update, delete), affected module and record, old value, new value, and IP address. Audit logs cannot be deleted or modified (compliance requirement).

### 7.10 License Management
View current license details: tier, expiration date, maximum users, allowed modules, and customer information. License key validation with visual status indicator.

---

## 8. Technology Stack

### 8.1 Frontend
- **Framework:** Next.js 16 with React 19
- **Language:** TypeScript (strict mode, zero compile errors enforced)
- **Styling:** Tailwind CSS 4 with custom design tokens
- **Charts:** Recharts library (React-native charting)
- **Icons:** Lucide React icon set
- **State management:** React Server Components + client-side React Query
- **Build tool:** Turbopack (Next.js built-in, replaces Webpack)

### 8.2 Backend
- **Runtime:** Node.js (via Next.js API Routes)
- **Language:** TypeScript
- **API style:** RESTful JSON endpoints
- **Validation:** Zod schema validation on all inputs
- **Authentication:** Session-based with httpOnly cookies
- **Real-time:** Server-Sent Events (SSE) for push updates

### 8.3 Database
- **Primary:** PostgreSQL (via Supabase Cloud, eu-north-1 region)
- **Connection pooling:** PgBouncer (port 6543)
- **Migrations:** Sequential numbered SQL files (001_xxx.sql, 002_xxx.sql, ...)
- **Alternative support:** Microsoft SQL Server (for enterprise on-premise customers)

### 8.4 Infrastructure
- **Cloud hosting:** Vercel (frontend) + Supabase (database)
- **Containerization:** Docker + Docker Compose (for on-premise and development)
- **DNS/Domain:** ainovacloud.com
- **Demo environment:** demo.ainovacloud.com

### 8.5 Key Architectural Decisions

**Adapter Pattern:** Every external integration (database, SAP, PLC, email) uses an adapter layer. This means the same code works regardless of whether the customer uses PostgreSQL or SQL Server, cloud or on-premise.

**Module Registry:** Modules register themselves via a manifest file. The loader (`modules/_loader.ts`) imports all manifests at build time. Each module declares its ID, name, dependencies, tier, and route.

**Proxy-based routing:** Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request routing. This is a framework-specific requirement for the Turbopack build system.

**Server Components:** The majority of pages are React Server Components (rendered on the server). Interactive elements use client components marked with `'use client'`. This architecture provides fast initial loads and good SEO.

---

## 9. Database Architecture

### 9.1 Core Tables (System Infrastructure)

| Table | Purpose |
|---|---|
| `core_users` | User accounts (username, hashed password, role, status) |
| `core_sessions` | Active login sessions (session ID, user ID, expiry, IP) |
| `core_roles` | Role definitions (admin, manager, operator, viewer, custom) |
| `core_permissions` | Permission grants per role (module.action format) |
| `core_modules` | Module activation registry (enabled/disabled per module) |
| `core_settings` | Key-value configuration store (language, company name, etc.) |
| `core_translations` | Custom translation overrides (key → locale → text) |
| `core_units` | Measurement unit definitions |
| `core_import_configs` | Saved import templates with column mappings |
| `core_notifications` | Notification queue (in-app and email) |
| `core_audit_log` | Immutable action log (who, what, when, old/new values) |
| `core_license` | License key, tier, expiry, allowed modules |
| `core_sync_events` | Data synchronization event log |
| `workflow_rules` | Automation rule definitions |
| `api_keys` | External API key records with rate limits |
| `sites` | Multi-site location definitions |

### 9.2 Module Tables

Each module manages its own database tables. Examples:

- `workforce_entries` — Attendance records
- `tracking_tasks` — Work orders with status workflow
- `fleet_vehicles`, `fleet_trips` — Vehicle registry and trip logs
- `inventory_items`, `inventory_movements` — Stock items and transactions
- `quality_inspections`, `quality_8d_reports` — QC records
- `oee_records` — Equipment effectiveness measurements
- `maintenance_schedules`, `maintenance_logs` — PM schedules and work logs
- `crm_contacts`, `crm_pipeline` — Customer records and sales pipeline
- `invoicing_invoices`, `invoicing_items` — Invoice headers and line items

### 9.3 Migration System

Database schema changes are managed through numbered SQL migration files in `database/core/`. Files are named sequentially (e.g., `001_core_users.sql`, `002_core_sessions.sql`). Migrations are idempotent — they can be run multiple times safely using `CREATE TABLE IF NOT EXISTS` patterns.

---

## 10. Security Model

### 10.1 Authentication
- **Method:** Session-based authentication with httpOnly, secure cookies
- **Password storage:** bcrypt hashing with 12 salt rounds
- **Session timeout:** 30-minute idle timeout, 24-hour absolute expiry
- **Brute-force protection:** Account locked after 5 failed attempts, 15-minute cooldown
- **Setup wizard:** First-time installation requires creating an admin account before any access

### 10.2 Authorization (RBAC)
- Every API endpoint checks: Is the user authenticated? Does their role have the required permission?
- Permission format: `module_name.action` (e.g., `workforce.create`, `inventory.delete`)
- Admin users bypass permission checks
- Module deactivation prevents all access regardless of permissions

### 10.3 Data Protection
- **CSRF protection:** Double-submit cookie pattern with constant-time comparison
- **Input validation:** All incoming data validated with Zod schemas before processing
- **SQL injection prevention:** Parameterized queries everywhere — zero raw SQL from user input
- **XSS prevention:** React's built-in output encoding + Content Security Policy headers
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### 10.4 Compliance
- **Audit trail:** Every action logged with timestamp, user, IP, and old/new values
- **GDPR readiness:** On-premise deployment option keeps all data on customer's servers
- **Data retention:** Audit logs are immutable and cannot be deleted through the application

---

## 11. Deployment Options

### 11.1 ACI Cloud (Managed)
- Hosted by Ainova on Vercel (frontend) and Supabase (database)
- Customer accesses via web browser (https://[customer].ainovacloud.com)
- Automatic updates, backups, and maintenance
- Zero IT overhead for the customer
- Best for: Companies that want simplicity and fast onboarding

### 11.2 ACI Site (On-Premise)
- Installed on the customer's own server using Docker containers
- Customer controls all data — nothing leaves their network
- Manual updates managed by customer's IT team
- Requires: Linux server (or Windows with Docker Desktop), 4GB+ RAM, PostgreSQL or SQL Server
- Best for: Companies with strict data sovereignty, defense, pharma, or GDPR requirements

### 11.3 Setup Process
1. **Provision** — Deploy the application (Vercel or Docker)
2. **Database** — Create PostgreSQL database and run migrations
3. **Setup Wizard** — First visit triggers a setup wizard:
   - Create admin account
   - Set company name and language
   - Select active modules
   - Enter license key
4. **Branding** — Upload logo, set colors
5. **Data** — Import initial data (employees, inventory, customers) via File Import
6. **Training** — Walk through each active module with key users

---

## 12. Integration Capabilities

### 12.1 Currently Implemented

| Integration | Protocol | Description |
|---|---|---|
| **REST API** | HTTPS/JSON | All module data accessible via API endpoints |
| **API Gateway** | API Key + Rate Limiting | External systems can query ACI data with authentication |
| **SAP Import** | RFC / OData | Pull master data and orders from SAP ERP |
| **PLC Connector** | Siemens S7 / Modbus / MQTT / OPC-UA | Direct machine data acquisition |
| **File Import** | Excel (.xlsx) / CSV | Batch data upload with column mapping |
| **Email** | SMTP | Notification delivery |
| **SSE** | Server-Sent Events | Real-time push updates to web clients |
| **E-commerce** | WooCommerce / Shopify API | Order import and stock synchronization |

### 12.2 Planned

- Webhook support (push events to external systems)
- Native mobile app (iOS/Android)
- IoT sensor gateway (temperature, humidity, pressure sensors)
- Power BI / Tableau connector (business intelligence)

---

## 13. Competitive Landscape

### 13.1 Market Position

ACI positions itself in the gap between spreadsheets and enterprise ERP:

```
Spreadsheets ←→ [ACI fills this gap] ←→ SAP/Siemens/Oracle
(free, limited)    (€99–€1199/month)      (€50K–€500K+/year)
```

### 13.2 Competitive Comparison

| Capability | ACI | SAP Business One | Odoo | Katana | MRPeasy |
|---|---|---|---|---|---|
| **Pricing model** | Flat monthly | Per user/month | Per user/month | Per plan | Per user/month |
| **50-user monthly** | €599 | ~€5,000 | ~€1,000 | ~€799 | ~€1,500 |
| **100-user monthly** | €1,199 | ~€10,000 | ~€2,000 | Custom | ~€3,000 |
| **Setup time** | Hours–Days | 6–12 months | 1–3 months | Weeks | Weeks |
| **On-premise option** | Yes | Yes | Yes | No | No |
| **OEE tracking** | Built-in | Add-on | Add-on | Limited | No |
| **Machine connectivity** | PLC/MQTT/OPC | Add-on | No | No | No |
| **Digital Twin** | Built-in | No | No | No | No |
| **Quality / 8D** | Built-in | Limited | Add-on | No | No |
| **Multi-language** | HU/EN/DE native | Partial | Community | EN only | Limited |
| **AI Assistant** | Built-in (GPT-4) | Add-on | Add-on | No | No |
| **Source code access** | Yes (on-premise) | No | Yes (open core) | No | No |

### 13.3 Key Differentiators

1. **Flat pricing** — No per-user fees. A 100-person factory pays the same €1,199 whether 20 or 100 people use it.
2. **Modular architecture** — Buy only what you need. Start with 4 modules, grow to 26.
3. **Manufacturing-native** — Built specifically for factory operations (OEE, PLC, Quality, Digital Twin). Not a generic business tool adapted for manufacturing.
4. **Deployment flexibility** — Cloud or on-premise, customer's choice.
5. **Speed to value** — Operational within hours or days, not months.
6. **Hungarian + EU focus** — NAV-compatible invoicing, GDPR-ready, native Hungarian/German support.

---

## 14. Project Structure

### 14.1 Codebase Organization

```
ainova-cloud-core/
├── app/                          # Application pages and API
│   ├── (auth)/login/             # Login page
│   ├── (marketing)/              # Public landing page
│   ├── dashboard/                # Main application (after login)
│   │   ├── admin/                # Admin panel pages
│   │   ├── modules/              # Module pages (dynamic)
│   │   └── napi-perces/          # LAC custom report (internal)
│   ├── api/                      # Backend API endpoints
│   │   ├── admin/                # Admin API (users, settings, etc.)
│   │   ├── ai/                   # AI assistant API
│   │   ├── auth/                 # Login/logout/session
│   │   ├── modules/              # Module CRUD APIs
│   │   └── ...                   # Health, search, SSE, etc.
│   ├── setup/                    # First-time setup wizard
│   └── change-password/          # Password change page
├── components/                   # Reusable UI components
│   ├── admin/                    # Admin panel components
│   ├── core/                     # Header, search, navigation
│   ├── login/                    # Login page components
│   └── ui/                       # Shared UI elements
├── lib/                          # Business logic & utilities
│   ├── auth/                     # Authentication system
│   ├── db/                       # Database adapter layer
│   ├── i18n/                     # Translation system
│   ├── license/                  # License validation & tiers
│   ├── modules/                  # Module registry & loader
│   ├── rbac/                     # Permission engine
│   ├── ai/                       # AI assistant logic
│   ├── api-gateway/              # API key & rate limiting
│   ├── connectors/               # PLC/machine connectors
│   ├── export/                   # CSV/Excel export utilities
│   ├── import/                   # File import engine
│   ├── notifications/            # Notification system
│   ├── sse/                      # Server-Sent Events
│   ├── validators/               # Zod validation schemas
│   └── workflows/                # Automation rules engine
├── modules/                      # Feature modules (26 total)
│   ├── inventory/                # Each module has:
│   │   ├── manifest.ts           #   Module registration
│   │   ├── api.ts                #   API route handler
│   │   ├── page.tsx              #   UI page component
│   │   └── TASKS_FOR_AI.md       #   Implementation status
│   ├── workforce/
│   ├── tracking/
│   ├── fleet/
│   ├── ... (22 more modules)
│   └── _loader.ts                # Module import orchestrator
├── database/                     # SQL migration files
│   └── core/                     # Numbered migration scripts
├── docs/                         # Documentation
│   ├── hun/                      # Hungarian docs
│   │   └── plan/                 # Planning documents
│   └── archive/                  # Archived/obsolete docs
├── scripts/                      # Utility scripts
├── tests/                        # Test suite
└── public/                       # Static assets (icons, PWA)
```

### 14.2 Module Structure

Every module follows the same internal structure:

```
modules/[module-name]/
├── manifest.ts           # Module ID, name, icon, tier, dependencies
├── api.ts                # CRUD API handlers
├── page.tsx              # Main UI page (React component)
├── types.ts              # TypeScript type definitions
├── TASKS_FOR_AI.md       # Implementation notes and status
└── [sub-components]/     # Module-specific UI components
```

### 14.3 Database Migration Files

Located in `database/core/`. Each file creates or modifies database tables:

```
001_core_users.sql        # User accounts table
002_core_sessions.sql     # Session management
003_core_settings.sql     # Configuration key-value store
004_core_audit_log.sql    # Action history log
005_core_sync_events.sql  # Sync event tracking
...                       # (continues sequentially)
```

---

## 15. Development Status

### 15.1 Completed Phases

| Phase | Content | Status |
|---|---|---|
| **Phase 0** | Core stabilization, authentication, session management, RBAC | ✅ Complete |
| **Phase 1** | Admin panel (10 sections), multi-language (HU/EN/DE), License system | ✅ Complete |
| **Phase 2** | Purchasing, POS modules, enhanced import system | ✅ Complete |
| **Phase 3** | CRM, Worksheets modules, sector presets | ✅ Complete |
| **Phase 4** | Recipes, Appointments, Projects add-on modules | ✅ Complete |
| **Phase 5** | Industry sector presets, module dependencies | ✅ Complete |
| **Phase 6** | E-commerce module, API Gateway | ✅ Complete |
| **Phase 7** | PWA v3 (OffscreenCanvas), edge auth, CSP security headers | ✅ Complete |

### 15.2 Module Readiness

| Status | Modules |
|---|---|
| **Production Ready** | Inventory, Invoicing, Reports, Workforce, Tracking, Fleet, Purchasing, POS, Recipes, Appointments, Projects, E-commerce, Performance, Scheduling, Delivery, CRM, Worksheets, OEE, Shift Management, Quality, Maintenance, Digital Twin, API Gateway |
| **Partial (functional)** | File Import (shared admin UI), SAP Import (stub — needs SAP SDK), PLC Connector (driver stubs — needs physical hardware) |

### 15.3 What Remains

- Light/dark theme toggle (currently dark only)
- Forgot password flow (email-based password reset)
- Expanded unit test coverage
- Dashboard builder (drag-and-drop widget customization)
- Customer-facing user manual and admin guide
- Native mobile app (future roadmap)

### 15.4 Demo Environment

**URL:** demo.ainovacloud.com

| Account | Password | Role | Access |
|---|---|---|---|
| `admin` | `Admin1234!` | Administrator | Full access + admin panel |
| `manager_hu` | `Manager2025!` | Manager | All modules, Hungarian UI |
| `manager_de` | `Manager2025!` | Manager | All modules, German UI |
| `operator1` | `Operator2025!` | Operator | View-only for most modules |

The demo is preloaded with 30 days of realistic factory data: ~200 workers, multiple shifts, fleet vehicles, maintenance schedules, inventory items, OEE records, quality inspections, and production orders.

---

## 16. Glossary

| Term | Definition |
|---|---|
| **ACI** | Ainova Cloud Intelligence — the official product name |
| **Module** | A self-contained feature area (e.g., Inventory, Workforce, OEE) |
| **Tier** | License level (Starter / Basic / Professional / Enterprise) |
| **Add-on** | A module purchasable separately on top of the tier package |
| **RBAC** | Role-Based Access Control — permission system |
| **OEE** | Overall Equipment Effectiveness — Availability × Performance × Quality |
| **8D** | Eight Disciplines problem-solving methodology (quality management) |
| **PLC** | Programmable Logic Controller — industrial machine controller |
| **NAV** | Hungarian National Tax Authority (Nemzeti Adó- és Vámhivatal) |
| **PWA** | Progressive Web App — web application installable on devices |
| **SSE** | Server-Sent Events — real-time data push protocol |
| **CSRF** | Cross-Site Request Forgery — a web security attack prevented by ACI |
| **Adapter** | Software pattern that abstracts external system differences |
| **Migration** | Versioned database schema change script |
| **Manifest** | Module registration file declaring metadata and configuration |
| **Seed data** | Pre-populated demonstration data for demos and testing |
| **SaaS** | Software as a Service — cloud-delivered software on subscription |
| **On-premise** | Software installed on the customer's own server infrastructure |
| **Turbopack** | Next.js built-in bundler (replacement for Webpack) |
| **Supabase** | Managed PostgreSQL hosting platform (database provider) |
| **Vercel** | Cloud hosting platform optimized for Next.js applications |
| **Docker** | Container technology for packaging and running applications |

---

*This document is the single authoritative reference for the Ainova Cloud Intelligence platform. All product, technical, and business information is current as of the date shown above.*
