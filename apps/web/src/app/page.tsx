import { getDashboard } from '@/lib/api';
import { KpiCard } from '@/components/kpi-card';
import { ChartRenderer } from '@/components/chart-renderer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const d = await getDashboard();
  const k = d.kpis;
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-6 py-8 lg:px-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Descriptive analytics across all 400 orders in the 2025 dataset.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total Orders" value={String(k.totalOrders)} />
        <KpiCard label="Delivered" value={String(k.deliveredOrders)} />
        <KpiCard label="Delayed" value={String(k.delayedOrders)} />
        <KpiCard label="On-time Rate" value={`${(k.onTimeDeliveryRate * 100).toFixed(1)}%`} />
        <KpiCard label="Avg Delivery (days)" value={k.avgDeliveryDays.toFixed(1)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartRenderer
              chart={d.charts.volumeOverTime.chart}
              rows={d.charts.volumeOverTime.rows}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartRenderer
              chart={d.charts.deliveryPerformance.chart}
              rows={d.charts.deliveryPerformance.rows}
            />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Carrier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartRenderer
              chart={d.charts.carrierBreakdown.chart}
              rows={d.charts.carrierBreakdown.rows}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
