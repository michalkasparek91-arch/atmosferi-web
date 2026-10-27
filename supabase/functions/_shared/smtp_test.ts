import { sendViaSmtp } from "./smtp.ts";

Deno.test("missing SMTP credentials fail without attempting a network connection", async () => {
  const names = ["SMTP_HOST", "SMTP_USER", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_PORT"];
  const previous = names.map(name => Deno.env.get(name));
  try {
    for (const name of names) Deno.env.delete(name);
    const result = await sendViaSmtp({ from: "sender@example.test", to: "recipient@example.test", subject: "Test", html: "Test" });
    if (result.success || !result.error?.includes("SMTP_PASSWORD")) throw new Error("Missing configuration was not rejected");
    Deno.env.set("SMTP_HOST", "smtp.forpsi.com");
    Deno.env.set("SMTP_USER", "sender@example.test");
    Deno.env.set("SMTP_PASSWORD", "test-only-not-a-real-password");
    Deno.env.set("SMTP_PORT", "587");
    const blocked = await sendViaSmtp({ from: "sender@example.test", to: "recipient@example.test", subject: "Test", html: "Test" });
    if (blocked.success || !blocked.error?.includes("465")) throw new Error("Blocked port was not rejected");
  } finally {
    names.forEach((name, i) => previous[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, previous[i]!));
  }
});
