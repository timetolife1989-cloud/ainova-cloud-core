/**
 * SAP Connector Interface — Ainova Cloud Intelligence
 *
 * Defines the SAP connection interface.
 * Current state: PREPARED — Stub implementations.
 * For production use:
 *   - RFC: node-rfc package (SAP NW RFC SDK native wrapper)
 *   - OData: fetch() + @sap-cloud-sdk/connectivity
 *   - File: existing Excel import logic
 */

export type SapConnectionType = 'rfc' | 'odata' | 'file';

/** SAP system connection parameters */
export interface SapConnectionConfig {
  id: number;
  name: string;
  connectionType: SapConnectionType;
  // RFC (klasszikus SAP GUI logon — ECC, S/4HANA on-premise)
  host?: string;
  sysnr?: string;        // System number: '00', '01', etc.
  client?: string;       // Client: '100', '200', '300'
  sapUser?: string;
  passwordRef?: string;  // Vault/env key — NEVER plaintext!
  language?: string;     // 'HU', 'DE', 'EN'
  // OData / REST (S/4HANA Cloud, SAP BTP API Hub)
  baseUrl?: string;
  apiPath?: string;
}

/** RFC call result */
export interface SapRfcResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  rowCount?: number;
  executionMs?: number;
}

/** Sync request */
export interface SapSyncRequest {
  connectionId: number;
  sapObject: string;       // pl. 'MARA', 'VBAK'
  aciTable: string;        // pl. 'mod_inventory'
  syncType: 'full' | 'incremental';
  filters?: Record<string, string>; // SELECT WHERE conditions: { WERKS: '1000' }
  maxRows?: number;
  triggeredBy?: string;
}

/** Sync result */
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
 * Abstract SAP Connector interface.
 * All protocols (RFC, OData, File) implement this.
 */
export interface ISapConnector {
  /** Test connection */
  testConnection(): Promise<{ ok: boolean; message: string }>;
  /** Generic table read (RFC_READ_TABLE or OData equivalent) */
  readTable(
    tableName: string,
    fields?: string[],
    filters?: string,
    maxRows?: number
  ): Promise<SapRfcResult>;
  /** BAPI call */
  callBapi(
    bapiName: string,
    params: Record<string, unknown>
  ): Promise<SapRfcResult>;
  /** Execute full sync */
  syncTable(request: SapSyncRequest): Promise<SapSyncResult>;
}

/**
 * RFC Connector — SAP RFC connection
 *
 * Dependency: npm install node-rfc
 * node-rfc: SAP NetWeaver RFC SDK C-library Node.js wrapper
 * SAP NW RFC SDK download: support.sap.com (SCN login required)
 */
export class SapRfcConnector implements ISapConnector {
  constructor(private readonly config: SapConnectionConfig) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    // TODO: node-rfc initialization
    // const { Client } = await import('node-rfc');
    // const client = new Client({ ashost: config.host, sysnr: config.sysnr, client: config.client, user: config.sapUser, passwd: resolvePassword(config.passwordRef) });
    // await client.open();
    // await client.close();
    return {
      ok: false,
      message: 'RFC connector prepared — node-rfc package and SAP NW RFC SDK required',
    };
  }

  async readTable(
    tableName: string,
    fields: string[] = [],
    filters = '',
    maxRows = 1000
  ): Promise<SapRfcResult> {
    // TODO: RFC_READ_TABLE BAPI call
    // const result = await client.call('RFC_READ_TABLE', {
    //   QUERY_TABLE: tableName,
    //   FIELDS: fields.map(f => ({ FIELDNAME: f })),
    //   OPTIONS: filters ? [{ TEXT: filters }] : [],
    //   ROWCOUNT: maxRows
    // });
    return { success: false, error: 'RFC not yet activated', rowCount: 0 };
  }

  async callBapi(bapiName: string, params: Record<string, unknown>): Promise<SapRfcResult> {
    // TODO: generic BAPI call
    return { success: false, error: 'RFC not yet activated' };
  }

  async syncTable(request: SapSyncRequest): Promise<SapSyncResult> {
    // TODO: RFC_READ_TABLE → field mapping → INSERT/UPSERT into ACI table
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
 * Usage: SAP BTP API Hub OData v2/v4 endpoints
 * E.g.: /sap/opu/odata/sap/API_MATERIAL_SRV
 *       /sap/opu/odata/sap/API_SALESORDER_SRV
 *
 * No extra packages needed — native fetch() is sufficient.
 */
export class SapODataConnector implements ISapConnector {
  constructor(private readonly config: SapConnectionConfig) {}

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    // TODO: GET {baseUrl}{apiPath}/$metadata
    // const resp = await fetch(`${config.baseUrl}${config.apiPath}/$metadata`, { headers: buildHeaders() });
    return { ok: false, message: 'OData connector prepared — baseUrl and authentication required' };
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

  // OData authentication header (Basic auth temporary, OAuth in production)
  private buildHeaders(): HeadersInit {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
    };
  }
}

/** Connector factory — returns the appropriate implementation based on type */
export function createSapConnector(config: SapConnectionConfig): ISapConnector {
  switch (config.connectionType) {
    case 'rfc':
      return new SapRfcConnector(config);
    case 'odata':
      return new SapODataConnector(config);
    case 'file':
      // File-based import: handled by the file-import module
      throw new Error('File import is handled in the file-import module');
    default:
      throw new Error(`Unknown SAP connection type: ${(config as SapConnectionConfig).connectionType}`);
  }
}
