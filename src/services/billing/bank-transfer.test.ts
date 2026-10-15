import assert from "node:assert/strict";
import test from "node:test";
import {
  formatIban,
  generatePaymentReferenceCode,
  normalizeIban,
  parseBankAccountsInput,
  parseEnvBankAccounts,
  reconstructPaymentRequests,
} from "./bank-transfer";

test("normalizeIban and formatIban normalize Turkish IBANs cleanly", () => {
  const raw = "tr33 0006 1005 1978 6457 8413 26";
  const normalized = normalizeIban(raw);
  assert.equal(normalized, "TR330006100519786457841326");
  assert.equal(formatIban(normalized), "TR33 0006 1005 1978 6457 8413 26");
});

test("parseEnvBankAccounts falls back to default multi-bank list when env is empty or invalid", () => {
  const fallback = parseEnvBankAccounts(undefined);
  assert.ok(fallback.length >= 2);
  assert.equal(fallback[0].currency, "TRY");
  assert.ok(fallback[0].iban.startsWith("TR"));

  const customEnv = JSON.stringify([
    {
      id: "bank-custom-1",
      bankName: "Ziraat Bankası",
      branchName: "Kurumsal Şube",
      accountHolder: "AffexAI Teknoloji A.Ş.",
      iban: "TR120001000123456789012345",
      currency: "TRY",
      descriptionNote: "Lütfen açıklama kısmına referans kodunu yazınız.",
      isActive: true,
    },
  ]);
  const parsed = parseEnvBankAccounts(customEnv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].bankName, "Ziraat Bankası");
  assert.equal(parsed[0].accountHolder, "AffexAI Teknoloji A.Ş.");
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
        iban: "TR56 0006 4000 0011 2345 6789 01",
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
});

test("generatePaymentReferenceCode produces deterministic prefix with year and suffix", () => {
  const code = generatePaymentReferenceCode("Drone Mühendislik", new Date("2026-10-15T10:00:00Z"), "9F2A");
  assert.equal(code, "BM-2026-DRN-9F2A");
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
        amountTry: 3950,
        billingCycle: "monthly",
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
        amountTry: 3950,
        billingCycle: "monthly",
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
  assert.equal(list[0].receiptNumber, "DEKONT-2026-88412");
  assert.equal(list[0].senderName, "Drone Mühendislik Ltd. Şti.");
  assert.equal(list[0].reviewedByAdminId, "admin-99");
  assert.equal(list[0].adminDecisionNote, "Dekont Garanti BBVA hesabında doğrulandı.");
});
