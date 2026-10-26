import assert from "node:assert/strict";
import test from "node:test";

import { subGuidesData } from "./subGuidesData";
import * as sourceData from "./sourceData";
import * as allplanConstants from "../constants/allplanConstants";
import { LESSONS_CONTENT } from "../data/lessonsContent";
import * as demoData from "../smartcheck/demoData";
import { QuoteStatus } from "../types";
import { templates, type PdfData } from "../services/pdf/templates";
import {
  DEFAULT_EMAIL_TEMPLATES,
  escapeHtml,
  renderTransactionalEmail,
  type EmailTemplateId,
} from "../server/auth/email-templates";

test("Academy sub-guides, source data, Allplan constants, and demo catalogs maintain structural integrity", () => {
  const guideEntries = Object.entries(subGuidesData);
  assert.ok(guideEntries.length >= 10);
  for (const [key, guide] of guideEntries) {
    assert.equal(guide.id, key);
    assert.ok(guide.title.length > 0);
    assert.ok(guide.summary.length > 0);
    assert.ok(Array.isArray(guide.standards));
    assert.ok(Array.isArray(guide.keyTakeaways));
  }

  assert.ok(Array.isArray(sourceData.data6D));
  assert.ok(sourceData.data6D.length >= 3);
  assert.ok(Object.keys(sourceData).length >= 5);

  assert.ok(Array.isArray(allplanConstants.NAV_ITEMS));
  assert.ok(Array.isArray(allplanConstants.COURSE_TREE));
  assert.ok(allplanConstants.COURSE_TREE.length >= 1);

  const lessons = Object.values(LESSONS_CONTENT);
  assert.ok(lessons.length >= 5);
  for (const lesson of lessons) {
    assert.ok(lesson.title.length > 0);
    assert.ok(Array.isArray(lesson.steps) && lesson.steps.length > 0);
  }

  assert.ok(Array.isArray(demoData.demoRules) && demoData.demoRules.length > 0);
});

test("PDF templates and transactional email templates render and escape HTML safely", () => {
  const samplePdfData: PdfData = {
    company: {
      name: "T43 Mühendislik <script>alert(1)</script>",
      taxNumber: "1234567890",
      address: "Kadıköy / İstanbul",
      phone: "+90 216 000 00 00",
      email: "info@bimmetraj.com",
    },
    client: {
      name: "İşveren A.Ş. & Ortakları",
      address: "Ataşehir / İstanbul",
      email: "ihale@isveren.test",
      phone: "+90 216 111 22 33",
    },
    quotation: {
      quoteNumber: "TEK-2026-001",
      projectName: "Deprem İzolatörlü Hastane Kampüsü",
      date: "2026-10-26",
      expiryDate: "2026-11-26",
      currency: "TRY",
      status: QuoteStatus.SENT,
      revisionVersion: 2,
      subtotal: 100000,
      discountTotal: 5000,
      vatTotal: 19000,
      grandTotal: 114000,
    },
    items: [
      {
        description: "C35/45 Temel Betonu <img src=x onerror=alert(1)>",
        unit: "m3",
        quantity: 250,
        unitPrice: 400,
        discountPercent: 5,
        vatPercent: 20,
        total: 114000,
      },
    ],
    evidenceSummary: {
      verifiedItemCount: 1,
      sourceDocumentCount: 1,
      ruleVersions: ["rg33331-2026.1", "csb-minha-2026.1"],
    },
  };

  assert.equal(templates.length, 3);
  for (const tpl of templates) {
    const htmlWithEvidence = tpl.htmlTemplate(samplePdfData);
    assert.ok(htmlWithEvidence.includes("TEK-2026-001"));
    assert.ok(!htmlWithEvidence.includes("<script>alert(1)</script>"));
    assert.ok(!htmlWithEvidence.includes("<img src=x onerror=alert(1)>"));
    assert.ok(htmlWithEvidence.includes("&lt;img src=x onerror=alert(1)&gt;"));
    assert.ok(htmlWithEvidence.includes("Kaynak ve doğrulama özeti"));

    const htmlWithoutEvidence = tpl.htmlTemplate({
      ...samplePdfData,
      company: { name: "Yalın Firma" },
      client: { name: "Yalın Müşteri" },
      evidenceSummary: undefined,
    });
    assert.ok(htmlWithoutEvidence.includes("Yalın Müşteri"));
  }

  assert.equal(escapeHtml(`A&B<C>"D"'E'`), "A&amp;B&lt;C&gt;&quot;D&quot;&#39;E&#39;");

  const templateIds = Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateId[];
  assert.equal(templateIds.length, 5);
  for (const id of templateIds) {
    const rendered = renderTransactionalEmail(id, "https://bimmetraj.com/verify?t=1&x=2", {
      recipientName: "Hazar <Admin>",
      detailRows: [
        { label: "Sipariş Kodu", value: "ORD-2026-01", mono: true, highlight: true },
        { label: "Paket", value: "Kurumsal BIM", mono: false, highlight: false },
      ],
    });
    assert.ok(rendered.subject.length > 0);
    assert.ok(rendered.text.includes("ORD-2026-01"));
    assert.ok(rendered.html.includes("Hazar &lt;Admin&gt;"));
    assert.ok(rendered.html.includes("ORD-2026-01"));

    const renderedCompanyFallback = renderTransactionalEmail(id, "https://bimmetraj.com/action", {
      companyName: "BIMPlan Akademi",
      subjectOverride: "Özel Başlık",
      introOverride: "Özel Giriş",
    });
    assert.equal(renderedCompanyFallback.subject, "Özel Başlık");
    assert.ok(renderedCompanyFallback.html.includes("BIMPlan Akademi Ekibi"));
  }
});
