import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CAPABILITY_REGISTRY,
  CAPABILITY_REGISTRY_VERSION,
  getLiveCapabilities,
  getPilotCapabilities,
  getRoadmapCapabilities,
} from "../capabilities/registry";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const MARKET_REGISTER_PATH = path.join(
  REPO_ROOT,
  "docs/audits/phase-10/market-inventory-register.json",
);
const MARKET_REPORT_PATH = path.join(
  REPO_ROOT,
  "docs/audits/phase-10/PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md",
);
const PHASE0_CAPABILITY_REGISTER_PATH = path.join(
  REPO_ROOT,
  "docs/audits/phase-0/capability-claim-register.json",
);

const ALLOWED_STAGE_STATUSES = new Set([
  "verified_present",
  "partial_bridge",
  "partial_customizable",
  "unverified_publicly",
  "verified_absent",
  "pilot_l2_unapproved",
]);

const REQUIRED_STAGE_IDS = [
  "S1_IFC_QTO_TRACEABLE",
  "S2_EPYS_RG33331_PDFA",
  "S3_CSB_BYOL_MINHA",
  "S4_KIK_4734_4735",
  "S5_PROGRESS_PAYMENT",
  "S6_ISO19650_CDE_GATE",
];

const REQUIRED_PRODUCT_IDS = [
  "oska-e-hakedis-pro",
  "oskabulut",
  "amp-kurumsal-ve-bulut",
  "ihale-pro",
  "bexel-manager",
  "rib-costx",
  "autodesk-takeoff-acc",
  "kreo-software",
  "glodon-cubicost",
  "allplan-bimplus-solibri",
  "ifc-ruhsat-open-source",
  "bimmetraj",
];

test("T53-1: Market inventory register is bound to Phase 0 protocol and CAPABILITY_REGISTRY version", () => {
  assert.ok(fs.existsSync(MARKET_REGISTER_PATH), "market-inventory-register.json must exist");
  assert.ok(fs.existsSync(MARKET_REPORT_PATH), "PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md must exist");

  const marketRegister = JSON.parse(fs.readFileSync(MARKET_REGISTER_PATH, "utf8"));
  const phase0Register = JSON.parse(fs.readFileSync(PHASE0_CAPABILITY_REGISTER_PATH, "utf8"));

  assert.equal(marketRegister.capabilityRegistryVersion, CAPABILITY_REGISTRY_VERSION);
  assert.equal(
    marketRegister.protocolBinding.category,
    phase0Register.uniqueClaimProtocol.category,
  );
  assert.equal(
    marketRegister.protocolBinding.geography,
    phase0Register.uniqueClaimProtocol.geography,
  );
  assert.deepEqual(
    marketRegister.protocolBinding.featureBundle,
    phase0Register.uniqueClaimProtocol.featureBundle,
  );
  assert.equal(
    phase0Register.uniqueClaimProtocol.status,
    "researched_pending_legal_signoff",
  );
  assert.equal(
    phase0Register.uniqueClaimProtocol.evidencePath,
    "docs/audits/phase-10/PHASE_10_T53_T54_MARKET_INVENTORY_2026-10-26.md",
  );
});

test("T53-2: Market inventory separates desktop vs. cloud editions, licensing tiers, and dated sources", () => {
  const marketRegister = JSON.parse(fs.readFileSync(MARKET_REGISTER_PATH, "utf8"));
  const products: Array<Record<string, any>> = marketRegister.products ?? [];
  const productIds = products.map((p) => p.id);

  for (const requiredId of REQUIRED_PRODUCT_IDS) {
    assert.ok(
      productIds.includes(requiredId),
      `Market inventory must include product '${requiredId}'`,
    );
  }

  // Audit finding §6: OSKA desktop and OSKABULUT web must be evaluated separately;
  // RIB CostX must explicitly recognize CostX Cloud.
  const oskaDesktop = products.find((p) => p.id === "oska-e-hakedis-pro");
  const oskaCloud = products.find((p) => p.id === "oskabulut");
  const ribCostX = products.find((p) => p.id === "rib-costx");

  assert.ok(oskaDesktop && oskaCloud, "Both OSKA desktop and OSKABULUT must be present");
  assert.equal(oskaDesktop.deploymentModel, "desktop");
  assert.equal(oskaCloud.deploymentModel, "cloud_web");
  assert.ok(
    ribCostX &&
      ribCostX.deploymentModel === "hybrid_desktop_cloud" &&
      String(ribCostX.productName).includes("CostX Cloud"),
    "RIB CostX must record CostX Cloud alongside desktop/server",
  );

  for (const product of products) {
    assert.ok(product.vendor && product.productName, `${product.id}: vendor and productName required`);
    assert.ok(
      ["desktop", "cloud_web", "hybrid_desktop_cloud", "cli_library"].includes(
        product.deploymentModel,
      ),
      `${product.id}: valid deploymentModel required`,
    );
    assert.ok(product.licensingTier, `${product.id}: licensingTier required`);
    assert.ok(product.turkishRegulationSupport, `${product.id}: turkishRegulationSupport required`);
    assert.ok(product.integrationType, `${product.id}: integrationType required`);
    assert.match(product.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(
      Array.isArray(product.sources) && product.sources.length >= 1,
      `${product.id}: at least one source required`,
    );
  }
});

test("T54-1: Comparable capability matrix enforces tri-state evidence and holds BIMMetraj to the same L2/L1 gate", () => {
  const marketRegister = JSON.parse(fs.readFileSync(MARKET_REGISTER_PATH, "utf8"));
  const products: Array<Record<string, any>> = marketRegister.products ?? [];

  for (const product of products) {
    const matrix = product.stageMatrix ?? {};
    assert.deepEqual(
      Object.keys(matrix),
      REQUIRED_STAGE_IDS,
      `${product.id}: stageMatrix must cover all 6 stages in order`,
    );
    for (const stageId of REQUIRED_STAGE_IDS) {
      const cell = matrix[stageId];
      assert.ok(
        ALLOWED_STAGE_STATUSES.has(cell?.status),
        `${product.id}.${stageId}: invalid status '${cell?.status}'`,
      );
      assert.ok(
        typeof cell?.note === "string" && cell.note.length >= 20,
        `${product.id}.${stageId}: explanatory note required`,
      );
    }
  }

  // Commercial competitors must use 'unverified_publicly' rather than 'verified_absent'
  // when a capability is merely unmentioned in public docs.
  const commercialCompetitors = products.filter(
    (p) =>
      ![
        "bimmetraj",
        "allplan-bimplus-solibri",
        "ifc-ruhsat-open-source",
      ].includes(p.id),
  );
  for (const competitor of commercialCompetitors) {
    for (const stageId of REQUIRED_STAGE_IDS) {
      assert.notEqual(
        competitor.stageMatrix[stageId].status,
        "verified_absent",
        `${competitor.id}.${stageId}: commercial competitor feature absence without architectural exclusion must be 'unverified_publicly', not 'verified_absent'`,
      );
    }
  }

  // BIMMetraj row must reflect actual CAPABILITY_REGISTRY state (0 live/L3, pilot_l2_unapproved)
  const bimmetraj = products.find((p) => p.id === "bimmetraj")!;
  assert.equal(getLiveCapabilities().length, 0);
  assert.equal(getPilotCapabilities().length, 17);
  assert.equal(getRoadmapCapabilities().length, 2);
  assert.equal(CAPABILITY_REGISTRY.length, 19);

  for (const stageId of REQUIRED_STAGE_IDS) {
    assert.equal(
      bimmetraj.stageMatrix[stageId].status,
      "pilot_l2_unapproved",
      `BIMMetraj ${stageId} must remain 'pilot_l2_unapproved' while getLiveCapabilities().length === 0`,
    );
  }
});

test("T54-2: Claim decision gate prohibits 'Türkiye'de tek' while T50-T52 and T55 legal review remain open", () => {
  const marketRegister = JSON.parse(fs.readFileSync(MARKET_REGISTER_PATH, "utf8"));
  const reportMarkdown = fs.readFileSync(MARKET_REPORT_PATH, "utf8");

  assert.equal(marketRegister.pendingDecisionId, "T55");
  assert.equal(marketRegister.claimDecision.status, "pending_t50_t52_and_legal_review");
  assert.equal(marketRegister.claimDecision.singleClaimPermitted, false);
  assert.ok(marketRegister.claimDecision.prohibitedClaims.includes("Türkiye'de tek"));
  assert.match(reportMarkdown, /singleClaimPermitted = false/);
  assert.match(reportMarkdown, /T55/);
});
