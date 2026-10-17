#!/usr/bin/env node
/**
 * Tasarım token göçü (Denetim P2-1 / UI-1).
 *
 * `src/index.css` içindeki "Teknik Borç Önleyici Köprü" sabit zinc/slate sınıflarını çalışma anında pafta
 * token'larına çevirir. Bu betik AYNI eşlemeyi kaynağa uygular; görünüm değişmez, sınıflar gerçek token olur:
 *   bg-zinc-950 / slate-950      -> bg-background
 *   bg-zinc-900 / slate-900      -> bg-card
 *   bg-zinc-800 / slate-800      -> bg-surface-elevated
 *   border-zinc-800|700, slate-200|300, divide-zinc-800 -> border-border / divide-border
 *   text-white, zinc/slate 50-200 -> text-foreground      (doymuş bg-* taşıyan öğede text-white korunur)
 *   text-zinc/slate 300           -> text-foreground dark:text-muted-foreground
 *   text-zinc/slate 400-600       -> text-muted-foreground
 * Yalnız ön eksiz (hover:, md: ... olmayan) sınıflar çevrilir; renkli vurgu sınıflarına (indigo, emerald, amber...)
 * dokunulmaz.
 *
 * Kullanım:  node scripts/migrate-design-tokens.mjs [--dry] <dosya...>
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const files = args.filter(arg => !arg.startsWith('--'));

const BOUNDARY_BEFORE = '(?<![\\w:\\[./-])';
const BOUNDARY_AFTER = '(?![\\w-])';
const OPACITY = '(?:/\\d{1,3})?';
const rules = [
  [`bg-(?:zinc|slate)-950${OPACITY}`, 'bg-background'],
  [`bg-(?:zinc|slate)-900${OPACITY}`, 'bg-card'],
  [`bg-(?:zinc|slate)-800${OPACITY}`, 'bg-surface-elevated'],
  [`border-(?:zinc-800|zinc-700|slate-200|slate-300)${OPACITY}`, 'border-border'],
  [`divide-zinc-800${OPACITY}`, 'divide-border'],
  [`text-(?:zinc|slate)-(?:50|100|200)`, 'text-foreground'],
  // Köprüde -300 açık modda mürekkep, koyu modda soluk mürekkeptir.
  [`text-(?:zinc|slate)-300`, 'text-foreground dark:text-muted-foreground'],
  [`text-(?:zinc|slate)-(?:400|500|600)`, 'text-muted-foreground'],
];
const SATURATED_BG = /(?<![\w:[./-])bg-(?:indigo|emerald|red|rose|amber|sky|blue|violet|green|purple|orange|teal|cyan|yellow|fuchsia|pink)-[5-9]00/;
const textWhite = new RegExp(`${BOUNDARY_BEFORE}text-white${BOUNDARY_AFTER}`, 'g');
const compiled = rules.map(([pattern, replacement]) => [new RegExp(`${BOUNDARY_BEFORE}${pattern}${BOUNDARY_AFTER}`, 'g'), replacement]);

/** Sınıf listesi içeren her string parçası (", ', `) ayrı ele alınır; `${}` içindeki dallar ayrı parçadır. */
const STRING_SEGMENT = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

export function migrateSource(source) {
  let count = 0;
  const out = source.replace(STRING_SEGMENT, (whole, quote, body) => {
    if (!/\b(?:bg|text|border|divide)-/.test(body)) return whole;
    let next = body;
    for (const [regex, replacement] of compiled) next = next.replace(regex, () => { count += 1; return replacement; });
    if (!SATURATED_BG.test(next)) next = next.replace(textWhite, () => { count += 1; return 'text-foreground'; });
    return `${quote}${next}${quote}`;
  });
  return { out, count };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let total = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const { out, count } = migrateSource(source);
    total += count;
    if (count) console.log(`${dry ? '[dry] ' : ''}${file}: ${count}`);
    if (!dry && out !== source) fs.writeFileSync(file, out);
  }
  console.log(`${dry ? '[dry] ' : ''}toplam ${total} sınıf`);
}
