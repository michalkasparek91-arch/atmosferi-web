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

interface NewsletterEmailProps {
  title?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export const NewsletterEmail = ({
  title = "{{title}}",
  body = "{{body}}",
  ctaText = "{{ctaText}}",
  ctaUrl = "{{ctaUrl}}",
  imageUrl = "",
}: NewsletterEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={headerBanner}>
            <Img
              src="https://zrobee.cz/zrobee-logo.svg"
              width="124"
              height="28"
              alt="Zrobee"
              style={logo}
            />
          </Section>

          <Section style={contentSection}>
            <Text style={h1}>{title}</Text>

            {imageUrl && (
              <Section style={imageSection}>
                <Img
                  src={imageUrl}
                  width="536"
                  alt="Campaign Image"
                  style={campaignImage}
                />
              </Section>
            )}

            <div style={markdownContainer} dangerouslySetInnerHTML={{ __html: body }} />

            {ctaText && ctaUrl && ctaText !== "{{ctaText}}" && (
              <Section style={buttonSection}>
                <Button style={button} href={ctaUrl}>
                  {ctaText}
                </Button>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Tento e-mail byl odeslán automaticky systémem Zrobee.
            </Text>
            <Text style={footerText}>
              Nechcete od nás dostávat další podobné zprávy?{" "}
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

export default NewsletterEmail;

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
  maxWidth: "600px",
  margin: "0 auto",
  overflow: "hidden", 
};

const headerBanner: React.CSSProperties = {
  backgroundColor: "#ffffff", 
  padding: "32px 24px 0 24px",
  textAlign: "center" as const,
};

const logo: React.CSSProperties = {
  display: "inline-block",
};

const contentSection: React.CSSProperties = {
  padding: "32px 32px 24px 32px",
  textAlign: "center" as const,
};

const h1: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#121210",
  margin: "0 0 24px",
  lineHeight: "1.3",
  textAlign: "center" as const,
};

const imageSection: React.CSSProperties = {
  marginBottom: "24px",
};

const campaignImage: React.CSSProperties = {
  borderRadius: "16px",
  display: "block",
  margin: "0 auto",
  maxWidth: "100%",
};

const markdownContainer: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#4a4a4a",
  margin: "0 0 32px",
  textAlign: "center" as const,
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginTop: "16px",
  marginBottom: "16px",
};

const button: React.CSSProperties = {
  backgroundColor: "#a6d16f",
  color: "#213319",
  fontSize: "15px",
  fontWeight: 600,
  padding: "16px 32px",
  borderRadius: "8px", 
  textDecoration: "none",
  display: "inline-block",
};

const hr: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 32px",
};

const footer: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "0 32px 32px 32px",
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
