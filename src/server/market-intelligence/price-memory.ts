export type PriceMemorySample = {
  amount: number;
  positionCode: string | null;
  description: string;
  unit: string;
  region: string | null;
};

export type SupplierPriceEvaluation = {
  baselineCount: number;
  baselineMedian: number | null;
  relativeDelta: number | null;
  outlierScore: number | null;
  outlierStatus: "normal" | "outlier" | "insufficient_data";
  confidence: number;
};

export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function normalized(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function matchesSample(sample: PriceMemorySample, entry: { positionCode: string | null; description: string; unit: string; region: string | null }) {
  if (sample.unit !== entry.unit) return false;
  if (entry.region && sample.region && normalized(entry.region) !== normalized(sample.region)) return false;
  if (entry.positionCode && sample.positionCode) return entry.positionCode === sample.positionCode;
  return normalized(sample.description) === normalized(entry.description);
}

export function evaluateSupplierPrice(
  amount: number,
  entry: { positionCode: string | null; description: string; unit: string; region: string | null },
  samples: PriceMemorySample[],
  metadataCompleteness = 0,
): SupplierPriceEvaluation {
  const baseline = samples.filter((sample) => matchesSample(sample, entry));
  const baselineAmounts = baseline.map((sample) => sample.amount);
  const baselineMedian = median(baselineAmounts);
  const baseConfidence = Math.min(0.65, 0.35 + Math.max(0, Math.min(0.3, metadataCompleteness)));
  if (baseline.length < 3 || baselineMedian === null) {
    return { baselineCount: baseline.length, baselineMedian, relativeDelta: baselineMedian === null ? null : (amount - baselineMedian) / Math.max(baselineMedian, 0.01), outlierScore: null, outlierStatus: "insufficient_data", confidence: Number(baseConfidence.toFixed(2)) };
  }
  const deviations = baselineAmounts.map((value) => Math.abs(value - baselineMedian));
  const mad = median(deviations) ?? 0;
  const scale = Math.max(mad * 1.4826, baselineMedian * 0.05, 0.01);
  const outlierScore = Math.abs(amount - baselineMedian) / scale;
  const relativeDelta = (amount - baselineMedian) / Math.max(baselineMedian, 0.01);
  const outlierStatus = outlierScore >= 3.5 && Math.abs(relativeDelta) >= 0.2 ? "outlier" : "normal";
  const confidence = Math.min(0.98, baseConfidence + 0.2 + (outlierStatus === "normal" ? 0.1 : 0));
  return { baselineCount: baseline.length, baselineMedian, relativeDelta, outlierScore: Number(outlierScore.toFixed(3)), outlierStatus, confidence: Number(confidence.toFixed(2)) };
}

export function summarizePriceMemory(samples: PriceMemorySample[]) {
  const amounts = samples.map((sample) => sample.amount);
  const average = amounts.length ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : null;
  return {
    count: samples.length,
    median: median(amounts),
    average: average === null ? null : Number(average.toFixed(2)),
    min: amounts.length ? Math.min(...amounts) : null,
    max: amounts.length ? Math.max(...amounts) : null,
  };
}
