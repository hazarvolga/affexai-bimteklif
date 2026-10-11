# Geçmiş commitler ve canlı ürün paritesi — 11 Ekim 2026

## Sonuç

Erişilebilir Git geçmişinde kaybolmuş özellik commitleri veya eksik merge
bulunmadı. Sorunlar dört ayrı grupta: **yerelde kalmış başlangıç verisi,
üretimde kapalı entegrasyonlar, eski mock davranışları ve tamamlanmamış ürün
akışları**. Sağlıklı container, yeşil CI ve şema paritesi bunların tamamlandığını
kanıtlamıyor. Canlıya geçiş kontrolünde işlev/katalog kabulü eksik kalmıştı.

İnceleme salt okunur yapıldı. SMTP hazırlığının önceden başlayan yerel
değişiklikleri bu raporun bulgularına çözüm olarak sunulmuyor ve deploy edilmedi.

## Git, dağıtım ve veritabanı kanıtı

- Dağıtılan uygulama kodu: `5d19a234ac883927bf7379f2f31430ca55a02590`.
- İnceleme başlangıcında yeni GitHub remote `affexai` aynı committeki
  `feat/smartcheck-evaluation-baseline` branch'ini içeriyor.
- `git rev-list --count HEAD..main`: **0**.
- `git rev-list --count HEAD..origin/feat/smartcheck-evaluation-baseline`: **0**.
- İncelenen diğer erişilebilir ref'lerde HEAD dışında kalan commit bulunmadı.
  Bu kontrol silinmiş/hiç commit edilmemiş dosyaların var olmadığını kanıtlamaz.
- Aktif ürün Vite/Express. Next/Prisma shadow çalışması bilinçli olarak ayrı;
  kaybolmuş Next dağıtımı bulgusu yok. App route aileleri, fiyat scheduler'ı,
  genel worker ve IFC worker girişleri mevcut.

| Veri | Yerel `teklifpro_local` | Üretim `bimmetraj_production` |
|---|---:|---:|
| Paket | 5 | 0 |
| Fiyat kaynağı | 5 | 0 |
| Fiyat staging kaydı | 16 | 0 |

Yerelde ayrıca 5 şirket, 5 kullanıcı ve 3 teklif var. Bu iş/test verilerinin
tamamını üretime kopyalamak doğru bir katalog kurtarma yöntemi değildir.

## Tarihsel karşılaştırma

| Alan | Commit kanıtı | Gerçek durum |
|---|---|---|
| Beş paket | `6d678ed`, `0c3e0a5` | UI, kayıt akışı ve landing fiyatları eklenmiş; beş paketi oluşturan sürümlenmiş seed yok. |
| Kaynak yönetimi | `bb42a29` | Menü, ekran, API ve 0038 şeması var; SQL kaynak INSERT içermiyor. |
| Resmî ÇŞB/TÜİK crawler | `2f6cbf0` → `2e6fb87` | İlk uygulama sabit fiyat/endeks dönüyordu; son hardening bunu bilerek fail-closed yaptı. Çalışan resmî adaptör kaybolmadı. |
| Poz teftişi | `bb42a29` | API çağrısız örnek fiyat, hash ve uygunluk sonucu hâlâ UI'da var. |
| Gece scheduler | `5cd7994` | Çalıştırıcı bağlı; saat ve durum raporlama eksik. |
| Teklife benchmark aktarımı | `bd6906a` | Akış mevcut ama staging onayını zorunlu kılmıyor. |
| Çoklu bölge | `9ad2a15` → `2e6fb87` | Şema/ayar kaydı mevcut; release 0005 şema açığını kapattı. Hesaplama motoruna standart/birim sistemi entegrasyonu tamamlanmış değil. |
| AI provider router | `882e3be` | Teklif AI'sında router var; diğer bazı modüller hâlâ doğrudan Gemini kullanıyor. |
| Mevzuat taraması | `3f52cb3` | Gerçek kaynak fetch yerine LLM üretimi; prompt simüle güncel bilgiye izin veriyor. |
| Abonelik tahsilatı | `8002e1e` | Billing kullanım ekranı; gerçek online checkout daha önce de tamamlanmış değildi. Academy ödeme webhook'u ayrı özellik. |

## Öncelikli bulgular

### P1 — Onaylanmamış veya reddedilmiş fiyat teklife aktarılabiliyor

`src/server/routes/pricing.ts:106–131` staging kayıtlarını onay durumu filtresi
olmadan döndürüyor. `status != 'disabled'` kaynak filtresi şemadaki
`active/syncing/error/stale` durum kümesiyle uyuşmuyor ve staging sorgusunu da
güvenceye almıyor. Kaynak geçerliliği kontrol edilmiyor; tarih yokken
`2026 Yürürlükte` etiketi üretilebiliyor.

`src/pages/CreateQuote.tsx:124–140` taranan fiyatı teklif fiyatına, bunun %85'ini
maliyete dönüştürüyor ve %3 zayiat ekliyor. Kaynak ve inceleme kimliği normal
teklif kalemine taşınmıyor. Sorun `bd6906a` ile eklenmiş, deploy sırasında
oluşmamış. Canlıda bu yoldan hazırlanmış teklif bulunduğu doğrulanmadı.

Gerekli kabul: pending/rejected fiyat teklif API/UI'sine çıkmamalı; geçerlilik
bilinmiyorsa açıkça bilinmiyor olmalı; provenance korunmalı; sentetik maliyet
ve zayiat varsayımları sessizce uygulanmamalı.

### P1 — UI'da örnek sonuçlar resmî doğrulama gibi sunuluyor

`src/pages/admin/PricingSources.tsx` içindeki `runAuditSearch` gerçek API
doğrulaması yapmadan sabit beton/demir fiyatı, resmî kurum, hash ve
`epysCompliant: true` üretir. Başlangıcı `bb42a29`.

Eski backend `2f6cbf0` ÇŞB için fetch yapmadan 2350/28200 fiyatları, TÜİK için
148.6/145.2/159.4 endeksleri döndürüyordu. Backend örnekleri `2e6fb87` ile
kapatıldı; UI örneği kalmış. Eski hafızadaki "14.280 poz, SHA mühürlü kaynak"
iddiasını destekleyen sürümlenmiş gerçek import kanıtı bulunmadı.

### P1 — Ürün başlangıç kataloğu üretime taşınmamış

`drizzle-release/0001_admin_billing.sql` paket tablosunu,
`0005_regional_pricing_sources.sql` kaynak tablosunu oluşturuyor; katalog verisi
eklemiyor. Eski `seed-superadmin.ts/.mjs` beşli katalogla uyuşmayan üç fiyat
(499/1299/2999) içeriyor, ilk şirketin aboneliğini ve kullanımını da değiştiriyor.
**Bu scriptler üretimde çalıştırılmamalı.**

Önceki ürün tanımı (hafıza ve landing aynı):

| Paket | TL/ay | Teklif | IFC/ay | IFC MB |
|---|---:|---:|---:|---:|
| 14 Günlük Ücretsiz Deneme | 0 | 5 | 1 | 35 |
| e-PYS & BIM Standart Denetçi | 390 | 0 | 50 | 50 |
| Teklif & Şantiye | 1.450 | 30 | 2 | 30 |
| 5D BIM & SmartCheck | 3.950 | 150 | 25 | 100 |
| Kurumsal Taahhüt & e-PYS | 8.900 | 99.999 | 100 | 250 |

99.999 gerçek sınırsızlık değildir. Tarayıcıdaki sınır 25 MB, sunucudaki IFC
sert tavanı ise 100 MB (`src/smartcheck/import/ifc-limits.ts:13`). Bu nedenle
paketteki 250 MB vaadi mevcut uygulamayla karşılanmıyor. Kullanıcı akışının
hangi yolu kullandığı ayrıca kabul testine alınmalı.
Güvenli bootstrap idempotent, hedef DB korumalı ve audit'li
olmalı; mevcut abonelik/kullanım verisini değiştirmemeli. Kaynak kayıtları
doğrulanmamış fiyat, hash veya item count ile doldurulmamalı.

### Üretimde kapalı kalan özellikler

- SmartCheck global flag **false**. Tenant ayarını açmak global kilidi aşmaz;
  pilot evidence route'ları da 404 olabilir. Paket ve pilot şirket yapılandırması
  ile gerçek dosya → worker → inceleme → teklif kabulü tamamlanmalı.
- E-posta modu **disabled**. Kayıt/davet/reset talebi çalışmıyor. Özel SMTP
  kurulumu isteniyor; yerel adapter WIP henüz release değil.
- AI anahtarları yok. Sadece OpenAI eklemek CRM/mevzuat/kârlılığı açmayabilir;
  bunların bazıları doğrudan Gemini'ye bağlı.
- Academy ödeme webhook'u yapılandırılmamış. SaaS online ödeme/otomatik abonelik
  tahsilatı geçmişte de tamamlanmış bir özellik değil.

### P2 — Yönetim ve zamanlayıcı durumları yanıltıcı olabilir

- `/admin/plans` ve `/admin/pricing-sources` menüde ve router'da mevcut.
  `/app` içinde belirgin platform yönetimi geçişi bulunmaması erişimi gizliyor.
- `PlansList` HTTP/JSON hata kontrolü ve boş durum göstermiyor.
  `AdminDashboard` hata yanıtını sıfır metrik gibi gösterebiliyor.
- Crawler 03:00'ü sunucu yerel saatiyle hesaplıyor; canlı saat UTC, bu Türkiye'de
  06:00. DB günlük tekrar sınırı da aynı açık timezone tanımına alınmalı.
- Scheduler son çalışma bilgisi process belleğinde; restart geçmişi kaybettirir.
  `isSchedulerActive` koşulsuz true bildirimi gerçek timer durumunu kanıtlamaz.
- Bölge/standart ayarlarının kaydedilmesi ACI/Eurocode/imperial hesap motorunun
  tamamlandığı anlamına gelmiyor.
- Mevzuat servisinde hata `[]` olup API tarafından başarılı sıfır kayıt gibi
  gösterilebiliyor. Gerçek kaynak taraması ve kaynak referansları eksik.

## Canlıya geçişte gerçekten doğrulananlar

DNS, apex/www TLS ve Cloudflare Full (strict), app/DB sağlığı, worker süreçleri,
schema migration, gerçek PDF 5/5, R2 okuma/yazma, ayrı günlük backup görevi ve
R2'den 68 tablo şema/satır sayısı eşleşen restore doğrulandı. Aktif sırlar yeni
image history/config içinde bulunmadı; backup credential izolasyonu son
container'larda doğrulandı. Hazar Volga Ekiz'in superadmin yetkisi DB'de doğrulandı.

Bunlar **ürün özelliklerinin tamamının hazır olduğu** anlamına gelmiyor.
İlk hesap yalnız tenant owner rolündeydi; kullanıcının açık talebi
üzerine audit kaydıyla platform superadmin yapıldı. Eski R2 token iptali kullanıcı
onayını bekliyor.

## Önerilen tamamlama sırası

1. Fiyat onayı/provenance açığı ve sahte resmî doğrulama sonuçları.
2. Güvenli beş paket bootstrap'ı; admin boş/hata/navigasyon durumları.
3. Gerçek kaynağa dayalı crawler staging → insan onayı → teklif kabul testi;
   timezone ve kalıcı çalışma durumu.
4. Özel SMTP, sonra kontrollü SmartCheck/pilot aktivasyonu ve gerçek IFC kabulü.
5. AI provider kapsamı; mevzuat, bölgesel hesaplama ve online ödeme için ayrı
   tamamlanma ölçütleri. Mevcut olmayan entegrasyonları yapılmış gibi açmamak.

Her adım için yalnız unit test değil, temiz DB başlangıcı ve gerçek kullanıcı
akışı kanıtı aranmalı. Bu rapor tüm satırların yeni baştan güvenlik denetimi
değildir; geçmiş özellik iddiaları ile üretim paritesindeki somut açıkları kapsar.
