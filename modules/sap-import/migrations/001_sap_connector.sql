-- =========================================================
-- SAP Connector előkészítés — Ainova Cloud Intelligence
-- =========================================================
-- Táblák: kapcsolat-konfig, SAP objektum katalógus,
-- mezőmapping szabályok, szinkronizálás napló, adat-cache
-- =========================================================

-- Kapcsolat konfigurációk (egy ügyfélnél több SAP rendszer is lehet)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_sap_connections')
BEGIN
  CREATE TABLE mod_sap_connections (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,             -- "SAP ECC Production"
    description     NVARCHAR(500) NULL,
    connection_type NVARCHAR(20) NOT NULL DEFAULT 'rfc', -- rfc | odata | file
    -- RFC kapcsolat paraméterek (SAP GUI logon paraméterei)
    host            NVARCHAR(200) NULL,
    sysnr           NVARCHAR(5) NULL DEFAULT '00',       -- System number pl. '00'
    client          NVARCHAR(5) NULL DEFAULT '100',      -- Mandant pl. '100','200','300'
    sap_user        NVARCHAR(100) NULL,
    -- Jelszó SOHA nincs plaintext-ben — csak AES-256 titkosítva Vault-ban
    password_ref    NVARCHAR(200) NULL,                  -- vault/env referencia: pl. 'SAP_PROD_PWD'
    language        NVARCHAR(5) NULL DEFAULT 'HU',       -- HU, DE, EN
    -- OData / REST API paraméterek (S/4HANA Cloud, SAP BTP)
    base_url        NVARCHAR(500) NULL,                  -- https://myXXXXXX.s4hana.ondemand.com
    api_path        NVARCHAR(200) NULL,                  -- /sap/opu/odata/sap/API_MATERIAL_SRV
    -- Kapcsolat státusz
    is_active       BIT NOT NULL DEFAULT 0,
    last_tested_at  DATETIME2 NULL,
    last_test_ok    BIT NOT NULL DEFAULT 0,
    last_error      NVARCHAR(MAX) NULL,
    created_by      INT NULL REFERENCES core_users(id),
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- SAP objektum / tábla katalógus (ACI tudástár — minden ügyfélnél azonos SAP struktúra)
-- Ez az a "SAP tudás" amit az ACI-ba beleégetünk — táblaneveket, BAPI-kat, mezőleírásokat
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_sap_objects')
BEGIN
  CREATE TABLE mod_sap_objects (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    category        NVARCHAR(50) NOT NULL,    -- MM | SD | PP | PM | HR | FI | CO | BASIS
    object_type     NVARCHAR(20) NOT NULL,    -- TABLE | VIEW | BAPI | FUNCTION | IDOC
    sap_name        NVARCHAR(100) NOT NULL,   -- pl. MARA, VBAK, BAPI_MATERIAL_GETLIST
    description_hu  NVARCHAR(500) NULL,
    description_en  NVARCHAR(500) NULL,
    description_de  NVARCHAR(500) NULL,
    key_fields      NVARCHAR(500) NULL,       -- vesszővel elválasztva: MATNR,WERKS
    typical_join    NVARCHAR(MAX) NULL,       -- JOIN példa (dokumentációs célú)
    aci_module      NVARCHAR(100) NULL,       -- melyik ACI modulhoz köthető: inventory,workforce stb.
    notes           NVARCHAR(MAX) NULL,
    is_builtin      BIT NOT NULL DEFAULT 1    -- 1=rendszer által betöltött, 0=ügyfél által hozzáadott
  );
END;

-- Mező-mapping szabályok: SAP mező → ACI tábla/mező
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_sap_field_mappings')
BEGIN
  CREATE TABLE mod_sap_field_mappings (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    connection_id   INT NOT NULL REFERENCES mod_sap_connections(id) ON DELETE CASCADE,
    mapping_name    NVARCHAR(200) NOT NULL,         -- pl. "Anyag → Készlet szinkron"
    sap_object      NVARCHAR(100) NOT NULL,         -- SAP tábla/BAPI neve: MARA
    sap_field       NVARCHAR(100) NOT NULL,         -- SAP mezőnév: MATNR
    aci_table       NVARCHAR(100) NOT NULL,         -- ACI céltábla: mod_inventory
    aci_field       NVARCHAR(100) NOT NULL,         -- ACI célmező: item_code
    transform_type  NVARCHAR(30) NOT NULL DEFAULT 'direct', -- direct|trim|upper|lower|number|date|lookup|formula
    transform_rule  NVARCHAR(500) NULL,             -- formula/lookup JSON
    default_value   NVARCHAR(200) NULL,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END;

-- Szinkronizálás napló
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_sap_sync_log')
BEGIN
  CREATE TABLE mod_sap_sync_log (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    connection_id   INT NOT NULL REFERENCES mod_sap_connections(id),
    sync_type       NVARCHAR(50) NOT NULL,     -- full | incremental | manual | scheduled
    sap_object      NVARCHAR(100) NULL,
    aci_table       NVARCHAR(100) NULL,
    status          NVARCHAR(20) NOT NULL DEFAULT 'running', -- running|success|partial|error
    records_read    INT NOT NULL DEFAULT 0,
    records_written INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    records_error   INT NOT NULL DEFAULT 0,
    error_details   NVARCHAR(MAX) NULL,
    started_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    finished_at     DATETIME2 NULL,
    triggered_by    NVARCHAR(100) NULL         -- 'cron' | 'admin:tibor' | 'api'
  );
END;

-- SAP adat cache (utolsó szinkronizált értékek — közvetlen lekérés nélkül)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mod_sap_data_cache')
BEGIN
  CREATE TABLE mod_sap_data_cache (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    connection_id   INT NOT NULL REFERENCES mod_sap_connections(id),
    sap_object      NVARCHAR(100) NOT NULL,
    record_key      NVARCHAR(500) NOT NULL,    -- pl. MATNR+WERKS kombinációja
    data_json       NVARCHAR(MAX) NOT NULL,    -- teljes sor JSON-ként
    synced_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    is_dirty        BIT NOT NULL DEFAULT 0     -- 1=helyi módosítás, push szükséges
  );

  CREATE INDEX IX_sap_cache_obj_key ON mod_sap_data_cache (connection_id, sap_object, record_key);
END;

-- =========================================================
-- ACI BEÉPÍTETT SAP TUDÁSTÁR — Katalógus feltöltése
-- (Minden telepítéskor automatikusan betöltődik)
-- =========================================================

-- MM modulhoz (Materials Management — Anyaggazdálkodás)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('MM','TABLE','MARA','Anyagtörzs - általános adatok','Material master - general data','MATNR','inventory'),
('MM','TABLE','MARC','Anyagtörzs - üzemi adatok','Material master - plant data','MATNR,WERKS','inventory'),
('MM','TABLE','MAKT','Anyagtörzs - leírások','Material descriptions','MATNR,SPRAS','inventory'),
('MM','TABLE','MARD','Tároló hely készlet','Storage location stocks','MATNR,WERKS,LGORT','inventory'),
('MM','TABLE','MCHB','Batch készlet','Batch stocks','MATNR,WERKS,LGORT,CHARG','inventory'),
('MM','TABLE','MKPF','Áruátvételi bizonylat fejléc','Goods movement document header','MBLNR,MJAHR','inventory'),
('MM','TABLE','MSEG','Áruátvételi bizonylat sorok','Goods movement document items','MBLNR,MJAHR,ZEILE','inventory'),
('MM','TABLE','EKKO','Bkészenléti rendelés fejléc','Purchase order header','EBELN','inventory'),
('MM','TABLE','EKPO','Bkészenléti rendelés sorok','Purchase order items','EBELN,EBELP','inventory'),
('MM','BAPI','BAPI_MATERIAL_GETLIST','Anyagok listájának lekérése','Get list of materials','','inventory'),
('MM','BAPI','BAPI_MATERIAL_GET_DETAIL','Anyagtörzs részletek','Get material master detail','MATERIAL,PLANT','inventory'),
('MM','BAPI','BAPI_GOODSMVT_CREATE','Áruátvétel/kiadás','Create goods movement','','inventory');

-- SD modulhoz (Sales & Distribution — Értékesítés)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('SD','TABLE','VBAK','Megrendelés fejléc','Sales order header','VBELN','delivery'),
('SD','TABLE','VBAP','Megrendelés sorok','Sales order items','VBELN,POSNR','delivery'),
('SD','TABLE','LIKP','Szállítólevél fejléc','Delivery header','VBELN','delivery'),
('SD','TABLE','LIPS','Szállítólevél sorok','Delivery items','VBELN,POSNR','delivery'),
('SD','TABLE','VBRK','Számla fejléc','Billing document header','VBELN','delivery'),
('SD','TABLE','VBRP','Számla sorok','Billing document items','VBELN,POSNR','delivery'),
('SD','TABLE','VBUK','Megrendelés státusz fejléc','Sales order status header','VBELN','delivery'),
('SD','BAPI','BAPI_SALESORDER_GETLIST','Megrendelések listája','Get sales order list','','delivery'),
('SD','BAPI','BAPI_DELIVERY_GETLIST','Szállítólevelek listája','Get delivery list','','delivery');

-- PP modulhoz (Production Planning — Gyártástervezés)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('PP','TABLE','AUFK','Gyártási rendelés fejléc','Production order header','AUFNR','scheduling'),
('PP','TABLE','AFKO','Gyártási rendelés adatok','Production order header data','AUFNR','scheduling'),
('PP','TABLE','AFPO','Gyártási rendelés sorok','Production order items','AUFNR,POSNR','scheduling'),
('PP','TABLE','AFVC','Gyártási rendelés műveletek','Production order operations','AUFNR,VORNR','scheduling'),
('PP','TABLE','RESB','Anyagfoglalás','Reservation/dependent requirements','RSNUM,RSPOS','scheduling'),
('PP','TABLE','PLKO','Routing fejléc','Task list header','PLNTY,PLNNR,PLNAL','scheduling'),
('PP','TABLE','PLPO','Routing műveletek','Task list operations','PLNTY,PLNNR,PLNAL,PLNKN','scheduling'),
('PP','TABLE','CRHD','Munkahely törzsadatok','Work center master data','OBJID','scheduling'),
('PP','BAPI','BAPI_PRODORD_GET_LIST','Gyártási rendelések listája','Get production order list','','scheduling'),
('PP','BAPI','BAPI_PRODORD_GET_DETAIL','Gyártási rendelés részletek','Get production order details','NUMBER','scheduling'),
('PP','BAPI','BAPI_CAPACITY_CHECK','Kapacitásellenőrzés','Capacity check','','scheduling');

-- PM modulhoz (Plant Maintenance — Karbantartás)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('PM','TABLE','IFLOT','Funkcionális helyek','Functional locations','TPLNR','maintenance'),
('PM','TABLE','EQUI','Berendezés törzsadatok','Equipment master data','EQUNR','maintenance'),
('PM','TABLE','EQUZ','Berendezés telepítési lista','Equipment installation','EQUNR,DATBI','maintenance'),
('PM','TABLE','QMEL','PM értesítések','PM quality notifications','QMNUM','maintenance'),
('PM','TABLE','VIQMEL','PM értesítések nézet','PM notifications view','QMNUM','maintenance'),
('PM','TABLE','AFIH','Karbantartási rendelés fejléc','Maintenance order header','AUFNR','maintenance'),
('PM','TABLE','PMCO','PM rendelés osztályozás','PM order classification','AUFNR','maintenance'),
('PM','BAPI','BAPI_ALM_ORDER_GET_LIST','Karbantartási rendelések','Get maintenance orders','','maintenance'),
('PM','BAPI','BAPI_EQUIPMENT_GETLIST','Berendezések listája','Get equipment list','','maintenance'),
('PM','BAPI','BAPI_ALM_NOTIF_CREATE','Értesítés létrehozása','Create PM notification','','maintenance');

-- HR modulhoz (Human Resources — Emberi Erőforrások)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('HR','TABLE','PA0001','HR törzsadat - szervezet','HR master - org assignment','PERNR,BEGDA,ENDDA','workforce'),
('HR','TABLE','PA0002','HR törzsadat - személyes','HR master - personal data','PERNR,BEGDA,ENDDA','workforce'),
('HR','TABLE','PA0007','Munkaidő','Working time','PERNR,BEGDA,ENDDA','workforce'),
('HR','TABLE','PA2001','Hiányzások','Absences','PERNR,BEGDA,ENDDA','workforce'),
('HR','TABLE','PA2002','Jelenlét típusok','Attendance types','PERNR,BEGDA,ENDDA','workforce'),
('HR','TABLE','CATSDB','CATS - időrögzítés','CATS time entry','PERNR,WORKDATE','workforce'),
('HR','TABLE','T001P','HR üzem/személyzeti terület','HR plant/personnel area','WERKS,BTRTL','workforce'),
('HR','BAPI','BAPI_EMPLOYEE_GETDATA','Alkalmazott adatok','Get employee data','EMPLOYEE_ID','workforce'),
('HR','BAPI','BAPI_TIMESHEET_GETDETAILEDLIST','CATS lista','Get timesheet list','','workforce');

-- QM modulhoz (Quality Management — Minőségirányítás)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('QM','TABLE','QMEL','Minőségi értesítések','Quality notifications','QMNUM','quality'),
('QM','TABLE','QMSM','Hibaesetek','Defect items','QMNUM,QMDAB','quality'),
('QM','TABLE','QMFE','Hibaokok','Defect causes','QMNUM,QMDAB,QMFAB','quality'),
('QM','TABLE','QMMA','Intézkedések','Actions','QMNUM,QMDAB,QMMAB','quality'),
('QM','TABLE','PRPS','WBS elem','WBS element','PSPNR','quality'),
('QM','BAPI','BAPI_QUALNOT_CREATE','Minőségi értesítés létrehozás','Create quality notification','','quality'),
('QM','BAPI','BAPI_QUALNOT_GET_DETAIL','Minőségi értesítés részletek','Get quality notification detail','NOTIFICATION','quality');

-- FI/CO modulhoz (Finance/Controlling)
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('FI','TABLE','BKPF','Könyvelési bizonylat fejléc','Accounting document header','BUKRS,BELNR,GJAHR','performance'),
('FI','TABLE','BSEG','Könyvelési bizonylat sorok','Accounting document items','BUKRS,BELNR,GJAHR,BUZEI','performance'),
('CO','TABLE','COSS','CO összefoglalás belső','CO object summary internal','OBJNR,LEDNR,VERSN,GJAHR,PERIO','performance'),
('CO','TABLE','COSP','CO összefoglalás külső','CO object summary external','OBJNR,LEDNR,VERSN,GJAHR,PERIO','performance'),
('CO','BAPI','BAPI_COSTCENTER_GETLIST','Költséghelyek listája','Get cost center list','CONTROLLING_AREA','performance');

-- Általános / BASIS
INSERT INTO mod_sap_objects (category, object_type, sap_name, description_hu, description_en, key_fields, aci_module) VALUES
('BASIS','FUNCTION','RFC_READ_TABLE','Táblamentés generikus olvasás','Generic table read via RFC','QUERY_TABLE',''),
('BASIS','FUNCTION','BBP_RFC_READ_TABLE','Generikus tábla olvasás (alternatív)','Alternative generic table read','QUERY_TABLE',''),
('BASIS','BAPI','BAPI_USER_GET_DETAIL','SAP felhasználó adatok','Get SAP user details','USERNAME',''),
('BASIS','TABLE','T001','Vállalati kódok','Company codes','BUKRS',''),
('BASIS','TABLE','T001W','Üzemek/raktárak','Plants/storage locations','WERKS',''),
('BASIS','TABLE','TCURC','Pénznemek','Currencies','WAERS','');
