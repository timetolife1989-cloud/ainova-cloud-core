/**
 * Modbus TCP / RTU Driver — Ainova Cloud Intelligence
 *
 * Protokoll: Modbus TCP (port 502) / Modbus RTU (soros port)
 * Támogatott funkciókódok: FC01/FC02 (coils/discrete inputs), FC03/FC04 (holding/input registers)
 *
 * ELŐKÉSZÍTVE — Aktiváláshoz szükséges:
 *   npm install jsmodbus  (Modbus TCP)
 *   npm install modbus-serial  (RTU + TCP)
 */
import type { IPlcDriver, PlcProtocol, PlcTag, PlcReadResult, PlcWriteResult, PlcConnectionStatus } from '../interface';

export class ModbusDriver implements IPlcDriver {
  readonly protocol: PlcProtocol;
  readonly deviceId: number;
  private config: Record<string, unknown>;
  private _connected = false;

  constructor(deviceId: number, protocol: 'modbus_tcp' | 'modbus_rtu', config: Record<string, unknown>) {
    this.deviceId = deviceId;
    this.protocol = protocol;
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // TODO: modbus-serial aktiválás:
    // const ModbusRTU = (await import('modbus-serial')).default;
    // this.client = new ModbusRTU();
    // if (this.protocol === 'modbus_tcp') {
    //   await this.client.connectTCP(this.config.host as string, { port: (this.config.port as number) ?? 502 });
    // } else {
    //   await this.client.connectRTUBuffered(this.config.serialPort as string, { baudRate: this.config.serialBaud as number ?? 9600 });
    // }
    // this.client.setID((this.config.modbusUnitId as number) ?? 1);
    console.warn('[ModbusDriver] Stub mode — modbus-serial not installed. Device:', this.deviceId);
    return false;
  }

  async disconnect(): Promise<void> {
    // if (this.client) this.client.close(() => {});
    this._connected = false;
  }

  async testConnection(): Promise<PlcConnectionStatus> {
    return {
      deviceId: this.deviceId,
      connected: false,
      errorCode: 'DRIVER_NOT_ACTIVATED',
      errorMessage: 'Modbus driver prepared — npm install modbus-serial required',
      lastChecked: new Date(),
    };
  }

  async readTags(tags: PlcTag[]): Promise<PlcReadResult[]> {
    // TODO: Modbus cím formátum:
    //  1x = discrete inputs (FC02)
    //  0x = coils (FC01)
    //  3x = input registers (FC04)
    //  4x = holding registers (FC03)
    //  Pl: "40001" = holding register 1
    //
    // await this.client.readHoldingRegisters(registerAddr, count)
    // Endianness: config.modbusBigEndian ? bigEndian : littleEndian
    return tags.map(tag => ({
      tagId: tag.id,
      tagName: tag.name,
      rawValue: null,
      scaledValue: null,
      quality: 'bad' as const,
      timestamp: new Date(),
      errorMessage: 'Modbus driver not active',
    }));
  }

  async writeTag(tag: PlcTag, value: number | boolean | string): Promise<PlcWriteResult> {
    // TODO: FC06 writeSingleRegister / FC05 writeSingleCoil
    return { tagId: tag.id, tagName: tag.name, success: false, errorMessage: 'Modbus driver not active' };
  }

  isConnected(): boolean { return this._connected; }
}
