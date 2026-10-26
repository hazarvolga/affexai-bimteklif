import assert from "node:assert/strict";
import { File as NodeFile } from "node:buffer";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/app/fiyat-katalogu" });
const globals = globalThis as Record<string, unknown>;
globals.IS_REACT_ACT_ENVIRONMENT = true;
globals.window = dom.window;
globals.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const key of ["HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLButtonElement", "Node", "Element", "Event", "MouseEvent"] as const) {
  globals[key] = dom.window[key];
}

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { PriceCatalog } = await import("@/pages/PriceCatalog");
const { MissingPriceActions } = await import("@/components/smartcheck/MissingPriceActions");

type FetchCall = { url: string; method: string; body: unknown };

function installFetch(respond: (call: FetchCall) => Response) {
  const calls: FetchCall[] = [];
  globals.fetch = async (input: string | URL, init: RequestInit = {}) => {
    const call = { url: String(input), method: (init.method ?? "GET").toUpperCase(), body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(call);
    return respond(call);
  };
  return calls;
}

async function flush(ms = 20) {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
}

async function mount(element: React.ReactElement, entry = "/app/fiyat-katalogu") {
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(MemoryRouter, { initialEntries: [entry] }, element)); });
  await flush();
  return { container, unmount: () => act(async () => root.unmount()) };
}

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof dom.window.HTMLSelectElement ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new dom.window.Event(element instanceof dom.window.HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
  assert.ok(match, `button "${label}"`);
  return match as HTMLButtonElement;
}

async function click(element: HTMLElement) {
  await act(async () => { element.click(); });
  await flush();
}

test("an empty catalogue walks the five wizard steps and saves a reviewed, VAT-explicit, approved list", async () => {
  const calls = installFetch((call) => {
    if (call.method === "POST") return Response.json({ source: { id: "s1" }, snapshots: [{ reviewStatus: "approved" }, { reviewStatus: "approved" }] }, { status: 201 });
    return Response.json(calls.some((previous) => previous.method === "POST")
      ? [{ id: "p1", positionCode: "15.150.1006", description: "C30 beton", unit: "m³", amount: "3450", currency: "TRY", vatStatus: "excluded", vatPercent: "20.00", validUntil: "2026-12-31T20:59:59Z", stale: false }]
      : []);
  });
  const { container, unmount } = await mount(React.createElement(PriceCatalog), "/app/fiyat-katalogu?kaynak=smartcheck");
  assert.ok(container.querySelector('[data-testid="price-catalog-wizard"]'), "empty catalogue opens the wizard");
  assert.equal(container.querySelectorAll("[data-wizard-step]").length, 5);

  await click(button(container, "Dosyam hazır"));
  const input = container.querySelector<HTMLInputElement>("#price-catalog-file")!;
  const csv = new NodeFile(["Poz No;Açıklama;Birim;Birim Fiyat;Para Birimi\n15.150.1006;C30 beton;m³;3.450,00;TRY\n;Kalıp;götürü;650;USD"], "fiyatlar.csv", { type: "text/csv" });
  Object.defineProperty(input, "files", { value: [csv], configurable: true });
  await act(async () => { input.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await flush(60);

  const columns = container.querySelector('[data-testid="price-catalog-columns"]')!;
  assert.match(columns.textContent ?? "", /2 fiyat satırı okundu/);
  assert.match(columns.querySelector('[data-column-field="currency"]')?.textContent ?? "", /Para Birimi/);
  assert.match(columns.querySelector('[data-column-field="validUntil"]')?.textContent ?? "", /Yok \(isteğe bağlı\)/);
  await click(button(container, "Sütunlar doğru"));

  const review = container.querySelector('[data-testid="price-catalog-review"]')!;
  assert.match(review.textContent ?? "", /tanınmayan birim/);
  assert.match(container.querySelector('[data-testid="price-catalog-warnings"]')?.textContent ?? "", /TL dışında/);
  assert.equal(button(container, "İnceledim").disabled, true, "a VAT rate must be chosen, none is assumed");
  await act(async () => { setValue(container.querySelector<HTMLSelectElement>("#price-catalog-vat")!, "20"); });
  await act(async () => { setValue(container.querySelector<HTMLInputElement>("#price-catalog-valid-until")!, "2026-12-31"); });
  await click(button(container, "İnceledim"));

  assert.equal(button(container, "Fiyatları onayla ve kaydet").disabled, true, "ownership must be confirmed");
  await click(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button(container, "Fiyatları onayla ve kaydet"));
  await flush(40);

  const post = calls.find((call) => call.method === "POST")!;
  assert.equal(post.url, "/api/pricing/catalog/import");
  assert.deepEqual(
    (({ sourceType, reviewDecision, vatStatus, vatPercent, sourceName }) => ({ sourceType, reviewDecision, vatStatus, vatPercent, sourceName }))(post.body as Record<string, unknown>),
    { sourceType: "company_actual", reviewDecision: "approved", vatStatus: "excluded", vatPercent: "20", sourceName: "fiyatlar" },
  );
  assert.equal((post.body as { rows: Array<{ validUntil?: string }> }).rows[0].validUntil?.startsWith("2026-12-31"), true);
  assert.match(container.querySelector('[data-testid="price-catalog-imported"]')?.textContent ?? "", /2 fiyat onaylandı.*SmartCheck'e dön/s);
  assert.match(container.querySelector('[data-testid="price-catalog-list"]')?.textContent ?? "", /Hariç · %20/);
  await unmount();
});

test("a catalogue with prices lists them and keeps the wizard behind a button; an unexpected response shows an error", async () => {
  installFetch(() => Response.json([{ id: "p1", positionCode: null, description: "Kalıp", unit: "m²", amount: "650", currency: "TRY", vatStatus: "unknown", vatPercent: null, validUntil: "2026-01-01T00:00:00Z", stale: true }]));
  const filled = await mount(React.createElement(PriceCatalog));
  assert.equal(filled.container.querySelector('[data-testid="price-catalog-wizard"]'), null);
  assert.match(filled.container.textContent ?? "", /Belirtilmemiş/);
  assert.match(filled.container.textContent ?? "", /süresi dışında/);
  await click(button(filled.container, "Yeni fiyat listesi ekle"));
  assert.ok(filled.container.querySelector('[data-testid="price-catalog-wizard"]'));
  await filled.unmount();

  installFetch(() => Response.json({ snapshots: [] }));
  const broken = await mount(React.createElement(PriceCatalog));
  assert.match(broken.container.textContent ?? "", /Katalog yüklenemedi/);
  await broken.unmount();
});

test("a missing-price line offers price entry or a catalogue match, and an unresolved poz goes to review", async () => {
  const calls = installFetch(() => Response.json({ source: { id: "s1" }, snapshots: [{ reviewStatus: "approved" }] }, { status: 201 }));
  const events: string[] = [];
  const item = { id: "cov-mermer", title: "Mermer_B1", pozCode: "15.390.1101", unit: "m²" };
  const candidate = { snapshot: { id: "snap-9", amount: "1200", currency: "TRY", sourceDocumentHash: "h", positionCode: "15.390.1101", description: "Mermer kaplama", unit: "m2" }, source: { id: "s9", name: "Katalog" }, warnings: ["LOW_CONFIDENCE"] };
  const { container, unmount } = await mount(React.createElement(MissingPriceActions, {
    item, candidate,
    onPriceAdded: () => events.push("added"),
    onUseCandidate: (bound: { snapshot: { id: string } }) => events.push(`bound:${bound.snapshot.id}`),
    onReviewItem: () => events.push("review"),
  }));
  await click(button(container, "Katalogdaki fiyatı eşleştir"));
  assert.deepEqual(events, ["bound:snap-9"]);
  await click(button(container, "Firma fiyatı ekle"));
  const form = container.querySelector(`[data-testid="missing-price-form-${item.id}"]`)!;
  await act(async () => { setValue(form.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!, "1.250,00"); });
  await act(async () => { setValue(form.querySelector<HTMLSelectElement>("select")!, "20"); });
  assert.equal(button(container, "Kaydet").disabled, true, "ownership is confirmed explicitly");
  await click(form.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  await click(button(container, "Kaydet"));
  await flush(40);
  assert.deepEqual(events, ["bound:snap-9", "added"]);
  const body = calls[0].body as { rows: Array<{ amount: number; positionCode: string }>; reviewDecision: string; vatPercent: string };
  assert.deepEqual([body.rows[0].amount, body.rows[0].positionCode, body.reviewDecision, body.vatPercent], [1250, "15.390.1101", "approved", "20"]);
  await unmount();

  const unresolved = await mount(React.createElement(MissingPriceActions, {
    item: { ...item, pozCode: "UNRESOLVED:mermer" }, candidate: null,
    onPriceAdded: () => undefined, onUseCandidate: () => undefined, onReviewItem: () => events.push("review"),
  }));
  assert.equal(unresolved.container.querySelector('[data-missing-price-action="add_price"]'), null);
  await click(button(unresolved.container, "Uzman incelemesine al"));
  assert.equal(events.at(-1), "review");
  await unresolved.unmount();
});
