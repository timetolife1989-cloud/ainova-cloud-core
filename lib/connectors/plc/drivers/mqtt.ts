/**
 * MQTT Driver — Ainova Cloud Intelligence
 *
 * IIoT edge eszközök + PLC gateway-ek MQTT üzenetein keresztül.
 * Tipikus használat: MQTT broker (Mosquitto / HiveMQ / AWS IoT Core)
 *   → PLC/érzékelő adatok JSON publish-ok formájában
 *   → ACI feliratkozik, parse-ol, mentés DB-be
 *
 * ELŐKÉSZÍTVE — Aktiváláshoz szükséges:
 *   npm install mqtt
 */
import type { IPlcDriver, PlcProtocol, PlcTag, PlcReadResult, PlcWriteResult, PlcConnectionStatus } from '../interface';

export class MqttDriver implements IPlcDriver {
  readonly protocol: PlcProtocol = 'mqtt';
  readonly deviceId: number;
  private config: Record<string, unknown>;
  private _connected = false;

  // private mqttClient: MqttClient | null = null;
  // private tagValueCache: Map<string, { value: unknown; ts: Date }> = new Map();

  constructor(deviceId: number, config: Record<string, unknown>) {
    this.deviceId = deviceId;
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // TODO:
    // const mqtt = await import('mqtt');
    // const brokerUrl = this.config.mqttBrokerUrl as string;
    // this.mqttClient = mqtt.connect(brokerUrl, {
    //   clientId: this.config.mqttClientId as string,
    //   username: this.config.mqttUsername as string ?? undefined,
    //   password: process.env[this.config.mqttPasswordRef as string] ?? undefined,
    //   clean: true,
    // });
    // return new Promise((resolve) => {
    //   this.mqttClient!.on('connect', () => {
    //     this._connected = true;
    //     this.mqttClient!.subscribe(this.config.mqttTopicSub as string, { qos: this.config.mqttQos as 0|1|2 ?? 1 });
    //     resolve(true);
    //   });
    //   this.mqttClient!.on('error', () => resolve(false));
    //   this.mqttClient!.on('message', (topic, payload) => {
    //     this.handleMessage(topic, payload.toString());
    //   });
    // });
    console.warn('[MqttDriver] Stub mode — mqtt package not installed. Device:', this.deviceId);
    return false;
  }

  // private handleMessage(topic: string, payload: string) {
  //   try {
  //     const data = JSON.parse(payload);
  //     // JSON payload: { tagName: value } VAGY { value: X, quality: 'good' }
  //     for (const [key, val] of Object.entries(data)) {
  //       this.tagValueCache.set(`${topic}/${key}`, { value: val, ts: new Date() });
  //     }
  //   } catch { /* nem JSON — string értékként kezeljük */ }
  // }

  async disconnect(): Promise<void> {
    // if (this.mqttClient) this.mqttClient.end();
    this._connected = false;
  }

  async testConnection(): Promise<PlcConnectionStatus> {
    return {
      deviceId: this.deviceId,
      connected: false,
      errorCode: 'DRIVER_NOT_ACTIVATED',
      errorMessage: 'MQTT driver előkészítve — npm install mqtt szükséges',
      lastChecked: new Date(),
    };
  }

  async readTags(tags: PlcTag[]): Promise<PlcReadResult[]> {
    // MQTT aszinkron — a driver a cache-ből olvassa a legutóbbi értéket
    // tag.address = MQTT topic + JSON mező: "sensors/machine1/temperature"
    return tags.map(tag => ({
      tagId: tag.id,
      tagName: tag.name,
      rawValue: null,
      scaledValue: null,
      quality: 'bad' as const,
      timestamp: new Date(),
      errorMessage: 'MQTT driver nem aktív',
    }));
  }

  async writeTag(tag: PlcTag, value: number | boolean | string): Promise<PlcWriteResult> {
    // MQTT publis: this.mqttClient.publish(this.config.mqttTopicPub + '/' + tag.name, JSON.stringify({ value }))
    return { tagId: tag.id, tagName: tag.name, success: false, errorMessage: 'MQTT driver nem aktív' };
  }

  isConnected(): boolean { return this._connected; }
}
