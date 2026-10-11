/** Bounded STEP unit resolver. Unsupported/ambiguous declarations fail closed. */
export function volumeUnitResolver(text: string): (reference?: string) => number | null {
  const entities = new Map<string, { type: string; args: string }>();
  for (const match of text.matchAll(/#(\d+)\s*=\s*(IFC[A-Z0-9]+)\s*\(([^;]*)\);/gi)) {
    const type = match[2].toUpperCase();
    if (['IFCSIUNIT', 'IFCCONVERSIONBASEDUNIT', 'IFCMEASUREWITHUNIT', 'IFCUNITASSIGNMENT', 'IFCPROJECT'].includes(type)) {
      entities.set(`#${match[1]}`, { type, args: match[3] });
    }
  }
  const prefixes: Record<string, number> = { '$': 1, MILLI: .001, CENTI: .01, DECI: .1, KILO: 1000,
    MICRO: 1e-6, NANO: 1e-9, MEGA: 1e6, GIGA: 1e9, HECTO: 100, DECA: 10,
    TERA: 1e12, PETA: 1e15, EXA: 1e18, PICO: 1e-12, FEMTO: 1e-15, ATTO: 1e-18 };
  const scale = (ref: string, seen: string[] = []): number | null => {
    if (seen.includes(ref) || seen.length > 16) return null;
    const entity = entities.get(ref);
    if (!entity || !entity.args.includes('.VOLUMEUNIT.')) return null;
    if (entity.type === 'IFCSIUNIT') {
      const match = entity.args.match(/\.VOLUMEUNIT\.\s*,\s*(\$|\.[A-Z]+\.)\s*,\s*\.CUBIC_METRE\./i);
      const prefix = match?.[1].replace(/\./g, '').toUpperCase();
      return prefix && prefix in prefixes ? prefixes[prefix] ** 3 : null;
    }
    if (entity.type !== 'IFCCONVERSIONBASEDUNIT') return null;
    const factorRef = entity.args.match(/,\s*(#[0-9]+)\s*$/)?.[1];
    const factor = factorRef ? entities.get(factorRef) : undefined;
    const match = factor?.args.match(/^\s*IFC(?:VOLUMEMEASURE|REAL)\(([-+0-9.Ee]+)\)\s*,\s*(#\d+)\s*$/i);
    if (factor?.type !== 'IFCMEASUREWITHUNIT' || !match) return null;
    const base = scale(match[2], [...seen, ref]);
    const value = Number(match[1]);
    return base !== null && Number.isFinite(value) && value > 0 ? base * value : null;
  };
  const projectRefs = [...entities.values()].filter(e => e.type === 'IFCPROJECT')
    .map(e => e.args.match(/,\s*(#\d+)\s*$/)?.[1]).filter((r): r is string => Boolean(r));
  const assignments = projectRefs.length ? projectRefs.map(r => entities.get(r))
    : [...entities.values()].filter(e => e.type === 'IFCUNITASSIGNMENT');
  const refs = assignments.flatMap(e => [...(e?.args ?? '').matchAll(/#\d+/g)].map(m => m[0]))
    .filter(r => entities.get(r)?.args.includes('.VOLUMEUNIT.'));
  const scales = refs.map(r => scale(r));
  const distinct = new Set(scales);
  const defaultScale = assignments.length === 0 ? 1 : distinct.size === 1 && scales.length ? scales[0] : null;
  return reference => reference && reference !== '$' ? scale(reference) : defaultScale;
}
