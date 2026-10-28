# BIMMetraj — kimlik, veri yaşam döngüsü ve IDOR çalışma envanteri

Bu belge Faz 2 için mühendislik çalışma kaydıdır. Bir route'un listelenmesi, test edildiği veya güvenli olduğu anlamına gelmez. Üretim yapılandırması, hukuk görüşü ve gerçek kullanıcı kabulü ayrıca doğrulanır.

## Yönetici MFA ve oturum iptali tasarım hedefi

- Yönetici için ilk kurulum ve kurtarma yöntemi, kimlik doğrulanmış bir kurulum akışı ve tek kullanımlık kurtarma kodları ile tasarlanmalı; yalnız ikinci faktör başarıyla tamamlandıktan sonra yönetici yetkisi taşıyan oturum verilmelidir.
- Doğrulama isteği kısa ömürlü, tek kullanımlık, deneme sayısı ve hız limitiyle sınırlandırılmış olmalı; impersonation, eski JWT ve kurtarma akışları aynı güvenlik kapısını atlamamalıdır.
- Kurulum, anahtar kaybı, saat kayması, kurtarma kodu yenileme, lockout, yetki kaldırma ve çoklu oturum iptali için operasyon prosedürü ile üretime geçiş ve geri dönüş planı gerekir. Tek yönetici için kurtarma yolu hazırlanıp denenmeden zorunlu MFA açılmamalıdır.
- Normal logout'un mevcut çerez temizliği kopyalanmış JWT'nin sunucuda iptali değildir. Oturum kimliği veya kullanıcıya bağlı versiyon mekanizması; tek oturum çıkışı, tüm oturumların iptali, parola değişimi, impersonation ve erişim durumu bozulduğunda fail-closed davranış açısından ayrıca tasarlanmalı ve test edilmelidir.
- Bu kayıt MFA'nın uygulandığını, canlıda etkin olduğunu veya bir güvenlik standardına uygunluğu ileri sürmez.

## Veri silme, anonimleştirme ve dışa aktarma envanteri

| Veri alanı | İlişkili kayıtlar / sistemler | Açık tasarım işi |
| --- | --- | --- |
| Kullanıcı ve kimlik | users, memberships, invitations, auth_action_tokens, oturumlar | Çok firmalı üyelik, hesap doğrulama, token iptali ve aktör kimliği korunması |
| Firma ve abonelik | companies, subscriptions, usage, ödeme talebi ve muhasebe kayıtları | Sahiplik devri, ticari saklama, export ve silme yetkisi |
| Müşteri ve CRM | clients, fırsat ve iletişim kayıtları | Firma sınırı, müşteri talebi ve teklif ilişkisi |
| Teklif ve kanıt | quotations, quotation_items, quotation_item_evidence, denetim geçmişi | Revizyonlar, değişmez kanıt ve saklama ilişkileri; silme/anonimleştirme ayrımı |
| Dosya ve işleme | documents, processing runs/artifacts, nesne depolama, worker geçici dosyaları | Asıl dosya, kopyalar, başarısız işler ve depolama yaşam döngüsü |
| Operasyon ve üçüncü taraflar | audit log, yedekler, e-posta, AI sağlayıcıları ve harici entegrasyonlar | Saklama, minimalleştirme, yedekten geri yükleme sonrası silme ve sağlayıcı koşulları |

Uygulama için önce kapsamlı dışa aktarım, yetkili talep, bağımlılık dökümü ve dry-run; sonra saklama ve anonimleştirme kararları, iş kuyruğu, gözlemlenebilir sonuç ve doğrulanabilir tamamlanma gereklidir. Bu envanter otomatik silmenin mevcut olduğunu veya belirli bir yasal saklama süresini göstermez.

## IDOR değerlendirme yöntemi

Her tenant endpoint ve nesne eylemi için A/B firmaları; owner, manager ve viewer rolleri; yol/gövde/sorgu kimlikleri; aynı firma yetki reddi; diğer firma nesnesi; kimlik sahteciliği; gerektiğinde depolama ve asenkron iş yolları ayrı değerlendirilmelidir. Beklenen HTTP durumu mevcut sözleşmeye göre 403/404 olarak tanımlanmalı; restricted DB rollerinde GUC yokluğu ve tenant bağlamı da bağımsız test edilmelidir. Envanterdeki `Eşleştirme bekliyor` durumu test edilmediğini veya test sonucunun bu belgeye henüz bağlanmadığını ifade eder; güvenlik açığı kanıtı değildir.

Aşağıdaki kayıt sayısı erişilebilir endpoint veya test sayısı değildir. 28 Ekim 2026 çalışma ağacında `src/server/app.ts` ve `src/server/routes/*.ts` dosyalarındaki GET, POST, PUT, PATCH ve DELETE bildirimleri, ilk argümanı tırnak veya backtick içindeki `app`/`router` çağrısı olarak alan regex ile tekrar tarandı. Önceki 194 kayıtlık liste, `pricing-file-import.ts` içindeki çok satırlı 6 kaydı kaçırıyordu; bunlar eklenince **200 kaynak ifadesi** bulundu. Bunlardan 199'u enterpolasyonsuz, biri dinamik şablondur.

Bu tarama AST değildir; başka adlandırılmış router'ları, yardımcı fonksiyonları, middleware'i, dolaylı mount'ları, koşullu kayıtları ve framework route'larını kaçırabilir. Tekrarlanan bildirimler ve wildcard ayrı endpoint anlamına gelmez. `router` yolları ham ifadelerdir; örneğin `admin.ts` router'ı `/api/admin` altında bağlanır. `POST /api/smartcheck/documents/:id/${path}` tek ifade olarak sayılır ama mevcut döngü `process`, `retry` ve `recover-stale` olmak üzere üç somut yol üretir. Satır numaraları envanter alındığı ana aittir; kod değiştikçe kayabilir.

## Doğrulanmış öncelikli kapsam ve sınırlar

| Nesne / işlem | Kanıtlanan sınırlı senaryo | Henüz kanıtlanmayanlar |
| --- | --- | --- |
| `cost_components`, `quotation_financials` | `src/contracts/finance-quotation-rls.pgtest.ts`: izole PostgreSQL 16, 0000–0031 sonrası gerçek `public` şema ve kısıtlı app bağlantısında A/B tenant okuma, yabancı güncelleme/silme/insert/reparent reddi, bağlam yokken boş okuma ve kendi insert/update/upsert. Backup iki firmayı okur, worker reddedilir, migrator→owner okur. FORCE/policy drift kontrolü yapılır. | Test disposable DB'de gerekli grant'ları kurar; tüm production provisioning zincirini, insan rollerini veya canlı DB'yi doğrulamaz. |
| `POST /api/profit/calculate`, `GET /api/profit/report/:quotationId` | Aynı gerçek PG testi A'nın kendi teklifi için 200, B teklifi için 404; calculate için gerçek ON CONFLICT upsert. | Express handler doğrudan çağrılır ve hesap servisi stub'lanır; HTTP auth, role/usage middleware ve viewer/manager matrisi kapsam dışıdır. |
| `GET /api/company/risk-calibration`, `GET /api/company/risk-calibration/report` | Aynı PG testinde A bağlamındaki finans ve gözlem sayıları B kayıtlarını içermez. | Tüm şirket paneli, diğer roller ve tam HTTP zinciri doğrulanmış değildir. |
| Teklif düzenleme finans silmesi | Aynı PG testinde `editManualQuotation`, A'nın eski finans kaydını siler; B kaydını korur. | Edit endpointinin middleware ve insan rol matrisi bu testin kapsamı değildir. |
| `smartcheck_audit_logs` | `src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts:99`: gerçek PG'de app A/B bağlamları, bağlamsız boş sonuç, karşı tenant insert reddi, update/delete reddi, worker kısıtı ve backup okuması. | SQL/policy ve servis testi; bütün audit yazan endpointlerin ve insan rollerinin A/B HTTP testi değildir. `admin_audit_logs` ayrı tablodur. |
| `GET /api/admin/logs` | `src/server/routes/admin-logs.integration.test.ts:11`: yerel HTTP'de yetkili süper yönetici, sayfalama, hassas alan redaksiyonu ve yetki kaldırılınca 403 beklentileri. Auth fixture düzeltmelerinden sonraki hedefli admin-logs/admin-queue/impersonation/company koşusu 18/18 geçti. | Bu koşu A/B tenant IDOR matrisi değildir; daha önceki tam coverage başarısızdı ve yeni tam koşunun sonucu ayrıca değerlendirilmelidir. |
| SmartCheck satır / bulk / transfer | `src/server/routes/smartcheck.integration.test.ts:97`: izole HTTP'de B owner'ın A doküman satırları ve bulk isteği 404; iki transfer yolunda da B 404 beklenir. | Klon şema testi gerçek `public` FORCE/policy kontrolünün yerini tutmaz. Tekil review, manager/viewer ve tüm kimlikler için A/B HTTP matrisi tamamlanmamıştır. |
| Pilot vakaları | `src/server/routes/pilot-evidence.integration.test.ts:105`: B owner'ın A vaka detayına 404; B listesi/metriğinde A verisi bulunmaz. `src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts:126` gerçek RLS ve servis kontrollerini içerir. | Her işlem, yol/gövde kimliği ve tüm rollerin uçtan uca matrisi doğrulanmış değildir. |

Bu bağlantılar yalnız belirtilen senaryolara ilişkindir. 200 ifadenin tamamı, bütün IDOR yolları veya canlı dağıtım test edilmiş sayılmaz. Faz 2 ilk geniş koşuda admin/kimlik/audit testleri başarısızdı; auth fixture düzeltmelerinden sonra hedefli admin-logs/admin-queue/impersonation/company testleri 18/18 geçti. Bu hedefli sonuç tam coverage koşusunun yeniden geçtiği anlamına gelmez.

## Route kayıtları envanteri (200 kaynak ifadesi; 1 dinamik şablon)

| Yöntem | Kaynakta yol | Kayıt | Kaynak | Kanıt durumu |
| --- | --- | --- | --- | --- |
| GET | `/healthz` | `app` | `src/server/app.ts:134` | Eşleştirme bekliyor |
| GET | `/readyz` | `app` | `src/server/app.ts:139` | Eşleştirme bekliyor |
| GET | `/api/health` | `app` | `src/server/app.ts:164` | Eşleştirme bekliyor |
| GET | `/.well-known/security.txt` | `app` | `src/server/app.ts:234` | Eşleştirme bekliyor |
| GET | `/favicon.svg` | `app` | `src/server/app.ts:250` | Eşleştirme bekliyor |
| GET | `/apple-touch-icon.png` | `app` | `src/server/app.ts:252` | Eşleştirme bekliyor |
| GET | `/manifest.webmanifest` | `app` | `src/server/app.ts:257` | Eşleştirme bekliyor |
| GET | `/og-image.png` | `app` | `src/server/app.ts:263` | Eşleştirme bekliyor |
| GET | `/sitemap.xml` | `app` | `src/server/app.ts:269` | Eşleştirme bekliyor |
| GET | `/robots.txt` | `app` | `src/server/app.ts:273` | Eşleştirme bekliyor |
| GET | `/llms.txt` | `app` | `src/server/app.ts:277` | Eşleştirme bekliyor |
| GET | `/llms-full.txt` | `app` | `src/server/app.ts:287` | Eşleştirme bekliyor |
| GET | `*` | `app` | `src/server/app.ts:298` | Eşleştirme bekliyor |
| GET | `/api/admin/logs` | `app` | `src/server/routes/admin-logs.ts:62` | Bkz. sınırlı hedefli HTTP kanıtı |
| GET | `/dashboard` | `router` | `src/server/routes/admin.ts:90` | Eşleştirme bekliyor |
| GET | `/tenants` | `router` | `src/server/routes/admin.ts:166` | Eşleştirme bekliyor |
| GET | `/tenants/:companyId` | `router` | `src/server/routes/admin.ts:175` | Eşleştirme bekliyor |
| PATCH | `/tenants/:companyId` | `router` | `src/server/routes/admin.ts:265` | Eşleştirme bekliyor |
| PATCH | `/tenants/:companyId/members/:userId` | `router` | `src/server/routes/admin.ts:298` | Eşleştirme bekliyor |
| GET | `/plans` | `router` | `src/server/routes/admin.ts:322` | Eşleştirme bekliyor |
| POST | `/plans` | `router` | `src/server/routes/admin.ts:368` | Eşleştirme bekliyor |
| POST | `/plans/sync-catalog` | `router` | `src/server/routes/admin.ts:380` | Eşleştirme bekliyor |
| PATCH | `/plans/:id` | `router` | `src/server/routes/admin.ts:458` | Eşleştirme bekliyor |
| POST | `/impersonate` | `router` | `src/server/routes/admin.ts:473` | Eşleştirme bekliyor |
| GET | `/queue` | `router` | `src/server/routes/admin.ts:560` | Eşleştirme bekliyor |
| POST | `/queue/recover` | `router` | `src/server/routes/admin.ts:708` | Eşleştirme bekliyor |
| POST | `/queue/retry` | `router` | `src/server/routes/admin.ts:789` | Eşleştirme bekliyor |
| GET | `/reports/usage` | `router` | `src/server/routes/admin.ts:838` | Eşleştirme bekliyor |
| GET | `/reports/export` | `router` | `src/server/routes/admin.ts:877` | Eşleştirme bekliyor |
| GET | `/pricing-sources` | `router` | `src/server/routes/admin.ts:919` | Eşleştirme bekliyor |
| POST | `/pricing-sources/sync-catalog` | `router` | `src/server/routes/admin.ts:969` | Eşleştirme bekliyor |
| POST | `/pricing-sources` | `router` | `src/server/routes/admin.ts:1010` | Eşleştirme bekliyor |
| POST | `/pricing-sources/:id/verify` | `router` | `src/server/routes/admin.ts:1095` | Eşleştirme bekliyor |
| DELETE | `/pricing-sources/:id` | `router` | `src/server/routes/admin.ts:1227` | Eşleştirme bekliyor |
| GET | `/pricing-sources/staging` | `router` | `src/server/routes/admin.ts:1263` | Eşleştirme bekliyor |
| POST | `/pricing-sources/staging/bulk-review` | `router` | `src/server/routes/admin.ts:1295` | Eşleştirme bekliyor |
| POST | `/pricing-sources/staging/:id/review` | `router` | `src/server/routes/admin.ts:1414` | Eşleştirme bekliyor |
| POST | `/pricing-sources/:id/sync` | `router` | `src/server/routes/admin.ts:1509` | Eşleştirme bekliyor |
| GET | `/pricing-sources/scheduler/status` | `router` | `src/server/routes/admin.ts:1736` | Eşleştirme bekliyor |
| POST | `/pricing-sources/scheduler/trigger` | `router` | `src/server/routes/admin.ts:1746` | Eşleştirme bekliyor |
| GET | `/billing/bank-accounts` | `router` | `src/server/routes/admin.ts:1767` | Eşleştirme bekliyor |
| PUT | `/billing/bank-accounts` | `router` | `src/server/routes/admin.ts:1777` | Eşleştirme bekliyor |
| GET | `/billing/payment-requests` | `router` | `src/server/routes/admin.ts:1797` | Eşleştirme bekliyor |
| POST | `/billing/payment-requests/:requestId/review` | `router` | `src/server/routes/admin.ts:1809` | Eşleştirme bekliyor |
| GET | `/api/ai/industries` | `app` | `src/server/routes/ai.ts:38` | Eşleştirme bekliyor |
| GET | `/api/ai/status` | `app` | `src/server/routes/ai.ts:44` | Eşleştirme bekliyor |
| POST | `/api/ai/detect-industry` | `app` | `src/server/routes/ai.ts:52` | Eşleştirme bekliyor |
| POST | `/api/ai/generate-quotation` | `app` | `src/server/routes/ai.ts:64` | Eşleştirme bekliyor |
| POST | `/api/ai/improve-quotation` | `app` | `src/server/routes/ai.ts:94` | Eşleştirme bekliyor |
| POST | `/api/ai/generate-quote` | `app` | `src/server/routes/ai.ts:106` | Eşleştirme bekliyor |
| POST | `/api/auth/academy-acquisition` | `app` | `src/server/routes/auth.ts:94` | Eşleştirme bekliyor |
| POST | `/api/auth/register` | `app` | `src/server/routes/auth.ts:105` | Eşleştirme bekliyor |
| GET | `/api/auth/verify-email/:token` | `app` | `src/server/routes/auth.ts:225` | Eşleştirme bekliyor |
| POST | `/api/auth/resend-verification` | `app` | `src/server/routes/auth.ts:250` | Eşleştirme bekliyor |
| POST | `/api/auth/forgot-password` | `app` | `src/server/routes/auth.ts:275` | Eşleştirme bekliyor |
| POST | `/api/auth/reset-password` | `app` | `src/server/routes/auth.ts:306` | Eşleştirme bekliyor |
| POST | `/api/auth/login` | `app` | `src/server/routes/auth.ts:327` | Eşleştirme bekliyor |
| GET | `/api/auth/me` | `app` | `src/server/routes/auth.ts:382` | Eşleştirme bekliyor |
| POST | `/api/auth/logout` | `app` | `src/server/routes/auth.ts:421` | Eşleştirme bekliyor |
| POST | `/api/auth/impersonate/exit` | `app` | `src/server/routes/auth.ts:428` | Eşleştirme bekliyor |
| GET | `/api/public/plans` | `app` | `src/server/routes/billing.ts:23` | Eşleştirme bekliyor |
| GET | `/api/public/bank-accounts` | `app` | `src/server/routes/billing.ts:36` | Eşleştirme bekliyor |
| GET | `/api/billing/bank-accounts` | `app` | `src/server/routes/billing.ts:49` | Eşleştirme bekliyor |
| GET | `/api/billing/subscription` | `app` | `src/server/routes/billing.ts:58` | Eşleştirme bekliyor |
| GET | `/api/billing/plans` | `app` | `src/server/routes/billing.ts:67` | Eşleştirme bekliyor |
| GET | `/api/billing/usage-stats` | `app` | `src/server/routes/billing.ts:71` | Eşleştirme bekliyor |
| GET | `/api/billing/alerts` | `app` | `src/server/routes/billing.ts:79` | Eşleştirme bekliyor |
| GET | `/api/billing/payment-requests` | `app` | `src/server/routes/billing.ts:89` | Eşleştirme bekliyor |
| POST | `/api/billing/payment-requests/init` | `app` | `src/server/routes/billing.ts:100` | Eşleştirme bekliyor |
| POST | `/api/billing/payment-requests` | `app` | `src/server/routes/billing.ts:156` | Eşleştirme bekliyor |
| POST | `/api/cde/projects` | `app` | `src/server/routes/cde.ts:53` | Eşleştirme bekliyor |
| GET | `/api/cde/projects` | `app` | `src/server/routes/cde.ts:62` | Eşleştirme bekliyor |
| GET | `/api/cde/projects/by-document/:documentId` | `app` | `src/server/routes/cde.ts:69` | Eşleştirme bekliyor |
| POST | `/api/cde/projects/:projectId/members` | `app` | `src/server/routes/cde.ts:76` | Eşleştirme bekliyor |
| POST | `/api/cde/projects/:projectId/containers` | `app` | `src/server/routes/cde.ts:84` | Eşleştirme bekliyor |
| POST | `/api/cde/containers/:containerId/revisions` | `app` | `src/server/routes/cde.ts:94` | Eşleştirme bekliyor |
| POST | `/api/cde/containers/:containerId/transitions` | `app` | `src/server/routes/cde.ts:104` | Eşleştirme bekliyor |
| GET | `/api/cde/containers/:containerId/history` | `app` | `src/server/routes/cde.ts:114` | Eşleştirme bekliyor |
| GET | `/api/clients` | `app` | `src/server/routes/clients.ts:105` | Eşleştirme bekliyor |
| POST | `/api/clients` | `app` | `src/server/routes/clients.ts:125` | Eşleştirme bekliyor |
| GET | `/api/clients/:id` | `app` | `src/server/routes/clients.ts:166` | Eşleştirme bekliyor |
| PATCH | `/api/clients/:id` | `app` | `src/server/routes/clients.ts:303` | Eşleştirme bekliyor |
| POST | `/api/clients/:id/update` | `app` | `src/server/routes/clients.ts:305` | Eşleştirme bekliyor |
| POST | `/api/clients/:id/notes` | `app` | `src/server/routes/clients.ts:307` | Eşleştirme bekliyor |
| POST | `/api/clients/bulk-import` | `app` | `src/server/routes/clients.ts:367` | Eşleştirme bekliyor |
| GET | `/api/company/risk-calibration` | `app` | `src/server/routes/company.ts:17` | Bkz. sınırlı gerçek PG / handler kanıtı |
| GET | `/api/company/risk-settings` | `app` | `src/server/routes/company.ts:43` | Eşleştirme bekliyor |
| GET | `/api/company/risk-calibration/report` | `app` | `src/server/routes/company.ts:53` | Bkz. sınırlı gerçek PG / handler kanıtı |
| POST | `/api/company/risk-settings` | `app` | `src/server/routes/company.ts:84` | Eşleştirme bekliyor |
| GET | `/api/company/team` | `app` | `src/server/routes/company.ts:98` | Eşleştirme bekliyor |
| GET | `/api/company/industry-settings` | `app` | `src/server/routes/company.ts:112` | Eşleştirme bekliyor |
| POST | `/api/company/industry-settings` | `app` | `src/server/routes/company.ts:121` | Eşleştirme bekliyor |
| GET | `/api/company` | `app` | `src/server/routes/company.ts:141` | Eşleştirme bekliyor |
| GET | `/api/company/profile` | `app` | `src/server/routes/company.ts:151` | Eşleştirme bekliyor |
| PATCH | `/api/company/profile` | `app` | `src/server/routes/company.ts:180` | Eşleştirme bekliyor |
| GET | `/api/invitations` | `app` | `src/server/routes/company.ts:273` | Eşleştirme bekliyor |
| POST | `/api/invitations` | `app` | `src/server/routes/company.ts:286` | Eşleştirme bekliyor |
| GET | `/api/invitations/:token` | `app` | `src/server/routes/company.ts:295` | Eşleştirme bekliyor |
| POST | `/api/invitations/:token/accept` | `app` | `src/server/routes/company.ts:303` | Eşleştirme bekliyor |
| GET | `/api/crm/deals/:id` | `app` | `src/server/routes/crm.ts:24` | Eşleştirme bekliyor |
| GET | `/api/crm/pipeline` | `app` | `src/server/routes/crm.ts:35` | Eşleştirme bekliyor |
| POST | `/api/crm/deals` | `app` | `src/server/routes/crm.ts:52` | Eşleştirme bekliyor |
| POST | `/api/crm/leads` | `app` | `src/server/routes/crm.ts:72` | Eşleştirme bekliyor |
| GET | `/api/crm/leads` | `app` | `src/server/routes/crm.ts:87` | Eşleştirme bekliyor |
| POST | `/api/crm/activities` | `app` | `src/server/routes/crm.ts:98` | Eşleştirme bekliyor |
| GET | `/api/crm/deals/:id/activities` | `app` | `src/server/routes/crm.ts:117` | Eşleştirme bekliyor |
| POST | `/api/crm/deals/update-stage` | `app` | `src/server/routes/crm.ts:134` | Eşleştirme bekliyor |
| POST | `/api/crm/analyze-deal` | `app` | `src/server/routes/crm.ts:156` | Eşleştirme bekliyor |
| POST | `/api/expert-feedback` | `app` | `src/server/routes/expert-feedback.ts:34` | Eşleştirme bekliyor |
| POST | `/api/ifc/browser-analyses` | `app` | `src/server/routes/ifc-browser-analysis.ts:9` | Eşleştirme bekliyor |
| GET | `/api/market-intelligence/supplier-quotes` | `app` | `src/server/routes/market-intelligence.ts:80` | Eşleştirme bekliyor |
| POST | `/api/market-intelligence/supplier-quotes` | `app` | `src/server/routes/market-intelligence.ts:95` | Eşleştirme bekliyor |
| GET | `/api/market-intelligence/supplier-quotes/:id` | `app` | `src/server/routes/market-intelligence.ts:151` | Eşleştirme bekliyor |
| POST | `/api/market-intelligence/supplier-quotes/:id/entries` | `app` | `src/server/routes/market-intelligence.ts:162` | Eşleştirme bekliyor |
| POST | `/api/market-intelligence/supplier-quotes/:id/import-smartcheck-rows` | `app` | `src/server/routes/market-intelligence.ts:199` | Eşleştirme bekliyor |
| PATCH | `/api/market-intelligence/supplier-quote-entries/:id/review` | `app` | `src/server/routes/market-intelligence.ts:243` | Eşleştirme bekliyor |
| GET | `/api/market-intelligence/price-memory` | `app` | `src/server/routes/market-intelligence.ts:300` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/pilot-cases` | `app` | `src/server/routes/pilot-evidence.ts:51` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/pilot-cases` | `app` | `src/server/routes/pilot-evidence.ts:52` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/pilot-cases/:id` | `app` | `src/server/routes/pilot-evidence.ts:75` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/pilot-cases/:id/measure` | `app` | `src/server/routes/pilot-evidence.ts:76` | Eşleştirme bekliyor |
| PATCH | `/api/smartcheck/pilot-cases/:id/review` | `app` | `src/server/routes/pilot-evidence.ts:84` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/pilot-metrics` | `app` | `src/server/routes/pilot-evidence.ts:91` | Eşleştirme bekliyor |
| GET | `/api/pilot-applications/metrics` | `app` | `src/server/routes/pilot.ts:21` | Eşleştirme bekliyor |
| GET | `/api/pilot-applications` | `app` | `src/server/routes/pilot.ts:30` | Eşleştirme bekliyor |
| PATCH | `/api/pilot-applications/:id` | `app` | `src/server/routes/pilot.ts:41` | Eşleştirme bekliyor |
| POST | `/api/pilot-applications/:id/convert` | `app` | `src/server/routes/pilot.ts:54` | Eşleştirme bekliyor |
| POST | `/api/pilot-applications` | `app` | `src/server/routes/pilot.ts:63` | Eşleştirme bekliyor |
| GET | `/api/pricing/benchmarks` | `app` | `src/server/routes/pricing.ts:123` | Eşleştirme bekliyor |
| GET | `/api/pricing/sources` | `app` | `src/server/routes/pricing.ts:235` | Eşleştirme bekliyor |
| POST | `/api/pricing/sources` | `app` | `src/server/routes/pricing.ts:242` | Eşleştirme bekliyor |
| GET | `/api/pricing/snapshots` | `app` | `src/server/routes/pricing.ts:281` | Eşleştirme bekliyor |
| POST | `/api/pricing/snapshot-suggestions` | `app` | `src/server/routes/pricing.ts:294` | Eşleştirme bekliyor |
| POST | `/api/pricing/catalog/import` | `app` | `src/server/routes/pricing.ts:354` | Eşleştirme bekliyor |
| POST | `/api/pricing/sources/:sourceId/snapshots` | `app` | `src/server/routes/pricing.ts:533` | Eşleştirme bekliyor |
| PATCH | `/api/pricing/snapshots/:snapshotId/review` | `app` | `src/server/routes/pricing.ts:588` | Eşleştirme bekliyor |
| GET | `/api/quotations/:id/pricing-snapshot` | `app` | `src/server/routes/pricing.ts:627` | Eşleştirme bekliyor |
| POST | `/api/quotations/:id/pricing-snapshot/lock` | `app` | `src/server/routes/pricing.ts:653` | Eşleştirme bekliyor |
| GET | `/api/admin/pricing-sources/official-catalogs` | `app` | `src/server/routes/pricing-file-import.ts:196` | Eşleştirme bekliyor |
| POST | `/api/admin/pricing-sources/:id/import-csv` | `app` | `src/server/routes/pricing-file-import.ts:210` | Eşleştirme bekliyor |
| POST | `/api/admin/pricing-sources/:id/import-pdf` | `app` | `src/server/routes/pricing-file-import.ts:260` | Eşleştirme bekliyor |
| POST | `/api/admin/pricing-sources/:id/import-official-catalog` | `app` | `src/server/routes/pricing-file-import.ts:324` | Eşleştirme bekliyor |
| GET | `/api/admin/pricing-sources/tuik-sdmx/metadata` | `app` | `src/server/routes/pricing-file-import.ts:389` | Eşleştirme bekliyor |
| POST | `/api/admin/pricing-sources/:id/sync-tuik-sdmx` | `app` | `src/server/routes/pricing-file-import.ts:413` | Eşleştirme bekliyor |
| POST | `/api/profit/calculate` | `app` | `src/server/routes/profit.ts:12` | Bkz. sınırlı gerçek PG / handler kanıtı |
| GET | `/api/profit/report/:quotationId` | `app` | `src/server/routes/profit.ts:87` | Bkz. sınırlı gerçek PG / handler kanıtı |
| GET | `/api/progress-payments/contracts` | `app` | `src/server/routes/progress-payments.ts:68` | Eşleştirme bekliyor |
| POST | `/api/progress-payments/contracts` | `app` | `src/server/routes/progress-payments.ts:71` | Eşleştirme bekliyor |
| GET | `/api/progress-payments/contracts/:contractId` | `app` | `src/server/routes/progress-payments.ts:75` | Eşleştirme bekliyor |
| POST | `/api/progress-payments/contracts/:contractId/periods` | `app` | `src/server/routes/progress-payments.ts:79` | Eşleştirme bekliyor |
| GET | `/api/progress-payments/periods/:periodId` | `app` | `src/server/routes/progress-payments.ts:83` | Eşleştirme bekliyor |
| PUT | `/api/progress-payments/periods/:periodId/draft` | `app` | `src/server/routes/progress-payments.ts:87` | Eşleştirme bekliyor |
| POST | `/api/progress-payments/periods/:periodId/measurement-reviews` | `app` | `src/server/routes/progress-payments.ts:91` | Eşleştirme bekliyor |
| POST | `/api/progress-payments/periods/:periodId/transitions` | `app` | `src/server/routes/progress-payments.ts:95` | Eşleştirme bekliyor |
| POST | `/api/progress-payments/periods/:periodId/corrections` | `app` | `src/server/routes/progress-payments.ts:99` | Eşleştirme bekliyor |
| GET | `/api/quotations/:id/edit` | `app` | `src/server/routes/quotation-edit.ts:14` | Eşleştirme bekliyor |
| PATCH | `/api/quotations/:id/edit` | `app` | `src/server/routes/quotation-edit.ts:20` | Eşleştirme bekliyor |
| GET | `/api/quotations` | `app` | `src/server/routes/quotations.ts:63` | Eşleştirme bekliyor |
| GET | `/api/quotations/:id/smartcheck` | `app` | `src/server/routes/quotations.ts:79` | Eşleştirme bekliyor |
| GET | `/api/quotations/:id` | `app` | `src/server/routes/quotations.ts:96` | Eşleştirme bekliyor |
| POST | `/api/quotations` | `app` | `src/server/routes/quotations.ts:144` | Eşleştirme bekliyor |
| POST | `/api/quotations/:id/revision` | `app` | `src/server/routes/quotations.ts:159` | Eşleştirme bekliyor |
| PATCH | `/api/quotations/:id/status` | `app` | `src/server/routes/quotations.ts:171` | Eşleştirme bekliyor |
| PATCH | `/api/quotations/:id/calibration` | `app` | `src/server/routes/quotations.ts:191` | Eşleştirme bekliyor |
| GET | `/api/quotations/:id/pdf` | `app` | `src/server/routes/quotations.ts:212` | Eşleştirme bekliyor |
| GET | `/api/regulations/alerts` | `app` | `src/server/routes/regulations.ts:16` | Eşleştirme bekliyor |
| GET | `/api/regulations/versions` | `app` | `src/server/routes/regulations.ts:29` | Eşleştirme bekliyor |
| GET | `/api/regulations/versions/:id/affected-quotations` | `app` | `src/server/routes/regulations.ts:43` | Eşleştirme bekliyor |
| POST | `/api/regulations/sync` | `app` | `src/server/routes/regulations.ts:70` | Eşleştirme bekliyor |
| POST | `/api/regulations/check-impact` | `app` | `src/server/routes/regulations.ts:93` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/transfer-calm-to-quotation` | `app` | `src/server/routes/smartcheck.ts:196` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/transfer-calm-to-new-quotation` | `app` | `src/server/routes/smartcheck.ts:214` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/uploads` | `app` | `src/server/routes/smartcheck.ts:228` | Eşleştirme bekliyor |
| PUT | `/api/smartcheck/documents/:id/content` | `app` | `src/server/routes/smartcheck.ts:288` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/complete` | `app` | `src/server/routes/smartcheck.ts:306` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/preview` | `app` | `src/server/routes/smartcheck.ts:427` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/status` | `app` | `src/server/routes/smartcheck.ts:458` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/viewer-context` | `app` | `src/server/routes/smartcheck.ts:486` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/viewer-content` | `app` | `src/server/routes/smartcheck.ts:559` | Eşleştirme bekliyor |
| PATCH | `/api/smartcheck/documents/:id/mapping` | `app` | `src/server/routes/smartcheck.ts:608` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/${path}` | `app` | `src/server/routes/smartcheck.ts:630` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/queue` | `app` | `src/server/routes/smartcheck.ts:658` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/epys-preflight` | `app` | `src/server/routes/smartcheck.ts:676` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/pdf-preflight` | `app` | `src/server/routes/smartcheck.ts:700` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/pdfa-validation` | `app` | `src/server/routes/smartcheck.ts:719` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/documents/:id/rows` | `app` | `src/server/routes/smartcheck.ts:738` | Eşleştirme bekliyor |
| PATCH | `/api/smartcheck/rows/:id/review` | `app` | `src/server/routes/smartcheck.ts:756` | Eşleştirme bekliyor |
| PATCH | `/api/smartcheck/documents/:id/bulk-review` | `app` | `src/server/routes/smartcheck.ts:800` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/transfer-to-quotation` | `app` | `src/server/routes/smartcheck.ts:824` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/documents/:id/transfer-to-new-quotation` | `app` | `src/server/routes/smartcheck.ts:968` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/epys-allplan-kit` | `app` | `src/server/routes/smartcheck.ts:1150` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/epys-ids` | `app` | `src/server/routes/smartcheck.ts:1166` | Eşleştirme bekliyor |
| GET | `/api/smartcheck/sample-projects` | `app` | `src/server/routes/smartcheck.ts:1182` | Eşleştirme bekliyor |
| POST | `/api/smartcheck/sample-projects/:sampleId` | `app` | `src/server/routes/smartcheck.ts:1197` | Eşleştirme bekliyor |
| GET | `/api/source-intelligence/official-adapters` | `app` | `src/server/routes/source-intelligence.ts:66` | Eşleştirme bekliyor |
| POST | `/api/source-intelligence/official-adapters` | `app` | `src/server/routes/source-intelligence.ts:73` | Eşleştirme bekliyor |
| GET | `/api/source-intelligence/health` | `app` | `src/server/routes/source-intelligence.ts:108` | Eşleştirme bekliyor |
| GET | `/api/source-intelligence/review-queue` | `app` | `src/server/routes/source-intelligence.ts:123` | Eşleştirme bekliyor |
| POST | `/api/source-intelligence/official-adapters/:adapterId/ingest` | `app` | `src/server/routes/source-intelligence.ts:135` | Eşleştirme bekliyor |
| PATCH | `/api/source-intelligence/review-items/:id` | `app` | `src/server/routes/source-intelligence.ts:257` | Eşleştirme bekliyor |
