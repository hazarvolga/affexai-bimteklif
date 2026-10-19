# Düzeltme görevi: IFC tutarlılık kapısı (feat/ifc-consistency-gate @ afb92f0)

Önceki görev: `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-19_IFC_TUTARLILIK.md`. Teslim edilen iş incelendi ve **merge edilemez** bulundu. Aynı dalda (`feat/ifc-consistency-gate`) devam et; main'e commit etme, push etme. `CLAUDE.md`, `AGENTS.md` kurallarına uy.

Çalışma ağacında senin işine ait olmayan, commit edilmemiş bir dosya taşıması var (kökten `harici-kaynaklar/`'a taşınan 86 dosya, `.gitignore`, `.dockerignore`, `tsconfig.json`, `scripts/*parity*`, `src/ifc/fixtures/e-proje_4x3.manifest.json`, `graphify-out/`). **Bunlara dokunma ve commit'ine katma**; yalnız kendi dosyalarını `git add <dosya>` ile ekle.

## Düzeltilecekler (öncelik sırasıyla)

1. **tsc kırık (CI kırmızı olur):** `src/components/smartcheck/CalmIfcWorkspace.tsx:614` `IfcCoverageCard`'a `elements` prop'u geçiyor ama `IfcCoverageCardProps`'ta yok. Ya prop'u kaldır ya da kartta "açıkta kalan / bulgulu elemana tıklayınca icmal listesini filtrele" davranışını gerçekten bağla (prompt bunu istiyordu). `node_modules/.bin/tsc --noEmit` 0 hata vermeli.

2. **Uydurma poz tablosu kaldırılacak:** `workers/ifc/ifc_extract.py` içindeki `_resolve_matched_poz_code` yeni ve doğrulanmamış bir ÇŞB poz tablosu getiriyor (15.150.1005, 15.320.1002, 15.390.1003, 15.340.1005, 15.270.1006, 15.375.1102, 15.160.1003). Bu tablo `src/ifc/calm-icmal.ts`'teki mevcut eşleştirmeyle uyuşmuyor ve her ölçülen kiriş/kolon/döşeme/**duvarı** (tuğla ve gazbeton dahil) beton pozu 15.150.1005'e atıyor. Aynı varsayılan `src/ifc/parser/legacy-parser.ts:264`'te de var.
   - Python ve legacy parser **poz eşleştirmesi yapmaz**. Yalnız modeldeki açık `PozNo` etiketini taşır.
   - "Poza eşleşme" oranı, icmal motorunun (`calm-icmal.ts`) gerçekten bir icmal grubuna/poza yerleştirdiği elemanlardan hesaplanır (tek kaynak). Hiçbir yerde varsayılan poz kodu yazılmaz.
   - Proxy ve icmalin yerleştiremediği elemanlar "açıkta kalan" olarak raporlanır.

3. **İstenmeyen kapsam genişlemesi geri alınacak:** `primary_types` listesine `IfcStair`, `IfcStairFlight`, `IfcCurtainWall`, `IfcBuildingElementProxy` eklenmiş. Örnek modellerde bu, metraj toplamlarını değiştiriyor:
   - `01_BIMcollab_Example_ARC.ifc`: hacim 1.166,3 → 1.181,2 m³, kalıp 6.220 → 6.813 m². Giydirme cepheye **565,5 m² kalıp** ve beton pozu atanıyor (alüminyum/cam elemana kalıp olmaz).
   - `2026_45_…duzenlenmis.ifc`: alüminyum giydirme cephe (`MM_GDC_ALU`) beton pozu ve 4,63 m² kalıp alıyor.
   - Bu sınıfları **metraj toplamlarına ekleme**. Yalnız tutarlılık raporunda "metraja alınmayan eleman" olarak sayılabilirler. Merdiven/giydirme cephe metrajı ayrı, mühendis doğrulamalı bir iş olarak kalır.
   - Kabul: üç örnek modelde (aşağıda) `volumeM3`, `areaM2`, `formworkM2` toplamları ve eleman GUID kümesi `main` ile **birebir aynı** kalmalı; yalnız rapor alanları eklenmeli.

4. **Montaj bastırma daraltılacak:** `_find_parent_assembly_in_set` her `IfcRelAggregates` ebeveynini montaj sayıyor; toplama (rollup) yalnız hacmi topluyor, alan/kalıp kayboluyor. ARC modelinde 674 parça "bastırıldı" görünüyor.
   - Bastırma yalnız ebeveynin **kendi pozitif miktarı** varsa ve ebeveyn metraja giren bir sınıfsa yapılır; bastırılan her parça raporda listelenir.
   - Ebeveynin miktarı yoksa parçalar kendi satırlarında kalır (rollup yok).

5. **Teslim raporunu düzelt:** `HANDOFF_2026-10-19_IFC_TUTARLILIK.md` şu noktalarda gerçeği yansıtmıyor:
   - "tsc 0 hata" (yanlıştı).
   - "mükerrer GUID'de ilk örnek korunur, diğeri elenir" (Python ikisini de tutup raporluyor; doğru davranış budur, raporu düzelt).
   - Kart 368 satır değil 419 satır; 400'ün altına indir (alt bileşenlere böl).
   - Testler kısmi çalıştırıldı; tam paket izole PostgreSQL ile çalıştırılmadıysa bunu açıkça yaz.

## Doğrulama (çıktıları rapora ekle)

```bash
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsx --test src/ifc/*.test.ts src/capabilities/registry.test.ts src/pages/admin/roadmap/content.test.ts
workers/ifc/.venv/bin/python -m pytest workers/ifc -q
node_modules/.bin/vite build
```

Önce/sonra karşılaştırması: aşağıdaki üç modeli `main`'deki ve daldaki `extract_ifc` ile çalıştır; eleman sayısı, GUID kümesi ve `volumeM3` / `areaM2` / `formworkM2` toplamlarını tablo halinde rapora yaz.
- `harici-kaynaklar/klasorler-ve-ornekler/2026_45_MM_XXXX_MD_MMC_NNN_01_duzenlenmis.ifc`
- `harici-kaynaklar/klasorler-ve-ornekler/IfcSampleFiles-main/01_BIMcollab_Example_ARC.ifc`
- `harici-kaynaklar/klasorler-ve-ornekler/IfcSampleFiles-main/02_BIMcollab_Example_STR_optimized.ifc`

Bu testler için yeni bir regresyon testi ekle: ARC modelinde (veya küçük bir fixture'da) giydirme cephe ve merdivenin metraj toplamlarına girmediğini ve kalıp almadığını doğrulasın.
