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
}

export function generateAtmosferiEmailHtml(data: EmailTemplateData): string {
  // Convert markdown-like syntax to HTML for body
  const parsedBody = parseBodyText(data.body);

  const heroHtml = data.heroImageEnabled && data.heroImageUrl ? `
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <img src="${data.heroImageUrl}" alt="Hero" width="100%" style="display: block; max-width: 100%; height: auto; border: 1px solid #EAEAEA;" />
      </td>
    </tr>
  ` : '';

  const portfolioHtml = data.portfolioEnabled && data.portfolioImages.length > 0 ? `
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${data.portfolioImages.map(url => `
              <td width="${Math.floor(100 / data.portfolioImages.length)}%" style="padding: 0 4px;">
                <img src="${url}" alt="Portfolio" width="100%" style="display: block; max-width: 100%; height: auto; border: 1px solid #EAEAEA;" />
              </td>
            `).join('')}
          </tr>
        </table>
      </td>
    </tr>
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

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; background-color: #FAFAFA;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; max-width: 600px; background-color: #FFFFFF;">
      <tr>
        <td align="left" style="padding: 40px 30px;">
          ${heroHtml}
          ${portfolioHtml}
          
          ${icebreakerHtml}
          
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #16140F;">
            ${parsedBody}
          </div>
          
          ${signatureHtml}
          ${psHtml}
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
