# Görev: IFC metraj tutarlılık kapısı ve kapsama kartı

Sen BIMMetraj (TeklifPro-repo) üzerinde çalışan bir yazılım mühendisisin. İşe başlamadan önce `CLAUDE.md`, `AGENTS.md`, `CODEX.md` ve `docs/agent-memory/WORKING_STATE.md` dosyalarını oku. Proje kurallarına harfiyen uy.

## Bağlam

- Başlangıç noktası: `main` @ `2a5c865` (Rev. 35). Yeni bir dal aç: `feat/ifc-consistency-gate`. **Main'e commit etme, push etme.**
- Fikir kaynağı: `harici-kaynaklar/raporlar-ve-notlar/Açık Kaynak Repolar ve BIMMetraj’a Katkı Analizi.md`. Bu doküman yalnız fikir kaynağıdır. İçindeki şu bilgiler **yanlıştır**, kullanma:
  - Minha eşikleri "0.10 m², 0.05 m³" değildir. Doğrusu: ÇŞB 0,50 m², DIN 18350 2,50 m² (`src/smartcheck/rules/minha.ts`). Minha eşiklerine dokunma.
  - Dokümandaki "%98,7", "10/10" gibi sayılar ve ÇŞB poz kodları doğrulanmamıştır.
  - "BIMMetraj ✅ Tam" ifadeleri yanlıştır; yetenekler L2 (pilot) seviyesindedir.
- Lisans: `bcirilor/ifcqt` reposunun **lisansı yoktur**; ondan kod kopyalanmaz, yalnız fikir kendi kodunla yazılır. `aec-platform/qto` MIT'tir ama yine de kod kopyalama, kendi uygulamanı yaz.

## Kodda doğrulanmış eksikler (yapılacak iş)

Her kontrol, bulduğu elemanları **ciddiyet + GlobalId + IFC sınıfı + kat** bilgisiyle raporlar. Hiçbir kontrol değeri sessizce düzeltmez, varsaymaz veya toplamdan düşürmez; ölçülemeyen eleman "ölçülemedi" olarak görünür.

1. **Mükerrer GlobalId** — `workers/ifc/ifc_extract.py:1508` GUID'i yalnız okuyor. Aynı GUID birden fazla elemanda varsa yüksek ciddiyetli bulgu.
2. **Host'suz boşluk** — `IfcRelVoidsElement` ile hiçbir elemana bağlı olmayan `IfcOpeningElement` (bugün `ifc_extract.py:1444` civarında açıklıklar yalnız atlanıyor). Yüksek ciddiyet: bu durumda duvardan minha düşülmez.
3. **Miktarı olmayan, sıfır veya negatif net miktarlı eleman** — Yüksek ciddiyet. Toplama girmez ama sayımda ve raporda görünür.
4. **Hiçbir kata (`IfcBuildingStorey`) bağlı olmayan eleman** — Orta ciddiyet. Mevcut `_find_parent_storey` (`ifc_extract.py:1124`) kullanılabilir.
5. **`IfcBuildingElementProxy` ve hiçbir poza eşleşmeyen elemanlar** — "açıkta kalan eleman" olarak raporlanır.
6. **Tip özellik mirası** — Bugün yalnız eleman üzerindeki `IfcRelDefinesByProperties` okunuyor (`ifc_extract.py:393`). IFC4 `IsTypedBy` ve IFC2x3 `IfcRelDefinesByType` üzerinden tipteki Pset'ler (örn. `Pset_WallCommon.IsExternal`) elemana aktarılsın. **Elemandaki değer tipteki değeri ezer.** Bu değişiklik mevcut metraj sonuçlarını değiştirebilir: önce/sonra farkını bir fixture ile göster ve raporla.
7. **Montaj çift sayımı** — `IfcStair`/`IfcStairFlight`, `IfcCurtainWall`/`IfcPlate`+`IfcMember`, `IfcElementAssembly` için önce bir fixture ile **hem montajın hem parçanın sayılıp sayılmadığını test et** (`_collect_decomposed_parts`, `ifc_extract.py:1018`). Çift sayım varsa parçaları bastır ve bastırılan parça sayısını raporla. Yoksa testi bırak ve "çift sayım yok" diye raporla; gereksiz kod ekleme.

## Arayüz: Metraj kapsama kartı

`src/components/smartcheck/CalmIfcWorkspace.tsx` icmal ekranına bir kart ekle:
- Toplam eleman, ölçülen eleman, poza eşleşen eleman oranı, açıkta kalan eleman sayısı, tutarlılık bulguları (ciddiyete göre).
- Açıkta kalan elemanlara ve bulgulara tıklanınca liste filtrelenir.
- Tüm sayılar gerçek veriden hesaplanır; örnek veya varsayılan sayı yazılmaz. Veri yoksa "değerlendirilmedi" yazılır.
- Renkler Pafta token'larıyla; durum yalnız renkle değil metinle de söylenir (WCAG 2.2 AA, kontrast ≥ 4,5:1). `bg-primary` ile `text-foreground` birlikte kullanılmaz; `text-primary-foreground` kullanılır.
- `CalmIfcWorkspace.tsx` zaten 1.600+ satır: kartı ayrı bir bileşen dosyasına yaz.

## Kapsam dışı

- Çok ülkeli sınıflandırma şeması (UniFormat, NRM, MasterFormat).
- İki IFC revizyonu arasında poz/TL farkı.
- Katman kalınlığına göre hacim bölme.
- Minha eşikleri, KİK, 4735, kat karşılığı motorları.

## Çalışma şekli

- **TDD:** Önce kırmızı test. Python: `workers/ifc/test_ifc_extract.py` + `workers/ifc/fixtures/` altına küçük, elle üretilmiş IFC fixture'ları (mükerrer GUID, host'suz boşluk, negatif hacim, katsız eleman, proxy, tip Pset'li duvar, merdiven+kol). TS: icmal ve kart için birim testleri.
- Yeni dosyalar 400 satırı geçmesin; fonksiyonlar 50 satırın altında; `any` ve `console.log` yok; immutable.
- **Yetenek Kaydı** (`src/capabilities/registry.ts`): yeni yetenek eklersen seviyesi en fazla **L2**, `registrationNo` olmadan L3 yok. Registry testleri geçmeli.
- Ürün metinlerinde kişi adı otorite olarak kullanılmaz. Marka yazımı: **BIMMetraj**.
- 3x3 bir şirket politikasıdır, normatif kural değildir: (a) metraj sapması ≤ %3, (b) paspayı mm cinsinden standart minimumun altında değil (TS 500: iç 20 / dış 25 / döşeme 15 mm; EC2 XC3 35 mm yalnız `activeStandard = EUROCODE_2` iken), (c) taşıyıcılar STR disiplininde. Paspayını asla yüzde olarak yazma.
- Proje alışkanlığına uygun olarak `calculation-review.ts` / `roadmap-content.ts` revizyonunu (Rev. 36) ve `docs/agent-memory/WORKING_STATE.md`'yi güncelle.
- Commit mesajları: conventional commits (`feat(ifc): …`, `test(ifc): …`).

## Bitti tanımı

Aşağıdakilerin hepsi yerelde geçmeli; çıktıları raporuna ekle:

```bash
npx tsc --noEmit
npx tsx --test "src/**/*.test.ts"
workers/ifc/.venv/bin/python -m pytest workers/ifc -q
npx vite build
node scripts/dependency-audit-policy.mjs
```

Ayrıca kart, bir fixture IFC yüklenerek tarayıcıda görülmeli (ekran görüntüsü).

## Teslim raporu (kontrol eden ajan bunu okuyacak)

İş bitince `docs/agent-memory/HANDOFF_2026-10-19_IFC_TUTARLILIK.md` dosyasına şunları yaz:
1. Dal adı ve commit listesi (`git log --oneline main..HEAD`).
2. 7 kontrolün her biri için: yapıldı / yapılmadı / gerek yok (neden), ilgili dosya:satır ve test adı.
3. Tip Pset mirasının mevcut metraj sonuçlarına etkisi (önce/sonra).
4. Montaj çift sayımı testinin sonucu.
5. Yukarıdaki doğrulama komutlarının çıktısı (özet + hata sayısı).
6. Bilinen sınırlar ve yapılmayanlar.

Bilmediğin bir şeyi varsayma; emin olmadığın noktayı raporda açıkça "doğrulanmadı" diye yaz.
