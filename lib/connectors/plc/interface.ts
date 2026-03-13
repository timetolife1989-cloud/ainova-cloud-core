/**
 * PLC Driver Interface — Ainova Cloud Intelligence
 *
 * Protocol-agnostic driver interface.
 * All drivers (S7, Modbus, MQTT, OPC-UA) implement this.
 */

export type PlcProtocol = 's7' | 'modbus_tcp' | 'modbus_rtu' | 'mqtt' | 'opcua';

/** A PLC register / tag */
export interface PlcTag {
  id: number;
  name: string;
  address: string;      // S7: DB1,W0 | Modbus: 40001 | OPC-UA: ns=2;s=Temperature
  dataType: PlcDataType;
  scaleFactor?: number; // linear scaling: rawValue * scaleFactor + scaleOffset
  scaleOffset?: number;
  unit?: string;        // °C, bar, rpm, etc.
}

export type PlcDataType =
  | 'bool' | 'byte' | 'word' | 'dword' | 'int' | 'dint' | 'real' | 'string';

/** Register read result */
export interface PlcReadResult {
  tagId: number;
  tagName: string;
  rawValue: number | boolean | string | null;
  scaledValue: number | null;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: Date;
  errorMessage?: string;
}

/** Register write result */
export interface PlcWriteResult {
  tagId: number;
  tagName: string;
  success: boolean;
  errorMessage?: string;
}

/** PLC connection status */
export interface PlcConnectionStatus {
  deviceId: number;
  connected: boolean;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  lastChecked: Date;
}

/**
 * Abstract PLC Driver interface.
 * All protocols implement this.
 */
export interface IPlcDriver {
  readonly protocol: PlcProtocol;
  readonly deviceId: number;

  /** Establish connection */
  connect(): Promise<boolean>;
  /** Close connection */
  disconnect(): Promise<void>;
  /** Test connection (ping) */
  testConnection(): Promise<PlcConnectionStatus>;
  /** Read one or more tags */
  readTags(tags: PlcTag[]): Promise<PlcReadResult[]>;
  /** Write a tag value */
  writeTag(tag: PlcTag, value: number | boolean | string): Promise<PlcWriteResult>;
  /** Get connection status */
  isConnected(): boolean;
}

/** Driver factory */
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
