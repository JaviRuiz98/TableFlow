import { vi } from 'vitest';

export type QueryResult = { data: unknown; error: unknown };

/**
 * Thenable PostgREST-style builder used across feature service specs.
 * Chain methods return `this`; awaiting the builder resolves `result`.
 */
export function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder['select'] = vi.fn(self);
  builder['insert'] = vi.fn(self);
  builder['update'] = vi.fn(self);
  builder['delete'] = vi.fn(self);
  builder['eq'] = vi.fn(self);
  builder['neq'] = vi.fn(self);
  builder['order'] = vi.fn(self);
  builder['limit'] = vi.fn(self);
  builder['maybeSingle'] = vi.fn(() => Promise.resolve(result));
  builder['single'] = vi.fn(() => Promise.resolve(result));
  builder['then'] = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}
