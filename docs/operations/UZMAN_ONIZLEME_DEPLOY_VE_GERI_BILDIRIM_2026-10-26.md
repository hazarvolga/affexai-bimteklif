# Uzman Önizlemesi — Deploy Kontrol Listesi ve Geri Bildirim Akışı (26 Ekim 2026)

Amaç: BIMMetraj'ı genel yayına açmadan, davetle seçilmiş 5–8 müteahhit ve mühendise kullandırmak; T50 (uzman L3) ve T51 (gerçek dosya L4) için kanıt toplamak.

Bu belge `HANDOFF_2026-10-24_DEPLOY_CUTOVER.md` runbook'unun yerine geçmez; onu uzman önizlemesi için tamamlar. Her adım başarılı olmadan bir sonrakine geçilmez.

## 0. Ön koşullar (deploy penceresinden önce)

- [ ] `main` üzerindeki son commit için GitHub **Verify yeşil**. Kapsam eşiği düşürülerek yeşile çekilmiş bir koşu kabul edilmez; eşik değişikliği gerekçesiyle ayrı commit'te olmalı.
- [ ] Bu dalın (`feat/expert-feedback`) birleşmesi ve CI'ın yeniden yeşil olması.
- [ ] Coolify'da şu değişkenler hazır (değerleri sohbete/loga yazmadan, yalnız varlıkları kontrol edilir):
  - `AUTH_EMAIL_DELIVERY_MODE=smtp` ve SMTP alanları (`AUTH_EMAIL_SMTP_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `AUTH_EMAIL_FROM`). Webhook modunda geri bildirim içeriği taşınamaz; uç nokta bu durumda bilerek 503 döner.
  - `EXPERT_FEEDBACK_EMAIL=<geri bildirimlerin düşeceği tek adres>`.
- [ ] Handoff'taki gizli bilgi yenileme maddesinin (S3, SMTP, JWT, PostgreSQL servis parolası, 5 rol parolası) tamamlandığı kayıt altında.

## 1. Deploy penceresi

1. [ ] **Yeni yedek:** checksum doğrulamalı yedek alın; dosya adı, boyut ve SHA-256 değerini kaydedin. `pg_restore --list` başarılı olmalı.
2. [ ] **Worker drain:** `worker` ve `ifc-worker` durdurulur; kilitli/çalışan iş ve çalışan doküman sayısı sıfır olmalı.
3. [ ] `RELEASE_WORKERS_DRAINED=true` geçici olarak eklenir.
4. [ ] **Deploy:** `db-bootstrap → migrate (0022–0028) → db-provision (inspect dahil) → app / worker / ifc-worker`.
   - Yerel kanıt: 26 Ekim 2026'da boş PostgreSQL 16 üzerinde 0000–0028'in tamamı hatasız uygulandı. Bu, canlı veriyle prova değildir.
5. [ ] `RELEASE_WORKERS_DRAINED` kaldırılır.

## 2. Deploy sonrası doğrulama (uzman davetinden önce)

- [ ] `https://bimmetraj.com/api/health`: `status: ok`, `db: connected` ve `revision` beklenen commit SHA'sı.
- [ ] `scripts/role-model-smoke.ts` canlıya karşı çalıştırılır (tenant okuma yolları RLS altında çalışıyor mu).
- [ ] **Çapraz tenant testi:** iki ayrı firma hesabı açın. A firmasının teklif/proje kimliğiyle B firmasından erişim 403/404 dönmeli.
- [ ] Giriş, teklif oluşturma, PDF, SmartCheck yükleme ve iki hesaplayıcı (KİK ADT, 4735 fiyat farkı) elle denenir.
- [ ] **Geri bildirim uçtan uca:** kendi hesabınızla bir hesaplayıcıdan "Emin değilim" gönderin. `EXPERT_FEEDBACK_EMAIL` adresine e-posta düşmeli ve ekranda referans görünmeli.
- [ ] Worker kuyruğu, backup zamanlanmış görevi ve Sentry/loglar kontrol edilir.

## 3. Geri dönüş (rollback)

0022–0027, 45 tabloda FORCE RLS açar. Önceki uygulama sürümü (Rev. 72, `f474e99`) bu tablolarda tenant bağlamı kurmaz. Bu yüzden **yalnız eski imaja dönmek güvenli değildir**; okuma/yazma sessizce boş dönebilir.

Geri dönüş sırası:

1. Uygulama ve worker'lar durdurulur.
2. Adım 1.1'deki yedek, doğrulanmış restore prosedürüyle geri yüklenir.
3. `f474e99` imajı deploy edilir.
4. `/api/health` revision'ı ve giriş akışı doğrulanır.

İleri düzeltme (forward-fix) mümkünse restore'dan önce tercih edilir. Karar, deploy penceresinde Hazar'ındır.

## 4. Uzman daveti

- 5–8 kişi, 2 haftalık net pencere (başlangıç ve bitiş tarihi davette yazılı).
- Davet e-postasındaki tek bağlantı: **`https://bimmetraj.com/app/uzman-onizleme`**. Giriş yaptıktan sonra uzman, menüde de bulunan bu sayfada görevleri görür.
- Her uzmana kendi alanından **tek somut görev** verilir; sonucu zaten bildiği bir örnek kullanılır:

| Uzman | Görev | Nerede |
|---|---|---|
| İhale / teknik ofis | Son ihalenizin sınır değerini girin | `/hesaplayicilar/kik-asiri-dusuk-teklif` |
| Hakediş / sözleşme | Bir dönemin fiyat farkını girin | `/hesaplayicilar/fiyat-farki-4735` |
| Müteahhit / mali müşavir | Bilinen bir firmanın yetki belgesi grubunu hesaplayın | `/app/uzman-onizleme/yambis` (yayında değil) |
| Mali müşavir / müteahhit | Bir kat karşılığı projesinin paylaşım ve KDV'sini hesaplayın | `/app/uzman-onizleme/kat-karsiligi` (yayında değil) |
| Müteahhit / proje yöneticisi | Bir projenin teklifini oluşturun | `/app/quotes/new` |
| BIM / statik | Bir IFC modelini yükleyin, metrajı kendi metrajınızla karşılaştırın | `/app/smartcheck` |

- YAMBİS ve kat karşılığı/KDV hesaplayıcıları yetenek kaydında hâlâ `roadmap / L1` durumundadır. Yalnızca oturum gerektiren `/app/uzman-onizleme/*` altında, "yayında değil, doğrulanmamış" uyarısıyla açılırlar.
  - Herkese açık rota, sitemap ve llms.txt dışında kalırlar.
  - `src/capabilities/registry.test.ts` bu sınırı denetler.
  - Herkese açılmaları ancak uzman onayından (T50) sonra ayrı bir karardır.

## 5. Geri bildirim nasıl gelir ve işlenir

- **Hesaplayıcılarda:** sonuç kartının altında "Bu sonuç sizin hesabınızla tutuyor mu?" sorusu (yalnızca giriş yapmış kullanıcıya görünür).
  - "Hayır, tutmuyor" seçilirse açıklama zorunludur.
  - Girdi ve sonuç değerleri yalnızca kullanıcı kutuyu işaretlerse gönderilir.
- **Uygulama içinde:** üst çubuktaki **Geri Bildirim** butonu, açık sayfayı otomatik ekleyerek genel not alır.
- Her gönderim `EXPERT_FEEDBACK_EMAIL` adresine tek bir e-posta olarak gelir. E-postada şunlar bulunur:
  - referans numarası,
  - hesap motoru,
  - değerlendirme,
  - açıklama ve uzmanın kendi bulduğu değer,
  - sayfa,
  - gönderen,
  - firma kimliği,
  - çalışan commit SHA'sı,
  - onay varsa girdi ve sonuç değerleri.
- Sınır: kullanıcı başına saatte 10 gönderim.
- **Haftalık triyaj:** her "tutmuyor" kaydı ya hata kaydına (düzeltme + regresyon testi) ya da "uzman görüşü farklı / mevzuat yorumu" notuna dönüşür.
- Bu kayıtlar **L3 onayı değildir.** T50 için uzmanın kimliği, unvanı, oda sicil numarası ve imzalı görüşü ayrıca alınır.

## 6. Bilinen açıklar (önizlemeyi engellemez, dürüst raporlanmalı)

- Proje satır kapsamının %53'ten %82,58'e çıkışı ağırlıkla `src/pages/t43-ui-pages-and-components.test.ts` dosyasından gelir. Bu dosyadaki kontroller çoğunlukla "üretilen HTML boş değil" düzeyindedir. Davranış testleriyle ölçülen kapsam %53 civarındadır.
- `final-evidence-matrix.json`: 56 maddenin 39'u kapalı, 17'si dış girdi veya canlı kabul bekliyor; `fullClosureClaimPermitted: false`.
