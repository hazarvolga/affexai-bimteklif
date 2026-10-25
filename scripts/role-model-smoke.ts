/**
 * Smoke for the production database role model (bimmetraj_app + FORCE RLS).
 *
 * Runs against a server whose DATABASE_URL authenticates as bimmetraj_app on a database
 * provisioned with scripts/database-roles/cli.ts. Every request path that reads a tenant
 * RLS table must do so inside tenant context; a plain read sees no rows and the endpoint
 * fails. CI integration tests clone tables without policies, so this smoke closes that gap.
 *
 * Usage:
 *   ROLE_SMOKE_BASE_URL=http://localhost:3001 ROLE_SMOKE_EMAIL=... ROLE_SMOKE_PASSWORD=... \
 *   [ROLE_SMOKE_ADMIN_EMAIL=... ROLE_SMOKE_ADMIN_PASSWORD=...] pnpm exec tsx scripts/role-model-smoke.ts
 */
import assert from "node:assert/strict";

const base = (process.env.ROLE_SMOKE_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

class Session {
  private cookies = new Map<string, string>();

  constructor(private readonly context?: "admin") {}

  async request<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}) {
    const headers: Record<string, string> = {
      Origin: base,
      "Sec-Fetch-Site": "same-origin",
      Accept: "application/json",
    };
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    if (this.context === "admin") headers["X-BM-Context"] = "admin";
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
    const type = response.headers.get("content-type") ?? "";
    const body = type.includes("application/json") ? ((await response.json()) as T) : (undefined as T);
    return { status: response.status, body, type };
  }

  async login(email: string, password: string) {
    const login = await this.request("/api/auth/login", { method: "POST", body: { email, password } });
    assert.equal(login.status, 200, `login ${email}: ${login.status}`);
  }
}

type Check = { name: string; run: () => Promise<void> };
const results: { name: string; ok: boolean; detail?: string }[] = [];

async function runChecks(checks: Check[]) {
  for (const check of checks) {
    try {
      await check.run();
      results.push({ name: check.name, ok: true });
    } catch (error) {
      results.push({ name: check.name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  }
}

async function workspaceChecks() {
  const session = new Session();
  await session.login(required("ROLE_SMOKE_EMAIL"), required("ROLE_SMOKE_PASSWORD"));
  let companyId = "";
  let quoteId = "";
  let clientId = "";
  let dealId = "";
  await runChecks([
    { name: "GET /api/auth/me returns the company", run: async () => {
      const me = await session.request<{ company?: { id: string } }>("/api/auth/me");
      assert.equal(me.status, 200, `status ${me.status} ${JSON.stringify(me.body)}`);
      assert.ok(me.body.company?.id, "company missing");
      companyId = me.body.company.id;
    } },
    { name: "GET /api/company", run: async () => {
      const company = await session.request<{ id?: string }>("/api/company");
      assert.equal(company.status, 200, `status ${company.status} ${JSON.stringify(company.body)}`);
      assert.equal(company.body.id, companyId);
    } },
    { name: "GET /api/company/profile", run: async () => {
      const profile = await session.request("/api/company/profile");
      assert.equal(profile.status, 200, `status ${profile.status} ${JSON.stringify(profile.body)}`);
    } },
    { name: "GET /api/company/risk-settings", run: async () => {
      const settings = await session.request("/api/company/risk-settings");
      assert.equal(settings.status, 200, `status ${settings.status} ${JSON.stringify(settings.body)}`);
    } },
    { name: "GET /api/billing/subscription", run: async () => {
      const subscription = await session.request("/api/billing/subscription");
      assert.equal(subscription.status, 200, `status ${subscription.status} ${JSON.stringify(subscription.body)}`);
    } },
    { name: "GET /api/billing/usage-stats", run: async () => {
      const usage = await session.request("/api/billing/usage-stats");
      assert.equal(usage.status, 200, `status ${usage.status} ${JSON.stringify(usage.body)}`);
    } },
    { name: "POST /api/quotations consumes quota inside tenant context", run: async () => {
      const client = await session.request<{ id: string }>("/api/clients", { method: "POST", body: { name: `Rol Smoke ${Date.now()}`, type: "company" } });
      assert.equal(client.status, 200, `client ${client.status} ${JSON.stringify(client.body)}`);
      clientId = client.body.id;
      const quote = await session.request<{ id: string }>("/api/quotations", {
        method: "POST",
        body: {
          clientId: client.body.id, quoteNumber: `ROL-${Date.now()}`, projectName: "Rol modeli smoke", date: "2026-10-25", expiryDate: "2026-11-25",
          items: [{ description: "C30/37 hazır beton", unit: "m3", quantity: 10, unitPrice: 3000, vatPercent: 20 }],
        },
      });
      assert.equal(quote.status, 200, `quotation ${quote.status} ${JSON.stringify(quote.body)}`);
      quoteId = quote.body.id;
    } },
    { name: "GET /api/quotations/:id/pdf reads the company", run: async () => {
      assert.ok(quoteId, "no quotation from previous check");
      const pdf = await session.request(`/api/quotations/${quoteId}/pdf`);
      assert.equal(pdf.status, 200, `status ${pdf.status} ${JSON.stringify(pdf.body)}`);
      assert.match(pdf.type, /pdf/);
    } },
    { name: "GET /api/smartcheck/sample-projects passes the company feature gate", run: async () => {
      const samples = await session.request("/api/smartcheck/sample-projects");
      assert.equal(samples.status, 200, `status ${samples.status} ${JSON.stringify(samples.body)}`);
    } },
    // 0022 tenant business tables: usage_alerts, deals, activities, supplier quotes.
    { name: "GET /api/billing/alerts reads usage_alerts in tenant context", run: async () => {
      const alerts = await session.request("/api/billing/alerts");
      assert.equal(alerts.status, 200, `status ${alerts.status} ${JSON.stringify(alerts.body)}`);
      assert.ok(Array.isArray(alerts.body), "alerts must be a list");
    } },
    { name: "POST /api/crm/deals writes deal and activity in tenant context", run: async () => {
      assert.ok(clientId, "no client from the quotation check");
      const deal = await session.request<{ id: string }>("/api/crm/deals", { method: "POST", body: { name: `Rol smoke fırsat ${Date.now()}`, clientId, value: 1000 } });
      assert.equal(deal.status, 201, `status ${deal.status} ${JSON.stringify(deal.body)}`);
      dealId = deal.body.id;
    } },
    { name: "CRM deal detail, pipeline, activity and stage change", run: async () => {
      assert.ok(dealId, "no deal from previous check");
      const detail = await session.request(`/api/crm/deals/${dealId}`);
      assert.equal(detail.status, 200, `detail ${detail.status} ${JSON.stringify(detail.body)}`);
      const pipeline = await session.request<{ id: string }[]>("/api/crm/pipeline");
      assert.equal(pipeline.status, 200, `pipeline ${pipeline.status} ${JSON.stringify(pipeline.body)}`);
      assert.ok(pipeline.body.some((deal) => deal.id === dealId), "new deal missing from pipeline");
      const activity = await session.request("/api/crm/activities", { method: "POST", body: { dealId, description: "Rol smoke notu" } });
      assert.equal(activity.status, 201, `activity ${activity.status} ${JSON.stringify(activity.body)}`);
      const stage = await session.request("/api/crm/deals/update-stage", { method: "POST", body: { dealId, stage: "contacted" } });
      assert.equal(stage.status, 200, `stage ${stage.status} ${JSON.stringify(stage.body)}`);
      const activities = await session.request<unknown[]>(`/api/crm/deals/${dealId}/activities`);
      assert.equal(activities.status, 200, `activities ${activities.status} ${JSON.stringify(activities.body)}`);
      assert.ok(activities.body.length >= 3, `expected creation, note and stage activities, got ${activities.body.length}`);
    } },
    { name: "Supplier quote create, list and detail in tenant context", run: async () => {
      const created = await session.request<{ id: string }>("/api/market-intelligence/supplier-quotes", {
        method: "POST",
        body: { supplierName: "Rol Smoke Tedarik", sourceDocumentIdentifier: `ROL-${Date.now()}`, sourceDocumentHash: "0123456789abcdef0123456789abcdef", currency: "TRY" },
      });
      assert.equal(created.status, 201, `create ${created.status} ${JSON.stringify(created.body)}`);
      const list = await session.request<{ id: string }[]>("/api/market-intelligence/supplier-quotes");
      assert.equal(list.status, 200, `list ${list.status} ${JSON.stringify(list.body)}`);
      assert.ok(list.body.some((row) => row.id === created.body.id), "new supplier quote missing from list");
      const detail = await session.request(`/api/market-intelligence/supplier-quotes/${created.body.id}`);
      assert.equal(detail.status, 200, `detail ${detail.status} ${JSON.stringify(detail.body)}`);
    } },
  ]);
}

async function adminChecks() {
  const email = process.env.ROLE_SMOKE_ADMIN_EMAIL;
  const password = process.env.ROLE_SMOKE_ADMIN_PASSWORD;
  if (!email || !password) return;
  const session = new Session("admin");
  await session.login(email, password);
  let tenantId = "";
  await runChecks([
    { name: "GET /api/admin/tenants lists companies", run: async () => {
      const tenants = await session.request<unknown[] | { tenants?: unknown[] }>("/api/admin/tenants");
      assert.equal(tenants.status, 200, `status ${tenants.status} ${JSON.stringify(tenants.body)}`);
      const list = Array.isArray(tenants.body) ? tenants.body : tenants.body.tenants ?? [];
      assert.ok(list.length > 0, "tenant list is empty");
      tenantId = String((list[0] as { id?: string }).id ?? "");
    } },
    { name: "GET /api/admin/tenants/:id", run: async () => {
      assert.ok(tenantId, "no tenant from previous check");
      const detail = await session.request(`/api/admin/tenants/${tenantId}`);
      assert.equal(detail.status, 200, `status ${detail.status} ${JSON.stringify(detail.body)}`);
    } },
    { name: "GET /api/admin/dashboard", run: async () => {
      const dashboard = await session.request("/api/admin/dashboard");
      assert.equal(dashboard.status, 200, `status ${dashboard.status} ${JSON.stringify(dashboard.body)}`);
    } },
    { name: "GET /api/admin/plans", run: async () => {
      const plans = await session.request("/api/admin/plans");
      assert.equal(plans.status, 200, `status ${plans.status} ${JSON.stringify(plans.body)}`);
    } },
  ]);
}

async function main() {
  await workspaceChecks();
  await adminChecks();
  for (const result of results) {
    process.stdout.write(`${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.detail ? `\n      ${result.detail}` : ""}\n`);
  }
  const failed = results.filter((result) => !result.ok).length;
  process.stdout.write(`\n${results.length - failed}/${results.length} passed\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Role model smoke aborted: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
