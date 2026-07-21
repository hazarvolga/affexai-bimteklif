# Phase 10 — Ücretsiz Öğrenci Kaydı ve Kullanıcı Edinme

**Tarih:** 22 Temmuz 2026

**Karar:** Academy ödeme entegrasyonu ertelendi. Mevcut doğrulanmış içerik, ücretsiz öğrenci kaydıyla kullanıcı edinme ve ürün talebi ölçme kanalıdır.

## Ürün modeli

- Public Academy kapısı ücretsiz öğrenci kaydını ana CTA olarak gösterir.
- Kredi kartı veya ödeme sağlayıcısı gerekmez.
- `intent=academy` kaydı; kullanıcı, kişisel tenant, starter workspace ve `free_pilot` Academy enrollment'ını tek transaction içinde oluşturur.
- Kayıt başarılı olduğunda kullanıcı doğrudan `/app/academy/allplan` alanına gider.
- Mevcut 27 doğrulanmış ders açılır; hazırlık aşamasındaki 87 modül ve dokuz Structural dersi uydurma içerikle açılmaz.
- Ödeme webhook kodu kaldırılmaz; ileride ücretli cohort, ileri seviye içerik veya doğrulanmış sertifika paketi için yeniden kullanılabilir.

## Güvenlik ve veri sınırı

- Academy enrollment yalnız aktif `allplan-pro / 2026.1 / free_pilot` edition varsa verilir.
- Hesap, membership, subscription, enrollment ve audit log aynı DB transaction'ındadır; yarım kayıt bırakılmaz.
- Kayıt girdileri normalize edilir; e-posta, ad, parola ve intent sınırları sunucuda doğrulanır.
- Password hash API response'una dönmez.
- Ürün hesabı açılması pazarlama e-postası izni sayılmaz. Ayrı açık rıza alanı ve saklama modeli eklenmeden promotional mailing yapılmaz.

## Doğrulama

- Registration boundary targeted test: 3/3 başarılı.
- TypeScript `tsc --noEmit`: başarılı.
- İzole `teklifpro_local` HTTP smoke:
  - registration: `201`
  - `academyEnrolled`: `true`
  - password hash exposed: `false`
  - entitlement: `200 / free_pilot`
  - curriculum: `200 / 10 paths / 37 courses / 114 modules / 27 detailed lessons`
- Playwright browser smoke:
  - ücretsiz Academy CTA doğru `intent=academy` rotasına gider,
  - okul/şirket alanı opsiyoneldir,
  - form submit sonrası `/app/academy/allplan` açılır,
  - 27 açık ders ve 0/27 başlangıç ilerlemesi render edilir.
- İki smoke kullanıcısı ve ilişkili tenant/enrollment/audit kayıtları test sonrası temizlendi.

## Ticarileştirme eşiği

Ödeme entegrasyonu kullanıcı edinme kanıtı oluşmadan yeniden önceliklendirilmez. İlk ölçülecek metrikler:

1. Academy landing → kayıt dönüşüm oranı.
2. Kayıt → ilk ders açma oranı.
3. İlk ders → ikinci ders geçiş oranı.
4. Yedi günlük aktif öğrenci oranı.
5. Structural erken erişim talebi.

Ücret testi için en uygun sonraki teklifler ücretsiz çekirdeği kapatmak değil; canlı cohort, teknik reviewer'lı Structural paket, kurumsal ekip raporları veya doğrulanmış sertifika değerlendirmesidir.
