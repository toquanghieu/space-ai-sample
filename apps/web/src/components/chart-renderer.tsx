'use client';
import type { ChartSpec } from '@logi/shared';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

import { labelFor } from '@/lib/labels';

// Palette big enough for the widest breakdown (9 carriers / 8 categories).
const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#db2777',
  '#4f46e5',
  '#65a30d',
];

type Rows = Record<string, string | number>[];

export function ChartRenderer({
  chart,
  rows,
  referenceLineX,
}: {
  chart: ChartSpec;
  rows: Rows;
  referenceLineX?: string | null;
}) {
  if (chart.type === 'none' || rows.length === 0) return null;

  // Single-metric breakdown by a dimension → colour each bar by category.
  // Multi-metric → one colour per metric series (legend explains them).
  const singleSeries = chart.yKeys.length === 1;

  // Recharts renders legend text in default (black). Colour it to match the series.
  const legendFormatter = (value: unknown, entry?: { color?: string }) => (
    <span style={{ color: entry?.color }}>{labelFor(String(value))}</span>
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === 'line' ? (
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.xKey} fontSize={12} tickMargin={8} />
            <YAxis fontSize={12} width={40} />
            <Tooltip labelFormatter={(l) => `${labelFor(chart.xKey)}: ${l}`} />
            {!singleSeries && <Legend formatter={legendFormatter} />}
            {referenceLineX && (
              <ReferenceLine
                x={referenceLineX}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: 'forecast →', position: 'insideTopRight', fontSize: 11, fill: '#64748b' }}
              />
            )}
            {chart.yKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={labelFor(k)}
                stroke={PALETTE[i % PALETTE.length]}
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
            {!singleSeries && <Legend formatter={legendFormatter} />}
            {chart.yKeys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                name={labelFor(k)}
                fill={PALETTE[i % PALETTE.length]}
                radius={[4, 4, 0, 0]}
              >
                {/* single-metric breakdown: colour each bar by its category */}
                {singleSeries &&
                  rows.map((_, ri) => <Cell key={ri} fill={PALETTE[ri % PALETTE.length]} />)}
              </Bar>
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
