'use client';
import { useState } from 'react';
import type { AskResponse } from '@logi/shared';
import { ask } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChartRenderer } from './chart-renderer';
import { ExplainabilityPanel } from './explainability-panel';

const SUGGESTIONS = [
  'Show delayed orders by week for the last 3 months',
  'Which carrier has the highest delay count?',
  'On-time delivery rate by region',
  'Predict total quantity demand for CRAYON for the next 4 months',
];

export function ChatPanel() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<AskResponse | null>(null);

  async function run(question: string) {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      setRes(await ask(question));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) run(q.trim());
        }}
        className="flex gap-2"
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a question about the logistics data…"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQ(s);
              run(s);
            }}
            className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {res && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="font-medium">{res.answer}</p>

            {res.tool === 'query_analytics' && res.query && (
              <>
                <ChartRenderer chart={res.query.chart} rows={res.query.rows} />
                <ExplainabilityPanel result={res.query} />
              </>
            )}

            {res.tool === 'forecast_demand' && res.forecast && (
              <>
                <ChartRenderer
                  chart={{ type: 'line', xKey: 'period', yKeys: ['value'], title: 'Demand forecast' }}
                  rows={res.forecast.series.map((p) => ({
                    period: p.period,
                    value: p.value,
                    kind: p.kind,
                  }))}
                />
                <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Inventory recommendation</p>
                  <p>{res.forecast.inventoryRecommendation.rationale}</p>
                  <p className="text-muted-foreground">
                    Method: {res.forecast.method}. {res.forecast.explanation}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
