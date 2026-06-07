import * as React from "react";
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
} from "@react-email/components";

interface BasicAlertEmailProps {
  title?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export const BasicAlertEmail = ({
  title = "{{title}}",
  body = "{{body}}",
  ctaText = "{{ctaText}}",
  ctaUrl = "{{ctaUrl}}",
}: BasicAlertEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://zrobee.cz/zrobee-logo.svg"
              width="124"
              height="28"
              alt="Zrobee"
              style={logo}
            />
          </Section>

          <Text style={h1}>{title}</Text>

          {/* Using dangerouslySetInnerHTML allowing line-breaks if preview component sends strings with <br/> or we can let Handlebars safely inject HTML */}
          <div style={markdownContainer} dangerouslySetInnerHTML={{ __html: body }} />

          {ctaText && ctaUrl && ctaText !== "{{ctaText}}" && (
            <Section style={buttonSection}>
              <Button style={button} href={ctaUrl}>
                {ctaText}
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Tento e-mail byl odeslán automaticky systémem Zrobee.
            </Text>
            <Text style={footerText}>
              Nechcete od nás dostávat další podobné nabídky?{" "}
              <a href="https://zrobee.cz/odhlasit" style={footerLink}>
                Odhlásit z odběru
              </a>
            </Text>
            <Text style={footerBrand}>
              © {new Date().getFullYear()} Zrobee. Všechna práva vyhrazena.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BasicAlertEmail;

const main: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  paddingTop: "40px",
  paddingBottom: "40px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "40px 32px",
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
  fontSize: "22px",
  fontWeight: 700,
  color: "#121210",
  textAlign: "center",
  margin: "0 0 24px",
  lineHeight: "1.3",
};

const markdownContainer: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#4a4a4a",
  margin: "0 0 32px",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center",
  margin: "8px 0 32px",
};

const button: React.CSSProperties = {
  backgroundColor: "#a6d16f",
  color: "#213319",
  fontSize: "15px",
  fontWeight: 600,
  padding: "14px 32px",
  borderRadius: "24px",
  textDecoration: "none",
  display: "inline-block",
};

const hr: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "32px 0 24px",
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
