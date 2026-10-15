export type EmailTemplateId =
  | 'verify_email'
  | 'reset_password'
  | 'invitation'
  | 'payment_order_created'
  | 'subscription_activated';

export interface EmailDetailRow {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}

export interface EmailTemplateDefinition {
  id: EmailTemplateId;
  subject: string;
  preheader: string;
  badgeText: string;
  badgeColor: { bg: string; text: string; border: string };
  heading: string;
  intro: string;
  secondaryText?: string;
  ctaLabel: string;
  ctaColor: string;
  expiryNotice: string;
  securityNotice: string;
  featureSteps?: Array<{ step: string; title: string; desc: string }>;
}

export interface EmailRenderContext {
  recipientName?: string;
  companyName?: string;
  subjectOverride?: string;
  introOverride?: string;
  detailRows?: EmailDetailRow[];
}

export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!,
  );

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplateDefinition> = {
  verify_email: {
    id: 'verify_email',
    subject: 'BIMMetraj — E-posta Adresinizi Doğrulayın ve Çalışma Alanınızı Başlatın',
    preheader: 'BIMMetraj çalışma alanınızı ve 5D BIM / e-PYS denetim araçlarınızı aktifleştirmek için e-posta adresinizi doğrulayın.',
    badgeText: 'HESAP DOĞRULAMA & AKTİVASYON',
    badgeColor: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
    heading: 'BIMMetraj’a Hoş Geldiniz',
    intro:
      '5D BIM metraj doğrulama, RG 33331 e-PYS ön kontrolü ve ÇŞB 2026 yaklaşık maliyet çalışma alanınız hazırlandı. Hesabınızı güvenle kullanmaya başlamak için lütfen aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın.',
    ctaLabel: 'E-posta Adresimi Doğrula',
    ctaColor: '#4f46e5',
    expiryNotice: 'Bu doğrulama bağlantısı güvenlik nedeniyle 24 saat boyunca geçerlidir.',
    securityNotice: 'Bu kaydı siz oluşturmadıysanız bu e-postayı güvenle yok sayabilirsiniz; hesabınız etkinleştirilmeyecektir.',
    featureSteps: [
      {
        step: '1',
        title: 'IFC veya PDF/A Projenizi Yükleyin',
        desc: 'ALLPLAN, Revit veya Archicad IFC modellerinizi ve 2B teslim paftalarınızı yükleyin.',
      },
      {
        step: '2',
        title: 'RG 33331 e-PYS & 3×3 Denetimi Çalıştırın',
        desc: 'EK-9 21 satırlık kalite kontrol formunu, TS 500 paspayı ve ÇŞB 2026 minha düşümlerini otomatik denetleyin.',
      },
      {
        step: '3',
        title: '5D Yaklaşık Maliyet & Teklif Üretin',
        desc: 'Doğrulanmış QTO miktarlarını ÇŞB 2026 pozlarıyla eşleştirerek kuruş hassasiyetinde teklife dönüştürün.',
      },
    ],
  },
  reset_password: {
    id: 'reset_password',
    subject: 'BIMMetraj — Şifre Yenileme Talebiniz',
    preheader: 'BIMMetraj hesabınız için şifre sıfırlama bağlantısı talep edildi.',
    badgeText: 'HESAP GÜVENLİĞİ',
    badgeColor: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    heading: 'Şifrenizi Güvenle Yenileyin',
    intro:
      'BIMMetraj hesabınız için bir şifre yenileme talebi aldık. Yeni şifrenizi belirlemek ve çalışma alanınıza erişmek için aşağıdaki güvenli bağlantıyı kullanabilirsiniz.',
    ctaLabel: 'Şifremi Güvenle Yenile',
    ctaColor: '#4f46e5',
    expiryNotice: 'Bu şifre sıfırlama bağlantısı tek kullanımlıktır ve 60 dakika sonunda kendiliğinden geçersiz olur.',
    securityNotice:
      'Bu talebi siz başlatmadıysanız mevcut şifreniz değiştirilmemiştir ve hesabınız güvendedir. Bu mesajı yok sayabilirsiniz.',
  },
  invitation: {
    id: 'invitation',
    subject: 'BIMMetraj — Ekip Çalışma Alanı Davetiniz',
    preheader: 'BIMMetraj üzerinde ortak 5D BIM ve yaklaşık maliyet çalışma alanına davet edildiniz.',
    badgeText: 'EKİP ÇALIŞMA ALANI DAVETİ',
    badgeColor: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    heading: 'Ekip Çalışma Alanına Davet Edildiniz',
    intro:
      'Projelerinizi, IFC/PDF e-PYS ön kontrollerini ve 5D metraj/teklif süreçlerini birlikte yönetmek üzere BIMMetraj kurumsal çalışma alanına davet edildiniz. Daveti kabul etmek için aşağıdaki bağlantıyı kullanın.',
    ctaLabel: 'Daveti Görüntüle ve Katıl',
    ctaColor: '#059669',
    expiryNotice: 'Bu ekip daveti bağlantısı 7 gün boyunca geçerlidir.',
    securityNotice: 'Daveti gönderen kurumu tanımıyorsanız bu mesajı dikkate almayınız.',
  },
  payment_order_created: {
    id: 'payment_order_created',
    subject: 'BIMMetraj — Sipariş ve Havale / EFT Ödeme Bilgileriniz',
    preheader: 'Seçtiğiniz abonelik paketi için Havale / EFT sipariş referans kodunuz ve banka hesap bilgilerimiz.',
    badgeText: 'SİPARİŞ & HAVALE / EFT BİLDİRİMİ',
    badgeColor: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    heading: 'Siparişiniz Oluşturuldu',
    intro:
      'Seçtiğiniz BIMMetraj abonelik paketi için Havale / EFT sipariş kaydınız oluşturuldu. Ödemenizi yaparken açıklama kısmına aşağıdaki Sipariş Referans Kodunu yazmanız ve ardından Faturalama ekranından dekont bildirimi göndermeniz yeterlidir.',
    ctaLabel: 'Faturalama & Dekont Ekranına Git',
    ctaColor: '#4f46e5',
    expiryNotice: 'Dekont bildiriminiz onaylandığında paket kotalarınız seçtiğiniz dönem boyunca anında aktif edilir.',
    securityNotice: 'Ödemenizi yalnızca BIMMetraj Faturalama sayfasında yer alan resmi kurumsal IBAN hesaplarımıza yapınız.',
  },
  subscription_activated: {
    id: 'subscription_activated',
    subject: 'BIMMetraj — Ödemeniz Onaylandı, Paketiniz Aktif Edildi',
    preheader: 'Havale / EFT ödemeniz onaylandı ve kurumsal paket kotalarınız çalışma alanınıza tanımlandı.',
    badgeText: 'PAKET AKTİVASYON ONAYI',
    badgeColor: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    heading: 'Paketiniz ve Kotalarınız Aktif Edildi',
    intro:
      'Havale / EFT ödemeniz finans ekibimiz tarafından doğrulandı ve seçtiğiniz abonelik paketi çalışma alanınıza tanımlandı. Tüm 5D BIM, SmartCheck e-PYS denetimi ve yaklaşık maliyet kotalarınızı hemen kullanabilirsiniz.',
    ctaLabel: 'Çalışma Alanına Git',
    ctaColor: '#059669',
    expiryNotice: 'Fatura ve abonelik süresi detaylarınızı dilediğiniz zaman Faturalama & Kotalar ekranından görüntüleyebilirsiniz.',
    securityNotice: 'BIMMetraj’ı tercih ettiğiniz için teşekkür ederiz.',
  },
};

export function renderTransactionalEmail(
  templateId: EmailTemplateId,
  actionUrl: string,
  context: EmailRenderContext = {},
): { subject: string; text: string; html: string } {
  const tpl = DEFAULT_EMAIL_TEMPLATES[templateId];
  const subject = context.subjectOverride || tpl.subject;
  const intro = context.introOverride || tpl.intro;
  const greeting = context.recipientName
    ? `Merhaba ${context.recipientName},`
    : context.companyName
      ? `Merhaba ${context.companyName} Ekibi,`
      : 'Merhaba,';

  const detailRows = context.detailRows ?? [];

  const textDetails =
    detailRows.length > 0
      ? '\n\n' + detailRows.map((r) => `• ${r.label}: ${r.value}`).join('\n')
      : '';

  const text = [
    subject,
    '',
    greeting,
    '',
    intro,
    textDetails,
    '',
    `${tpl.ctaLabel}: ${actionUrl}`,
    '',
    tpl.expiryNotice,
    tpl.securityNotice,
    '',
    '—',
    'BIMMetraj · 5D BIM Metraj, ÇŞB 2026 Yaklaşık Maliyet ve RG 33331 e-PYS Denetim Platformu',
    'https://bimmetraj.com | info@bimmetraj.com',
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');

  const safeSubject = escapeHtml(subject);
  const safePreheader = escapeHtml(tpl.preheader);
  const safeBadge = escapeHtml(tpl.badgeText);
  const safeHeading = escapeHtml(tpl.heading);
  const safeGreeting = escapeHtml(greeting);
  const safeIntro = escapeHtml(intro);
  const safeUrl = escapeHtml(actionUrl);
  const safeCtaLabel = escapeHtml(tpl.ctaLabel);
  const safeExpiry = escapeHtml(tpl.expiryNotice);
  const safeSecurity = escapeHtml(tpl.securityNotice);

  const detailTableHtml =
    detailRows.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e4e4e7;border-radius:10px;background-color:#fafafa;overflow:hidden;">
          <tbody>
            ${detailRows
              .map(
                (row, index) => `
              <tr>
                <td style="padding:10px 14px;font-size:12px;color:#71717a;border-bottom:${index === detailRows.length - 1 ? 'none' : '1px solid #e4e4e7'};width:42%;">${escapeHtml(row.label)}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:${row.highlight ? '700' : '600'};color:${row.highlight ? '#047857' : '#18181b'};font-family:${row.mono ? "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace" : 'inherit'};border-bottom:${index === detailRows.length - 1 ? 'none' : '1px solid #e4e4e7'};text-align:right;">${escapeHtml(row.value)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
      : '';

  const featureStepsHtml =
    tpl.featureSteps && tpl.featureSteps.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;border-top:1px solid #e4e4e7;padding-top:18px;">
          <tbody>
            <tr>
              <td style="padding-bottom:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;">
                Hızlı Başlangıç Adımları
              </td>
            </tr>
            ${tpl.featureSteps
              .map(
                (item) => `
              <tr>
                <td style="padding:8px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tbody>
                      <tr>
                        <td width="28" valign="top" style="padding-right:10px;">
                          <div style="width:22px;height:22px;line-height:22px;border-radius:6px;background-color:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;font-size:11px;font-weight:700;text-align:center;">
                            ${escapeHtml(item.step)}
                          </div>
                        </td>
                        <td valign="top">
                          <div style="font-size:13px;font-weight:700;color:#18181b;margin-bottom:2px;">${escapeHtml(item.title)}</div>
                          <div style="font-size:12px;line-height:1.5;color:#52525b;">${escapeHtml(item.desc)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tbody>
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <tbody>
              <!-- Dark Brand Header -->
              <tr>
                <td style="background-color:#09090b;padding:22px 28px;border-bottom:2px solid #4f46e5;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tbody>
                      <tr>
                        <td align="left" valign="middle">
                          <span style="display:inline-block;padding:4px 9px;border-radius:6px;background-color:#4f46e5;color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.04em;margin-right:8px;">BM</span>
                          <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">BIMMetraj</span>
                        </td>
                        <td align="right" valign="middle" style="font-size:11px;font-weight:600;color:#a1a1aa;letter-spacing:0.03em;">
                          5D BIM &amp; e-PYS Denetim Platformu
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:32px 28px 24px 28px;">
                  <div style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${tpl.badgeColor.bg};border:1px solid ${tpl.badgeColor.border};color:${tpl.badgeColor.text};font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:16px;">
                    ${safeBadge}
                  </div>
                  <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;font-weight:800;color:#09090b;letter-spacing:-0.02em;">
                    ${safeHeading}
                  </h1>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;font-weight:600;color:#27272a;">
                    ${safeGreeting}
                  </p>
                  <p style="margin:0 0 22px 0;font-size:14px;line-height:1.65;color:#3f3f46;">
                    ${safeIntro}
                  </p>

                  ${detailTableHtml}

                  <!-- Primary CTA Button -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
                    <tbody>
                      <tr>
                        <td align="left">
                          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;background-color:${tpl.ctaColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 2px 6px rgba(79,70,229,0.25);">
                            ${safeCtaLabel} &rarr;
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  ${featureStepsHtml}

                  <!-- Expiry & Security Notice Box -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                    <tbody>
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;font-weight:600;color:#334155;">
                            &#128337; ${safeExpiry}
                          </p>
                          <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
                            ${safeSecurity}
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Fallback Direct URL -->
                  <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #e4e4e7;">
                    <p style="margin:0 0 6px 0;font-size:11px;color:#71717a;">
                      Butona tıklayamıyorsanız aşağıdaki bağlantıyı kopyalayıp tarayıcınızın adres çubuğuna yapıştırın:
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.5;word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;color:#4f46e5;">
                      <a href="${safeUrl}" style="color:#4f46e5;text-decoration:underline;">${safeUrl}</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Corporate Footer -->
              <tr>
                <td style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:20px 28px;">
                  <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#27272a;">
                    BIMMetraj · 5D BIM Metraj, ÇŞB 2026 Yaklaşık Maliyet ve e-PYS Denetim Platformu
                  </p>
                  <p style="margin:0 0 8px 0;font-size:11px;line-height:1.5;color:#71717a;">
                    Web: <a href="https://bimmetraj.com" style="color:#4f46e5;text-decoration:none;">bimmetraj.com</a> &nbsp;|&nbsp;
                    Destek: <a href="mailto:info@bimmetraj.com" style="color:#4f46e5;text-decoration:none;">info@bimmetraj.com</a>
                  </p>
                  <p style="margin:0;font-size:10px;line-height:1.4;color:#a1a1aa;">
                    Bu e-posta, BIMMetraj hesabınızla ilgili zorunlu bir işlem bildirimi (transactional email) olarak gönderilmiştir.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
