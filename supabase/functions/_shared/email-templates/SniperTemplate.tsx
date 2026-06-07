
import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
} from "npm:@react-email/components@0.0.22";

interface SniperTemplateProps {
  siteName?: string;
  siteUrl?: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  greeting?: string;
  emoji?: string;
}

export const SniperTemplate = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  subject,
  title,
  body,
  ctaText,
  ctaUrl,
  greeting,
  emoji,
}: SniperTemplateProps) => {
  return (
    <Html>
      <Head>
        <style>
          {`
            @media (prefers-color-scheme: dark) {
              .main-body { background-color: #ffffff !important; }
              .container { background-color: #ffffff !important; border-color: #f3f4f6 !important; }
              .h1 { color: #111827 !important; }
              .text { color: #4b5563 !important; }
            }
          `}
        </style>
      </Head>
      <Preview>{subject}</Preview>
      <Body style={main} className="main-body">
        <Container style={container} className="container">
          <Section style={logoSection}>
            <Img
              src={`${siteUrl}/zrobee-logo.svg`}
              width="100"
              height="22"
              alt={siteName}
              style={logo}
            />
          </Section>

          {emoji && <Text style={emojiStyle}>{emoji}</Text>}
          {greeting && <Text style={greetingStyle}>{greeting}</Text>}
          
          <Heading style={h1} className="h1">{title}</Heading>

          <Text style={text} className="text">{body}</Text>

          {ctaUrl && ctaText && (
            <Section style={buttonSection}>
              <Button style={button} href={ctaUrl} className="button">
                {ctaText}
              </Button>
            </Section>
          )}

          <Text style={psStyle}>
            P.S. Vím, že Vám do schránky občas padají různé nesmysly, tak doufám, že tohle nebude ten případ a nabídka opravdu přijde vhod. Pokud pro Vás Zrobee nedává smysl, odepište mi jen 'Ne' a rovnou si Vás mažu ze seznamu.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SniperTemplate;

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "20px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "20px",
};

const logoSection: React.CSSProperties = {
  textAlign: "left",
  marginBottom: "24px",
};

const logo: React.CSSProperties = {
  display: "inline-block",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "32px",
  textAlign: "left",
  margin: "0 0 16px",
};

const greetingStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#111827",
  textAlign: "left",
  margin: "0 0 16px",
  fontWeight: 400,
};

const h1: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#111827",
  textAlign: "left",
  margin: "0 0 20px",
  lineHeight: "1.3",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 24px",
  textAlign: "left",
};

const buttonSection: React.CSSProperties = {
  textAlign: "left",
  margin: "24px 0 32px",
};

const button: React.CSSProperties = {
  backgroundColor: "#000000",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const psStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#6b7280",
  fontStyle: "italic",
  margin: "32px 0 0",
  textAlign: "left",
};
