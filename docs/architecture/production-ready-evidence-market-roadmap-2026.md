# TeklifPro Production-Ready Evidence & Market Intelligence Roadmap

**Tarih:** 23 Temmuz 2026  
**Karar sahibi:** Ürün sahibi / kurucu  
**Kapsam:** Teklif, metraj doğrulama, kaynaklı maliyet ve mevzuat değişikliği karar katmanı  
**Ayrı katman:** Allplan Academy öğrenme ve kullanıcı edinme ürünü  
**Mevcut çekirdek:** Vite + Express + Drizzle + PostgreSQL + Graphile Worker  
**Hedef mimari:** Next.js App Router + NestJS API + PostgreSQL/Prisma + S3-compatible object storage

## 1. Yönetici kararı

TeklifPro’yu “AI ile otomatik fiyat veren teklif aracı” olarak değil, **Türkiye’ye özgü kaynaklı teklif karar sistemi** olarak konumlandırıyoruz.

Ürün farkı şu zincirin tek bir denetlenebilir akışta birleşmesidir:

```text
Kaynak dosya / model
→ metraj satırı
→ doğrulama kuralı
→ fiyat snapshot'ı
→ mevzuat sürümü
→ güven seviyesi
→ insan/reviewer kararı
→ teklif ve PDF
```

Allplan Academy bu zincirin canonical hesap veya mevzuat kaynağı değildir. Academy; eğitim, lead acquisition, ürün içi enablement ve SmartCheck bulgularına yönlendirme katmanı olarak ayrı tutulur.

## 2. Kaynak belgelerden çıkan gerçek ihtiyaç

### Metraj doğrulama araştırması

Araştırma; mimari yüzey metrajı ile mühendislik kütle metrajının ayrılması, kesişimlerde double-counting, birim/poz/boşluk kuralları, donatı ve zayiat bağlamı, BIM sınıflandırması ve kaynak yönetiminin kritik olduğunu ortaya koyuyor.

Bu belge ürün için doğrudan canonical hukuk kuralı değildir. Resmî kaynak, proje sözleşmesi, uygulanabilirlik ve teknik reviewer olmadan TS 500, TS 708, YFK, DIN veya Eurocode ifadeleri `approved` seviyesine yükseltilmemelidir.

### Teklif yazılımı PRD

PRD dört büyük ürün alanı tanımlıyor:

1. AI destekli metraj;
2. Dinamik Türkiye maliyet motoru;
3. Görsel teklif/sözleşme stüdyosu;
4. CRM, iletişim ve karar mekanizması.

Bu vizyon doğru ancak ilk üretim sürümü için fazla geniştir. PDF computer vision, IFC geometrik takeoff, canlı piyasa, e-imza, CRM analytics ve mobile field capture aynı anda yapılırsa ürün doğrulaması gecikir. İlk farkı oluşturan çekirdek: **kaynaklı Excel/CSV metraj + fiyat snapshot + reviewer kararı + teklif provenance** olmalıdır.

## 3. Product North Star

### Birincil kullanıcı

MEP taşeronu veya teklif/metraj mühendisi.

### Kullanıcı sonucu

Kullanıcı, mevcut Excel/metraj dosyasını en az manuel yeniden girişle güvenilir bir taslak teklife dönüştürür ve her kalemin neden o miktar/fiyatla kullanıldığını gösterebilir.

### Başarı ölçütleri

- İlk beş gerçek MEP dosyasında en az %90 satır manuel yeniden girişsiz parse.
- Aktarılan her satırda document, run, sheet/cell, raw/normalized değer, fiyat kaynağı ve kural sürümü.
- Kritik cross-tenant veri sızıntısı sıfır.
- Reviewer kararlarının %100 audit izi.
- Teklif hazırlama süresinde ölçülebilir azalma.
- Fiyat ve mevzuat değişikliği kullanıcı onayı olmadan mevcut teklifleri değiştirmiyor.

## 4. Hedef mimari kararı

### Bugün: pilot stabilizasyonu

Mevcut Vite + Express + Drizzle çekirdeği pilot tamamlanana kadar korunur. Bunun nedeni mevcut teklif, PDF, auth, SmartCheck ve browser/HTTP test akışlarının çalışıyor olmasıdır. Pilot sırasında tam rewrite yapılmaz.

### Hedef: strangler geçişi

Pilot ürün davranışı kanıtlandıktan sonra:

```text
apps/web       Next.js App Router
apps/api       NestJS REST API
apps/worker    NestJS worker / Graphile Worker adapter
packages/domain
packages/contracts
packages/ui
packages/config
PostgreSQL     Prisma schema + additive migrations
Object store   S3-compatible
AI gateway     provider abstraction + tracing/evals
Market layer   source adapters + snapshots + review queue
```

### Neden NestJS + Next.js?

**NestJS:** Modüler bounded context, dependency injection, guards, validation pipe, event/worker entegrasyonu ve ekip büyüdüğünde daha belirgin sınırlar sağlar.

**Next.js:** Public marketing/Academy ile authenticated app shell’i aynı web platformunda yönetir; App Router, server-side data access, route-level caching ve SEO/metadata için uygundur.

**PostgreSQL:** Tenant izolasyonu, audit/provenance, fiyat snapshot’ları, kural sürümleri ve ilişkisel teklif verisi için doğru merkezdir.

**Prisma:** Yeni Nest/Next core için geliştirici verimliliği ve tip güvenliği sağlar. Ancak Drizzle’dan Prisma’ya geçiş pilot öncesi yapılmaz; iki ORM’i aynı tablolar üzerinde erken dönemde çalıştırmak migration drift riski oluşturur.

### Geçiş kuralı

Her yeni bounded context önce mevcut API arkasında sözleşme ile ayrılır. Next/Nest servisi ancak aynı contract testleri geçtiğinde route trafiğini devralır. Eski Express route’u en az bir rollback sürümü korunur.

## 5. Bounded context’ler

| Alan | Sorumluluk | İlk sahip |
|---|---|---|
| Identity & Tenant | Kullanıcı, membership, RBAC, company isolation | Platform |
| Quotations | Teklif, revision, item, totals, PDF | Teklif domain |
| SmartCheck | Document, run, normalize, findings, review, transfer | Veri/teklif |
| Pricing Intelligence | Fiyat source, snapshot, validity, confidence | Market intelligence |
| Regulation Intelligence | Resmî kaynak, diff, rule candidate, approval | BIM/governance |
| Evidence | Source cell, hash, provenance, audit package | Platform |
| Academy | Ders, entitlement, lesson, acquisition | Öğrenme ürünü |
| CRM | Lead, account, opportunity, engagement | Growth |

## 6. Market Intelligence sistemi

### Kaynak katmanları

1. **Resmî referanslar:** YFK/ÇŞİDB birim fiyat ve analizleri, TÜİK endeksleri, GİB ve Resmî Gazete.
2. **Lisanslı ticari kaynaklar:** API veya sözleşmeli veri sağlayıcıları.
3. **Tedarikçi teklifleri:** Kullanıcının yüklediği veya entegre ettiği teklif belgeleri.
4. **Firma gerçekleşenleri:** Satın alma ve gerçekleşen maliyet kayıtları.
5. **Kullanıcı düzeltmeleri:** Reviewer onaylı manuel override’lar.

### Veri yaşam döngüsü

```text
fetch → quarantine → checksum → parse → normalize → classify → validate
→ source confidence → reviewer queue → approved snapshot → downstream use
```

Her kaynak için `sourceUrl/sourceDocumentHash`, yayın/tarih aralığı, bölge, birim, para birimi, KDV durumu, nakliye kapsamı, confidence ve reviewer saklanır.

### Fiyat davranışı

Fiyatlar teklif kalemine canlı bağlanmaz; snapshot’a bağlanır. Yeni veri geldiğinde sistem eski teklifi değiştirmez, fark uyarısı verir:

```text
Kaynak fiyatı: 185.000 TL/adet
Geçerlilik: 7 gün
Yeni referans farkı: +%7,4
Karar: Kullanıcı onayı bekliyor
```

### Fiyat güven sınıfları

- `official_reference`: benchmark, doğrudan piyasa teklifi değil;
- `supplier_quote`: kısa vadeli, bölgesel ve koşullu;
- `company_actual`: firma geçmişi, en güçlü operasyonel sinyal;
- `index_adjusted`: endeksle güncellenmiş tahmin;
- `manual_override`: gerekçeli insan kararı.

AI bu katmanlardan kanıt toplayabilir; kanıt yoksa fiyat üretmemeli, `insufficient_source` dönmelidir.

## 7. Regulation Intelligence sistemi

```text
official source watcher
→ document hash/version
→ semantic diff
→ affected rule candidates
→ reviewer assignment
→ draft/advisory/approved
→ effective date enforcement
→ affected quotation warning
```

Mevzuat kuralı şu alanları zorunlu taşır:

- jurisdiction;
- project/contract type;
- official authority;
- source URL/document ID/hash;
- publication/effective dates;
- applicability;
- unit/rounding policy;
- exceptions;
- technical/tax reviewer;
- approval timestamp.

Mevcut teklif geçmiş sürümle korunur. Yeni sürüm yalnız geçerlilik tarihinden sonra yeni tekliflere uygulanır; kullanıcıya etkilenebilecek kalemler gösterilir.

## 8. Fazlı Production Roadmap

### Faz 0 — Product truth ve kapsam kilidi

**Amaç:** PRD’deki geniş vaatleri pilot ürün gerçeğine indirmek.

**Çıktılar:**

- evidence-first SmartCheck scope;
- Academy/teklif ayrımı;
- claim register;
- canonical/advisory rule policy;
- data ownership ve retention kararı.

**Çıkış:** PDF CV, IFC geometrik takeoff, canlı piyasa ve e-imza “sonraki kapsam” olarak işaretlenmiş olmalı.

### Faz 1 — Sentetik veri ve kullanıcı akışı

**Amaç:** Kullanıcı teklif oluştururken sistemi gözle görülür biçimde doğrulamak.

**Çıktılar:**

- 5 sentetik MEP dosyası;
- 2 açık/kamu formatı fixture;
- 1 bozuk/negatif XLSX;
- fiyat snapshot fixture’ları;
- mevzuat diff fixture’ı;
- browser senaryosu: upload → review → quotation → revision → PDF.

**Çıkış:** Demo ve gerçek import ekranları birbirinden ayrılmış, her senaryo kanıt dosyası üretmiş olmalı.

### Faz 2 — SmartCheck pilot hardening

**Amaç:** İlk gerçek dosyaya güvenli giriş.

**Çıktılar:**

- sheet/header preview;
- MEP mapping profiles;
- correction/revalidation/exception;
- provenance panel;
- queue retry/operator görünürlüğü;
- cross-tenant HTTP/PostgreSQL acceptance.

**Çıkış:** 5 müşteri izinli dosya, reviewer ve S3 admission paketi hazır.

### Faz 3 — Evidence Graph ve fiyat snapshot katmanı

**Amaç:** Teklifteki miktar/fiyat karar zincirini kalıcılaştırmak.

**Çıktılar:**

- `price_sources`;
- `price_snapshots`;
- `quotation_item_evidence`;
- source hash/version;
- stale price warning;
- quote snapshot locking.

**Çıkış:** Her aktarılmış kalem “neden bu değer?” sorusunu cevaplayabiliyor.

### Faz 4 — Resmî kaynak adaptörleri

**Amaç:** YFK/TÜİK/GİB/Resmî Gazete kaynaklarını kontrollü ingest etmek.

**Çıktılar:**

- adapter interface;
- raw source archive;
- parser/normalizer;
- checksum/diff;
- source health dashboard;
- reviewer queue.

**Çıkış:** Kaynak verisi otomatik çekilebiliyor fakat onaysız canonical kural/fiyat üretilemiyor.

### Faz 5 — Mevzuat watcher ve etki analizi

**Amaç:** Değişiklikleri izlemek ve etkilenen teklifleri görünür kılmak.

**Çıktılar:**

- regulation versions;
- semantic diff;
- affected quotation query;
- advisory alerts;
- reviewer approval;
- effective date enforcement.

**Çıkış:** Kullanıcı mevcut teklifinin neden değişmediğini ve yeni sürümün hangi teklifleri etkilediğini görebiliyor.

### Faz 6 — Market intelligence beta

**Amaç:** Gerçek tedarikçi ve firma gerçekleşen verisiyle fiyat güvenini ölçmek.

**Çıktılar:**

- supplier quote upload;
- bölge/teslim/KDV/nakliye alanları;
- price confidence;
- company price memory;
- outlier detection;
- manual confirmation.

**Çıkış:** En az 3 firma ve 20+ fiyat snapshot’ında tahmin-gerçekleşen farkı ölçülmüş olmalı.

### Faz 7 — NestJS/Next.js strangler migration

**Amaç:** Ürünü ölçeklenebilir hedef mimariye taşımak.

**Sıra:**

1. Monorepo/package sınırları;
2. domain/contracts çıkarma;
3. Next.js public/app shell;
4. NestJS Identity/Tenant API;
5. NestJS SmartCheck API;
6. worker adapter;
7. Prisma shadow schema ve parity checks;
8. quotation/PDF route cutover;
9. Express rollback window;
10. eski route’ların emekliliği.

**Çıkış:** Her context için contract, integration, tenant isolation ve rollback kanıtı.

### Faz 8 — Production scale ve enterprise readiness

**Amaç:** Çoklu firma ve kaynak sağlayıcıları için operasyonel güvenilirlik.

**Çıktılar:**

- S3 lifecycle/retention;
- OpenTelemetry/Sentry;
- queue dead-letter;
- rate limit/abuse detection;
- backup/restore drill;
- data export/delete;
- cost observability;
- public status/runbook;
- GDPR/KVKK ve sözleşme review.

## 9. Academy’nin doğru konumu

Academy ayrı ürün katmanı olarak kalır:

- lead acquisition;
- ücretsiz öğrenme;
- Allplan Pro Track;
- SmartCheck bulgularına bağlanan mikro dersler;
- entitlement/certification.

Academy içeriği hiçbir zaman fiyat, mevzuat veya mühendislik kuralının gizli kaynağı olmaz. Ders içeriği bir kuralı açıklayabilir; canonical kuralın kaynağı yine resmî belge, proje sözleşmesi veya onaylı kurum politikasıdır.

## 10. Riskler ve stop koşulları

### Riskler

- Scraping kaynağının yapısı değişir veya erişim engellenir.
- Veri kullanım lisansı ticari ürüne izin vermez.
- Endeks piyasa fiyatı sanılır.
- Mevzuat metni yanlış yorumlanır.
- Otomatik fiyat güncellemesi teklif geçmişini değiştirir.
- Next/Nest rewrite kullanıcı değerini geciktirir.
- MEP dosya formatları beklenenden daha dağınık çıkar.

### Stop koşulları

- Kaynak hash’i veya lisans doğrulanamıyorsa veri canonical yapılmaz.
- Reviewer yoksa regulated rule `approved` yapılmaz.
- Fiyat confidence düşükse sistem otomatik fiyat vermek yerine kullanıcıdan kaynak ister.
- 5 dosyada %90 parse hedefi tutmuyorsa IFC/PDF AI fazına geçilmez.
- Migration parity sağlanmadan Express route emekli edilmez.

## 11. İlk uygulanabilir faz

Bir sonraki teknik faz **Faz 1 — Sentetik veri ve kullanıcı akışı**dır. İlk teslim paketi:

1. 5 sentetik MEP fixture;
2. negatif XLSX fixture;
3. fiyat snapshot fixture;
4. mevzuat değişiklik fixture;
5. gerçek browser teklif akışının acceptance testi;
6. demo/import ayrımı;
7. sonuçların kısa pilot kanıt raporu.

Bu faz tamamlanmadan gerçek piyasa crawler’ı veya NestJS/Next.js rewrite başlatılmamalıdır. Önce hangi verinin doğru kabul edildiğini ve kullanıcının gerçekten daha az çabayla doğru sonuca ulaştığını ölçmeliyiz.

## 12. Faz 1 uygulama durumu

Sentetik fixture paketi `fixtures/smartcheck/pilot-v1` altında oluşturuldu. Beş MEP CSV senaryosu, bozuk XLSX, fiyat snapshot’ları ve mevzuat diff simülasyonu `pnpm smartcheck:fixtures` ile doğrulanıyor. Gerçek browser acceptance adımları ve kapsamı `docs/smartcheck/pilot/fixture-acceptance.md` içinde sabitlendi. Bu kanıt, gerçek müşteri pilotu veya production market data entegrasyonu yerine geçmez.

## 13. Faz 2 uygulama durumu

SmartCheck çalışma alanı gerçek pilot dosyasını doğrudan işleme almadan önce kaynak önizlemesi gösterecek şekilde ayrıldı: `yükle → preview → MEP eşleme profili → kullanıcı onayı → process`. Üç deterministik MEP eşleme profili, bounded sheet/header örneklemesi, formül hücresi işaretleme, raw/normalized provenance paneli ve tenant-scoped operator kuyruğu eklendi. Başarısız işlemler için yalnızca açık retry endpoint’i bulunur; başarılı run’lar tekrar çalıştırılmaz.

Tarayıcı smoke ve HTTP/PostgreSQL entegrasyon kanıtı local-only’dir. Faz 2 çıkışı hâlâ gerçek müşteri izinli beş dosya, teknik reviewer kayıtları ve production S3 credentials bekler; sentetik veri veya local storage bu kapının yerine geçmez.

## 14. Faz 3 uygulama durumu

Evidence Graph ve fiyat snapshot çekirdeği local pilot akışına eklendi. `price_sources`, `price_snapshots` ve `quotation_item_evidence` additive migration ile oluşturuldu; teklif ve kalem seviyesinde snapshot referansı, stale uyarısı ve deterministik fiyat kilit hash’i eklendi. Kaynak hash’i değişmeden aynı snapshot tekrar kullanılabiliyor; reviewer kararı olmadan `approved` üretilemiyor. Quote Detail ekranı fiyat kanıtının kilit/stale/eksik durumunu ve geçerlilik tarihini gösteriyor.

Gerçek HTTP + PostgreSQL testi `src/server/routes/pricing.integration.test.ts` altında tenant sınırı, snapshot oluşturma, fiyat kilidi ve evidence persistence akışını doğruluyor. Bu faz canlı fiyat crawler’ı değildir: gerçek piyasa adaptörleri, resmî kaynak lisansı, teknik reviewer ve production S3 admission kapıları hâlâ açıktır.

## 15. Faz 4 uygulama durumu

Kontrollü resmî kaynak istihbaratı local pilot akışına eklendi. YFK, TÜİK, GİB ve Resmî Gazete için tenant-scoped adapter registry; HTTPS host allowlist; raw/normalized/diff artifact zinciri; SHA-256 source hash ve idempotent run key; advisory price snapshot; regulation diff reviewer kuyruğu ve kaynak sağlık paneli hazırdır. `sourceReviewItems` kararı audit log'a yazılır; hiçbir ingest otomatik canonical mevzuat kuralı üretmez.

Gerçek HTTP + PostgreSQL entegrasyon testleri `src/server/routes/source-intelligence.integration.test.ts` ve `src/server/routes/regulations.integration.test.ts` içinde tenant izolasyonu, tekrar gönderim, reviewer onayı ve regulation advisory sınırını doğrular. `/app/regulations` artık doğrulanmamış “LIVE” etiketleri yerine adaptör kaydı, son başarı/hash ve bekleyen insan kararını gösterir.

Bu fazın canlı admission kapıları: müşteri izinli en az 5 MEP dosyası, teknik reviewer adı/rolü/tarihi, her resmî kaynağın ticari kullanım/lisans doğrulaması, production S3-compatible credentials ve retention/backup politikası. Bunlar tamamlanmadan otomatik scheduler, crawler veya canonical fiyat/mevzuat yayını açılmayacaktır. Sonraki teknik faz, onaylı regulation diff'lerini etkilenen tekliflerle eşleştiren semantic impact analysis'tir.

## 16. Faz 5 uygulama durumu

Onaylı `regulation_diff` review item'ları artık her değişiklik için hash-bound `regulation_versions` advisory kaydı ve tenant-scoped alert üretir. `GET /api/regulations/versions/:id/affected-quotations` deterministic eşleme ile latest teklifleri ve kalemleri listeler; yürürlük tarihi `upcoming/effective/unknown` olarak görünür. Geçmiş teklif tutarları ve canonical `rule_registry` değişmez.

Etki motoru yalnız düşük riskli, açıklanabilir sinyaller kullanır: labor/material kalem kategorileri ve sınırlı açıklama terimleri; tax/legal/procurement eşleşmeleri düşük güvenli quotation-wide advisory olarak döner. `/app/regulations` etki paneli kaynak metni, sürümü, önerilen eşleşmeyi ve güven sınırını gösterir.

Faz 5 local HTTP + PostgreSQL acceptance testleri tenant izolasyonunu, reviewer → advisory version zincirini ve effective-date davranışını doğrular. Gerçek mevzuat yorumunu otomatikleştirme, canonical rule promotion, kullanıcı teklifini mutasyona uğratma ve hukuki/mühendislik onayı bu fazın dışındadır.

## 17. Faz 6 uygulama durumu

İnsan onaylı piyasa verisi beta akışı eklendi. `supplier_quote_submissions` ve `supplier_quote_entries` additive migration ile oluşturuldu; kaynak hash'i, tedarikçi koşulları, satır provenance'ı, baseline karşılaştırması, outlier sinyali ve reviewer kararı korunuyor. Approved satır immutable `price_snapshots` kaydına bağlanıyor; `GET /api/market-intelligence/price-memory` yalnız şirketin onaylı snapshot hafızasını döndürüyor.

Outlier motoru üçten az karşılaştırılabilir örnekte `insufficient_data`, yeterli baseline'da median/MAD tabanlı `normal` veya `outlier` üretir. Outlier otomatik onaylanmaz; kullanıcı/reviewer açıkça karar vermeden fiyat kanonikleşmez. HTTP + PostgreSQL entegrasyon testi tenant izolasyonunu, review gate'i ve snapshot persistence'ı doğrular; browser kanıtı `/app/market-intelligence` ekranında alınmıştır.

Bu faz otomatik crawler, gerçek tedarikçi API'si veya canlı piyasa fiyatı değildir. Sonraki admission kapıları: müşteri izinli beş MEP dosyası, teknik reviewer kayıtları, en az üç firma ve 20+ snapshot ile ölçüm, veri kullanım lisansı ve production S3 credentials/retention. Bu kapılar kapanmadan scheduler veya otomatik fiyat mutasyonu açılmayacaktır.

## 18. Faz 6.5 uygulama durumu — Provenance Bridge

SmartCheck’te onaylanan veya gerekçeli istisna olarak kabul edilen satırlar, `/api/market-intelligence/supplier-quotes/:id/import-smartcheck-rows` üzerinden tedarikçi teklifine ikinci kez manuel yazılmadan aktarılabilir. `supplier_quote_entries` artık `sourceProcessingRunId` ve `sourceQuantityRowId` ile aynı şirketin processing run/normalized row zincirine bağlıdır; source cell range korunur. Pending/rejected SmartCheck satırı aktarım kapısından geçemez.

Bu fazın ölçülebilir faydası, aynı satırın iki kez girilmesini kaldırmak ve provenance kaybını azaltmaktır. Aktarım hâlâ reviewer kuyruğunda başlar; approved `price_snapshot` yalnız reviewer kararıyla oluşur. Browser ekranında SmartCheck kaynaklı ve manuel beta kaynaklı entry ayrımı gösterilir.

Faz 6.5 sonrası sıra: izinli gerçek dosyalarda parser doğruluğu ve 3 firma/20+ snapshot pilot ölçümü. Bu ölçümler tamamlanmadan NestJS/Next.js strangler migration route trafiğini devralmayacak; mevcut Express/Vite çekirdeği rollback yüzeyi olarak korunacaktır.

## 19. Faz 7 uygulama durumu — Pilot Evidence Control

Gerçek dosya pilotu için tenant-scoped `smartcheck_pilot_cases` ve append-only `smartcheck_pilot_measurements` katmanı eklendi. Case kaydı; tamamlanmış doküman checksum’ı, müşteri/proje referansı, izin ve retention kanıtı, workflow durumu ve teknik reviewer kararını taşır. Ham müşteri izin dokümanı, kişisel veri veya credential saklanmaz.

Ölçüm servisi toplam satır üzerinden ağırlıklı `parseRate`, `manualReentryFreeRate` ve `provenanceCoverage` üretir; bulgu, onay, aktarım ve işlem/workflow sürelerini de kaydeder. Aynı measurement key tekrarlandığında yeni snapshot üretmez. `/app/pilot-evidence` yalnız KPI’ları ve kontrollü referansları gösterir; production S3, lisans ve reviewer yetkinliği dış admission kanıtı olarak kalır.

Bu fazın çıkış kriteri beş gerçek müşteri dosyasının case olarak açılması, her dosyada gerçek upload → parse → review → transfer kanıtı ve toplam parse/manuel yeniden giriş oranlarının ölçülmesidir. Beş dosya ve `%90` hedefi kanıtlanmadan Next.js/NestJS strangler migration route trafiğini devralmayacak; Vite/Express/Drizzle/PostgreSQL pilot rollback yüzeyi olarak korunacaktır.

## 20. Faz 8 uygulama durumu — Production Storage Admission

Production storage admission için S3 adapter'ına açık `delete` işlemi ve geçici nesne üzerinde `put → get → checksum → delete → get-failure` smoke sözleşmesi eklendi. Local adapter izole volume üzerinde test edilir; production'da SmartCheck açıkken S3 bucket ve region zorunludur, local fallback yoktur. Endpoint HTTPS, credential çifti ve force-path-style değerleri preflight'ta doğrulanır.

`/api/health` readiness çıktısı `smartcheckStorageConfigured` ile yalnız konfigürasyon durumunu gösterir. `pnpm smartcheck:storage-smoke` gerçek S3 bilgisi yoksa beklenen şekilde non-zero ile bloke olur; bu çıktı production object erişiminin kanıtı sayılmaz. Retention/lifecycle, encryption, tenant prefix policy, backup/restore drill ve beş gerçek dosyanın checksum/object kayıtları hâlâ dış admission kanıtıdır.

Bu fazın kod/local test kapısı tamamlanmıştır; gerçek production S3 credentials ve operasyonel retention/backup kanıtı gelmeden canlı müşteri dosyası kabulü açılmayacaktır.

## 21. Faz 9 uygulama durumu — Browser Acceptance ve Kullanıcı Akışı Kanıtı

Sentetik MEP fixture ile gerçek tarayıcı akışı doğrulandı: giriş → SmartCheck upload/complete → kaynak önizleme → MEP eşleme → Graphile Worker parse/normalize/validate → dört satır insan onayı → taslak teklife aktarım → teklif detayı → V2 revizyon → PDF aksiyonu. Kanıt ekranı `output/playwright/smartcheck-phase9-browser-review.png`, tekrarlanabilir senaryo ve sınırlar `docs/smartcheck/pilot/phase9-browser-acceptance.md` içindedir.

Bu doğrulama sırasında status/queue polling'in mutation rate-limit bütçesini tüketerek 429 üretmesi P0 olarak düzeltildi. Read endpoint'leri ayrı tenant-scoped okuma bütçesi kullanır; frontend polling 2 saniyelik, çakışmayan isteklerle yalnız terminal durumda queue/rows yeniler. Eksik favicon da giderildi; SmartCheck browser smoke'unda console error/warning kalmadı. Quote/PDF ekranındaki iki non-blocking Recharts sizing warning'i ayrıca gözlendi; akışı veya PDF aksiyonunu engellemedi.

Faz 9 local/sentetik kanıt kapısı geçmiştir. Gerçek müşteri dosyası, teknik reviewer, production S3/retention ve backup kanıtları olmadan bu sonuç production pilot kabulü değildir.

## 22. 24 Temmuz 2026 rebaseline — Production Ready yürütme kararı

Bu bölüm önceki faz kayıtlarının üzerine güncel yürütme kararını koyar. “Kod hazır” ile “production pilot kabulü” birbirine karıştırılmamalıdır.

### 22.1 Kanıtla doğrulanmış mevcut durum

| Katman | Mevcut kanıt | Karar |
|---|---|---|
| Ürün kapsamı | Excel/CSV-first, evidence-first SmartCheck; Academy ayrımı | Pilot kapsamı sabit |
| Import güvenliği | Signature/MIME, 25 MB sınırı, checksum, traversal/zip-bomb/formula kontrolleri | Local pilot için hazır |
| İşleme | Graphile Worker, idempotent run, parse → normalize → validate → review | Local pilot için hazır |
| İnsan kontrolü | Approve/reject, düzeltme/accepted exception ve audit zinciri | Local pilot için hazır |
| Provenance | Kaynak sheet/row/cell, raw/normalized değer, run ve rule metadata | Local pilot için hazır |
| Fiyat | Snapshot, source hash, stale/outlier ve reviewer gate | Advisory/local beta |
| Mevzuat | Allowlist adapter, hash/diff, effective-date ve advisory impact | Canonical değil |
| Browser | Upload → review → transfer → revision → PDF sentetik akışı | Local/sentetik geçti |
| Tenant/security | HTTP + PostgreSQL negatif testleri ve route filtreleri | Kanıt kapsamı iyi; CI ve gerçek deploy tekrarları sürmeli |
| Production storage | S3 adapter/config/preflight kodu | Gerçek credential/object/retention kanıtı yok |
| Pilot verisi | Beş sentetik fixture | Beş müşteri izinli dosya yok |
| Teknik sorumluluk | Reviewer veri sözleşmesi | Gerçek reviewer kaydı yok |

**Yürütme kararı:** Şu anda tam NestJS/Next.js rewrite başlatılmayacak. Önce gerçek pilot admission ve ölçüm tamamlanacak. Bunun nedeni mimari tercihin yanlış olması değil; ürün davranışı ve veri sözleşmesi kanıtlanmadan yapılan rewrite’ın kullanıcı değerini geciktirmesidir.

### 22.2 Ürün farkı ve veri stratejisi

TeklifPro’nun savunulabilir farkı “internetten en çok veriyi kazımak” değil, **kaynağı, geçerlilik tarihi, kapsamı ve insan kararını koruyan maliyet/uyum hafızası** oluşturmaktır.

```text
Resmî kaynak / lisanslı veri / tedarikçi teklifi / firma gerçekleşeni
→ quarantine
→ checksum + lisans/host kontrolü
→ parse + normalize
→ birim/bölge/KDV/nakliye kapsamı doğrulaması
→ AI sınıflandırma veya diff önerisi
→ insan/reviewer kararı
→ immutable snapshot veya advisory rule version
→ teklif kalemine provenance ile bağlama
```

AI yalnızca kolon eşleme, sınıflandırma, açıklama normalizasyonu, değişiklik özeti ve düşük riskli aday önerisi yapabilir. Miktar, fiyat, vergi veya canonical mevzuat kuralı kanıt ve insan kararı olmadan üretilmez.

Kaynak adaptörleri açık uçlu scraping yerine sözleşmeli connector olarak tasarlanır:

- Her connector’ın izinli hostu, kullanım/lisans durumu, çekme sıklığı, schema sürümü ve sahibi vardır.
- Her ham cevap hash’lenir; önceki cevapla deterministic diff üretilir.
- Kaynak bozulur, erişim kesilir veya lisans belirsizleşirse son onaylı snapshot korunur; yeni veri yayınlanmaz.
- Endeks veya resmî referans “canlı tedarikçi fiyatı” gibi gösterilmez.
- Yeni fiyat teklif geçmişini sessizce değiştirmez; yalnız fark uyarısı ve yeni snapshot önerisi üretir.

Bu model YFK/ÇŞİDB, TÜİK, GİB ve Resmî Gazete için teknik olarak genişletilebilir; gerçek kullanım ancak kaynak lisansı, resmî URL/kimlik ve teknik reviewer kanıtı geldiğinde açılır.

### 22.3 Hedef mimari — strangler, tek seferlik rewrite değil

```text
                    ┌──────────────────────────────┐
                    │ Next.js App Router           │
                    │ public + Academy + /app      │
                    └──────────────┬───────────────┘
                                   │ contracts
             ┌─────────────────────┴─────────────────────┐
             │ NestJS API / bounded contexts              │
             │ Identity | SmartCheck | Quotations         │
             │ Pricing | Regulations | Evidence           │
             └──────────────┬─────────────────────────────┘
                            │ domain events / jobs
             ┌──────────────┴─────────────────────────────┐
             │ Worker adapter (Graphile Worker korunur)    │
             └──────────────┬─────────────────────────────┘
                            │
          PostgreSQL + Prisma (context cutover sonrası)
          S3-compatible object store + audit/provenance

  Academy: ayrı ürün/entitlement katmanı; canonical fiyat/mevzuat kaynağı değil.
  Express/Vite: migration boyunca rollback ve parity referansı.
```

Geçiş prensipleri:

1. Next.js önce mevcut Express API’ye bağlanan bir web façade olarak başlar; frontend rewrite ile backend rewrite aynı release’e sıkıştırılmaz.
2. NestJS bounded context bazında, önce read-only veya shadow parity, sonra tek yazma sahibi olarak devreye girer.
3. Prisma yeni production core için hedef ORM’dir; Drizzle ve Prisma aynı tabloda eşzamanlı write owner olmaz.
4. Contract test, tenant negatif testi, migration backup ve rollback kanıtı olmadan trafik devri yapılmaz.
5. Graphile Worker ilk aşamada korunur; sırf framework değiştiği için yeni queue ürünü eklenmez.

## 23. Faz bazlı yürütme planı — sahip, bağımlılık, çıkış ve durdurma koşulu

| Faz | Amaç ve ana işler | Sahip/dependency | Çıkış kanıtı | Durdurma/rollback |
|---|---|---|---|---|
| **F10 Pilot admission** | Beş gerçek MEP dosyasını izin, checksum, retention ve proje referansıyla güvenli manifestte aç; reviewer atamasını ve S3 preflight’ı tamamla | Product owner + teknik reviewer + platform; müşteri/S3 girdisi gerekir | `smartcheck:pilot-check` yeşil; S3 put/get/checksum/delete; 5 benzersiz checksum | Herhangi bir izin, reviewer veya storage alanı eksikse dosya alınmaz |
| **F11 Dosya dalgası 1** | Dosyaları tek tek upload → parse → review → transfer akışından geçir; her dosyada önce/sonra süre ve düzeltme ölç | MEP reviewer + customer ops; F10 | 5/5 run tamam; her aktarımda provenance; parse ve manuel yeniden giriş metrikleri | Kritik bulgu açıklanamıyorsa aktarım reject/exception kuyruğunda kalır |
| **F12 Pilot operasyon** | Queue retry/dead-letter, operator runbook, alert, backup/restore drill, retention/silme ve export paketi | Platform/SRE; F10–F11 | Başarısız run yeniden denenebilir; restore tatbikatı ve audit log kanıtlı; P0 tenant leakage = 0 | Restore veya audit kanıtı yoksa pilot genişletilmez |
| **F13 Market intelligence beta** | Lisanslı/resmî connector’lar, supplier quote, company actual, region/KDV/nakliye koşulları ve snapshot karşılaştırması | Data steward + procurement reviewer; F11 | En az 3 firma ve 20+ snapshot; source license + outlier kararları; tahmin/gerçekleşen metriği | Kaynak lisansı veya karşılaştırılabilirlik yoksa veri advisory kalır |
| **F14 Regulation intelligence beta** | Resmî kaynak watcher, hash/diff, etkilenen quotation advisory, yürürlük tarihi ve reviewer onayı | BIM/governance reviewer; F13 ile paralel olabilir | Her değişikliğin kaynak kimliği/hash’i, reviewer kararı ve effective-date testi | Hukuki/teknik yorum tek başına AI’a bırakılamaz; `draft/advisory` kalır |
| **F15 Migration foundation** | `packages/contracts`, `packages/domain`, OpenAPI/JSON schema, monorepo sınırları, parity harness ve shadow PostgreSQL (`teklifpro_next_local`) | Platform architect; F11 KPI gate | Contract testleri eski Express üzerinde yeşil; additive Prisma shadow schema; backup/restore planı | Parity farkı veya migration drift varsa mevcut app tek yazma sahibi kalır |
| **F16 Next.js web façade** | `apps/web`: public landing, Academy, auth ve `/app` shell; mevcut API’ye güvenli contract üzerinden bağlan | Web owner; F15 | Browser parity: login, SmartCheck, quotes, PDF; SEO/public smoke; rollback linki | Kullanıcı akışı veya auth parity bozulursa Vite UI’a dönülür |
| **F17 NestJS Identity/Tenant + SmartCheck** | `apps/api` içinde guards, membership/RBAC, SmartCheck document/run/review/transfer modülleri; önce read/shadow, sonra tek write owner | Backend owner + security reviewer; F15–F16 | Cross-tenant negative suite, HTTP/PostgreSQL integration, audit/provenance parity | İki write owner açılmaz; route trafiği Express’te tutulur |
| **F18 NestJS Quotations/Pricing/Regulations** | Quote/revision/PDF, price snapshot ve regulation impact modüllerini context bazında devret | Domain owners; F17 + pilot KPI | Totals/revision/PDF ve snapshot hashes parity; rollback route; load/queue smoke | Finansal toplam farkı veya provenance kaybında cutover geri alınır |
| **F19 Production scale** | S3 lifecycle, OpenTelemetry/Sentry, cost budgets, rate limit/abuse, backup, export/delete, KVKK/sözleşme ve public runbook | SRE + legal/product; F12–F18 | SLO dashboard, restore drill, security review, data deletion/export ve incident rehearsal | SLO, güvenlik veya veri sahipliği kanıtı yoksa enterprise rollout durur |

### 23.1 F10–F12 için ölçüm sözleşmesi

Her dosya için aşağıdaki alanlar zorunludur:

```text
file_id, customer/project reference, consent reference, retention_until,
sha256, source row count, parsed row count, manual correction count,
accepted exception count, finding breakdown, transferred row count,
provenance coverage, baseline minutes, final minutes,
reviewer identity/scope/decision/time, storage object evidence
```

Pilot go/no-go eşikleri:

- 5/5 müşteri izinli dosya ve benzersiz checksum;
- manuel yeniden giriş olmadan parse oranı ≥ %90;
- aktarılmış kalemlerde provenance coverage = %100;
- cross-tenant veri sızıntısı = 0;
- kritik bulguların %100’ü reviewer kararı veya gerekçeli ret ile kapanmış;
- hazırlama süresinde ölçülebilir azalma;
- production S3 encryption, least privilege, retention/lifecycle ve restore kanıtı.

Bu metriklerden biri ölçülemiyorsa sonuç “pilot başarıldı” değil, `insufficient_evidence` olarak raporlanır.

### 23.2 Takım ve sorumluluk modeli

| Rol | Karar alanı |
|---|---|
| Ürün sahibi | Scope, pilot go/no-go, ticari iddia ve müşteri izni |
| MEP teknik reviewer | Birim/miktar/kaynak bütünlüğü, exception ve rule promotion |
| Platform/backend | Tenant, auth, API, worker, storage, migration ve rollback |
| Data/source steward | Connector lisansı, source hash, fiyat snapshot ve freshness |
| Customer operations | Dosya kabulü, consent, retention, ölçüm ve kullanıcı geri bildirimi |
| Academy/content owner | Ders, enablement ve lead acquisition; canonical hesap/mevzuat değil |

### 23.3 İlk uygulanabilir sonraki iş

Kod tarafındaki bir sonraki genişleme NestJS/Next.js değildir. Önce F10 için gerçek operasyon paketi doldurulmalıdır:

1. Güvenli operasyon alanında beş dosyalı manifest;
2. teknik reviewer kayıtları ve scope;
3. production S3 credentials/preflight ve retention/backup kanıtı;
4. ilk dosyanın browser + worker + PostgreSQL + provenance ölçümü;
5. F10–F12 KPI raporu.

Bu dış kanıtlar gelmeden yapılan en doğru teknik çalışma, mevcut acceptance/negative testlerini CI kapısına bağlamak ve migration için contract/parity taslağını hazırlamaktır. Gerçek veriyi veya credential’ı sentetik fixture ile temsil etmek yasaktır.

> Önceki bölümlerde “ilk uygulanabilir faz” olarak geçen sentetik fixture çalışması tamamlanmıştır; yürürlükteki sıra bu bölümdeki F10’dan başlar.

## 24. F10 uygulama durumu — Admission preflight hardening

F10’un teknik admission kapısı güçlendirildi. `validatePilotAdmission` artık admission tarihini deterministik olarak pinleyebiliyor; izin/retention tarihlerini, MEP disiplinini, reviewer duplicate durumunu, reviewer’ın `approved` kararını ve karar referansını, S3-compatible provider’ı ve güvenli `/` ile biten tenant prefix’ini fail-closed kontrol ediyor. `smartcheck:pilot-check` JSON ve `--as-of=YYYY-MM-DD` çıktısı üretiyor.

Runbook: `docs/smartcheck/pilot/phase10-admission.md`. Placeholder örnek manifestin `blocked` dönmesi beklenen ve korunması gereken negatif kanıttır. Gerçek beş dosya, reviewer kayıtları ve S3 object/retention/restore kanıtı gelmediği için F10 production admission henüz geçilmiş sayılmaz.

## 25. F11 uygulama durumu — Pilot case API admission parity

Pilot evidence API’si artık dış manifest validatorındaki zaman ve kaynak sınırlarını tekrar uygular: gelecekteki izin tarihi, admission tarihini kapsamayan retention, sıfır beklenen satır ve `completed` olmayan doküman pilot case oluşturamaz. Böylece repo dışındaki manifest kontrolü ile HTTP/PostgreSQL runtime kapısı arasında sessiz bir gevşeme kalmaz.

`src/server/routes/pilot-evidence.integration.test.ts` gerçek lokal HTTP + PostgreSQL koşusunda future-consent, expired-retention ve zero-row negatif durumlarını; ardından normal ölçüm, reviewer, tenant izolasyonu ve idempotent measurement akışını doğrular. F11 gerçek müşteri dosyası veya S3 kanıtı değildir; F10 external admission girdileri hâlâ gereklidir.

## 26. F12 uygulama durumu — Worker stale recovery ve operasyon görünürlüğü

Processing run health katmanı eklendi. `queued/running` run’lar yapılandırılabilir heartbeat eşiğini (`SMARTCHECK_PROCESSING_STALE_MINUTES`, güvenli aralık 5–240 dakika) aşarsa queue’da `isStale` olarak görünür. `recover-stale` endpoint’i yalnız tenant-scoped yetkili operatör kararıyla run’ı `failed/WORKER_STALE` durumuna taşır; ardından mevcut açık `retry` endpoint’i yeni idempotency key ve Graphile job oluşturur. Otomatik status mutasyonu yoktur.

`src/server/routes/smartcheck.integration.test.ts` stale queue görünürlüğünü, tenant negatifini, recovery → retry → yeniden processing zincirini doğrular. Operasyon runbook’u `docs/smartcheck/pilot/phase12-operations.md` içindedir. Bu faz worker process health ve DB gözlemlenebilirliğini güçlendirir; gerçek S3/restore ve müşteri pilotu yerine geçmez.

## 27. F15 foundation slice — Contract ve parity sınırı

F15’in ilk geri alınabilir dilimi tamamlandı. `src/contracts/smartcheck.ts`
kritik SmartCheck transport girdilerini `smartcheck.v1` altında ortak Zod
sözleşmesine alıyor; mevcut Express route’ları bu sözleşmeleri kullanıyor.
`src/contracts/context-contracts.ts` bounded context, route operasyonu, mevcut
write owner ve cutover durumunu makine tarafından doğrulanabilir bir envanterde
tutuyor. `express-pilot` dışındaki bir write owner, context `cutover-ready`
olmadan testte reddediliyor. `pnpm contracts:generate` ile 5 JSON Schema ve 17
kritik pilot yolu içeren OpenAPI 3.1 artifact’ı üretiliyor; route parity testi
bu envanteri gerçek Express registry’siyle karşılaştırıyor.

Bu bir NestJS/Next.js rewrite veya dual-write değildir. Tam F15 çıkışı için
izole `teklifpro_next_local` üzerinde additive Prisma shadow schema,
Express–Nest parity koşusu ve backup/restore kanıtı hâlâ gereklidir. Gerçek beş
dosya ve production storage admission tamamlanmadan trafik devri
yapılmayacaktır. Detay: `docs/architecture/contract-parity-foundation.md`.

`prisma/shadow/schema.prisma` ile F15’in schema-only Prisma dilimi de
oluşturuldu. `pnpm prisma:shadow-contract` 13 tenant-aware modeli, composite
identity unique’lerini ve Express single-write-owner guardrail’ini veritabanına
bağlanmadan kontrol ediyor; `pnpm prisma:validate:shadow` Prisma parser/schema
validasyonunu çalıştırıyor. Bu bir migration veya `db push` değildir. İzole
`teklifpro_next_local`, Drizzle–Prisma diff, backup/restore ve Express–Nest
parity kanıtı olmadan Prisma write owner olamaz.

Detay: `docs/architecture/prisma-shadow-schema.md`.

## 28. F15 isolated PostgreSQL parity harness

F15’in bir sonraki dilimi gerçek bir izole veritabanı ile tamamlandı. `prisma:shadow-db:prepare`
mevcut `teklifpro_local` şemasını `pg_dump --schema-only` ile veri taşımadan
`teklifpro_next_local` hedefine restore ediyor; dolu hedefi ezmiyor ve yalnızca
beklenen hedef veritabanı adını kabul ediyor. `prisma:shadow-parity` seçili 13
Prisma modelinin katalog kolon/type parity’sini ve kaynak/hedef schema dump
SHA-256 eşleşmesini kontrol ediyor.

Mevcut koşuda 13/13 model `pass`, kaynak ve hedef dump hash’i
`41920c99c31a297ce0d01f420d48b840084ac7449e2609face9e7c41bf27e93a`,
`schemaDumpParity=true` ve hedef satır sayısı sıfırdır. PostgreSQL 15 server ile
uyumlu `pg_dump` otomatik seçilmiştir; kaynak veritabanına write yapılmamıştır.

Detay ve operasyon sınırları: `docs/architecture/prisma-shadow-parity.md`;
makine raporu: `docs/architecture/generated/prisma-shadow-parity.json`.

Bu kanıt yalnız schema parity/restore dilimidir. F15’in tam çıkışı için additive
migration review, backup/restore tatbikatı, Express–NestJS HTTP parity ve gerçek
pilot KPI’ları hâlâ gereklidir; Prisma write owner veya trafik cutover yapılmadı.
