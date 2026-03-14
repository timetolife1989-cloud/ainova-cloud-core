/**
 * Shopify Admin API adapter
 * Sync products/stock/orders with Shopify stores.
 */

import type { PlatformAdapter, ProductStock, RemoteOrder } from './types';

interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    sku: string;
    inventory_quantity: number;
    price: string;
    inventory_item_id: number;
  }>;
}

interface ShopifyOrder {
  id: number;
  name: string;
  total_price: string;
  currency: string;
  customer: { first_name: string; last_name: string; email: string } | null;
  line_items: Array<{
    product_id: number;
    variant_id: number;
    sku: string;
    quantity: number;
    price: string;
  }>;
  created_at: string;
}

export class ShopifyAdapter implements PlatformAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(storeUrl: string, accessToken: string) {
    // storeUrl should be like "mystore.myshopify.com"
    const clean = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.baseUrl = `https://${clean}/admin/api/2024-01`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/shop.json');
      return true;
    } catch {
      return false;
    }
  }

  async getProducts(): Promise<ProductStock[]> {
    const data = await this.request<{ products: ShopifyProduct[] }>('/products.json?limit=250');
    const result: ProductStock[] = [];
    for (const p of data.products) {
      for (const v of p.variants) {
        result.push({
          remoteProductId: `${p.id}:${v.id}`,
          sku: v.sku || '',
          stock: v.inventory_quantity,
          price: v.price ? parseFloat(v.price) : null,
        });
      }
    }
    return result;
  }

  async updateStock(remoteProductId: string, stock: number): Promise<boolean> {
    // remoteProductId is "productId:variantId"
    const [, variantId] = remoteProductId.split(':');
    if (!variantId) return false;
    try {
      // Get inventory_item_id first
      const data = await this.request<{ variant: { inventory_item_id: number } }>(`/variants/${variantId}.json`);
      const inventoryItemId = data.variant.inventory_item_id;
      // Get location ID
      const locData = await this.request<{ locations: Array<{ id: number }> }>('/locations.json');
      const locationId = locData.locations[0]?.id;
      if (!locationId) return false;
      // Set inventory level
      await this.request('/inventory_levels/set.json', 'POST', {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: stock,
      });
      return true;
    } catch {
      return false;
    }
  }

  async updatePrice(remoteProductId: string, price: number): Promise<boolean> {
    const [, variantId] = remoteProductId.split(':');
    if (!variantId) return false;
    try {
      await this.request(`/variants/${variantId}.json`, 'PUT', {
        variant: { price: price.toFixed(2) },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getNewOrders(since?: Date): Promise<RemoteOrder[]> {
    const sinceParam = since ? `&created_at_min=${since.toISOString()}` : '';
    const data = await this.request<{ orders: ShopifyOrder[] }>(`/orders.json?status=open&limit=50${sinceParam}`);
    return data.orders.map(o => ({
      remoteOrderId: String(o.id),
      customerName: o.customer ? `${o.customer.first_name} ${o.customer.last_name}`.trim() : 'Unknown',
      totalAmount: parseFloat(o.total_price),
      currency: o.currency,
      items: o.line_items.map(li => ({
        productId: `${li.product_id}:${li.variant_id}`,
        sku: li.sku,
        qty: li.quantity,
        price: parseFloat(li.price),
      })),
      rawData: o as unknown as Record<string, unknown>,
    }));
  }
}
