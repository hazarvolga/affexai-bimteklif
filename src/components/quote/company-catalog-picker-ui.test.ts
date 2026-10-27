import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/app/quotes/new" });
const globals = globalThis as Record<string, unknown>;
globals.IS_REACT_ACT_ENVIRONMENT = true;
globals.window = dom.window;
globals.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const key of ["HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Node", "Element", "Event", "MouseEvent"] as const) {
  globals[key] = dom.window[key];
}

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { CompanyCatalogPicker } = await import("./CompanyCatalogPicker");
const pick = await import("@/lib/price-catalog-pick");
type CatalogSnapshot = import("@/lib/price-catalog-pick").CatalogSnapshot;

const row = (overrides: Partial<CatalogSnapshot>): CatalogSnapshot => ({
  id: crypto.randomUUID(), positionCode: "15.150.1006", description: "C30/37 hazır beton", unit: "m³", amount: "2500.0000",
  currency: "TRY", vatStatus: "excluded", vatPercent: "20.00", validUntil: null, stale: false, ...overrides,
});
const CATALOG = [
  row({ id: "beton" }),
  row({ id: "kalip", positionCode: "21.011", description: "Ahşap kalıp", unit: "m²", amount: "450.0000" }),
  row({ id: "eski", description: "Süresi dolmuş fiyat", stale: true }),
  row({ id: "dahil", description: "KDV dahil fiyat", vatStatus: "included", vatPercent: null }),
  row({ id: "euro", description: "Euro fiyat", currency: "EUR" }),
  row({ id: "kusurat", description: "Dört haneli kuruş", amount: "12.3450" }),
];

test("only rows the server can bind are pickable", () => {
  assert.deepEqual(CATALOG.filter((snapshot) => pick.catalogPickable(snapshot, "TRY")).map((snapshot) => snapshot.id), ["beton", "kalip"]);
  assert.deepEqual(pick.searchCatalog(CATALOG.slice(0, 2), "21.0").map((snapshot) => snapshot.id), ["kalip"]);
  assert.deepEqual(pick.searchCatalog(CATALOG.slice(0, 2), "BETON").map((snapshot) => snapshot.id), ["beton"]);
});

test("a picked row carries the snapshot link, the catalogue price and VAT", () => {
  const item = pick.catalogQuoteItem(CATALOG[0]);
  assert.equal(item.priceSnapshotId, "beton");
  assert.equal(item.unitPrice, 2500);
  assert.equal(item.vatPercent, 20);
  assert.equal(item.unit, "m³");
  assert.equal(item.sourceReference, "15.150.1006");
});

test("editing quantity or description keeps the link; editing price, unit or VAT drops it", () => {
  const item = pick.catalogQuoteItem(CATALOG[0]);
  assert.equal(pick.applyLineEdit(item, { quantity: 24 }).priceSnapshotId, "beton");
  assert.equal(pick.applyLineEdit(item, { description: "Perde duvar betonu" }).priceSnapshotId, "beton", "the poz code still identifies the row");
  assert.equal(pick.applyLineEdit(item, { unitPrice: 2500 }).priceSnapshotId, "beton", "same value is not an edit");
  for (const updates of [{ unitPrice: 2600 }, { unit: "m²" }, { vatPercent: 10 }]) {
    const edited = pick.applyLineEdit(item, updates);
    assert.equal(edited.priceSnapshotId, undefined);
    assert.equal(edited.priceSource, "manual");
    assert.equal(edited.sourceReference, null);
  }
  const uncoded = pick.catalogQuoteItem(row({ id: "kodsuz", positionCode: null }));
  assert.equal(pick.applyLineEdit(uncoded, { description: "Başka kalem" }).priceSnapshotId, undefined, "without a poz code the description identifies the row");
});

test("the picker loads the approved catalogue on demand, hides unusable rows and returns the picked row", async () => {
  const urls: string[] = [];
  globals.fetch = async (input: string | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify(CATALOG), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const picked: CatalogSnapshot[] = [];
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CompanyCatalogPicker, { currency: "TRY", onPick: (snapshot) => picked.push(snapshot) })));
  });
  assert.equal(urls.length, 0, "nothing is fetched until the user opens the catalogue");

  await act(async () => { (container.querySelector('[data-testid="company-catalog-toggle"]') as HTMLElement).click(); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.match(urls[0], /\/api\/pricing\/snapshots\?status=approved/);
  assert.deepEqual([...container.querySelectorAll("[data-catalog-row]")].map((element) => element.getAttribute("data-catalog-row")), ["beton", "kalip"]);
  assert.match(container.textContent ?? "", /4 fiyat listelenmedi/);

  const add = container.querySelector('[data-catalog-row="kalip"] button') as HTMLElement;
  await act(async () => { add.click(); });
  assert.deepEqual(picked.map((snapshot) => snapshot.id), ["kalip"]);
  await act(async () => root.unmount());
});

test("an empty catalogue points to the price catalogue page", async () => {
  globals.fetch = async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CompanyCatalogPicker, { currency: "TRY", onPick: () => undefined })));
  });
  await act(async () => { (container.querySelector('[data-testid="company-catalog-toggle"]') as HTMLElement).click(); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  assert.equal(container.querySelector('[data-testid="company-catalog-empty"] a')?.getAttribute("href"), "/app/fiyat-katalogu?kaynak=teklif");
  await act(async () => root.unmount());
});
