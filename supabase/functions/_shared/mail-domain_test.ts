import { validateMailDomain } from "./mail-domain.ts";
const fake = (answers: Record<string, unknown>) => (async (url: string | URL | Request) => {
  const type = new URL(String(url)).searchParams.get("type")!;
  return new Response(JSON.stringify(answers[type] || { Status: 0 }), { status: 200 });
}) as typeof fetch;
Deno.test("reserved and placeholder domains never pass without DNS", async () => {
  for (const d of ["placeholder.zrobee.cz", "example.com", "mail.invalid", "mail.test"])
    if (await validateMailDomain(d, (()=>{throw Error("Should not query DNS");}) as typeof fetch) !== "invalid") throw Error(d);
});
Deno.test("null MX rejects mail even if domain serves a website", async () => {
  const status = await validateMailDomain("office.cz", fake({ MX:{Status:0,Answer:[{type:15,data:"0 ."}]}, A:{Status:0,Answer:[{type:1,data:"192.0.2.1"}]} }));
  if (status !== "invalid") throw Error(status);
});
Deno.test("NXDOMAIN is invalid; DNS timeout and SERVFAIL are retryable unknown", async () => {
  if (await validateMailDomain("office.cz", fake({MX:{Status:3}})) !== "invalid") throw Error("NXDOMAIN");
  if (await validateMailDomain("office.cz", fake({MX:{Status:2}})) !== "unknown") throw Error("SERVFAIL");
  if (await validateMailDomain("office.cz", (async()=>{throw Error("timeout");}) as typeof fetch) !== "unknown") throw Error("timeout");
});
Deno.test("normal MX and implicit IPv6 mail routes are valid", async () => {
  if (await validateMailDomain("office.cz",fake({MX:{Status:0,Answer:[{type:15,data:"10 mail.office.cz."}]}}))!=="valid") throw Error("MX");
  if (await validateMailDomain("office.cz",fake({AAAA:{Status:0,Answer:[{type:28,data:"2001:db8::1"}]}}))!=="valid") throw Error("AAAA");
});
