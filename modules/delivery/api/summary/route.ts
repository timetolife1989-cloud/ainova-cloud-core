import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface CustomerSummaryRow {
  customer_name: string;
  shipment_count: number;
  total_quantity: number;
  total_weight: number;
  total_value: number;
  last_shipment_date: string;
}

// GET /api/modules/delivery/summary?months=3
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'delivery.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get('months') ?? '3', 10);

  try {
    const db = getDb();
    const rows = await db.query<CustomerSummaryRow>(
      `SELECT 
        customer_name,
        COUNT(*) AS shipment_count,
        SUM(ISNULL(quantity, 0)) AS total_quantity,
        SUM(ISNULL(weight, 0)) AS total_weight,
        SUM(ISNULL(value, 0)) AS total_value,
        MAX(shipment_date) AS last_shipment_date
      FROM delivery_shipments
      WHERE shipment_date >= DATEADD(MONTH, @p0, GETDATE())
      GROUP BY customer_name
      ORDER BY SUM(ISNULL(value, 0)) DESC`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    const customers = rows.map(r => ({
      customerName: r.customer_name,
      shipmentCount: Number(r.shipment_count),
      totalQuantity: Number(r.total_quantity),
      totalWeight: Number(r.total_weight),
      totalValue: Number(r.total_value),
      lastShipmentDate: String(r.last_shipment_date).split('T')[0],
    }));

    // Monthly trend
    const trend = await db.query<{ month_key: string; shipment_count: number; total_value: number }>(
      `SELECT 
        FORMAT(shipment_date, 'yyyy-MM') AS month_key,
        COUNT(*) AS shipment_count,
        SUM(ISNULL(value, 0)) AS total_value
      FROM delivery_shipments
      WHERE shipment_date >= DATEADD(MONTH, @p0, GETDATE())
      GROUP BY FORMAT(shipment_date, 'yyyy-MM')
      ORDER BY month_key`,
      [{ name: 'p0', type: 'int', value: -months }]
    );

    return Response.json({
      customers,
      trend: trend.map(t => ({
        month: t.month_key,
        shipmentCount: Number(t.shipment_count),
        totalValue: Number(t.total_value),
      })),
    });
  } catch (err) {
    console.error('[Delivery Summary] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
