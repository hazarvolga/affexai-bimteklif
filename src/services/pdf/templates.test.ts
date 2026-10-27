import assert from 'node:assert/strict';
import { test } from 'node:test';
import { templates, type PdfData } from './templates';
import { QuoteStatus } from '../../types';

export const fixture: PdfData = {
  company: { name: 'İnşaat', address: 'Çankaya & Ankara', phone: '123', email: 'a@example.com', taxNumber: '456' },
  client: { name: 'Çağrı', address: 'İzmir', email: 'c@example.com', phone: '789' },
  quotation: { quoteNumber: 'Q-1', projectName: 'Ölçüm', date: '08.10.2026', expiryDate: '15.10.2026', currency: 'TRY', status: QuoteStatus.DRAFT, revisionVersion: 2, subtotal: 1234, discountTotal: 0, vatTotal: 246.8, grandTotal: 1480.8 },
  items: [{ description: 'Beton < C30 & C40', unit: 'm³', quantity: 2, unitPrice: 617, discountPercent: 0, vatPercent: 20, total: 1234 }],
  evidenceSummary: { verifiedItemCount: 1, sourceDocumentCount: 1, ruleVersions: ['v1'] },
};

const payload = '<script>alert(1)</script><img/src="http://127.0.0.1:9999/private"/onerror=alert(1)><!--\'&';
const escaped = '&lt;script&gt;alert(1)&lt;/script&gt;&lt;img/src=&quot;http://127.0.0.1:9999/private&quot;/onerror=alert(1)&gt;&lt;!--&#39;&amp;';

for (const template of templates) {
  for (const section of ['company', 'client', 'quotation'] as const) {
    for (const field of Object.keys(fixture[section])) {
      test(`${template.id}: escapes ${section}.${field}`, () => {
        const data = { ...fixture, [section]: { ...fixture[section], [field]: payload } };
        const html = template.htmlTemplate(data);
        assert.ok(!html.includes(payload));
        assert.doesNotMatch(html, /<script|<img/i);
        // Fields omitted by a design need not appear; displayed fields must be escaped.
        const marker = 'TENANT_MARKER';
        const probe = template.htmlTemplate({ ...fixture, [section]: { ...fixture[section], [field]: marker } });
        if (probe.includes(marker)) assert.ok(html.includes(escaped));
      });
    }
  }
  for (const field of Object.keys(fixture.items[0])) {
    test(`${template.id}: escapes item.${field}`, () => {
      const html = template.htmlTemplate({ ...fixture, items: [{ ...fixture.items[0], [field]: payload }] });
      assert.doesNotMatch(html, /<script|<img/i);
    });
  }
  test(`${template.id}: escapes evidence and uses offline fonts`, () => {
    const html = template.htmlTemplate({ ...fixture, evidenceSummary: { verifiedItemCount: payload as unknown as number, sourceDocumentCount: payload as unknown as number, ruleVersions: [payload] } });
    assert.ok(html.includes(escaped));
    assert.doesNotMatch(html, /<script|<img|@import|fonts\.googleapis/i);
    assert.match(html, /Arial/);
  });
  test(`${template.id}: preserves legitimate text, totals and optional evidence`, () => {
    const before = JSON.stringify(fixture);
    const html = template.htmlTemplate(fixture);
    assert.ok(html.includes('Çağrı'));
    assert.ok(html.includes('Beton &lt; C30 &amp; C40'));
    assert.ok(html.includes('1.480,8 TRY'));
    assert.ok(html.includes('Kural sürümleri: v1'));
    assert.ok(!template.htmlTemplate({ ...fixture, evidenceSummary: undefined }).includes('Kural sürümleri:'));
    assert.equal(JSON.stringify(fixture), before);
  });
}

test("default template shows the contractor's name and the offer's real validity date", () => {
  const template = templates.find((candidate) => candidate.id === "default_construction")!;
  const html = template.htmlTemplate({
    company: { name: "Örnek Yapı A.Ş." },
    client: { name: "Müşteri" },
    quotation: { quoteNumber: "T-1", projectName: "P", date: "26.10.2026", expiryDate: "25.11.2026", currency: "TRY", status: "sent" as never, revisionVersion: 1, subtotal: 0, discountTotal: 0, vatTotal: 0, grandTotal: 0 },
    items: [],
  });
  assert.doesNotMatch(html, /TeklifPro/);
  assert.match(html, /<div class="logo">Örnek Yapı A\.Ş\.<\/div>/);
  assert.match(html, /25\.11\.2026 tarihine kadar geçerlidir/);
  assert.doesNotMatch(html, /7 gün geçerlidir/);
});

for (const template of templates) {
  test(`${template.id}: shows profit and overhead as its own row only when the quotation adds it`, () => {
    const withShare = template.htmlTemplate({ ...fixture, quotation: { ...fixture.quotation, overheadProfitPercent: 15, overheadProfitTotal: 185.1 } });
    assert.match(withShare, /Müteahhitlik Kârı ve Genel Gider \(%15\):/);
    assert.match(withShare, /185,1/);
    for (const quotation of [fixture.quotation, { ...fixture.quotation, overheadProfitPercent: 0, overheadProfitTotal: 0 }]) {
      assert.doesNotMatch(template.htmlTemplate({ ...fixture, quotation }), /Genel Gider/);
    }
  });
}
