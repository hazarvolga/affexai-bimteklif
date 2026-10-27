import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/app/arsa-fizibilitesi" });
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
const { PreBimFeasibilityPanel } = await import("./PreBimFeasibilityPanel");

async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

test("an untouched feasibility form shows a hint, and checks start once a value is entered or cleared back", async () => {
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(MemoryRouter, null, React.createElement(PreBimFeasibilityPanel))); });
  const section = container.querySelector('[data-testid="pre-bim-feasibility"]')!;
  assert.equal(section.getAttribute("data-touched"), "false");
  assert.ok(container.querySelector('[data-testid="feasibility-untouched"]'));
  assert.doesNotMatch(container.textContent ?? "", /Arsa alanı pozitif olmalı/, "no errors for fields nobody has filled yet");

  const name = container.querySelector<HTMLInputElement>('input[placeholder="ad"]')!;
  await type(name, "Ada 101 Parsel 5");
  assert.equal(section.getAttribute("data-touched"), "true");
  assert.match(container.textContent ?? "", /Arsa alanı pozitif olmalı/, "missing area is reported once the user starts");
  assert.equal(container.querySelector('[data-testid="feasibility-untouched"]'), null);

  await type(name, "");
  assert.equal(section.getAttribute("data-touched"), "false", "an emptied form is quiet again");
  await act(async () => root.unmount());
});
