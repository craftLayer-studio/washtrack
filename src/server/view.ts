/** Convert Date fields to epoch ms so server data can be passed to client components. */
export type Plain<T> = T extends Date
  ? number
  : T extends (infer U)[]
    ? Plain<U>[]
    : T extends object
      ? { [K in keyof T]: Plain<T[K]> }
      : T;

export function plain<T>(value: T): Plain<T> {
  if (value instanceof Date) return value.getTime() as Plain<T>;
  if (Array.isArray(value)) return value.map(plain) as Plain<T>;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = plain(v);
    return out as Plain<T>;
  }
  return value as Plain<T>;
}
