/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
} from "npm:@react-email/components@0.0.22";

interface MagicLinkEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  recipient = "",
  confirmationUrl = "",
}: MagicLinkEmailProps) => {
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
              .footer, .footer-brand { color: #71717a !important; }
              .link-text { color: #a6d16f !important; }
            }
          `}
        </style>
      </Head>
      <Preview>Váš přihlašovací odkaz – Zrobee</Preview>
      <Body style={main} className="main-body">
        <Container style={container} className="container">
          <Section style={logoSection}>
            <Img
              src={`${siteUrl}/zrobee-logo.svg`}
              width="124"
              height="28"
              alt="Zrobee"
              style={logo}
              className="logo-light"
            />
            {/* @ts-ignore */}
            <Img
              src={`${siteUrl}/zrobee-logo-green.svg`}
              width="124"
              height="28"
              alt="Zrobee"
              style={{ ...logo, display: 'none' }}
              className="logo-dark"
            />
          </Section>

          <Heading style={h1 as any} className="h1">Přihlášení jedním klikem</Heading>

          <Text style={text} className="text">
            Klikněte na tlačítko níže pro přihlášení do svého účtu. Odkaz je
            platný pouze po omezenou dobu.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl} className="button">
              Přihlásit se
            </Button>
          </Section>

          <Text style={smallText}>
            Pokud tlačítko nefunguje, zkopírujte a vložte tento odkaz do
            prohlížeče:
          </Text>
          <Text style={linkText} className="link-text">{confirmationUrl}</Text>

          <Hr style={hr} />

          <Text style={footer} className="footer">
            Pokud jste o přihlášení nežádali, tento e-mail můžete ignorovat.
          </Text>
          <Text style={footerBrand} className="footer-brand">
            © {new Date().getFullYear()} Zrobee. Všechna práva vyhrazena.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default MagicLinkEmail;

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily:
    "'TT Norms Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "40px 24px",
};

const logoSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px",
};

const logo: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "12px",
};


const h1: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#121210",
  textAlign: "center",
  margin: "0 0 16px",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#636963",
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
};

const smallText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "1.6",
  color: "#9ca3af",
  margin: "0 0 8px",
};

const linkText: React.CSSProperties = {
  fontSize: "12px",
  color: "#a6d16f",
  wordBreak: "break-all",
  margin: "0 0 24px",
};

const hr: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "0 0 8px",
  textAlign: "center",
};

const footerBrand: React.CSSProperties = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "0",
  textAlign: "center",
};
