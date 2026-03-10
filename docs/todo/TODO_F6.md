# F6 — GENERIKUS IMPORT PIPELINE

> **Cél:** Bármilyen Excel/CSV fájl importálható legyen admin panelből konfigurálható oszlop mapping-gel. A vevőnek NEM kell programozóhoz fordulnia alap importokhoz.
> **Előfeltétel:** F0-F5 kész
> **Időbecslés:** 2 hét

---

## F6.1 — core_import_configs tábla migráció

**Fájl:** `database/core/013_core_import_configs.sql` (ÚJ fájl)

```sql
-- Migration 013: core_import_configs + core_import_log táblák

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_import_configs'
)
  CREATE TABLE core_import_configs (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_name     NVARCHAR(100) NOT NULL,       -- pl. 'SAP Visszajelentés', 'Napi létszám'
    module_id       NVARCHAR(50),                 -- Melyik modulhoz tartozik (NULL = globális)
    file_type       NVARCHAR(20) NOT NULL DEFAULT 'excel',  -- 'excel', 'csv', 'json'
    target_table    NVARCHAR(100),                -- Cél tábla neve (pl. 'workforce_daily')
    column_mapping  NVARCHAR(MAX),                -- JSON: [{"source":"Excel oszlop","target":"DB oszlop","type":"string"}]
    filters         NVARCHAR(MAX),                -- JSON: [{"column":"gyar","operator":"=","value":"1310"}]
    unit_id         INT,                          -- Alapértelmezett mértékegység (core_units FK)
    detect_rules    NVARCHAR(MAX),                -- JSON: fejléc mintázat ami alapján felismeri a típust
    is_active       BIT NOT NULL DEFAULT 1,
    created_by      NVARCHAR(100),
    created_at      DATETIME2 DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 DEFAULT SYSDATETIME()
  );
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'core_import_log'
)
  CREATE TABLE core_import_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    config_id       INT REFERENCES core_import_configs(id),
    config_name     NVARCHAR(100),
    filename        NVARCHAR(255),
    rows_total      INT DEFAULT 0,
    rows_inserted   INT DEFAULT 0,
    rows_updated    INT DEFAULT 0,
    rows_skipped    INT DEFAULT 0,
    duration_ms     INT,
    imported_by     NVARCHAR(100),
    imported_at     DATETIME2 DEFAULT SYSDATETIME(),
    status          NVARCHAR(20) DEFAULT 'success',  -- 'success', 'partial', 'error'
    error_message   NVARCHAR(MAX)
  );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_import_log_date' AND object_id = OBJECT_ID('dbo.core_import_log'))
  CREATE INDEX idx_import_log_date ON core_import_log(imported_at DESC);
GO
```

---

## F6.2 — Import adapter interface: `lib/import/IImportAdapter.ts`

**Fájl:** `lib/import/IImportAdapter.ts` (ÚJ fájl)

```typescript
export interface ColumnMapping {
  source: string;       // Excel/CSV oszlopnév
  target: string;       // DB oszlopnév
  type: 'string' | 'number' | 'date' | 'boolean' | 'float';
  required?: boolean;
  transform?: string;   // Opcionális transzformáció: 'trim', 'uppercase', 'date_parse'
}

export interface ImportFilter {
  column: string;
  operator: '=' | '!=' | 'contains' | 'starts_with' | 'in';
  value: string;
}

export interface ImportConfig {
  id: number;
  configName: string;
  moduleId: string | null;
  fileType: 'excel' | 'csv' | 'json';
  targetTable: string;
  columnMapping: ColumnMapping[];
  filters: ImportFilter[];
  unitId: number | null;
  detectRules: Record<string, unknown> | null;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  durationMs: number;
  errors: string[];
}

export interface DetectResult {
  configId: number | null;
  configName: string | null;
  confidence: number;     // 0-100
  detectedColumns: string[];
}

export interface IImportAdapter {
  /** Fejléc kiolvasása a fájlból (első N sor) */
  readHeaders(filePath: string): Promise<string[]>;

  /** Fájl típus felismerés a fejléc alapján */
  detect(filePath: string, configs: ImportConfig[]): Promise<DetectResult>;

  /** Import végrehajtás */
  process(filePath: string, config: ImportConfig): Promise<ImportResult>;
}
```

---

## F6.3 — Excel import adapter: `lib/import/adapters/ExcelImportAdapter.ts`

**Fájl:** `lib/import/adapters/ExcelImportAdapter.ts` (ÚJ fájl)

**Funkcionalitás:**
- `readHeaders(filePath)`: ExcelJS-sel megnyitja a fájlt, kiolvassa az első munkalap első sorát → oszlopnevek tömb
- `detect(filePath, configs)`: Összeveti a fejlécet az import config-ok `detect_rules`-aival → legmagasabb confidence-ű config
- `process(filePath, config)`: Soronként végigmegy, a `columnMapping` alapján leképezi az oszlopokat, a `filters` alapján szűr, a `targetTable`-be INSERT-el

**Fontos:** A meglévő LAC import logikából (SapImportDropzone + munkaterv/process) inspirálódj, de generikusan:
- NEM hardcode-olt oszlopnevek
- NEM hardcode-olt táblanév
- A config-ból jön minden

**ExcelJS használat (már dependency a package.json-ban):**
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);
const sheet = workbook.getWorksheet(1);
// headers: sheet.getRow(1).values
// sorok: sheet.eachRow(...)
```

---

## F6.4 — CSV import adapter: `lib/import/adapters/CsvImportAdapter.ts`

**Fájl:** `lib/import/adapters/CsvImportAdapter.ts` (ÚJ fájl)

**Funkcionalitás:** Ugyanaz mint az Excel adapter, de CSV fájlokra.

**Megoldás:** Egyszerű soronkénti parse (split by delimiter), vagy egy lightweight CSV parser (pl. `csv-parse` npm csomag — opcionális dependency).

Ha nem akarsz új dependency-t: az `fs.readFileSync` + `split('\n')` + `split(';')` (EU) vagy `split(',')` (US) is elég.

---

## F6.5 — Import pipeline orchestrator: `lib/import/pipeline.ts`

**Fájl:** `lib/import/pipeline.ts` (ÚJ fájl)

**Funkcionalitás:**
1. `uploadFile(file: File): Promise<string>` — fájl mentése a disk-re (UPLOAD_DIR)
2. `detectFileType(filePath: string): Promise<DetectResult>` — adapter kiválasztás (excel/csv) + fejléc alapú config felismerés
3. `processImport(filePath: string, configId: number, username: string): Promise<ImportResult>` — a teljes import pipeline:
   - Config betöltés DB-ből
   - Adapter kiválasztás (fileType alapján)
   - adapter.process() hívás
   - Eredmény mentés core_import_log-ba
   - Sync event írás (writeSyncEvent)

---

## F6.6 — Import API endpoint-ok

**Fájl:** `app/api/admin/import/route.ts` (ÚJ fájl)

**POST /api/admin/import/upload** — Fájl feltöltés
- FormData fogadás
- Fájl mentés disk-re
- Válasz: `{ filePath, fileName, fileSize }`

**POST /api/admin/import/detect** — Típus felismerés
- Body: `{ filePath }`
- Válasz: `{ configId, configName, confidence, detectedColumns }`

**POST /api/admin/import/process** — Import végrehajtás
- Body: `{ filePath, configId }`
- Permission check: `checkAuth(request, 'data.import')`
- Válasz: ImportResult

---

## F6.7 — Import config CRUD API

**Fájl:** `app/api/admin/import-configs/route.ts` (ÚJ fájl)

**GET /api/admin/import-configs** — összes config listázása
**POST /api/admin/import-configs** — új config létrehozás
**PUT /api/admin/import-configs** — config módosítás
**DELETE /api/admin/import-configs** — config törlés

Zod validáció minden endpoint-on. Permission: `checkAuth(request, 'settings.edit')`.

---

## F6.8 — Import config admin oldal (oszlop mapper UI)

**Fájl:** `app/dashboard/admin/import-configs/page.tsx` (ÚJ fájl)

**Felépítés:**

1. **Config lista:** Kártya formátumban, minden config:
   - Név, modul (ha van), fájl típus, cél tábla, létrehozás dátuma
   - Szerkesztés / Törlés gombok
   - "Új import konfiguráció" gomb

2. **Config szerkesztő (modal vagy külön oldal):**
   - Config név: text input
   - Modul: dropdown (opcionális, NULL = globális)
   - Fájl típus: excel / csv
   - Cél tábla: text input (a DB tábla neve ahova importálunk)
   - **Oszlop mapper:**
     ```
     Excel oszlop        →  DB oszlop          Típus
     ┌──────────────┐      ┌──────────────┐    ┌─────────┐
     │ [text input] │  →   │ [text input] │    │ [select]│
     │ [text input] │  →   │ [text input] │    │ [select]│
     │ [text input] │  →   │ [text input] │    │ [select]│
     └──────────────┘      └──────────────┘    └─────────┘
     [+ Új oszlop hozzáadása]
     ```
   - **Szűrők:**
     ```
     Oszlop    Operátor    Érték
     [input]   [= / != / contains]   [input]
     [+ Új szűrő]
     ```
   - **Teszt import gomb:** Feltölt egy fájlt, futtatja a detect-et, megjeleníti az első 5 sort a mapping-gel
   - Mentés gomb

3. **Import napló:** core_import_log utolsó 20 bejegyzése (dátum, fájlnév, eredmény, sorok)

---

## F6.9 — Import oldal (nem admin — data.import permission-nel)

**Fájl:** Vagy az admin panelen belül, vagy egy önálló `/dashboard/import` oldal.

**Felépítés:**
1. Dropzone (a meglévő SapImportDropzone mintájára, de generikusan)
2. Fájl feltöltés → típus felismerés → a felismert config megjelenítése
3. Import gomb → progress → eredmény
4. Nem kell oszlop mapper — az a config-ban van, ez a "futtatás" felület

---

## F6.10 — Teszt

1. `npx tsx scripts/migrate-all.ts` — 013 hiba nélkül lefut
2. `npm run type-check` — 0 hiba
3. Admin → Import configs: üres lista
4. Új config létrehozás: név, oszlop mapping megadás → mentés
5. Excel fájl feltöltés → detect → a config felismerése
6. Import futtatás → sorok bekerülnek a cél táblába
7. Import napló: az import bejegyzés megjelenik
