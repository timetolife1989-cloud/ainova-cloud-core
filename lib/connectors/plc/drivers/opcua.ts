/**
 * OPC-UA Driver — Ainova Cloud Intelligence
 *
 * OPC Unified Architecture — ipari szabvány kliens implementáció.
 * Siemens, Beckhoff, Rockwell és legtöbb modern PLC plc támogatja OPC-UA-t.
 * Előnye: egységes cím tér, biztonságos kapcsolat (S/None/Basic256), typedefs.
 *
 * ELŐKÉSZÍTVE — Aktiváláshoz szükséges:
 *   npm install node-opcua
 *   (nem szükséges natív wrapper — tiszta JavaScript/TypeScript)
 */
import type { IPlcDriver, PlcProtocol, PlcTag, PlcReadResult, PlcWriteResult, PlcConnectionStatus } from '../interface';

export class OpcUaDriver implements IPlcDriver {
  readonly protocol: PlcProtocol = 'opcua';
  readonly deviceId: number;
  private config: Record<string, unknown>;
  private _connected = false;

  // private session: ClientSession | null = null;
  // private client: OPCUAClient | null = null;

  constructor(deviceId: number, config: Record<string, unknown>) {
    this.deviceId = deviceId;
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // TODO: node-opcua aktiválás:
    // import { OPCUAClient, MessageSecurityMode, SecurityPolicy } from 'node-opcua';
    //
    // const securityMode = MessageSecurityMode.None; // prod: SignAndEncrypt
    // const securityPolicy = SecurityPolicy.None;     // prod: Basic256Sha256
    //
    // this.client = OPCUAClient.create({ applicationName: 'ACI', connectionStrategy: { maxRetry: 2 } });
    // await this.client.connect(this.config.opcuaEndpoint as string);
    // this.session = await this.client.createSession();
    // this._connected = true;
    console.warn('[OpcUaDriver] Stub mode — node-opcua not installed. Device:', this.deviceId);
    return false;
  }

  async disconnect(): Promise<void> {
    // if (this.session) await this.session.close();
    // if (this.client) await this.client.disconnect();
    this._connected = false;
  }

  async testConnection(): Promise<PlcConnectionStatus> {
    return {
      deviceId: this.deviceId,
      connected: false,
      errorCode: 'DRIVER_NOT_ACTIVATED',
      errorMessage: 'OPC-UA driver előkészítve — npm install node-opcua szükséges',
      lastChecked: new Date(),
    };
  }

  async readTags(tags: PlcTag[]): Promise<PlcReadResult[]> {
    // OPC-UA cím formátum: ns=2;s=Temperature.PV | ns=2;i=1001
    // await this.session.readVariableValue(tag.address)
    // result.value.value = a nyers érték, result.statusCode = status
    return tags.map(tag => ({
      tagId: tag.id,
      tagName: tag.name,
      rawValue: null,
      scaledValue: null,
      quality: 'bad' as const,
      timestamp: new Date(),
      errorMessage: 'OPC-UA driver nem aktív',
    }));
  }

  async writeTag(tag: PlcTag, value: number | boolean | string): Promise<PlcWriteResult> {
    // await this.session.writeSingleNode(tag.address, new Variant({ dataType: DataType.Double, value }))
    return { tagId: tag.id, tagName: tag.name, success: false, errorMessage: 'OPC-UA driver nem aktív' };
  }

  isConnected(): boolean { return this._connected; }
}
