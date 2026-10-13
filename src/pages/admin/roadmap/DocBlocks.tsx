import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { DocBlock, DocSection, DocSource } from "./doc-types";

const CALLOUT_STYLE = {
  info: { box: "border-sky-500/30 bg-sky-500/[0.06] text-sky-100", icon: Info },
  warn: { box: "border-amber-500/30 bg-amber-500/[0.06] text-amber-100", icon: AlertTriangle },
  ok: { box: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-100", icon: CheckCircle2 },
} as const;

export function DocTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 print:overflow-visible">
      <table className="w-full min-w-[560px] text-left text-xs print:min-w-0">
        <thead className="bg-zinc-900 text-zinc-400"><tr>{columns.map(column => <th key={column} className="p-2.5 font-semibold">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-zinc-800 align-top">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-2.5 text-zinc-300 whitespace-pre-line">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm leading-relaxed text-zinc-300">{block.text}</p>;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return <List className={`space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-300 ${block.ordered ? "list-decimal" : "list-disc"}`}>{block.items.map(item => <li key={item}>{item}</li>)}</List>;
    }
    case "table":
      return <DocTable columns={block.columns} rows={block.rows} />;
    case "formula":
      return <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-emerald-200 whitespace-pre-wrap">{block.lines.join("\n")}</pre>;
    case "callout": {
      const style = CALLOUT_STYLE[block.tone];
      const Icon = style.icon;
      return (
        <div className={`flex gap-3 rounded-lg border p-3 text-sm leading-relaxed ${style.box}`}>
          <Icon size={16} className="mt-0.5 shrink-0" />
          <div>{block.title && <p className="font-semibold">{block.title}</p>}<p>{block.text}</p></div>
        </div>
      );
    }
  }
}

export function DocSectionView({ section, index }: { section: DocSection; index: number }) {
  return (
    <section id={section.id} className="scroll-mt-24 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 print:break-inside-avoid-page print:border-zinc-300">
      <h2 className="text-base font-bold text-white">{index + 1}. {section.title}</h2>
      {section.blocks.map((block, blockIndex) => <DocBlockView key={blockIndex} block={block} />)}
    </section>
  );
}

export function DocToc({ sections }: { sections: { id: string; title: string }[] }) {
  return (
    <nav aria-label="İçindekiler" className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 print:hidden">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">İçindekiler</p>
      <ol className="grid gap-1 text-sm sm:grid-cols-2">{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="text-zinc-300 hover:text-indigo-300">{index + 1}. {section.title}</a></li>)}</ol>
    </nav>
  );
}

export function DocSources({ sources }: { sources: DocSource[] }) {
  return (
    <ul className="space-y-1.5 text-xs text-zinc-400">
      {sources.map(source => (
        <li key={source.label}>
          {source.url ? <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-indigo-300 underline-offset-2 hover:underline">{source.label}</a> : <span className="text-zinc-300">{source.label}</span>}
          {source.note && <span> — {source.note}</span>}
        </li>
      ))}
    </ul>
  );
}
