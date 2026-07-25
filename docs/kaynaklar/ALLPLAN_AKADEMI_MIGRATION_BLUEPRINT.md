# ALLPLAN Akademi ➔ TeklifPro Entegrasyon ve Taşınma Blueprint'i

> **Hedef:** `allplanAkademi-main` projesindeki 6 eksik interaktif bileşenin `TeklifPro-repo` mimarisine modüler monolith anlayışıyla, mevcut geliştirmeleri bozmadan aktarılması.  
> **Tarih:** 23 Temmuz 2026  
> **Durum:** Bağımsız Mimari ve Taşınma Şartnamesi (TeklifPro-repo dışı kayıt)

---

## 1. Mimarisi ve Entegrasyon İlkeleri

TeklifPro projesindeki geliştirmelerin kesintiye uğramaması için taşınma işlemi 3 temel kurala dayanır:

1. **Modüler Monolith Yapısı:** Tüm Akademi bileşenleri `TeklifPro-repo/src/academy/allplan/` bounded context'i altında toplanır.
2. **Ortak PostgreSQL & Drizzle ORM:** `allplanAkademi-main` içindeki SQLite/Firebase yapıları TeklifPro'nun mevcut Drizzle ORM veritabanı şemasına dahil edilir (`academy_exam_attempts`, `academy_certificates`, `academy_checkpoints`).
3. **Mevcut Koda Dokunmadan Hazırlık:** Tüm bileşenler önce bağımsız modüller olarak hazırlanır, ardından tek bir rota (`App.tsx` router) güncellemesiyle yayına alınır.

---

## 2. Taşınacak 6 Eksik Modülün Detaylı Özellikleri

### 📦 MODÜL 1: İnteraktif CAD Diyagram Görüntüleyici (`CADDiagramViewer.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/CADDiagramViewer.tsx` (39.3 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/components/academy/CADDiagramViewer.tsx`
*   **Fonksiyonel Özellikler:**
    *   Allplan NDW paftalarının ve 2B/3B bina kesitlerinin Vektörel (SVG/Canvas) katman katman görüntülenmesi.
    *   Katman (Layer) açma/kapama toggles (Örn: Duvarlar, Ölçü Çizgileri, Akslar, Donatılar).
    *   Zoom, Pan ve eleman üzerine tıklayarak nitelik (Attribute) okuma paneli.

### 📦 MODÜL 2: Dinamik Sınav & Sertifikasyon Motoru (`ExamInterface.tsx` & `CertificatesViewer.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/ExamInterface.tsx` (20.2 KB) & `CertificatesViewer.tsx` (19.7 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/academy/allplan/certification/`
*   **Fonksiyonel Özellikler:**
    *   **Zaman Ayarlı Sınav Simülatörü:** 20 soruluk dinamik soru havuzundan rastgele soru çekme, geri sayım sayacı (%75 geçme barajı).
    *   **24 Saatte 2 Deneme Kısıtı:** Kötüye kullanımı önleyen günlük sınav limiti kontrolü.
    *   **Sertifika & Rozet Üretimi:** Başarılı olan kullanıcılara benzersiz doğrulama numaralı (`CERT-ALLPLAN-2026-XXXX`) dijital sertifika ve PDF çıktısı.
    *   **Doğrulama Linki:** Sertifika geçerliliğini sorgulayan `/academy/verify/:certificateId` halka açık arayüz.

### 📦 MODÜL 3: Kategori Filtreli Bilgi Bankası & SSS (`KnowledgeBase.tsx` & `BIMFAQViewer.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/KnowledgeBase.tsx` (28 KB) & `BIMFAQViewer.tsx` (9.5 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/pages/AcademyKnowledgeBasePage.tsx`
*   **Fonksiyonel Özellikler:**
    *   Kategori Bazlı Filtreleme: Mimarlık, Mühendislik, Altyapı/Köprü, PythonParts, Lisanslama ve OSKA e-Hakediş.
    *   Anlık Metin ve Etiket (Tag) Arama Motoru.
    *   İndirilebilir PDF Kılavuzlar ve Hızlı Çözüm Kartları.

### 📦 MODÜL 4: Öğrenci İstatistikleri & Yetkinlik Radarı (`StudentProfile.tsx` & `AnalyticsOverlay.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/StudentProfile.tsx` (29.8 KB) & `AnalyticsOverlay.tsx` (21.2 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/components/academy/StudentProfileDashboard.tsx`
*   **Fonksiyonel Özellikler:**
    *   Öğrenci Yetkinlik Radarı (Recharts kütüphanesi ile Mimari, Donatı, Metraj, IFC ve Scripting zayıf/güçlü yön analizi).
    *   Tamamlanan Dersler, Harcanan Toplam Süre (Dakika) ve Laboratuvar Başarı Oranı.
    *   Kesintisiz Öğrenme Serisi (Streak Counter).

### 📦 MODÜL 5: Ders İçi Pratik Checkpoint'ler (`InlineCheckpoint.tsx` & `InteractiveSimulators.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/InlineCheckpoint.tsx` (11.5 KB) & `InteractiveSimulators.tsx` (27 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/components/academy/InlineCheckpoint.tsx`
*   **Fonksiyonel Özellikler:**
    *   Ders içi mini laboratuvar ödevleri (Örn: Wall Priority değerini simülatörde 500 ayarlamadan sonraki derse geçiş kilitlenir).
    *   SmartCheck Kural Senkronizasyonu: Kural ihlali yapan kullanıcının ilgili checkpoint'e otomatik yönlendirilmesi.

### 📦 MODÜL 6: Yönetim & Onay Paneli (`AdminPanel.tsx`)
*   **Kaynak:** `allplanAkademi-main/src/components/AdminPanel.tsx` (85.8 KB)
*   **Hedef Konum:** `TeklifPro-repo/src/pages/AcademyAdminPage.tsx`
*   **Fonksiyonel Özellikler:**
    *   Eğitmenlerin öğrenci sınav denemelerini incelemesi ve sertifika onay/iptal işlemleri.
    *   Eksik modüllerin (`reviewRequiredModuleCount`) onaylanıp yayına alınması.
    *   Eğitim erişim hakkı (Entitlement) manuel tanımlama ekranı.

---

## 3. Veritabanı Şema Uyarlaması (Drizzle ORM / PostgreSQL)

`TeklifPro-repo/lib/schema.ts` dosyasına eklenecek yeni tablolar:

```typescript
// Sınav Denemeleri
export const academyExamAttempts = pgTable('academy_exam_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  programVersion: text('program_version').notNull(),
  score: integer('score').notNull(),
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sertifikalar
export const academyCertificates = pgTable('academy_certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  certificateNumber: text('certificate_number').unique().notNull(),
  status: text('status').notNull(), // 'active' | 'revoked'
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

// Laboratuvar Checkpoint İlerlemeleri
export const academyCheckpointProgress = pgTable('academy_checkpoint_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  checkpointId: text('checkpoint_id').notNull(),
  status: text('status').notNull(), // 'passed' | 'failed'
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});
```

---

## 4. Fazlı Uygulama Yol Haritası (Faz 1 - Faz 3)

### 🚀 FAZ 1: Sınav & Sertifikasyon Katmanı (Öncelik: YÜKSEK)
1.  `ExamInterface.tsx` ve `CertificatesViewer.tsx` bileşenlerinin uyarlanması.
2.  Drizzle veritabanı şemalarının açılması ve `/api/academy/allplan/certification/attempts` Express endpoint'lerinin bağlanması.
3.  Sertifika PDF indirme ve rozet mekanizmasının devreye alınması.

### 🚀 FAZ 2: Bilgi Bankası & Öğrenci Profili (Öncelik: ORTA)
1.  `KnowledgeBase.tsx` ve `BIMFAQViewer.tsx` bileşenlerinin aktarılarak arama motorunun çalıştırılması.
2.  `StudentProfileDashboard.tsx` ile Recharts yetkinlik radarının aktarılması.

### 🚀 FAZ 3: CAD Viewer, Checkpoint'ler & Admin Paneli (Öncelik: TAMAMLAYICI)
1.  `CADDiagramViewer.tsx` ile vektörel pafta inceleme aracının aktarılması.
2.  `InlineCheckpoint.tsx` ile ders tamamlama kilitlerinin aktif edilmesi.
3.  `AdminPanel.tsx` ile sertifika ve müfredat onay ekranının yayına alınması.
