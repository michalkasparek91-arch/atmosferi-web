import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
  Row,
  Column,
} from "npm:@react-email/components@0.0.22";

interface SniperRecruitmentEmailProps {
  jobTitle?: string;
  jobCity?: string;
  jobCategory?: string;
  jobDescription?: string;
  jobDescriptionSnippet?: string;
  jobPublicUrl?: string;
  previewText?: string;
  priceNote?: string;
  customerName?: string;
  workerName?: string;
  greeting?: string;
  buttonText?: string;
  body?: string;
  urgencyBannerEnabled?: boolean;
  urgencyBannerText?: string;
  promoBannerEnabled?: boolean;
  promoBannerText?: string;
  psFooterEnabled?: boolean;
  psFooterText?: string;
  showJobWidget?: boolean;
  showCtaButton?: boolean;
  secondaryText?: string;

  // New modular props
  graphicGreetingEnabled?: boolean;
  heroImageUrl?: string;
  carouselImages?: string[];
  articlesEnabled?: boolean;
  magazineArticles?: Array<{
    title: string;
    description: string;
    image: string;
    url: string;
  }>;
  showSubjectInBody?: boolean;
  emoji?: string;
  textAlign?: "left" | "center";
  secondaryTextBelowJob?: string;
  previewTheme?: "light" | "dark";
}

export function parseRichTextToHtml(text?: string, textAlign: string = "left", isDark: boolean = false) {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\b_(.*?)_\b/g, '<em>$1</em>');
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>');
  
  const color = isDark ? "#d4d4d8" : "#4a4a4a";
  const align = textAlign === "center" ? "center" : "left";
  
  const lines = html.split('\n');
  let inList = false;
  let newLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        newLines.push(`<ul style="margin: 12px 0; padding-left: 20px; list-style-type: disc; font-size: 15px; color: ${color}; line-height: 1.6; text-align: ${align};">`);
      }
      const itemText = line.substring(2).trim();
      newLines.push(`<li style="margin-bottom: 6px;">${itemText}</li>`);
    } else {
      if (inList) {
        inList = false;
        newLines.push('</ul>');
      }
      newLines.push(lines[i]);
    }
  }
  if (inList) newLines.push('</ul>');
  
  const paragraphBlocks = newLines.join('\n').split(/\n\s*\n/);
  const formattedParagraphs = paragraphBlocks.map(block => {
    if (block.trim().startsWith('<ul')) return block;
    return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${color}; text-align: ${align};">${block.replace(/\n/g, '<br/>')}</p>`;
  });
  return formattedParagraphs.join('\n');
}

export const SniperRecruitmentEmail = ({
  jobTitle = "{{jobTitle}}",
  jobCity = "{{jobCity}}",
  jobCategory = "{{jobCategory}}",
  jobDescription = "Konkrétní detail zadání načtený z poptávky...",
  jobDescriptionSnippet = "",
  jobPublicUrl = "{{jobPublicUrl}}",
  previewText = "Máte novou zakázku v okolí z tržiště Zrobee",
  priceNote = "{{priceNote}}",
  customerName = "{{customerName}}",
  workerName = "{{workerName}}",
  greeting = "",
  buttonText = "Zobrazit a podat nabídku",
  body = "jsme Zrobee – nové české tržiště, které spojuje lokální profíky všeho druhu s poctivými zakázkami v jejich okolí.\n\nZrovna hledáme specialistu na tuto konkrétní zakázku, kterou u nás zákazník dnes ráno poptal.",
  urgencyBannerEnabled = true,
  urgencyBannerText = "Spěchá: Zákazník čeká na rychlou reakci. Tuto zakázku jsme právě odeslali pouze vybraným specialistům ve vašem okolí.",
  promoBannerEnabled = true,
  promoBannerText = "Zaváděcí akce: Protože Zrobee právě spouštíme, první registrovaní profíci od nás získávají 100 kreditů zdarma do začátku.",
  psFooterEnabled = false,
  psFooterText = "P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat 'Ne' a už Vás nebudu nabídkami rušit.",
  showJobWidget = true,
  showCtaButton = true,
  secondaryText = "",
  heroImageUrl = "",
  carouselImages = [],
  articlesEnabled = false,
  magazineArticles = [],

  // New modular props
  graphicGreetingEnabled = false,
  showSubjectInBody = false,
  emoji = "📧",
  textAlign = "left",
  secondaryTextBelowJob = "",
  previewTheme = "light",
}: SniperRecruitmentEmailProps) => {
  // Dynamic theme overrides
  const isDark = previewTheme === "dark";

  const mainStyle = {
    ...main,
    backgroundColor: isDark ? "#09090b" : "#f5f5f5",
  };

  const containerStyle = {
    ...container,
    backgroundColor: isDark ? "#18181b" : "#ffffff",
    borderColor: isDark ? "#27272a" : "#eaeaea",
  };

  const logoStyle = {
    ...logo,
    filter: isDark ? "invert(80%) sepia(10%) saturate(1000%) hue-rotate(40deg)" : undefined,
  };

  const greetingStyleItem = graphicGreetingEnabled ? {
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase" as any,
    letterSpacing: "0.2em",
    color: isDark ? "#a6d16f" : "#213319",
    margin: "0 0 16px",
    textAlign: textAlign || "left" as any,
  } : {
    ...greetingStyle,
    color: isDark ? "#a6d16f" : "#213319",
    textAlign: textAlign || "left" as any,
  };

  const bodyStyle = {
    ...markdownContainer,
    textAlign: textAlign || "left" as any,
    color: isDark ? "#d4d4d8" : "#4a4a4a",
  };

  const secondaryTextStyle = {
    fontSize: "12px",
    lineHeight: "1.5",
    color: isDark ? "#a1a1aa" : "#6b7280",
    textAlign: textAlign || "left" as any,
    margin: "12px auto 0",
    maxWidth: "460px",
  };

  const hrStyle = {
    ...hr,
    borderTop: isDark ? "1px solid #27272a" : "1px solid #e5e7eb",
  };

  const footerTextStyle = {
    ...footerText,
    color: isDark ? "#71717a" : "#9ca3af",
  };

  const footerLinkStyle = {
    ...footerLink,
    color: isDark ? "#a6d16f" : "#213319",
  };

  const footerBrandStyle = {
    ...footerBrand,
    color: isDark ? "#52525b" : "#9ca3af",
  };

  const cardStyle = {
    ...cardContainer,
    backgroundColor: isDark ? "#18181b" : "#ffffff",
    borderColor: isDark ? "#27272a" : "#e1e8dc",
  };

  const cardRibbonWrapperStyle = {
    ...ribbonWrapper,
    backgroundColor: isDark ? "#27272a" : "#EAF4E9",
  };

  const cardRibbonTextStyle = {
    ...ribbonText,
    color: isDark ? "#a6d16f" : "#213319",
  };

  const cardMetaTextStyle = {
    ...metaText,
    color: isDark ? "#a1a1aa" : "#5a5a5a",
  };

  const cardTitleStyle = {
    ...cardTitle,
    color: isDark ? "#f4f4f5" : "#121210",
  };

  const cardPriceLabelStyle = {
    ...priceLabel,
    color: isDark ? "#f4f4f5" : "#121210",
  };

  const cardPriceValueStyle = {
    ...priceValue,
    color: isDark ? "#a1a1aa" : "#3a3a3a",
  };

  const cardCustomerCircleStyle = {
    ...avatarCircle,
    backgroundColor: isDark ? "#27272a" : "#EAF4E9",
  };

  const cardCustomerTextStyle = {
    ...customerText,
    color: isDark ? "#a1a1aa" : "#4a4a4a",
  };

  const avatarTextStyle = {
    ...avatarText,
    color: isDark ? "#a6d16f" : "#213319",
  };

  const psFooterTextStyle = {
    ...psFooterTextItem,
    color: isDark ? "#a1a1aa" : "#6b7280",
    textAlign: textAlign || "left" as any,
  };

  return (
    <Html>
      <Head>
        <style>
          {`
            @media (prefers-color-scheme: dark) {
              .button { background-color: #a6d16f !important; color: #121210 !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Logo Section */}
          <Section style={logoSection}>
            <Img
              src="https://zrobee.cz/zrobee-logo.svg"
              width="124"
              height="28"
              alt="Zrobee"
              style={logoStyle}
            />
          </Section>

          {/* Intro text */}
          {graphicGreetingEnabled && greeting && greeting !== "none" ? (
            <Text style={greetingStyleItem}>{greeting.toUpperCase()}</Text>
          ) : null}

          {/* Emoji & Subject H1 in body if enabled */}
          {showSubjectInBody ? (
            <Section style={{ textAlign: "center", marginTop: "10px", marginBottom: "20px" }}>
              {emoji ? (
                <Text style={{ fontSize: "36px", margin: "0 0 10px 0", textAlign: "center" }}>{emoji}</Text>
              ) : null}
              <Text style={{
                fontSize: "24px",
                lineHeight: "30px",
                fontWeight: "800",
                color: isDark ? "#f4f4f5" : "#1a1a1a",
                textAlign: "center" as const,
                margin: "0 auto",
                maxWidth: "500px"
              }}>
                {previewText || jobTitle}
              </Text>
            </Section>
          ) : null}

          {/* Hero Image Section */}
          {heroImageUrl ? (
            <Section style={{ marginBottom: "20px", borderRadius: "12px", overflow: "hidden", border: isDark ? "1px solid #27272a" : "1px solid #eaeaea" }}>
              <Img
                src={heroImageUrl}
                width="100%"
                style={{ display: "block", objectFit: "cover" }}
                alt="Hero Banner"
              />
            </Section>
          ) : null}

          {/* Carousel Images Section */}
          {carouselImages && carouselImages.length > 0 ? (
            <Section style={{ marginBottom: "20px" }}>
              {carouselImages.length === 1 ? (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: isDark ? "1px solid #27272a" : "1px solid #eaeaea" }}>
                  <Img src={carouselImages[0]} width="100%" style={{ display: "block", objectFit: "cover" }} />
                </div>
              ) : (
                <Row>
                  {carouselImages.slice(0, 3).map((img, idx) => (
                    <Column key={idx} style={{ padding: "4px", width: carouselImages.length === 2 ? "50%" : "33.33%" }}>
                      <div style={{ borderRadius: "8px", overflow: "hidden", border: isDark ? "1px solid #27272a" : "1px solid #eaeaea" }}>
                        <Img src={img} width="100%" style={{ display: "block", objectFit: "cover", height: "100px" }} />
                      </div>
                    </Column>
                  ))}
                </Row>
              )}
            </Section>
          ) : null}

          <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(body, textAlign, isDark) }} />

          {/* The Job Card Widget */}
          {showJobWidget && (
            <Section style={cardStyle}>
              {/* Category Ribbon */}
              <Row style={ribbonRow}>
                <Column>
                  <div style={cardRibbonWrapperStyle}>
                    <Text style={cardRibbonTextStyle}>
                      🔨 {jobCategory}
                    </Text>
                  </div>
                </Column>
              </Row>

              {/* Card Content Row */}
              <Row>
                <Column style={cardContentPadding}>
                  {/* Location & Date */}
                  <Row style={{ marginBottom: "16px" }}>
                    <Column style={{ paddingRight: "16px", width: "160px" }}>
                      <Text style={cardMetaTextStyle}>📍 {jobCity} — 15 km</Text>
                    </Column>
                    <Column>
                      <Text style={cardMetaTextStyle}>🗓 Co nejdříve</Text>
                    </Column>
                  </Row>

                  {/* Subcategory / Title */}
                  <Text style={cardTitleStyle}>{jobTitle}</Text>

                  {/* Description */}
                  <div style={{ fontSize: "14px", color: isDark ? "#a1a1aa" : "#4a4a4a", lineHeight: "1.6", margin: "0 0 20px 0" }} dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(jobDescription, "left", isDark) }} />

                  {/* Price Note */}
                  <Row style={{ marginTop: "16px", marginBottom: "16px" }}>
                    <Column>
                      <Text style={cardPriceLabelStyle}>CENA</Text>
                      <Text style={cardPriceValueStyle}>{priceNote || "Není stanovena."}</Text>
                    </Column>
                  </Row>

                  {/* Customer */}
                  <Row style={{ marginBottom: "24px" }}>
                    <Column style={{ width: "28px", verticalAlign: "middle" }}>
                      <div style={cardCustomerCircleStyle}>
                        <Text style={avatarTextStyle}>{customerName ? customerName[0] : "Z"}</Text>
                      </div>
                    </Column>
                    <Column style={{ paddingLeft: "12px", verticalAlign: "middle" }}>
                      <Text style={cardCustomerTextStyle}>
                        {customerName || "Zákazník"}
                      </Text>
                    </Column>
                  </Row>
                </Column>
              </Row>
            </Section>
          )}



          {/* Urgency Injector */}
          {urgencyBannerEnabled && (
            <Section style={{ marginBottom: "20px", backgroundColor: isDark ? "#451a03" : "#fef3c7", borderRadius: "12px", padding: "16px", border: isDark ? "1px solid #78350f" : "1px solid #fde68a" }}>
              <Text style={{ margin: 0, fontSize: "14px", color: isDark ? "#fcd34d" : "#d97706", fontWeight: 600 }}>
                ⏳ {urgencyBannerText}
              </Text>
            </Section>
          )}

          {/* Apply Button */}
          {showCtaButton && buttonText && buttonText.trim() !== "none" && buttonText.trim() !== "" && (
            <>
              <Section style={{ marginBottom: secondaryText ? "8px" : "24px", marginTop: "12px", textAlign: "center" }}>
                <Button style={applyButton} className="button" href={jobPublicUrl}>
                  {buttonText}
                </Button>
              </Section>
              {secondaryText ? (
                <Section style={{ marginBottom: "24px", textAlign: "center" }}>
                  <div style={{
                    fontSize: "12px",
                    lineHeight: "1.5",
                    color: isDark ? "#a1a1aa" : "#6b7280",
                    textAlign: "center",
                    margin: "0 auto",
                    maxWidth: "460px",
                  }} dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(secondaryText, "center", isDark) }} />
                </Section>
              ) : null}
            </>
          )}

          {/* New secondary text below job widget if enabled (moved below CTA to match frontend) */}
          {secondaryTextBelowJob || (jobDescriptionSnippet && jobDescriptionSnippet !== body) ? (
            <Section style={{ marginTop: "8px", marginBottom: "16px" }}>
              {secondaryTextBelowJob ? (
                <div style={{
                  fontSize: "15px",
                  lineHeight: "1.6",
                  color: isDark ? "#d4d4d8" : "#4a4a4a",
                  textAlign: textAlign || "left" as any,
                  margin: "0"
                }} dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(secondaryTextBelowJob, textAlign, isDark) }} />
              ) : (
                <div style={{
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: isDark ? "#a1a1aa" : "#6b7280",
                  textAlign: textAlign || "left" as any,
                  margin: "0"
                }} dangerouslySetInnerHTML={{ __html: parseRichTextToHtml(jobDescriptionSnippet, textAlign, isDark) }} />
              )}
            </Section>
          ) : null}

          {/* Promo Section */}
          {promoBannerEnabled && (
            <Section style={{
              backgroundColor: isDark ? "#14532d" : "#e8f4da",
              border: isDark ? "1px dashed #22c55e" : "1px dashed #a6d16f",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px"
            }}>
              <Text style={{
                fontSize: "14px",
                lineHeight: "1.5",
                color: isDark ? "#4ade80" : "#213319",
                margin: "0",
                textAlign: "left"
              }}>
                🎁 <strong>{promoBannerText?.split(':')[0] || "Zaváděcí akce"}:</strong> {promoBannerText?.split(':').slice(1).join(':') || promoBannerText}
              </Text>
            </Section>
          )}

          {/* Articles Block */}
          {articlesEnabled && magazineArticles && magazineArticles.length > 0 ? (
            <Section style={{ marginTop: "24px", marginBottom: "24px", paddingTop: "24px", borderTop: isDark ? "1px solid #27272a" : "1px solid #e5e7eb" }}>
              <Text style={{ fontSize: "11px", fontWeight: 700, color: isDark ? "#71717a" : "#9ca3af", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px", margin: "0 0 16px" }}>
                Aktuálně z magazínu
              </Text>
              <Row>
                {magazineArticles.slice(0, 2).map((article, index) => (
                  <Column key={index} style={{ padding: "0 8px", width: "50%", verticalAlign: "top" }}>
                    <a href={article.url} style={{ textDecoration: "none", display: "block" }}>
                      <Img
                        src={article.image}
                        width="100%"
                        style={{ borderRadius: "12px", marginBottom: "12px", objectFit: "cover", height: "110px" }}
                        alt={article.title}
                      />
                      <Text style={{ fontSize: "14px", fontWeight: 700, color: isDark ? "#f4f4f5" : "#18181b", margin: "0 0 4px", lineHeight: "1.4" }}>
                        {article.title}
                      </Text>
                      <Text style={{ fontSize: "12px", color: isDark ? "#a1a1aa" : "#71717a", margin: "0 0 8px", lineHeight: "1.5" }}>
                        {article.description}
                      </Text>
                      <Text style={{ fontSize: "12px", fontWeight: 600, color: isDark ? "#a6d16f" : "#213319", margin: 0 }}>
                        Přečíst více →
                      </Text>
                    </a>
                  </Column>
                ))}
              </Row>
            </Section>
          ) : null}

          {/* Footer & Unsubscribe */}
          <Hr style={hrStyle} />
          {psFooterEnabled ? (
            <Section style={psFooterSection}>
              <Text style={psFooterTextStyle}>
                {psFooterText || "P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat 'Ne' a už Vás nebudu nabídkami rušit."}
              </Text>
            </Section>
          ) : (
            <Section style={footer}>
              <Text style={footerTextStyle}>
                Tento e-mail byl odeslán automaticky systémem Zrobee.
              </Text>
              <Text style={footerTextStyle}>
                Nechcete od nás dostávat další podobné nabídky?{" "}
                <a href="https://zrobee.cz/odhlasit" style={footerLinkStyle}>
                  Odhlásit z odběru
                </a>
              </Text>
              <Text style={footerBrandStyle}>
                © {new Date().getFullYear()} Zrobee. Všechna práva vyhrazena.
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
};

export default SniperRecruitmentEmail;

const main: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  paddingTop: "20px",
  paddingBottom: "20px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #eaeaea",
  borderRadius: "16px",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 24px",
  overflow: "hidden",
};

const logoSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
};

const logo: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "12px",
};

const markdownContainer: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#4a4a4a",
  margin: "0 0 24px",
};

const cardContainer: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e1e8dc",
  borderRadius: "20px",
  marginTop: "24px",
  marginBottom: "24px",
  overflow: "hidden",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
};

const ribbonRow: React.CSSProperties = {
  width: "100%",
};

const ribbonWrapper: React.CSSProperties = {
  backgroundColor: "#EAF4E9",
  display: "inline-block",
  padding: "8px 16px",
  borderBottomRightRadius: "16px",
  marginBottom: "16px",
};

const ribbonText: React.CSSProperties = {
  color: "#213319",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "1px",
  margin: "0",
};

const cardContentPadding: React.CSSProperties = {
  padding: "0 24px 24px 24px",
};

const metaText: React.CSSProperties = {
  fontSize: "14px",
  color: "#5a5a5a",
  margin: "0",
  fontWeight: 500,
};

const cardTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#121210",
  margin: "0 0 12px 0",
  lineHeight: "1.3",
};

const priceLabel: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#121210",
  margin: "0 0 4px 0",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const priceValue: React.CSSProperties = {
  fontSize: "15px",
  color: "#3a3a3a",
  margin: "0",
  fontWeight: 500,
};

const customerText: React.CSSProperties = {
  fontSize: "14px",
  color: "#4a4a4a",
  margin: "0",
  fontWeight: 500,
};

const avatarCircle: React.CSSProperties = {
  backgroundColor: "#EAF4E9",
  borderRadius: "14px",
  width: "28px",
  height: "28px",
  textAlign: "center",
  lineHeight: "28px",
  display: "inline-block",
};

const avatarText: React.CSSProperties = {
  color: "#213319",
  fontSize: "13px",
  fontWeight: 700,
  margin: 0,
};

const applyButton: React.CSSProperties = {
  backgroundColor: "#a6d16f",
  color: "#213319",
  fontSize: "15px",
  fontWeight: 700,
  textAlign: "center" as const,
  padding: "16px 24px",
  borderRadius: "30px",
  textDecoration: "none",
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
};

const promoBox: React.CSSProperties = {
  backgroundColor: "#e8f4da",
  border: "1px dashed #a6d16f",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "24px",
};

const promoText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#213319",
  margin: "0",
  textAlign: "left",
};

const hr: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "0 0 8px",
  lineHeight: "1.5",
};

const footerLink: React.CSSProperties = {
  color: "#a6d16f",
  textDecoration: "underline",
};

const footerBrand: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "16px 0 0",
};

const greetingStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#213319",
  margin: "0 0 16px",
  fontWeight: 600,
};

const psFooterSection: React.CSSProperties = {
  textAlign: "left",
  marginTop: "16px",
};

const psFooterTextItem: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#6b7280",
  fontStyle: "italic",
  margin: "0",
};
