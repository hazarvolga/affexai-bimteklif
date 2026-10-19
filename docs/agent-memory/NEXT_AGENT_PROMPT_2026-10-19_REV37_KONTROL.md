# Görev: Rev. 37 bağımsız kontrolü (kod yazma, yalnız incele ve raporla)

Sen BIMMetraj (TeklifPro-repo) üzerinde **bağımsız kontrol** yapan bir mühendissin. Önce `CLAUDE.md`, `AGENTS.md`, `docs/agent-memory/WORKING_STATE.md` ve `docs/agent-memory/HANDOFF_2026-10-19_IFC_TUTARLILIK.md` §6–7'yi oku.

**Kod değiştirme, commit etme, push etme.** Bulduğun her sorunu kanıtıyla (dosya:satır, komut çıktısı, sayı) rapora yaz.

## İncelenecek iş

Rev. 37: `main` üzerindeki Rev. 37 commit'leri (`git log --oneline f32da23..main`, PR "Rev. 37"). Özet:
1. İcmal yapısal elemanları IFC malzemesine göre sınıflandırır (`src/ifc/structural-material.ts`, `src/ifc/calm-icmal.ts`).
2. `MISSING_MATERIAL` ve `CONCRETE_CLASS_DIFFERS` bulguları.
3. Açıkta kalan / kapsam dışı kayıtlar modelin miktarını "fiyatlandırılmadı" olarak taşır (`workers/ifc/ifc_extract.py` `_unpriced_model_quantity`, `src/ifc/uncovered-quantity.ts`, `src/components/smartcheck/IfcUncoveredItemsView.tsx`).
4. `/admin/roadmap` ve `/admin/roadmap/calculations` Rev. 37 metinleri.

## Kontrol listesi

1. **Doğruluk:** Sınıflandırıcı (`classifyStructuralMaterial`, `parseConcreteClass`) için uç durumlar düşün: büyük/küçük harf, "Betonarme", "C 30/37", "B30", "Prefab beton", "Gazbeton blok", "Tuğla", boş string katman, yalnız boşluktan oluşan katman. Yanlış pozitif/negatif var mı?
2. **Dürüstlük:** Hiçbir yerde poz, birim fiyat veya miktar uydurulmuş mu? Kapsam dışı miktarlar toplamlara karışıyor mu (çift sayım)?
3. **Etkiler:** HANDOFF §7'deki önce/sonra sayılarını kendin üret: üç örnek modeli (`harici-kaynaklar/klasorler-ve-ornekler/…`, yerelde varsa) `main~N` (Rev. 36) ve `main` icmaliyle karşılaştır. Sayılar tutuyor mu?
4. **Tablo içe aktarımı:** `parseSmartCheckRowToPseudoElement` satır açıklamasını malzeme metni olarak kullanıyor. Bu, gerçek SmartCheck Excel satırlarında beklenmedik açıkta kalan üretir mi? `src/smartcheck/sample-projects.ts` örnekleriyle dene.
5. **Arayüz:** Kart ve liste erişilebilirliği (rol, kontrast, yalnız renkle anlatım yok), 400 satır sınırı, `any` / `console.log` yok.
6. **Testler:** `node_modules/.bin/tsc --noEmit` (yerel `harici-kaynaklar/` hatalarını yok say), `node_modules/.bin/tsx --test "src/**/*.test.ts"` (izole PostgreSQL 16 ile; paylaşımlı yerel veritabanlarına dokunma), `workers/ifc/.venv/bin/python -m pytest workers/ifc -q`, `node_modules/.bin/vite build`. Eksik test senaryosu var mı?
7. **Yol haritası metinleri:** Rev. 37 metinleri koddaki davranışla birebir uyuşuyor mu? Abartı, yanlış sayı, kişi adı var mı?
8. **Bilinen sınırlar** (HANDOFF §7) gerçekten sınır mı, yoksa hata mı? Özellikle tarayıcı ön analizinin montaj parçalarını bastırmaması.

## Teslim

`docs/agent-memory/KONTROL_RAPORU_2026-10-19_REV37.md` dosyasına yaz:
- Karar: **Onay** / **Düzeltme gerekli**.
- Bulgular: önem (yüksek/orta/düşük), kanıt, önerilen düzeltme.
- Çalıştırdığın komutlar ve çıktı özetleri.
- Doğrulayamadığın noktalar açıkça "doğrulanmadı" diye.
