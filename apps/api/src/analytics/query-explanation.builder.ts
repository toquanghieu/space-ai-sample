import type { QuerySpec, QueryExplanation, Dimension } from '@logi/shared';

/**
 * Builder pattern: assembles a {@link QueryExplanation} (the explainability
 * payload) from a QuerySpec and result, keeping the human-readable
 * interpretation logic out of the analytics service (SRP).
 */
export class QueryExplanationBuilder {
  private spec!: QuerySpec;
  private dimensions: Dimension[] = [];
  private rowCount = 0;

  fromSpec(spec: QuerySpec): this {
    this.spec = spec;
    return this;
  }

  withDimensions(dimensions: Dimension[]): this {
    this.dimensions = dimensions;
    return this;
  }

  withRowCount(rowCount: number): this {
    this.rowCount = rowCount;
    return this;
  }

  private interpret(): string {
    const s = this.spec;
    const parts: string[] = [`Compute ${s.metrics.join(', ')}`];
    if (s.groupBy?.length) parts.push(`grouped by ${s.groupBy.join(', ')}`);
    if (s.timeGrain) parts.push(`bucketed by ${s.timeGrain}`);

    const f = s.filters ?? {};
    const fp: string[] = [];
    if (f.status) fp.push(`status in [${f.status.join(', ')}]`);
    if (f.carrier) fp.push(`carrier in [${f.carrier.join(', ')}]`);
    if (f.region) fp.push(`region in [${f.region.join(', ')}]`);
    if (f.product_category) fp.push(`category in [${f.product_category.join(', ')}]`);
    if (f.sku) fp.push(`sku in [${f.sku.join(', ')}]`);
    if (typeof f.is_promo === 'boolean') fp.push(`is_promo = ${f.is_promo}`);
    if (f.dateFrom || f.dateTo) fp.push(`order_date ${f.dateFrom ?? '…'}..${f.dateTo ?? '…'}`);
    if (fp.length) parts.push(`where ${fp.join(' and ')}`);

    return parts.join(' ') + '.';
  }

  build(): QueryExplanation {
    return {
      interpretation: this.interpret(),
      metrics: this.spec.metrics,
      dimensions: this.dimensions,
      timeGrain: this.spec.timeGrain,
      filtersApplied: this.spec.filters ?? {},
      rowCount: this.rowCount,
    };
  }
}
