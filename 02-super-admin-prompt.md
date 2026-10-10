# PROMPT 2: Süper Admin (Platform Sahibi) panelini TAMAMLA ve sağlamlaştır

Bu prompt `hazarvolga/affexai-bimteklif` reposunun mevcut koduna göre yazıldı. Panel sıfırdan yapılmayacak: repoda temel bir panel zaten var. Görev, eksikleri tamamlamak, hataları düzeltmek ve IFC kotası + kuyruk izlemeyi eklemek.
**Önerilen sıra: önce Prompt 1 (IFC worker), sonra bu prompt.** Kuyruk izleme ve IFC kotası, Prompt 1'in getirdiği yapıya dayanır.

---

```
# GÖREV
Mevcut multi-tenant SaaS uygulamamdaki SÜPER ADMİN (PLATFORM SAHİBİ) panelini tamamla ve sağlamlaştır.
Bu panel, ürünü satan BENİM kullanacağım yönetim panelidir; ürünü kullanan inşaat firmasının paneli DEĞİLDİR.

# ÇOK ÖNEMLİ: İKİ FARKLI ROLÜ KARIŞTIRMA
1. TENANT KULLANICISI (müşteri) = ürünü satın alan inşaat firması. Eriştiği yer: /app. Sadece KENDİ tenant verisine erişir. Bu panele DOKUNMA.
2. SÜPER ADMİN (ben) = ürünü satan platform sahibi. Eriştiği yer: /admin ve /api/admin/*. Tüm tenant'ları üstten görür ve yönetir.
   Teklif oluşturma, IFC yükleme, metraj inceleme gibi tenant ekranlarını bu panelde YAPMA.
   Bu panelin bakış açısı: "Platformumda kaç firma var, hangisi ne kadar kullanıyor, sistem sağlıklı mı, ne kadar gelir elde ediyorum?"

# 0. ÖNCE OKU (ZORUNLU, kod yazmadan önce)
AGENTS.md ve CLAUDE.md; docs/agent-memory/README.md, PROJECT_BRIEF.md, WORKING_STATE.md, ARCHITECTURE_DECISIONS.md, AGENT_PROTOCOL.md;
docs/agent-memory/SUPER_ADMIN_PRD.md (aynısı kökte admindashboard.MD). Sert kurallar:
- Yerel PostgreSQL'de SADECE bu görev için adı verilen TeklifPro veritabanını kullan.
- vercel.json SPA rewrite'larını bozma. Dev Demo / Guest Login Bypass modu korunsun AMA bu modun hiçbir koşulda isSuperAdmin yetkisi vermediğini ve production'da kapalı olduğunu doğrula, testle kanıtla.
- Kod değişikliğinden sonra `graphify update .` çalıştır.
- Commit/push yapma.

# MEVCUT DURUM (repodan doğrulanmış gerçekler; yanlış buluyorsan bana söyle)
Yığın: Vite + React 19 + react-router-dom 7 (Next.js DEĞİL, geçme), Express 4, Drizzle ORM, PostgreSQL, Tailwind/shadcn, Recharts. Prisma sadece "shadow" parite içindir.
Var olanlar:
- Frontend: src/App.tsx içinde /admin rotası (AdminShell; index=AdminDashboard, tenants=TenantsList, plans=PlansList). src/pages/admin/*, src/components/layout/AdminShell.tsx (kontrol: user.isSuperAdmin).
- Backend: src/server/routes/admin.ts (/api/admin/dashboard, /tenants, /plans, PATCH /plans/:id, PATCH /tenants/:companyId), middleware `authenticate` + `checkSuperAdmin()` (src/server/middleware/auth.ts; rol bilgisi her istekte DB'den okunuyor, JWT'ye güvenilmiyor; iyi).
- Şema: users.isSuperAdmin, plans (name, monthlyQuoteLimit, monthlyPrice, isActive), subscriptions (planId, status, bonusQuoteLimit, currentPeriodStart/End), usageRecords (companyId, period 'YYYY-MM', quoteCount), adminAuditLogs (adminId, targetCompanyId, action, details).
- seed-superadmin.ts mevcut paketleri tohumluyor: Başlangıç 15 teklif / 499 TL, Profesyonel 50 / 1299, Kurumsal 99999 / 2999.
- Kota: src/server/middleware/usage.ts `usageTracker`, src/server/routes/quotations.ts içinde POST /api/quotations'a bağlı.

# TESPİT EDİLEN SORUNLAR (hepsini doğrula, sonra düzelt)
S1. EKSİK MODÜL: src/server/routes/admin.ts şunları import ediyor ama repoda YOK: src/server/admin/input.ts, changes.ts, stats.ts
    (createPlanInput, updatePlanInput, updateSubscriptionInput, AdminChangeError, createPlan, updatePlan, updateSubscription, readAdminTenants).
    Bu hâliyle build/lint kırılır. Bana yerel kopyam var mı diye SOR. Yoksa route sözleşmelerinden yeniden yaz:
    zod giriş şemaları; değişiklik fonksiyonları (her değişiklik ve admin_audit_logs yazımı AYNI transaction'da); readAdminTenants kota istatistikli.
S2. KOTA YARIŞ DURUMU: usageTracker "oku → izin ver → response finish olunca artır" yapıyor; atomik değil.
    usage_records üzerinde (company_id, period) UNIQUE kısıtı yok ve tablolar drizzle migration'ında değil, db_update.ts/.mjs ile elle yaratılıyor.
    Eşzamanlı isteklerde kota aşılabilir veya çift satır oluşur.
    Düzeltme: önce mevcut çift satırları birleştiren migration + UNIQUE(company_id, period); sonra atomik rezervasyon:
    INSERT ... ON CONFLICT (company_id, period) DO UPDATE SET quote_count = usage_records.quote_count + 1 WHERE usage_records.quote_count < :limit RETURNING quote_count
    (satır dönmezse kota doldu). Sayaç artışı, teklifi oluşturan işlemle AYNI transaction içinde olsun (res.on("finish") ile değil).
    Kural: silinen teklif kotayı GERİ VERMEZ. Tablo/kolon eklemelerini drizzle migration'ı ile yap (db_update.* yeni iş için kullanılmasın).
S3. DÖNEM TANIMI: PRD "faturalandırma dönemi başlangıcına göre sıfırlansın" diyor; kod UTC takvim ayı kullanıyor (period 'YYYY-MM').
    subscriptions.currentPeriodStart'a göre pencere kullanılacak. period anahtar biçimini (örn. pencere başlangıç tarihi) nasıl değiştireceğini ÖNER ve BENİM ONAYIMI AL; mevcut kayıtları bozma.
S4. VARSAYILAN LİMİT: abonelik yoksa limit sessizce 15 (usage.ts). Abonelik yoksa/askıdaysa davranış açık ve testli olsun.
    Askıya alınmış (suspended) tenant'ın yazma işlemleri (teklif, IFC, AI vb.) sunucuda engellensin; okuma serbest kalsın. Mesaj Türkçe ve net.
    Eski sabit PLAN_LIMITS kullanılıyorsa envanterini çıkar; DB'deki plan kotası tek doğru kaynak olsun.
S5. IMPERSONATE YARIM: TenantsList.tsx "İçine Gir" düğmesi handleImpersonate çağırıyor ama tanım bulunamadı ve sunucuda impersonate endpoint'i yok.
S6. EKSİK EKRANLAR: AdminShell menüsünde "Denetim Logları" (/admin/logs) var ama rota ve sayfa yok. Tenant detay, kullanım/depolama, kuyruk izleme ve raporlar yok.
S7. SMARTCHECK/IFC YÖNETİMİ PANELDE YOK: IFC/SmartCheck erişimi bugün ortam değişkeniyle (SMARTCHECK_PILOT_COMPANY_IDS) yönetiliyor; plans tablosunda IFC alanları yok.

# İŞ MODELİ (PAKETLER): teklif + IFC limitleri
| | Başlangıç | Profesyonel | Kurumsal |
|---|---|---|---|
| Aylık teklif kotası | 15 | 50 | [sınırsız] |
| Aylık IFC analiz kotası | [A] | [B] | [C / sınırsız] |
| Maks. IFC dosya boyutu | [50 MB] | [100 MB] | [100 MB, env tavanı] |
| Eşzamanlı IFC işlemi | [1] | [2] | [3] |
| Aylık fiyat | 499 TL | 1299 TL | 2999 TL |
Kurallar:
- Hepsi paneldeki Paket Yönetimi'nden düzenlenebilir olsun, kodda sabit olmasın. null = sınırsız.
- plans'a: monthly_ifc_limit, ifc_max_file_mb, ifc_max_concurrent. subscriptions'a: bonus_ifc_limit. usage_records'a: ifc_count. Hepsi drizzle migration'ı ile, mevcut veriyi bozmadan (varsayılanlar güvenli).
- IFC kotası: enqueue anında "bu dönemde başarıyla tamamlanan + kuyrukta/çalışan < limit" kontrolü; sayaç iş BAŞARIYLA bitince atomik artar. Başarısız, iptal ve WORKER_STALE işler kotadan DÜŞMEZ.
- Prompt 1'de eklenen `getTenantIfcLimits(companyId)` yardımcısı artık plan + bonus değerlerini DB'den okusun (env değerleri yalnızca üst sınır/varsayılan).
- Süper admin bir tenant'a manuel bonus teklif ve bonus IFC hakkı verebilsin.
- SmartCheck/IFC erişimi: env kill-switch (SMARTCHECK_IMPORT_ENABLED) global kapalı anahtar olarak kalsın; tenant bazlı açma/kapama DB'den yönetilsin (kolon önerini yaz, onay al) ve SMARTCHECK_PILOT_COMPANY_IDS allowlist'i ile birlikte nasıl davranacağı açıkça tanımlansın.

# YETKİ VE GÜVENLİK
- Her /api/admin/* rotası `authenticate` + `checkSuperAdmin()`; bunları router seviyesinde uygula ki yeni rota unutulmasın. Oturumsuz 401, süper admin değilse 403.
- Süper admin sorguları ayrı bir katmanda (src/server/admin/) olsun; tenant filtresini BİLİNÇLİ atlar. Normal tenant sorguları companyId izolasyonunu aynen korusun; ikisi karışmasın.
- Süper admin uçlarına rate limit uygula (src/server/auth/security.ts consumeRateLimit mevcut).
- Her yazma işlemi admin_audit_logs'a: kim, ne zaman, hangi tenant, öncesi/sonrası (details jsonb).
- İlk süper admin script ile oluşturulsun (kayıt ekranından değil); seed script'in idempotent ve production'da yanlışlıkla çalışmayacak şekilde korunduğunu doğrula.
- IMPERSONATE: kısa ömürlü (örn. 15 dk) token, JWT'de `impersonatedBy` claim'i; varsayılan SALT-OKUNUR (mutating metodlar sunucuda engellenir; yazma izni ayrı, açıkça işaretli bir seçenek olsun ve loglansın);
  impersonate oturumu /api/admin/* uçlarına ERİŞEMEZ; başlangıç/bitiş audit log'a yazılır; ekranda her sayfada belirgin "Impersonate modundasınız" bandı + çıkış düğmesi.
  authenticate middleware'inin "rol her istekte DB'den" ilkesi bozulmasın.

# EKRANLAR (mevcutları genişlet, eksikleri ekle)
1. Genel Bakış (/admin) [var, genişlet]: toplam tenant (aktif/askıda/deneme), pakete göre dağılım, bu ay toplam teklif ve IFC sayısı, MRR, kotasının %80'ini geçenler (teklif veya IFC), aboneliği 7 gün içinde bitecekler, sistem sağlığı (kuyrukta bekleyen, son 24 saatte başarısız IFC işi, stale iş sayısı).
   Grafikler (Recharts): son 6 ay teklif, son 6 ay IFC, paket dağılımı, MRR trendi.
2. Firmalar (/admin/tenants) [var, genişlet]: paket, durum, bu ayki teklif (12/15 + çubuk) ve IFC (3/10 + çubuk) kullanımı, depolama kullanımı, dönem başlangıç/bitiş. Arama, filtre, sıralama, SUNUCU taraflı sayfalama. Kota %80 sarı, %100 kırmızı.
3. Firma Detay (/admin/tenants/:companyId) [YENİ]: firma ve kullanıcıları, paket değiştir, bonus teklif/IFC, askıya al/aktifleştir, SmartCheck/IFC aç/kapat, ay ay kullanım geçmişi, son IFC işleri (durum, boyut, süre, hata kodu), depolama, admin notları (kolon önerisi + onay), impersonate.
4. Paket Yönetimi (/admin/plans) [var, genişlet]: teklif kotası, IFC kotası, maks. dosya boyutu, eşzamanlı iş, fiyat, aktif/pasif. Kullanan tenant varken silinemez, sadece pasife alınır. Paket değişikliğinin mevcut tenant'lara ANINDA mı sonraki dönemde mi uygulanacağı ayarlanabilir ve ekranda açık yazsın.
5. IFC Kuyruk İzleme (/admin/queue) [YENİ]: bekleyen, çalışan, son 24 saatte biten, başarısız iş sayısı; ortalama ve en uzun işlem süresi; stale işler (src/smartcheck/import/run-health.ts isProcessingRunStale mantığını platform geneline uygula); iş listesi (tenant, boyut, durum, bekleme/işlem süresi, deneme sayısı, errorCode); duruma ve tenant'a göre filtre.
   Aksiyonlar (audit log'lu): takılan işi kurtar (mevcut tenant kapsamlı recover-stale mantığını süper admin için tenant'lar arası genelleştir; mevcut tenant uçlarını BOZMA), başarısız işi yeniden dene.
   Veri kaynağı olarak öncelikle document_processing_runs (+ documents, companies) kullan. graphile_worker şemasına doğrudan SQL yazacaksan önce kurulu sürümdeki (0.16.0) tablo/görünüm adlarını doğrula, varsayma.
   Otomatik yenileme (10-15 sn polling). Eşik aşımında belirgin uyarı.
6. Kullanım ve Raporlar (/admin/usage, /admin/reports) [YENİ]: tenant bazında aylık teklif/IFC/depolama, en çok tüketen 10 tenant, paket bazlı gelir, tarih aralığı, CSV dışa aktarma (CSV formül enjeksiyonuna karşı hücre temizleme; repoda sanitizeSpreadsheetText mantığı var).
7. Denetim Logu (/admin/logs) [YENİ, menüde zaten var]: tüm admin işlemleri, filtre (admin, tenant, işlem, tarih), sunucu taraflı sayfalama.
Arayüz: Türkçe, mevcut AdminShell görsel dili (tenant panelinden ayırt edilen "Platform Yönetimi" etiketi) korunsun; yükleniyor/boş/hata durumları; mevcut shadcn bileşenleri.

# TEST VE DOĞRULAMA
Repodaki yöntem: `pnpm test` (tsx --test), yerel Docker PostgreSQL (docs/development/local-postgres-docker.md). Mevcut testler (örn. src/server/middleware/usage.test.ts, auth testleri) güncellenecek veya genişletecek, silinmeyecek.
- /api/admin/*: oturumsuz 401, tenant kullanıcısı 403, süper admin 200; yeni eklenen HER rota için aynı üçlü.
- Dev Demo/Guest oturumu isSuperAdmin alamıyor; production'da bypass kapalı.
- Kota: N eşzamanlı istekle limit AŞILAMIYOR (gerçek DB'de yarış testi); silinen teklif kotayı geri vermiyor; dönem sınırı (abonelik başlangıcına göre) doğru; askıya alınmış tenant yazamıyor.
- IFC kotası: başarısız/iptal/stale işler sayılmıyor; eşzamanlı iş sınırı çalışıyor; plan değişince yeni limitler geçerli.
- Impersonate: salt-okunur modda yazma 403, /api/admin/* 403, audit log yazılıyor, token süresi doluyor.
- Tenant izolasyonu: normal tenant uçları hâlâ yalnızca kendi companyId verisini döndürüyor (test-isolation testleri geçmeli).
- Migration: mevcut veride çift usage_records satırı varken UNIQUE migration'ı hatasız çalışıyor.
- `pnpm lint` (tsc --noEmit) ve `pnpm build` yeşil.

# ÇALIŞMA ŞEKLİ
1. Önce incele ve bana kısa plan ver: S1–S7 doğrulaması, dokunacağın dosyalar, varsayımların, AÇIK SORULAR (özellikle S1 yerel kopya, S3 dönem biçimi, tenant bazlı SmartCheck bayrağı kolonu, admin notları kolonu). Onayımı bekle.
2. Sırayla ilerle, her adım sonunda dur ve özet ver:
   (a) S1: eksik src/server/admin modülü + build'in yeşile dönmesi
   (b) S2–S4: usage_records migration + atomik kota + dönem + askı kuralı + testler
   (c) Plan/abonelik/usage şema genişletmesi (IFC alanları) + getTenantIfcLimits'i DB'ye bağla
   (d) Router seviyesinde yetki, rate limit, audit log tamamlaması
   (e) Firma detay + paket yönetimi genişletmesi
   (f) Genel bakış ve firma listesi genişletmesi
   (g) IFC kuyruk izleme (+ aksiyonlar)
   (h) Kullanım/raporlar + CSV
   (i) Denetim logu sayfası
   (j) Impersonate (backend + frontend bandı)
3. Mevcut tenant (/app) koduna ve çalışan SmartCheck tenant uçlarına dokunma; ortak yardımcıyı değiştirmen gerekiyorsa önce bana sor.
4. Emin olmadığın noktada varsayım yapma, bana sor.

# SON KONTROL
- Yaptığım şey "satanın platform paneli" mi? Bu panelde bir firmanın kendi teklifini oluşturduğu/IFC yüklediği ekran var mı? Varsa kaldır.
- Her /api/admin/* rotası sunucuda süper admin kontrolü yapıyor mu? Yeni rotalar dahil?
- Kota artık atomik mi ve aynı transaction'da mı? Yarış testi geçiyor mu?
- Build ve lint yeşil mi (S1 çözüldü mü)?
- Next.js/başka çatıya geçiş, Redis/BullMQ ekleme, Prisma'ya geçiş yapılmadı mı?
```
