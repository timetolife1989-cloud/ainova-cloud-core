# F0 — LAC-SPECIFIKUS KÓD SZEPARÁLÁS

> **Cél:** A core-ból kivenni mindent ami LAC (egyedi ügyfél) specifikus, áttenni egy modul mappába. A core ezután "tiszta" dobozos alap lesz.
> **Időbecslés:** 1 hét
> **Előfeltétel:** Nincs

---

## F0.1 — Modul mappa létrehozása

**Mit csinálj:**
Hozd létre a következő ÜRES mappastruktúrát:

```
modules/
  lac-napi-perces/
    migrations/
    api/
      data/
      export/
      import/
        upload/
        process/
        progress/
      verify/
    components/
    types/
    admin/
      sap-import/
```

Hozz létre egy üres `modules/lac-napi-perces/manifest.ts` fájlt is (tartalmat F0.7-ben kapja).

---

## F0.2 — LAC migrációk másolása

**Mit csinálj:**
Másold (NE töröld az eredetit még!) a következő fájlokat:

| Forrás | Cél |
|---|---|
| `database/lac/001_lac_sap_visszajelentes.sql` | `modules/lac-napi-perces/migrations/001_sap_visszajelentes.sql` |
| `database/lac/002_lac_norma_friss.sql` | `modules/lac-napi-perces/migrations/002_norma_friss.sql` |
| `database/lac/003_lac_sap_munkaterv.sql` | `modules/lac-napi-perces/migrations/003_sap_munkaterv.sql` |
| `database/lac/004_lac_targets_schedule.sql` | `modules/lac-napi-perces/migrations/004_targets_schedule.sql` |
| `database/lac/005_lac_v_napi_perces.sql` | `modules/lac-napi-perces/migrations/005_v_napi_perces.sql` |

**Ellenőrzés:** `modules/lac-napi-perces/migrations/` mappában 5 SQL fájl van.

---

## F0.3 — LAC komponensek másolása

**Mit csinálj:**
Másold az alábbi fájlokat:

| Forrás | Cél |
|---|---|
| `components/napi-perces/ChartTooltip.tsx` | `modules/lac-napi-perces/components/ChartTooltip.tsx` |
| `components/napi-perces/KimutatSelector.tsx` | `modules/lac-napi-perces/components/KimutatSelector.tsx` |
| `components/napi-perces/MuszakLeadasChart.tsx` | `modules/lac-napi-perces/components/MuszakLeadasChart.tsx` |
| `components/napi-perces/NapiEuroChart.tsx` | `modules/lac-napi-perces/components/NapiEuroChart.tsx` |
| `components/napi-perces/NapiLehivottChart.tsx` | `modules/lac-napi-perces/components/NapiLehivottChart.tsx` |
| `components/napi-perces/NapiPercesChart.tsx` | `modules/lac-napi-perces/components/NapiPercesChart.tsx` |
| `components/napi-perces/NapiPercesTable.tsx` | `modules/lac-napi-perces/components/NapiPercesTable.tsx` |
| `components/napi-perces/index.ts` | `modules/lac-napi-perces/components/index.ts` |
| `components/napi-perces/types.ts` | `modules/lac-napi-perces/types/index.ts` |

**Fontos:** A másolt `components/index.ts` fájlban a `types.ts` import útvonalat javítsd: `'./types'` → `'../types/index'`.

---

## F0.4 — LAC API route-ok másolása

| Forrás | Cél |
|---|---|
| `app/api/napi-perces/route.ts` | `modules/lac-napi-perces/api/data/route.ts` |
| `app/api/napi-perces/export/` (teljes mappa) | `modules/lac-napi-perces/api/export/` |
| `app/api/munkaterv/upload/` (teljes mappa) | `modules/lac-napi-perces/api/import/upload/` |
| `app/api/munkaterv/process/` (teljes mappa) | `modules/lac-napi-perces/api/import/process/` |
| `app/api/munkaterv/progress/` (teljes mappa) | `modules/lac-napi-perces/api/import/progress/` |
| `app/api/sap-import/verify/` (teljes mappa) | `modules/lac-napi-perces/api/verify/` |

**Fontos:** Az importok ezekben a fájlokban `@/lib/...` formátummal maradnak (azok core függőségek, nem változnak).

---

## F0.5 — LAC admin komponensek másolása

| Forrás | Cél |
|---|---|
| `components/admin/SapImportDropzone.tsx` | `modules/lac-napi-perces/admin/SapImportDropzone.tsx` |
| `components/admin/SapStatusWidget.tsx` | `modules/lac-napi-perces/admin/SapStatusWidget.tsx` |
| `app/dashboard/admin/sap-import/` (teljes mappa) | `modules/lac-napi-perces/admin/sap-import/` |

---

## F0.6 — LAC dashboard oldal másolása

| Forrás | Cél |
|---|---|
| `app/dashboard/napi-perces/page.tsx` | `modules/lac-napi-perces/components/DashboardPage.tsx` |
| `app/dashboard/napi-perces/loading.tsx` | `modules/lac-napi-perces/components/DashboardLoading.tsx` |

A `DashboardPage.tsx`-ben javítsd az importokat:
- `'@/components/napi-perces'` → `'./index'` (vagy `'@/modules/lac-napi-perces/components'`)
- `'@/components/napi-perces/NapiLehivottChart'` → `'./NapiLehivottChart'`
- `'@/components/napi-perces/NapiEuroChart'` → `'./NapiEuroChart'`

---

## F0.7 — LAC manifest.ts megírása

**Fájl:** `modules/lac-napi-perces/manifest.ts`

Teljes tartalom:

```typescript
import { registerModule } from '@/lib/modules/registry';

export const manifest = {
  id: 'lac-napi-perces',
  name: 'Napi Perces',
  description: 'LAC gyártási teljesítmény — napi/heti/havi kimutatás',
  icon: 'BarChart2',
  href: '/dashboard/napi-perces',
  color: 'bg-blue-500',
  version: '1.0.0',
  tier: 'professional',
  dependsOn: [],
  permissions: [
    'lac-napi-perces.view',
    'lac-napi-perces.export',
    'lac-napi-perces.import',
  ],
  adminSettings: [],
  migrations: [
    '001_sap_visszajelentes.sql',
    '002_norma_friss.sql',
    '003_sap_munkaterv.sql',
    '004_targets_schedule.sql',
    '005_v_napi_perces.sql',
  ],
};

registerModule(manifest);
```

---

## F0.8 — Core megtisztítás: LAC modul regisztráció törlése

**Fájl:** `lib/modules/registry.ts`

**Töröld** az utolsó ~10 sort (144-157. sor), ami ez:

```typescript
// =====================================================
// LAC modul regisztráció
// =====================================================

registerModule({
  id: 'lac-napi-perces',
  name: 'Napi Perces',
  description: 'LAC gyártási teljesítmény — napi/heti/havi kimutatás',
  icon: 'BarChart2',
  href: '/dashboard/napi-perces',
  color: 'bg-blue-500',
  dependsOn: [],
});
```

**Helyette** a fájl elejére (az importok után) adj hozzá:

```typescript
// Betölti az összes modul manifest-jét
import '@/modules/lac-napi-perces/manifest';
```

**Indok:** A modul regisztráció a manifest.ts felelőssége, nem a core registry-é.

---

## F0.9 — Core megtisztítás: SAP Import admin menüpont törlése

**Fájl:** `app/dashboard/admin/page.tsx`

**Töröld** az `ADMIN_MENU` tömbből ezt az elemet (36-41. sor):

```typescript
{
  title: 'SAP Import',
  description: 'Excel fájlok importálása: visszajelentés, normaidők, munkaterv',
  icon: 'Upload',
  href: '/dashboard/admin/sap-import',
},
```

**Indok:** Ez modul-specifikus admin oldal, nem core funkcionalitás.

---

## F0.10 — Proxy route-ok: régi URL-ek backward compatibility

Az eredeti URL-ek (`/api/napi-perces`, `/dashboard/napi-perces`, stb.) még működjenek. Cseréld a régi fájlok tartalmát egyszerű proxy-kra:

**`app/api/napi-perces/route.ts`** — teljes tartalom erre cserélendő:
```typescript
export { GET } from '@/modules/lac-napi-perces/api/data/route';
```

**`app/api/napi-perces/export/route.ts`** — (ha van) proxy-zd hasonlóan.

**`app/dashboard/napi-perces/page.tsx`** — teljes tartalom:
```typescript
export { default } from '@/modules/lac-napi-perces/components/DashboardPage';
```

**`app/dashboard/napi-perces/loading.tsx`** — teljes tartalom:
```typescript
export { default } from '@/modules/lac-napi-perces/components/DashboardLoading';
```

Ismételd a munkaterv és sap-import route-okra is hasonlóan.

**Fontos — tsconfig.json ellenőrzés:**
A `@/modules/*` path alias-nak működnie kell. A meglévő `"@/*": ["./*"]` ezt lefedi, mert a `modules/` mappa a projekt gyökerében van. Ha mégsem, add hozzá explicit:
```json
"paths": {
  "@/*": ["./*"]
}
```

---

## F0.11 — Régi fájlok és mappák törlése

Miután a proxy-k működnek, **töröld**:

```
database/lac/                    ← teljes mappa
components/napi-perces/          ← teljes mappa
components/admin/SapImportDropzone.tsx
components/admin/SapStatusWidget.tsx
app/dashboard/admin/sap-import/  ← teljes mappa
```

**NE töröld** (proxy-k maradnak):
```
app/api/napi-perces/             ← proxy marad
app/api/munkaterv/               ← proxy marad
app/api/sap-import/              ← proxy marad
app/dashboard/napi-perces/       ← proxy marad
```

---

## F0.12 — Teszt

1. Futtasd: `npm run type-check` — **0 TypeScript hiba**
2. Futtasd: `npm run build` — **sikeres build**
3. Ha van futó dev szerver és DB: ellenőrizd a `/dashboard` oldalt betölt-e
4. Ha a `lac-napi-perces` modul aktív: a `/dashboard/napi-perces` oldal is betölt

**Ha bármelyik hibát dob:** Olvasd el a hibát, az import útvonalak a leggyakoribb probléma.

---

## ✅ BEFEJEZVE

**Időpont:** 2026-03-08 15:38 (UTC+01:00)

**Eredmény:**
- ✅ Type-check: 0 hiba
- ✅ Build: sikeres
- ✅ Minden lépés végrehajtva

**Észrevételek és javítások:**
1. **Duplikált mappák:** A másolás során duplikált mappák keletkeztek (pl. `api/export/export/route.ts`). Ezeket manuálisan kellett átrendezni.
2. **Import útvonalak:** A komponensekben a `./types` helyett `../types/index` útvonalat kellett használni.
3. **Circular dependency:** A manifest import a `registry.ts` fájlban circular dependency-t okozott. Megoldás: `modules/_loader.ts` fájl létrehozása és importálása az `app/layout.tsx`-ben.
4. **Proxy route javítás:** A `sap-import/verify` route GET-et exportál, nem POST-ot.
5. **Admin komponensek:** A relatív import útvonalakat kellett javítani a modul mappán belül.

**Következő lépés:** F1 fázis - License & Tier system implementálása
