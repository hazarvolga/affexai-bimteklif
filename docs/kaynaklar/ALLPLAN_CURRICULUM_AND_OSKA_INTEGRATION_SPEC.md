# ALLPLAN Master Müfredat & Sürüm Karşılaştırmalı Entegrasyon Şartnamesi (2026 - 2021)

> **Veri Kaynağı:** NotebookLM (`da730fbf-ac81-475b-9996-1c87f261d19f` - 312 Teknik Kaynak)  
> **Sürüm Kapsamı:** ALLPLAN 2026 & 2025 En Son Sürümler (Geriye Dönük 2021-2024 Uyum Notları)  
> **Durum:** Bağımsız Entegrasyon Veri Seti (TeklifPro-repo Dışında Depolanmaktadır)  
> **Veri Dosyası:** `kaynaklar/allplan_curriculum_enriched_v1.json`  
> **Görsel Varlıklar:** `kaynaklar/assets/allplan_academy/`

---

## 1. Genel Bakış ve Mimarinin Amacı

Bu şartname, `TeklifPro-repo` koda dokunulmadan, ALLPLAN eğitim müfredatını yazılımın en güncel sürümü olan **ALLPLAN 2026 ve ALLPLAN 2025** yeniliklerinden başlatarak, geçmiş sürümlerle (2021, 2022, 2023, 2024) olan sürüm farklarını ve geriye dönük uyumluluk kurallarını içerir.

Ayrıca dersler için gerekli tüm vektörel UI görselleri (`.svg` formatında) üretilmiş ve projenize ileride entegre edilecek şekilde yapılandırılmıştır.

---

## 2. Sürüm Karşılaştırması & Temel Sıçramalar

| Sürüm | Öne Çıkan Ana Yenilikler | Lisans & Altyapı Notları |
| :--- | :--- | :--- |
| **ALLPLAN 2026** | Dark Mode, AI Assistant (Connect), IDS .json Tam Desteği, ALLPLAN Model Viewer (`modelviewer.allplan.com`), Serbest Form Merdiven, Multilayer Slabs Interactive Preview, Plugin Manager. | 10Duke Bulut Lisanslama. LAN Workgroup desteği **Ekim 2027 (End of Life)** ile sona erecek, Allplan Share buluta aktarılmalıdır. |
| **ALLPLAN 2025** | AI Visualizer (Veras entegrasyonu), Asma Tavan sistemleri, Yeni Parametrik Kapı/Pencere objeleri, Bluebeam Studio entegrasyonu, Kazı/Şev modelleyicisi. | **10Duke Bulut Lisansı** kalıcı standart olmuştur. WIBU Softlock / CodeMeter dongle kullanımı sonlandırılmıştır. |
| **ALLPLAN 2024** | Bulut lisanslama geçişinin başlaması, Tcl script çalıştırma desteği, Lazer tarama arazi verilerinin köprü ayaklarına parametrik bağlanması. | Hotline araçlarına `cleanvisgui` sıfırlama aracı eklenmiştir. |
| **ALLPLAN 2023** | Nesne bağımlı hızlı hesaplama (speed optimization), LUSAS ve MIDAS analitik model aktarımları. | Büyük modellerde yenileme süreleri %60 kısaltılmıştır. |
| **ALLPLAN 2022** | Dinamik kesit tutamaçları (handles), NVIDIA OptiX AI Denoiser, Vulkan grafik altyapısı, PythonParts parametrik koruma. | Geliştirilmiş Windows Installer ve Proje Auto-Conversion desteği. |
| **ALLPLAN 2021** | AutoConverter (SCIA/FRILO analitik dönüştürücü), Bridge Smart Placements. | Metrajlarda Oska e-Hakediş CAD DLL kopyalama gereksinimi. |

---

## 3. Müfredat Ders Gövdeleri ve Görsel Varlık (Asset) Listesi

### Modül 1.1: ALLPLAN 2026/2025 Arayüzü, WPF Çerçevesi & Dark Mode
*   **En Son Sürüm (2026/2025):** Dark Mode (Koyu Tema) arayüzü, WPF altyapısı, Context Menu 2.0, Çift harfli kısayollar (`WA` - Wall, `CO` - Column), AI Assistant canlı rehberliği.
*   **Geriye Dönük Not (2021-2024):** Eski sürümlerde varsayılan Açık Tema ve tek harfli kısayollar kullanılır.
*   **Görsel Varlık:** `kaynaklar/assets/allplan_academy/allplan_2026_dark_mode_actionbar.svg`
*   **SmartCheck kuralı:** `allplan.interface.navigation`

### Modül 1.2: Proje Strüktürü, IFC 4.3 Uyumlu Hiyerarşi & 10Duke Lisanslama
*   **En Son Sürüm (2026/2025):** 10Duke e-posta tabanlı bulut lisansı (Donanım anahtarı gerektirmez), IFC 4.3 Yapı Strüktürü Sihirbazı, Bimplus Cloud Referencing (IFC XRef).
*   **Geriye Dönük Not (2021-2024):** LAN Workgroup Manager Ekim 2027'de tamamen kaldırılacaktır; Allplan Share bulut projesine geçilmelidir.
*   **Görsel Varlık:** `kaynaklar/assets/allplan_academy/allplan_2026_dark_mode_actionbar.svg`
*   **SmartCheck kuralı:** `allplan.project.structure`

### Modül 2.1: Çok Katmanlı Döşemeler (Multilayer Slabs) & Priority Yönetimi
*   **En Son Sürüm (2026/2025):** Multilayer Slabs etkileşimli katman yönü önizlemesi (Interactive Preview), Serbest Form Merdiven, Preoptima CONCEPT karbon hesabı.
*   **Geriye Dönük Not (2021-2024):** 2024 öncesi döşeme katmanları tekil çizilmek zorundaydı.
*   **Görsel Varlık:** `kaynaklar/assets/allplan_academy/allplan_wall_priority_and_multilayer_slabs.svg`
*   **SmartCheck kuralı:** `allplan.wall.priority` (Taşıyıcı beton duvar priority=500 olmalıdır).

### Modül 2.2: Bilgi Paleti (Information Palette), IDS Uyumluluğu & Model Viewer
*   **En Son Sürüm (2026/2025):** Yenilenmiş Bilgi Paleti (gruplama, otomatik toplam alma), Tam IDS (`.json`) kural dosyası doğrulaması, ALLPLAN Model Viewer (`modelviewer.allplan.com`).
*   **Geriye Dönük Not (2021-2024):** IDS desteği deneyseldi; 2026 ile tam standart hale gelmiştir.
*   **SmartCheck kuralı:** `allplan.information.ids`

### Modül 3.1: 3B Donatı Modelleme, Otomatik Donatı Güncelleme & Lejantlar
*   **En Son Sürüm (2026/2025):** Otomatik Donatı Güncelleme (Geometri değiştiğinde donatı anında adapte olur), TS500 paspayı denetimi.
*   **Görsel Varlık:** `kaynaklar/assets/allplan_academy/allplan_wall_priority_and_multilayer_slabs.svg`
*   **SmartCheck kuralı:** `allplan.reinforcement.cover` (Paspayı min 30mm-50mm).

### Modül 4.1: ALLPLAN Metraj ve OSKA e-Hakediş CAD Entegrasyonu
*   **En Son Sürüm (2026/2025):** Smart Catalog Editor, Excel ile çift yönlü senkronizasyon, OSKA e-Hakediş CAD metraj aktarımı.
*   **Görsel Varlık:** `kaynaklar/assets/allplan_academy/allplan_oska_ehakedis_cad_export_flow.svg`
*   **SmartCheck kuralı:** `allplan.takeoff.oska_export`

---

## 4. OSKA e-Hakediş CAD Entegrasyon Şeması

```
[OSKA e-Hakediş CAD Entegrasyonu Akış Şeması]

   1. KOPYALAMA:
      C:\Program Files\Nemetschek\Allplan_2013\Prg\@_Oska\64_Bit\iXMLDialog.dll
      ve OskaKatalog.dll ➔ ...\Allplan_2013\Prg\ (Ana Klasör) içine kopyalayın.

   2. SERVİSLER (Allmenu) AYARI:
      Servisler > DXF/DWG > "Genel katalog sistemini ilişkilendir - OSKA" 
      ➔ iXMLDialog.dll dosyasını seçin.

   3. SEÇENEKLER AYARI:
      Allplan > Araçlar > Seçenekler > Kataloglar > Katalog ataması = user_kat

   4. DIŞA AKTARIM (EXPORT):
      Dosya > Dosya Gönder > OSKA'ya Metraj Verilerini Gönder
      Tablo: Metraj Cetveli.rdlc
      Program: C:\e-Oska\OskaCad.exe
```

---

## 5. Projeye İçe Aktarma (Import Pipeline)

`TeklifPro-repo` tarafındaki geliştirmeleriniz tamamlandığında, hazırladığımız bu veri setini ve görselleri tek komutla aktarabilirsiniz:

```bash
node scripts/import-allplan-source.mjs --source=kaynaklar/allplan_curriculum_enriched_v1.json
```
