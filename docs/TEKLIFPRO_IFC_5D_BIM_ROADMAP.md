# 📐 TeklifPro & BIMPlan Academy · 5D BIM, IFC Metraj & Tarafsız Akademi Stratejisi

**Proje:** `TeklifPro-repo` (`/Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo`)  
**Tarih:** 30 Temmuz 2026  
**Konumlandırma:** **BIMPlan Academy - Bağımsız & Tarafsız 5D BIM Otoritesi (Brutal Honesty)**

---

## 📌 1. Yeni Marka ve Akademi Konumlandırması

TeklifPro ve BIMPlan Academy, tek bir yazılımın (Allplan veya Revit) bağımlısı veya satıcısı gibi hareket etmez. **Tüm BIM yazılımlarına (Allplan, Revit, Archicad vb.) eşit mesafede** kalarak mühendislik gerçeklerini **"Brutal" (Acımasız ve Dürüst) bir netlikle** ortaya koyar.

### ⚖️ Yazılımların "Brutal Truth" (Acımasız Gerçeklik) Analizi:

- **Autodesk Revit:** Mimari tasarım ve ekosistemde dünya lideri; ancak karmaşık donatı metrajlarında, parametrik demir açılımlarında ve çakışma hacimlerinde hantal ve sapmalı hesap yapabilir.
- **Nemetschek Allplan:** Betonarme donatı detaylandırma, kesin demir tonajı ve metraj cetvellerinde (%100 matematiksel hassasiyet) dünyada 1 numaradır; ancak kütüphane yaygınlığı ve mimari popülerlikte Revit kadar genel kitleye yaygın değildir.
- **Graphisoft Archicad:** Mimari hız ve sezgisel tasarımda harika; ancak statik mühendislik detaylandırmasında zayıftır.

---

## 🏛️ 2. TeklifPro'nun Çözüm Rolü: openBIM Köprüsü

TeklifPro, kullanıcının hangi yazılımı kullandığına bakmaksızın **openBIM IFC 4.0** standardı üzerinden ortak ve tarafsız bir metraj motoru sunar:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   BIMPLAN ACADEMY & TEKLİFPRO                          │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│    Revit Model       │    Allplan Model     │     Archicad Model       │
│   (BIM Tasarımı)     │ (Hassas Donatı/Statik)│  (Mimari Modelleme)      │
└──────────┬───────────┴──────────┬───────────┴────────────┬─────────────┘
           │                      │                        │
           └──────────────────┐   │   ┌────────────────────┘
                              ▼   ▼   ▼
                     ┌─────────────────────────┐
                     │   openBIM IFC Standardı │
                     └────────────┬────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │    TEKLİFPRO 5D MOTORU      │
                   │  %100 Tarafsız 5D Metraj    │
                   │  Eurocode 2 & SmartCheck    │
                   └─────────────────────────────┘
```

---

## 🎯 3. BIMPlan Academy Modülünün Rolü

1. **Tarafsız Mühendislik Eğitimleri:** Mühendislere *"Revit'ten IFC alırken metraj kayıpları nasıl önlenir?"*, *"Allplan ile donatı metrajı nasıl 0 sapmayla hesaplanır?"* gibi dürüst ve pratik rehberler sunulacak.
2. **Güven ve Otorite:** Kullanıcıya bir yazılımı zorla satmak yerine dürüst bilgi verileceği için mühendisler ve müteahhitler platforma **%100 güvenecektir**.
3. **SEO ve Organik Trafik:** Arama motorlarında *"Revit vs Allplan metraj farkları"* aratan her mühendis doğrudan BIMPlan Academy ve TeklifPro'ya gelecektir.

---

## 📋 4. Güncellenmiş Yol Haritası Adımları

- [x] `CreateQuote.tsx` arayüzüne `<Box /> 5D IFC Metraj Yükle` butonu eklendi.
- [x] `docs/TEKLIFPRO_IFC_5D_BIM_ROADMAP.md` tarafsız Akademi yaklaşımı ile güncellendi.
- [x] BIMPlan Academy modülüne "BIM Yazılımları Metraj Karşılaştırma & Brutal Truth" içeriği eklendi (`src/pages/Academy.tsx`).
- [x] TeklifPro IFC Parser bileşeni (`src/components/bimplan/BimIfcParser.tsx`) openBIM IFC 4.0 standartlarında tamamlandı.
