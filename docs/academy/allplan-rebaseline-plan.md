# BIMPlan Academy — Allplan Rebaseline ve Ürünleştirme Planı

Tarih: 21 Temmuz 2026  
Karar: Allplan eğitimi public ders kataloğu değil; kayıtlı kullanıcıya özel, sertifikalı ve ileride ücretlendirilebilir bir Academy modülüdür.

## Yönetici kararı

`allplanAkademi-main` içeriği korunacak; Firebase uygulaması doğrudan taşınmayacak. Kaynak müfredat BIMPlan’ın mevcut auth, company/workspace ve PostgreSQL altyapısına adapte edilecek.

Public yüzey yalnızca ürünün varlığını ve değerini anlatabilir. Ders gövdesi, tam müfredat, laboratuvar, sınav ve kaynak dosyaları login arkasında kalır.

## Faz 0 — Kaynak ve erişim GAP envanteri

### Kaynak gerçekleri

- 11 öğrenme yolu, 37 kurs, 114 modül.
- 27 modül için ayrıntılı ders gövdesi mevcut; kaynak kapsaması %24.
- 87 modül yalnızca müfredat başlığı/statüsü seviyesinde.
- Kaynakta 17 component dosyası ve 24 dışa aktarılan component var.
- 4 interaktif araç referansı var: wall simulator, reinforcement estimator, coordinate calculator, shortcut trainer.
- Kaynak ürününde ders, not, bookmark, süre, sınav, sertifika, profil, bilgi bankası, FAQ, AI companion, admin ve analytics akışları bulunuyor.

### Kaynakta taşınmayacak riskler

- Firebase auth yok.
- `default_user` ve sabit trainee e-postası kullanılıyor.
- Firestore read/write kuralları herkese açık.
- Eksik derslere otomatik fallback metni üretiliyor.
- Kaynak sertifikası sunucu doğrulamalı credential değil, istemci tarafı görsel/hash üretimi.

### Mevcut BIMPlan GAP’leri

- Public `/academy/allplan/*` rotaları ders gövdesini login olmadan açıyor.
- Structural yolu public’e açılıyor fakat 0 ayrıntılı ders içeriyor; bu nedenle boş kapsam uyarısı gösteriyor.
- Protected katalogda yalnızca 27 ayrıntılı ders listeleniyor; 114 modüllük curriculum görünümü yok.
- Progress API mevcut, fakat curriculum özeti henüz tam API kaynaklı değil.
- Ders notu, bookmark, çalışma süresi, sınav ve sertifika tabloları henüz yok.
- Ücretli erişim/entitlement modeli yok.

### Faz 0 çıkış kriteri

- Kaynak sayıları ve riskleri ölçen inventory script çalışıyor.
- Public/protected/internal sınırı yazılı.
- Fallback içerik yayınlanmıyor.
- Her sonraki fazın ölçülebilir çıkış kriteri var.

## Faz 1 — Public erişimi kapatma

1. `/academy/allplan` public eğitim hub’ını tanıtım/lead sayfasına dönüştür.
2. `/academy/allplan/:pathSlug` rotalarını public ders listesi olmaktan çıkar.
3. `/academy/allplan/lesson/:lessonSlug` rotalarını login arkasına al veya güvenli login dönüşü ver.
4. Public Academy kartını “Kayıtlı kullanıcıya özel” olarak etiketle.
5. Public sayfalarda lesson body, step, attachment, lab ve exam verisi render etme.
6. Protected `/app/academy/allplan` girişini Allplan curriculum ana ekranı yap.
7. Login sonrası `next` dönüşünü doğrula; açık redirect kabul etme.
8. Public rotalarda noindex/canonical kararını uygula; eski linkler kırılmadan login kapısına yönlensin.
9. Route, unauthenticated API ve browser smoke testleri yaz.

Çıkış: Girişsiz kullanıcı hiçbir Allplan ders içeriğini okuyamaz; kayıtlı kullanıcı curriculum’a ulaşır.

## Faz 2 — Protected curriculum workspace

1. Kaynak ağacını `path/course/module/lesson` olarak protected workspace’te göster.
2. 11/37/114 sayıları ve yol bazlı sayaçları göster.
3. 27 doğrulanmış dersi açılabilir yap.
4. 87 modülü “İçerik hazırlanıyor” olarak kilitle; uydurma ders üretme.
5. Ders statülerini `available`, `in-progress`, `completed`, `locked`, `needs-review` olarak ayır.
6. Kullanıcı/company bazlı ilerleme özetini API’den yükle.
7. Son ders, yol ilerlemesi ve tamamlanma oranını koru.
8. Search/filter ve “sadece açık dersler” görünümü ekle.
9. Admin olmayan kullanıcıya kaynak yönetim ekranı açma.

Çıkış: Kayıtlı kullanıcı eksikliği dürüstçe görür; public kullanıcı müfredata erişemez.

## Faz 3 — Öğrenme deneyimi ve native laboratuvarlar

1. Ders viewer’a not ekleme/silme.
2. Bookmark ekleme/silme.
3. Ders çalışma süresi ve son aktif ders.
4. Ders tamamlanma checkpoint’i.
5. Wall Priority Simulator.
6. Reinforcement Calculator.
7. Coordinate Calculator.
8. Shortcut Trainer.
9. Laboratuvar sonucu ile ders tamamlanması arasına checkpoint koy.
10. Mühendislik uyarısı: hiçbir araç standart/uygulama onayı yerine geçmez.
11. SmartCheck bulgusundan ilgili Allplan dersine protected deep link.

Çıkış: Kullanıcı ders okuyup uygulama yapar, checkpoint tamamlar ve ilerlemesi hesap bazlı kalır.

## Faz 4 — İçerik üretim ve müfredat tamamlama

Öncelik sırası:

1. Fundamentals — mevcut 16 ayrıntılı dersle çekirdek onboarding.
2. Reinforcement — mevcut 3 ayrıntılı ders + metraj bağlantısı.
3. Architecture — mevcut 5 ayrıntılı ders.
4. BIM/OpenBIM — mevcut 2 ayrıntılı ders ve ardından IFC/BCF içerik üretimi.
5. Structural Engineering — 9 modülün tamamı için gerçek ders gövdesi.

Her yeni modül için zorunlu içerik sözleşmesi:

- öğrenme hedefi
- ön koşul
- Allplan sürümü/bağlamı
- adım adım uygulama
- ekran görüntüsü/diyagram veya doğrulanabilir çıktı
- standart ve kaynak referansı
- mühendislik sınırı
- checkpoint
- değerlendirme sorusu
- içerik sahibi ve review tarihi

Çıkış: `needs-review` modülü `available` yapılmadan önce parity ve teknik review geçer.

## Faz 5 — Sınav ve sertifika

1. Assessment ve exam attempt tabloları.
2. Soru bankası versiyonlama.
3. Geçme barajı ve tekrar sınav politikası.
4. Ders/uygulama/sınav eligibility kuralı.
5. Server-side certificate issuance.
6. Certificate number, issue date, program version, user and company snapshot.
7. Public verification endpoint yalnızca credential metadata döndürür.
8. Revoke/expire ve audit log.
9. İstemci tarafı sahte hash/görsel tek başına credential sayılmaz.

Çıkış: Sertifika doğrulanabilir, geri alınabilir ve kullanıcı hesabından bağımsız olarak numarasıyla kontrol edilebilir.

## Faz 6 — Ücretli eğitim hazırlığı

1. Academy product ve edition kavramı.
2. Enrollment/entitlement modeli.
3. Ücretsiz pilot, davetli cohort ve ücretli paket ayrımı.
4. Ders erişimini entitlement ile kontrol et.
5. Ödeme sağlayıcısını bu fazın sonunda bağla; ödeme entegrasyonu başlamadan erişim modelini hazırla.
6. İade, erişim bitişi ve sertifika geçerliliği politikası.
7. Kullanıcıya net olarak “BIMPlan SaaS hesabı” ve “Allplan eğitim erişimi” ayrımını göster.

Çıkış: Ödeme sistemi sonradan eklenebilir; eğitim erişim kodu/aboneliği mimariyi bozmaz.

## Sert durma kuralları

- Public route üzerinden ders gövdesi açılıyorsa sonraki faza geçilmez.
- Fallback metin gerçek ders gibi gösteriliyorsa içerik yayınlanmaz.
- Auth/tenant sınırı olmayan Firebase kodu taşınmaz.
- Sertifika eligibility sunucu tarafında hesaplanmıyorsa sertifika “resmi” diye adlandırılmaz.
- İçeriği olmayan Structural modüller tamamlanmış gibi pazarlanmaz.
- Her faz test, commit ve ilerleme raporu olmadan kapanmış sayılmaz.
