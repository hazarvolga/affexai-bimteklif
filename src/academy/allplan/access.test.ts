import assert from "node:assert/strict";
import test from "node:test";
import { isEnrollmentActive } from "./access";

const now = new Date("2026-07-21T12:00:00Z");

test("academy access requires an active enrollment inside its validity window", () => {
  assert.equal(isEnrollmentActive({ status: "active", startsAt: new Date("2026-07-20T00:00:00Z"), endsAt: null }, now), true);
  assert.equal(isEnrollmentActive({ status: "revoked", startsAt: new Date("2026-07-20T00:00:00Z"), endsAt: null }, now), false);
  assert.equal(isEnrollmentActive({ status: "active", startsAt: new Date("2026-07-22T00:00:00Z"), endsAt: null }, now), false);
  assert.equal(isEnrollmentActive({ status: "active", startsAt: new Date("2026-07-20T00:00:00Z"), endsAt: now }, now), false);
});
