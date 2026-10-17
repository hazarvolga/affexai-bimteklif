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
];

export const CalculatorsIndexPage: React.FC = () => (
  <CalculatorShell
    title="Ücretsiz İnşaat Hesaplayıcıları | BIMMetraj"
    description="Müteahhitler ve teknik ofisler için ücretsiz, varsayılan değer içermeyen hesaplayıcılar: aşırı düşük teklif sınır değeri (KİK) ve 4735 fiyat farkı."
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
