export interface EmailTemplateData {
  trackingId?: string;
  stealthTrackingEnabled?: boolean;
  subject: string;
  body: string;
  heroImageEnabled: boolean;
  heroImageUrl: string;
  heroCaption: string;
  portfolioEnabled: boolean;
  portfolioImages: string[];
  icebreakerEnabled: boolean;
  icebreakerText: string;
  ctaText: string;
  ctaUrl: string;
  signatureEnabled: boolean;
  signatureName: string;
  signatureRole: string;
  signatureEmail: string;
  signatureAvatarUrl: string;
  psEnabled: boolean;
  psText: string;
  themeColor: string;
}

export function generateAtmosferiEmailHtml(data: EmailTemplateData): string {
  const parsedBody = parseBodyText(data.body);

  const finalHeroUrl = (data.stealthTrackingEnabled && data.trackingId && data.heroImageUrl) 
    ? `https://atmosferi.com/api/track?id=${data.trackingId}&url=${encodeURIComponent(data.heroImageUrl)}` 
    : data.heroImageUrl;

  const finalCtaUrl = (data.stealthTrackingEnabled && data.trackingId && data.ctaUrl) 
    ? `https://atmosferi.com/api/track?id=${data.trackingId}&url=${encodeURIComponent(data.ctaUrl)}` 
    : data.ctaUrl;

  const heroHtml = data.heroImageEnabled && data.heroImageUrl ? `
    <tr>
      <td align="center" style="padding: 0;">
        <img src="${finalHeroUrl}" alt="Hero" width="100%" style="display: block; width: 100%; height: auto;" />
      </td>
    </tr>
    <tr>
      <td style="background-color: #16140F; padding: 12px 24px; color: #A8A398; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;">
        ${data.heroCaption || "UKÁZKA NAŠÍ VIZUALIZACE &mdash; ATMOSFERI&deg;"}
      </td>
    </tr>
  ` : '';

  const portfolioHtml = data.portfolioEnabled && data.portfolioImages.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
      <tr>
        ${data.portfolioImages.map(url => `
          <td width="${Math.floor(100 / data.portfolioImages.length)}%" style="padding-right: 4px;">
            <img src="${url}" alt="Portfolio" width="100%" style="display: block; max-width: 100%; height: auto; border: 1px solid rgba(22,20,15,0.12);" />
          </td>
        `).join('')}
      </tr>
    </table>
  ` : '';

  const icebreakerHtml = data.icebreakerEnabled && data.icebreakerText ? `
    <p style="margin: 0 0 24px 0; font-family: 'Geist', system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #33302A;">
      ${data.icebreakerText}
    </p>
  ` : '';

  const ctaHtml = data.ctaText && data.ctaUrl ? `
    <div style="margin-bottom: 32px;">
      <a href="${finalCtaUrl}" style="display: inline-block; background-color: #16140F; color: #FBFAF6; padding: 12px 24px; text-decoration: none; font-size: 10.5px; font-weight: 600; font-family: 'Geist Mono', ui-monospace, monospace; letter-spacing: 0.16em; text-transform: uppercase;">
        ${data.ctaText} &rarr;
      </a>
    </div>
  ` : '';

  const signatureHtml = data.signatureEnabled ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid rgba(22,20,15,0.12); padding-top: 24px;">
      <tr>
        ${data.signatureAvatarUrl ? `
          <td width="48" valign="top" style="padding-right: 16px;">
            <img src="${data.signatureAvatarUrl}" alt="Avatar" width="40" height="40" style="display: block; border-radius: 50%;" />
          </td>
        ` : ''}
        <td style="font-family: 'Geist', system-ui, sans-serif; font-size: 11px; line-height: 1.5; color: #807C72;">
          <span style="display:block; margin-bottom: 2px;">S pozdravem</span>
          <strong style="color: #16140F; font-size: 13px;">${data.signatureName}</strong><br/>
          <span style="color: #A8A398;">Atmosferi&deg; &mdash; ${data.signatureRole}</span><br/>
          <span style="color: ${data.themeColor || '#D97757'};">${data.signatureEmail}</span> &middot; <span style="color: #A8A398;">atmosferi.com</span>
        </td>
      </tr>
    </table>
  ` : '';

  const psHtml = data.psEnabled && data.psText ? `
    <p style="margin: 24px 0 0 0; font-family: 'Geist', system-ui, sans-serif; font-size: 12px; line-height: 1.5; color: #807C72; font-style: italic;">
      P.S. ${data.psText}
    </p>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.subject}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #EFEDE6; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFEDE6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; max-width: 600px; background-color: #FBFAF6; overflow: hidden;">
          <tr>
            <td style="background-color: #16140F; padding: 16px 24px; color: #EFEDE6;">
              <span style="font-family: 'Geist', system-ui, sans-serif; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;">Atmosferi<sup style="color: #D97757; font-size: 0.6em;">&deg;</sup></span>
              <span style="font-family: 'Geist Mono', ui-monospace, monospace; font-size: 9px; letter-spacing: 0.18em; opacity: 0.6; margin-left: 14px; border-left: 1px solid rgba(244,242,236,0.3); padding-left: 14px;">WEB A VIZUALIZACE</span>
            </td>
          </tr>
          ${heroHtml}
          <tr>
            <td align="left" style="padding: 32px;">
              ${icebreakerHtml}
              <div style="font-family: 'Geist', system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #16140F;">
                ${parsedBody}
              </div>
              ${portfolioHtml}
              ${ctaHtml}
              ${signatureHtml}
              ${psHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function parseBodyText(text: string): string {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\b_(.*?)_\b/g, '<em>$1</em>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>');
  
  html = html.replace(/\{\{(.*?)\}\}/g, `<span style="background-color: #F4F2EC; padding: 2px 4px; border-radius: 4px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; color: #D97757;">{{$1}}</span>`);
  
  const paragraphs = html.split(/\n\s*\n/);
  return paragraphs.map(p => {
    const lines = p.split('\n');
    const isList = lines.some(l => l.trim().startsWith('- ') || l.trim().startsWith('  '));
    if (isList) {
      const listItems = lines.map(l => {
        if (l.trim().startsWith('- ') || l.trim().startsWith('  ')) {
          return `<li style="margin-bottom: 8px;">` + l.substring(2).trim() + `</li>`;
        }
        return l;
      }).join('');
      return `<ul style="margin: 0 0 16px 0; padding-left: 20px; font-family: 'Geist', system-ui, sans-serif;">` + listItems + `</ul>`;
    }
    return `<p style="margin: 0 0 16px 0; font-family: 'Geist', system-ui, sans-serif;">` + p.replace(/\n/g, '<br/>') + `</p>`;
  }).join('\n');
}