import React from "react";
import { Link } from "react-router-dom";
import { CalculatorShell } from "./CalculatorShell";

const CALCULATORS = [
  {
    to: "/hesaplayicilar/kik-asiri-dusuk-teklif",
    title: "Aşırı Düşük Teklif Sınır Değeri",
    text: "Kamu yapım ihalelerinde YM ve tekliflerden sınır değeri (KİK m.38, Tebliğ 45.1) adım adım hesaplayın.",
  },
  {
    to: "/hesaplayicilar/fiyat-farki-4735",
    title: "4735 Fiyat Farkı",
    text: "Hakediş tutarı, B katsayısı ve TÜİK alt endekslerinden F = A × B × (Pn − 1) hesaplayın.",
  },
  {
    to: "/hesaplayicilar/yambis-muteahhitlik-grubu",
    title: "Müteahhitlik Yetki Belgesi Grubu (YAMBİS)",
    text: "Bilanço rasyoları, ciro, iş deneyimi ve yapı sınır bedelini girerek A–H yetki belgesi grubu ön değerlendirmesini yapın.",
  },
  {
    to: "/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum",
    title: "Kat Karşılığı Paylaşım ve KDV",
    text: "Arsa sahibi / müteahhit paylaşım oranını, emsal bedel matrahını ve 150 m² kademeli konut / 6306 KDV etkisini hesaplayın.",
  },
];

export const CalculatorsIndexPage: React.FC = () => (
  <CalculatorShell
    title="Ücretsiz İnşaat Hesaplayıcıları | BIMMetraj"
    description="Müteahhitler, mali müşavirler ve teknik ofisler için ücretsiz, varsayılan değer içermeyen hesaplayıcılar: KİK aşırı düşük teklif sınır değeri, 4735 fiyat farkı, YAMBİS müteahhitlik yetki belgesi grubu ve kat karşılığı paylaşım / KDV."
    canonicalPath="/hesaplayicilar"
    heading="Ücretsiz Hesaplayıcılar"
    intro="Giriş gerektirmez. Girdiğiniz değerler tarayıcınızda hesaplanır. Hiçbir hesaplayıcı sizin yerinize varsayılan oran veya piyasa değeri koymaz; her sayı sizin girdinizdir."
    sources={[{ label: "Her hesaplayıcının dayandığı mevzuat kendi sayfasında listelenir." }]}
  >
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CALCULATORS.map((c) => (
        <li key={c.to}>
          <Link to={c.to} className="block h-full border border-border bg-background p-5 hover:border-primary">
            <h2 className="font-display-serif text-xl text-foreground">{c.title}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{c.text}</p>
          </Link>
        </li>
      ))}
    </ul>
  </CalculatorShell>
);

export default CalculatorsIndexPage;
