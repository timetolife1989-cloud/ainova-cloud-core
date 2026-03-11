/**
 * =====================================================================
 * MASTER DEMO SEEDER — Ainova Cloud Intelligence (ACI)
 * 30 days · 200-person factory · multilingual employees · OEE math
 * Usage:  DB_ADAPTER=sqlite npx tsx scripts/seed-demo-data.ts
 * =====================================================================
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDb } from '../lib/db';
import type { IDatabaseAdapter } from '../lib/db/IDatabase';
import * as bcrypt from 'bcryptjs';

// ── Utilities ─────────────────────────────────────────────────────────
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
function hoursAgo(n: number) { const d = new Date(); d.setHours(d.getHours()-n); return d.toISOString().replace('T',' ').slice(0,19); }
function rand(min: number, max: number, dec = 0) { const v = min+Math.random()*(max-min); return dec>0 ? parseFloat(v.toFixed(dec)) : Math.floor(v); }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random()*a.length)]; }

// ── Statistics tracker ─────────────────────────────────────────────────
const stats: Record<string,number> = {};
function track(t: string, n=1) { stats[t]=(stats[t]??0)+n; }

async function ex(db: IDatabaseAdapter, table: string, sql: string, params: {name:string;type:string;value:unknown}[]) {
  try {
    const r = await db.execute(sql, params as Parameters<typeof db.execute>[1]);
    if (r.rowsAffected>0) track(table);
  } catch(e) {
    const msg=(e as Error).message??'';
    if (!msg.includes('UNIQUE')&&!msg.includes('unique')&&!msg.includes('constraint')&&!msg.includes('Constraint'))
      console.warn(`  [WARN] ${table}: ${msg.slice(0,90)}`);
  }
}

// ── Master data ────────────────────────────────────────────────────────
const AREAS = ['Gyártás A','Gyártás B','Összeszerelés','Minőség','Raktár'];

const EMPLOYEES = [
  // HU
  {name:'Kiss István',      area:'Gyártás A',     shift:'Reggeli',  lang:'hu'},
  {name:'Nagy Katalin',     area:'Gyártás A',     shift:'Délutáni', lang:'hu'},
  {name:'Tóth Péter',       area:'Gyártás B',     shift:'Reggeli',  lang:'hu'},
  {name:'Szabó Anna',       area:'Gyártás B',     shift:'Délutáni', lang:'hu'},
  {name:'Horváth László',   area:'Összeszerelés', shift:'Reggeli',  lang:'hu'},
  {name:'Varga Éva',        area:'Összeszerelés', shift:'Délutáni', lang:'hu'},
  {name:'Kovács Gábor',     area:'Minőség',       shift:'Reggeli',  lang:'hu'},
  {name:'Molnár Eszter',    area:'Minőség',       shift:'Délutáni', lang:'hu'},
  {name:'Németh Zoltán',    area:'Raktár',        shift:'Reggeli',  lang:'hu'},
  {name:'Balogh Mária',     area:'Raktár',        shift:'Délutáni', lang:'hu'},
  {name:'Farkas Tamás',     area:'Gyártás A',     shift:'Éjszakai', lang:'hu'},
  {name:'Papp Judit',       area:'Gyártás B',     shift:'Éjszakai', lang:'hu'},
  {name:'Takács András',    area:'Összeszerelés', shift:'Éjszakai', lang:'hu'},
  {name:'Juhász Krisztina', area:'Összeszerelés', shift:'Reggeli',  lang:'hu'},
  // DE
  {name:'Müller Hans',      area:'Gyártás A',     shift:'Reggeli',  lang:'de'},
  {name:'Schmidt Anna',     area:'Gyártás B',     shift:'Reggeli',  lang:'de'},
  {name:'Weber Klaus',      area:'Összeszerelés', shift:'Délutáni', lang:'de'},
  {name:'Fischer Maria',    area:'Minőség',       shift:'Reggeli',  lang:'de'},
  {name:'Bauer Stefan',     area:'Gyártás A',     shift:'Délutáni', lang:'de'},
  {name:'Wagner Petra',     area:'Gyártás B',     shift:'Éjszakai', lang:'de'},
  {name:'Becker Josef',     area:'Raktár',        shift:'Reggeli',  lang:'de'},
  {name:'Richter Helga',    area:'Minőség',       shift:'Délutáni', lang:'de'},
  // EN
  {name:'Smith John',       area:'Gyártás A',     shift:'Reggeli',  lang:'en'},
  {name:'Brown Sarah',      area:'Gyártás B',     shift:'Délutáni', lang:'en'},
  {name:'Johnson Mike',     area:'Összeszerelés', shift:'Reggeli',  lang:'en'},
  {name:'Williams Emma',    area:'Minőség',       shift:'Éjszakai', lang:'en'},
  {name:'Jones David',      area:'Raktár',        shift:'Délutáni', lang:'en'},
  {name:'Taylor Rachel',    area:'Gyártás A',     shift:'Éjszakai', lang:'en'},
  {name:'Anderson Chris',   area:'Gyártás B',     shift:'Reggeli',  lang:'en'},
  {name:'Thomas Lisa',      area:'Összeszerelés', shift:'Délutáni', lang:'en'},
];

const MACHINES = [
  {code:'CNC-001', name:'CNC Marógép #1',    area:'Gyártás A',     cycle:18},
  {code:'CNC-002', name:'CNC Marógép #2',    area:'Gyártás A',     cycle:18},
  {code:'CNC-003', name:'CNC Esztergagép',   area:'Gyártás B',     cycle:22},
  {code:'PRES-001',name:'Préssor 250T',      area:'Gyártás B',     cycle:25},
  {code:'HEGY-001',name:'Hegesztő robot #1', area:'Összeszerelés', cycle:30},
  {code:'HEGY-002',name:'Hegesztő robot #2', area:'Összeszerelés', cycle:30},
  {code:'FEST-001',name:'Festősor (por)',     area:'Összeszerelés', cycle:45},
  {code:'SZER-001',name:'Szerelősor A',      area:'Gyártás A',     cycle:15},
];

const VEHICLES = [
  {plate:'ABC-123', name:'Ford Transit',      type:'van'},
  {plate:'DEF-456', name:'Mercedes Sprinter', type:'van'},
  {plate:'GHI-789', name:'Iveco Daily',       type:'truck'},
  {plate:'JKL-012', name:'Toyota Hilux',      type:'car'},
  {plate:'MNO-345', name:'Linde Targonca #1', type:'forklift'},
  {plate:'PQR-678', name:'Linde Targonca #2', type:'forklift'},
];

const INVENTORY_ITEMS = [
  {sku:'RAW-ALU-2MM', name:'Alumínium lemez 2mm',    qty:850,  min:200, max:1200, unit:'m²',  cat:'Nyersanyag',    loc:'A-01'},
  {sku:'RAW-ACE-3MM', name:'Acéllemez 3mm',          qty:320,  min:100, max:600,  unit:'m²',  cat:'Nyersanyag',    loc:'A-02'},
  {sku:'RAW-RES-M8',  name:'Rögzítőcsavar M8',       qty:12400,min:2000,max:20000,unit:'db',  cat:'Kötőelem',      loc:'B-01'},
  {sku:'RAW-RES-M10', name:'Rögzítőcsavar M10',      qty:8700, min:1500,max:15000,unit:'db',  cat:'Kötőelem',      loc:'B-02'},
  {sku:'SEM-PCB-01',  name:'PCB panel v2.3',          qty:450,  min:100, max:800,  unit:'db',  cat:'Félkésztermék', loc:'C-01'},
  {sku:'FEST-7016',   name:'Festék RAL7016 porlakk',  qty:34,   min:10,  max:60,   unit:'kg',  cat:'Vegyszer',      loc:'D-01'},
  {sku:'FEST-9003',   name:'Festék RAL9003 porlakk',  qty:28,   min:8,   max:50,   unit:'kg',  cat:'Vegyszer',      loc:'D-02'},
  {sku:'PACK-BOX-M',  name:'Csomagoló doboz M',       qty:3800, min:500, max:5000, unit:'db',  cat:'Csomagolás',    loc:'E-01'},
  {sku:'PACK-BOX-L',  name:'Csomagoló doboz L',       qty:1200, min:300, max:2000, unit:'db',  cat:'Csomagolás',    loc:'E-02'},
  {sku:'TOOL-HYD',    name:'Hidraulikaolaj ISO 46',   qty:180,  min:50,  max:300,  unit:'l',   cat:'Kenőanyag',     loc:'F-01'},
  {sku:'FIN-KHP-42',  name:'Késztermék KHP-42',       qty:640,  min:200, max:1000, unit:'db',  cat:'Késztermék',    loc:'G-01'},
  {sku:'FIN-XT-7',    name:'Késztermék Burkolat XT-7',qty:285,  min:100, max:500,  unit:'db',  cat:'Késztermék',    loc:'G-02'},
];

const ASSETS = [
  {code:'MA-001',name:'CNC Marógép #1',      type:'gép',          loc:'Gyártás A'},
  {code:'MA-002',name:'CNC Marógép #2',      type:'gép',          loc:'Gyártás A'},
  {code:'MA-003',name:'Préssor 250T',         type:'gép',          loc:'Gyártás B'},
  {code:'MA-004',name:'Hegesztő robot #1',    type:'robot',        loc:'Összeszerelés'},
  {code:'MA-005',name:'Festősor kompresszor', type:'rendszer',     loc:'Összeszerelés'},
  {code:'MA-006',name:'Emelő darupálya',      type:'infrastruktúra',loc:'Raktár'},
  {code:'MA-007',name:'Kompresszor 90kW',     type:'rendszer',     loc:'Gépház'},
];

const TASKS = [
  {code:'TK-001',name:'KHP-42 marás'},
  {code:'TK-002',name:'XT-7 préselés'},
  {code:'TK-003',name:'R-90 összeszerelés'},
  {code:'TK-004',name:'CF-220 hegesztés'},
  {code:'TK-005',name:'TEN-88 esztergálás'},
];

const CUSTOMERS = [
  {code:'BOSCH-DE',name:'Bosch GmbH'},
  {code:'AUDI-DE', name:'Audi AG'},
  {code:'RABA-HU', name:'Rába Automotive Kft.'},
  {code:'BEKO-HU', name:'Beko Hungary Kft.'},
  {code:'SKF-SE',  name:'SKF Sverige AB'},
];

// ─────────────────────────────────────────────────────────────────────
// SECTION -1: CREATE TABLES IF NOT EXISTS (SQLite-native syntax)
// ─────────────────────────────────────────────────────────────────────
async function createTablesIfNeeded(db: IDatabaseAdapter) {
  const ddl = [
    // core tables
    `CREATE TABLE IF NOT EXISTS core_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT, email TEXT, role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      first_login INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT, setting_type TEXT NOT NULL DEFAULT 'string',
      description TEXT, updated_by TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, user_id INTEGER, username TEXT,
      ip_address TEXT, details TEXT, success INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL, event_type TEXT NOT NULL,
      status TEXT NOT NULL, message TEXT, details TEXT,
      rows_affected INTEGER, triggered_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER, module_id TEXT, title TEXT NOT NULL,
      message TEXT, severity TEXT DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // module tables
    `CREATE TABLE IF NOT EXISTS shift_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_name TEXT NOT NULL, start_time TEXT NOT NULL,
      end_time TEXT NOT NULL, color TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS shift_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_name TEXT NOT NULL, team_name TEXT,
      shift_id INTEGER NOT NULL REFERENCES shift_definitions(id),
      assignment_date TEXT NOT NULL,
      status TEXT DEFAULT 'planned', notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS workforce_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_date TEXT NOT NULL, shift_name TEXT, area_name TEXT,
      planned_count REAL DEFAULT 0, actual_count REAL DEFAULT 0,
      absent_count REAL DEFAULT 0, notes TEXT, recorded_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(record_date, shift_name, area_name)
    )`,
    `CREATE TABLE IF NOT EXISTS oee_machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_code TEXT NOT NULL UNIQUE, machine_name TEXT NOT NULL,
      area TEXT, is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS oee_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL REFERENCES oee_machines(id),
      record_date TEXT NOT NULL, shift TEXT,
      planned_time_min REAL NOT NULL, run_time_min REAL NOT NULL,
      ideal_cycle_sec REAL, total_count INTEGER DEFAULT 0,
      good_count INTEGER DEFAULT 0, reject_count INTEGER DEFAULT 0,
      availability_pct REAL, performance_pct REAL,
      quality_pct REAL, oee_pct REAL, notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS performance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL, worker_name TEXT NOT NULL,
      team_name TEXT, task_code TEXT, task_name TEXT,
      quantity REAL NOT NULL DEFAULT 0, norm_time REAL,
      actual_time REAL, efficiency REAL, notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS performance_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL, target_name TEXT,
      period_type TEXT NOT NULL, target_value REAL NOT NULL,
      target_unit TEXT, valid_from TEXT NOT NULL, valid_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tracking_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT, title TEXT NOT NULL,
      description TEXT, status TEXT NOT NULL DEFAULT 'Nyitott',
      priority TEXT DEFAULT 'normal', assigned_to TEXT,
      quantity REAL, due_date TEXT, completed_at TEXT,
      created_by TEXT, created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tracking_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES tracking_items(id) ON DELETE CASCADE,
      old_status TEXT, new_status TEXT NOT NULL,
      changed_by TEXT, note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS fleet_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL UNIQUE, vehicle_name TEXT,
      vehicle_type TEXT, is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS fleet_trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES fleet_vehicles(id),
      trip_date TEXT NOT NULL, driver_name TEXT,
      start_km REAL, end_km REAL, distance REAL,
      purpose TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS fleet_refuels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES fleet_vehicles(id),
      refuel_date TEXT NOT NULL, amount REAL, cost REAL,
      km_at_refuel REAL, fuel_type TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS maintenance_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT NOT NULL UNIQUE, asset_name TEXT NOT NULL,
      asset_type TEXT, location TEXT,
      is_active INTEGER DEFAULT 1, notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS maintenance_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL REFERENCES maintenance_assets(id),
      task_name TEXT NOT NULL, interval_days INTEGER NOT NULL,
      last_done_date TEXT, next_due_date TEXT,
      priority TEXT DEFAULT 'normal', assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS maintenance_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER REFERENCES maintenance_schedules(id),
      asset_id INTEGER NOT NULL REFERENCES maintenance_assets(id),
      done_date TEXT NOT NULL, duration_min INTEGER,
      cost REAL, notes TEXT, performed_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE, item_name TEXT NOT NULL,
      category TEXT, current_qty REAL DEFAULT 0,
      min_qty REAL DEFAULT 0, max_qty REAL, unit_name TEXT,
      location TEXT, notes TEXT, is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      movement_type TEXT NOT NULL, quantity REAL NOT NULL,
      reference TEXT, notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS quality_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_date TEXT NOT NULL, product_code TEXT,
      product_name TEXT, batch_number TEXT, inspector TEXT,
      total_checked INTEGER DEFAULT 0, passed_count INTEGER DEFAULT 0,
      rejected_count INTEGER DEFAULT 0, reject_code TEXT,
      reject_reason TEXT, status TEXT DEFAULT 'pending',
      notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS quality_8d_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER REFERENCES quality_inspections(id),
      report_number TEXT NOT NULL, d1_team TEXT,
      d2_problem TEXT, d3_containment TEXT, d4_root_cause TEXT,
      d5_corrective TEXT, d6_implemented TEXT,
      d7_preventive TEXT, d8_recognition TEXT,
      status TEXT DEFAULT 'open', created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS scheduling_capacity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL, resource_type TEXT NOT NULL,
      resource_name TEXT NOT NULL, planned_hours REAL DEFAULT 0,
      allocated_hours REAL DEFAULT 0, actual_hours REAL DEFAULT 0,
      notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week_start, resource_type, resource_name)
    )`,
    `CREATE TABLE IF NOT EXISTS scheduling_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      capacity_id INTEGER NOT NULL REFERENCES scheduling_capacity(id) ON DELETE CASCADE,
      task_name TEXT NOT NULL, task_code TEXT,
      hours REAL NOT NULL, priority INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_date TEXT NOT NULL, customer_name TEXT NOT NULL,
      customer_code TEXT, order_number TEXT,
      quantity REAL DEFAULT 0, weight REAL, value REAL,
      status TEXT DEFAULT 'pending', notes TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES core_users(id),
      expires_at TEXT NOT NULL,
      last_activity TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_code TEXT NOT NULL UNIQUE,
      role_label TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6B7280',
      icon TEXT DEFAULT 'shield',
      priority INTEGER DEFAULT 0,
      is_builtin INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permission_code TEXT NOT NULL UNIQUE,
      description TEXT,
      module_id TEXT,
      is_builtin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS core_role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL REFERENCES core_roles(id),
      permission_id INTEGER NOT NULL REFERENCES core_permissions(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(role_id, permission_id)
    )`,
    // Default roles
    `INSERT OR IGNORE INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin) VALUES ('admin','Adminisztrátor','Teljes hozzáférés','#9333EA','shield-check',100,1)`,
    `INSERT OR IGNORE INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin) VALUES ('manager','Vezető','Modul-szintű hozzáférés','#2563EB','briefcase',50,1)`,
    `INSERT OR IGNORE INTO core_roles (role_code, role_label, description, color, icon, priority, is_builtin) VALUES ('user','Felhasználó','Alap hozzáférés','#16A34A','user',10,1)`,
    // Default permissions
    `INSERT OR IGNORE INTO core_permissions (permission_code, description, module_id, is_builtin) VALUES ('admin.access','Admin panel hozzáférés','admin',1)`,
    `INSERT OR IGNORE INTO core_permissions (permission_code, description, module_id, is_builtin) VALUES ('dashboard.view','Dashboard megtekintés',NULL,1)`,
    `INSERT OR IGNORE INTO core_permissions (permission_code, description, module_id, is_builtin) VALUES ('modules.view','Modulok megtekintése',NULL,1)`,
    `CREATE TABLE IF NOT EXISTS core_license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier TEXT NOT NULL DEFAULT 'basic',
      customer_name TEXT,
      modules_allowed TEXT DEFAULT '["*"]',
      features_allowed TEXT DEFAULT '["*"]',
      max_users INTEGER DEFAULT 999,
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // Default settings row
    `INSERT OR IGNORE INTO core_settings (setting_key, setting_value) VALUES ('setup_completed','false')`,
    // Enterprise license
    `INSERT OR IGNORE INTO core_license (tier, customer_name, modules_allowed, features_allowed, max_users, is_active)
     VALUES ('enterprise', 'Precision Parts Kft.', '["*"]', '["*"]', 999, 1)`,
  ];

  process.stdout.write('[Seed] Creating tables...');
  for (const stmt of ddl) {
    try { await db.execute(stmt, []); } catch(e) {
      const m = (e as Error).message??'';
      if (!m.includes('already exists') && !m.includes('UNIQUE')) console.warn(`  [DDL WARN] ${m.slice(0,80)}`);
    }
  }
  console.log(' \u2713');

  // Bootstrap admin with known password
  const adminHash = await bcrypt.hash('Admin1234!', 10);
  try {
    await db.execute(`INSERT OR IGNORE INTO core_users (username, password_hash, full_name, role, is_active, first_login) VALUES (@p0,@p1,@p2,@p3,1,0)`,
      [{name:'p0',type:'nvarchar',value:'admin'},{name:'p1',type:'nvarchar',value:adminHash},
       {name:'p2',type:'nvarchar',value:'Demo Admin'},{name:'p3',type:'nvarchar',value:'admin'}]);
    // Also update existing admin's hash in case user already exists
    await db.execute(`UPDATE core_users SET password_hash=@p1, full_name='Demo Admin', first_login=0 WHERE username=@p0`,
      [{name:'p0',type:'nvarchar',value:'admin'},{name:'p1',type:'nvarchar',value:adminHash}]);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 0: CLEANUP
// ─────────────────────────────────────────────────────────────────────
async function cleanup(db: IDatabaseAdapter) {
  const tables = [
    'scheduling_allocations','scheduling_capacity',
    'shift_assignments','shift_definitions',
    'delivery_shipments',
    'quality_8d_reports','quality_inspections',
    'maintenance_log','maintenance_schedules','maintenance_assets',
    'performance_targets','performance_entries',
    'oee_records','oee_machines',
    'fleet_refuels','fleet_trips','fleet_vehicles',
    'inventory_movements','inventory_items',
    'tracking_history','tracking_items',
    'workforce_daily',
    'core_notifications','core_sync_events','core_audit_log',
  ];
  process.stdout.write('[Seed] Cleaning...');
  for (const t of tables) { try { await db.execute(`DELETE FROM ${t}`,[]);} catch{} }
  try { await db.execute(`DELETE FROM core_sessions`,[]);} catch{}
  try { await db.execute(`DELETE FROM core_users WHERE username IN ('manager_hu','manager_de','operator1','operator2','operator3','ainova_owner')`,[]);} catch{}
  console.log(' ✓');
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 1: USERS  (admin + 2 managers + 3 operators)
// ─────────────────────────────────────────────────────────────────────
async function seedUsers(db: IDatabaseAdapter) {
  const users = [
    {un:'manager_hu', plain:'Manager2025!', full:'Kovács Béla (vezető)',       email:'b.kovacs@demo.hu',   role:'manager'},
    {un:'manager_de', plain:'Manager2025!', full:'Müller Gerhard (Leiter)',     email:'g.mueller@demo.de',  role:'manager'},
    {un:'operator1',  plain:'Operator2025!',full:'Kiss István',                 email:'i.kiss@demo.hu',     role:'user'},
    {un:'operator2',  plain:'Operator2025!',full:'Tóth Péter',                  email:'p.toth@demo.hu',     role:'user'},
    {un:'operator3',  plain:'Operator2025!',full:'Smith John',                  email:'j.smith@demo.com',   role:'user'},
  ];
  for (const u of users) {
    const hash = await bcrypt.hash(u.plain, 10);
    await ex(db,'core_users',
      `INSERT INTO core_users (username,password_hash,full_name,email,role,is_active,first_login) VALUES (@p0,@p1,@p2,@p3,@p4,1,0)`,
      [{name:'p0',type:'nvarchar',value:u.un},{name:'p1',type:'nvarchar',value:hash},
       {name:'p2',type:'nvarchar',value:u.full},{name:'p3',type:'nvarchar',value:u.email},{name:'p4',type:'nvarchar',value:u.role}]
    );
  }
  try { await db.execute(`UPDATE core_users SET first_login=0, full_name='Demo Admin' WHERE username='admin'`,[]); } catch{}
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 2: SETTINGS
// ─────────────────────────────────────────────────────────────────────
async function seedSettings(db: IDatabaseAdapter) {
  const ALL = ['workforce','tracking','fleet','oee','performance','maintenance','inventory','quality','shift-management','scheduling','delivery','reports'];
  const kvs = [
    ['app_name','AinovaDemo — Precision Parts Kft.'],
    ['app_locale','hu'], ['setup_completed','true'],
    ['company_name','Precision Parts Kft.'], ['license_tier','enterprise'],
    ['active_modules', JSON.stringify(ALL)],
  ];
  for (const [k,v] of kvs) {
    try {
      await db.execute(`UPDATE core_settings SET setting_value=@p1 WHERE setting_key=@p0`,
        [{name:'p0',type:'nvarchar',value:k},{name:'p1',type:'nvarchar',value:v}]);
      // SQLite fallback
      await db.execute(`INSERT OR IGNORE INTO core_settings (setting_key,setting_value) VALUES (@p0,@p1)`,
        [{name:'p0',type:'nvarchar',value:k},{name:'p1',type:'nvarchar',value:v}]);
    } catch {}
    track('core_settings');
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 3: AUDIT LOG  (30 days of login/action events)
// ─────────────────────────────────────────────────────────────────────
async function seedAuditLog(db: IDatabaseAdapter) {
  const users = ['admin','manager_hu','manager_de','operator1','operator2','operator3'];
  const events = ['login','logout','data_import','settings_change','report_export','user_created'];
  const ips = ['192.168.1.10','192.168.1.11','192.168.1.42','10.0.0.5','10.0.0.6'];
  for (let d=0;d<30;d++) {
    const date = daysAgo(d);
    for (let i=0;i<rand(6,18);i++) {
      await ex(db,'core_audit_log',
        `INSERT INTO core_audit_log (event_type,username,ip_address,details,success,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
        [{name:'p0',type:'nvarchar',value:pick(events)},{name:'p1',type:'nvarchar',value:pick(users)},
         {name:'p2',type:'nvarchar',value:pick(ips)},{name:'p3',type:'nvarchar',value:`Event on ${date}`},
         {name:'p4',type:'bit',value:Math.random()>0.05?1:0},{name:'p5',type:'datetime2',value:`${date} 0${rand(6,9)}:${rand(0,59).toString().padStart(2,'0')}:00`}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 4: SYNC EVENTS  (success stream + 3 injected sync_errors)
// ─────────────────────────────────────────────────────────────────────
async function seedSyncEvents(db: IDatabaseAdapter) {
  const mods = ['workforce','tracking','oee','inventory','fleet'];
  for (let d=29;d>=0;d--) {
    for (const m of mods) {
      await ex(db,'core_sync_events',
        `INSERT INTO core_sync_events (module_id,event_type,status,message,rows_affected,triggered_by,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
        [{name:'p0',type:'nvarchar',value:m},{name:'p1',type:'nvarchar',value:'import_success'},
         {name:'p2',type:'nvarchar',value:'success'},{name:'p3',type:'nvarchar',value:'Import sikeres'},
         {name:'p4',type:'int',value:rand(40,250)},{name:'p5',type:'nvarchar',value:'system'},
         {name:'p6',type:'datetime2',value:`${daysAgo(d)} 07:05:00`}]
      );
    }
  }
  // 3 injected errors in last 7 days
  const errors = [
    {d:2,m:'oee',    msg:'OEE adapter timeout — PLC connection refused (CNC-001)',    detail:'Error: connect ETIMEDOUT 10.10.1.50:102'},
    {d:4,m:'inventory',msg:'SAP IDoc malformed — unexpected field at row 142',        detail:'ParseError: unexpected token at position 3842 in IDOC.xml'},
    {d:6,m:'workforce',msg:'Duplicate key violation — attendance record exists',      detail:'UNIQUE constraint failed: workforce_daily'},
  ];
  for (const e of errors) {
    await ex(db,'core_sync_events',
      `INSERT INTO core_sync_events (module_id,event_type,status,message,details,rows_affected,triggered_by,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,0,@p5,@p6)`,
      [{name:'p0',type:'nvarchar',value:e.m},{name:'p1',type:'nvarchar',value:'sync_error'},
       {name:'p2',type:'nvarchar',value:'error'},{name:'p3',type:'nvarchar',value:e.msg},
       {name:'p4',type:'nvarchar',value:e.detail},{name:'p5',type:'nvarchar',value:'system'},
       {name:'p6',type:'datetime2',value:`${daysAgo(e.d)} 14:32:${rand(10,59)}`}]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 5: NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────
async function seedNotifications(db: IDatabaseAdapter) {
  const notifs = [
    {sev:'error',  title:'OEE szinkronizáció meghiúsult',       msg:'CNC-001 PLC kapcsolat megszakadt. Kézi beavatkozás szükséges.'},
    {sev:'warning',title:'Alacsony készlet — RAL9003 porlakk',  msg:'Jelenlegi készlet: 28 kg. Minimum: 8 kg. Rendelés javasolt.'},
    {sev:'warning',title:'Karbantartás esedékes — PRES-001',    msg:'Préssor 250T soron következő karbantartás: 3 nap múlva.'},
    {sev:'info',   title:'Napi riport elkészült',                msg:'Napi gyártási összesítő elérhető a Riportok modulban.'},
    {sev:'success',title:'Audi kiszállítás megerősítve',         msg:'ORD-2025-0847 szállítmány beérkezett. 480 db KHP-42 elfogadva.'},
    {sev:'error',  title:'Import hiba — inventory modul',        msg:'SAP IDoc feldolgozás sikertelen. 142. sor: ismeretlen mezőkód.'},
    {sev:'warning',title:'OEE < 70% — Festősor',                msg:'FEST-001 teljesítmény az elmúlt 3 napban 68.2%.'},
    {sev:'info',   title:'Új felhasználó regisztrálva',          msg:'Richter Helga (manager_de) első bejelentkezés megtörtént.'},
  ];
  for (const n of notifs) {
    await ex(db,'core_notifications',
      `INSERT INTO core_notifications (module_id,title,message,severity,is_read,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
      [{name:'p0',type:'nvarchar',value:'system'},{name:'p1',type:'nvarchar',value:n.title},
       {name:'p2',type:'nvarchar',value:n.msg},{name:'p3',type:'nvarchar',value:n.sev},
       {name:'p4',type:'bit',value:Math.random()>0.4?1:0},{name:'p5',type:'datetime2',value:hoursAgo(rand(1,72))}]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 6: SHIFT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────
async function seedShiftDefs(db: IDatabaseAdapter): Promise<Record<string,number>> {
  const defs = [
    {name:'Reggeli', start:'06:00',end:'14:00',color:'#fbbf24'},
    {name:'Délutáni',start:'14:00',end:'22:00',color:'#818cf8'},
    {name:'Éjszakai',start:'22:00',end:'06:00',color:'#94a3b8'},
  ];
  for (const s of defs) {
    await ex(db,'shift_definitions',
      `INSERT INTO shift_definitions (shift_name,start_time,end_time,color,is_active) VALUES (@p0,@p1,@p2,@p3,1)`,
      [{name:'p0',type:'nvarchar',value:s.name},{name:'p1',type:'nvarchar',value:s.start},
       {name:'p2',type:'nvarchar',value:s.end},{name:'p3',type:'nvarchar',value:s.color}]
    );
  }
  const rows = await db.query<{id:number;shift_name:string}>(`SELECT id,shift_name FROM shift_definitions ORDER BY id`);
  const m: Record<string,number> = {};
  for (const r of rows) m[r.shift_name] = r.id;
  return m;
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 7: SHIFT ASSIGNMENTS (30 days × 30 workers)
// ─────────────────────────────────────────────────────────────────────
async function seedShiftAssignments(db: IDatabaseAdapter, shiftMap: Record<string,number>) {
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    for (const emp of EMPLOYEES) {
      const sid = shiftMap[emp.shift] ?? 1;
      const status = Math.random()>0.05 ? 'confirmed' : 'absent';
      await ex(db,'shift_assignments',
        `INSERT INTO shift_assignments (worker_name,team_name,shift_id,assignment_date,status,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
        [{name:'p0',type:'nvarchar',value:emp.name},{name:'p1',type:'nvarchar',value:emp.area},
         {name:'p2',type:'int',value:sid},{name:'p3',type:'nvarchar',value:date},
         {name:'p4',type:'nvarchar',value:status},{name:'p5',type:'nvarchar',value:'manager_hu'}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 8: WORKFORCE DAILY  (aggregated per area/shift — correct table)
// ─────────────────────────────────────────────────────────────────────
async function seedWorkforce(db: IDatabaseAdapter) {
  // Build planned counts: area+shift → headcount
  const areaShift: Record<string,number> = {};
  for (const e of EMPLOYEES) {
    const k=`${e.area}::${e.shift}`; areaShift[k]=(areaShift[k]??0)+1;
  }
  const shifts = ['Reggeli','Délutáni','Éjszakai'];
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    const isWE = [0,6].includes(new Date(date).getDay());
    for (const area of AREAS) {
      for (const shift of shifts) {
        const base = areaShift[`${area}::${shift}`]??0;
        if (base===0) continue;
        const weFactor = isWE ? rand(60,80)/100 : 1;
        const planned = Math.round(base * (isWE?1:rand(95,105)/100));
        const absent  = rand(0, Math.max(1, Math.round(base*0.08)));
        const actual  = Math.max(0, Math.round(planned*weFactor)-absent);
        await ex(db,'workforce_daily',
          `INSERT INTO workforce_daily (record_date,shift_name,area_name,planned_count,actual_count,absent_count,recorded_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
          [{name:'p0',type:'nvarchar',value:date},{name:'p1',type:'nvarchar',value:shift},
           {name:'p2',type:'nvarchar',value:area},{name:'p3',type:'float',value:planned},
           {name:'p4',type:'float',value:actual},{name:'p5',type:'float',value:absent},
           {name:'p6',type:'nvarchar',value:'manager_hu'}]
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 9: OEE  (planned=480min, real math for availability/performance/quality)
// ─────────────────────────────────────────────────────────────────────
async function seedOee(db: IDatabaseAdapter) {
  for (const m of MACHINES) {
    await ex(db,'oee_machines',
      `INSERT INTO oee_machines (machine_code,machine_name,area,is_active) VALUES (@p0,@p1,@p2,1)`,
      [{name:'p0',type:'nvarchar',value:m.code},{name:'p1',type:'nvarchar',value:m.name},{name:'p2',type:'nvarchar',value:m.area}]
    );
  }
  const mRows = await db.query<{id:number;machine_code:string}>(`SELECT id,machine_code FROM oee_machines ORDER BY id`);
  const codeToId: Record<string,number> = {};
  for (const r of mRows) codeToId[r.machine_code]=r.id;

  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    if ([0,6].includes(new Date(date).getDay()) && Math.random()>0.3) continue;
    for (const m of MACHINES) {
      const mid = codeToId[m.code]; if (!mid) continue;
      for (const shift of ['Reggeli','Délutáni']) {
        const avail = rand(m.code.startsWith('CNC')?78:70, 96, 2);
        const perf  = rand(68, 94, 2);
        const qual  = rand(91, 99, 2);
        const oee   = parseFloat(((avail*perf*qual)/10000).toFixed(2));
        const planMin = 480;
        const runMin  = parseFloat((planMin*avail/100).toFixed(2));
        const total   = Math.floor((runMin*60/m.cycle)*(perf/100));
        const good    = Math.floor(total*qual/100);
        await ex(db,'oee_records',
          `INSERT INTO oee_records (machine_id,record_date,shift,planned_time_min,run_time_min,ideal_cycle_sec,total_count,good_count,reject_count,availability_pct,performance_pct,quality_pct,oee_pct,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13)`,
          [{name:'p0',type:'int',value:mid},{name:'p1',type:'nvarchar',value:date},{name:'p2',type:'nvarchar',value:shift},
           {name:'p3',type:'float',value:planMin},{name:'p4',type:'float',value:runMin},{name:'p5',type:'float',value:m.cycle},
           {name:'p6',type:'int',value:total},{name:'p7',type:'int',value:good},{name:'p8',type:'int',value:total-good},
           {name:'p9',type:'float',value:avail},{name:'p10',type:'float',value:perf},{name:'p11',type:'float',value:qual},
           {name:'p12',type:'float',value:oee},{name:'p13',type:'nvarchar',value:'system'}]
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 10: PERFORMANCE ENTRIES  (minutes-unit, max 480/day per worker)
// ─────────────────────────────────────────────────────────────────────
async function seedPerformance(db: IDatabaseAdapter) {
  // Global target
  await ex(db,'performance_targets',
    `INSERT INTO performance_targets (target_type,target_name,period_type,target_value,target_unit,valid_from) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
    [{name:'p0',type:'nvarchar',value:'global'},{name:'p1',type:'nvarchar',value:''},
     {name:'p2',type:'nvarchar',value:'daily'},{name:'p3',type:'float',value:90},
     {name:'p4',type:'nvarchar',value:'percent'},{name:'p5',type:'nvarchar',value:daysAgo(30)}]
  );
  const prodWorkers = EMPLOYEES.filter(e=>['Gyártás A','Gyártás B','Összeszerelés'].includes(e.area));
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    if ([0,6].includes(new Date(date).getDay()) && Math.random()>0.25) continue;
    for (const emp of prodWorkers) {
      if (Math.random()<0.04) continue; // 4% absent
      const task = pick(TASKS);
      const qty  = rand(55,95);
      const normPerPiece = 6; // 6 min/piece → 80 pieces in 480 min at 100%
      const normTime  = parseFloat((qty*normPerPiece).toFixed(2));
      const effFactor = 0.85+Math.random()*0.30;
      const actualTime = parseFloat(Math.min(normTime/effFactor, 480).toFixed(2));
      const efficiency = parseFloat(((normTime/actualTime)*100).toFixed(2));
      await ex(db,'performance_entries',
        `INSERT INTO performance_entries (entry_date,worker_name,team_name,task_code,task_name,quantity,norm_time,actual_time,efficiency,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9)`,
        [{name:'p0',type:'nvarchar',value:date},{name:'p1',type:'nvarchar',value:emp.name},
         {name:'p2',type:'nvarchar',value:emp.area},{name:'p3',type:'nvarchar',value:task.code},
         {name:'p4',type:'nvarchar',value:task.name},{name:'p5',type:'float',value:qty},
         {name:'p6',type:'float',value:normTime},{name:'p7',type:'float',value:actualTime},
         {name:'p8',type:'float',value:efficiency},{name:'p9',type:'nvarchar',value:'manager_hu'}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 11: TRACKING ITEMS + HISTORY
// ─────────────────────────────────────────────────────────────────────
async function seedTracking(db: IDatabaseAdapter) {
  const assignees = EMPLOYEES.filter(e=>e.area==='Összeszerelés').map(e=>e.name);
  const items = [
    {ref:'ORD-2025-0810',title:'KHP-42 sorozatgyártás — Bosch rendelés',        prio:'magas',    st:'Folyamatban'},
    {ref:'ORD-2025-0823',title:'XT-7 burkolat első szállítmány Audinak',         prio:'kritikus', st:'Folyamatban'},
    {ref:'ORD-2025-0831',title:'R-90 prototípus sorozat (5 db)',                 prio:'normal',   st:'Kész'},
    {ref:'ORD-2025-0847',title:'TEN-88 tengely — SKF havi keretrendelés',        prio:'magas',    st:'Lezárva'},
    {ref:'MNT-2025-0012',title:'PRES-001 éves karbantartás ütemezés',            prio:'magas',    st:'Nyitott'},
    {ref:'MNT-2025-0015',title:'Festősor fúvókacsere + kalibrálás',              prio:'normal',   st:'Folyamatban'},
    {ref:'INT-2025-0041',title:'Acéllemez 3mm — sürgős utánrendelés',            prio:'kritikus', st:'Kész'},
    {ref:'QC-2025-0009', title:'XT-7 minőségi visszahívás vizsgálat (batch#7)',  prio:'kritikus', st:'Folyamatban'},
    {ref:'QC-2025-0011', title:'8D riport — CF-220 hegesztési hiba',             prio:'magas',    st:'Nyitott'},
    {ref:'DEL-2025-0128',title:'Rába Automotive kiszállítás — március',          prio:'normal',   st:'Lezárva'},
    {ref:'IT-2025-0003', title:'Ainova PLC csatlakozó telepítése CNC-003-ra',    prio:'alacsony', st:'Nyitott'},
    {ref:'HR-2025-0007', title:'Új dolgozók betanítása — Gyártás B',             prio:'normal',   st:'Folyamatban'},
  ];
  for (const item of items) {
    const dOld = rand(3,25);
    await ex(db,'tracking_items',
      `INSERT INTO tracking_items (reference_code,title,status,priority,assigned_to,due_date,created_by,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7)`,
      [{name:'p0',type:'nvarchar',value:item.ref},{name:'p1',type:'nvarchar',value:item.title},
       {name:'p2',type:'nvarchar',value:item.st},{name:'p3',type:'nvarchar',value:item.prio},
       {name:'p4',type:'nvarchar',value:pick(assignees)},{name:'p5',type:'nvarchar',value:daysAgo(dOld-rand(0,10))},
       {name:'p6',type:'nvarchar',value:'manager_hu'},{name:'p7',type:'datetime2',value:`${daysAgo(dOld)} 09:00:00`}]
    );
  }
  // History for first 6 items
  const tRows = await db.query<{id:number}>(`SELECT id FROM tracking_items ORDER BY id LIMIT 6`);
  for (const row of tRows) {
    for (const t of [
      {from:'',to:'Nyitott',by:'manager_hu',note:'Létrehozva'},
      {from:'Nyitott',to:'Folyamatban',by:pick(EMPLOYEES).name,note:'Megkezdve'},
    ]) {
      await ex(db,'tracking_history',
        `INSERT INTO tracking_history (item_id,old_status,new_status,changed_by,note,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
        [{name:'p0',type:'int',value:row.id},{name:'p1',type:'nvarchar',value:t.from},
         {name:'p2',type:'nvarchar',value:t.to},{name:'p3',type:'nvarchar',value:t.by},
         {name:'p4',type:'nvarchar',value:t.note},{name:'p5',type:'datetime2',value:hoursAgo(rand(24,200))}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 12: FLEET
// ─────────────────────────────────────────────────────────────────────
async function seedFleet(db: IDatabaseAdapter) {
  for (const v of VEHICLES) {
    await ex(db,'fleet_vehicles',
      `INSERT INTO fleet_vehicles (plate_number,vehicle_name,vehicle_type,is_active) VALUES (@p0,@p1,@p2,1)`,
      [{name:'p0',type:'nvarchar',value:v.plate},{name:'p1',type:'nvarchar',value:v.name},{name:'p2',type:'nvarchar',value:v.type}]
    );
  }
  const vRows = await db.query<{id:number;plate_number:string}>(`SELECT id,plate_number FROM fleet_vehicles ORDER BY id`);
  const pToId: Record<string,number>={};
  for (const r of vRows) pToId[r.plate_number]=r.id;
  const drivers = EMPLOYEES.filter(e=>e.area==='Raktár').map(e=>e.name);
  const purposes = ['Anyagszállítás Győr','Kiszállítás Bosch Leipzig','Alkatrész felvétel Budapest','Ügyfél látogatás Audi','Vámkezelés Hegyeshalom'];

  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    if ([0,6].includes(new Date(date).getDay()) && Math.random()>0.4) continue;
    for (const v of VEHICLES) {
      if (v.type==='forklift' || Math.random()>0.65) continue;
      const vid = pToId[v.plate]; if (!vid) continue;
      const dist = rand(45,520,1);
      const startKm = rand(15000,180000,1);
      await ex(db,'fleet_trips',
        `INSERT INTO fleet_trips (vehicle_id,trip_date,driver_name,start_km,end_km,distance,purpose,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7)`,
        [{name:'p0',type:'int',value:vid},{name:'p1',type:'nvarchar',value:date},
         {name:'p2',type:'nvarchar',value:pick(drivers)},{name:'p3',type:'float',value:startKm},
         {name:'p4',type:'float',value:startKm+dist},{name:'p5',type:'float',value:dist},
         {name:'p6',type:'nvarchar',value:pick(purposes)},{name:'p7',type:'nvarchar',value:pick(drivers)}]
      );
      if (Math.random()<0.2) {
        const liters = rand(40,95,2);
        await ex(db,'fleet_refuels',
          `INSERT INTO fleet_refuels (vehicle_id,refuel_date,amount,cost,km_at_refuel,fuel_type,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
          [{name:'p0',type:'int',value:vid},{name:'p1',type:'nvarchar',value:date},
           {name:'p2',type:'float',value:liters},{name:'p3',type:'float',value:parseFloat((liters*rand(580,640)/100).toFixed(2))},
           {name:'p4',type:'float',value:startKm+dist},{name:'p5',type:'nvarchar',value:'diesel'},{name:'p6',type:'nvarchar',value:pick(drivers)}]
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 13: MAINTENANCE
// ─────────────────────────────────────────────────────────────────────
async function seedMaintenance(db: IDatabaseAdapter) {
  for (const a of ASSETS) {
    await ex(db,'maintenance_assets',
      `INSERT INTO maintenance_assets (asset_code,asset_name,asset_type,location,is_active) VALUES (@p0,@p1,@p2,@p3,1)`,
      [{name:'p0',type:'nvarchar',value:a.code},{name:'p1',type:'nvarchar',value:a.name},{name:'p2',type:'nvarchar',value:a.type},{name:'p3',type:'nvarchar',value:a.loc}]
    );
  }
  const aRows = await db.query<{id:number;asset_code:string}>(`SELECT id,asset_code FROM maintenance_assets ORDER BY id`);
  const cToId: Record<string,number>={};
  for (const r of aRows) cToId[r.asset_code]=r.id;

  const schedules = [
    {a:'MA-001',task:'Napi kenés és ellenőrzés',  days:1,  prio:'normal'},
    {a:'MA-001',task:'Havi kalibrálás',            days:30, prio:'magas'},
    {a:'MA-002',task:'Napi kenés és ellenőrzés',  days:1,  prio:'normal'},
    {a:'MA-003',task:'Hidraulika olaj csere',      days:90, prio:'magas'},
    {a:'MA-003',task:'Présszerszám ellenőrzés',    days:7,  prio:'normal'},
    {a:'MA-004',task:'Hegesztő kalibrálás',        days:14, prio:'magas'},
    {a:'MA-005',task:'Fúvóka tisztítás',           days:7,  prio:'normal'},
    {a:'MA-006',task:'Daru terheléspróba',         days:365,prio:'kritikus'},
    {a:'MA-007',task:'Kompresszor szűrőcsere',     days:30, prio:'normal'},
  ];
  for (const s of schedules) {
    const aid = cToId[s.a]; if (!aid) continue;
    await ex(db,'maintenance_schedules',
      `INSERT INTO maintenance_schedules (asset_id,task_name,interval_days,last_done_date,next_due_date,priority,assigned_to) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
      [{name:'p0',type:'int',value:aid},{name:'p1',type:'nvarchar',value:s.task},
       {name:'p2',type:'int',value:s.days},{name:'p3',type:'nvarchar',value:daysAgo(rand(0,s.days))},
       {name:'p4',type:'nvarchar',value:daysAgo(-rand(1,s.days))},{name:'p5',type:'nvarchar',value:s.prio},
       {name:'p6',type:'nvarchar',value:pick(EMPLOYEES.filter(e=>e.area!=='Minőség')).name}]
    );
  }
  const schRows = await db.query<{id:number;asset_id:number}>(`SELECT id,asset_id FROM maintenance_schedules ORDER BY id`);
  const maintWorkers = EMPLOYEES.filter(e=>['Gyártás A','Gyártás B'].includes(e.area)).map(e=>e.name);
  for (const sch of schRows) {
    for (let c=0;c<rand(2,7);c++) {
      await ex(db,'maintenance_log',
        `INSERT INTO maintenance_log (schedule_id,asset_id,done_date,duration_min,cost,performed_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
        [{name:'p0',type:'int',value:sch.id},{name:'p1',type:'int',value:sch.asset_id},
         {name:'p2',type:'nvarchar',value:daysAgo(rand(1,28))},{name:'p3',type:'int',value:rand(15,240)},
         {name:'p4',type:'float',value:rand(500,85000,2)},{name:'p5',type:'nvarchar',value:pick(maintWorkers)}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 14: INVENTORY
// ─────────────────────────────────────────────────────────────────────
async function seedInventory(db: IDatabaseAdapter) {
  for (const item of INVENTORY_ITEMS) {
    await ex(db,'inventory_items',
      `INSERT INTO inventory_items (sku,item_name,category,current_qty,min_qty,max_qty,unit_name,location,is_active) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,1)`,
      [{name:'p0',type:'nvarchar',value:item.sku},{name:'p1',type:'nvarchar',value:item.name},
       {name:'p2',type:'nvarchar',value:item.cat},{name:'p3',type:'float',value:item.qty},
       {name:'p4',type:'float',value:item.min},{name:'p5',type:'float',value:item.max},
       {name:'p6',type:'nvarchar',value:item.unit},{name:'p7',type:'nvarchar',value:item.loc}]
    );
  }
  const iRows = await db.query<{id:number;sku:string}>(`SELECT id,sku FROM inventory_items ORDER BY id`);
  const skuToId: Record<string,number>={};
  for (const r of iRows) skuToId[r.sku]=r.id;
  const wh = EMPLOYEES.filter(e=>e.area==='Raktár').map(e=>e.name);
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    for (const item of INVENTORY_ITEMS) {
      const iid = skuToId[item.sku]; if (!iid || Math.random()>0.55) continue;
      const mv = Math.random()>0.3?'out':'in';
      const qty = rand(3,Math.min(40,Math.floor(item.qty*0.12)));
      await ex(db,'inventory_movements',
        `INSERT INTO inventory_movements (item_id,movement_type,quantity,reference,created_by,created_at) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
        [{name:'p0',type:'int',value:iid},{name:'p1',type:'nvarchar',value:mv},
         {name:'p2',type:'float',value:qty},{name:'p3',type:'nvarchar',value:mv==='out'?`ORD-${rand(800,900)}`:`PO-${rand(100,200)}`},
         {name:'p4',type:'nvarchar',value:pick(wh)},{name:'p5',type:'datetime2',value:`${date} 10:${rand(0,59).toString().padStart(2,'0')}:00`}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 15: QUALITY INSPECTIONS
// ─────────────────────────────────────────────────────────────────────
async function seedQuality(db: IDatabaseAdapter) {
  const products = [{code:'P-1001',name:'KHP-42'},{code:'P-1002',name:'Burkolat XT-7'},{code:'P-1003',name:'R-90 rögzítő'},{code:'P-1004',name:'CF-220'},{code:'P-1005',name:'TEN-88'}];
  const rCodes = ['DIM-ERR','SURF-DEF','WELD-FAIL','DIM-OVER','COAT-PEEL'];
  const rReasons = ['Mérettűrés túllépés','Felületi sérülés','Hegesztési varrat hiba','Porlakk leválás — előkezelési probléma'];
  const inspectors = EMPLOYEES.filter(e=>e.area==='Minőség').map(e=>e.name);
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    const isWE = [0,6].includes(new Date(date).getDay());
    for (let i=0;i<rand(isWE?0:2,5);i++) {
      const p = pick(products);
      const checked = rand(50,300);
      const rejectRate = Math.random()<0.1?rand(5,15):rand(0,4);
      const rejected = Math.floor(checked*rejectRate/100);
      const status = rejected===0?'passed':(rejectRate>8?'failed':'conditional');
      await ex(db,'quality_inspections',
        `INSERT INTO quality_inspections (inspection_date,product_code,product_name,batch_number,inspector,total_checked,passed_count,rejected_count,reject_code,reject_reason,status,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11)`,
        [{name:'p0',type:'nvarchar',value:date},{name:'p1',type:'nvarchar',value:p.code},
         {name:'p2',type:'nvarchar',value:p.name},{name:'p3',type:'nvarchar',value:`B${date.replace(/-/g,'')}-${String(i+1).padStart(2,'0')}`},
         {name:'p4',type:'nvarchar',value:pick(inspectors)},{name:'p5',type:'int',value:checked},
         {name:'p6',type:'int',value:checked-rejected},{name:'p7',type:'int',value:rejected},
         {name:'p8',type:'nvarchar',value:rejected>0?pick(rCodes):''},{name:'p9',type:'nvarchar',value:rejected>0?pick(rReasons):''},
         {name:'p10',type:'nvarchar',value:status},{name:'p11',type:'nvarchar',value:pick(inspectors)}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 16: SCHEDULING CAPACITY (weekly, 5 weeks)
// ─────────────────────────────────────────────────────────────────────
async function seedScheduling(db: IDatabaseAdapter) {
  for (let w=4;w>=0;w--) {
    // Find Monday
    const d = new Date(); d.setDate(d.getDate()-d.getDay()+1-w*7);
    const weekStart = d.toISOString().slice(0,10);
    for (const area of AREAS) {
      const planned = rand(35,42,1);
      const alloc   = rand(28,planned,1);
      const actual  = parseFloat(Math.min(alloc*rand(90,105)/100, planned).toFixed(1));
      await db.execute(
        `INSERT INTO scheduling_capacity (week_start,resource_type,resource_name,planned_hours,allocated_hours,actual_hours,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6)`,
        [{name:'p0',type:'nvarchar',value:weekStart},{name:'p1',type:'nvarchar',value:'area'},
         {name:'p2',type:'nvarchar',value:area},{name:'p3',type:'float',value:planned},
         {name:'p4',type:'float',value:alloc},{name:'p5',type:'float',value:actual},
         {name:'p6',type:'nvarchar',value:'manager_hu'}]
      );
      track('scheduling_capacity');
      // 2-3 allocations per capacity slot
      const capRows = await db.query<{id:number}>(`SELECT id FROM scheduling_capacity WHERE week_start=@p0 AND resource_name=@p1`,
        [{name:'p0',type:'nvarchar',value:weekStart},{name:'p1',type:'nvarchar',value:area}]);
      if (capRows[0]) {
        for (let a=0;a<rand(2,3);a++) {
          const task = pick(TASKS);
          await ex(db,'scheduling_allocations',
            `INSERT INTO scheduling_allocations (capacity_id,task_name,task_code,hours,priority,status) VALUES (@p0,@p1,@p2,@p3,@p4,@p5)`,
            [{name:'p0',type:'int',value:capRows[0].id},{name:'p1',type:'nvarchar',value:task.name},
             {name:'p2',type:'nvarchar',value:task.code},{name:'p3',type:'float',value:rand(6,18,1)},
             {name:'p4',type:'int',value:rand(0,3)},{name:'p5',type:'nvarchar',value:pick(['planned','in_progress','done'])}]
          );
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SECTION 17: DELIVERY SHIPMENTS (30 days)
// ─────────────────────────────────────────────────────────────────────
async function seedDelivery(db: IDatabaseAdapter) {
  const statuses = ['pending','shipped','delivered','returned'];
  for (let d=29;d>=0;d--) {
    const date = daysAgo(d);
    if ([0,6].includes(new Date(date).getDay()) && Math.random()>0.3) continue;
    const shipmentsToday = rand(1,4);
    for (let i=0;i<shipmentsToday;i++) {
      const cust = pick(CUSTOMERS);
      const qty  = rand(50,800);
      const weight = rand(40,2400,2);
      const status = d>14?'delivered':(d>7?pick(['shipped','delivered']):pick(statuses));
      await ex(db,'delivery_shipments',
        `INSERT INTO delivery_shipments (shipment_date,customer_name,customer_code,order_number,quantity,weight,value,status,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
        [{name:'p0',type:'nvarchar',value:date},{name:'p1',type:'nvarchar',value:cust.name},
         {name:'p2',type:'nvarchar',value:cust.code},{name:'p3',type:'nvarchar',value:`ORD-2025-${rand(800,950)}`},
         {name:'p4',type:'float',value:qty},{name:'p5',type:'float',value:weight},
         {name:'p6',type:'float',value:parseFloat((qty*rand(1200,4500)).toFixed(2))},
         {name:'p7',type:'nvarchar',value:status},{name:'p8',type:'nvarchar',value:'manager_hu'}]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(  '║   AINOVA MASTER SEEDER — Precision Parts Kft.   ║');
  console.log(  '╚══════════════════════════════════════════════════╝\n');

  const db = getDb();

  await createTablesIfNeeded(db);
  await cleanup(db);

  const steps: [string, () => Promise<unknown>][] = [
    ['Users (admin+manager_hu+manager_de+3 operators)', () => seedUsers(db)],
    ['Settings (setup_completed, active_modules)',       () => seedSettings(db)],
    ['Audit log (30 days)',                              () => seedAuditLog(db)],
    ['Sync events (success stream + 3 sync_errors)',     () => seedSyncEvents(db)],
    ['Notifications (8 alerts)',                         () => seedNotifications(db)],
    ['Shift definitions + assignments',                  async () => { const m = await seedShiftDefs(db); await seedShiftAssignments(db, m); }],
    ['Workforce daily (30d × 3 shifts × 5 areas)',       () => seedWorkforce(db)],
    ['OEE machines + records (8 machines, 30d)',         () => seedOee(db)],
    ['Performance entries + targets',                    () => seedPerformance(db)],
    ['Tracking items + history',                         () => seedTracking(db)],
    ['Fleet vehicles + trips + refuels',                 () => seedFleet(db)],
    ['Maintenance assets + schedules + log',             () => seedMaintenance(db)],
    ['Inventory items + movements (30d)',                () => seedInventory(db)],
    ['Quality inspections',                              () => seedQuality(db)],
    ['Scheduling capacity + allocations',                () => seedScheduling(db)],
    ['Delivery shipments (30d)',                         () => seedDelivery(db)],
  ];

  for (const [label, fn] of steps) {
    process.stdout.write(`  ► ${label}...`);
    await fn();
    console.log(' ✓');
  }

  // ── Statistics table ──
  console.log('\n┌────────────────────────────────────────┬───────────┐');
  console.log(  '│ Table                                  │   Rows    │');
  console.log(  '├────────────────────────────────────────┼───────────┤');
  const sorted = Object.entries(stats).sort((a,b)=>b[1]-a[1]);
  for (const [t,n] of sorted) {
    console.log(`│ ${t.padEnd(38)} │ ${String(n).padStart(9)} │`);
  }
  const total = Object.values(stats).reduce((a,b)=>a+b,0);
  console.log(  '├────────────────────────────────────────┼───────────┤');
  console.log(`│ ${'TOTAL'.padEnd(38)} │ ${String(total).padStart(9)} │`);
  console.log(  '└────────────────────────────────────────┴───────────┘');

  console.log('\n✅ Seed complete!');
  console.log('   Credentials:');
  console.log('     admin       / Admin1234!');
  console.log('     manager_hu  / Manager2025!');
  console.log('     manager_de  / Manager2025!');
  console.log('     operator1-3 / Operator2025!\n');

  await db.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
