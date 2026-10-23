import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { useTestIsolation } from "../../server/routes/test-isolation";

useTestIsolation();

test("manual bank-transfer review commits exactly one terminal decision", { timeout: 30_000 }, async () => {
  const [{ db }, schema, billing] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./bank-transfer"),
  ]);
  const { adminAuditLogs, companies, memberships, plans, subscriptions, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Concurrent payment review" }).returning();
  const [owner, firstAdmin, secondAdmin] = await db.insert(users).values([
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Owner", emailVerified: new Date() },
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Admin A", emailVerified: new Date() },
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Admin B", emailVerified: new Date() },
  ]).returning();
  await db.insert(memberships).values([
    { userId: owner.id, companyId: company.id, role: "owner" },
    { userId: firstAdmin.id, companyId: company.id, role: "admin" },
    { userId: secondAdmin.id, companyId: company.id, role: "admin" },
  ]);
  const [plan] = await db.insert(plans).values({ name: "Paid plan", monthlyPrice: 1000, monthlyQuoteLimit: 10 }).returning();
  const requestId = crypto.randomUUID();
  await db.insert(adminAuditLogs).values({
    adminId: owner.id,
    targetCompanyId: company.id,
    action: "billing.payment_request.submitted",
    details: {
      requestId,
      referenceCode: "BM-2026-RACE-1",
      companyId: company.id,
      companyName: company.name,
      userId: owner.id,
      userEmail: "",
      planId: plan.id,
      planName: plan.name,
      amountTry: 1000,
      billingCycle: "monthly",
      status: "pending_approval",
    },
  });

  const outcomes = await Promise.allSettled([
    billing.reviewBankTransferByAdmin({ adminId: firstAdmin.id, requestId, decision: "approved" }),
    billing.reviewBankTransferByAdmin({ adminId: secondAdmin.id, requestId, decision: "rejected" }),
  ]);

  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
  assert.match(String(rejected?.reason?.message), /^PAYMENT_REQUEST_ALREADY_REVIEWED$/);

  const terminalEvents = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetCompanyId, company.id));
  assert.equal(terminalEvents.filter((event) => [
    "billing.payment_request.approved",
    "billing.payment_request.rejected",
  ].includes(event.action)).length, 1);

  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.companyId, company.id));
  const winningDecision = outcomes.find((outcome) => outcome.status === "fulfilled") as PromiseFulfilledResult<{ status: string }>;
  assert.equal(Boolean(subscription), winningDecision.value.status === "approved");
});

test("manual bank-transfer initialization is idempotent under concurrency", { timeout: 30_000 }, async () => {
  const [{ db }, schema, billing] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./bank-transfer"),
  ]);
  const { adminAuditLogs, companies, memberships, plans, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Concurrent payment init" }).returning();
  const [owner] = await db.insert(users).values({
    email: `${crypto.randomUUID()}@example.test`,
    fullName: "Owner",
    emailVerified: new Date(),
  }).returning();
  await db.insert(memberships).values({ userId: owner.id, companyId: company.id, role: "owner" });
  const [plan] = await db.insert(plans).values({ name: "Paid init plan", monthlyPrice: 1500, monthlyQuoteLimit: 10 }).returning();
  const input = {
    companyId: company.id,
    companyName: company.name,
    userId: owner.id,
    userEmail: owner.email,
    planId: plan.id,
    billingCycle: "yearly" as const,
  };

  const [first, second] = await Promise.all([
    billing.createInitialPaymentOrder(input),
    billing.createInitialPaymentOrder(input),
  ]);

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.requestId, second.requestId);
  assert.equal([first.createdNow, second.createdNow].filter(Boolean).length, 1);
  const events = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetCompanyId, company.id));
  assert.equal(events.filter((event) => event.action === "billing.payment_request.created").length, 1);
});

test("manual bank-transfer submission cannot rewrite or reopen its immutable request", { timeout: 30_000 }, async () => {
  const [{ db }, schema, billing] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./bank-transfer"),
  ]);
  const { adminAuditLogs, companies, memberships, plans, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Immutable payment request" }).returning();
  const [owner, admin] = await db.insert(users).values([
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Owner", emailVerified: new Date() },
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Admin", emailVerified: new Date() },
  ]).returning();
  await db.insert(memberships).values([
    { userId: owner.id, companyId: company.id, role: "owner" },
    { userId: admin.id, companyId: company.id, role: "admin" },
  ]);
  const [firstPlan, secondPlan] = await db.insert(plans).values([
    { name: "First plan", monthlyPrice: 1000, monthlyQuoteLimit: 10 },
    { name: "Second plan", monthlyPrice: 5000, monthlyQuoteLimit: 100 },
  ]).returning();
  const order = await billing.createInitialPaymentOrder({
    companyId: company.id,
    companyName: company.name,
    userId: owner.id,
    userEmail: owner.email,
    planId: firstPlan.id,
    billingCycle: "monthly",
  });
  assert.ok(order);

  await assert.rejects(
    billing.submitBankTransferNotification({
      companyId: company.id,
      userId: owner.id,
      payload: {
        requestId: order.requestId,
        planId: secondPlan.id,
        billingCycle: "yearly",
        bankAccountId: null,
        senderName: "Immutable Ltd.",
        receiptNumber: "RACE-1",
        taxOffice: null,
        taxNumber: null,
        notes: null,
      },
    }),
    /PAYMENT_REQUEST_SNAPSHOT_MISMATCH/,
  );

  await billing.submitBankTransferNotification({
    companyId: company.id,
    userId: owner.id,
    payload: {
      requestId: order.requestId,
      planId: firstPlan.id,
      billingCycle: "monthly",
      bankAccountId: null,
      senderName: "Immutable Ltd.",
      receiptNumber: "RACE-1",
      taxOffice: "Kadıköy",
      taxNumber: "1234567890",
      notes: null,
    },
  });
  await billing.reviewBankTransferByAdmin({ adminId: admin.id, requestId: order.requestId, decision: "rejected" });

  await assert.rejects(
    billing.submitBankTransferNotification({
      companyId: company.id,
      userId: owner.id,
      payload: {
        requestId: order.requestId,
        planId: firstPlan.id,
        billingCycle: "monthly",
        bankAccountId: null,
        senderName: "Immutable Ltd.",
        receiptNumber: "RACE-2",
        taxOffice: null,
        taxNumber: null,
        notes: null,
      },
    }),
    /PAYMENT_REQUEST_ALREADY_SUBMITTED/,
  );

  const [request] = await billing.getCompanyPaymentRequests(company.id);
  assert.equal(request.status, "rejected");
  assert.equal(request.planId, firstPlan.id);
  assert.equal(request.amountTry, 1000);
  const events = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetCompanyId, company.id));
  assert.equal(events.filter((event) => event.action === "billing.payment_request.submitted").length, 1);

  const secondOrder = await billing.createInitialPaymentOrder({
    companyId: company.id,
    companyName: company.name,
    userId: owner.id,
    userEmail: owner.email,
    planId: secondPlan.id,
    billingCycle: "monthly",
  });
  assert.ok(secondOrder);
  await assert.rejects(
    billing.submitBankTransferNotification({
      companyId: company.id,
      userId: owner.id,
      payload: {
        requestId: secondOrder.requestId,
        planId: secondPlan.id,
        billingCycle: "monthly",
        bankAccountId: null,
        senderName: "Immutable Ltd.",
        receiptNumber: " race-1 ",
        taxOffice: null,
        taxNumber: null,
        notes: null,
      },
    }),
    /PAYMENT_RECEIPT_ALREADY_USED/,
  );
});

test("a second approved payment extends an active matching subscription", { timeout: 30_000 }, async () => {
  const [{ db }, schema, billing] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./bank-transfer"),
  ]);
  const { companies, memberships, plans, subscriptions, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Subscription extension" }).returning();
  const [owner, admin] = await db.insert(users).values([
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Owner", emailVerified: new Date() },
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Admin", emailVerified: new Date() },
  ]).returning();
  await db.insert(memberships).values([
    { userId: owner.id, companyId: company.id, role: "owner" },
    { userId: admin.id, companyId: company.id, role: "admin" },
  ]);
  const [plan] = await db.insert(plans).values({ name: "Extension plan", monthlyPrice: 1000, monthlyQuoteLimit: 10 }).returning();

  const purchase = async (receiptNumber: string) => {
    const order = await billing.createInitialPaymentOrder({ companyId: company.id, companyName: company.name, userId: owner.id, userEmail: owner.email, planId: plan.id, billingCycle: "monthly" });
    assert.ok(order);
    await billing.submitBankTransferNotification({
      companyId: company.id,
      userId: owner.id,
      payload: { requestId: order.requestId, planId: plan.id, billingCycle: "monthly", bankAccountId: null, senderName: company.name, receiptNumber, taxOffice: null, taxNumber: null, notes: null },
    });
    await billing.reviewBankTransferByAdmin({ adminId: admin.id, requestId: order.requestId, decision: "approved" });
  };

  await purchase("EXTENSION-1");
  const [first] = await db.select().from(subscriptions).where(eq(subscriptions.companyId, company.id));
  assert.ok(first.currentPeriodEnd);
  await purchase("EXTENSION-2");
  const [second] = await db.select().from(subscriptions).where(eq(subscriptions.companyId, company.id));
  assert.equal(second.currentPeriodStart.getTime(), first.currentPeriodStart.getTime());
  assert.equal(second.currentPeriodEnd!.getTime() - first.currentPeriodEnd.getTime(), 30 * 24 * 60 * 60 * 1000);
});

test("receipt replay is serialized globally and inactive plans fail closed at review", { timeout: 30_000 }, async () => {
  const [{ db }, schema, billing] = await Promise.all([
    import("../../db"),
    import("../../db/schema"),
    import("./bank-transfer"),
  ]);
  const { adminAuditLogs, companies, memberships, plans, users } = schema;
  const [company] = await db.insert(companies).values({ name: "Global receipt race" }).returning();
  const [owner, admin] = await db.insert(users).values([
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Owner", emailVerified: new Date() },
    { email: `${crypto.randomUUID()}@example.test`, fullName: "Admin", emailVerified: new Date() },
  ]).returning();
  await db.insert(memberships).values([
    { userId: owner.id, companyId: company.id, role: "owner" },
    { userId: admin.id, companyId: company.id, role: "admin" },
  ]);
  const [firstPlan, secondPlan, inactivePlan] = await db.insert(plans).values([
    { name: "Race A", monthlyPrice: 1000, monthlyQuoteLimit: 10 },
    { name: "Race B", monthlyPrice: 2000, monthlyQuoteLimit: 20 },
    { name: "Inactive after submit", monthlyPrice: 3000, monthlyQuoteLimit: 30 },
  ]).returning();
  const create = async (planId: string) => {
    const order = await billing.createInitialPaymentOrder({ companyId: company.id, companyName: company.name, userId: owner.id, userEmail: owner.email, planId, billingCycle: "monthly" });
    assert.ok(order);
    return order;
  };
  const [firstOrder, secondOrder] = await Promise.all([create(firstPlan.id), create(secondPlan.id)]);
  const submit = (requestId: string, planId: string, receiptNumber: string, bankAccountId: string) => billing.submitBankTransferNotification({
    companyId: company.id,
    userId: owner.id,
    payload: { requestId, planId, billingCycle: "monthly", bankAccountId, senderName: company.name, receiptNumber, taxOffice: null, taxNumber: null, notes: null },
  });
  const replayOutcomes = await Promise.allSettled([
    submit(firstOrder.requestId, firstPlan.id, "GLOBAL-RACE-1", "bank-garanti-try"),
    submit(secondOrder.requestId, secondPlan.id, "ＧＬＯＢＡＬ－ＲＡＣＥ－１", "bank-isbank-try"),
  ]);
  assert.equal(replayOutcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const replayFailure = replayOutcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
  assert.match(String(replayFailure?.reason?.message), /^PAYMENT_RECEIPT_ALREADY_USED$/);
  const raceEvents = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetCompanyId, company.id));
  assert.equal(raceEvents.filter((event) => event.action === "billing.payment_request.submitted").length, 1);

  const inactiveOrder = await create(inactivePlan.id);
  await submit(inactiveOrder.requestId, inactivePlan.id, "INACTIVE-PLAN-1", "bank-garanti-try");
  await db.update(plans).set({ isActive: false }).where(eq(plans.id, inactivePlan.id));
  await assert.rejects(
    billing.reviewBankTransferByAdmin({ adminId: admin.id, requestId: inactiveOrder.requestId, decision: "approved" }),
    /PAYMENT_REQUEST_PLAN_UNAVAILABLE/,
  );
});
