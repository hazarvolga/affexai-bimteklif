# Phase 7 — Academy Trust and Security Hardening

**Tarih:** 21 Temmuz 2026
**Durum:** Tamamlandı ve doğrulandı

## Kapatılan açıklar

- Çalışma süresi artık istemcinin gönderdiği toplam değere güvenmiyor.
- Heartbeat en fazla server tarafında gerçekten geçen süre kadar kredi verir; 60 saniyeden büyük istek reddedilir.
- Gizli veya focus dışındaki browser sekmesi çalışma süresi göndermiyor.
- Ders tamamlama için tahmini sürenin en az `%25`'i kadar doğrulanmış çalışma süresi gerekir.
- Interactive tool içeren dersler doğrulanmış checkpoint olmadan tamamlanamaz.
- Wall, reinforcement, coordinate ve shortcut checkpoint kanıtları server tarafında doğrulanır.
- Shortcut doğru cevap anahtarı client bundle'dan çıkarıldı.
- Başarılı ve başarısız checkpoint denemeleri audit edilir; kullanıcı/company/lesson başına 15 dakikada 10 deneme sınırı transaction lock ile uygulanır.
- Legacy timestamp checkpoint'leri sertifika uygunluğunda güvenilir sayılmaz; yalnız `checkpoint_version=v1` ve saklanan kanıt kabul edilir.
- Sertifika uygunluğu, completed flag yanında doğrulanmış ders süresini de yeniden hesaplar.
- Sınav deneme limiti PostgreSQL advisory transaction lock ile yarış koşullarına karşı korunur.
- Geçersiz seçenek indeksleri sınav denemesi oluşturmadan reddedilir.
- Sertifika expiration public ve protected yanıtlarda etkin statü olarak hesaplanır.
- Academy JSON yanıtları `private, no-store` ve `Vary: Authorization` kullanır.
- Async Academy route hataları kontrollü `500` API yanıtına çevrilir.
- Enrollment grant/reactivate/revoke/refund işlemleri owner/admin RBAC, tenant kontrolü ve audit log ile yönetilir.
- Sertifika, exam attempt ve audit ilişkileri DB seviyesinde composite company foreign key kullanır.
- Client localStorage progress kaydı server gerçeğinin yerine fallback olarak kullanılmaz.
- Entitlement veya ders yükleme hataları kullanıcıya açık durum ekranı olarak gösterilir.

## Yeni yönetim API'leri

- `GET /api/academy/allplan/admin/enrollments`
- `POST /api/academy/allplan/admin/enrollments`
- `POST /api/academy/allplan/admin/enrollments/:enrollmentId/status`

Manuel yönetim endpoint'i `purchase` kaynağı üretemez. Bu kaynak yalnız ileride doğrulanmış ödeme webhook'u tarafından oluşturulmalıdır.

## Migration'lar

- `0016_lethal_celestials.sql`: enrollment audit log ve tenant unique constraint.
- `0017_curly_mandroid.sql`: checkpoint evidence ve validation version.
- `0018_unique_maggott.sql`: certificate/exam/audit composite tenant foreign key'leri.
- `0019_thin_salo.sql`: checkpoint attempt audit ve rate-limit tablosu.

Drizzle'ın ürettiği `0016` ve `0018` dosyalarında foreign key sırası referans unique constraint'inden önceydi. Migration'lar uygulanmadan önce SQL sırası düzeltildi ve `teklifpro_local` üzerinde başarıyla doğrulandı.

## Final doğrulama

- `npm test`: 228/228 test başarılı.
- `npm run lint`: TypeScript kontrolü başarılı.
- `npm run build`: production frontend ve server bundle başarılı.
- `graphify update .`: 622 node, 713 edge ve 125 community ile güncellendi.
- Production browser QA: admin oturumu ile `software-overview` dersi açıldı; doğrulanmış çalışma süresi olmadan tamamlama isteği beklenen `409` yanıtını verdi ve UI'da en az 5 dakika gereksinimi gösterildi.
- İlk tam test çalışmasında unrelated SmartCheck child-process testi yoğun kaynak kullanımı altında 90 saniye timeout verdi; aynı test tek başına ve ikinci tam paket çalışmasında başarılı oldu.
