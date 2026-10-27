import { dispatchAcquisitionEmails } from "./index.ts";

Deno.test("cron endpoint rejects public keys and missing server credentials", async () => {
  const previous = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  try {
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
    for (const method of ["GET", "POST"]) {
      const result = await dispatchAcquisitionEmails(new Request("https://example.test", {
        method, headers: { Authorization: "Bearer public-anon-key" },
      }));
      if (result.status !== 401) throw new Error("Public request reached dispatch");
    }
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    const result = await dispatchAcquisitionEmails(new Request("https://example.test", {
      method: "POST", headers: { Authorization: "Bearer undefined" },
    }));
    if (result.status !== 401) throw new Error("Missing configuration must fail closed");
  } finally {
    previous === undefined ? Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY") : Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", previous);
  }
});
