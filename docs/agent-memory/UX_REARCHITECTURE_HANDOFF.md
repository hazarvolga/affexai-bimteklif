# TeklifPro UX Rearchitecture & Product Handoff
*Tarih: 08.10.2026*

## 1. Ürün Vizyonu ve Hedef Kitle
- **Kullanıcı Profili:** Excel kullanmaya alışkın, BIM jargonuna (IFC, Pset, GUID vb.) uzak olan Türk müteahhitler ve metrajcılar.
- **Tetikleyici Güç:** Çevre ve Şehircilik Bakanlığı'nın yeni e-Proje (IFC 4x3) zorunluluğu. Kullanıcılar ürüne teknoloji tutkusuyla değil, mevzuat zorunluluğu ile geliyor.
- **Tasarım Felsefesi (Buzdağı Modeli):** Tasarım (UI) Apple/Linear gibi premium, modern ve ferah (SaaS kalitesinde) olacak. İş akışı (UX) Excel basitliğinde ve sihirbaz (wizard) mantığında ilerleyecek. Mevcut güçlü altyapı (SmartCheck, 3D Engine) silinmeyecek, ancak sadece "kullanıcının ihtiyacı olduğu anda" zarifçe (slide-over panel, tooltip vb. yollarla) gösterilecek. BIM Academy modülü şimdilik tamamen arka plana (beklemeye) alınacak, sadece çekirdek ürün (Teklif & Metraj) ön plana çıkarılacak.

## 2. Alınan UX/UI Kararları (Buzdağı Yaklaşımı)
1. **Sihirbaz (Wizard) Akışı:** "Dosya Yükle -> Otomatik Hata Kontrolü -> Fiyatlama -> Çıktı" şeklinde tek yönlü, kaybolması imkansız bir akış.
2. **Uçuş Öncesi Kontrol (SmartCheck Revizyonu):** Karmaşık kural ekranları kalkacak. Sistem arka planda dosyayı inceleyecek ve kullanıcıya sadece anlaşılır sonuçlar sunacak (Örn: "Dikkat: 3 Kolonda Bakanlık Pozu Eksik").
3. **Bağlamsal 3D İzleyici:** 3D model ekranı sürekli açık olup ekranı işgal etmeyecek. Yalnızca metraj listesindeki bir kalemin yanındaki "3D'de Gör" ikonuna basıldığında sağdan kayan bir panel (slide-over) olarak açılacak.
4. **Bakanlık Onayı Hissi (Yeşil Tikler):** Sistemin bakanlık formatını (TREpys) tam desteklediğini ve hatasız okuduğunu belirten güven verici yeşil uyarılar ve rozetler eklenecek.

## 3. Geliştirme Sıralaması (Priority List)
1. **Çekirdek Motor Güncellemesi (Backend):** `src/ifc/parser/tr-pset-csb-extractor.ts` dosyasının güncellenerek yeni mevzuatın zorunlu kıldığı `TREpys_PozOzellikSeti.CSBPozNo` ve `TREpys_ParselOzellikSeti` parametrelerinin de (eski `Tr_Pset_CSB` ile geriye dönük uyumlu olacak şekilde) tanınması.
2. **Yeni UX'in Gerçek Akışa Entegresi (Frontend):** Oluşturulan `DosyadanTeklifDemo` bileşeninin gerçek veri akışına bağlanması ve karmaşık olan `BimIfcParserPage` ile `SmartCheckImportWorkspace` sayfalarının yerini alması.
3. **Slide-over 3D Viewer & Hata Kartları:** Metraj ekranındaki bileşenlere 3D model bağlamının ve SmartCheck "uçuş öncesi kontrol" özet kartlarının eklenmesi.
