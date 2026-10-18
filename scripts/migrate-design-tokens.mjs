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

const BOUNDARY_BEFORE = '(?<![\\w\\[./:-])';
const BOUNDARY_AFTER = '(?![\\w-])';
const OPACITY = '(?:/\\d{1,3})?';
const PREFIX = '(?:((?:(?:hover|focus|focus-visible|group-hover|active|disabled|dark|sm|md|lg|xl|print):)+))?';
const NEUTRAL = '(?:zinc|slate|neutral)';

const rules = [
  // Placeholder
  [`placeholder:text-${NEUTRAL}-(?:100|200|300|400|500|600|700|800|900)`, (pfx) => `${pfx}placeholder:text-muted-foreground`],

  // Arka planlar
  [`bg-${NEUTRAL}-950${OPACITY}`, (pfx) => `${pfx}bg-background`],
  [`bg-${NEUTRAL}-900${OPACITY}`, (pfx) => `${pfx}bg-card`],
  [`bg-${NEUTRAL}-800${OPACITY}`, (pfx) => `${pfx}bg-surface-elevated`],
  [`bg-${NEUTRAL}-700${OPACITY}`, (pfx) => `${pfx}bg-surface-elevated`],
  [`bg-${NEUTRAL}-(?:50|100)${OPACITY}`, (pfx) => `${pfx}bg-card`],
  [`bg-${NEUTRAL}-200${OPACITY}`, (pfx) => `${pfx}bg-muted`],
  [`bg-${NEUTRAL}-(?:500|600)${OPACITY}`, (pfx) => `${pfx}bg-muted-foreground`],

  // Çerçeveler, bölücüler ve halkalar
  [`border-${NEUTRAL}-(?:100|150|200|300|400|500|600|700|800|900|950)${OPACITY}`, (pfx) => `${pfx}border-border`],
  [`divide-${NEUTRAL}-(?:100|150|200|300|400|500|600|700|800|900|950)${OPACITY}`, (pfx) => `${pfx}divide-border`],
  [`ring-${NEUTRAL}-(?:100|200|300|400|500|600|700|800|900|950)${OPACITY}`, (pfx) => `${pfx}ring-border`],

  // Gradyanlar
  [`from-${NEUTRAL}-(?:900|950)${OPACITY}`, (pfx) => `${pfx}from-background`],
  [`via-${NEUTRAL}-(?:900|950)${OPACITY}`, (pfx) => `${pfx}via-background`],
  [`to-${NEUTRAL}-(?:900|950)${OPACITY}`, (pfx) => `${pfx}to-background`],
  [`to-${NEUTRAL}-800${OPACITY}`, (pfx) => `${pfx}to-card`],

  // Metinler
  [`text-${NEUTRAL}-(?:50|100|200|700|800|900|950)`, (pfx) => `${pfx}text-foreground`],
  [`text-${NEUTRAL}-300`, (pfx) => {
    if (!pfx) return 'text-foreground dark:text-muted-foreground';
    if (pfx.includes('dark:')) return `${pfx}text-muted-foreground`;
    return `${pfx}text-foreground`;
  }],
  [`text-${NEUTRAL}-(?:400|500|600)`, (pfx) => `${pfx}text-muted-foreground`],

  // Mikro metinler (< 10px WCAG ihlali)
  [`text-\\[(?:7|8|9)px\\]`, (pfx) => `${pfx}text-[10px]`],
];

const SATURATED_BG = /(?<![\w:[./-])bg-(?:indigo|emerald|red|rose|amber|sky|blue|violet|green|purple|orange|teal|cyan|yellow|fuchsia|pink)-[5-9]00/;
const textWhite = new RegExp(`${BOUNDARY_BEFORE}${PREFIX}text-white${BOUNDARY_AFTER}`, 'g');
const compiled = rules.map(([pattern, fn]) => [
  new RegExp(`${BOUNDARY_BEFORE}${PREFIX}(?:${pattern})${BOUNDARY_AFTER}`, 'g'),
  fn,
]);

/** Sınıf listesi içeren her string parçası (", ', `) ayrı ele alınır; `${}` içindeki dallar ayrı parçadır. */
const STRING_SEGMENT = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

export function migrateSource(source) {
  let count = 0;
  let next = source;

  for (const [regex, fn] of compiled) {
    next = next.replace(regex, (match, pfx) => {
      count += 1;
      return fn(pfx || '');
    });
  }

  // text-white: yalnız doymuş arka plan taşımayan parçalarda text-foreground'a çevrilir
  next = next.replace(STRING_SEGMENT, (whole, quote, body) => {
    if (!/\btext-white\b/.test(body) || SATURATED_BG.test(body)) return whole;
    const replaced = body.replace(textWhite, (match, pfx) => {
      count += 1;
      return (pfx || '') + 'text-foreground';
    });
    return `${quote}${replaced}${quote}`;
  });

  return { out: next, count };
}

function collectFiles(targets) {
  const fileList = [];
  for (const t of targets) {
    if (!fs.existsSync(t)) continue;
    const stat = fs.statSync(t);
    if (stat.isDirectory()) {
      const items = fs.readdirSync(t);
      for (const item of items) {
        const fullPath = `${t}/${item}`;
        if (fullPath.includes('src/pages/admin/roadmap') || fullPath.includes('src/academy/reference')) continue;
        fileList.push(...collectFiles([fullPath]));
      }
    } else if (/\.(tsx|ts|jsx|js|html)$/.test(t)) {
      if (!t.includes('src/pages/admin/roadmap') && !t.includes('src/academy/reference') && !t.endsWith('.test.ts') && !t.endsWith('.test.tsx')) {
        fileList.push(t);
      }
    }
  }
  return fileList;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let total = 0;
  const allFiles = collectFiles(files);
  for (const file of allFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const { out, count } = migrateSource(source);
    total += count;
    if (count) console.log(`${dry ? '[dry] ' : ''}${file}: ${count}`);
    if (!dry && out !== source) fs.writeFileSync(file, out);
  }
  console.log(`${dry ? '[dry] ' : ''}toplam ${total} sınıf`);
}
