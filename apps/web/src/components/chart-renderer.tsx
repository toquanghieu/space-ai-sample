'use client';
import type { ChartSpec } from '@logi/shared';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea'];

/** Human-readable labels for machine metric/dimension keys shown in charts. */
const LABELS: Record<string, string> = {
  order_count: 'Orders',
  delivered_count: 'Delivered',
  delayed_count: 'Delayed',
  on_time_rate: 'On-time rate',
  avg_delivery_days: 'Avg delivery (days)',
  total_quantity: 'Total quantity',
  total_order_value: 'Order value (USD)',
  value: 'Quantity',
  period: 'Period',
  carrier: 'Carrier',
  region: 'Region',
  status: 'Status',
  product_category: 'Category',
  destination_city: 'Destination',
  warehouse: 'Warehouse',
};

const labelFor = (key: string) => LABELS[key] ?? key;

export function ChartRenderer({
  chart,
  rows,
}: {
  chart: ChartSpec;
  rows: Record<string, string | number>[];
}) {
  if (chart.type === 'none' || rows.length === 0) return null;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === 'line' ? (
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xKey} fontSize={12} tickMargin={8} />
            <YAxis fontSize={12} width={40} />
            <Tooltip labelFormatter={(l) => `${labelFor(chart.xKey)}: ${l}`} />
            <Legend formatter={(v) => labelFor(String(v))} />
            {chart.yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={labelFor(k)}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xKey} fontSize={12} tickMargin={8} />
            <YAxis fontSize={12} width={40} />
            <Tooltip labelFormatter={(l) => `${labelFor(chart.xKey)}: ${l}`} />
            <Legend formatter={(v) => labelFor(String(v))} />
            {chart.yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} name={labelFor(k)} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
