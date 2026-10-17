# Melih Dinekli'ye Sorulan ve Yanıt Bekleyen Sorular (17 Ekim 2026)

- **Durum:** Sorular 17 Ekim 2026'da Hazar tarafından Melih Bey'e iletildi. **Yanıtlar bekleniyor.**
- **Yanıt gelince:** Hazar yanıtları bildirecek; ilgili kod ve belgeler aşağıdaki "Etkilenen iş" sütununa göre güncellenir.
- **Üst kayıt:** `docs/audits/MELIH_DINEKLI_SAHA_GERIBILDIRIMI_2026-10-17.md`
- **Not:** Bu liste yanıt geldikçe `Yanıt` sütunu doldurularak güncellenir. Yanıtsız madde için kodda varsayılan değer uydurulmaz.

★ = öncelikli.

| # | Soru | Etkilenen iş | Yanıt |
|---|---|---|---|
| 1 ★ | Taşeron hakedişinde (sıva, şap, kaplama) ödenen alan odanın net zemin alanı mı, yoksa kapı/pencere boşlukları düşülmüş alan mı? Üçü için aynı mı? | M-1 `apartment-subcontractor-shield.ts` tavan formülü (şu an mahal net alanı) | _bekleniyor_ |
| 2 | Taşeronlar metrajı sahada nasıl şişiriyor (balkon, niş, küçük boşluk, köşe vb.)? | M-1 uyarı metinleri | _bekleniyor_ |
| 3 | Şap ve sıvada sahada kabul edilen fire oranı ve çimento dozajı (kg/m³)? | M-1 girdi önerileri (şu an varsayılan yok) | _bekleniyor_ |
| 4 ★ | Kayıttaki "TAKS 2 → 800 m²" ifadesinde 2 kat sayısı mı, KAKS 0,80 mi? | M-3 örnek/test değerleri, audit dokümanı düzeltmesi | _bekleniyor_ |
| 5 ★ | Arsa sahibi payı yalnız emsal alanı üzerinden mi, emsal harici dahil toplam inşaat alanı üzerinden mi hesaplanıyor? | M-3 `shareBase` varsayılan önerisi (şu an kullanıcı seçer) | _bekleniyor_ |
| 6 | Net/brüt oranını kim belirliyor? Brüt alana ortak alan payı dahil mi? | M-3 net/brüt girdisi açıklaması | _bekleniyor_ |
| 7 | Müteahhitlerin ön teklif Excel'inden 2–3 anonim örnek (özellikle çoklu parsel). | M-3 CSV/xlsx şablon sütunları | _bekleniyor_ |
| 8 | Komisyon, daire başı fazladan m² vaat eden müteahhitten hangi belgeleri istiyor? | M-3 "istenecek belgeler" listesi | _bekleniyor_ |
| 9 | Komisyonun 20 firmayı karşılaştırdığı tablonun isimsiz örneği. | M-3 karşılaştırma şablonu | _bekleniyor_ |
| 10 | Maliyetin kaba/ince/mekanik/elektrik/peyzaj yüzde dağılımı için kaynağı belli bir referans var mı? | M-3 maliyet dağılımı (şu an yalnız kullanıcı girdisi) | _bekleniyor_ |
| 11 ★ | Sahada hangi minha kuralı uygulanıyor (ÇŞB 0,50 / DIN 2,50 / özel)? Eşik her boşluğa ayrı mı, toplam alana mı uygulanıyor? | Minha motoru ve profil seçicisi (`minha.ts`, `CalmIfcWorkspace.tsx`) | _bekleniyor_ |
| 12 | Allplan otomatik minhayı hangi kurala göre yapıyor; söve/denizlik ekliyor mu? | Minha sonuç karşılaştırması | _bekleniyor_ |
| 13 ★ | "Revit'te %10–15 sapma" hangi projede, hangi kalemde, neyle neyi karşılaştırarak ölçüldü? | M-2 uyarı metinleri (şu an sabit yüzde iddiası yok) | _bekleniyor_ |
| 14 ★ | Aynı projenin Revit IFC'si + Allplan metrajı (3–5 proje) paylaşılabilir mi? | M-2 gerçek sapma ölçümü ve doğrulama referans kümesi | _bekleniyor_ |
| 15 | Allplan TÜRKSERT belgesi nerede kayıtlı (kurum, tarih, kapsam)? Vitrinde yazmak için Allplan izni gerekir. | M-2 vitrin/LandingPage metni (şu an eklenmedi) | _bekleniyor_ |
| 16 | Programı asıl kim kullanır, kim ödeme yapar? | Hedef kitle ve ürün öncelikleri | _bekleniyor_ |
| 17 | Yılda 100 ihaleye giren firma ile gerçek ön tekliflerde pilot yapılabilir mi? | M-3 kalibrasyon ve pilot | _bekleniyor_ |

## Yanıt gelmeden yapılan işler

- Sunucu (Python) yolunda kaynak yazılım tespiti.
- `.xlsx` doğrudan okuma.
- Modeldeki gerçek kapı/pencere ölçülerinden minha hesabı (kural seçimi Soru 11'e bağlı, pilot).
- `calm-icmal.ts` içindeki sabit brüt/boşluk çarpanlarının kaldırılması.
