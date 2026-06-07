
import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Row,
  Column,
} from "npm:@react-email/components@0.0.22";

interface MagazineArticle {
  image: string;
  title: string;
  description: string;
  url: string;
}

interface MagazineTemplateProps {
  siteName?: string;
  siteUrl?: string;
  subject: string;
  heroImage: string;
  heroTitle: string;
  heroDescription: string;
  heroCtaText: string;
  heroCtaUrl: string;
  mainArticles: MagazineArticle[];
  bannerText: string;
  bannerCtaText: string;
  bannerCtaUrl: string;
  unsubscribeUrl?: string;
}

export const MagazineTemplate = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  subject,
  heroImage,
  heroTitle,
  heroDescription,
  heroCtaText,
  heroCtaUrl,
  mainArticles = [],
  bannerText,
  bannerCtaText,
  bannerCtaUrl,
  unsubscribeUrl,
}: MagazineTemplateProps) => {
  return (
    <Html>
      <Head>
        <style>
          {`
            @media (prefers-color-scheme: dark) {
              .main-body { background-color: #000000 !important; }
              .container { background-color: #000000 !important; border-color: #1a1a1a !important; }
              .h-title { color: #ffffff !important; }
              .h-desc { color: #a1a1aa !important; }
              .article-title { color: #ffffff !important; }
              .article-desc { color: #a1a1aa !important; }
              .footer { color: #52525b !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{subject}</Preview>
      <Body style={main} className="main-body">
        <Container style={container} className="container">
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${siteUrl}/zrobee-logo-green.svg`}
              width="100"
              height="22"
              alt={siteName}
              style={logo}
            />
          </Section>

          {/* Hero Section */}
          <Section style={heroSection}>
            <Img
              src={heroImage}
              width="100%"
              style={heroImg}
              alt="Hero"
            />
            <div style={heroContent}>
              <Heading style={hTitle} className="h-title">{heroTitle}</Heading>
              <Text style={hDesc} className="h-desc">{heroDescription}</Text>
              <Button style={heroButton} href={heroCtaUrl}>
                {heroCtaText}
              </Button>
            </div>
          </Section>

          {/* Engagement Banner (The "Blue Block" adaptation) */}
          <Section style={bannerSection}>
            <Text style={bannerTitle}>{bannerText}</Text>
            <Button style={bannerButton} href={bannerCtaUrl}>
              {bannerCtaText}
            </Button>
          </Section>

          {/* Secondary Articles */}
          <Section style={articlesSection}>
            <Heading style={sectionHeader}>Další tipy pro vás</Heading>
            <Row>
              {mainArticles.map((article, index) => (
                <Column key={index} style={articleColumn}>
                  <Link href={article.url} style={articleLink}>
                    <Img
                      src={article.image}
                      width="100%"
                      style={articleImg}
                      alt={article.title}
                    />
                    <Heading style={articleTitle} className="article-title">{article.title}</Heading>
                    <Text style={articleDesc} className="article-desc">{article.description}</Text>
                    <Text style={articleCta}>Přečíst více →</Text>
                  </Link>
                </Column>
              ))}
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText} className="footer">
              Tento e-mail byl odeslán na základě vašeho zájmu o kvalitní služby a údržbu domova.
              <br />
              <Link href={unsubscribeUrl || "#"} style={footerLink}>Odhlásit se</Link> • <Link href={`${siteUrl}/podminky`} style={footerLink}>Podmínky</Link>
            </Text>
            <Text style={footerBrand} className="footer">
              © {new Date().getFullYear()} {siteName} • Moderní cesta k řemeslu.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MagazineTemplate;

// Styles
const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: "'Outfit', 'TT Norms Pro', -apple-system, sans-serif",
  padding: "20px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid #e4e4e7",
};

const header: React.CSSProperties = {
  padding: "24px",
  textAlign: "center",
};

const logo: React.CSSProperties = {
  display: "inline-block",
};

const heroSection: React.CSSProperties = {
  position: "relative",
};

const heroImg: React.CSSProperties = {
  display: "block",
  objectFit: "cover",
  borderRadius: "0",
};

const heroContent: React.CSSProperties = {
  padding: "32px 24px",
  textAlign: "center",
};

const hTitle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#18181b",
  margin: "0 0 16px",
  lineHeight: "1.2",
};

const hDesc: React.CSSProperties = {
  fontSize: "16px",
  color: "#52525b",
  margin: "0 0 24px",
  lineHeight: "1.6",
};

const heroButton: React.CSSProperties = {
  backgroundColor: "#000000",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  padding: "16px 32px",
  borderRadius: "12px",
  textDecoration: "none",
  display: "inline-block",
};

const bannerSection: React.CSSProperties = {
  backgroundColor: "#a6d16f",
  padding: "32px 24px",
  textAlign: "center",
  margin: "0 24px 32px",
  borderRadius: "20px",
};

const bannerTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#121210",
  margin: "0 0 20px",
  lineHeight: "1.3",
};

const bannerButton: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#121210",
  fontSize: "15px",
  fontWeight: 700,
  padding: "12px 24px",
  borderRadius: "10px",
  textDecoration: "none",
  display: "inline-block",
};

const articlesSection: React.CSSProperties = {
  padding: "0 24px 40px",
};

const sectionHeader: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#18181b",
  margin: "0 0 24px",
};

const articleColumn: React.CSSProperties = {
  padding: "0 8px",
  width: "50%",
};

const articleLink: React.CSSProperties = {
  textDecoration: "none",
  display: "block",
};

const articleImg: React.CSSProperties = {
  borderRadius: "16px",
  marginBottom: "16px",
  objectFit: "cover",
  height: "140px",
};

const articleTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#18181b",
  margin: "0 0 8px",
  lineHeight: "1.4",
};

const articleDesc: React.CSSProperties = {
  fontSize: "14px",
  color: "#71717a",
  margin: "0 0 12px",
  lineHeight: "1.5",
  height: "63px",
  overflow: "hidden",
};

const articleCta: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#a6d16f",
  margin: "0",
};

const hr: React.CSSProperties = {
  borderColor: "#f4f4f5",
  margin: "0",
};

const footerSection: React.CSSProperties = {
  padding: "32px 24px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  margin: "0 0 12px",
  lineHeight: "1.8",
};

const footerLink: React.CSSProperties = {
  color: "#a1a1aa",
  textDecoration: "underline",
};

const footerBrand: React.CSSProperties = {
  fontSize: "12px",
  color: "#a1a1aa",
  fontWeight: 600,
  margin: "0",
};
