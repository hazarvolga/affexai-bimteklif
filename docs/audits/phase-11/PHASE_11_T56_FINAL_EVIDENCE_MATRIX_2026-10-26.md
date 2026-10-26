# Faz 11 / T56 — Tüm Açıklar İçin İzlenebilirlik ve Nihai Kanıt Matrisi

**Tarih:** 26 Ekim 2026
**Sürüm / Baseline:** Rev. 90 · `BIM-CALC-2026-10-25.84` · Matris Kimliği: `BIM-T56-FINAL-EVIDENCE-2026-10-26.1`
**Durum:** **KOD VE OTOMATİK DOĞRULAMA MATRİSİ TAMAMLANDI / DIŞ GİRDİ VE CANLI DEPLOY MADDELERİ AÇIK (`PARTIAL`)**
**Makinece Doğrulanan Kayıt:** `docs/audits/phase-11/final-evidence-matrix.json`
**Kontrat Testi:** `src/contracts/t56-final-evidence-matrix.test.ts`

---

## 1. Yönetici Özeti ve Kapanış Beyanı Sınırı

Bu belge, `docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md` kapsamındaki **56 To-Do maddesini (`T01–T56`)**, kaynak denetim raporundaki **31 bulgu kimliğini (`9 KOD + 6 BUG + 8 GAP + 5 SEO + 3 GEO`)**, **6 mühendislik ve mevzuat hesap motorunu** ve `Rev. 78–90` doğrulama koşularında yakalanıp kapatılan **11 canlı üretim kusurunu (`D01–D11`)** tek bir makinece doğrulanabilir izlenebilirlik matrisinde birleştirir.

> **Kesin Kural (Kapanış Beyanı Sınırı):**
> - **Dış girdi gerektirmeyen tüm yazılım, veritabanı, güvenlik, performans, kapsam (`T43 ≥ %80`) ve pazar araştırması (`T53–T54`) işleri `%100` tamamlanmış ve otomatik test kapılarına bağlanmıştır.**
> - Ancak dış uzman imzası (`T50`), izinli gerçek müşteri/vendor dosyası (`T32`, `T35–T39`, `T42` banka dekontu, `T45` gerçek büyük dosya, `T51`), hukuk/reklam incelemesi (`T55`) ve Hazar onaylı canlı Coolify deploy/smoke penceresi (`T40–T41`, `T44–T45`, `T47–T49`, `T52`) tamamlanmadan **"tam kapanış" (`fullClosureClaimPermitted = false`)**, **"genel mevzuat uygunluğu" (`generalRegulatoryComplianceClaimPermitted = false`)** veya **"Türkiye'de tek" (`singleInTurkeyClaimPermitted = false`)** beyanı yapılamaz.

| Kategori | Toplam | Kod & Otomatik Test Kapısı Tamam (`[x]`) | Kısmi — Kod Tamam, Dış Girdi / Canlı Deploy Bekliyor (`[ ]`) | Yalnız Dış Girdi / Canlı Kabul Bekleyen (`[ ]`) |
|---|---:|---:|---:|---:|
| **56 To-Do (`T01–T56`)** | 56 | **39** (`T01–T31`, `T33–T34`, `T43`, `T46–T48`, `T53–T54`) | **13** (`T32`, `T35–T39`, `T40–T42`, `T44–T45`, `T49`, `T56`) | **4** (`T50`, `T51`, `T52`, `T55`) |
| **31 Denetim ID (`KOD/BUG/GAP/SEO/GEO`)** | 31 | **25** (kod/test veya kanıtlı yanlış teşhis reddi tamam) | **6** (`BUG-06`, `GAP-03`, `GAP-05`, `GAP-06`, `GAP-07`, `SEO-05`/`GEO-03`) | 0 |
| **6 Hesap Motoru** | 6 | **6** (formül, birim, sınır ve negatif testleri tamam) | 0 | **6** (`T50` bağımsız uzman L3 imzası bekliyor) |
| **Oturumda Yakalanan Üretim Kusurları (`D01–D11`)** | 11 | **11** (RED→GREEN regresyon testleriyle kapatıldı) | 0 | 0 |

---

## 2. Oturumda Yakalanıp Kapatılan 11 Canlı Üretim Kusuru (`D01–D11`)

Faz 7–11 entegrasyon, 3-rollü PostgreSQL 16 RLS, kurtarma tatbikatı ve JSDOM UI kapsam koşuları sırasında yakalanan ve aynı iş diliminde regresyon testleriyle kapatılan kusurlar:

| ID | Sürüm | Kusur Tanımı | Düzeltilen Modüller | Regresyon Testi |
|---|---|---|---|---|
| **D01** | Rev. 78 | `CreateQuote` varsayılan `industryId: 'residential'` gönderdiğinde boş `industries` kataloğunda FK `500` hatası | `src/services/quotations/integrity.ts`, `src/pages/CreateQuote.tsx` | `src/server/routes/t42-regression.test.ts` |
| **D02** | Rev. 79 | `server-path.e2e.test.ts` sabit `.venv/bin/python` yolu nedeniyle CI sistem Python'unda atlanma kusuru | `src/ifc/python-runner.ts`, `src/ifc/server-path.e2e.test.ts` | `src/ifc/server-path.e2e.test.ts` |
| **D03** | Rev. 80 | `database-role-provision.pgtest.ts` pre-schema modunda mevcut olmayan tablolara `GRANT`/`POLICY` denemesi | `scripts/database-roles/contract.ts`, `src/contracts/database-role-provision.pgtest.ts` | `src/contracts/database-role-provision.pgtest.ts` |
| **D04** | Rev. 84 | `GET /api/smartcheck/pilot-cases` ucunun `0027` FORCE RLS altında `documents` tablosunu `withAppTenant` dışında okuması | `src/server/routes/smartcheck.ts` | `src/server/routes/smartcheck.integration.test.ts` |
| **D05** | Rev. 84 | `POST /api/smartcheck/documents/:id/process` inline fallback'in worker mutasyonlarını `bimmetraj_app` üzerinde çalıştırması | `src/server/routes/smartcheck.ts`, `src/smartcheck/import/repository.ts`, `src/ifc/smartcheck-processing.ts` | `src/server/routes/smartcheck.integration.test.ts` |
| **D06** | Rev. 86 | `deploy/backup/backup.py` `pg_dump` komutunda `FORCE RLS` tabloları için `--enable-row-security` bayrağının eksik olması (`0` satır yedekleme riski) | `deploy/backup/backup.py`, `deploy/backup/test_backup.py` | `src/contracts/t44-recovery-drill.pgtest.ts` |
| **D07** | Rev. 86 | `bimmetraj_worker` rolünün `SECURITY INVOKER` capability fonksiyonlarında `companies` ve `subscriptions` `FORCE RLS` politikalarına takılması | `drizzle-release/0027_smartcheck_pipeline_rls.sql`, `scripts/database-roles/contract.ts` | `src/contracts/t44-recovery-drill.pgtest.ts` |
| **D08** | Rev. 87 | `POST /api/auth/login` ve `GET /api/auth/me` uçlarında şirketsiz Academy öğrencilerinin `FORCE RLS` nedeniyle `accountType='workspace'` dönmesi | `src/server/routes/auth.ts` | `src/server/routes/company-invitation.integration.test.ts` |
| **D09** | Rev. 87 | `POST /api/admin/plans/sync-catalog` içinde `bimmetraj_control` transaction'ında `admin_audit_logs` `INSERT` `42501` yetki hatası | `src/server/routes/admin.ts` | `src/server/routes/t43-route-ratchet.integration.test.ts` |
| **D10** | Rev. 87 | `GET /api/admin/reports/usage` `topConsumers` sorgusunun `FORCE RLS` altındaki `companies` tablosunu tenant GUC olmadan okuyup 0 satır dönmesi | `src/server/routes/admin.ts` | `src/server/routes/t43-route-ratchet.integration.test.ts` |
| **D11** | Rev. 90 | `src/pages/Dashboard.tsx` içinde `if (user?.isSuperAdmin) return <Navigate ... />` erken dönüşünün `useEffect` kancasından önce çalışarak React `Rules-of-Hooks` hatası fırlatması | `src/pages/Dashboard.tsx` | `src/pages/t43-ui-pages-and-components.test.ts` |

---

## 3. Dış Girdi veya Canlı Deploy Penceresi Bekleyen 17 Maddenin Tam Listesi

Aşağıdaki maddelerin **kod, şema, kural motoru ve yerel/CI test altyapıları tamamlanmıştır**; kapanmaları yalnızca karşılarındaki dış girdiye veya Hazar onaylı canlı deploy penceresine bağlıdır:

1. **`T32` (Gerçek PDF/A Akışı):**
   - **Tamamlanan Kod/Test:** `ifc-worker` imajında SHA-256 sabitli `veraPDF 1.30.3`, `verapdf_report_xml` ham XML artifact'ı, 7/7 PDF/A-2b fixture matrisi (`src/smartcheck/pdf/pdfa-fixture-matrix.test.ts`).
   - **Kalan Dış Girdi:** (a) PDF/A dönüşüm sağlayıcısı kararı (dönüşüm yok vs Ghostscript AGPL/ticari vs lisanslı SDK), (b) İzinli gerçek PDF matrisi (CMYK/ICC, gömülü ek, nitelikli e-imza), (c) Canlı deploy sonrası `verapdf --version` smoke ve belge/arşiv uzmanı kabulü.
2. **`T35–T39` (Hakediş, Yeşil Defter, Mukayeseli Keşif, OSKA/AMP, EKAP Savunma Paketi — 5 Madde):**
   - **Tamamlanan Kod/Test:** Deterministik hakediş motoru, Yeşil Defter/ataşman izlenebilirliği, mukayeseli keşif `%80/%20/%120/%110` kuralları, OSKA/AMP aday paketleyici ve EKAP savunma manifesti (`Pilot/L2`, feature flag varsayılan kapalı).
   - **Kalan Dış Girdi:** İzinli resmî Yeşil Defter/ataşman/icmal dosyaları, bağımsız teknik ofis golden fixture'ı, lisanslı OSKA/AMP yazılımında gerçek native import testi ve isimli ihale/teknik ofis uzmanı imzası.
3. **`T40 & T41` (DB Rol Ayrımı ve 72/72 `company_id` Tablosu Tenant RLS/ACL — 2 Madde):**
   - **Tamamlanan Kod/Test:** 67 `FORCE RLS` + 5 `Exact-ACL` = **72/72 (%100) `company_id` tablosu** yerel PostgreSQL 16 üzerinde kanıtlandı (`tenant-business-rls.pgtest.ts` ve `database-role-provision.pgtest.ts` PASS).
   - **Kalan Canlı Operasyon:** Coolify canlı deploy penceresinde (`T52`) yeni `0022–0027` migration'larının uygulanması, worker canary/drain ve canlı `role-model-smoke` negatif doğrulaması.
4. **`T42` (Yetki ve Kaynak Sınırı Regresyonu):**
   - **Tamamlanan Kod/Test:** Manuel Havale/EFT idempotency, SmartCheck 15 dk lease expiry/orphan reclaim, Academy feature-flag gate (`403 ACADEMY_FEATURE_DISABLED`) ve `CreateQuote` `industryId` katalog savunması (`t42-regression.test.ts` 4/4 PASS).
   - **Kalan Dış Girdi:** Gerçek izinli banka ekstresi / dekont mutabakatı örneği ve canlı rollout.
5. **`T44` (Worker, Runtime ve Kurtarma Tatbikatı):**
   - **Tamamlanan Kod/Test:** 5-sütunlu PG16 kurtarma tatbikatı (`t44-recovery-drill.pgtest.ts` 1/1 PASS), `postgres:restore-drill:verify` PASS ve `backup.py --enable-row-security` (`test_backup.py` 6/6 PASS).
   - **Kalan Canlı Operasyon:** Canlı deploy penceresinde (`T52`) `app`, `worker` ve `ifc-worker` container imaj digest eşleşmesinin doğrulanması.
6. **`T45` (Performans ve İşletim Bütçesi):**
   - **Tamamlanan Kod/Test:** `PERFORMANCE_BUDGETS` (`BIM-PERF-2026-10-26.1`), ExcelJS chunk izolasyonu (`index` `106,47 kB ≤ 120 kB`), 1.000 satır XLSX + 256 MB worker (`1.490 ms ≤ 2.500 ms`), 20 eşzamanlı tenant PG16 (`p95 = 21,90 ms ≤ 250 ms`), Sentry PII scrub ve AI failover (`t45-performance-budget.test.ts` 5/5 PASS).
   - **Kalan Dış Girdi & Canlı Operasyon:** İzinli gerçek büyük müşteri IFC/PDF/XLSX dosyaları (`T51`) ve canlı Coolify VPS (`T52`) üzerinde post-deploy ölçüm.
7. **`T49` (Yapısal Veri, Bot ve Dil Politikası):**
   - **Tamamlanan Kod/Test:** `BreadcrumbList`, `WebApplication`, `DefinedTermSet`, AI tarayıcı grupları ve `Organization` `areaServed: TR` (`src/server/seo-routes.test.ts`).
   - **Kalan Dış Girdi & Canlı Operasyon:** Gerçek doğrulanmış kurumsal sosyal medya/kurum profil bağlantıları (`sameAs`) ve canlı Rich Results doğrulaması (artı `T47` Search Console ve `T48` canlı Lighthouse/Readability ekran görüntüleri).
8. **`T50` (Modül Bazlı L3 Bağımsız Uzman Dosyası):**
   - **Tamamlanan Kod/Test:** `/admin/roadmap/expert-review` inceleme arayüzü ve `expert-verification.ts` hash/revizyon geçersizleştirme altyapısı.
   - **Kalan Dış Girdi:** STR, ARC, MEP, COST ve vergi/ihale uzmanlarının gerçek kişi/unvan/oda sicil/tarih ve imzalı L3 kabul tutanakları.
9. **`T51` (Gerçek Dosya ve Müşteri L4 Saha Kabulü):**
   - **Tamamlanan Kod/Test:** Pilot vaka ölçüm, provenance ve karşılaştırma altyapısı (`src/smartcheck/import/pilot-fixtures.test.ts`).
   - **Kalan Dış Girdi:** En az 5 izinli gerçek müşteri projesi dosyası ve uçtan uca müşteri kabul tutanakları.
10. **`T52` (Yayın Adayı ve Canlı Kabul):**
    - **Tamamlanan Kod/Test:** `scripts/release-preflight.ts`, migration/restore/rollback script'leri ve tam CI doğrulama hattı.
    - **Kalan Canlı Operasyon:** Hazar onaylı Coolify canlı deploy, canlı `/api/health` SHA/DB ledger doğrulaması ve gerçek login/IFC/PDF/teklif/hakediş smoke testi.
11. **`T55` ("Türkiye'de Tek" İddia Kararı ve Hukuk/Reklam İncelemesi):**
    - **Tamamlanan Kod/Test:** 12 ürünlük kaynaklı pazar envanteri (`T53`) ve 6-halkalı karşılaştırılabilir yetenek matrisi (`T54`); `singleClaimPermitted = false` kilidi (`src/contracts/t53-t54-market-inventory.test.ts` 4/4 PASS).
    - **Kalan Dış Girdi:** `T50–T52` kabulleri tamamlandıktan sonra hukuk/reklam uzmanı incelemesi ve Hazar onayı.
12. **`T56` (Nihai Kapanış Matrisi):**
    - **Tamamlanan Kod/Test:** Bu rapor, `final-evidence-matrix.json` ve `src/contracts/t56-final-evidence-matrix.test.ts` ile tüm 56 To-Do, 31 denetim ID'si, 6 hesap motoru ve 11 oturum kusuru birbirine bağlanmıştır.
    - **Kalan Koşul:** Yukarıdaki dış girdili ve canlı deploy maddeleri kapandığında `fullClosureClaimPermitted` bayrağı güncellenerek Faz 11 nihai kapanışı imzalanır.
