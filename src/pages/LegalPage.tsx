import { Link, useLocation } from 'react-router-dom';
import { PublicMetadata } from '@/components/PublicMetadata';

export function LegalPage() {
  const privacy = useLocation().pathname === '/privacy';
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground">
      <PublicMetadata
        title={privacy ? 'KVKK Aydınlatma Metni ve Gizlilik Bildirimi | BIMMetraj' : 'Hizmet ve Kullanım Koşulları | BIMMetraj'}
        description={privacy
          ? '6698 sayılı KVKK uyarınca BIMMetraj kişisel veri işleme, IFC/PDF proje dosyalarında otomatik maskeleme ve veri güvenliği politikası.'
          : 'BIMMetraj mühendislik karar destek kapsamı, RG 33331 e-PYS ön-kontrol niteliği ve abonelik kullanım koşulları.'}
        canonicalPath={privacy ? '/privacy' : '/terms'}
      />
      <article className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400 hover:underline">
            ← BIMMetraj Ana Sayfa
          </Link>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className={!privacy ? 'font-bold text-foreground underline' : 'hover:text-white'}>Kullanım Koşulları</Link>
            <Link to="/privacy" className={privacy ? 'font-bold text-foreground underline' : 'hover:text-white'}>KVKK & Gizlilik Bildirimi</Link>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold text-foreground">
          {privacy ? 'KVKK Aydınlatma Metni ve Gizlilik Bildirimi' : 'BIMMetraj Hizmet ve Kullanım Koşulları'}
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Yürürlük ve Güncelleme Tarihi: 2026-10-14 · Sürüm: 2026.10-v2</p>

        {privacy ? (
          <div className="mt-8 space-y-6 text-sm leading-7 text-foreground dark:text-muted-foreground">
            <section>
              <h2 className="text-base font-bold text-foreground">1. Veri Sorumlusu ve İşleme Amacı (KVKK m.10)</h2>
              <p className="mt-2">
                6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca; hesap bilgileriniz (ad-soyad, kurumsal e-posta, telefon, unvan), şirket/vergi bilgileriniz, yüklediğiniz IFC/XLSX/CSV/PDF proje dosyalarına ait teknik işlem kayıtları ve güvenlik denetim izleri; BIMMetraj hizmetinin sunulması, abonelik/kota yönetimi ve bilgi güvenliği süreçlerinin yürütülmesi amacıyla sınırlı ve ölçülü olarak işlenir.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-foreground">2. Proje Dosyalarında Kişisel Veri Maskeleme</h2>
              <p className="mt-2">
                RG 33331 e-PYS ön-kontrol süreçlerinde IFC modelleri içerisinde yer alabilecek T.C. Kimlik Numarası, Vergi Kimlik Numarası, telefon numarası ve e-posta adresleri kalıcı rapor artefaktlarına yazılmadan önce otomatik olarak maskelenir (<code>[kimlik no gizlendi]</code>, <code>[telefon gizlendi]</code>, <code>[e-posta gizlendi]</code>).
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-foreground">3. Veri Saklama, Aktarım ve İlgili Kişi Hakları (KVKK m.11)</h2>
              <p className="mt-2">
                Verileriniz kiracı (tenant) bazlı erişim kontrolü uygulanmış sunucularda saklanır; yasal zorunluluklar ve altyapı hizmet sağlayıcıları dışında üçüncü taraflara satılmaz veya devredilmez. KVKK m.11 kapsamındaki başvuru ve silme taleplerinizi <a href="mailto:info@bimmetraj.com" className="text-orange-400 underline">info@bimmetraj.com</a> adresine iletebilirsiniz.
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-8 space-y-6 text-sm leading-7 text-foreground dark:text-muted-foreground">
            <section>
              <h2 className="text-base font-bold text-foreground">1. Mühendislik Sorumluluğu ve Ön-Kontrol Niteliği</h2>
              <p className="mt-2">
                BIMMetraj tarafından üretilen metraj (QTO) cetvelleri, fiyat eşleştirmeleri, 3x3 kural çıktıları, RG 33331 (5 Ağustos 2026) e-PYS EK-6/EK-9 raporları ve PDF/A ön kontrolleri <strong>teknik karar destek ve ön-kontrol</strong> niteliğindedir; resmî idare uygunluk kararı veya yetkili mühendis/mimar onayı yerine geçmez (Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik m.5). İhale, sözleşme ve ruhsat teslimi öncesinde tüm miktar ve fiyatların kontrolü proje müellifine ve teklif veren firmaya aittir.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-foreground">2. Fiyat Kataloğu ve Telif Hakları</h2>
              <p className="mt-2">
                Kullanıcılar sisteme kendi şirket kataloglarını, tedarikçi tekliflerini ve sözleşmesel birim fiyatlarını yükleyebilir. Yüksek Fen Kurulu (YFK) veya ilgili idarelerin telif/lisans kısıtlamalarına tabi resmî birim fiyat kitaplarının ticari kullanımı ilgili kurumun lisans koşullarına tabidir.
              </p>
            </section>
            <section>
              <h2 className="text-base font-bold text-foreground">3. Abonelik, Kota ve Hizmet Sürekliliği</h2>
              <p className="mt-2">
                Her abonelik paketi seçilen planın aylık teklif, IFC analizi, PDF/A ön-kontrol ve maksimum dosya boyutu kotalarına tabidir. Ücretsiz deneme süresi sonunda açık onayınız alınmadan otomatik ücret tahsilatı yapılmaz.
              </p>
            </section>
          </div>
        )}
      </article>
    </main>
  );
}
