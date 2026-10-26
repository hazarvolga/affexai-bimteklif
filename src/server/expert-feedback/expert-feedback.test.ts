import assert from "node:assert/strict";
import test from "node:test";
import { renderTransactionalEmail } from "../auth/email-templates";
import { EmailDeliveryError } from "../auth/email-policy";
import { authenticate, requireVerifiedEmail } from "../middleware/auth";
import { registerExpertFeedbackRoutes } from "../routes/expert-feedback";
import {
  buildFeedbackDetailRows,
  EXPERT_FEEDBACK_REVIEW_PATH,
  ExpertFeedbackUnavailableError,
  resolveFeedbackRecipient,
  sendExpertFeedback,
} from "./delivery";
import { MAX_SNAPSHOT_ENTRIES, expertFeedbackInput, type ExpertFeedback } from "../../features/expert-feedback/contract";

const actor = { userId: "22222222-2222-4222-8222-222222222222", email: "uzman@example.test", companyId: "11111111-1111-4111-8111-111111111111", role: "owner" };
const smtpEnv = { NODE_ENV: "production", AUTH_EMAIL_DELIVERY_MODE: "smtp", PUBLIC_APP_URL: "https://bimmetraj.com/", EXPERT_FEEDBACK_EMAIL: "hazar@example.test" };
const fixedNow = () => new Date("2026-10-26T10:00:00.000Z");
const fixedReference = () => "ref-0001";

function feedback(overrides: Partial<ExpertFeedback> = {}): ExpertFeedback {
  return expertFeedbackInput.parse({ engineId: "kik_adt", verdict: "correct", ...overrides });
}

test("input accepts a minimal verdict and fills safe defaults", () => {
  assert.deepEqual(feedback(), {
    engineId: "kik_adt", verdict: "correct", note: "", expectedValue: "", calcVersion: "", pagePath: "", shareSnapshot: false,
  });
});

test("input rejects unknown engines, unknown fields, control characters and oversize text", () => {
  for (const body of [
    {},
    { engineId: "unknown", verdict: "correct" },
    { engineId: "kik_adt", verdict: "maybe" },
    { engineId: "kik_adt", verdict: "correct", companyId: actor.companyId },
    { engineId: "kik_adt", verdict: "correct", expectedValue: "1\n2" },
    { engineId: "kik_adt", verdict: "correct", note: "a\u0000b" },
    { engineId: "kik_adt", verdict: "correct", note: "x".repeat(2001) },
    { engineId: "kik_adt", verdict: "correct", pagePath: "https://evil.test" },
  ]) {
    assert.equal(expertFeedbackInput.safeParse(body).success, false, JSON.stringify(body));
  }
});

test("input keeps line breaks in notes", () => {
  assert.equal(feedback({ verdict: "unsure", note: "  satır 1\nsatır 2  " }).note, "satır 1\nsatır 2");
});

test("an incorrect verdict needs an explanation", () => {
  const parsed = expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "incorrect" });
  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.error?.issues[0]?.path, ["note"]);
});

test("inputs and results are only accepted with explicit sharing consent", () => {
  const withoutConsent = expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "correct", inputs: { ym: 100 } });
  assert.equal(withoutConsent.success, false);
  const withConsent = expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "correct", shareSnapshot: true, inputs: { ym: 100 }, result: { sinir: 80.5 } });
  assert.equal(withConsent.success, true);
});

test("snapshots are bounded in size and value shape", () => {
  const tooMany = Object.fromEntries(Array.from({ length: MAX_SNAPSHOT_ENTRIES + 1 }, (_, index) => [`k${index}`, index]));
  for (const inputs of [tooMany, { nested: { a: 1 } }, { list: [1, 2] }, { "": 1 }, { infinite: Number.POSITIVE_INFINITY }]) {
    assert.equal(expertFeedbackInput.safeParse({ engineId: "kik_adt", verdict: "correct", shareSnapshot: true, inputs }).success, false, JSON.stringify(inputs));
  }
});

test("recipient must be one plain address", () => {
  assert.equal(resolveFeedbackRecipient({ EXPERT_FEEDBACK_EMAIL: " hazar@example.test " }), "hazar@example.test");
  for (const value of [undefined, "", "not-an-email", "a@b.test,c@d.test", "a@b.test\nBcc: x@y.test"]) {
    assert.equal(resolveFeedbackRecipient({ EXPERT_FEEDBACK_EMAIL: value }), null, String(value));
  }
});

test("detail rows omit inputs and results unless sharing was approved", () => {
  const approved = buildFeedbackDetailRows(
    feedback({ shareSnapshot: true, inputs: { ym: 1000 }, result: { sinir: 800 } }), actor, "ref-0001", fixedNow(),
  );
  assert.ok(approved.some(row => row.label === "Girdi · ym" && row.value === "1000"));
  assert.ok(approved.some(row => row.label === "Sonuç · sinir" && row.value === "800"));
  const withheld = buildFeedbackDetailRows(feedback(), actor, "ref-0001", fixedNow());
  assert.ok(!withheld.some(row => row.label.startsWith("Girdi ·") || row.label.startsWith("Sonuç ·")));
  assert.equal(withheld.find(row => row.label === "Girdi/sonuç paylaşımı")?.value, "Onay verilmedi");
});

test("delivery sends one structured e-mail to the configured reviewer", async () => {
  const calls: unknown[][] = [];
  const receipt = await sendExpertFeedback(feedback({ verdict: "incorrect", note: "Sınır değer yanlış", expectedValue: "812.400,00" }), actor, {
    env: smtpEnv, now: fixedNow, createReference: fixedReference,
    deliver: async (...args) => { calls.push(args); return { status: "accepted" }; },
  });
  assert.deepEqual(receipt, { reference: "ref-0001", status: "accepted" });
  assert.equal(calls.length, 1);
  const [template, recipient, url, , , , context] = calls[0] as [string, string, string, unknown, unknown, unknown, { subjectOverride: string; detailRows: { label: string; value: string }[] }];
  assert.equal(template, "expert_feedback");
  assert.equal(recipient, "hazar@example.test");
  assert.equal(url, `https://bimmetraj.com${EXPERT_FEEDBACK_REVIEW_PATH}`);
  assert.match(context.subjectOverride, /KİK aşırı düşük teklif .* Hatalı$/);
  assert.equal(context.detailRows.find(row => row.label === "Gönderen")?.value, actor.email);
  assert.equal(context.detailRows.find(row => row.label === "Uzmanın bulduğu değer")?.value, "812.400,00");
});

test("delivery refuses configurations that would lose or misroute feedback", async () => {
  const deliver = async () => assert.fail("must not deliver");
  const cases: [Record<string, string | undefined>, string][] = [
    [{ ...smtpEnv, EXPERT_FEEDBACK_EMAIL: undefined }, "RECIPIENT_MISSING"],
    [{ ...smtpEnv, AUTH_EMAIL_DELIVERY_MODE: "webhook" }, "DELIVERY_MODE_UNSUPPORTED"],
    [{ ...smtpEnv, NODE_ENV: "development", AUTH_EMAIL_DELIVERY_MODE: "webhook", AUTH_EMAIL_WEBHOOK_URL: "https://hooks.example.test/mail" }, "DELIVERY_MODE_UNSUPPORTED"],
    [{ ...smtpEnv, NODE_ENV: "development", AUTH_EMAIL_DELIVERY_MODE: undefined, AUTH_EMAIL_WEBHOOK_URL: "https://hooks.example.test/mail" }, "DELIVERY_MODE_UNSUPPORTED"],
    [{ ...smtpEnv, PUBLIC_APP_URL: "http://bimmetraj.com" }, "PUBLIC_URL_INVALID"],
  ];
  for (const [env, reason] of cases) {
    await assert.rejects(sendExpertFeedback(feedback(), actor, { env, deliver }), (error: unknown) => error instanceof ExpertFeedbackUnavailableError && error.reason === reason);
  }
});

test("local development without a webhook reaches the stub and reports it as not delivered", async () => {
  const receipt = await sendExpertFeedback(feedback(), actor, {
    env: { NODE_ENV: "development", EXPERT_FEEDBACK_EMAIL: "hazar@example.test", PUBLIC_APP_URL: "http://localhost:3000" },
    createReference: fixedReference, now: fixedNow, revision: () => "abc123",
    deliver: async (_template, _email, url) => { assert.equal(url, `http://localhost:3000${EXPERT_FEEDBACK_REVIEW_PATH}`); return { status: "development", url }; },
  });
  assert.deepEqual(receipt, { reference: "ref-0001", status: "development" });
});

test("detail rows carry the running build revision", () => {
  const rows = buildFeedbackDetailRows(feedback(), actor, "ref-0001", fixedNow(), "da5271b");
  assert.equal(rows.find(row => row.label === "Uygulama sürümü (commit)")?.value, "da5271b");
});

test("rendered e-mail escapes expert-provided text", () => {
  const rows = buildFeedbackDetailRows(feedback({ verdict: "unsure", note: "<script>alert(1)</script>" }), actor, "ref-0001", fixedNow());
  const { html, text } = renderTransactionalEmail("expert_feedback", "https://bimmetraj.com/admin/roadmap/expert-review", { detailRows: rows });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(text.includes("Açıklama: <script>alert(1)</script>"));
});

function routes(send: Parameters<typeof registerExpertFeedbackRoutes>[1], limiter: Parameters<typeof registerExpertFeedbackRoutes>[2]) {
  const handlers = new Map<string, Function[]>();
  const app = { post(path: string, ...fns: Function[]) { handlers.set(`POST ${path}`, fns); } };
  registerExpertFeedbackRoutes(app as never, send, limiter);
  return handlers.get("POST /api/expert-feedback")!;
}
function response() {
  return {
    statusCode: 200, body: undefined as unknown, headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    set(name: string, value: string) { this.headers[name] = value; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}
const allow = async () => ({ allowed: true, retryAfterSeconds: 0 });
const request = (body: unknown) => ({ user: { ...actor, emailVerified: new Date() }, body });

test("route requires an authenticated, verified, rate-limited user", async () => {
  const stack = routes(async () => assert.fail("not called"), allow);
  assert.deepEqual(stack.slice(0, 2), [authenticate, requireVerifiedEmail]);
  assert.equal(stack.length, 4);
  const limited = response();
  const limitedStack = routes(async () => assert.fail("not called"), async () => ({ allowed: false, retryAfterSeconds: 120 }));
  await limitedStack[2](request({}), limited, assert.fail);
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers["Retry-After"], "120");
});

test("route forwards validated feedback with the server-side identity only", async () => {
  const received: unknown[] = [];
  const handler = routes(async (input, sender) => { received.push([input, sender]); return { reference: "ref-0001", status: "accepted" }; }, allow).at(-1)!;
  const res = response();
  await handler(request({ engineId: "price_escalation_4735", verdict: "correct", calcVersion: "BIM-CALC-2026-10-25.84" }), res, assert.fail);
  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { reference: "ref-0001", status: "accepted" });
  const [input, sender] = received[0] as [ExpertFeedback, typeof actor];
  assert.equal(input.engineId, "price_escalation_4735");
  assert.deepEqual(sender, actor);
});

test("route reports invalid input with the offending field", async () => {
  const handler = routes(async () => assert.fail("not called"), allow).at(-1)!;
  const res = response();
  await handler(request({ engineId: "kik_adt", verdict: "incorrect" }), res, assert.fail);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "Hatalı bulduğunuz sonuç için kısa bir açıklama yazın.", code: "EXPERT_FEEDBACK_INVALID", field: "note" });
});

test("route turns a closed channel or failed e-mail into 503 and passes other errors on", async () => {
  for (const error of [new ExpertFeedbackUnavailableError("RECIPIENT_MISSING"), new EmailDeliveryError("EMAIL_DELIVERY_UNAVAILABLE")]) {
    const res = response();
    await routes(async () => { throw error; }, allow).at(-1)!(request({ engineId: "general", verdict: "unsure" }), res, assert.fail);
    assert.equal(res.statusCode, 503);
    assert.equal((res.body as { code: string }).code, "EXPERT_FEEDBACK_UNAVAILABLE");
  }
  const unexpected = new Error("boom");
  let forwarded: unknown;
  await routes(async () => { throw unexpected; }, allow).at(-1)!(request({ engineId: "general", verdict: "unsure" }), response(), (error: unknown) => { forwarded = error; });
  assert.equal(forwarded, unexpected);
});
