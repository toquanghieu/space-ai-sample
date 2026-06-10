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
            <XAxis dataKey={chart.xKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {chart.yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xKey} fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {chart.yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
