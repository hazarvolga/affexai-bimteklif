import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { MAX_SNAPSHOT_ENTRIES, MAX_SNAPSHOT_VALUE_LENGTH, expertFeedbackInput } from "./contract";
import { SNAPSHOT_TRUNCATED_KEY, toFeedbackSnapshot } from "./snapshot";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://bimmetraj.com/hesaplayicilar/kik-asiri-dusuk-teklif" });
const globals = globalThis as Record<string, unknown>;
globals.IS_REACT_ACT_ENVIRONMENT = true;
globals.window = dom.window;
globals.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
for (const key of ["HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLButtonElement", "HTMLFormElement", "Node", "Element", "Event", "MouseEvent"] as const) {
  globals[key] = dom.window[key];
}

const React = await import("react");
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { AuthContext } = await import("@/hooks/useAuth");
const { CalculationFeedback } = await import("./CalculationFeedback");

test("snapshot flattens nested form state into bounded scalar entries the API accepts", () => {
  const snapshot = toFeedbackSnapshot({
    ym: "100.000.000",
    bids: "95.000.000\n91.500.000\r\n88.000.000",
    rows: [{ code: "A", weight: 0.28 }, { code: "B", weight: Number.NaN }],
    flags: { verified: true, missing: undefined, when: new Date("2026-10-26T00:00:00Z") },
    callback: () => undefined,
  });
  assert.deepEqual(snapshot, {
    ym: "100.000.000",
    bids: "95.000.000 | 91.500.000 | 88.000.000",
    "rows.0.code": "A",
    "rows.0.weight": 0.28,
    "rows.1.code": "B",
    "rows.1.weight": "NaN",
    "flags.verified": true,
    "flags.when": "2026-10-26T00:00:00.000Z",
  });
  assert.equal(expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "correct", shareSnapshot: true, inputs: snapshot }).success, true);
});

test("snapshot never exceeds the API limits and says how many fields were left out", () => {
  const wide = Object.fromEntries(Array.from({ length: MAX_SNAPSHOT_ENTRIES + 15 }, (_, index) => [`k${index}`, "x".repeat(MAX_SNAPSHOT_VALUE_LENGTH + 50)]));
  const snapshot = toFeedbackSnapshot(wide)!;
  assert.equal(Object.keys(snapshot).length, MAX_SNAPSHOT_ENTRIES);
  assert.equal(snapshot[SNAPSHOT_TRUNCATED_KEY], 16);
  const values = Object.entries(snapshot).filter(([key]) => key !== SNAPSHOT_TRUNCATED_KEY).map(([, value]) => value);
  assert.ok(values.every(value => typeof value === "string" && value.length === MAX_SNAPSHOT_VALUE_LENGTH));
  assert.equal(expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "unsure", shareSnapshot: true, inputs: snapshot }).success, true);
  assert.equal(toFeedbackSnapshot(null), undefined);
  assert.equal(toFeedbackSnapshot({}), undefined);
});

test("snapshot keeps a whole price-escalation form with several index rows", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ indexCode: `I${index}`, weight: "0,05", baseIndex: "100", currentIndex: "130" }));
  const snapshot = toFeedbackSnapshot({ progressPayment: "1.000.000", bFactor: "0,90", constantWeight: "0,15", rows })!;
  assert.equal(snapshot[SNAPSHOT_TRUNCATED_KEY], undefined);
  assert.equal(snapshot["rows.11.currentIndex"], "130");
});

test("keys cut to the length limit do not overwrite each other", () => {
  const long = "a".repeat(120);
  const snapshot = toFeedbackSnapshot({ [`${long}1`]: 1, [`${long}2`]: 2 })!;
  assert.deepEqual(Object.values(snapshot), [1, 2]);
  assert.ok(Object.keys(snapshot).every(key => key.length <= 80));
});

type FetchCall = { url: string; init: RequestInit };

function authValue(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: "u1", email: "uzman@example.test", fullName: "Uzman", emailVerified: "2026-10-01T00:00:00Z" },
    company: null, role: "owner", accountType: "workspace", learnerProfile: null, loading: false, isDemoMode: false,
    login: () => undefined, logout: () => undefined, exitImpersonation: () => undefined,
    ...overrides,
  } as never;
}

async function mount(auth: unknown, respond: (call: FetchCall) => Response = () => Response.json({ reference: "ref-42", status: "accepted" }, { status: 202 })) {
  const calls: FetchCall[] = [];
  globals.fetch = async (url: string, init: RequestInit) => { const call = { url, init }; calls.push(call); return respond(call); };
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  const root = createRoot(container);
  const element = React.createElement(
    MemoryRouter,
    { initialEntries: ["/hesaplayicilar/kik-asiri-dusuk-teklif"] },
    React.createElement(AuthContext.Provider, { value: auth as never },
      React.createElement(CalculationFeedback, { engineId: "kik_adt", inputs: { ym: "100" }, result: { sinirDegerTry: 80 } })),
  );
  await act(async () => { root.render(element); });
  return { container, calls, unmount: () => act(() => root.unmount()) };
}

const buttonByText = (container: HTMLElement, text: string) => {
  const button = [...container.querySelectorAll("button")].find(candidate => candidate.textContent?.trim() === text);
  assert.ok(button, `button "${text}" not found`);
  return button;
};
async function click(element: Element) { await act(async () => { element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); }); }
async function type(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")!.set!;
  await act(async () => { setter.call(element, value); element.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
}
async function submit(container: HTMLElement) {
  await act(async () => { container.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
}

test("feedback stays hidden for anonymous visitors, outside AuthProvider and in demo mode", async () => {
  for (const auth of [undefined, authValue({ user: null }), authValue({ isDemoMode: true })]) {
    const view = await mount(auth);
    assert.equal(view.container.querySelector("[data-testid='expert-feedback']"), null);
    await view.unmount();
  }
});

test("a correct verdict is sent without inputs or results unless sharing is ticked", async () => {
  const view = await mount(authValue());
  await click(buttonByText(view.container, "Evet, tutuyor"));
  assert.equal(buttonByText(view.container, "Evet, tutuyor").getAttribute("aria-pressed"), "true");
  await submit(view.container);
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0].url, "/api/expert-feedback");
  const body = JSON.parse(String(view.calls[0].init.body));
  assert.deepEqual(body, { engineId: "kik_adt", verdict: "correct", note: "", expectedValue: "", pagePath: "/hesaplayicilar/kik-asiri-dusuk-teklif", shareSnapshot: false });
  assert.match(view.container.textContent ?? "", /Teşekkürler.*Referans: ref-42/s);
  await view.unmount();
});

test("an incorrect verdict requires a note and shares values only after consent", async () => {
  const view = await mount(authValue());
  await click(buttonByText(view.container, "Hayır, tutmuyor"));
  const send = buttonByText(view.container, "Geri bildirimi gönder");
  assert.equal(send.disabled, true, "note is required before sending");
  await type(view.container.querySelector("textarea")!, "K katsayısı farklı");
  await type(view.container.querySelector("input:not([type='checkbox'])") as HTMLInputElement, "812.400,00");
  await click(view.container.querySelector("input[type='checkbox']")!);
  assert.equal(buttonByText(view.container, "Geri bildirimi gönder").disabled, false);
  await submit(view.container);
  const body = JSON.parse(String(view.calls[0].init.body));
  assert.equal(body.verdict, "incorrect");
  assert.equal(body.note, "K katsayısı farklı");
  assert.equal(body.expectedValue, "812.400,00");
  assert.equal(body.shareSnapshot, true);
  assert.deepEqual(body.inputs, { ym: "100" });
  assert.deepEqual(body.result, { sinirDegerTry: 80 });
  await view.unmount();
});

test("a development-mode receipt is not presented as delivered", async () => {
  const view = await mount(authValue(), () => Response.json({ reference: "ref-dev", status: "development" }, { status: 202 }));
  await click(buttonByText(view.container, "Emin değilim"));
  await submit(view.container);
  const text = view.container.textContent ?? "";
  assert.match(text, /e-posta gönderilmedi/);
  assert.doesNotMatch(text, /iletildi/);
  await view.unmount();
});

test("general feedback button is not offered without a real session", async () => {
  const { GeneralFeedbackButton } = await import("./GeneralFeedbackButton");
  for (const [auth, visible] of [[undefined, false], [authValue({ user: null }), false], [authValue({ isDemoMode: true }), false], [authValue(), true]] as const) {
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: auth as never }, React.createElement(GeneralFeedbackButton))));
    });
    assert.equal(container.querySelector("button") !== null, visible);
    await act(() => root.unmount());
  }
});

test("server errors are shown to the expert and the form stays editable", async () => {
  const view = await mount(authValue(), () => Response.json({ error: "Geri bildirim kanalı şu anda kapalı.", code: "EXPERT_FEEDBACK_UNAVAILABLE" }, { status: 503 }));
  await click(buttonByText(view.container, "Emin değilim"));
  await submit(view.container);
  assert.equal(view.container.querySelector("[role='alert']")?.textContent, "Geri bildirim kanalı şu anda kapalı.");
  assert.ok(buttonByText(view.container, "Geri bildirimi gönder"));
  await view.unmount();
});
