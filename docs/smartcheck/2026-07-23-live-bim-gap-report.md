# TeklifPro canlı uygulama BIM GAP raporu

**Tarih:** 23 Temmuz 2026  
**Canlı doğrulama ortamı:** `http://localhost:3013` (lokal pilot uygulaması)  
**İnceleme:** gerçek Playwright tarayıcı oturumu, uygulama route'ları, SmartCheck ekranı ve mevcut HTTP/PostgreSQL test kanıtları  
**Ana uzman:** AI BIM Director  
**Orkestrasyon:** AI Construction Orchestrator  
**Görsel inceleme:** High-End Visual Design  
**Karar:** Uygulama demo/pilot hazırlık seviyesinde; müşteri üretim pilotu için P0/P1 GAP’ler devam ediyor.

## 1. Executive Summary

Uygulama `localhost:3013` üzerinde başarıyla başlatıldı. Public Academy, login, dashboard ve SmartCheck çalışma alanı gerçek tarayıcıda açıldı. Admin oturumu ile `/app/smartcheck` ekranı görüldü. SmartCheck ekranı evidence-first mesajını, Excel/CSV yükleme alanını ve kaynak hücre incelemesini doğru yönde sunuyor.

Bununla birlikte canlı ekran kanıtı, ürünün gerçek müşteri pilotuna hazır olduğu anlamına gelmiyor. UI’da yükleme alanı görünür olsa da feature flag/allowlist ve gerçek dosya akışı ayrıca etkinleştirilmeli. Canlı incelemede şu ana riskler öne çıktı:

- İş akışı doğru sırayı anlatıyor ancak ekran henüz gerçek dosya üzerinde upload → processing → review → transfer kanıtı göstermiyor.
- Teknik reviewer, müşteri izinleri, retention ve kural sürümü kullanıcıya görünür bir kontrol kapısı olarak sunulmuyor.
- SmartCheck ekranı ile demo denetimi aynı sayfada yan yana duruyor; demo bulgusu ile gerçek import bulgusunun ayrımı daha sert görsel/terminolojik sınır istiyor.
- Favicon 404 gözlendi; Vite HMR websocket hataları canlı console’da görüldü. Bunlar pilot veri güvenliği açığı değildir fakat polish/operasyon sinyalidir.

## 2. Canlı kanıt günlüğü

| Kanıt | Sonuç | Güven |
|---|---|---:|
| `GET /academy` | Sayfa açıldı, Academy navigasyonu ve CTA’lar görünür | Yüksek |
| `GET /login` | Login formu açıldı | Yüksek |
| Admin login | `/app` dashboard’a yönlendirdi | Yüksek |
| `/app/smartcheck` | SmartCheck UI açıldı; upload/mapping/review alanı görünür | Yüksek |
| SmartCheck snapshot | “XLSX veya CSV seçin”, kolon mapping, kaynak kanıtı alanı mevcut | Yüksek |
| SmartCheck screenshot | `output/playwright/smartcheck-live.png` | Yüksek |
| Browser console | favicon 404; development HMR websocket bağlantı hataları | Yüksek |
| HTTP + PostgreSQL harness | Gerçek endpoint zinciri ve tenant izolasyonu 1/1 geçti | Yüksek |

## 3. Current BIM Maturity

| Boyut | Seviye | Bulgular |
|---|---|---|
| People | Pilot hazırlığı | Reviewer ve yetkinlik kaydı için veri sözleşmesi var; gerçek isim/onay yok |
| Process | Orta | Upload, normalize, validate, human review ve transfer akışı modellenmiş |
| Information | Orta+ | Source cell, document/run, raw/normalized değer ve audit izi tutuluyor |
| Governance | Orta- | Kural metadata alanları var; canlı promotion/reviewer cockpit yok |
| Technology | Orta+ | Express/Vite/Drizzle/PostgreSQL/Graphile Worker, local storage ve S3 adapter mevcut |
| Evidence | Orta | Browser smoke ve HTTP/PostgreSQL harness var; gerçek müşteri dosyası yok |
| Confidence | Pilot sınırlı | Teknik akış kanıtlı; saha/MEP genellenebilirliği henüz ölçülmedi |

Bu değerlendirme ISO 19650 uyumluluğu veya sertifikasyonu iddiası değildir. Proje/işveren EIR, BEP, CDE ve sözleşme bilgi gereksinimleri görülmeden böyle bir karar verilemez.

## 4. Information Requirements

Pilot için her dosyanın şu bilgi paketini taşıması gerekir:

- müşteri ve proje kimliği;
- disiplin ve dosya kapsamı;
- yazılı kullanım izni ve saklama bitişi;
- SHA-256 ve storage prefix;
- sheet/header mapping;
- source row/cell, raw value, normalized value;
- kullanılan kural sürümü ve reviewer kararı;
- düzeltme veya accepted exception gerekçesi;
- teklife aktarım ve idempotency sonucu.

### BIM yönetişimi GAP’i

MEP poz kodları ve birimler için proje/kurum sözlüğü yok. `adet`, `m`, `m²`, `m³`, `kg`, `ton`, `set` gibi düşük riskli eşlemeler mevcut; MEP’e özgü birim ve sınıflandırma kapsamı pilot dosyalarıyla doğrulanmalı. LOIN/LOD, naming/classification ve CDE status değerleri bu uygulamadan bağımsız proje sözleşmesiyle belirlenmeli.

## 5. Canlı UI ve yüksek-end görsel değerlendirme

**Seçilen arketip:** Ethereal Glass + Asymmetrical Bento.

### Güçlü yönler

- SmartCheck alanı dashboard’dan ayrı, evidence-first başlıkla konumlanıyor.
- Kaynak hücre, bulgu ve karar kolonları doğru bilgi mimarisini işaret ediyor.
- Demo içeriği mühendislik onayı değildir uyarısı mevcut.
- Responsive grid ve yoğun veri tablosu için yatay kaydırma yaklaşımı uygun.

### Görsel/UX GAP’leri

- Gerçek import ile demo denetimi aynı görsel ağırlıkta; “DEMO” ve “GERÇEK DOSYA” ayrımı daha belirgin olmalı.
- Upload alanı, processing progress ve review state’leri gerçek veri yokken boş/disabled kalıyor; kullanıcıya neden ve hangi gate’in beklediği anlatılmalı.
- Teknik reviewer, izin ve kural sürümü görünür bir provenance paneli olarak eklenmeli.
- “İstisna” kararı mevcut olsa da UI’da kararın teknik yetki ve gerekçe gerektirdiği açıkça yazılmalı.
- Favicon 404 giderilmeli; geliştirme HMR hataları production smoke raporundan ayrıştırılmalı.

## 6. GAP öncelikleri

### P0 — Pilot öncesi

1. Feature flag + pilot company allowlist’in canlı pilot ayarlarıyla doğrulanması.
2. Gerçek MEP dosyasıyla browser upload/processing/review/transfer kanıtı.
3. Reviewer kimliği, yetkinlik scope’u ve karar paneli.
4. Her aktarımda doğru rule-version provenance görünürlüğü.
5. Cross-tenant HTTP testinin CI/local acceptance kapısına bağlanması.

### P1 — İlk beş dosya sırasında

1. Sheet/header preview.
2. MEP birim ve kurum mapping profilleri.
3. Satır bazlı ticari override ve audit görünümü.
4. Queue retry/dead-letter/operator görünürlüğü.
5. Pilot KPI paneli: parse oranı, düzeltme sayısı, süre, bulgu ve aktarım.

### P2 — Ölçekleme sonrası

1. CDE/document status entegrasyonu.
2. BEP/EIR/AIR/PIR’e göre kurum şablonları.
3. IFC/PDF genişlemesi; yalnız ölçülmüş pilot ihtiyacıyla.

## 7. Governance and Workflow

Önerilen kontrollü akış:

`Customer consent → upload quarantine → checksum/signature → parse → normalize → validate → human review → technical exception/rejection → approved transfer → quotation revision/PDF`

Her geçişte actor, timestamp, company, document/run ve reason audit edilmelidir. Tasarım/hesap/mühendislik sorumluluğu uygulamaya devredilmemeli; SmartCheck karar desteği olarak kalmalıdır.

## 8. Roadmap and exit criteria

| Faz | Sahip | Çıkış kriteri |
|---|---|---|
| Live smoke | Engineering | UI + API + worker + PDF akışı kanıtlı |
| Pilot admission | Product/Customer | 5 izinli dosya, reviewer ve storage manifesti tamam |
| MEP validation | BIM reviewer | ≥%90 manuel yeniden girişsiz parse |
| Safety/security | Engineering | Cross-tenant negatif testlerde sıfır sızıntı |
| Go/no-go | Product owner | KPI iyileşmesi ve provenance eksiksiz |

## 9. Decisions Needed

- İlk beş MEP dosyasının izin ve saklama sahibi kim olacak?
- Teknik reviewer kim ve hangi MEP kapsamını onaylayacak?
- Production S3 bucket/prefix, retention ve encryption sahibi kim?
- Pilot sırasında hangi kurum birim sözlüğü canonical kabul edilecek?

## 10. Handoff

**Recommendation:** Uygulama canlı demo ve kontrollü teknik pilot gösterimine hazır; production müşteri pilotu için P0 admission kanıtları tamamlanmadan kapsam genişletilmemeli.

**Evidence:** Browser snapshot/screenshot, HTTP + PostgreSQL integration harness, SmartCheck route ve veri modeli.

**Assumptions:** İncelenen ortam lokal development server’dır; production deployment, gerçek S3 ve müşteri dosyaları bu raporda doğrulanmamıştır.

**Dependencies:** 5 müşteri dosyası, izin referansları, teknik reviewer, S3 credentials/config, pilot allowlist.

**Risks:** Yanlış MEP birim mapping’i, provenance eksikliği, demo/gerçek akışın karışması, retention ve tenant sınırlarının operasyonel olarak uygulanmaması.

**Next actions:** P0 browser gerçek dosya smoke, provenance paneli, favicon/polish düzeltmesi, beş dosyalı pilot admission.

**Confidence:** Teknik route/harness bulguları yüksek; BIM saha genellenebilirliği orta-düşük, çünkü gerçek müşteri MEP örneklemi henüz yok.
