import { sendViaSmtp, smtpTlsPort, smtpProviderMessageId } from "./smtp.ts";

Deno.test("SES SMTP acceptance ID matches delivery notification IDs", () => {
  if (smtpProviderMessageId("email-smtp.eu-central-1.amazonaws.com", "250 Ok 010701ab-1234-000000", "<mime@example.test>") !== "010701ab-1234-000000") throw new Error("SES server ID lost");
  if (smtpProviderMessageId("smtp.forpsi.com", "250 Ok queued", "<mime@example.test>") !== "<mime@example.test>") throw new Error("Non-SES Message-ID changed");
});

Deno.test("FORPSI legacy 587 migrates only to implicit TLS 465", () => {
  if (smtpTlsPort("smtp.forpsi.com",587)!==465 || smtpTlsPort("smtp.forpsi.cz",587)!==465) throw new Error("FORPSI migration failed");
  if (smtpTlsPort("smtp.example.test",587)!==587 || smtpTlsPort("smtp.forpsi.com",25)!==25) throw new Error("Unexpected port override");
  if (smtpTlsPort("email-smtp.eu-central-1.amazonaws.com",587)!==465) throw new Error("SES TLS endpoint migration failed");
});

Deno.test("missing SMTP credentials fail without attempting a network connection", async () => {
  const names = ["SMTP_HOST", "SMTP_USER", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_PORT"];
  const previous = names.map(name => Deno.env.get(name));
  try {
    for (const name of names) Deno.env.delete(name);
    const result = await sendViaSmtp({ from: "sender@example.test", to: "recipient@example.test", subject: "Test", html: "Test" });
    if (result.success || !result.error?.includes("SMTP_PASSWORD")) throw new Error("Missing configuration was not rejected");
    Deno.env.set("SMTP_HOST", "smtp.example.test");
    Deno.env.set("SMTP_USER", "sender@example.test");
    Deno.env.set("SMTP_PASSWORD", "test-only-not-a-real-password");
    Deno.env.set("SMTP_PORT", "587");
    const blocked = await sendViaSmtp({ from: "sender@example.test", to: "recipient@example.test", subject: "Test", html: "Test" });
    if (blocked.success || !blocked.error?.includes("465")) throw new Error("Blocked port was not rejected");
  } finally {
    names.forEach((name, i) => previous[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[i]!));
  }
});
