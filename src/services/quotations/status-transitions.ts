type QuotationStatus = "draft" | "sent" | "negotiation" | "won" | "lost" | "archived";

/** A closed quotation does not reopen silently: won only archives, lost can return to negotiation. */
const ALLOWED_TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  draft: ["sent", "negotiation", "won", "lost", "archived"],
  sent: ["negotiation", "won", "lost", "archived"],
  negotiation: ["sent", "won", "lost", "archived"],
  won: ["archived"],
  lost: ["negotiation", "archived"],
  archived: [],
};

export function canChangeQuotationStatus(from: QuotationStatus, to: QuotationStatus): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}
