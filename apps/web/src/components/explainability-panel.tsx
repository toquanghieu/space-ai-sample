import type { QueryResult } from '@logi/shared';
import { labelFor } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Surfaces the explainability contract required by the spec: the query plan
 * (interpretation), metrics/dimensions/filters used, and access to the
 * underlying computed rows.
 */
export function ExplainabilityPanel({ result }: { result: QueryResult }) {
  const e = result.explanation;
  const cols = result.rows[0] ? Object.keys(result.rows[0]) : [];
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      <p className="font-medium">How this was computed</p>
      <p className="text-muted-foreground">{e.interpretation}</p>
      <div className="flex flex-wrap gap-1">
        {e.metrics.map((m) => (
          <Badge key={m} variant="secondary">
            metric: {labelFor(m)}
          </Badge>
        ))}
        {e.dimensions.map((d) => (
          <Badge key={d} variant="outline">
            dim: {labelFor(d)}
          </Badge>
        ))}
        {e.timeGrain && <Badge variant="outline">grain: {e.timeGrain}</Badge>}
        {Object.entries(e.filtersApplied).map(([k, v]) => (
          <Badge key={k} variant="outline">
            {k}: {Array.isArray(v) ? v.join('|') : String(v)}
          </Badge>
        ))}
        <Badge variant="secondary">{e.rowCount} rows</Badge>
      </div>
      {cols.length > 0 && (
        <div className="max-h-64 overflow-auto rounded border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c}>{labelFor(c)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.slice(0, 50).map((r, i) => (
                <TableRow key={cols.map((c) => r[c]).join('|') || i}>
                  {cols.map((c) => {
                    const v = r[c];
                    return (
                      <TableCell key={c} className="tabular-nums">
                        {typeof v === 'number' ? Number(v.toFixed(2)) : v}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
