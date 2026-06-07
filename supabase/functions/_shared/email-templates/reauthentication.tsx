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
} from "npm:@react-email/components@0.0.22";

interface ReauthenticationEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  token: string;
}

export const ReauthenticationEmail = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  recipient = "",
  token = "",
}: ReauthenticationEmailProps) => {
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
              .code-section { background-color: #1a1a1a !important; }
              .code-text { color: #a6d16f !important; }
              .footer, .footer-brand { color: #71717a !important; }
            }
          `}
        </style>
      </Head>
      <Preview>Váš ověřovací kód – Zrobee</Preview>
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

          <Heading style={h1 as any} className="h1">Ověřovací kód</Heading>

          <Text style={text} className="text">
            Pro potvrzení vaší identity zadejte následující kód:
          </Text>

          <Section style={codeSection} className="code-section">
            <Text style={codeText} className="code-text">{token}</Text>
          </Section>

          <Text style={text} className="text">
            Kód je platný po omezenou dobu. Pokud vyprší, vyžádejte si nový.
          </Text>

          <Hr style={hr} />

          <Text style={footer} className="footer">
            Pokud jste o ověření nežádali, tento e-mail můžete ignorovat.
          </Text>
          <Text style={footerBrand} className="footer-brand">
            © {new Date().getFullYear()} Zrobee. Všechna práva vyhrazena.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReauthenticationEmail;

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

const codeSection: React.CSSProperties = {
  textAlign: "center",
  margin: "8px 0 32px",
  backgroundColor: "#f4f4f5",
  borderRadius: "9999px",
  padding: "24px",
};

const codeText: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  color: "#121210",
  letterSpacing: "8px",
  margin: "0",
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
