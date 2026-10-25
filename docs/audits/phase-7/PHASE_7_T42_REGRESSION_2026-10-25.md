# Faz 7 — T42 Yetki, Kaynak Sınırı, Sektör Varsayılanı ve Orphan Lease Regresyonu Kanıt Dosyası

- **İş ID:** `T42`
- **Tarih:** 25 Ekim 2026
- **Sürüm:** `Rev. 78` (`BIM-CALC-2026-10-25.72`)
- **Durum:** **KOD VE REGRESYON TESTLERİ TAMAMLANDI — gerçek banka/dekont mutabakatı dış girdi (PARTIAL)**

## 1. Kapsam ve Tamamlanan Kod Kalemleri

1. **§8.4 Teklif Editörü Sektör Varsayılanı Kusurunun Giderilmesi (`CreateQuote.tsx`, `integrity.ts`, `edit.ts`):**
   - `resolveQuotationIndustryId(industryId, loadIndustries)` yardımcı fonksiyonu eklendi (`src/services/quotations/integrity.ts`).
   - `industries` kataloğu boş olduğunda (ör. tohumlanmamış test/dev şeması) `CreateQuote` tarafından gönderilen varsayılan `'residential'` değeri `500` FK ihlali (`quotations_industry_id_industries_id_fk`) üretmek yerine güvenli biçimde `null`'a düşer.
   - Katalog dolu olduğunda tanımsız veya `enabled = false` olan bir sektör kimliği `400 QuotationIntegrityError` (`"Seçilen sektör kataloğunda aktif bir kayıt bulunamadı."`) ile reddedilir.
   - `CreateQuote.tsx` üzerinde `/api/ai/industries` yanıtı geldiğinde `selectedIndustry` durumu aktif katalogla hizalanır.
2. **Academy Entitlement (`ACADEMY_ENABLED = false` & Kayıt Sınırı Negatifleri — `academyEntitlement.ts`):**
   - `isAcademyRuntimeEnabled()` ve `createRequireAllplanEntitlement()` eklendi.
   - `ACADEMY_ENABLED = false` iken (`ACADEMY_RUNTIME_ENABLED=true` açıkça verilmedikçe) `/api/academy/allplan/*` rotaları veritabanı sorgusu dahi çalıştırmadan `403 ACADEMY_FEATURE_DISABLED` ile reddedilir.
   - Özellik açık olduğunda aktif `academy_enrollments` kaydı bulunmayan kullanıcılar `403 ACADEMY_ENTITLEMENT_REQUIRED` alır ve `viewer` rolü sertifika iptal uç noktasından yetki atlayamaz.
3. **Uzun İş Heartbeat / Orphan Lease Devralma (`processor.ts`):**
   - `DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS = 15 * 60 * 1000` (15 dakika) ve `isSmartCheckLeaseExpired(run, now, leaseTimeoutMs)` tanımlandı.
   - `claimSmartCheckRun`, `updatedAt` (veya `startedAt`) zaman damgası lease süresini aşmış (`running`) yetim işleri yeni bir `workerLeaseToken` üretip güvenli biçimde devralır; eski işçi uyanırsa `assertRunLease` kontrolünde `SmartCheckRunLeaseLostError` ile durdurularak çift işlem engellenir.
4. **Ücretli İşlem Atlatma, Salt-Okunur Impersonation ve Platform Süper Admin Koruması (`auth.ts`, `registration.ts`, `t42-regression.test.ts`):**
   - Askıdaki (`past_due`/`canceled`) aboneliklerde değiştirici istekler `403 SUBSCRIPTION_SUSPENDED` ile reddedilir.
   - Salt-okunur impersonation oturumlarında `/api/auth/impersonate/exit` dışındaki tüm yazma istekleri `403 IMPERSONATION_READ_ONLY` ile engellenir.
   - `isPlatformSuperAdminEmail` ile `hazarvolga@gmail.com` kayıt ve giriş akışlarında otomatik `is_super_admin = true` ve `bm_admin` çerezi alır; canlı üretim veritabanında (`bimmetraj_production`) da yetki ve audit kaydı doğrulandı.

## 2. Doğrulama Komutu ve Çıktısı

```bash
pnpm exec tsx --test src/server/routes/t42-regression.test.ts src/server/auth/registration.test.ts
```

- `t42-regression.test.ts`: `4/4 PASS`
- `registration.test.ts`: `6/6 PASS`

## 3. Kalan Sınır (Dış Girdi)

- Gerçek banka havale/EFT dekont mutabakatı örneği ve canlı rollout doğrulaması Hazar'dan izinli gerçek örnek geldiğinde tamamlanacaktır.
