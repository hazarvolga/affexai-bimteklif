/** Lap (splice) length helpers for the Academy reinforcement simulator. Teaching aids, not design tools. */

const GAMMA_C = 1.5;
const FYK_B420C = 420;
const GAMMA_S = 1.15;

export interface Ts500LapInput {
  fck: number;
  barDiameterMm: number;
  bond: "good" | "poor";
  /** Share of bars spliced at the same section (r in TS 500 9.2.5): 0..1. */
  splicedRatio: number;
}

/**
 * TS 500:2000 Eq. 9.1: lb = 0.12 · (fyd / fctd) · φ ≥ 20φ for ribbed B420C bars,
 * ×1.4 in poor bond (Konum I). Tension lap l0 = α1 · lb with α1 = 1 + 0.5r.
 */
export function ts500LapLength({ fck, barDiameterMm, bond, splicedRatio }: Ts500LapInput) {
  const fctd = (0.35 * Math.sqrt(fck)) / GAMMA_C;
  const fyd = FYK_B420C / GAMMA_S;
  const basic = Math.max(0.12 * (fyd / fctd) * barDiameterMm, 20 * barDiameterMm);
  const lbMm = bond === "poor" ? basic * 1.4 : basic;
  const alpha1 = 1 + 0.5 * Math.min(1, Math.max(0, splicedRatio));
  return { lbMm, alpha1, l0Mm: Math.round(alpha1 * lbMm) };
}

export interface Ec2DemoLapInput {
  fctk: number;
  barDiameterMm: number;
  bond: "good" | "poor";
  force: "low" | "medium" | "high";
}

/** Simplified EN 1992-1-1 8.4/8.7 demo with fixed steel stress levels (previous simulator behaviour). */
export function ec2DemoLapLength({ fctk, barDiameterMm, bond, force }: Ec2DemoLapInput): number {
  const fctd = fctk / GAMMA_C;
  const fbd = 2.25 * (bond === "good" ? 1.0 : 0.7) * fctd;
  const sigmaSd = { low: 150, medium: 300, high: 435 }[force];
  const lbrqd = (barDiameterMm / 4) * (sigmaSd / fbd);
  const alpha6 = 1.5;
  const l0 = alpha6 * lbrqd;
  const lmin = Math.max(0.3 * alpha6 * lbrqd, 15 * barDiameterMm, 200);
  return Math.round(Math.max(l0, lmin));
}
