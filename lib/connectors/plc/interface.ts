/**
 * PLC Driver Interface — Ainova Cloud Intelligence
 *
 * Protokoll-független illesztőprogram interfész.
 * Minden driver (S7, Modbus, MQTT, OPC-UA) implementálja ezt.
 */

export type PlcProtocol = 's7' | 'modbus_tcp' | 'modbus_rtu' | 'mqtt' | 'opcua';

/** Egy PLC regiszter / tag */
export interface PlcTag {
  id: number;
  name: string;
  address: string;      // S7: DB1,W0 | Modbus: 40001 | OPC-UA: ns=2;s=Temperature
  dataType: PlcDataType;
  scaleFactor?: number; // lineáris skálázás: rawValue * scaleFactor + scaleOffset
  scaleOffset?: number;
  unit?: string;        // °C, bar, rpm, stb.
}

export type PlcDataType =
  | 'bool' | 'byte' | 'word' | 'dword' | 'int' | 'dint' | 'real' | 'string';

/** Regiszter beolvasás eredménye */
export interface PlcReadResult {
  tagId: number;
  tagName: string;
  rawValue: number | boolean | string | null;
  scaledValue: number | null;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: Date;
  errorMessage?: string;
}

/** Regiszter írás eredménye */
export interface PlcWriteResult {
  tagId: number;
  tagName: string;
  success: boolean;
  errorMessage?: string;
}

/** PLC kapcsolat állapot */
export interface PlcConnectionStatus {
  deviceId: number;
  connected: boolean;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  lastChecked: Date;
}

/**
 * Absztrakt PLC Driver interfész.
 * Minden protokoll implementálja ezt.
 */
export interface IPlcDriver {
  readonly protocol: PlcProtocol;
  readonly deviceId: number;

  /** Kapcsolat felépítése */
  connect(): Promise<boolean>;
  /** Kapcsolat lezárása */
  disconnect(): Promise<void>;
  /** Kapcsolat tesztelése (ping) */
  testConnection(): Promise<PlcConnectionStatus>;
  /** Egy vagy több tag beolvasása */
  readTags(tags: PlcTag[]): Promise<PlcReadResult[]>;
  /** Egy tag értékének írása */
  writeTag(tag: PlcTag, value: number | boolean | string): Promise<PlcWriteResult>;
  /** Kapcsolat állapot lekérése */
  isConnected(): boolean;
}

/** Driver gyár */
export async function createPlcDriver(
  protocol: PlcProtocol,
  deviceId: number,
  config: Record<string, unknown>
): Promise<IPlcDriver> {
  switch (protocol) {
    case 's7': {
      const { S7Driver } = await import('@/lib/connectors/plc/drivers/s7');
      return new S7Driver(deviceId, config);
    }
    case 'modbus_tcp':
    case 'modbus_rtu': {
      const { ModbusDriver } = await import('@/lib/connectors/plc/drivers/modbus');
      return new ModbusDriver(deviceId, protocol, config);
    }
    case 'mqtt': {
      const { MqttDriver } = await import('@/lib/connectors/plc/drivers/mqtt');
      return new MqttDriver(deviceId, config);
    }
    case 'opcua': {
      const { OpcUaDriver } = await import('@/lib/connectors/plc/drivers/opcua');
      return new OpcUaDriver(deviceId, config);
    }
    default:
      throw new Error(`Unknown PLC protocol: ${protocol}`);
  }
}
