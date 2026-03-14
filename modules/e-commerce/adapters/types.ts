/**
 * E-Commerce platform adapter interface.
 * All platform integrations (WooCommerce, Shopify) implement this.
 */

export interface ProductStock {
  remoteProductId: string;
  sku: string;
  stock: number;
  price: number | null;
}

export interface RemoteOrder {
  remoteOrderId: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  items: Array<{ productId: string; sku: string; qty: number; price: number }>;
  rawData: Record<string, unknown>;
}

export interface PlatformAdapter {
  /** Test connectivity with the platform */
  testConnection(): Promise<boolean>;

  /** Fetch current stock levels for all mapped products */
  getProducts(): Promise<ProductStock[]>;

  /** Update stock quantity for a specific product */
  updateStock(remoteProductId: string, stock: number): Promise<boolean>;

  /** Update price for a specific product */
  updatePrice(remoteProductId: string, price: number): Promise<boolean>;

  /** Fetch new orders since lastSync */
  getNewOrders(since?: Date): Promise<RemoteOrder[]>;
}

/**
 * Encrypt a string value using AES-256-GCM with Web Crypto API.
 * The encryption key is derived from ECOMMERCE_ENCRYPT_KEY env var.
 */
export async function encryptValue(plaintext: string): Promise<string> {
  const keyMaterial = process.env.ECOMMERCE_ENCRYPT_KEY || 'aci-default-key-change-in-production!';
  const keyData = new TextEncoder().encode(keyMaterial.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
  // Combine iv + ciphertext, base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a string value encrypted with encryptValue.
 */
export async function decryptValue(ciphertext: string): Promise<string> {
  const keyMaterial = process.env.ECOMMERCE_ENCRYPT_KEY || 'aci-default-key-change-in-production!';
  const keyData = new TextEncoder().encode(keyMaterial.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encrypted);
  return new TextDecoder().decode(decrypted);
}
