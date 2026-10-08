# Süper Admin (Platform Sahibi) Paneli PRD

## Amaç
Multi-tenant SaaS uygulamamıza, ürünü geliştiren ve satan platform sahibinin kullanacağı, normal müşteri (tenant) ekranlarından tamamen izole edilmiş bir yönetim paneli (Süper Admin Paneli) eklemek.

## İki Farklı Rol İzolasyonu
1. **Tenant Kullanıcısı (Müşteri):**
   - Kendi firmasının teklif, müşteri ve ürün kalemlerini yönetir.
   - Kendi verisi dışına çıkamaz.
   - Eriştiği yer: `/app`

2. **Süper Admin (Platform Sahibi):**
   - Tüm tenant'ları görür, yönetir.
   - Teklif hazırlama gibi tenant işlemlerini yapmaz.
   - Faturalandırma, kotalar, gelir ve paket yönetiminden sorumludur.
   - Eriştiği yer: `/admin`

## İş Modeli & Kota Mantığı
- Paketler sistem kodunda sabit kalmamalıdır, dinamik (veritabanından) gelmelidir.
- Her paketin bir aylık fiyatı ve aylık teklif kotası vardır.
- Faturalandırma dönemi başlangıcına göre her ay kullanım kotası yenilenir.
- Kotası dolan tenant yeni teklif oluşturamaz. 
- Silinen teklifler kotayı geri vermez.
- Süper admin dilerse bir tenant'a manuel "Bonus Kota" tanımlayabilir.

## Arayüz (Ekranlar)
1. **Genel Bakış (Dashboard):** Toplam tenant sayısı, gelir trendleri (MRR), paket dağılımları ve kota uyarıları.
2. **Tenant (Firma) Listesi:** Firmaların paket, durum ve kota kullanım bilgileri.
3. **Tenant Detay Sayfası:** Paket değişikliği, askıya alma, bonus kota tanımlama ve "Impersonate" (müşteri yerine geçme) butonu.
4. **Paket Yönetimi:** Dinamik paket oluşturma, fiyat belirleme ve pasife alma (silinmez).
5. **Raporlar:** Kullanım ve gelir raporlarının CSV çıktıları.
6. **Denetim Logu (Audit Log):** Süper adminin platformdaki kritik müdahalelerinin detaylı loglanması.

## Veri Modeli Genişletmeleri
- `plans` tablosu (dinamik paketler).
- `subscriptions` tablosuna plan ilişkisi, `bonus_quote_limit` ve `current_period_start`.
- `usage_records` (aylık kota kullanımı).
- `admin_audit_logs` (denetim).
- `users` tablosuna `is_super_admin` flag'i.

