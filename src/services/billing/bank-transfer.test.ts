import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIban,
  generatePaymentReferenceCode,
  normalizeIban,
  isValidIban,
  getActiveBankAccounts,
  getAllBankAccountsForAdmin,
  selectBankAccount,
  parseBankAccountsInput,
  parseEnvBankAccounts,
  reconstructPaymentRequests,
  normalizePaymentReceipt,
  submitBankTransferInputSchema,
} from "./bank-transfer";
import {
  calculateBillingPeriodPricing,
  formatBillingCycleLabel,
  billingPeriodEnd,
  getBillingPeriodOption,
} from "./billing-periods";

test("normalizeIban and formatIban normalize Turkish IBANs cleanly", () => {
  const raw = "tr33 0006 1005 1978 6457 8413 26";
  const normalized = normalizeIban(raw);
  assert.equal(normalized, "TR330006100519786457841326");
  assert.equal(formatIban(normalized), "TR33 0006 1005 1978 6457 8413 26");
});

test("bank accounts fail closed when env is empty, invalid or has an invalid checksum", () => {
  assert.deepEqual(parseEnvBankAccounts(""), []);
  assert.deepEqual(parseEnvBankAccounts("not json"), []);
  assert.equal(isValidIban("TR33 0006 1005 1978 6457 8413 26"), true);
  assert.equal(isValidIban("TR33 0006 2000 1230 0006 2990 10"), false);
  assert.equal(isValidIban("TR56 0006 4000 0011 2345 6789 01"), false);
  assert.equal(isValidIban("TR33 0006 1005 1978 6457 8413 2"), false);

  const customEnv = JSON.stringify([
    {
      id: "bank-custom-1",
      bankName: "Ziraat Bankası",
      branchName: "Kurumsal Şube",
      accountHolder: "AffexAI Teknoloji A.Ş.",
      iban: "TR330006100519786457841326",
      currency: "TRY",
      descriptionNote: "Lütfen açıklama kısmına referans kodunu yazınız.",
      isActive: true,
    },
  ]);
  const parsed = parseEnvBankAccounts(customEnv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].bankName, "Ziraat Bankası");
  assert.equal(parsed[0].accountHolder, "AffexAI Teknoloji A.Ş.");
  assert.deepEqual(parseEnvBankAccounts(customEnv.replace("TR330006100519786457841326", "TR330006200012300006299010")), []);
});

test("parseBankAccountsInput validates multi-bank payload and rejects malformed IBAN", () => {
  const valid = parseBankAccountsInput({
    accounts: [
      {
        id: "acc-1",
        bankName: "Garanti BBVA",
        branchName: "Maslak Kurumsal",
        accountHolder: "BIMMetraj Yazılım A.Ş.",
        iban: "TR33 0006 1005 1978 6457 8413 26",
        currency: "TRY",
        descriptionNote: "Havale/EFT açıklamasına sipariş kodunu ekleyiniz.",
        isActive: true,
      },
      {
        id: "acc-2",
        bankName: "Türkiye İş Bankası",
        branchName: "Levent Ticari",
        accountHolder: "BIMMetraj Yazılım A.Ş.",
        iban: "GB82 WEST 1234 5698 7654 32",
        currency: "TRY",
        descriptionNote: "FAST / EFT 7/24",
        isActive: true,
      },
    ],
  });
  assert.ok(valid);
  assert.equal(valid.length, 2);
  assert.equal(valid[0].iban, "TR330006100519786457841326");

  const invalid = parseBankAccountsInput({
    accounts: [
      {
        id: "acc-bad",
        bankName: "X",
        accountHolder: "Y",
        iban: "12345",
        currency: "TRY",
        isActive: true,
      },
    ],
  });
  assert.equal(invalid, null);
  assert.equal(parseBankAccountsInput({ accounts: [{ bankName: "Test Bank", accountHolder: "Test Firm", iban: "TR330006200012300006299010" }] }), null);
});

test("legacy bank records remain repairable by admin but invalid accounts are never public", async () => {
  const accounts = [
    { id: "valid", bankName: "Valid Bank", accountHolder: "Test Firm", iban: "TR330006100519786457841326", isActive: true },
    { id: "invalid", bankName: "Old Bank", accountHolder: "Test Firm", iban: "TR330006200012300006299010", isActive: true },
  ];
  const runner = { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ details: { accounts } }] }) }) }) }) };
  const admin = await getAllBankAccountsForAdmin(runner as never);
  assert.deepEqual(admin.map((account) => account.id), ["valid", "invalid"]);
  const visible = await getActiveBankAccounts(runner as never);
  assert.deepEqual(visible.map((account) => account.id), ["valid"]);
});

test("bank account lookup never falls back to environment accounts on database failure", async () => {
  const runner = { select: () => { throw new Error("connection unavailable"); } };
  await assert.rejects(() => getActiveBankAccounts(runner as never), /connection unavailable/);
});

test("explicit missing or removed bank account is never silently substituted", () => {
  const account = { id: "bank-1", bankName: "Bank", accountHolder: "Company", iban: "TR330006100519786457841326", isActive: true, currency: "TRY" as const, branchName: null, descriptionNote: null };
  assert.equal(selectBankAccount([account], "bank-1"), account);
  assert.throws(() => selectBankAccount([account], "removed-bank"), /BANK_ACCOUNT_UNAVAILABLE/);
  assert.throws(() => selectBankAccount([], "removed-bank"), /BANK_ACCOUNT_UNAVAILABLE/);
  assert.equal(selectBankAccount([], null), null);
});

test("admin can deactivate a legacy invalid account or explicitly remove all accounts", async () => {
  const legacy = { id: "invalid", bankName: "Old Bank", accountHolder: "Test Firm", iban: "TR330006200012300006299010", isActive: false };
  assert.equal(parseBankAccountsInput({ accounts: [legacy] })?.[0].isActive, false);
  assert.deepEqual(parseBankAccountsInput({ accounts: [] }), []);
  const runner = { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ details: { accounts: [] } }] }) }) }) }) };
  assert.deepEqual(await getAllBankAccountsForAdmin(runner as never), []);
  assert.deepEqual(await getActiveBankAccounts(runner as never), []);
});

test("generatePaymentReferenceCode produces deterministic prefix with year and suffix", () => {
  const code = generatePaymentReferenceCode("Drone Mühendislik", new Date("2026-10-15T10:00:00Z"), "9F2A");
  assert.equal(code, "BM-2026-DRN-9F2A");
});

test("bank transfer submission requires a receipt or bank transaction reference", () => {
  const base = {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    planId: "2b507e20-83d1-4b21-9fc1-000000000004",
    billingCycle: "monthly",
    senderName: "Drone Mühendislik",
  };
  assert.equal(submitBankTransferInputSchema.safeParse(base).success, false);
  const parsed = submitBankTransferInputSchema.safeParse({ ...base, transferReference: "  bank-ref-1  " });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.receiptNumber, "bank-ref-1");
  assert.equal(normalizePaymentReceipt(" ＲＡＣＥ－１ "), "RACE-1");
  assert.equal(submitBankTransferInputSchema.safeParse({ ...base, transferReference: "RACE\u200B-1" }).success, false);
  assert.equal(submitBankTransferInputSchema.safeParse({ ...base, requestId: undefined, transferReference: "RACE-1" }).success, false);
});

test("calculateBillingPeriodPricing computes 0%, 10%, 20%, and 30% discounts accurately", () => {
  const m = calculateBillingPeriodPricing(5450, "monthly");
  assert.equal(m.discountPercent, 0);
  assert.equal(m.effectiveMonthlyPriceTry, 5450);
  assert.equal(m.totalPayableTry, 5450);
  assert.equal(m.discountAmountTry, 0);

  const s = calculateBillingPeriodPricing(5450, "semi_annual");
  assert.equal(s.discountPercent, 10);
  assert.equal(s.effectiveMonthlyPriceTry, 4905);
  assert.equal(s.totalPayableTry, 29430);
  assert.equal(s.discountAmountTry, 3270);

  const y = calculateBillingPeriodPricing(5450, "yearly");
  assert.equal(y.discountPercent, 20);
  assert.equal(y.effectiveMonthlyPriceTry, 4360);
  assert.equal(y.totalPayableTry, 52320);
  assert.equal(y.discountAmountTry, 13080);

  const b = calculateBillingPeriodPricing(5450, "biennial");
  assert.equal(b.discountPercent, 30);
  assert.equal(b.effectiveMonthlyPriceTry, 3815);
  assert.equal(b.totalPayableTry, 91560);
  assert.equal(b.discountAmountTry, 39240);
  assert.equal(formatBillingCycleLabel("biennial"), "2 Yıllık (%30 İndirim)");
});

test("reconstructPaymentRequests merges lifecycle events from awaiting_transfer to submitted to approved", () => {
  const events = [
    {
      id: "log-1",
      adminId: "user-1",
      targetCompanyId: "comp-1",
      action: "billing.payment_request.created",
      createdAt: new Date("2026-10-15T09:00:00Z"),
      details: {
        requestId: "req-100",
        referenceCode: "BM-2026-DRN-9F2A",
        companyId: "comp-1",
        companyName: "Drone Mühendislik",
        userId: "user-1",
        userEmail: "info@drone.com",
        planId: "2b507e20-83d1-4b21-9fc1-000000000004",
        planName: "5D BIM & SmartCheck",
        amountTry: 52320,
        billingCycle: "yearly",
        status: "awaiting_transfer",
      },
    },
    {
      id: "log-2",
      adminId: "user-1",
      targetCompanyId: "comp-1",
      action: "billing.payment_request.submitted",
      createdAt: new Date("2026-10-15T09:15:00Z"),
      details: {
        requestId: "req-100",
        referenceCode: "BM-2026-DRN-9F2A",
        companyId: "comp-1",
        companyName: "Drone Mühendislik",
        userId: "user-1",
        userEmail: "info@drone.com",
        planId: "2b507e20-83d1-4b21-9fc1-000000000004",
        planName: "5D BIM & SmartCheck",
        amountTry: 52320,
        billingCycle: "yearly",
        bankAccountId: "acc-1",
        bankName: "Garanti BBVA",
        iban: "TR330006100519786457841326",
        senderName: "Drone Mühendislik Ltd. Şti.",
        receiptNumber: "DEKONT-2026-88412",
        taxOffice: "Kadıköy V.D.",
        taxNumber: "1234567890",
        notes: "EFT ile gönderildi",
        status: "pending_approval",
      },
    },
    {
      id: "log-3",
      adminId: "admin-99",
      targetCompanyId: "comp-1",
      action: "billing.payment_request.approved",
      createdAt: new Date("2026-10-15T09:30:00Z"),
      details: {
        requestId: "req-100",
        reviewedByAdminId: "admin-99",
        adminDecisionNote: "Dekont Garanti BBVA hesabında doğrulandı.",
        status: "approved",
      },
    },
  ];

  const list = reconstructPaymentRequests(events);
  assert.equal(list.length, 1);
  assert.equal(list[0].requestId, "req-100");
  assert.equal(list[0].status, "approved");
  assert.equal(list[0].billingCycle, "yearly");
  assert.equal(list[0].amountTry, 52320);
  assert.equal(list[0].receiptNumber, "DEKONT-2026-88412");
  assert.equal(list[0].senderName, "Drone Mühendislik Ltd. Şti.");
  assert.equal(list[0].reviewedByAdminId, "admin-99");
  assert.equal(list[0].adminDecisionNote, "Dekont Garanti BBVA hesabında doğrulandı.");
});

test("payment lifecycle reduction never moves pending or terminal states backwards", () => {
  const base = {
    requestId: "req-monotonic",
    referenceCode: "BM-2026-MONOTONIC",
    companyId: "company",
    companyName: "Company",
    userId: "user",
    userEmail: "owner@example.test",
    planId: "plan",
    planName: "Plan",
    amountTry: 1000,
    billingCycle: "monthly",
  };
  const events = [
    { id: "submitted", adminId: "user", targetCompanyId: "company", action: "billing.payment_request.submitted", createdAt: new Date("2026-10-24T10:00:00Z"), details: base },
    { id: "created", adminId: "user", targetCompanyId: "company", action: "billing.payment_request.created", createdAt: new Date("2026-10-24T10:00:01Z"), details: base },
  ];
  assert.equal(reconstructPaymentRequests(events)[0].status, "pending_approval");
  const rejected = reconstructPaymentRequests([
    ...events,
    { id: "rejected", adminId: "admin", targetCompanyId: "company", action: "billing.payment_request.rejected", createdAt: new Date("2026-10-24T10:00:02Z"), details: { requestId: base.requestId } },
    { id: "late-submit", adminId: "user", targetCompanyId: "company", action: "billing.payment_request.submitted", createdAt: new Date("2026-10-24T10:00:03Z"), details: base },
  ]);
  assert.equal(rejected[0].status, "rejected");
});

test("billing period end follows the calendar for every cycle", () => {
  const start = new Date("2026-03-15T10:30:00.000Z");
  assert.equal(billingPeriodEnd(start, "monthly").toISOString(), "2026-04-15T10:30:00.000Z");
  assert.equal(billingPeriodEnd(start, "semi_annual").toISOString(), "2026-09-15T10:30:00.000Z");
  assert.equal(billingPeriodEnd(start, "yearly").toISOString(), "2027-03-15T10:30:00.000Z");
  assert.equal(billingPeriodEnd(start, "biennial").toISOString(), "2028-03-15T10:30:00.000Z");
});

test("billing period end clamps to the last day of a shorter month", () => {
  assert.equal(billingPeriodEnd(new Date("2027-01-31T08:00:00.000Z"), "monthly").toISOString(), "2027-02-28T08:00:00.000Z");
  assert.equal(billingPeriodEnd(new Date("2028-01-31T08:00:00.000Z"), "monthly").toISOString(), "2028-02-29T08:00:00.000Z");
  assert.equal(billingPeriodEnd(new Date("2028-02-29T08:00:00.000Z"), "yearly").toISOString(), "2029-02-28T08:00:00.000Z");
  assert.equal(billingPeriodEnd(new Date("2026-08-31T08:00:00.000Z"), "semi_annual").toISOString(), "2027-02-28T08:00:00.000Z");
});

test("a yearly period across a leap day keeps the contract date", () => {
  assert.equal(billingPeriodEnd(new Date("2027-06-01T00:00:00.000Z"), "yearly").toISOString(), "2028-06-01T00:00:00.000Z");
});

test("billing period end does not change the start date", () => {
  const start = new Date("2027-01-31T08:00:00.000Z");
  billingPeriodEnd(start, "monthly");
  assert.equal(start.toISOString(), "2027-01-31T08:00:00.000Z");
});
