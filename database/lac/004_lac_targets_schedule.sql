-- =====================================================================
-- 004_lac_targets_schedule.sql
-- LAC modul: célértékek és műszakbeosztás táblák
-- Idempotent: minden objektum IF NOT EXISTS guard-dal védve
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. NAPI CÉL (perc célérték napra lebontva)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ainova_targets_daily')
    CREATE TABLE ainova_targets_daily (
        id       INT IDENTITY(1,1) PRIMARY KEY,
        datum    DATE NOT NULL UNIQUE,
        perc_cel INT  NOT NULL
    );
GO

-- ═══════════════════════════════════════════════════════════════
-- 2. HETI CÉL (perc célérték hétre lebontva)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ainova_targets_weekly')
    CREATE TABLE ainova_targets_weekly (
        id       INT IDENTITY(1,1) PRIMARY KEY,
        ev       INT NOT NULL,
        het      INT NOT NULL,
        perc_cel INT NOT NULL,
        CONSTRAINT UQ_targets_weekly UNIQUE (ev, het)
    );
GO

-- ═══════════════════════════════════════════════════════════════
-- 3. MŰSZAKBEOSZTÁS (heti műszak terv)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AinovaShiftSchedule')
    CREATE TABLE AinovaShiftSchedule (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        [Year]         INT          NOT NULL,
        WeekNumber     INT          NOT NULL,
        MorningShift   NVARCHAR(10),
        AfternoonShift NVARCHAR(10),
        NightShift     NVARCHAR(10),
        CONSTRAINT UQ_shift_schedule UNIQUE ([Year], WeekNumber)
    );
GO

-- ═══════════════════════════════════════════════════════════════
-- 4. WAR ROOM LÉTSZÁM (napi elméleti létszám)
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WarRoomLetszam')
    CREATE TABLE WarRoomLetszam (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        Datum             DATE NOT NULL UNIQUE,
        ElmeletiLetszam   INT
    );
GO

PRINT '';
PRINT '✅ 004_lac_targets_schedule.sql kész';
PRINT '';
