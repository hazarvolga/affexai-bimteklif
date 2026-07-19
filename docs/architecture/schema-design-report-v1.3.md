# TeklifPro SmartCheck Phase 1 Schema Design Report v1.3

Bu rapor, TeklifPro SmartCheck Phase 1 kapsamında veritabanına eklenen yeni tabloları, veri kısıtlarını, çoklu kiracı (multi-tenant) izolasyon kurallarını ve mimari kararları özetler.

---

## 1. Mimari Prensipler & Tenant İzolasyonu

SmartCheck Phase 1 tasarımı, TeklifPro'nun mevcut çoklu kiracılı mimarisine tam uyum sağlayacak şekilde tasarlanmıştır.

### İzolasyon Kuralları
1. **Fiziksel / Mantıksal Tenant Kolonları:** Eklenen tüm yeni tablolar istisnasız `company_id` kolonunu içerir.
2. **Composite Foreign Key (Bütünlük Kısıtları):** Tablolar arası tüm ilişkiler (örn: `documents` -> `document_processing_runs` veya `rule_candidates` -> `competency_signals`) `id` ve `company_id` kolonları üzerinden **composite foreign key** olarak bağlanmıştır. Bu sayede veritabanı düzeyinde çapraz kiracı (cross-tenant) veri sızıntıları imkansız kılınmıştır.
3. **Kullanıcı Doğrulaması:** Yetkilendirme ve işlem gerçekleştiren kullanıcıların, `memberships` tablosundaki `user_id` ve `company_id` composite anahtarına referans vermesi zorunlu tutulmuştur.

---

## 2. Veri Modeli ve Tablo Tanımları

Phase 1 kapsamında veritabanına eklenen 11 yeni tablo şunlardır:

1. **documents:** Sisteme yüklenen dokümanların (PDF/DOCX vb.) meta verileri ve depolama anahtarları.
2. **document_processing_runs:** Belirli bir doküman üzerindeki pipeline çalışmasının takibi (status: queued, running, succeeded, failed, cancelled).
3. **rule_candidates:** Yapay zeka tarafından dokümandan çıkarılan, henüz onaylanmamış kural adayları.
4. **rule_registry:** Şirket veya teklif düzeyinde aktif/pasif kuralların tescil edildiği ana kural kütüphanesi.
5. **rule_versions:** Kuralların canonical ifadelerini ve geçmiş versiyonlarını saklayan tablo.
6. **review_sessions:** Tekliflerin kurallara göre gözden geçirildiği oturumlar.
7. **review_findings:** Oturumlarda raporlanan kural ihlalleri (bulgular).
8. **competency_signals:** Kullanıcıların belirli hata kategorilerindeki (örn: quantity_unit, classification_code) yetkinlik sinyalleri.
9. **competency_signal_evidence:** Yetkinlik sinyallerine kanıt oluşturan gözden geçirme bulgularının eşleşme tablosu.
10. **assistance_resources:** Hata kategorilerine göre kullanıcılara sunulacak eğitim/yardım kaynakları.
11. **rule_assistance_resources:** Kurallar ile yardım kaynakları arasındaki ilişki tablosu.

---

## 3. Decision Log (Mimari Kararlar Logu)

### ADR-001 — Drizzle ORM Single-File Schema
* **Durum:** Approved
* **Karar:** Mevcut TeklifPro kod tabanının kararlılığını korumak adına tüm Phase 1 tabloları tek bir `src/db/schema.ts` dosyasının sonuna eklenecektir.

### ADR-002 — Processing Run Status Enum
* **Durum:** Approved
* **Karar:** `document_processing_runs.status` alanı için doküman durumundan bağımsız `processing_run_status` enum'ı (`queued`, `running`, `succeeded`, `failed`, `cancelled`) kullanılacaktır.

### ADR-003 — Composite Physical Constraints over Indexes
* **Durum:** Approved
* **Karar:** PostgreSQL composite foreign key ilişkilerinin doğru çözülmesi için Drizzle schema'sında `uniqueIndex` yerine fiziksel `unique` kısıtları kullanılacaktır.

### ADR-004 — Post-Pilot NestJS Backend Evolution
* **Durum:** Deferred — Not approved for Phase 1 implementation.
* **Karar:** Faz 1 geliştirmeleri sırasında Express backend NestJS'e taşınmayacaktır. NestJS, SmartCheck pilotu başarıyla tamamlandıktan sonra birleşik BIMPLAN ekosisteminin uzun vadeli backend mimarisi için değerlendirilecek aday teknoloji olarak kaydedilmiştir.
* **Gerekçe:** Faz 1'in temel amacı `Upload -> Run -> Rule -> Review -> Finding -> Usage` döngüsünü en az riskle doğrulamaktır. Ancak geliştirilen tüm Express servisleri Express nesnelerine doğrudan bağımlı olmak yerine sade veri nesneleriyle (DTO) çalışacak, böylece NestJS'e geçiş maliyeti minimumda tutulacaktır.

---

## 4. Doğrulama ve Test Sonuçları

1. **Forward Migration Dry-Run:** `teklifpro_shadow_pre_phase1` veritabanı üstünde %100 başarıyla tamamlandı.
2. **Rollback (Down Migration) Testi:** `drizzle/down.sql` transactional rollback testi başarıyla tamamlandı. Rollback sonrası farkın sıfır olduğu ve şemanın baseline 18 tablo konumuna kayıpsız döndüğü doğrulandı.
3. **Database Integrity Negatif Testleri:** Çapraz tenant kural adayı enjeksiyonu, çapraz doküman processing run eşleşmesi ve çapraz kullanıcı yetkinlik kanıtı sızıntı teşebbüsleri veritabanı kısıtları (composite foreign key & check constraints) tarafından başarıyla engellendi ve test edildi.
