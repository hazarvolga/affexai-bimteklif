import { cn } from '@/lib/utils';

export function PaftaDrawing({
  compact = false,
  captionLeft = 'ÖRNEK GÖSTERİM',
  captionCenter = 'İZOMETRİK METRAJ / 01',
  captionRight = 'ÖLÇEKSİZ · IFC4',
  className,
}: {
  compact?: boolean;
  captionLeft?: string;
  captionCenter?: string;
  captionRight?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative border border-border bg-background text-foreground overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 660 520"
        role="img"
        aria-label="Teknik BIM Metraj ve Minha Kesit Diyagramı"
        className={cn('w-full h-auto block', compact ? 'max-h-[340px]' : '')}
      >
        {/* Köşe Kros (+) İşaretleri */}
        {[
          [24, 24],
          [636, 24],
          [24, 496],
          [636, 496],
        ].map(([x, y], index) => (
          <g key={index} stroke="currentColor" strokeWidth="1" opacity="0.55">
            <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
            <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
          </g>
        ))}

        {/* Kesikli Aks Çizgileri */}
        <g stroke="currentColor" strokeOpacity="0.22" strokeDasharray="4 4">
          <line x1="65" y1="380" x2="595" y2="145" />
          <line x1="115" y1="120" x2="560" y2="395" />
          <line x1="330" y1="45" x2="330" y2="475" />
          <line x1="205" y1="75" x2="205" y2="445" />
          <line x1="455" y1="75" x2="455" y2="445" />
        </g>

        {/* İzometrik Kat Plakaları ve Hacim Yüzeyleri */}
        <g
          fill="var(--paper)"
          fillOpacity="0.86"
          stroke="currentColor"
          strokeWidth="1.35"
        >
          {/* Temel / Bodrum Plakası */}
          <polygon points="330,115 510,205 330,295 150,205" />
          {/* Sol Cephe Duvarı */}
          <polygon points="150,205 330,295 330,415 150,325" />
          {/* Sağ Cephe Duvarı */}
          <polygon points="510,205 330,295 330,415 510,325" />
          {/* Kat Döşeme Dilimleri */}
          <line x1="150" y1="245" x2="330" y2="335" />
          <line x1="510" y1="245" x2="330" y2="335" />
          <line x1="150" y1="285" x2="330" y2="375" />
          <line x1="510" y1="285" x2="330" y2="375" />
          {/* Düşey Kolon / Aks Bölmeleri */}
          <line x1="210" y1="235" x2="210" y2="355" />
          <line x1="270" y1="265" x2="270" y2="385" />
          <line x1="390" y1="265" x2="390" y2="385" />
          <line x1="450" y1="235" x2="450" y2="355" />
        </g>

        {/* Teknik Kiremit Vurgu — Çekirdek Hacim, Minha Boşluğu ve Ölçü Okları */}
        <g
          stroke="var(--accent-brand)"
          strokeWidth="1.65"
          fill="none"
        >
          <polygon points="330,155 445,212 330,270 215,212" />
          <line x1="330" y1="75" x2="330" y2="415" strokeDasharray="3 3" />
          {/* Minha / Pencere Boşluğu Vurgusu */}
          <polygon
            points="355,305 425,270 425,310 355,345"
            fill="var(--accent-wash)"
          />
          <circle cx="330" cy="295" r="4.5" fill="var(--accent-brand)" />
          <circle cx="150" cy="205" r="3.5" fill="var(--accent-brand)" />
          <circle cx="510" cy="205" r="3.5" fill="var(--accent-brand)" />
          <line x1="115" y1="435" x2="545" y2="435" />
          <line x1="115" y1="429" x2="115" y2="441" />
          <line x1="545" y1="429" x2="545" y2="441" />
        </g>

        {/* Monospace Pafta Etiketleri */}
        <g
          fill="currentColor"
          style={{
            fontFamily: 'var(--font-mono-tech), monospace',
            fontSize: '10px',
            letterSpacing: '0.08em',
          }}
        >
          <text x="58" y="64">AKS A–D / KAT 01–04</text>
          <text x="525" y="102">+12.40m</text>
          <text x="525" y="328">±0.00</text>
          <text x="242" y="458">NET ALAN = BRÜT − MİNHA (IFC QTO)</text>
          <text x="64" y="295" fill="var(--accent-brand)">
            POZ &amp; MİNHA
          </text>
        </g>
      </svg>
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{captionLeft}</span>
        <span>{captionCenter}</span>
        <span>{captionRight}</span>
      </div>
    </div>
  );
}
