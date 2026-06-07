import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface PlainTextEmailProps {
  body?: string;
  previewText?: string;
}

export const PlainTextEmail = ({
  body = "{{body}}",
  previewText = "Zpráva od Zrobee",
}: PlainTextEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <div dangerouslySetInnerHTML={{ __html: body }} />
        </Container>
      </Body>
    </Html>
  );
};

export default PlainTextEmail;

const main: React.CSSProperties = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
  margin: "0 auto",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
  maxWidth: "100%",
};

const footer: React.CSSProperties = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "24px",
};

const link: React.CSSProperties = {
  color: "#8898aa",
  textDecoration: "underline",
};
