-- ============================================================
-- LAC Migration 005: v_napi_perces view
-- Active logic: Szállítás/Anyaglehívás based, 05:45 shift,
-- C-termék filter, rendeles R/L/9 filter, Z09/321 dedup
-- ============================================================
-- Source: 054_v_napi_perces_z09_321_dedup_lac_fix.sql
--
-- Key logic:
-- 1. 261 KIZÁRÁSA A LEADOTTBÓL: MNE=261 explicit kizárva a leadottból.
--    261 sorok muvelet_szoveg='Anyaglehívás'-nál megmaradnak a lehívottban.
-- 2. Z09 és 321 SZÁLLÍTÁS DEDUP (RankedZ09321):
--    Rendelesenként max 1 sor (legkésőbbi valos_datum, id DESC).
-- 3. LAC MEGJEGYZÉS FILTER ELTÁVOLÍTVA (246-os soroknál):
--    gyartasutemezo=246 = mindig LAC.
-- 4. 242+LAC LEADOTT EUR: gyartasutemezo=242 ÉS norma_friss.lac_megjegyzes='LAC'
--    → EUR beleszámít a LAC leadott EUR-ba (perc NEM).
-- 5. 242+LAC LEHÍVOTT EUR: hasonlóan az anyaglehívott EUR-hoz.
-- ============================================================

-- Drop and recreate view (idempotent)
IF EXISTS (SELECT 1 FROM sys.views WHERE name = 'v_napi_perces')
    DROP VIEW v_napi_perces;
GO

CREATE VIEW v_napi_perces AS
WITH
-- Tekercs anyagok azonosítása (változatlan)
ValidTekercsAnyagok AS (
    SELECT DISTINCT anyag
    FROM sap_visszajelentes
    WHERE muvelet_szoveg LIKE N'Tekercs%'
       OR muvelet_szoveg LIKE N'Gépi tekercselés%'
),

-- 101/102 netting: érvényes mozgásnem=101 sorok azonosítása rendelésszámonként
ValidLeadott101 AS (
    SELECT
        rendeles,
        COUNT(CASE WHEN mozgasnem = '101' THEN 1 END) -
        COUNT(CASE WHEN mozgasnem = '102' THEN 1 END) AS net_db
    FROM sap_visszajelentes
    WHERE is_lac = 1
      AND muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND mozgasnem IN ('101', '102')
      AND gyartasutemezo = 246
      AND gyar = '1310'
      AND rendeles NOT LIKE '%[RL]'
      AND rendeles NOT LIKE '%[RL][0-9]'
    GROUP BY rendeles
    HAVING
        COUNT(CASE WHEN mozgasnem = '101' THEN 1 END) >
        COUNT(CASE WHEN mozgasnem = '102' THEN 1 END)
),

-- Rangsorolt 101-es sorok (legkésőbbi = rn 1), net_db-vel együtt
Ranked101 AS (
    SELECT
        v.id,
        ROW_NUMBER() OVER (
            PARTITION BY v.rendeles
            ORDER BY v.valos_datum DESC, v.id DESC
        ) AS rn,
        vr.net_db
    FROM sap_visszajelentes v
    JOIN ValidLeadott101 vr ON v.rendeles = vr.rendeles
    WHERE v.mozgasnem = '101'
      AND v.is_lac = 1
      AND v.muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND v.gyartasutemezo = 246
      AND v.gyar = '1310'
      AND v.sztorno = '0'
),

-- Z09 és 321 Szállítás sorok dedup (rendelesenként max 1, legkésőbbi)
-- Ezek TELJESEN KÜLÖNBÖZŐ rendeléseken vannak mint a 101-esek (0 átfedés igazolt).
-- Nincs 102-es párjuk → egyszerű ROW_NUMBER dedup.
RankedZ09321 AS (
    SELECT
        v.id,
        ROW_NUMBER() OVER (
            PARTITION BY v.rendeles, v.mozgasnem
            ORDER BY v.valos_datum DESC, v.id DESC
        ) AS rn
    FROM sap_visszajelentes v
    WHERE v.mozgasnem IN ('Z09', '321')
      AND v.is_lac = 1
      AND v.muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND v.gyartasutemezo = 246
      AND v.gyar = '1310'
      AND v.sztorno = '0'
      AND v.rendeles NOT LIKE '%[RL]'
      AND v.rendeles NOT LIKE '%[RL][0-9]'
),

-- Napi leadott percek
-- 261 kizárva, Z09/321 dedup-pal, lac_megjegyzes filter TÖRÖLVE
LeadottNapi AS (
    SELECT
        v.valos_datum AS datum,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0)), 2) AS leadott_ossz,
        COUNT(*) AS visszajelentes_db,
        ROUND(SUM(CASE WHEN v.anyag LIKE '%278' OR v.anyag LIKE '%278 V1'
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_siemens,
        ROUND(SUM(CASE WHEN NOT (v.anyag LIKE '%278' OR v.anyag LIKE '%278 V1')
                            AND NOT (v.anyag LIKE 'C%')
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_no_siemens,
        ROUND(SUM(CASE WHEN v.anyag LIKE 'C%' AND SUBSTRING(v.anyag, 7, 1) = 'A'
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_el_tekercses,
        ROUND(SUM(CASE WHEN v.rendeles LIKE 'N%'
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_utomunka,
        ROUND(SUM(CASE WHEN v.muszak = 'A' THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_de,
        ROUND(SUM(CASE WHEN v.muszak = 'B' THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_du,
        ROUND(SUM(CASE WHEN v.muszak = 'C' THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS perc_ej
    FROM sap_visszajelentes v
    LEFT JOIN norma_friss nf ON LTRIM(RTRIM(v.anyag)) = nf.termek_nev
    LEFT JOIN Ranked101 r ON r.id = v.id
    LEFT JOIN RankedZ09321 rz ON rz.id = v.id
    WHERE v.gyartasutemezo = 246
      AND v.gyar = '1310'
      AND v.muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND v.sztorno = '0'
      -- 102 (storno) és 261 (anyaglehívás) kizárva
      AND v.mozgasnem NOT IN ('102', '261')
      -- 101: netting logika (ValidLeadott101/Ranked101)
      -- Z09/321: dedup (RankedZ09321, rn=1)
      -- Egyéb (pl. Z61 1 sor): átenged, ha nincs 102/261
      AND (
            (v.mozgasnem = '101' AND r.id IS NOT NULL AND r.rn <= r.net_db)
         OR (v.mozgasnem IN ('Z09', '321') AND rz.id IS NOT NULL AND rz.rn = 1)
         OR (v.mozgasnem NOT IN ('101', 'Z09', '321'))  -- pl. Z61
      )
      -- Rendeles végén R vagy L kizárása
      AND v.rendeles NOT LIKE '%[RL]'
      AND v.rendeles NOT LIKE '%[RL][0-9]'
      -- C termékek szűrés (tekercsesek kivéve)
      AND (v.anyag NOT LIKE 'C%' OR EXISTS (
              SELECT 1 FROM ValidTekercsAnyagok vt WHERE vt.anyag = v.anyag
          ))
      -- lac_megjegyzes filter ELTÁVOLÍTVA (246 = mindig LAC, nem kell nézni)
    GROUP BY v.valos_datum
),

-- Napi leadott EUR (246-os sorok) — lac_megjegyzes filter eltávolítva
LeadottEurNapi AS (
    SELECT
        v.valos_datum AS datum,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) * ISNULL(nf.eur_per_perc, 0)), 2) AS leadott_euro
    FROM sap_visszajelentes v
    LEFT JOIN norma_friss nf ON LTRIM(RTRIM(v.anyag)) = nf.termek_nev
    LEFT JOIN Ranked101 r ON r.id = v.id
    LEFT JOIN RankedZ09321 rz ON rz.id = v.id
    WHERE v.gyartasutemezo = 246
      AND v.gyar = '1310'
      AND v.muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND v.sztorno = '0'
      AND v.mozgasnem NOT IN ('102', '261')
      AND (
            (v.mozgasnem = '101' AND r.id IS NOT NULL AND r.rn <= r.net_db)
         OR (v.mozgasnem IN ('Z09', '321') AND rz.id IS NOT NULL AND rz.rn = 1)
         OR (v.mozgasnem NOT IN ('101', 'Z09', '321'))
      )
      AND v.rendeles NOT LIKE '%[RL]'
      AND v.rendeles NOT LIKE '%[RL][0-9]'
      AND (v.anyag NOT LIKE 'C%' OR EXISTS (
              SELECT 1 FROM ValidTekercsAnyagok vt WHERE vt.anyag = v.anyag
          ))
    GROUP BY v.valos_datum
),

-- 242+LAC leadott EUR (perc NEM, csak EUR)
-- Ha gyartasutemezo=242 ÉS norma_friss.lac_megjegyzes='LAC' → leadott EUR LAC-hoz
LeadottEur242LacNapi AS (
    SELECT
        v.valos_datum AS datum,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) * ISNULL(nf.eur_per_perc, 0)), 2) AS leadott_euro_242
    FROM sap_visszajelentes v
    INNER JOIN norma_friss nf ON LTRIM(RTRIM(v.anyag)) = nf.termek_nev
    WHERE v.gyartasutemezo = 242
      AND v.gyar = '1310'
      AND v.muvelet_szoveg LIKE '%Sz_ll_t_s%'
      AND v.sztorno = '0'
      AND v.mozgasnem NOT IN ('102', '261')
      AND nf.lac_megjegyzes = 'LAC'
    GROUP BY v.valos_datum
),

-- Napi lehívott percek — lac_megjegyzes filter ELTÁVOLÍTVA (246 = mindig LAC)
-- Összes MNE beleszámít Anyaglehívásnál: 261, 101, Z09, 321 (0 átfedés igazolt)
LehivottNapi AS (
    SELECT
        v.valos_datum AS datum,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0)), 2) AS lehivott_ossz,
        ROUND(SUM(CASE WHEN v.anyag LIKE '%278' OR v.anyag LIKE '%278 V1'
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS lehivott_siemens,
        ROUND(SUM(CASE WHEN NOT (v.anyag LIKE '%278' OR v.anyag LIKE '%278 V1')
                            AND NOT (v.anyag LIKE 'C%')
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS lehivott_no_siemens,
        ROUND(SUM(CASE WHEN v.anyag LIKE 'C%' AND SUBSTRING(v.anyag, 7, 1) = 'A'
                       THEN v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) ELSE 0 END), 2) AS lehivott_el_tekercses,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) * ISNULL(nf.eur_per_perc, 0)), 2) AS lehivott_euro
    FROM sap_visszajelentes v
    LEFT JOIN norma_friss nf ON LTRIM(RTRIM(v.anyag)) = nf.termek_nev
    WHERE v.gyartasutemezo = 246
      AND v.gyar = '1310'
      AND v.muvelet_szoveg = N'Anyaglehívás'
      AND v.sztorno = '0'
      AND (v.anyag NOT LIKE 'C%' OR EXISTS (
              SELECT 1 FROM ValidTekercsAnyagok vt WHERE vt.anyag = v.anyag
          ))
      -- lac_megjegyzes filter ELTÁVOLÍTVA (246 = mindig LAC)
    GROUP BY v.valos_datum
),

-- 242+LAC lehívott EUR (perc NEM, csak EUR)
LehivottEur242LacNapi AS (
    SELECT
        v.valos_datum AS datum,
        ROUND(SUM(v.hibatlan_menny * ISNULL(nf.norma_ido_db, 0) * ISNULL(nf.eur_per_perc, 0)), 2) AS lehivott_euro_242
    FROM sap_visszajelentes v
    INNER JOIN norma_friss nf ON LTRIM(RTRIM(v.anyag)) = nf.termek_nev
    WHERE v.gyartasutemezo = 242
      AND v.gyar = '1310'
      AND v.muvelet_szoveg = N'Anyaglehívás'
      AND v.sztorno = '0'
      AND nf.lac_megjegyzes = 'LAC'
    GROUP BY v.valos_datum
)

SELECT
    op.datum,
    ISNULL(op.visszajelentes_db, 0)               AS visszajelentes_db,
    ROUND(ISNULL(op.leadott_ossz,        0), 2)   AS leadott_ossz,
    ROUND(ISNULL(op.perc_siemens,        0), 2)   AS leadott_siemens,
    ROUND(ISNULL(op.perc_no_siemens,     0), 2)   AS leadott_no_siemens,
    ROUND(ISNULL(op.perc_el_tekercses,   0), 2)   AS leadott_el_tekercses,
    ROUND(ISNULL(op.perc_utomunka,       0), 2)   AS leadott_utomunka,
    -- Leadott EUR = 246-os + 242+LAC
    ROUND(ISNULL(eur.leadott_euro, 0) + ISNULL(eur242.leadott_euro_242, 0), 2) AS leadott_euro,
    ROUND(ISNULL(op.perc_de,             0), 2)   AS leadott_de,
    ROUND(ISNULL(op.perc_du,             0), 2)   AS leadott_du,
    ROUND(ISNULL(op.perc_ej,             0), 2)   AS leadott_ej,
    ROUND(ISNULL(lh.lehivott_ossz,       0), 2)   AS lehivott_ossz,
    ROUND(ISNULL(lh.lehivott_siemens,    0), 2)   AS lehivott_siemens,
    ROUND(ISNULL(lh.lehivott_no_siemens, 0), 2)   AS lehivott_no_siemens,
    ROUND(ISNULL(lh.lehivott_el_tekercses,0), 2)  AS lehivott_el_tekercses,
    -- Lehívott EUR = 246-os + 242+LAC
    ROUND(ISNULL(lh.lehivott_euro, 0) + ISNULL(leh242.lehivott_euro_242, 0), 2) AS lehivott_euro,
    COALESCE(td.perc_cel, tw.perc_cel, 28000)      AS cel_perc,
    ss.MorningShift   AS de_csapat,
    ss.AfternoonShift AS du_csapat,
    ss.NightShift     AS ej_csapat
FROM LeadottNapi op
LEFT JOIN LeadottEurNapi          eur    ON op.datum = eur.datum
LEFT JOIN LeadottEur242LacNapi    eur242 ON op.datum = eur242.datum
LEFT JOIN LehivottNapi            lh     ON op.datum = lh.datum
LEFT JOIN LehivottEur242LacNapi   leh242 ON op.datum = leh242.datum
LEFT JOIN ainova_targets_daily td ON td.datum = op.datum
LEFT JOIN ainova_targets_weekly tw
    ON tw.ev  = DATEPART(YEAR,     DATEADD(DAY, 3 - (DATEPART(dw, op.datum) + @@DATEFIRST - 2) % 7, op.datum))
   AND tw.het = DATEPART(ISO_WEEK, op.datum)
LEFT JOIN AinovaShiftSchedule ss
    ON ss.Year       = DATEPART(YEAR,     DATEADD(DAY, 3 - (DATEPART(dw, op.datum) + @@DATEFIRST - 2) % 7, op.datum))
   AND ss.WeekNumber = DATEPART(ISO_WEEK, op.datum);
GO
