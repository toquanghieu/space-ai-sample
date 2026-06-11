/**
 * LLMs sometimes emit nested object fields as dotted top-level keys
 * (e.g. `"filters.dateFrom"` instead of `filters: { dateFrom }`). This recovers
 * the intended nested structure before schema validation, merging when both the
 * nested object and a dotted key are present.
 */
export function unflattenLlmArgs(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(unflattenLlmArgs);
  if (!input || typeof input !== 'object') return input;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const value = unflattenLlmArgs(raw);
    const parts = key.split('.');
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (typeof cursor[p] !== 'object' || cursor[p] === null || Array.isArray(cursor[p])) {
        cursor[p] = {};
      }
      cursor = cursor[p] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1];
    const existing = cursor[last];
    const bothObjects =
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value);
    cursor[last] = bothObjects ? { ...(existing as object), ...(value as object) } : value;
  }
  return out;
}
