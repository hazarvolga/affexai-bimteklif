import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EventEmitter } from "node:events";
import { createAdmission } from "../../smartcheck/import/admission";
import { createViewerAdmissionMiddleware, createViewerRateLimit, withViewerAdmission } from "./access-control";

describe("IFC viewer access control", () => {
  it("returns 429 with Retry-After when the actor viewer bucket is exhausted", async () => {
    const headers = new Map<string, string>();
    let status = 200;
    let body: unknown;
    let nextCalled = false;
    const middleware = createViewerRateLimit("context", async (key, limit, windowMs) => {
      assert.match(key, /^smartcheck:viewer-context:/);
      assert.equal(limit, 10);
      assert.equal(windowMs, 60_000);
      return { allowed: false, retryAfterSeconds: 17 };
    });
    const req = { user: { companyId: "company", userId: "actor" } } as never;
    const res = {
      status(code: number) { status = code; return this; },
      set(name: string, value: string) { headers.set(name, value); return this; },
      json(value: unknown) { body = value; return this; },
    } as never;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(status, 429);
    assert.equal(headers.get("Retry-After"), "17");
    assert.deepEqual(body, { error: "IFC 3B inceleme istek sınırı aşıldı.", code: "IFC_VIEWER_RATE_LIMITED" });
    assert.equal(nextCalled, false);
  });

  it("bounds concurrency and releases the slot after errors", async () => {
    const acquire = createAdmission(1);
    let unblock!: () => void;
    const first = withViewerAdmission(acquire, async () => new Promise<void>(resolve => { unblock = resolve; }));
    await Promise.resolve();
    assert.throws(() => acquire(), /DOCUMENT_IO_BUSY/);
    unblock();
    await first;
    await assert.rejects(withViewerAdmission(acquire, async () => { throw new Error("boom"); }), /boom/);
    const release = acquire();
    release();
  });

  it("admission middleware returns 503 while full and releases exactly once on aborted responses", () => {
    const acquire = createAdmission(1);
    const middleware = createViewerAdmissionMiddleware(acquire);
    const response = Object.assign(new EventEmitter(), {
      writableEnded: false,
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      set() { return this; },
      json() { return this; },
    });
    let nextCount = 0;
    middleware({} as never, response as never, () => { nextCount += 1; });
    assert.equal(nextCount, 1);

    const busyResponse = Object.assign(new EventEmitter(), {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      set() { return this; },
      json() { return this; },
    });
    middleware({} as never, busyResponse as never, () => { nextCount += 1; });
    assert.equal(busyResponse.statusCode, 503);
    assert.equal(nextCount, 1);

    response.emit("close");
    response.emit("finish");
    const release = acquire();
    release();
  });
});
