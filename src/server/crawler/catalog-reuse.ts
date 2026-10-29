type Observation = Readonly<{ itemCode: string; unit: string; crawledPrice: string | number }>;
type Imported = Readonly<{ itemCode: string; unit: string; price: string | number }>;

function priceKey(code: string, unit: string, value: string | number): string | null {
  const price = Number(value);
  // NaN does not equal itself under the previous comparison semantics.
  return Number.isNaN(price) ? null : JSON.stringify([code, unit, String(price)]);
}

/** Same semantics as rows.every(...some(...)), with one lookup per row. */
export function containsEveryImportedPrice(imported: readonly Imported[], current: readonly Observation[]): boolean {
  const keys = new Set<string>();
  for (const row of current) {
    const key = priceKey(row.itemCode, row.unit, row.crawledPrice);
    if (key !== null) keys.add(key);
  }
  return imported.every(row => {
    const key = priceKey(row.itemCode, row.unit, row.price);
    return key !== null && keys.has(key);
  });
}
