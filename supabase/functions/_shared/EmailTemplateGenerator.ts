export interface EmailTemplateData {
  subject: string;
  body: string;
  heroImageEnabled: boolean;
  heroImageUrl: string;
  portfolioEnabled: boolean;
  portfolioImages: string[];
  icebreakerEnabled: boolean;
  icebreakerText: string;
  signatureEnabled: boolean;
  signatureGreeting: string;
  signatureName: string;
  signatureRole: string;
  signatureEmail: string;
  psEnabled: boolean;
  psText: string;
  themeColor: string; // e.g. #D97757
  heroCaption?: string;
  servicesWidgetEnabled?: boolean;
  servicesWidgetTitle?: string;
  service1Title?: string;
  service2Title?: string;
  service3Title?: string;
  ctaButtonEnabled?: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

export function generateAtmosferiEmailHtml(data: EmailTemplateData): string {
  // Convert markdown-like syntax to HTML for body
  const parsedBody = parseBodyText(data.body);

  const topBannerHtml = `
    <div style="background-color: #16140F; padding: 16px 24px; color: #EFEDE6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle; width: 100px;">
            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;">Atmosferi<sup style="color: #D97757; font-size: 0.6em;">&deg;</sup></span>
          </td>
          <td style="vertical-align: middle; border-left: 1px solid rgba(244,242,236,0.3); padding-left: 14px;">
            <span style="font-family: monospace; font-size: 9px; letter-spacing: 0.18em; opacity: 0.6; text-transform: uppercase;">WEB A VIZUALIZACE</span>
          </td>
        </tr>
      </table>
    </div>
  `;

  const heroHtml = data.heroImageEnabled && data.heroImageUrl ? `
    <div>
      <img src="${data.heroImageUrl}" alt="Hero" width="100%" style="display: block; max-width: 100%; height: auto;" />
      <div style="background-color: #16140F; padding: 12px 24px; color: #A8A398; font-family: monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;">
        ${data.heroCaption || "UKÁZKA NAŠÍ VIZUALIZACE — ATMOSFERI°"}
      </div>
    </div>
  ` : '';

  const portfolioHtml = data.portfolioEnabled && data.portfolioImages.length > 0 ? `
    <div style="margin: 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${data.portfolioImages.slice(0, 3).map(url => `
            <td width="${Math.floor(100 / Math.min(3, data.portfolioImages.length))}%" style="padding: 0 4px;">
              <img src="${url}" alt="Gallery" width="100%" style="display: block; max-width: 100%; height: auto; border: 1px solid #EAEAEA;" />
            </td>
          `).join('')}
        </tr>
      </table>
    </div>
  ` : '';

  const icebreakerHtml = data.icebreakerEnabled && data.icebreakerText ? `
    <p style="margin: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #16140F;">
      <em>${data.icebreakerText}</em>
    </p>
  ` : '';

  const signatureHtml = data.signatureEnabled ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 40px; border-top: 1px solid #EAEAEA; padding-top: 20px;">
      <tr>
        <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #807C72;">
          <span style="display:block; margin-bottom: 2px;">${data.signatureGreeting}</span>
          <strong style="color: #16140F;">${data.signatureName}</strong><br/>
          Atmosferi&deg; &mdash; ${data.signatureRole}<br/>
          <a href="mailto:${data.signatureEmail}" style="color: ${data.themeColor}; text-decoration: none;">${data.signatureEmail}</a> &middot; <a href="https://atmosferi.com" style="color: ${data.themeColor}; text-decoration: none;">atmosferi.com</a>
        </td>
      </tr>
    </table>
  ` : '';

  const psHtml = data.psEnabled && data.psText ? `
    <p style="margin: 30px 0 0 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #807C72; font-style: italic;">
      P.S. ${data.psText}
    </p>
  ` : '';

  const servicesHtml = data.servicesWidgetEnabled ? `
    <div style="margin: 24px 0; padding: 20px 24px; border: 1px solid #EAEAEA; background-color: #F9F9F9; text-align: left;">
      <h3 style="font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 16px; color: #807C72; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        ${data.servicesWidgetTitle || "CO DĚLÁME"}
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 12px; border-bottom: 1px solid #EAEAEA;">
            <span style="font-size: 15px; font-weight: bold; color: ${data.themeColor}; margin-right: 8px;">1</span>
            <span style="font-size: 14px; color: #16140F; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${data.service1Title || "Webové stránky"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #EAEAEA;">
            <span style="font-size: 15px; font-weight: bold; color: ${data.themeColor}; margin-right: 8px;">2</span>
            <span style="font-size: 14px; color: #16140F; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${data.service2Title || "3D Vizualizace"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 12px;">
            <span style="font-size: 15px; font-weight: bold; color: ${data.themeColor}; margin-right: 8px;">3</span>
            <span style="font-size: 14px; color: #16140F; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">${data.service3Title || "Klientské sekce"}</span>
          </td>
        </tr>
      </table>
    </div>
  ` : '';

  const ctaHtml = data.ctaButtonEnabled && data.ctaText && data.ctaUrl ? `
    <div style="margin-bottom: 32px;">
      <a href="${data.ctaUrl}" style="display: inline-block; background-color: #16140F; color: #FBFAF6; padding: 12px 24px; text-decoration: none; font-size: 11px; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; letter-spacing: 0.16em; text-transform: uppercase;">
        ${data.ctaText} &rarr;
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EFEDE6; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; background-color: #EFEDE6; padding: 40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; max-width: 600px; background-color: #FBFAF6;">
      <tr>
        <td align="left" style="padding: 0;">
          ${topBannerHtml}
          ${heroHtml}
          
          <div style="padding: 32px;">
            ${icebreakerHtml}
            
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #16140F;">
              ${parsedBody}
            </div>
            
            ${servicesHtml}
            ${portfolioHtml}
            ${ctaHtml}
            
            ${signatureHtml}
            ${psHtml}
          </div>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
  `.trim();
}

function parseBodyText(text: string): string {
  if (!text) return "";
  let html = text;
  html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\b_(.*?)_\\b/g, '<em>$1</em>');
  html = html.replace(/(?<!\\*)\\*(?!\\*)(.*?)\\*/g, '<em>$1</em>');
  
  const paragraphs = html.split(/\\n\\s*\\n/);
  return paragraphs.map(p => {
    const lines = p.split('\\n');
    const isList = lines.some(l => l.trim().startsWith('- ') || l.trim().startsWith('• '));
    if (isList) {
      const listItems = lines.map(l => {
        if (l.trim().startsWith('- ') || l.trim().startsWith('• ')) {
          return `<li style="margin-bottom: 8px;">${l.substring(2).trim()}</li>`;
        }
        return l;
      }).join('');
      return `<ul style="margin: 0 0 16px 0; padding-left: 20px;">${listItems}</ul>`;
    }
    return `<p style="margin: 0 0 16px 0;">${p.replace(/\\n/g, '<br/>')}</p>`;
  }).join('\\n');
}
