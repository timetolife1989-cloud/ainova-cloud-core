-- =====================================================================
-- 003_lac_sap_munkaterv.sql
-- LAC modul: sap_munkaterv tábla (SAP routing / munkaterv import)
-- Forrás: routing.XLSX (SQVI MAPL + PLPO + CRHD export)
-- TRUNCATE+INSERT minden importnál (nem inkrementális)
-- Idempotent: IF NOT EXISTS guard-dal védve
-- =====================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sap_munkaterv')
    CREATE TABLE sap_munkaterv (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        anyag           NVARCHAR(40)  NOT NULL,      -- MAPL-MATNR (pl. B86301K 25L188)
        muveletszam     NVARCHAR(10)  NOT NULL,       -- PLPO-VORNR (0010, 0020...)
        muvelet_szoveg  NVARCHAR(100),                -- PLPO-LTXA1 (pl. Tekercselés)
        munkahely       NVARCHAR(20),                 -- CRHD-ARBPL (pl. 64L35)
        gepido_perc     DECIMAL(10,2) DEFAULT 0,      -- PLPO-VGW01 (percre konvertálva)
        szemelyi_perc   DECIMAL(10,2) DEFAULT 0,      -- PLPO-VGW02 (percre konvertálva)
        norma_ido_perc  DECIMAL(10,2) DEFAULT 0,      -- gepido + szemelyi (1 db-ra!)
        alap_mennyiseg  INT           DEFAULT 1,      -- PLPO-BMSCH
        gyar            NVARCHAR(10)  DEFAULT '1310', -- MAPL-WERKS
        import_id       INT,
        imported_at     DATETIME2     DEFAULT GETDATE()
    );
GO

-- Indexek
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sap_munkaterv_anyag' AND object_id = OBJECT_ID('sap_munkaterv'))
    CREATE INDEX IX_sap_munkaterv_anyag ON sap_munkaterv(anyag);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sap_munkaterv_anyag_muv' AND object_id = OBJECT_ID('sap_munkaterv'))
    CREATE INDEX IX_sap_munkaterv_anyag_muv ON sap_munkaterv(anyag, muveletszam);
GO

PRINT '';
PRINT '✅ 003_lac_sap_munkaterv.sql kész';
PRINT '';
