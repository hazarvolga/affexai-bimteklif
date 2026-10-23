# Faz 6 — Hakediş, Yeşil Defter Kanıtı ve İhale Savunması

**Tarih:** 24 Ekim 2026

**Kod tabanı:** `ff057c420641e864e89fa56ced6a1460fc31919b`

**Hesaplama kaydı:** `BIM-CALC-2026-10-24.40` / `Rev. 46`
**Genel karar:** **PARTIAL — Pilot/L2, varsayılan kapalı, production'a dağıtılmadı**

Bu rapor kod ve otomatik doğrulama kanıtını kaydeder. Resmî Yeşil Defter/ataşman kabulü, OSKA/AMP native dosya uyumluluğu, EKAP gönderim kabulü veya bağımsız uzman onayı değildir. Bu dış kapılar kapanmadan özellik `live`, L3 veya resmî uyumlu olarak sınıflandırılamaz.

## Görev durumları

| Görev | Kod durumu | Kapanış için kalan dış kanıt |
|---|---|---|
| T35 — Dönemsel/kümülatif hakediş | **Kod ve test kapsamında tamamlandı** | Üretim feature flag kararı ve gerçek saha kabulü |
| T36 — Yeşil Defter, ataşman ve metraj icmali | **Kaynak bağlı ölçüm/review çekirdeği tamamlandı** | İzinli resmî Yeşil Defter, ataşman ve icmal setiyle yetkili teknik ofis kabulü |
| T37 — Mukayeseli keşif, fiyat farkı ve kesin hesap | **Deterministik/fail-closed çekirdek mevcut** | Bağımsız teknik ofisin iş artışı/eksilişi, fiyat farkı ve kesin hesap golden fixture'ı |
| T38 — OSKA/AMP aktarımı | **Yalnız `candidate` / `internal_roundtrip`** | Lisanslı native vendor dosyası, örnek şema ve üretici veya yetkili kullanıcı kabulü |
| T39 — EKAP ihale savunması | **Yalnız provenance/manifest yardımcısı** | Adı, unvanı, sicil/mesleki kimliği ve tarihi kayıtlı ihale uzmanı imzası; resmî süreç kabulü |

## Uygulanan teknik sınırlar

- Saf hesap motorunda tutar ve miktar aritmetiği BigInt tabanlı sabit noktada; kalıcı servis yolunda PostgreSQL `NUMERIC` ve `round()` ile yürütülür. Önceki dönem + bu dönem = kümülatif eşitliği, sözleşme tavanı ve satır/toplam mutabakatı sunucuda yeniden hesaplanır.
- Dönemler tenant, sözleşme ve ardışık dönem numarasıyla bağlanır; `project_name` yalnız açıklayıcı metindir ve proje FK/yetki sınırı değildir. Taslak önizleme ödeme kaydı değildir.
- Kaynak ölçüm `documentId` ve checksum taşır. İnceleme kararı ayrı olaydır; hazırlayan kendi dönemini onaylayamaz.
- `version/expectedVersion` optimistic lock, aktöre bağlı idempotency, kapsam hash'i ve append-only veritabanı korumaları eşzamanlı veya geriye dönük değişikliği reddeder.
- Düzeltme güncel onaylı dönemi supersede ederek onun tek ardıl taslağını oluşturur. Daha sonraki herhangi bir iptal edilmemiş dönem varken geçmiş dönem düzeltilemez.
- İş artışı/eksilişi, fiyat farkı snapshot'ı ve kesin hesap eksik bağlamda fail-closed kalır.
- Vendor alışverişi `compatible=false` ve `externalAcceptance=false` sınırını taşır. Güvenli CSV ve lokal sayı biçimi desteği native OSKA/AMP import uyumluluğu anlamına gelmez.
- İhale savunma manifesti her belgeyi `documentId` + checksum ile bağlar; eksik provenance, OCR belirsizliği ve mükerrer belgeyi reddeder. `automaticOfficialSubmission=false` sabittir.

## Vendor araştırması ve uyumluluk kararı

Açık ve vendor tarafından yayımlanan kaynaklar iş akışını anlamak için incelendi:

- [OSKA HakedişPlus Kullanım Kılavuzu](https://www.oska.com.tr/pdfdokumanlar/hakedispluskullanim-kilavuzu.pdf)
- [OSKA HakedişPlus — Yeşil Defter yardım sayfası](https://destek.oska.com.tr/hakedisplus-yardimi/hakedis-islemleri/yesil-defter/)
- [OSKA HakedişPlus — Belgeler](https://destek.oska.com.tr/sorular/belgeler/)
- [AMP Kurumsal Hakediş ve Yaklaşık Maliyet ürün sayfası ve rapor/iş akışı örnekleri](https://www.amp.com.tr/urunler/kurumsal-hakedis-ve-yaklasik-maliyet)
- [AMP Kurumsal Hakediş ve Yaklaşık Maliyet Kullanım Kılavuzu](https://www.amp.com.tr/dosyalar/kh/dokumanlar/kullanim-kilavuzu-amp-kurumsal-hakedis-ve-yaklasik-maliyet.pdf)

Bu kaynaklar Yeşil Defter, dönem miktarı, yapılan işler, rapor ve iş artışı/eksilişi davranışlarının karşılaştırılmasına yardım eder. Araştırmada lisanslı, sürümü belirli ve otomatik teste alınabilecek kararlı bir OSKA/AMP native import fixture veya açık interchange şeması bulunmadı. Bu nedenle T38 açık kaldı; oluşturulan dosyalar yalnız aday/iç roundtrip kanıtıdır.

## Doğrulama sonuçları

| Doğrulama | Sonuç |
|---|---:|
| `pnpm test` | **1314 toplam / 1308 geçti / 0 hata / 6 atlandı** |
| IFC Python testleri | **72 geçti** |
| PostgreSQL 16 release migration yaşam döngüsü | **14 geçti / 0 hata / 1 atlandı** |
| Progress payment service entegrasyonu | **3 / 3 geçti** |
| Release artifact doğrulaması | **6 / 6 geçti** |
| Production build | **Geçti** |
| Production dependency audit | **High/Critical temiz; 3 moderate** |
| Kod incelemesi | **GO; açık CRITICAL/HIGH yok** |
| Güvenlik incelemesi | **GO; açık CRITICAL/HIGH yok** |

PostgreSQL yaşam döngüsündeki tek atlama, test ortamında PostgreSQL 16 ile eşleşen `pg_dump` / `pg_restore` ikilisinin bulunmamasıdır. Bu atlama veri geçişi veya migration doğrulaması başarısı olarak yorumlanmadı; restore/parity kapısı ayrı dış koşul olarak görünür bırakıldı.

## Bağımsız uzmanlara kalan en küçük kanıt paketi

1. **Teknik ofis / inşaat mühendisi:** İzinli bir sözleşmede en az üç ardışık ara hakediş, kaynak ataşmanları, Yeşil Defter ve icmal ile dönem/kümülatif miktar ve tutarların birebir karşılaştırılması; bir düzeltme, bir iş artışı/eksilişi, bir fiyat farkı ve kesin hesap senaryosunun imzalanması.
2. **Vendor kabulü:** Lisanslı ve sürümü belirli OSKA ile AMP dosyalarında export → import → yeniden export karşılaştırması; reddedilen/zorunlu alanların ve yuvarlama davranışının vendor bazında kaydı.
3. **İhale uzmanı:** Belge manifesti, OCR belirsizliği, mükerrer belge, tutar mutabakatı ve savunma eklerinin incelenmesi; resmî EKAP gönderim adımlarının sistem dışında kaldığının yazılı teyidi.
4. **Release kabulü:** Feature flag'in kapalı başladığının, tenant/RBAC sınırlarının ve PostgreSQL 16 yedekleme/geri yükleme parity koşusunun hedef ortamda doğrulanması.

Bu dört paket tamamlanana kadar Faz 6'nın doğru statüsü **PARTIAL / Pilot L2** olarak kalır.
