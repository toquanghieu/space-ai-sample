'use client';
import { useRef, useState } from 'react';
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
  // Monotonic id so a slow earlier request can't overwrite a newer answer.
  const requestId = useRef(0);

  async function run(question: string) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const answer = await ask(question);
      if (id === requestId.current) setRes(answer);
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      if (id === requestId.current) setLoading(false);
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
          aria-label="Ask a question about the logistics data"
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
            type="button"
            disabled={loading}
            onClick={() => {
              setQ(s);
              run(s);
            }}
            className="rounded-full border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
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
                  chart={{
                    type: 'line',
                    xKey: 'period',
                    yKeys: res.forecast.seriesKeys,
                    title: 'Demand forecast',
                  }}
                  rows={res.forecast.rows}
                  referenceLineX={res.forecast.forecastStartPeriod}
                />
                <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">
                    Inventory recommendation{res.forecast.groups.length > 1 ? 's' : ''}
                  </p>
                  <div className="max-h-48 space-y-1 overflow-auto">
                    {res.forecast.groups.map((g) => (
                      <p key={g.key}>{g.recommendation.rationale}</p>
                    ))}
                  </div>
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
