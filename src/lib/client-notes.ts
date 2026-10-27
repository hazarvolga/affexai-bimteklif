/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { PipelineStage } from "@/types";

export type ClientStageKey =
  | "lead"
  | "contacted"
  | "quotation_sent"
  | "negotiation"
  | "won"
  | "lost";

export interface ClientStageNote {
  id: string;
  stage: ClientStageKey;
  content: string;
  createdAt: string;
  author?: string;
}

export interface StageMeta {
  id: ClientStageKey;
  pipelineStage: PipelineStage;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  dotClass: string;
}

export const CLIENT_STAGE_LIST: readonly StageMeta[] = [
  {
    id: "lead",
    pipelineStage: PipelineStage.NEW_LEAD,
    label: "Potansiyel",
    shortLabel: "Potansiyel",
    description: "İlk temas öncesi aday müşteri ve kaynak bilgileri",
    badgeClass: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
    dotClass: "bg-zinc-400",
  },
  {
    id: "contacted",
    pipelineStage: PipelineStage.CONTACTED,
    label: "Görüşüldü",
    shortLabel: "Görüşüldü",
    description: "İlk telefon, toplantı, şantiye ziyareti ve ihtiyaç tespiti notları",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dotClass: "bg-orange-400",
  },
  {
    id: "quotation_sent",
    pipelineStage: PipelineStage.PROPOSAL_SENT,
    label: "Teklifli",
    shortLabel: "Teklifli",
    description: "Sunulan teklif kapsamı, alternatif pozlar ve teslim şartları",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-400",
  },
  {
    id: "negotiation",
    pipelineStage: PipelineStage.NEGOTIATION,
    label: "Pazarlık",
    shortLabel: "Pazarlık",
    description: "Revize talepleri, iskonto, ödeme planı ve sözleşme müzakereleri",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dotClass: "bg-purple-400",
  },
  {
    id: "won",
    pipelineStage: PipelineStage.WON,
    label: "Kazanıldı",
    shortLabel: "Kazanıldı",
    description: "Onaylanan sözleşme, iş programı ve hakediş başlangıç notları",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  {
    id: "lost",
    pipelineStage: PipelineStage.LOST,
    label: "Kaybedildi",
    shortLabel: "Kaybedildi",
    description: "Kaybedilme nedeni, rakip fiyat seviyesi ve gelecek proje dersleri",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-400",
  },
] as const;

export const CLIENT_STAGE_MAP: Record<ClientStageKey, StageMeta> = {
  lead: CLIENT_STAGE_LIST[0],
  contacted: CLIENT_STAGE_LIST[1],
  quotation_sent: CLIENT_STAGE_LIST[2],
  negotiation: CLIENT_STAGE_LIST[3],
  won: CLIENT_STAGE_LIST[4],
  lost: CLIENT_STAGE_LIST[5],
};

export function normalizeClientStageKey(raw: string | null | undefined): ClientStageKey {
  if (!raw) return "lead";
  const clean = raw.trim().toLowerCase();
  if (clean === "new_lead" || clean === "lead") return "lead";
  if (clean === "contacted") return "contacted";
  if (clean === "proposal_sent" || clean === "quotation_sent") return "quotation_sent";
  if (clean === "negotiation") return "negotiation";
  if (clean === "won") return "won";
  if (clean === "lost") return "lost";
  return "lead";
}

const NOTE_LINE_REGEX =
  /^\[\[STAGE_NOTE\|stage=([a-z_]+)\|at=([^|\]]+)(?:\|id=([^|\]]+))?(?:\|by=([^|\]]+))?\]\]\s*(.*)$/;

function escapeNoteContent(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n/g, "\\n").trim();
}

function unescapeNoteContent(text: string): string {
  return text.replace(/\\n/g, "\n").trim();
}

/**
 * `clients.notes` alanındaki yapılandırılmış aşama notlarını ve eski düz metin notları
 * kronolojik (en yeni üstte) listeye dönüştürür.
 */
export function parseClientNotes(
  rawNotes: string | null | undefined,
  fallbackStage: string = "lead",
  fallbackDate?: string | number,
): ClientStageNote[] {
  if (!rawNotes || !rawNotes.trim()) return [];
  const fallbackIso =
    typeof fallbackDate === "number"
      ? new Date(fallbackDate).toISOString()
      : fallbackDate;
  const lines = rawNotes.replace(/\r\n/g, "\n").split("\n");
  const parsed: ClientStageNote[] = [];
  const plainLines: string[] = [];

  for (const line of lines) {
    const match = line.match(NOTE_LINE_REGEX);
    if (match) {
      const [, rawStage, rawAt, rawId, rawBy, rawContent] = match;
      const content = unescapeNoteContent(rawContent);
      if (content) {
        parsed.push({
          id: rawId || `note-${parsed.length + 1}`,
          stage: normalizeClientStageKey(rawStage),
          createdAt: rawAt || fallbackIso || new Date().toISOString(),
          author: rawBy ? decodeURIComponent(rawBy) : undefined,
          content,
        });
      }
    } else if (line.trim()) {
      plainLines.push(line.trim());
    }
  }

  if (plainLines.length > 0) {
    parsed.push({
      id: "legacy-note-0",
      stage: normalizeClientStageKey(fallbackStage),
      createdAt: fallbackIso || new Date(0).toISOString(),
      content: plainLines.join("\n"),
    });
  }

  return parsed;
}

export function getLatestClientStageNote(
  rawNotes: string | null | undefined,
  fallbackStage: string = "lead",
): ClientStageNote | null {
  const list = parseClientNotes(rawNotes, fallbackStage);
  return list.length > 0 ? list[0] : null;
}

/**
 * Aşama notu listesini `clients.notes` sütununa kaydedilecek metne dönüştürür.
 */
export function serializeClientNotes(notes: readonly ClientStageNote[]): string {
  return notes
    .filter((n) => n.content && n.content.trim().length > 0)
    .map((n) => {
      const stage = normalizeClientStageKey(n.stage);
      const at = n.createdAt || new Date().toISOString();
      const id = (n.id || "note").replace(/[|\]]/g, "");
      const byPart = n.author ? `|by=${encodeURIComponent(n.author)}` : "";
      return `[[STAGE_NOTE|stage=${stage}|at=${at}|id=${id}${byPart}]] ${escapeNoteContent(n.content)}`;
    })
    .join("\n");
}

/**
 * Mevcut `clients.notes` metnine yeni bir aşama notu ekler.
 */
export function appendClientStageNote(
  existingRawNotes: string | null | undefined,
  newNote: {
    stage: string;
    content: string;
    author?: string;
    createdAt?: string;
    id?: string;
  },
  fallbackStage: string = "lead",
): string {
  const existing = parseClientNotes(existingRawNotes, fallbackStage);
  const entry: ClientStageNote = {
    id: newNote.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage: normalizeClientStageKey(newNote.stage),
    content: newNote.content.trim(),
    createdAt: newNote.createdAt || new Date().toISOString(),
    author: newNote.author,
  };
  return serializeClientNotes([entry, ...existing]);
}

/**
 * Excel / CSV dışa aktarımında notları okunabilir düz metin olarak biçimlendirir.
 */
export function formatClientNotesForExport(
  rawNotes: string | null | undefined,
  fallbackStage: string = "lead",
): string {
  const notes = parseClientNotes(rawNotes, fallbackStage);
  if (notes.length === 0) return "";
  return notes
    .map((n) => {
      const stageLabel = CLIENT_STAGE_MAP[n.stage]?.label ?? "Not";
      const dateStr = n.createdAt ? new Date(n.createdAt).toLocaleDateString("tr-TR") : "";
      const prefix = dateStr ? `[${stageLabel} - ${dateStr}]` : `[${stageLabel}]`;
      return `${prefix} ${n.content.replace(/\n+/g, " ")}`;
    })
    .join(" | ");
}
