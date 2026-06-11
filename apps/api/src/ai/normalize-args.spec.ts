import { unflattenLlmArgs } from './normalize-args';

describe('unflattenLlmArgs', () => {
  it('un-flattens dotted keys into nested objects', () => {
    const out = unflattenLlmArgs({
      metrics: ['delayed_count'],
      'filters.dateFrom': '2025-10-01',
      'filters.dateTo': '2025-12-30',
    });
    expect(out).toEqual({
      metrics: ['delayed_count'],
      filters: { dateFrom: '2025-10-01', dateTo: '2025-12-30' },
    });
  });

  it('merges a nested object with sibling dotted keys', () => {
    const out = unflattenLlmArgs({
      filters: { status: ['delayed'] },
      'filters.dateFrom': '2025-10-01',
    });
    expect(out).toEqual({ filters: { status: ['delayed'], dateFrom: '2025-10-01' } });
  });

  it('leaves already-nested args untouched', () => {
    const input = { metrics: ['order_count'], filters: { carrier: ['UPS'] } };
    expect(unflattenLlmArgs(input)).toEqual(input);
  });
});
