import { Link } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";

// Theme tokens only, so both paper themes keep WCAG AA contrast.
const actionClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-primary bg-transparent px-4 text-xs font-bold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Tarayıcıda okunan IFC sonucunun üstünde durur. Tarayıcı ayrıştırıcısı eleman başına malzeme
 * katmanı taşımaz; icmal yapısal elemanları malzemeye göre sınıflandırdığı için bu görünümde
 * betonarme ve kâgir elemanlar açıkta kalır. Kesin sonuç sunucu (worker) analizidir.
 */
export function BrowserPreviewNotice() {
  return (
    <div role="note" className="rounded-2xl border-2 border-primary bg-card p-4 text-left">
      <div className="flex items-start gap-3">
        <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-bold text-foreground">
            Tarayıcı ön analizi — yetkili sonuç değildir
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            Bu görünüm dosyayı tarayıcınızda hızlıca okur. Tarayıcı ayrıştırıcısı elemanların malzeme katmanlarını okumaz;
            icmal betonarme ve kâgir kalemlerini malzemeye göre ayırdığı için bu elemanlar burada "malzeme tanımı yok"
            gerekçesiyle açıkta görünür. Kesin metraj, icmal ve teklife aktarım için dosyayı SmartCheck sunucu analizine yükleyin.
          </p>
          <Link to="/app/smartcheck" className={actionClass}>
            SmartCheck'e yükle
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
