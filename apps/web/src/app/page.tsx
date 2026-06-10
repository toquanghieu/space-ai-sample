import { getDashboard } from '@/lib/api';
import { KpiCard } from '@/components/kpi-card';
import { ChartRenderer } from '@/components/chart-renderer';
import { ChatPanel } from '@/components/chat-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const d = await getDashboard();
  const k = d.kpis;
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Logistics Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Descriptive, diagnostic and predictive analytics over the 2025 dataset.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ask">Ask AI</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <KpiCard label="Total Orders" value={String(k.totalOrders)} />
            <KpiCard label="Delivered" value={String(k.deliveredOrders)} />
            <KpiCard label="Delayed" value={String(k.delayedOrders)} />
            <KpiCard label="On-time Rate" value={`${(k.onTimeDeliveryRate * 100).toFixed(1)}%`} />
            <KpiCard label="Avg Delivery (days)" value={k.avgDeliveryDays.toFixed(1)} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
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
            <Card className="md:col-span-2">
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
          </div>
        </TabsContent>

        <TabsContent value="ask">
          <ChatPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}
