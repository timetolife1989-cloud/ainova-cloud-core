# Ainova Cloud Intelligence (ACI) — System Overview

> **Prepared for:** Bryan (Personal Assistant to Tibor Svasznik, CEO)
> **Date:** March 13, 2026
> **Version:** v1.3.0

---

## What Is ACI?

**Ainova Cloud Intelligence (ACI)** is a factory management software platform. It helps manufacturing companies track, manage, and optimize everything that happens on the factory floor — from how many people showed up for their shift, to how efficiently machines are running, to whether deliveries went out on time.

Think of it as a **"control center" for a factory**, accessible from any web browser — desktop, tablet, or phone.

It is **not** an ERP system (like SAP or Microsoft Dynamics). It's designed to sit alongside those — or replace them entirely for smaller companies that don't need a bloated, expensive ERP.

---

## Who Is It For?

| Company Size | Typical Needs | ACI Package |
|---|---|---|
| **Small factory** (5–20 people) | Track who's working, manage tasks, log fleet usage, import Excel data | **Basic** (~€80/month) |
| **Medium factory** (20–100 people) | + Performance KPIs, weekly capacity planning, delivery tracking, inventory | **Professional** (~€150/month) |
| **Large factory** (100–500+ people) | + OEE monitoring, shift planning, quality control (8D reports), preventive maintenance, machine connectivity | **Enterprise** (~€300/month) |

**Key difference from competitors:** ACI charges a **flat monthly fee** (not per-user), which makes it dramatically cheaper than SAP, Dynamics, or Odoo at scale.

---

## What Can It Do? (Module by Module)

### Basic Package — 5 Modules

| Module | What It Does | Real-World Example |
|---|---|---|
| **Workforce** | Daily headcount tracking — who's working, which shift, absences, overtime | A shift supervisor logs that 18 out of 20 workers showed up for the morning shift. 2 were absent. 3 did overtime. |
| **Tracking** | Task and order tracking with status workflow | A production order goes from "Planned" → "In Progress" → "Completed" with timestamps and history. |
| **Fleet** | Vehicle registry — trips, fuel logs, status | The factory has 8 forklifts and 3 delivery vans. Each trip and refueling is logged. |
| **File Import** | Drag-and-drop Excel/CSV import with automatic column mapping | Upload a daily production report from an old system → ACI maps the columns automatically. |
| **Reports** | Custom report builder with charts, saved configurations, Excel/PDF export | Create a chart showing "Weekly output vs. target by production line" and save it for reuse. |

### Professional Package — 4 Additional Modules

| Module | What It Does | Real-World Example |
|---|---|---|
| **Performance** | Worker/team efficiency KPIs — standard time vs. actual time | An operator's target is 100 units/hour. They actually produced 87. That's 87% efficiency, which gets tracked and visualized on a KPI dashboard. |
| **Scheduling** | Weekly capacity planning — resource allocation by machine/line/area | Next week, Production Line A has 80% capacity booked. Line B is only at 40%. The planner can rebalance. |
| **Delivery** | Shipment tracking by customer, date, and status | 14 shipments went out this week to 8 customers. 2 were late. Summary cards show on-time rate. |
| **Inventory** | Stock management with movement logs (in/out/adjustment) | Steel plates: 450 pieces in stock. Minimum threshold: 200. System highlights if it drops below. |

### Enterprise Package — 7 Additional Modules

| Module | What It Does | Real-World Example |
|---|---|---|
| **OEE** | Overall Equipment Effectiveness — the gold standard of manufacturing KPIs (Availability × Performance × Quality) | Machine CNC-01 ran for 7.5h out of 8h (94% availability), produced at 90% speed (performance), with 2% scrap (98% quality). OEE = 83%. World-class is 85%. Color-coded gauges show this at a glance. |
| **Shift Management** | Define shifts (morning/afternoon/night), assign workers, detect scheduling conflicts | If you accidentally schedule the same person to two overlapping shifts, the system blocks it and shows an error. |
| **Quality** | Inspection records, defect tracking, and full 8D problem-solving reports | A batch of parts has a defect. The quality team opens an 8D report: Define problem → Root cause → Corrective action → Verification → Prevention. Used in automotive supply chains. |
| **Maintenance** | Preventive maintenance scheduling with due-date calculation and completion logging | CNC machine needs oil change every 500 hours. It's at 485 hours. System highlights it as "due soon" in orange. Overdue items turn red. |
| **PLC Connector** | Connect directly to factory machines (Siemens S7, Modbus, MQTT, OPC-UA) | A PLC sends real-time temperature, speed, and cycle count data directly into ACI — no manual entry needed. *(Hardware integration requires on-site setup.)* |
| **Digital Twin** | 2D visual map of the production floor with interactive machine icons | A bird's-eye view SVG of the factory floor. Click a machine → see its status, last maintenance, current OEE. 7 demo machines are pre-loaded. |
| **SAP Import** | Import data from SAP ERP systems (RFC or OData connection) | The company uses SAP for finance/purchasing. ACI pulls material master data and production orders directly from SAP. *(Requires SAP connectivity license.)* |

### Special / Internal

| Module | What It Does |
|---|---|
| **AI Assistant** | Ask questions in plain language: "What was last week's OEE for CNC-01?" — powered by OpenAI. *(Requires API key.)* |
| **LAC Daily Report** | A custom-built, highly complex module for the LAC reference factory. Multi-source data aggregation, SAP integration, Excel export. This is not part of the commercial packages — it's an internal tool. |

---

## Administration & Configuration

ACI has a full **Admin Panel** (accessible only to admin users) that controls:

| Feature | Description |
|---|---|
| **User Management** | Create accounts, assign roles, reset passwords |
| **Roles & Permissions** | Fine-grained access control — e.g., "this user can VIEW workforce data but not EDIT it" |
| **Module Control** | Turn modules on/off, check dependencies |
| **Branding** | Set company name, logo, colors |
| **Units of Measurement** | Define custom units (kg, pcs, meters, etc.) |
| **Language** | Switch UI language: Hungarian, English, German. Admins can edit any translation from the panel. |
| **Import Configurations** | Set up how Excel/CSV files are mapped to database tables |
| **Diagnostics** | Check database connection status, system uptime |
| **Audit Log** | Full history of every login and every action, with IP address and timestamp |
| **License** | See current package tier, expiration date, user limits |

---

## Deployment Options

ACI supports two deployment modes:

| Mode | Description | Best For |
|---|---|---|
| **ACI Cloud** | Hosted by Ainova. Customer accesses via web browser. Updates automatic. | Companies that want zero IT overhead. |
| **ACI Site** | Installed on the customer's own server (Docker or Node.js). Customer manages updates. | Companies with strict data privacy requirements (GDPR, defense, etc.) |

**Current live demo:** [demo.ainovacloud.com](https://demo.ainovacloud.com) (hosted on Vercel + Supabase Cloud)

---

## Demo Accounts

For demonstrations, the following accounts are pre-loaded:

| Username | Password | Role | Notes |
|---|---|---|---|
| `admin` | `Admin1234!` | Administrator | Full access to everything |
| `manager_hu` | `Manager2025!` | Manager | Access to all modules, no admin panel |
| `manager_de` | `Manager2025!` | Manager | Same, but German language preference |
| `operator1` | `Operator2025!` | Operator | Limited access — view-only for most modules |

The demo environment has **30 days of realistic factory data** pre-loaded: 200-person factory, multiple shifts, vehicles, maintenance schedules, OEE records, quality inspections, etc.

---

## Security

| Area | Status |
|---|---|
| Password hashing | bcrypt, 12 rounds (industry standard) |
| Session management | 30-minute idle timeout, 24-hour absolute expiry |
| Brute-force protection | Locked after 5 failed login attempts (15-minute cooldown) |
| CSRF protection | Double-submit cookie with constant-time comparison |
| Data validation | All inputs validated server-side with Zod schemas |
| SQL injection | Parameterized queries everywhere — no raw SQL from user input |
| Audit trail | Every login and every action is logged with IP address |
| Security headers | CSP, HSTS, X-Frame-Options, and more |
| GDPR | On-premise option keeps all data on customer's servers |

---

## Technology Stack (For Reference)

You don't need to know this, but if anyone asks:

- **Frontend:** Next.js 16 (React 19), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Database:** PostgreSQL (Supabase Cloud) — also supports Microsoft SQL Server and SQLite
- **Hosting:** Vercel (frontend) + Supabase (database)
- **Containerization:** Docker (for on-premise)

---

## Competitive Position

| Feature | ACI | Katana | SAP Business One | Odoo |
|---|---|---|---|---|
| **Pricing model** | Flat monthly | Per plan | Per user/month | Per user/month |
| **Starting price** | ~€80/month | $99/month | ~€100/user/month | ~€20/user/month |
| **10-user cost** | ~€80/month | $99/month | ~€1,000/month | ~€200/month |
| **50-user cost** | ~€150/month | $799/month | ~€5,000/month | ~€1,000/month |
| **OEE tracking** | Yes (built-in) | Limited | Add-on | Add-on |
| **Machine connectivity** | Yes (PLC/MQTT) | No | Add-on | No |
| **Digital Twin** | Yes | No | No | No |
| **Quality / 8D Reports** | Yes | No | Limited | Add-on |
| **Hungarian language** | Native | No | Partial | Community |
| **On-premise option** | Yes | No | Yes | Yes |
| **AI Assistant** | Yes (built-in) | No | Add-on | Add-on |

---

## What's Next? (Roadmap Highlights)

1. **Customer-facing documentation** — User manual, admin guide, module catalog
2. **Landing page finalization** — Marketing copy, pricing page, demo request form
3. **Sales materials** — Pitch deck, feature comparison, ROI calculator
4. **Light/dark theme toggle** — Currently dark only
5. **Forgot password flow** — Email-based password reset
6. **Mobile PWA** — Offline-capable progressive web app

---

## Key Contact

- **CEO / Developer:** Tibor Svasznik
- **Product:** Ainova Cloud Intelligence (ACI)
- **Website:** [ainovacloud.com](https://ainovacloud.com)
- **Demo:** [demo.ainovacloud.com](https://demo.ainovacloud.com)

---

*This document is intended for non-technical stakeholders. For developer documentation, see `docs/hun/` (in Hungarian) or the source code directly.*
