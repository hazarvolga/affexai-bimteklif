import assert from "node:assert/strict";
import test from "node:test";
import { redactSensitive, requestIdMiddleware } from "./logger";

test("redactSensitive masks sensitive keys recursively", () => {
  const input = {
    email: "user@example.com",
    password: "secretPassword123",
    nested: {
      token: "jwt-token-string",
      apiKey: "ai-api-key",
      safeValue: 42,
    },
    list: [
      { secret: "hidden", name: "item1" },
    ],
  };

  const output = redactSensitive(input) as any;
  assert.equal(output.email, "user@example.com");
  assert.equal(output.password, "[REDACTED]");
  assert.equal(output.nested.token, "[REDACTED]");
  assert.equal(output.nested.apiKey, "[REDACTED]");
  assert.equal(output.nested.safeValue, 42);
  assert.equal(output.list[0].secret, "[REDACTED]");
  assert.equal(output.list[0].name, "item1");
});

test("requestIdMiddleware generates request id if none provided", () => {
  const req: any = { headers: {} };
  const headers: Record<string, string> = {};
  const res: any = {
    setHeader(key: string, val: string) {
      headers[key] = val;
    },
  };
  let nextCalled = false;
  requestIdMiddleware(req, res, () => {
    nextCalled = true;
  });
  assert.ok(nextCalled);
  assert.ok(req.id);
  assert.equal(headers["X-Request-Id"], req.id);
});

test("requestIdMiddleware propagates existing x-request-id", () => {
  const req: any = { headers: { "x-request-id": "custom-uuid-1234" } };
  const headers: Record<string, string> = {};
  const res: any = {
    setHeader(key: string, val: string) {
      headers[key] = val;
    },
  };
  let nextCalled = false;
  requestIdMiddleware(req, res, () => {
    nextCalled = true;
  });
  assert.ok(nextCalled);
  assert.equal(req.id, "custom-uuid-1234");
  assert.equal(headers["X-Request-Id"], "custom-uuid-1234");
});
