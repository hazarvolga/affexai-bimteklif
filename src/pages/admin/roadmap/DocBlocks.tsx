import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { DocBlock, DocSection, DocSource } from "./doc-types";

const CALLOUT_STYLE = {
  info: { box: "border-sky-500/30 bg-sky-500/[0.06] text-sky-100", icon: Info },
  warn: { box: "border-amber-500/30 bg-amber-500/[0.06] text-amber-100", icon: AlertTriangle },
  ok: { box: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-100", icon: CheckCircle2 },
} as const;

export function DocTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border print:overflow-visible">
      <table className="w-full min-w-[560px] text-left text-xs print:min-w-0">
        <thead className="bg-card text-muted-foreground"><tr>{columns.map(column => <th key={column} className="p-2.5 font-semibold">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border align-top">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-2.5 text-foreground dark:text-muted-foreground whitespace-pre-line">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm leading-relaxed text-foreground dark:text-muted-foreground">{block.text}</p>;
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return <List className={`space-y-1.5 pl-5 text-sm leading-relaxed text-foreground dark:text-muted-foreground ${block.ordered ? "list-decimal" : "list-disc"}`}>{block.items.map(item => <li key={item}>{item}</li>)}</List>;
    }
    case "table":
      return <DocTable columns={block.columns} rows={block.rows} />;
    case "formula":
      return <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-emerald-200 whitespace-pre-wrap">{block.lines.join("\n")}</pre>;
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
    <section id={section.id} className="scroll-mt-24 space-y-3 rounded-xl border border-border bg-card p-5 print:break-inside-avoid-page print:border-zinc-300">
      <h2 className="text-base font-bold text-foreground">{index + 1}. {section.title}</h2>
      {section.blocks.map((block, blockIndex) => <DocBlockView key={blockIndex} block={block} />)}
    </section>
  );
}

export function DocToc({ sections }: { sections: { id: string; title: string }[] }) {
  return (
    <nav aria-label="İçindekiler" className="rounded-xl border border-border bg-card p-4 print:hidden">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">İçindekiler</p>
      <ol className="grid gap-1 text-sm sm:grid-cols-2">{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="text-foreground dark:text-muted-foreground hover:text-indigo-300">{index + 1}. {section.title}</a></li>)}</ol>
    </nav>
  );
}

export function DocSources({ sources }: { sources: DocSource[] }) {
  return (
    <ul className="space-y-1.5 text-xs text-muted-foreground">
      {sources.map(source => (
        <li key={source.label}>
          {source.url ? <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-indigo-300 underline-offset-2 hover:underline">{source.label}</a> : <span className="text-foreground dark:text-muted-foreground">{source.label}</span>}
          {source.note && <span> — {source.note}</span>}
        </li>
      ))}
    </ul>
  );
}
