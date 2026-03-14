/**
 * WooCommerce REST API v3 adapter
 * Sync products/stock/orders with WooCommerce stores.
 */

import type { PlatformAdapter, ProductStock, RemoteOrder } from './types';

interface WooProduct {
  id: number;
  sku: string;
  stock_quantity: number | null;
  regular_price: string;
  name: string;
}

interface WooOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  currency: string;
  billing: { first_name: string; last_name: string; email: string };
  line_items: Array<{ product_id: number; sku: string; quantity: number; price: string }>;
  date_created: string;
}

export class WooCommerceAdapter implements PlatformAdapter {
  private baseUrl: string;
  private authHeader: string;

  constructor(storeUrl: string, apiKey: string, apiSecret: string) {
    this.baseUrl = storeUrl.replace(/\/$/, '') + '/wp-json/wc/v3';
    this.authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
  }

  private async request<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/system_status');
      return true;
    } catch {
      return false;
    }
  }

  async getProducts(): Promise<ProductStock[]> {
    const products = await this.request<WooProduct[]>('/products?per_page=100');
    return products.map(p => ({
      remoteProductId: String(p.id),
      sku: p.sku || '',
      stock: p.stock_quantity ?? 0,
      price: p.regular_price ? parseFloat(p.regular_price) : null,
    }));
  }

  async updateStock(remoteProductId: string, stock: number): Promise<boolean> {
    try {
      await this.request(`/products/${remoteProductId}`, 'PUT', {
        stock_quantity: stock,
        manage_stock: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  async updatePrice(remoteProductId: string, price: number): Promise<boolean> {
    try {
      await this.request(`/products/${remoteProductId}`, 'PUT', {
        regular_price: price.toFixed(2),
      });
      return true;
    } catch {
      return false;
    }
  }

  async getNewOrders(since?: Date): Promise<RemoteOrder[]> {
    const afterParam = since ? `&after=${since.toISOString()}` : '';
    const orders = await this.request<WooOrder[]>(`/orders?per_page=50&status=processing${afterParam}`);
    return orders.map(o => ({
      remoteOrderId: String(o.id),
      customerName: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
      totalAmount: parseFloat(o.total),
      currency: o.currency,
      items: o.line_items.map(li => ({
        productId: String(li.product_id),
        sku: li.sku,
        qty: li.quantity,
        price: parseFloat(li.price),
      })),
      rawData: o as unknown as Record<string, unknown>,
    }));
  }
}
