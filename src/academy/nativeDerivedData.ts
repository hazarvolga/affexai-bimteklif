/** Native presentation models derived from source interaction handlers. */
export const loaData = {
  '10': { title: 'LOA 10: Kavramsal Boyutlandırma', desc: "Mevcut duvarın eğikliği (plumbness) veya yüzey deformasyonları dikkate alınmaz. Nokta bulutuna 'en uygun' düz çizgi (Best-fit line) çizilerek kavramsal bir kütle elde edilir.", tolerance: '±50mm', use: 'Erken karar, kavramsal kütle ve yaklaşık hacim okuması.' },
  '30': { title: 'LOA 30: Hassas Koordinasyon', desc: 'Standart as-built modellemesi. Lazer tarama verisine daha yakın bir modelleme yapılır. Genel MEP ve mimari koordinasyon için yeterlidir.', tolerance: '±15mm', use: 'Genel mimari/MEP koordinasyonu ve saha kontrolü.' },
  '50': { title: 'LOA 50: Dijital İkiz (Tarihi Eser)', desc: 'Milimetrik doğruluk. Duvarın yapısal deformasyonları, eğikliği (skew) ve dokusu birebir modellenir. Rölöve ve restorasyon projeleri (HBIM) için zorunludur.', tolerance: '±1mm', use: 'HBIM, rölöve, restorasyon ve yüksek doğruluk gerektiren dijital ikiz.' },
} as const;

export const arcRuleData = {
  fire: ['IFC Dosyası Yükleniyor... (IFC4.3)', 'Geometrik Veri Ayrıştırılıyor (Parsing IfcModel)...', 'YÖNETMELİK: Binaların Yangından Korunması Hk. Yön. (Madde X)', 'KURAL: Kaçış güzergahındaki tüm IfcDoor elemanlarının ClearWidth parametresi >= 900mm olmalıdır.', 'SORGULANIYOR: SELECT ClearWidth FROM IfcDoor WHERE IsFireExit = TRUE', 'SONUÇ BULUNDU: Zemin_Kat_D04 (ClearWidth = 800mm)', '❌ HATA (CRITICAL): Kapı genişliği yetersiz. Ruhsat reddedildi.'],
  zone: ['IFC Dosyası Yükleniyor... (IFC4.3)', 'Geometrik Veri Ayrıştırılıyor (Parsing IfcModel)...', 'YÖNETMELİK: Planlı Alanlar İmar Yönetmeliği (Türkiye)', 'VERİ BİRLEŞTİRME: GeoBIM İşlemi Başlatıldı...', 'BAĞLANTI: BIM (IFC Modeli) <--> GIS (Belediye Parsel Veritabanı)', 'KURAL 1: Emsal Alanı (TAKS/KAKS) <= İmar Çapı limiti.', 'KURAL 2: Ön Bahçe Çekme Mesafesi >= 5.00 metre.', 'SORGULANIYOR: IfcBuilding geometrisi ile GIS_Parcel sınırlarının topolojik kesişimi (Intersection)...', '✅ BAŞARILI: Topolojik kural ihlali bulunamadı. Dijital e-Ruhsat onaylandı.'],
} as const;

export const careerMatrixData = {
  labels: ['Yazılım Becerisi', 'Saha Tecrübesi', 'Koordinasyon', 'Sözleşme/Hukuk', 'Liderlik'],
  datasets: [
    { label: 'BIM Modeler', data: [90, 20, 30, 10, 10], color: '#94A3B8' },
    { label: 'BIM Coordinator', data: [70, 60, 90, 40, 50], color: '#6366F1' },
    { label: 'BIM/Info Manager', data: [40, 80, 80, 95, 95], color: '#F59E0B' },
  ],
} as const;
