import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildSimpleRegistrationPayload } from './simple-registration';

const fields = {
  email: 'uzman@example.com',
  password: 'guclu-sifre-123',
  fullName: 'Uzman Kullanıcı',
  companyName: 'Örnek Mühendislik',
  termsAccepted: true,
  privacyAccepted: true,
  marketingConsent: false,
  website: '',
  formStartedAt: 1_700_000_000_000,
};

test('sade kayıt isteği paket seçmez, böylece ödeme siparişi oluşmaz', () => {
  const payload = buildSimpleRegistrationPayload(fields);
  assert.equal('selectedPlanId' in payload, false);
  assert.equal('planId' in payload, false);
  assert.equal(payload.selectedBillingCycle, 'monthly');
  assert.equal(payload.intent, 'workspace');
});

test('sade kayıt isteği orijinal formun zorunlu alanlarını ve bot korumasını taşır', () => {
  const payload = buildSimpleRegistrationPayload({ ...fields, website: 'spam.example' });
  assert.deepEqual(
    { email: payload.email, fullName: payload.fullName, companyName: payload.companyName, termsAccepted: payload.termsAccepted, privacyAccepted: payload.privacyAccepted },
    { email: fields.email, fullName: fields.fullName, companyName: fields.companyName, termsAccepted: true, privacyAccepted: true },
  );
  assert.equal(payload.password, fields.password);
  assert.equal(payload.website, 'spam.example', 'honeypot değeri sunucuya iletilir');
  assert.equal(payload.formStartedAt, fields.formStartedAt);
});

test('sade kayıt sayfası fiyat, paket ve deneme ibaresi göstermez', () => {
  const page = readFileSync('src/pages/RegisterSimple.tsx', 'utf8');
  for (const pattern of [/₺/, /14\s*g[üu]n/i, /deneme/i, /paket/i, /iskonto/i, /indirim/i, /havale/i, /fiyat/i]) {
    assert.doesNotMatch(page, pattern, `RegisterSimple.tsx: ${pattern}`);
  }
});

test('kayıt rotası bayrak kapalıyken sade sayfayı, açıkken orijinal sayfayı kullanır', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /REGISTER_PLAN_PICKER_ENABLED/);
  assert.match(app, /RegisterSimple/);
  const original = readFileSync('src/pages/Register.tsx', 'utf8');
  assert.match(original, /selectedPlanId: !isAcademy \? selectedPlan\.id : undefined/, 'orijinal kayıt sayfası değişmeden kalır');
});
