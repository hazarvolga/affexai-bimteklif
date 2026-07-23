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
