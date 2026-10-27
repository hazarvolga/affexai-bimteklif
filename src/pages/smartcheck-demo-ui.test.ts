import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/smartcheck" });
const globals = globalThis as Record<string, unknown>;
globals.IS_REACT_ACT_ENVIRONMENT = true;
globals.window = dom.window;
globals.document = dom.window.document;
globals.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const key of ["HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Node", "Element", "Event", "MouseEvent"] as const) {
  globals[key] = dom.window[key];
}

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { SmartCheckDemoProvider } = await import("@/smartcheck/SmartCheckDemoContext");
const { SmartCheckDemo } = await import("./SmartCheckDemo");

async function mount(path: string) {
  window.localStorage.clear();
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      React.createElement(MemoryRouter, { initialEntries: [path] },
        React.createElement(SmartCheckDemoProvider, null, React.createElement(SmartCheckDemo))),
    );
  });
  return { container, unmount: () => act(async () => root.unmount()) };
}

async function click(element: Element | null) {
  assert.ok(element, "element to click");
  await act(async () => { (element as HTMLElement).click(); });
}

test("the public demo opens with the problem, not with a re-check, and walks one finding in five steps", async () => {
  const { container, unmount } = await mount("/smartcheck");
  assert.ok(container.querySelector('[data-testid="demo-intro"]'));
  assert.doesNotMatch(container.textContent ?? "", /Yeniden Kontrol|Re-check/i, "no re-check before anything was fixed");
  assert.equal(container.querySelector('[data-testid="demo-recheck"]'), null);

  const steps = [...container.querySelectorAll("[data-demo-step] h3")].map((h) => h.textContent?.trim());
  assert.deepEqual(steps, ["1. Problem", "2. Kaynak satırı", "3. Bulgu", "4. Öneri", "5. Teklife etkisi"]);
  await unmount();
});

test("the unit example explains the quantity change, not only the unit label (M-10.4)", async () => {
  const { container, unmount } = await mount("/smartcheck");
  const detail = container.querySelector('[data-testid="demo-finding-detail"]')!;
  assert.match(detail.textContent ?? "", /Mevcut: 120,00 m² · Beklenen: 24,00 m³/);
  assert.match(detail.textContent ?? "", /120,00 m² × 0,20 m = 24,00 m³/);
  assert.match(detail.textContent ?? "", /5 kat yüksek/);

  await click(container.querySelector('[data-testid="demo-apply-fix"]'));
  const recheck = container.querySelector('[data-testid="demo-recheck"]');
  assert.ok(recheck, "re-check is offered only after a fix");
  await act(async () => {
    (recheck as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 700));
  });
  assert.match(container.querySelector('[data-demo-finding="finding-a"]')?.textContent ?? "", /Çözüldü/);
  assert.match(container.querySelector('[data-testid="demo-finding-detail"]')?.textContent ?? "", /Düzeltilmiş: 24,00 m³ · Önceki: 120,00 m²/);
  assert.match(container.textContent ?? "", /1\/3 çözüldü/);
  await unmount();
});

test("visitors return to the home page and are offered sign-up; signed-in users go back to SmartCheck (M-10.6)", async () => {
  const publicPage = await mount("/smartcheck");
  assert.equal(publicPage.container.querySelector('[data-testid="demo-back-link"]')?.getAttribute("href"), "/");
  const publicLinks = [...publicPage.container.querySelectorAll('[data-testid="demo-try-own-file"] a')].map((a) => a.getAttribute("href"));
  assert.deepEqual(publicLinks, ["/register", "/"]);
  assert.doesNotMatch(publicPage.container.innerHTML, /href="\/app\/smartcheck"/, "no link that would force a login");
  await publicPage.unmount();

  const inApp = await mount("/app/smartcheck/checks/demo");
  assert.equal(inApp.container.querySelector('[data-testid="demo-back-link"]')?.getAttribute("href"), "/app/smartcheck");
  const appLinks = [...inApp.container.querySelectorAll('[data-testid="demo-try-own-file"] a')].map((a) => a.getAttribute("href"));
  assert.deepEqual(appLinks, ["/app/smartcheck"]);
  await inApp.unmount();
});
