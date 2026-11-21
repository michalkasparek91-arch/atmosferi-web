import { useState } from "react";
import { Check, CheckCircle2, Clipboard, ExternalLink, Info, KeyRound, LockKeyhole } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const repo = "michalkasparek91-arch/atmosferi-web";
const gscUrl = "https://search.google.com/search-console?resource_id=sc-domain%3Aatmosferi.com";
const googleCloudServiceAccounts = "https://console.cloud.google.com/iam-admin/serviceaccounts";
const googleCloudWif = "https://console.cloud.google.com/iam-admin/workload-identity-pools";
const githubVariables = "https://github.com/" + repo + "/settings/variables/actions";
const githubWorkflow = "https://github.com/" + repo + "/actions/workflows/gsc-monitor.yml";
const securityCondition = "assertion.repository == '" + repo + "' && assertion.ref == 'refs/heads/main'";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
      setCopied(false);
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide font-semibold text-zinc-500">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="min-w-0 flex-1 break-all text-xs sm:text-sm text-zinc-800 bg-zinc-100 rounded-md px-3 py-2">{value}</code>
        <button type="button" onClick={copy} aria-label={"Kopírovat: " + label}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-xs hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900">
          {copied ? <Check size={15} aria-hidden="true"/> : <Clipboard size={15} aria-hidden="true"/>}
          <span>{copied ? "Zkopírováno" : "Kopírovat"}</span>
        </button>
      </div>
      {failed && <p role="alert" className="text-xs text-amber-700">Kopírování zablokoval prohlížeč. Hodnotu lze označit ručně.</p>}
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4 hover:text-zinc-600">
      {children} <ExternalLink size={14} aria-hidden="true"/>
    </a>
  );
}

function SetupStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 border-t border-zinc-200 py-5 first:border-t-0 first:pt-0">
      <span aria-hidden="true" className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full border border-zinc-300 font-medium text-sm">{n}</span>
      <div className="space-y-3 flex-1 min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {children}
      </div>
    </li>
  );
}

export function GscSetupGuide() {
  return (
    <Card className="rounded-2xl shadow-none border-zinc-200">
      <CardContent className="p-6 md:p-9 space-y-7">
        <div>
          <div className="inline-flex items-center gap-2 text-amber-800 text-sm font-semibold">
            <KeyRound size={17} aria-hidden="true"/> Čeká na první ověřený report Googlu
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mt-3">Trvalé napojení Search Console</h2>
          <p className="text-sm text-zinc-600 mt-2 max-w-3xl">
            Databáze, zabezpečený přijímací endpoint i dashboard jsou připravené. Zbývá jednou povolit Googlu předávání dat přes GitHub.
            Stav jednotlivých kroků zatím neumíme automaticky ověřit, proto je nepovažujeme za hotové, dokud neprojde skutečná synchronizace.
          </p>
        </div>

        <div className="flex items-start gap-3 text-sm border border-zinc-200 rounded-xl p-4 bg-zinc-50">
          <LockKeyhole size={19} className="shrink-0 mt-0.5 text-zinc-700" aria-hidden="true"/>
          <p>Bez Windsoru a Google Sheets. <strong>Neposílej sem ani do GitHubu žádný JSON klíč, heslo či OAuth token.</strong>
            K běhu nejsou potřeba dlouhodobé klíče ani uložený přístup do databáze mimo Supabase.</p>
        </div>

        <ol>
          <SetupStep n={1} title="Vytvoř Google Service Account">
            <p className="text-sm text-zinc-600">V Google Cloud vyber projekt Atmosferi → Create Service Account → zadej název. Volitelné projektové role můžeš přeskočit. E-mail účtu si poznamenej, žádný JSON key nevytvářej.</p>
            <CopyField label="Service Account name" value="atmosferi-gsc-monitor"/>
            <ActionLink href={googleCloudServiceAccounts}>Otevřít Google Cloud – Service Accounts</ActionLink>
          </SetupStep>
          <SetupStep n={2} title="Přidej Service Account do Search Console">
            <p className="text-sm text-zinc-600">V property <strong>atmosferi.com</strong> otevři Settings → Users and permissions → Add user. Zadej nově vytvořený servisní e-mail a vyber <strong>Full user</strong> (nikoli Owner). Google API pak bude používat jen oprávnění pro čtení.</p>
            <CopyField label="Přesná Search Console property" value="sc-domain:atmosferi.com"/>
            <ActionLink href={gscUrl}>Otevřít Google Search Console</ActionLink>
          </SetupStep>
          <SetupStep n={3} title="Propoj GitHub přes Workload Identity Federation">
            <p className="text-sm text-zinc-600">Google Cloud → IAM &amp; Admin → Workload Identity Federation. Vytvoř Pool a OIDC Provider pro GitHub a nastav následující hodnoty. Servisnímu účtu následně uděl roli <strong>Workload Identity User</strong> pouze pro identity našeho GitHub repozitáře.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <CopyField label="Pool ID" value="atmosferi-github"/>
              <CopyField label="Provider ID" value="github"/>
            </div>
            <CopyField label="Issuer URL" value="https://token.actions.githubusercontent.com"/>
            <CopyField label="Attribute mapping 1" value="google.subject = assertion.sub"/>
            <CopyField label="Attribute mapping 2" value="attribute.repository = assertion.repository"/>
            <CopyField label="Provider attribute condition" value={securityCondition}/>
            <ActionLink href={googleCloudWif}>Otevřít Google Cloud – Workload Identity Federation</ActionLink>
          </SetupStep>
          <SetupStep n={4} title="Nastav tři GitHub Actions variables">
            <p className="text-sm text-zinc-600">Ve Settings → Secrets and variables → Actions → <strong>Variables</strong> vytvoř následující tři položky. Identifikátory nejsou hesla. Provider ID musí obsahovat skutečné číslo Google projektu a IDs z kroku 3.</p>
            <CopyField label="Variable 1" value="GSC_WIF_PROVIDER"/>
            <p className="text-xs text-zinc-500">Hodnota: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/atmosferi-github/providers/github</p>
            <CopyField label="Variable 2" value="GSC_SERVICE_ACCOUNT"/>
            <p className="text-xs text-zinc-500">Hodnota: skutečný e-mail servisního účtu z kroku 1.</p>
            <CopyField label="Variable 3" value="GSC_MONITOR_ENABLED"/>
            <p className="text-xs text-zinc-500">Hodnota: true, ale až po dokončení Google oprávnění.</p>
            <ActionLink href={githubVariables}>Otevřít GitHub Actions variables</ActionLink>
          </SetupStep>
          <SetupStep n={5} title="Spusť první synchronizaci">
            <p className="text-sm text-zinc-600">V GitHub Actions vyber Direct Google Search Console monitoring → Run workflow na větvi main. Úspěšný běh uloží první soukromý report přímo do Atmosferi Supabase. Další kontroly poběží automaticky každých šest hodin.</p>
            <div className="flex flex-wrap items-center gap-4">
              <ActionLink href={githubWorkflow}>Otevřít monitoring na GitHubu</ActionLink>
              <ActionLink href={"https://github.com/" + repo + "/blob/main/docs/gsc-direct-connection.md"}>Podrobný návod</ActionLink>
            </div>
          </SetupStep>
        </ol>
        <div className="flex items-start gap-2 text-xs text-zinc-500 border-t pt-5">
          <Info size={17} aria-hidden="true" className="shrink-0"/>
          <p>Úspěšný build aplikace ještě neznamená připojení Search Console. Za připojené považujeme až propojení, které vytvoří skutečný ověřený report. Google URL Inspection měří stav indexu, ne živé načtení stránky.</p>
        </div>
        <p className="flex gap-2 items-center text-xs text-zinc-500"><CheckCircle2 size={16} aria-hidden="true"/> Reporty budou přístupné pouze autorizovanému administrátorovi.</p>
      </CardContent>
    </Card>
  );
}
