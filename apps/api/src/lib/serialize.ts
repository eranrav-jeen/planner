type Decimalish = { toNumber: () => number };

function isDecimalish(value: unknown): value is Decimalish {
  return typeof value === 'object' && value !== null && typeof (value as Decimalish).toNumber === 'function';
}

export function serializeDecimals<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(serializeDecimals) as unknown as T;
  }
  if (isDecimalish(value)) {
    return value.toNumber() as unknown as T;
  }
  if (value instanceof Date) {
    return value as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = serializeDecimals(val);
    }
    return out as T;
  }
  return value;
}
