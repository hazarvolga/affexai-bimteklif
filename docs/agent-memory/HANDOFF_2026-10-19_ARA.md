# Handoff: Çalışmaya Ara (2026-10-19)

- **Hesaplama doğrulama sürümü:** `BIM-CALC-2026-10-19.33` (Rev. 39)
- **Üretim:** Coolify, `https://bimmetraj.com`. Merge canlıya almaz; Coolify'da **Deploy** basılır, `/api/health` içindeki `revision` ile doğrulanır.

## 1. Bu oturumda yayına alınanlar

| Rev. | PR | İçerik |
|---|---|---|
| 36 | #3 (`d52dfc8`) | IFC tutarlılık kapısı ve kapsama kartı; `fetchWithAuth` yanıt gövdesini her zaman tüketir |
| 37 | #5 (`f00c8af`) | İcmal yapısal elemanları IFC malzemesine göre sınıflandırır; açıkta kalan miktarlar "fiyatlandırılmadı" |
| — | #6 (`b0ec3d4`) | Tescilli lisans (`LICENSE`, `UNLICENSED`, kaynak başlıkları); `workers/ifc/vendor/ifc_ruhsat` kendi MIT lisansını korur |
| 38 | #7 (`420008e`) | Tüm uygulamayı gezen Hızlı Tur (14 adım) ve süper admin Yönetici Turu (10 adım) |
| 39 | #8, #9, #10 | Tur bulunulan sayfadan başlar; açık mod kontrastı; Panel Evre kartlarında doğrulanmamış değerler kaldırıldı; bu belge ve roadmap güncellemesi |

Rev. 39'un canlı revizyonu deploy sonrası `WORKING_STATE.md` ve bu belgeye işlenmelidir.

## 2. Rev. 39 ayrıntısı

1. **Sayfaya duyarlı tur:** `src/components/tour/tour-navigation.ts` → `startIndexForPath(pathname, steps)`: birebir rota, yoksa en uzun kapsayan rota (`/app/quotes/:id` → Teklifler), yoksa 01. `GuidedTour` başlangıç adımı belirlenmeden sayfa geçişi yapmaz (önceden tur önce `/app`'e gidip geri dönüyordu). Test: `tour-steps.test.ts` (7/7).
2. **Açık mod kontrastı:** `src/index.css` açık mod katmanı artık `[class^="text-amber-3"], [class*=" text-amber-3"]` biçiminde eşler; böylece `text-amber-300/90` gibi saydamlık ekli sınıflar da koyu pafta mürekkebine döner. Önek taşıyan `hover:`, `dark:` varyantları ve koyu mod etkilenmez (tarayıcıda hesaplanan renklerle doğrulandı). `TenantsList.tsx` kota çubuğu zemini `bg-border`.
3. **Panel kart metinleri:** `src/components/dashboard/ContractorWorkflowHub.tsx` kartları dozaj, fire, kalınlık ve toleransın kullanıcı girdisi olduğunu, sonuçların ön hesap olduğunu söyler; `ContractorWorkflowHub.test.ts` kaldırılan ifadeleri (`325 kg`, `%10 fire`, `%1 KDV`, `2 cm sıva`) engeller.

## 3. Depo erişimi (private'a geçiş)

Depo şu an public. Private yapıldıktan sonra **bir sonraki deploy'dan önce** Coolify'ın depoyu okuyabilmesi gerekir, yoksa klonlama "could not read Username" hatasıyla düşer:

- **Önerilen:** Coolify → Sources → GitHub App; uygulamayı `hazarvolga/affexai-bimteklif` deposuna yetkilendirip uygulamanın kaynağı olarak seçin.
- **Alternatif:** Coolify'da SSH anahtarı üretin, açık anahtarı GitHub → Settings → Deploy keys'e **salt okunur** ekleyin, Git adresini `git@github.com:hazarvolga/affexai-bimteklif.git` yapın.
- Private depoda GitHub Actions daha önce `startup_failure` verdi; Actions'ın açık olduğunu ve dakika kotasını kontrol edin. CI çalışmazsa `scripts/require-green-ci.sh` deploy kapısı da geçmez.

## 4. Açık kalanlar

- **Yayına gönderilmemiş dallar:** `fix/ifc-browser-quota-alert` (`b9153eb`, IFC sayfasında 403 kota uyarısı; yerel), `docs/production-readiness-2026-10-18` (yerel).
- **Rev. 37 bağımsız kontrolü:** `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-19_REV37_KONTROL.md` hazır, henüz çalıştırılmadı.
- **Bilinçli ertelenenler:** İngilizce katman sözlüğü; adsız / tekrarlı ad kuralları; çok ülkeli sınıflandırma; merdiven, giydirme cephe, astar ve macun için yeni poz kalemleri.
- **Bilinen sınırlar:** Tarayıcı ön analizi (legacy-parser) montaj parçalarını Python yolu gibi bastırmaz. Deploy sırasında konteyner geçişinde ~30–45 sn 503 görülür.
- **Yerelde kalan, commit edilmeyen:** `graphify-out/` değişiklikleri, `docs/agent-memory/gelecekteki-global-konumlandırma.md`, `harici-kaynaklar/`, `docs/anket/`, `docs/sunum/` (`.git/info/exclude`).

## 5. Değişmeyen kurallar

- Testlerde yalnız izole Docker PostgreSQL; paylaşılan veritabanlarına dokunulmaz. Yerel tam test setinde 46 test veritabanı olmadan `ECONNREFUSED` ile düşer; bu beklenen durumdur.
- 3x3 şirket ilkesidir: metraj sapması ≤ %3; paspayı mm (TS 500 iç 20 / dış 25 / döşeme 15 mm; EC2 XC3 35 mm yalnız `EUROCODE_2`); taşıyıcı elemanlar STR disiplininde.
- Mühendislik ve maliyet sayıları `yuksek-muhendis-mimar` ile doğrulanır; poz kodu veya fiyat uydurulmaz. Ürün metinleri yalnız doğrulanmış davranışı anlatır.
- Marka yazımı **BIMMetraj**. Dev Demo girişi yalnız `import.meta.env.DEV`.
