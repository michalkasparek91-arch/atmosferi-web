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

interface RecoveryEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({
  siteName = "Zrobee",
  siteUrl = "https://zrobee.cz",
  recipient = "",
  confirmationUrl = "",
}: RecoveryEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Obnovení hesla – Zrobee</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${siteUrl}/zrobee-logo.svg`}
              width="124"
              height="28"
              alt="Zrobee"
              style={logo}
            />
          </Section>

          <Heading style={h1 as any}>Obnovení hesla</Heading>

          <Text style={text}>
            Obdrželi jsme žádost o obnovení hesla k vašemu účtu. Klikněte na
            tlačítko níže pro nastavení nového hesla.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              Nastavit nové heslo
            </Button>
          </Section>

          <Text style={smallText}>
            Pokud tlačítko nefunguje, zkopírujte a vložte tento odkaz do
            prohlížeče:
          </Text>
          <Text style={linkText}>{confirmationUrl}</Text>

          <Hr style={hr} />

          <Text style={footer}>
            Pokud jste o obnovení hesla nežádali, tento e-mail můžete
            ignorovat. Vaše heslo zůstane nezměněno.
          </Text>
          <Text style={footerBrand}>
            © {new Date().getFullYear()} Zrobee. Všechna práva vyhrazena.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RecoveryEmail;

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
