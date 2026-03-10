-- =====================================================================
-- 001_lac_sap_visszajelentes.sql
-- LAC modul: ainova_import_log + sap_visszajelentes táblák
-- Idempotent: minden objektum IF NOT EXISTS guard-dal védve
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. IMPORT NAPLÓ (először, mert a többi tábla hivatkozza)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ainova_import_log')
BEGIN
    CREATE TABLE ainova_import_log (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        import_type     NVARCHAR(30)  NOT NULL,         -- 'visszajelentes', 'norma_friss', 'routing'
        filename        NVARCHAR(255),
        rows_total      INT           DEFAULT 0,
        rows_inserted   INT           DEFAULT 0,
        rows_updated    INT           DEFAULT 0,
        rows_skipped    INT           DEFAULT 0,
        duration_ms     INT,
        imported_by     NVARCHAR(100),
        imported_at     DATETIME2     DEFAULT GETDATE(),
        status          NVARCHAR(20)  DEFAULT 'success', -- 'success', 'partial', 'error'
        error_message   NVARCHAR(MAX) NULL
    );
    PRINT 'Created table: ainova_import_log';
END
ELSE PRINT 'Table already exists: ainova_import_log';
GO

-- ═══════════════════════════════════════════════════════════════
-- 2. SAP VISSZAJELENTÉS (SQVI visszajelentés riport import)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sap_visszajelentes')
BEGIN
    CREATE TABLE sap_visszajelentes (
        id                  INT IDENTITY(1,1) PRIMARY KEY,

        -- SAP azonosítók
        rendeles            NVARCHAR(20)  NOT NULL,     -- Gyártási rendelés (AFKO.AUFNR)
        anyag               NVARCHAR(40),               -- Anyagszám/típus (AFKO.MATNR)
        gyartasutemezo      INT,                        -- 242/246/247 (Gy.üt)
        muveletszam         NVARCHAR(10),               -- Művelet kód (AFVC.VORNR: 0030, 0040...)
        muvelet_szoveg      NVARCHAR(100),              -- Művelet szöveg (AFVC.LTXA1)
        gyar                NVARCHAR(10),               -- Gyár kód (1310)

        -- Visszajelentés adatok
        visszajel_perc      DECIMAL(10,2),              -- Visszajelentett teljesítmény (perc)
        hibatlan_menny      INT,                        -- Hibátlan mennyiség (db)
        sztorno             NVARCHAR(20),               -- Stornó visszajelentés szám

        -- Operátor
        torzsszam           NVARCHAR(20),               -- Személyügyi törzsszám (SZTSZ)

        -- Idő
        vegrehajtas_datum   DATE          NOT NULL,     -- Végrehajtás visszajelentett bef. dátum
        vegrehajtas_ido     TIME,                       -- Végrehajtás vége időpont

        -- Munkahely
        munkahely           NVARCHAR(20),               -- Munkahely kód (64H31, 64L83...)
        munkahely_nev       NVARCHAR(100),              -- Rövid megnevezés (Szerelés, Lézervágás...)

        -- Számított mezők (import során kalkulálva)
        muszak              CHAR(1),                    -- A/B/C (az időből számolva)
        valos_datum         DATE,                       -- Éjszakai műszak korrekció utáni dátum
        is_lac              BIT           DEFAULT 0,    -- LAC-releváns-e
        netto_perc          DECIMAL(10,2),              -- ±perc stornóval

        -- Migration 047: mozgásnem mező
        mozgasnem           NVARCHAR(10),               -- SAP mozgásnem kód

        -- Meta
        import_id           INT REFERENCES ainova_import_log(id),
        imported_at         DATETIME2     DEFAULT GETDATE()
    );
    PRINT 'Created table: sap_visszajelentes';
END
ELSE PRINT 'Table already exists: sap_visszajelentes';
GO

-- ═══════════════════════════════════════════════════════════════
-- 3. INDEXEK (IF NOT EXISTS guard-dal)
-- ═══════════════════════════════════════════════════════════════

-- Egyediség: 1 visszajelentés = 1 sor
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_visszajelentes' AND object_id = OBJECT_ID('sap_visszajelentes'))
    CREATE UNIQUE INDEX UQ_visszajelentes
        ON sap_visszajelentes(rendeles, muvelet_szoveg, torzsszam, vegrehajtas_datum, vegrehajtas_ido)
        WHERE torzsszam IS NOT NULL AND muvelet_szoveg IS NOT NULL AND vegrehajtas_ido IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visszajel_datum' AND object_id = OBJECT_ID('sap_visszajelentes'))
    CREATE INDEX IX_visszajel_datum ON sap_visszajelentes(valos_datum);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visszajel_lac' AND object_id = OBJECT_ID('sap_visszajelentes'))
    CREATE INDEX IX_visszajel_lac ON sap_visszajelentes(is_lac, valos_datum);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visszajel_anyag' AND object_id = OBJECT_ID('sap_visszajelentes'))
    CREATE INDEX IX_visszajel_anyag ON sap_visszajelentes(anyag);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_visszajel_rendeles' AND object_id = OBJECT_ID('sap_visszajelentes'))
    CREATE INDEX IX_visszajel_rendeles ON sap_visszajelentes(rendeles);
GO

PRINT '';
PRINT '✅ 001_lac_sap_visszajelentes.sql kész';
PRINT '';
