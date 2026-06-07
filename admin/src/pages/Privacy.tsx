import DetailLayout from "@/components/DetailLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Shield, Building2 } from "lucide-react";

const Privacy = () => {
  return (
    <DetailLayout title="Ochrana osobních údajů">
      
      <main className="container mx-auto px-4 md:px-8 lg:px-16 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Zásady ochrany osobních údajů
            </h1>
            <p className="text-muted-foreground">
              Poslední aktualizace: 3. ledna 2025
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground mb-1">
                  Kontakt pro ochranu osobních údajů
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Pro jakékoli dotazy týkající se zpracování vašich osobních údajů nás kontaktujte:
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href="mailto:privacy@zrobee.cz" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <Mail className="h-4 w-4" />
                    privacy@zrobee.cz
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">|</span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Zrobee s.r.o., Praha, Česká republika
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          <Accordion type="multiple" className="space-y-4">
            {/* Section 1: Controller */}
            <AccordionItem value="controller" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                1. Správce údajů
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    Správcem vašich osobních údajů je společnost <strong>Zrobee s.r.o.</strong>, 
                    se sídlem v Praze, Česká republika (dále jen „Správce" nebo „Zrobee").
                  </p>
                  <p>
                    Zpracování osobních údajů probíhá v souladu s Nařízením Evropského parlamentu 
                    a Rady (EU) 2016/679 o ochraně fyzických osob v souvislosti se zpracováním 
                    osobních údajů (dále jen „GDPR") a dalšími platnými právními předpisy 
                    České republiky.
                  </p>
                  <p>
                    Zrobee provozuje online platformu pro zprostředkování služeb mezi Poptávajícími 
                    (zákazníky hledajícími řemeslníky) a Dodavateli (řemeslníky nabízejícími své služby).
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Data Categories */}
            <AccordionItem value="data-categories" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                2. Jaká data sbíráme
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Identifikační údaje</h4>
                    <p>
                      Jméno, příjmení, IČO (u podnikatelů), sídlo či adresa bydliště 
                      (pro účely fakturace a doručování).
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Kontaktní údaje</h4>
                    <p>
                      E-mailová adresa a telefonní číslo. <em>Poznámka: Telefonní číslo 
                      Poptávajícího je ve výchozím nastavení skryto a zpřístupněno pouze 
                      Dodavatelům, kteří za kontakt uhradili poplatek (viz níže).</em>
                    </p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">
                      Verifikační údaje (citlivé)
                    </h4>
                    <p>
                      Scany dokladů totožnosti (občanský průkaz nebo pas) a živnostenského 
                      listu pro účely ověření identity Dodavatele.
                    </p>
                    <p className="mt-2 font-medium text-amber-800 dark:text-amber-200 uppercase text-[11px] tracking-wider">
                      🔒 Bezpečnostní protokol: Tyto údaje slouží výhradně k jednorázovému ověření identity. 
                      Jsou trvale smazány ihned po dokončení ověření, nejpozději však do 30 dnů.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Technická data</h4>
                    <p>
                      IP adresa, logy přístupů, typ prohlížeče a zařízení, cookies 
                      (viz sekce Cookies níže).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Údaje o používání služby</h4>
                    <p>
                      Historie zakázek, nabídek, komunikace mezi uživateli, hodnocení a recenze.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Legal Basis */}
            <AccordionItem value="legal-basis" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                3. Účel zpracování a právní základ
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR)
                    </h4>
                    <p>
                      Propojení Poptávajícího a Dodavatele je podstatou poskytované služby. 
                      Bez zpracování kontaktních údajů by služba nemohla fungovat.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Zákonná povinnost (čl. 6 odst. 1 písm. c) GDPR)
                    </h4>
                    <p>
                      Uchovávání fakturačních údajů a daňových dokladů po zákonem stanovenou 
                      dobu (10 let dle zákona o účetnictví).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR)
                    </h4>
                    <p>
                      Zajištění bezpečnosti platformy, prevence podvodů, ochrana a obrana 
                      právních nároků, zlepšování služeb.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      Souhlas (čl. 6 odst. 1 písm. a) GDPR)
                    </h4>
                    <p>
                      Pro zasílání marketingových sdělení a používání analytických a 
                      marketingových cookies (pokud jste souhlas udělili).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 4: Pay-to-Contact Logic */}
            <AccordionItem value="data-sharing" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                4. Předávání dat – logika „kontakt za kredity"
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-0">
                      🔹 Lidsky řečeno: Když zadáte poptávku, vaše telefonní číslo uvidí 
                      jen ti řemeslníci, kteří si za tento kontakt zaplatili. To je podstata 
                      naší služby.
                    </p>
                  </div>

                  <p>
                    <strong>Zveřejněním poptávky</strong> prostřednictvím platformy Zrobee 
                    Poptávající souhlasí s tím, že jeho telefonní číslo bude zpřístupněno 
                    omezenému počtu registrovaných Dodavatelů, kteří za tento kontakt uhradili 
                    poplatek (kredity).
                  </p>

                  <p>
                    <strong>Toto předání osobních údajů je podstatou poskytované služby</strong> 
                    a je nezbytné pro její fungování. Bez něj by nebylo možné propojit 
                    Poptávajícího s kvalifikovanými Dodavateli.
                  </p>

                  <p>
                    Dodavatelé jsou povinni nakládat s kontaktními údaji Poptávajícího 
                    výhradně za účelem komunikace ohledně dané zakázky. Jakékoli jiné 
                    využití je zakázáno.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 5: Data Processors */}
            <AccordionItem value="processors" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                5. Příjemci dat (zpracovatelé)
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    <strong>Zrobee neprodává osobní údaje marketingovým agenturám 
                    ani jiným třetím stranám.</strong>
                  </p>

                  <p>Pro zajištění provozu platformy využíváme následující ověřené zpracovatele:</p>

                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Cloudové služby a hosting:</strong> Supabase / AWS 
                      (zajištění databáze a serverové infrastruktury)
                    </li>
                    <li>
                      <strong>Platební brána:</strong> Stripe / Comgate 
                      (zpracování plateb za kredity)
                    </li>
                    <li>
                      <strong>E-mailové služby:</strong> Resend / Mailgun 
                      (pouze transakční e-maily – potvrzení registrace, notifikace o nabídkách apod.)
                    </li>
                    <li>
                      <strong>Analytické nástroje:</strong> Google Analytics 
                      (pouze pokud jste udělili souhlas s analytickými cookies)
                    </li>
                  </ul>

                  <p>
                    Se všemi zpracovateli máme uzavřeny smlouvy o zpracování osobních údajů 
                    dle čl. 28 GDPR.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 6: User Rights */}
            <AccordionItem value="user-rights" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                6. Práva uživatele
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>Podle GDPR máte následující práva:</p>

                  <ul className="list-disc pl-5 space-y-3">
                    <li>
                      <strong>Právo na přístup</strong> – můžete požádat o kopii všech 
                      osobních údajů, které o vás zpracováváme.
                    </li>
                    <li>
                      <strong>Právo na opravu</strong> – můžete požádat o opravu nepřesných 
                      nebo neúplných údajů.
                    </li>
                    <li>
                      <strong>Právo na výmaz („právo být zapomenut")</strong> – můžete požádat 
                      o smazání svých údajů, pokud již nejsou potřebné pro účely, pro které 
                      byly shromážděny.
                    </li>
                    <li>
                      <strong>Právo na omezení zpracování</strong> – můžete požádat o omezení 
                      zpracování v určitých případech.
                    </li>
                    <li>
                      <strong>Právo na přenositelnost</strong> – můžete požádat o předání 
                      svých údajů v strukturovaném, strojově čitelném formátu.
                    </li>
                    <li>
                      <strong>Právo vznést námitku</strong> – můžete vznést námitku proti 
                      zpracování založenému na oprávněném zájmu.
                    </li>
                    <li>
                      <strong>Právo odvolat souhlas</strong> – kdykoliv můžete odvolat 
                      dříve udělený souhlas.
                    </li>
                  </ul>

                  <div className="bg-muted/50 rounded-lg p-4 mt-4">
                    <p className="font-medium mb-1">Jak uplatnit svá práva?</p>
                    <p>
                      Napište nám na e-mail{" "}
                      <a href="mailto:privacy@zrobee.cz" className="text-primary hover:underline">
                        privacy@zrobee.cz
                      </a>
                      . Na vaši žádost odpovíme nejpozději do 30 dnů.
                    </p>
                  </div>

                  <p>
                    Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (ÚOOÚ), 
                    Pplk. Sochora 27, 170 00 Praha 7, <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.uoou.cz</a>.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 7: Security */}
            <AccordionItem value="security" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                7. Zabezpečení údajů
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    Bezpečnost vašich osobních údajů bereme vážně. Přijali jsme vhodná 
                    technická a organizační opatření:
                  </p>

                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Šifrovaná komunikace:</strong> Veškerá komunikace mezi vaším 
                      prohlížečem a našimi servery probíhá přes protokol HTTPS (SSL/TLS).
                    </li>
                    <li>
                      <strong>Hashovaná hesla:</strong> Hesla jsou ukládána výhradně v 
                      hashované podobě (pomocí moderních algoritmů), nikdy jako prostý text.
                    </li>
                    <li>
                      <strong>Přístupová kontrola:</strong> K osobním údajům mají přístup 
                      pouze oprávnění zaměstnanci a zpracovatelé.
                    </li>
                    <li>
                      <strong>Pravidelné zálohy:</strong> Data jsou pravidelně zálohována 
                      pro případ technické havárie.
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 8: Data Retention */}
            <AccordionItem value="retention" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                8. Doba uchovávání údajů
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <ul className="list-disc pl-5 space-y-3">
                    <li>
                      <strong>Údaje o účtu:</strong> Po dobu aktivního účtu a 3 roky 
                      po jeho zrušení (pro případné právní nároky).
                    </li>
                    <li>
                      <strong>Fakturační údaje:</strong> 10 let dle zákona o účetnictví.
                    </li>
                    <li>
                      <strong>Verifikační doklady:</strong> Maximálně 30 dnů po ověření, 
                      poté jsou smazány.
                    </li>
                    <li>
                      <strong>Komunikace a zakázky:</strong> Po dobu nezbytnou pro řešení 
                      sporů, maximálně 3 roky.
                    </li>
                    <li>
                      <strong>Marketingové souhlasy:</strong> Do odvolání souhlasu.
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 9: Cookies */}
            <AccordionItem value="cookies" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                9. Cookies
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    Používáme cookies a podobné technologie pro zajištění funkčnosti webu 
                    a (se souhlasem) pro analytické a marketingové účely.
                  </p>

                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Nezbytné cookies:</strong> Nutné pro fungování webu 
                      (přihlášení, bezpečnost). Nelze je vypnout.
                    </li>
                    <li>
                      <strong>Analytické cookies:</strong> Pomáhají nám pochopit, jak web 
                      používáte (Google Analytics). Vyžadují váš souhlas.
                    </li>
                    <li>
                      <strong>Marketingové cookies:</strong> Slouží k personalizaci reklam 
                      a remarketingu. Vyžadují váš souhlas.
                    </li>
                  </ul>

                  <p>
                    Pro maximální ochranu soukromí využíváme technologii <strong>Google Consent Mode v2</strong>. 
                    Díky ní jsou signály Google Analytics a Google Ads odesílány pouze tehdy, 
                    pokud jste k tomu udělili výslovný souhlas. V případě nesouhlasu jsou data 
                    anonymizována nebo zcela blokována v souladu s nejpřísnějšími standardy EU.
                  </p>
                  <p>
                    Své preference můžete kdykoli změnit kliknutím na odkaz{" "}
                    <strong>„Nastavení cookies"</strong> v patičce webu.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 10: International Transfers */}
            <AccordionItem value="international" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                10. Mezinárodní přenosy údajů
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    Některé naše zpracovatele (např. cloudové služby) mohou být umístěny 
                    mimo Evropský hospodářský prostor (EHP).
                  </p>
                  <p>
                    V takových případech zajišťujeme, že přenos probíhá v souladu s GDPR, 
                    a to na základě:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Rozhodnutí Evropské komise o odpovídající úrovni ochrany, nebo</li>
                    <li>Standardních smluvních doložek (SCC) schválených Evropskou komisí.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 11: Children */}
            <AccordionItem value="children" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                11. Osoby mladší 18 let
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80">
                  <p>
                    Služby Zrobee jsou určeny pouze osobám starším 18 let. Vědomě 
                    neshromažďujeme osobní údaje od osob mladších 18 let. Pokud zjistíme, 
                    že jsme neúmyslně shromáždili údaje od nezletilé osoby, podnikneme 
                    kroky k jejich okamžitému smazání.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 12: Changes */}
            <AccordionItem value="changes" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                12. Změny těchto zásad
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    Tyto zásady ochrany osobních údajů můžeme čas od času aktualizovat. 
                    O významných změnách vás budeme informovat e-mailem nebo oznámením 
                    na platformě.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 13: DSA */}
            <AccordionItem value="dsa" className="border rounded-xl px-6 bg-card">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline py-5">
                13. Nařízení o digitálních službách (DSA)
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-4">
                  <p>
                    V souladu s Nařízením EU 2022/2065 (DSA) určuje Zrobee s.r.o. jako 
                    jediné kontaktní místo pro komunikaci s úřady členských států, 
                    Evropskou komisí a Evropským sborem pro digitální služby e-mailovou 
                    adresu <strong>info@zrobee.cz</strong>. Komunikace probíhá v českém 
                    nebo anglickém jazyce.
                  </p>
                  <p>
                    Uživatelé mohou využít stejnou adresu pro hlášení obsahu, který 
                    považují za nezákonný nebo v rozporu s našimi obchodními podmínkami.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bottom Contact */}
          <div className="mt-10 p-6 bg-muted/30 rounded-xl text-center">
            <p className="text-muted-foreground mb-2">
              Máte dotazy ohledně ochrany osobních údajů?
            </p>
            <a 
              href="mailto:privacy@zrobee.cz" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              privacy@zrobee.cz
            </a>
          </div>
        </div>
      </main>
    </DetailLayout>
  );
};

export default Privacy;
