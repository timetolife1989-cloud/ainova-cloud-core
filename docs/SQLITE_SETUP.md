# SQLite Setup Útmutató

## Gyors Áttekintés

Az Ainova Cloud Intelligence támogatja az SQLite adatbázist a könnyebb fejlesztés és deployment érdekében. SQLite használata esetén:
- ✅ Nincs szükség külön MSSQL szerverre
- ✅ Kisebb tárhely igény
- ✅ Egyszerűbb deployment (egyetlen fájl)
- ✅ Tökéletes fejlesztéshez és kisebb telepítésekhez

## Telepítés

### 1. Környezeti változók beállítása

Szerkeszd a `.env.local` fájlt:

```env
# Database adapter váltása SQLite-ra
DB_ADAPTER=sqlite

# SQLite fájl elérési útvonala (opcionális, alapértelmezett: ./data/ainova.db)
DB_SQLITE_PATH=./data/ainova_local.db
```

**Megjegyzés:** Az MSSQL konfigurációs változókat (DB_SERVER, DB_USER, stb.) nyugodtan bent hagyhatod, SQLite használatakor nem lesznek figyelembe véve.

### 2. Migrációk futtatása

```bash
npx tsx scripts/migrate-all.ts
```

Ez létrehozza a `data/` mappát és az `ainova_local.db` fájlt az összes szükséges táblával.

### 3. Admin fiók létrehozása

```bash
npx tsx scripts/bootstrap-admin.ts
```

### 4. Alkalmazás indítása

```bash
npm run dev
```

Megnyílik: `http://localhost:3000`

## SQL Szintaxis Konverzió

A SqliteAdapter automatikusan konvertálja az MSSQL-specifikus SQL szintaxist SQLite-ra:

| MSSQL | SQLite |
|-------|--------|
| `SYSDATETIME()` | `datetime('now')` |
| `NVARCHAR(MAX)` | `TEXT` |
| `DATETIME2` | `TEXT` |
| `BIT` | `INTEGER` (0/1) |
| `IDENTITY(1,1)` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `OUTPUT INSERTED.id` | `RETURNING id` |
| `TOP N` | `LIMIT N` |
| `OFFSET x ROWS FETCH NEXT y ROWS ONLY` | `LIMIT y OFFSET x` |
| `MERGE ... WHEN MATCHED` | `INSERT OR REPLACE` |

## Korlátok és Különbségek

### Ami működik:
- ✅ Összes core funkció (auth, RBAC, modulok, licenc, i18n)
- ✅ Session management
- ✅ Import pipeline
- ✅ Modul rendszer
- ✅ Admin panel

### Fontos különbségek:
- ⚠️ **Konkurens írás:** SQLite WAL módban van, de nagy konkurenciánál MSSQL jobb
- ⚠️ **Dátum kezelés:** SQLite-ban TEXT formátumban tárolódnak (ISO 8601)
- ⚠️ **Boolean:** INTEGER-ként tárolva (0 = false, 1 = true)
- ⚠️ **Nested transactions:** SQLite nem támogatja (adapter inline futtatja)

### Mikor használd MSSQL-t helyette:
- 🏢 Production környezet nagy forgalommal (100+ egyidejű felhasználó)
- 🏢 Több telephelyes cég központi szerverrel
- 🏢 Adatbázis replikáció szükséges
- 🏢 Enterprise szintű backup és monitoring

## Visszaváltás MSSQL-re

Ha vissza akarsz váltani MSSQL-re:

1. `.env.local` módosítása:
   ```env
   DB_ADAPTER=mssql
   DB_SERVER=localhost
   DB_DATABASE=AinovaCore
   DB_USER=sa
   DB_PASSWORD=YourPassword
   ```

2. Migrációk futtatása MSSQL-en:
   ```bash
   npx tsx scripts/migrate-all.ts
   ```

3. Restart alkalmazás:
   ```bash
   npm run dev
   ```

## Adatok Migrálása SQLite → MSSQL

Jelenleg nincs automatikus migráció, de manuálisan átvihetők:

1. Exportáld az SQLite adatokat SQL INSERT-ekké
2. Konvertáld az SQL szintaxist MSSQL-re (fordított irányban)
3. Importáld MSSQL-be

**Javaslat:** Kezdettől fogva dönts el melyik DB-t használod production-ben, és azt használd fejlesztéshez is.

## Hibaelhárítás

### "better-sqlite3" nincs telepítve

```bash
npm install better-sqlite3 @types/better-sqlite3
```

### "DB connection failed" vagy "isConnected() false"

Ellenőrizd hogy:
- A `DB_ADAPTER=sqlite` be van állítva a `.env.local`-ban
- A `data/` mappa írható (ha nincs, a script létrehozza)
- Nincs másik process ami zárolja a `.db` fájlt

### Migráció SQL szintaxis hiba

Néhány MSSQL-specifikus SQL nem konvertálható automatikusan. Ezek a migrációk kihagyásra kerülnek warning-gal. Ha kritikus tábla hiányzik, manuálisan készíts SQLite-kompatibilis migrációt.

### Teljesítmény probléma

SQLite alapértelmezetten WAL módban van a jobb konkurenciáért. Ha mégis lassú:

```sql
PRAGMA journal_mode = DELETE;  -- Visszaváltás hagyományos módra
PRAGMA synchronous = NORMAL;    -- Gyorsabb írás (kicsit kevésbé biztonságos)
```

Ezek az SqliteAdapter-ben módosíthatók.

## Összefoglalás

SQLite tökéletes választás:
- 👨‍💻 Fejlesztéshez
- 🧪 Teszteléshez
- 📦 Demo környezethez
- 🏢 Kis cégek számára (< 20 felhasználó)

Production környezetben (> 50 felhasználó, 24/7 uptime) MSSQL vagy PostgreSQL ajánlott.
