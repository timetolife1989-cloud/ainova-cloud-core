-- =====================================================================
-- 002_lac_norma_friss.sql
-- LAC modul: norma_friss tábla
-- Forrás: norma frissXX.XX.xlsx, Munka3 sheet, 4. sortól
-- TRUNCATE+INSERT minden importnál (nem inkrementális)
-- Idempotent: IF NOT EXISTS guard-dal védve
-- =====================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'norma_friss')
    CREATE TABLE norma_friss (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        termek_nev      NVARCHAR(100) NOT NULL,
        norma_ido_db    DECIMAL(10,4) NULL,         -- perc/db
        eur_per_perc    DECIMAL(10,6) NULL,          -- EUR/perc (NULL ha nincs / #N/A)
        lac_megjegyzes  NVARCHAR(20)  NULL,          -- NULL = normál; 'LAC' = filteres termék
        imported_at     DATETIME      DEFAULT GETDATE()
    );
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_norma_friss_termek' AND object_id = OBJECT_ID('norma_friss'))
    CREATE UNIQUE INDEX UQ_norma_friss_termek ON norma_friss(termek_nev);
GO

PRINT '';
PRINT '✅ 002_lac_norma_friss.sql kész';
PRINT '';
