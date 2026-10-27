/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { registerClientRoutes } from "./clients";

const actor = {
  companyId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  email: "uzman@bimmetraj.com",
};

function createTestHarness(initialClients: any[] = []) {
  const rows = [...initialClients];
  const handlers = new Map<string, Function>();
  const app: any = {
    get(path: string, ...fns: Function[]) {
      handlers.set(`GET ${path}`, fns.at(-1)!);
    },
    post(path: string, ...fns: Function[]) {
      handlers.set(`POST ${path}`, fns.at(-1)!);
    },
    patch(path: string, ...fns: Function[]) {
      handlers.set(`PATCH ${path}`, fns.at(-1)!);
    },
  };

  let pendingUpdate: Record<string, unknown> | null = null;
  let mode: "clients" | "deals" | "quotations" = "clients";

  const mockDb: any = {
    select() {
      return {
        from(table: any) {
          const tableName = table?.[Symbol.for("drizzle:Name")] ?? "clients";
          if (tableName === "deals") mode = "deals";
          else if (tableName === "quotations") mode = "quotations";
          else mode = "clients";
          return this;
        },
        where() {
          if (mode === "deals" || mode === "quotations") {
            return {
              orderBy: async () => [],
            };
          }
          return Object.assign(Promise.resolve(rows), {
            orderBy() {
              return {
                limit() {
                  return {
                    offset: async () => rows,
                  };
                },
              };
            },
          });
        },
      };
    },
    insert() {
      return {
        values(data: any) {
          return {
            returning: async () => {
              const created = {
                id: `33333333-3333-4333-8333-${String(rows.length + 1).padStart(12, "0")}`,
                createdAt: new Date("2026-10-27T12:00:00.000Z"),
                ...data,
              };
              rows.push(created);
              return [created];
            },
          };
        },
      };
    },
    update() {
      return {
        set(data: Record<string, unknown>) {
          pendingUpdate = data;
          return {
            where() {
              return {
                returning: async () => {
                  if (!rows[0] || !pendingUpdate) return [];
                  Object.assign(rows[0], pendingUpdate);
                  return [rows[0]];
                },
              };
            },
          };
        },
      };
    },
  };

  registerClientRoutes(app, () => undefined, {
    withTenant: async (_ctx, work) => work(mockDb),
  });

  async function call(
    key: string,
    req: {
      user?: unknown;
      params?: Record<string, string>;
      query?: Record<string, string>;
      body?: unknown;
    },
  ) {
    const res: any = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    await handlers.get(key)!({ user: actor, params: {}, query: {}, body: {}, ...req }, res);
    return res;
  }

  return { call, rows };
}

test("müşteri rotaları güvenlik sınırlarını (COMPANY_REQUIRED, strictObject, enum type ve kontrol karakteri) zorlar", async () => {
  const { call } = createTestHarness();

  const noCompanyRes = await call("GET /api/clients", {
    user: { userId: actor.userId, email: actor.email, companyId: null },
  });
  assert.equal(noCompanyRes.statusCode, 403);
  assert.equal(noCompanyRes.body.code, "COMPANY_REQUIRED");

  const unknownKeyRes = await call("POST /api/clients", {
    body: {
      name: "Test Firma",
      companyId: "99999999-9999-4999-8999-999999999999",
    },
  });
  assert.equal(unknownKeyRes.statusCode, 400);

  const invalidTypeRes = await call("POST /api/clients", {
    body: {
      name: "Test Firma",
      type: "arbitrary_role",
    },
  });
  assert.equal(invalidTypeRes.statusCode, 400);

  const controlCharRes = await call("POST /api/clients", {
    body: {
      name: "Test\u0000Firma",
      type: "company",
    },
  });
  assert.equal(controlCharRes.statusCode, 400);
});

test("müşteri rotaları oluşturma, detay, aşama güncelleme, zaman tüneli notu ve toplu içe aktarımı yönetir", async () => {
  const { call } = createTestHarness();

  const createRes = await call("POST /api/clients", {
    body: {
      name: "Aras Yapı A.Ş.",
      type: "company",
      email: "info@arasyapi.com",
      phone: "0532 100 20 30",
      pipelineStage: "lead",
      notes: "İlk potansiyel kaydı",
    },
  });
  assert.equal(createRes.statusCode, 200);
  const clientId = createRes.body.id as string;
  assert.match(createRes.body.notes, /\[\[STAGE_NOTE\|stage=lead/);

  const detailRes = await call("GET /api/clients/:id", { params: { id: clientId } });
  assert.equal(detailRes.statusCode, 200);
  assert.equal(detailRes.body.stageNotes.length, 1);
  assert.equal(detailRes.body.stageNotes[0].stage, "lead");

  const patchRes = await call("PATCH /api/clients/:id", {
    params: { id: clientId },
    body: {
      pipelineStage: "contacted",
    },
  });
  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.body.pipelineStage, "contacted");
  assert.equal(patchRes.body.stageNotes.length, 2);

  const noteRes = await call("POST /api/clients/:id/notes", {
    params: { id: clientId },
    body: {
      stage: "quotation_sent",
      content: "Metraj icmali ve teklif dosyası gönderildi.",
      updatePipelineStage: true,
    },
  });
  assert.equal(noteRes.statusCode, 201);
  assert.equal(noteRes.body.pipelineStage, "quotation_sent");
  assert.equal(noteRes.body.stageNotes.length, 3);
  assert.equal(noteRes.body.stageNotes[0].stage, "quotation_sent");

  const bulkRes = await call("POST /api/clients/bulk-import", {
    body: {
      duplicateStrategy: "update",
      clients: [
        {
          name: "Aras Yapı A.Ş.",
          email: "info@arasyapi.com",
          pipelineStage: "negotiation",
          notes: "Pazarlık toplantısı yapıldı",
        },
        {
          name: "Yeni Müteahhit Ltd.",
          email: "yeni@muteahhit.com",
          pipelineStage: "lead",
        },
      ],
    },
  });
  assert.equal(bulkRes.statusCode, 200);
  assert.equal(bulkRes.body.updatedCount, 1);
  assert.equal(bulkRes.body.createdCount, 1);
});
