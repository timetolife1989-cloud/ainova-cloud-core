/**
 * SAP Connector Interface — Ainova Cloud Intelligence
 *
 * Ez a fájl definiálja az SAP-kapcsolat interfészét.
 * Jelenlegi állapot: ELŐKÉSZÍTVE — Stub implementációk.
 * Éles használathoz szükséges:
 *   - RFC: node-rfc csomag (SAP NW RFC SDK natív wrapper)
 *   - OData: fetch() + @sap-cloud-sdk/connectivity
 *   - File: meglévő lac-napi-perces Excel import logika
 */

export type SapConnectionType = 'rfc' | 'odata' | 'file';

/** Egy SAP-rendszer kapcsolati paraméterei */
export interface SapConnectionConfig {
  id: number;
  name: string;
  connectionType: SapConnectionType;
  // RFC (klasszikus SAP GUI logon — ECC, S/4HANA on-premise)
  host?: string;
  sysnr?: string;        // Rendszerszám: '00', '01', stb.
  client?: string;       // Mandant: '100', '200', '300'
  sapUser?: string;
  passwordRef?: string;  // Vault/env kulcs — SOHA nem plaintext!
  language?: string;     // 'HU', 'DE', 'EN'
  // OData / REST (S/4HANA Cloud, SAP BTP API Hub)
  baseUrl?: string;
  apiPath?: string;
}

/** RFC hívás eredménye */
export interface SapRfcResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  rowCount?: number;
  executionMs?: number;
}

/** Szinkronizálás kérés */
export interface SapSyncRequest {
  connectionId: number;
  sapObject: string;       // pl. 'MARA', 'VBAK'
  aciTable: string;        // pl. 'mod_inventory'
  syncType: 'full' | 'incremental';
  filters?: Record<string, string>; // SELECT WHERE feltételek: { WERKS: '1000' }
  maxRows?: number;
  triggeredBy?: string;
}

/** Szinkronizálás eredmény */
export interface SapSyncResult {
  success: boolean;
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
  recordsError: number;
  errorDetails?: string;
  durationMs?: number;
}

/**
 * SAP Connector absztrakt interfész.
 * Minden protokoll (RFC, OData, File) implementálja ezt.
 */
export interface ISapConnector {
  /** Kapcsolat tesztelése */
  testConnection(): Promise<{ ok: boolean; message: string }>;
  /** Generikus táblaolvasás (RFC_READ_TABLE vagy OData equivalent) */
  readTable(
    tableName: string,
    fields?: string[],
    filters?: string,
    maxRows?: number
  ): Promise<SapRfcResult>;
  /** BAPI hívás */
  callBapi(
    bapiName: string,
    params: Record<string, unknown>
  ): Promise<SapRfcResult>;
  /** Teljes szinkronizálás futtatása */
  syncTable(request: SapSyncRequest): Promise<SapSyncResult>;
}

/**
 * RFC Connector — Siemens SAP RFC kapcsolat
 *
 * Függőség: npm install node-rfc
 * node-rfc: SAP NetWeaver RFC SDK C-könyvtár Node.js wrapper
 * SAP NW RFC SDK letöltés: support.sap.com (SCN bejelentkezés szükséges)
 */
export class SapRfcConnector implements ISapConnector {
  constructor(private readonly config: SapConnectionConfig) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    // TODO: node-rfc inicializálás
    // const { Client } = await import('node-rfc');
    // const client = new Client({ ashost: config.host, sysnr: config.sysnr, client: config.client, user: config.sapUser, passwd: resolvePassword(config.passwordRef) });
    // await client.open();
    // await client.close();
    return {
      ok: false,
      message: 'RFC connector előkészítve — node-rfc csomag és SAP NW RFC SDK szükséges',
    };
  }

  async readTable(
    tableName: string,
    fields: string[] = [],
    filters = '',
    maxRows = 1000
  ): Promise<SapRfcResult> {
    // TODO: RFC_READ_TABLE BAPI hívás
    // const result = await client.call('RFC_READ_TABLE', {
    //   QUERY_TABLE: tableName,
    //   FIELDS: fields.map(f => ({ FIELDNAME: f })),
    //   OPTIONS: filters ? [{ TEXT: filters }] : [],
    //   ROWCOUNT: maxRows
    // });
    return { success: false, error: 'RFC not yet activated', rowCount: 0 };
  }

  async callBapi(bapiName: string, params: Record<string, unknown>): Promise<SapRfcResult> {
    // TODO: generikus BAPI hívás
    return { success: false, error: 'RFC not yet activated' };
  }

  async syncTable(request: SapSyncRequest): Promise<SapSyncResult> {
    // TODO: RFC_READ_TABLE → field mapping → INSERT/UPSERT ACI táblába
    return {
      success: false,
      recordsRead: 0,
      recordsWritten: 0,
      recordsSkipped: 0,
      recordsError: 0,
      errorDetails: 'RFC not yet activated',
    };
  }
}

/**
 * OData Connector — SAP Netweaver Gateway / S/4HANA Cloud OData
 *
 * Használat: SAP BTP API Hub OData v2/v4 végpontok
 * Pl.: /sap/opu/odata/sap/API_MATERIAL_SRV
 *      /sap/opu/odata/sap/API_SALESORDER_SRV
 *
 * Nincs extra csomag — natív fetch() elég.
 */
export class SapODataConnector implements ISapConnector {
  constructor(private readonly config: SapConnectionConfig) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    // TODO: GET {baseUrl}{apiPath}/$metadata
    // const resp = await fetch(`${config.baseUrl}${config.apiPath}/$metadata`, { headers: buildHeaders() });
    return { ok: false, message: 'OData connector előkészítve — baseUrl és hitelesítés szükséges' };
  }

  async readTable(
    entitySet: string,
    fields: string[] = [],
    filter = '',
    maxRows = 1000
  ): Promise<SapRfcResult> {
    // TODO: GET {baseUrl}{apiPath}/{entitySet}?$top=maxRows&$select=fields&$filter=filter
    return { success: false, error: 'OData not yet activated' };
  }

  async callBapi(actionName: string, params: Record<string, unknown>): Promise<SapRfcResult> {
    // TODO: POST OData Action
    return { success: false, error: 'OData not yet activated' };
  }

  async syncTable(request: SapSyncRequest): Promise<SapSyncResult> {
    return {
      success: false,
      recordsRead: 0,
      recordsWritten: 0,
      recordsSkipped: 0,
      recordsError: 0,
      errorDetails: 'OData not yet activated',
    };
  }

  // OData authentikáció fejléc (Basic auth ideiglenesen, prod-ban OAuth)
  private buildHeaders(): HeadersInit {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
    };
  }
}

/** Connector gyár — típus alapján adja vissza a megfelelő implementációt */
export function createSapConnector(config: SapConnectionConfig): ISapConnector {
  switch (config.connectionType) {
    case 'rfc':
      return new SapRfcConnector(config);
    case 'odata':
      return new SapODataConnector(config);
    case 'file':
      // Fájl alapú import: lásd modules/lac-napi-perces már meglévő megoldása
      throw new Error('File import a lac-napi-perces modulban kezelendő');
    default:
      throw new Error(`Ismeretlen SAP kapcsolat típus: ${(config as SapConnectionConfig).connectionType}`);
  }
}
