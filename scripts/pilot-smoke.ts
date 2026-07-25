type HttpMethod = "GET" | "POST" | "PATCH";

interface JsonRequestOptions {
  method?: HttpMethod;
  token?: string;
  body?: unknown;
  expectedStatus?: number;
}

const baseUrl = process.env.BASE_URL || "http://localhost:3001";
const smokeEmail = process.env.SMOKE_EMAIL || "admin@teklifpro.ai";
const smokePassword = process.env.SMOKE_PASSWORD || "admin123";
const runId = process.env.SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");

async function requestJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  const expectedStatus = options.expectedStatus || 200;

  if (response.status !== expectedStatus) {
    throw new Error(`${options.method || "GET"} ${path} expected ${expectedStatus}, got ${response.status}: ${text}`);
  }

  return data as T;
}

async function expectUnauthorized(path: string, method: HttpMethod, body?: unknown) {
  await requestJson(path, {
    method,
    body,
    expectedStatus: 401,
  });
}

async function main() {
  console.log(`Pilot smoke target: ${baseUrl}`);

  const health = await requestJson<{ status: string; db: string }>("/api/health");
  if (health.status !== "ok" || health.db !== "connected") {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log("✓ health");

  await expectUnauthorized("/api/ai/generate-quote", "POST", { description: "unauthorized smoke" });
  await expectUnauthorized("/api/profit/calculate", "POST", { quotationId: "00000000-0000-0000-0000-000000000000" });
  await expectUnauthorized("/api/clients", "GET");
  console.log("✓ unauthorized guards");

  const login = await requestJson<{
    token: string;
    user: { id: string; email: string };
    company: { id: string; name: string } | null;
    role: string;
  }>("/api/auth/login", {
    method: "POST",
    body: {
      email: smokeEmail,
      password: smokePassword,
    },
  });

  if (!login.token || !login.company?.id) {
    throw new Error("Login did not return token and company");
  }
  console.log(`✓ login as ${login.user.email} (${login.role})`);

  const client = await requestJson<{
    id: string;
    name: string;
  }>("/api/clients", {
    method: "POST",
    token: login.token,
    body: {
      name: `SMOKE Client ${runId}`,
      type: "company",
      email: `smoke+${runId}@teklifpro.local`,
      phone: "+90 555 000 00 00",
      address: "Smoke Test Address",
      pipelineStage: "lead",
      notes: "Created by scripts/pilot-smoke.ts",
    },
  });

  if (!client.id) throw new Error("Client creation did not return an id");
  console.log(`✓ client created ${client.id}`);

  const quote = await requestJson<{
    id: string;
    grandTotal: string;
  }>("/api/quotations", {
    method: "POST",
    token: login.token,
    body: {
      clientId: client.id,
      quoteNumber: `SMOKE-${runId}`,
      projectName: `SMOKE Pilot Quote ${runId}`,
      date: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currency: "TRY",
      notes: "Created by scripts/pilot-smoke.ts",
      status: "draft",
      industryId: "residential",
      subtotal: 999999,
      discountTotal: 999999,
      vatTotal: 999999,
      grandTotal: 999999,
      items: [
        {
          description: "Smoke test labor",
          unit: "day",
          quantity: 2,
          unitPrice: 1500,
          discountPercent: 10,
          vatPercent: 20,
          total: 999999,
        },
        {
          description: "Smoke test material",
          unit: "piece",
          quantity: 4,
          unitPrice: 250,
          discountPercent: 0,
          vatPercent: 10,
          total: 999999,
        },
      ],
    },
  });

  if (!quote.id) throw new Error("Quotation creation did not return an id");
  if (Number(quote.grandTotal) !== 4340) {
    throw new Error(`Server-side quotation total check failed, expected 4340 got ${quote.grandTotal}`);
  }
  console.log(`✓ quote created ${quote.id}`);

  const quoteDetail = await requestJson<{
    id: string;
    items: Array<{ total: string }>;
    grandTotal: string;
  }>(`/api/quotations/${quote.id}`, {
    token: login.token,
  });

  if (quoteDetail.id !== quote.id || quoteDetail.items.length !== 2) {
    throw new Error("Quotation detail did not round-trip created quote/items");
  }
  if (Number(quoteDetail.items[0].total) !== 2700 || Number(quoteDetail.items[1].total) !== 1000) {
    throw new Error(`Server-side item total check failed: ${JSON.stringify(quoteDetail.items)}`);
  }
  console.log("✓ quote detail and server totals");

  console.log("Pilot smoke passed");
}

main().catch((error) => {
  console.error("Pilot smoke failed");
  console.error(error);
  process.exit(1);
});
