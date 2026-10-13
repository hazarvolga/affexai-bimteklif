import assert from "node:assert/strict";
import test from "node:test";
import { ec2DemoLapLength, ts500LapLength } from "./lap-length";

test("TS 500 Eq. 9.1-9.2: C30, Ø16, good bond, all bars spliced -> lb 549 mm, l0 823 mm", () => {
  const result = ts500LapLength({ fck: 30, barDiameterMm: 16, bond: "good", splicedRatio: 1 });
  assert.equal(Math.round(result.lbMm), 549);
  assert.equal(result.l0Mm, 823);
});

test("TS 500 applies the 20φ floor, poor bond (Konum I) x1.4 and alpha1 = 1 + 0.5r", () => {
  assert.equal(Math.round(ts500LapLength({ fck: 30, barDiameterMm: 16, bond: "poor", splicedRatio: 1 }).lbMm), 768);
  assert.equal(ts500LapLength({ fck: 30, barDiameterMm: 16, bond: "good", splicedRatio: 0.5 }).l0Mm, 686);
  assert.equal(ts500LapLength({ fck: 50, barDiameterMm: 8, bond: "good", splicedRatio: 0 }).lbMm >= 160, true);
});

test("the Eurocode demo keeps its previous result so lessons built on it do not shift", () => {
  assert.equal(ec2DemoLapLength({ fctk: 2.0, barDiameterMm: 16, bond: "good", force: "medium" }), 600);
});
