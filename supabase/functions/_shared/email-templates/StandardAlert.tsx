
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
} from "npm:@react-email/components@0.0.22";

interface StandardAlertProps {
  siteName?: string;
  siteUrl?: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  greeting?: string;
  secondaryText?: string;
  emoji?: string;
  unsubscribeUrl?: string;
}

export const StandardAlert = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  subject,
  title,
  body,
  ctaText,
  ctaUrl,
  greeting,
  secondaryText,
  emoji,
  unsubscribeUrl,
}: StandardAlertProps) => {
  return (
    <Html>
      <Head>
        <style>
          {`
            @media (prefers-color-scheme: dark) {
              .logo-dark { display: block !important; width: 124px !important; height: auto !important; }
              .logo-light { display: none !important; }
              .main-body { background-color: #121210 !important; }
              .container { background-color: #121210 !important; border-color: #27272a !important; }
              .h1 { color: #ffffff !important; }
              .text { color: #d4d4d8 !important; }
              .button { background-color: #a6d16f !important; color: #121210 !important; }
              .footer, .footer-brand, .footer-link { color: #71717a !important; }
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
              width="124"
              height="28"
              alt={siteName}
              style={logo}
              className="logo-light"
            />
            {/* @ts-ignore */}
            <Img
              src={`${siteUrl}/zrobee-logo-green.svg`}
              width="124"
              height="28"
              alt={siteName}
              style={{ ...logo, display: 'none' }}
              className="logo-dark"
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

          {secondaryText && <Text style={secondaryTextStyle}>{secondaryText}</Text>}

          <Hr style={hr} />

          <Text style={footer} className="footer">
            Tento e-mail byl odeslán automaticky. Nastavení notifikací můžete změnit ve svém <Link href={`${siteUrl}/remeslnik/nastaveni`} style={footerLink} className="footer-link">profilu</Link>
            {unsubscribeUrl && <> nebo se <Link href={unsubscribeUrl} style={footerLink} className="footer-link">odhlásit</Link></>}.
          </Text>
          <Text style={footerBrand} className="footer-brand">
            © {new Date().getFullYear()} {siteName}. Všechna práva vyhrazena.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default StandardAlert;

const main: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily: "'TT Norms Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: "40px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 24px",
  borderRadius: "16px",
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const logoSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px",
};

const logo: React.CSSProperties = {
  display: "inline-block",
};

const emojiStyle: React.CSSProperties = {
  fontSize: "40px",
  textAlign: "center",
  margin: "0 0 16px",
};

const greetingStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center",
  margin: "0 0 8px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
};

const h1: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#111827",
  textAlign: "center",
  margin: "0 0 16px",
  lineHeight: "1.2",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "0 0 24px",
  textAlign: "center",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center",
  margin: "8px 0 32px",
};

const button: React.CSSProperties = {
  backgroundColor: "#a6d16f",
  color: "#121210",
  fontSize: "16px",
  fontWeight: 600,
  padding: "14px 32px",
  borderRadius: "9999px",
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 4px 14px 0 rgba(166, 209, 111, 0.39)",
};

const secondaryTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#9ca3af",
  textAlign: "center",
  margin: "0 0 24px",
};

const hr: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "32px 0 24px",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0 0 8px",
  textAlign: "center",
  lineHeight: "1.5",
};

const footerLink: React.CSSProperties = {
  color: "#9ca3af",
  textDecoration: "underline",
};

const footerBrand: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
  textAlign: "center",
};
