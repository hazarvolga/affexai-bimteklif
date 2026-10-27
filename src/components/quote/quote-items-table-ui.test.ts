import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/app/quotes/new" });
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
const { QuoteItemsTable, missingCost } = await import("./QuoteItemsTable");

const ITEMS = [
  { id: "a", description: "C30 beton", unit: "m3", quantity: 12.5, unitPrice: 3450, costUnitPrice: 3000, discountPercent: 5, vatPercent: 20, total: 40968.75 },
  { id: "b", description: "Kalıp", unit: "m2", quantity: 100, unitPrice: 650, costUnitPrice: null, discountPercent: 0, vatPercent: 20, total: 65000 },
];

async function mount(onUpdate: (id: string, updates: Record<string, unknown>) => void = () => undefined) {
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(QuoteItemsTable, { items: ITEMS, currency: "TRY", onUpdate, onRemove: () => undefined }));
  });
  return { container, unmount: () => act(async () => root.unmount()) };
}

const headers = (container: HTMLElement) => [...container.querySelectorAll("thead th")].map((cell) => cell.textContent?.trim()).filter(Boolean);

async function click(element: Element) {
  await act(async () => { (element as HTMLElement).click(); });
}

test("the basic view shows five columns and keeps cost, waste, discount and VAT in each row's detail", async () => {
  window.localStorage.removeItem("bimmetraj:quote-table-view:v1");
  const updates: Array<[string, Record<string, unknown>]> = [];
  const { container, unmount } = await mount((id, update) => updates.push([id, update]));
  assert.deepEqual(headers(container), ["İş Kalemi", "Birim", "Miktar", "Birim Fiyat", "Tutar (KDV hariç)", "İşlemler"]);
  assert.equal(container.querySelector('[data-testid="quote-items-table"]')?.getAttribute("data-view"), "basic");
  assert.match(container.querySelector('[data-quote-row="a"]')?.textContent ?? "", /%5 iskonto/, "a discount stays visible without opening the row");
  const toggleB = container.querySelector('[data-row-detail-toggle="b"]')!;
  assert.match(toggleB.textContent ?? "", /Maliyet eksik/, "a missing cost is named on the row, not hidden");
  assert.match(container.querySelector('[data-row-detail-toggle="a"]')?.textContent ?? "", /Ayrıntı/);
  assert.equal(missingCost(ITEMS[1]), true);

  await click(toggleB);
  const detail = container.querySelector('[data-row-detail="b"]')!;
  assert.ok(detail, "row detail opens under the row");
  const cost = detail.querySelector<HTMLInputElement>('input[aria-label="Maliyet birim fiyatı"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(cost, "540");
    cost.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  assert.deepEqual(updates.at(-1), ["b", { costUnitPrice: 540 }]);
  await click(toggleB);
  assert.equal(container.querySelector('[data-row-detail="b"]'), null, "the same button closes it");
  await unmount();
});

test("the detailed view shows every column and is remembered in this browser", async () => {
  window.localStorage.removeItem("bimmetraj:quote-table-view:v1");
  const first = await mount();
  await click(first.container.querySelector('[data-table-view="detailed"]')!);
  assert.deepEqual(headers(first.container), ["İş Kalemi", "Kategori", "Birim", "Miktar", "Birim Fiyat", "Maliyet Birim", "Zayiat %", "İsk. %", "KDV %", "Tutar (KDV hariç)", "İşlemler"]);
  assert.equal(first.container.querySelector("[data-row-detail-toggle]"), null, "no row detail in the detailed view");
  await first.unmount();
  const second = await mount();
  assert.equal(second.container.querySelector('[data-testid="quote-items-table"]')?.getAttribute("data-view"), "detailed");
  await second.unmount();
  window.localStorage.removeItem("bimmetraj:quote-table-view:v1");
});
