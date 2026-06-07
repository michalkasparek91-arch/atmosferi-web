import { useState, useEffect } from "react";
import DetailLayout from "@/components/DetailLayout";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";

const sections = [
  { id: "uvod", title: "1. Úvodní ustanovení" },
  { id: "ucet", title: "2. Uživatelský účet a obsah" },
  { id: "kredity", title: "3. Kredity a platby" },
  { id: "odpovednost", title: "4. Odpovědnost" },
  { id: "zaverecna", title: "5. Závěrečná ustanovení" },
];

interface HumanSummaryProps {
  children: React.ReactNode;
}

const HumanSummary = ({ children }: HumanSummaryProps) => (
  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-6">
    <div className="flex items-start gap-3">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Lidsky řečeno:</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">{children}</p>
      </div>
    </div>
  </div>
);

const Terms = () => {
  const [activeSection, setActiveSection] = useState("uvod");

  useEffect(() => {
    const container = document.getElementById('terms-scroll-container');
    if (!container) return;
    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 150;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const container = document.getElementById('terms-scroll-container');
    if (element && container) {
      const offset = 100;
      container.scrollTo({
        top: element.offsetTop - offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <DetailLayout title="Obchodní podmínky">
      <div id="terms-scroll-container" className="h-full overflow-y-auto">
      
      <main className="container mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sticky Sidebar */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Obsah
              </h2>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </div>
          </aside>

          {/* Mobile Navigation */}
          <div className="lg:hidden sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 text-xs rounded-full transition-colors",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {section.title.split(". ")[1]}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <article className="flex-1 max-w-3xl">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                Obchodní podmínky
              </h1>
              <p className="text-muted-foreground">
                Platné od: 1. ledna 2025
              </p>
            </header>

            <div className="prose prose-lg max-w-none">
              {/* Article 1 */}
              <section id="uvod" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b">
                  Článek 1: Úvodní ustanovení
                </h2>

                <HumanSummary>
                  Jsme online tržiště – spojujeme vás s řemeslníky, ale samotnou práci neděláme a neručíme za ni.
                </HumanSummary>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1.1 Provozovatel</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Tyto obchodní podmínky (dále jen „VOP") upravují práva and povinnosti mezi společností 
                  <strong> Zrobee s.r.o.</strong>, IČO: [DOPLNIT], se sídlem [DOPLNIT ADRESU], zapsanou 
                  v obchodním rejstříku vedeném [DOPLNIT SOUD], oddíl C, vložka [DOPLNIT] (dále jen 
                  „Provozovatel" nebo „Zrobee"), a uživateli platformy Zrobee.cz.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1.2 Povaha služby</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Platforma Zrobee.cz je <strong>službou informační společnosti</strong> ve smyslu zákona 
                  č. 480/2004 Sb., o některých službách informační společnosti. Provozovatel poskytuje 
                  technologickou platformu, která umožňuje:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4 mb-4">
                  <li>Poptávajícím (zákazníkům) vytvářet poptávky po řemeslnických a dalších službách</li>
                  <li>Dodavatelům (řemeslníkům) nabízet své služby a reagovat na poptávky</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1.3 Postavení zprostředkovatele</h3>
                <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 my-4">
                  <p className="text-foreground/90 font-medium">
                    Provozovatel vystupuje výhradně jako <strong>zprostředkovatel</strong>. Provozovatel 
                    není smluvní stranou jakýchkoliv smluv uzavřených mezi Poptávajícím a Dodavatelem 
                    prostřednictvím platformy.
                  </p>
                </div>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Veškeré smluvní vztahy vznikající z objednání a poskytnutí služeb (včetně platebních 
                  povinností, záručních podmínek a odpovědnosti za vady) jsou uzavírány výhradně mezi 
                  Poptávajícím a Dodavatelem.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1.4 Definice pojmů</h3>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
                  <li><strong>Poptávající (Zákazník):</strong> fyzická nebo právnická osoba, která prostřednictvím platformy vytváří poptávku po službách</li>
                  <li><strong>Dodavatel (Řemeslník):</strong> fyzická nebo právnická osoba, která prostřednictvím platformy nabízí své služby a reaguje na poptávky</li>
                  <li><strong>Poptávka:</strong> zadání požadavku na službu vytvořené Poptávajícím</li>
                  <li><strong>Nabídka:</strong> reakce Dodavatele na poptávku obsahující cenovou kalkulaci a podmínky</li>
                  <li><strong>Kredity:</strong> virtuální jednotky sloužící k využívání funkcí platformy Dodavateli</li>
                </ul>
              </section>

              {/* Article 2 */}
              <section id="ucet" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b">
                  Článek 2: Uživatelský účet a obsah
                </h2>

                <HumanSummary>
                  Nepište do poptávek telefon ani e-mail – je to zakázané a můžeme vám účet zablokovat. 
                  Fotky, které nahrajete, smíme použít k propagaci služby.
                </HumanSummary>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2.1 Registrace a správa účtu</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Používání platformy vyžaduje vytvoření uživatelského účtu. Uživatel se zavazuje poskytnout 
                  pravdivé, přesné a aktuální údaje. Uživatel je odpovědný za zachování důvěrnosti 
                  přihlašovacích údajů a za veškeré aktivity provedené prostřednictvím jeho účtu.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2.2 Zákaz obcházení platformy</h3>
                <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 my-4">
                  <p className="text-foreground/90 font-semibold mb-2">
                    Přísně zakázané činnosti:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    <li>Uvádění telefonních čísel v textu veřejných poptávek nebo profilů</li>
                    <li>Uvádění e-mailových adres v textu veřejných poptávek nebo profilů</li>
                    <li>Jakékoliv jiné formy přímého kontaktu obcházející platformu</li>
                  </ul>
                </div>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Provozovatel si vyhrazuje právo bez předchozího upozornění <strong>odstranit takový obsah</strong> a 
                  v případě opakovaného porušení <strong>trvale zablokovat uživatelský účet</strong> bez nároku 
                  na vrácení nevyužitých kreditů.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2.3 Licence k uživatelskému obsahu</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Nahráním jakéhokoliv obsahu (zejména fotografií, popisů, referencí) na platformu uděluje 
                  uživatel Provozovateli <strong>nevýhradní, bezúplatnou, územně a časově neomezenou licenci</strong> k:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4 mb-4">
                  <li>Zobrazování obsahu na platformě a v souvisejících aplikacích</li>
                  <li>Použití obsahu pro marketingové a propagační účely Provozovatele</li>
                  <li>Technickým úpravám obsahu (změna velikosti, formátu) pro potřeby platformy</li>
                </ul>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Uživatel prohlašuje, že je oprávněn takovou licenci udělit a že obsah neporušuje práva 
                  třetích osob.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2.4 Hlášení nezákonného obsahu (DSA)</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  V souladu s Nařízením o digitálních službách (DSA) může jakákoli osoba nebo subjekt 
                  nahlásit obsah, který považuje za nezákonný, prostřednictvím e-mailu 
                  <strong> info@zrobee.cz</strong>. Hlášení musí obsahovat dostatečné odůvodnění 
                  a identifikaci konkrétního obsahu (např. URL nebo ID zakázky).
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  Provozovatel taková hlášení vyhodnocuje bez zbytečného odkladu a o svém 
                  rozhodnutí informuje oznamovatele, je-li to technicky možné.
                </p>
              </section>

              {/* Article 3 */}
              <section id="kredity" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b">
                  Článek 3: Kredity a platby
                </h2>

                <HumanSummary>
                  Kredity jsou digitální obsah – jakmile je použijete, nelze je vrátit. 
                  Když zákazník nezvedá telefon nebo si vybere jiného řemeslníka, kredit nevrátíme – to je vaše podnikatelské riziko.
                </HumanSummary>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.1 Povaha kreditů</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Kredity jsou <strong>digitálním obsahem</strong> ve smyslu § 1837 písm. l) občanského zákoníku. 
                  Zakoupením kreditů uzavírá Dodavatel s Provozovatelem smlouvu o dodání digitálního obsahu.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.2 Vzdání se práva na odstoupení</h3>
                <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 my-4">
                  <p className="text-foreground/90">
                    <strong>Poučení dle § 1837 písm. l) občanského zákoníku:</strong> Nákupem kreditů uživatel 
                    výslovně žádá o okamžité poskytnutí digitálního obsahu a bere na vědomí, že tím 
                    <strong> ztrácí právo na odstoupení od smlouvy ve lhůtě 14 dnů</strong>.
                  </p>
                </div>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Potvrzením nákupu uživatel souhlasí s tím, že kredity budou ihned připsány na jeho účet 
                  a budou k dispozici k okamžitému použití.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.3 Podmínky vrácení kreditů</h3>
                <p className="text-foreground/80 leading-relaxed mb-2 font-semibold">
                  Kredity budou vráceny pouze v těchto případech:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4 mb-4">
                  <li>Prokazatelná technická závada na straně platformy, která znemožnila odeslání nabídky</li>
                  <li>Zrušení poptávky Poptávajícím <strong>před</strong> přijetím jakékoliv nabídky</li>
                </ul>

                <p className="text-foreground/80 leading-relaxed mb-2 font-semibold">
                  Kredity nebudou vráceny v těchto případech (podnikatelské riziko Dodavatele):
                </p>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <ul className="list-disc list-inside space-y-2 text-foreground/80">
                    <li>Poptávající nereaguje na nabídku nebo nezvedá telefon</li>
                    <li>Poptávající si vybere jiného Dodavatele</li>
                    <li>Poptávající zruší poptávku <strong>po</strong> přijetí nabídky od jiného Dodavatele</li>
                    <li>Dodavatel podal nabídku na poptávku, která neodpovídá jeho specializaci</li>
                    <li>Jakékoliv jiné okolnosti mimo technickou závadu platformy</li>
                  </ul>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.4 Platnost kreditů</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Zakoupené kredity mají platnost <strong>12 měsíců</strong> od data nákupu. Po uplynutí 
                  této lhůty nevyužité kredity automaticky propadají bez náhrady.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.5 Ceny a DPH</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Všechny ceny kreditů uvedené na platformě jsou konečné a zahrnují DPH dle platných 
                  právních předpisů České republiky.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.6 Definice spotřebování Kreditu</h3>
                <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 my-4">
                  <p className="text-foreground/90">
                    Kredit se považuje za <strong>spotřebovaný</strong> a Služba za poskytnutou v okamžiku, kdy Dodavatel 
                    klikne na tlačítko pro odemčení kontaktních údajů Poptávajícího (nebo odeslání prvního vzkazu). 
                    Tímto okamžikem Provozovatel splnil svou povinnost zpřístupnit poptávané informace.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3.7 Absence garance výsledku</h3>
                <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 my-4">
                  <p className="text-foreground/90 font-semibold mb-2">
                    Provozovatel (Zrobee) negarantuje:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-foreground/80">
                    <li>Že Poptávající na kontakt zareaguje nebo zvedne telefon</li>
                    <li>Že Poptávající s Dodavatelem uzavře smlouvu o dílo</li>
                  </ul>
                </div>
                <p className="text-foreground/80 leading-relaxed">
                  Uživatel bere na vědomí, že hradí poplatek za <strong>obchodní příležitost (lead)</strong> a 
                  přístup k datům, nikoliv za zprostředkování zakázky jako takové. Neúspěch v jednání 
                  s Poptávajícím, jeho nečinnost nebo výběr jiného dodavatele není vadou Služby a 
                  <strong> nezakládá nárok na vrácení kreditů</strong>.
                </p>
              </section>

              {/* Article 4 */}
              <section id="odpovednost" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b">
                  Článek 4: Odpovědnost
                </h2>

                <HumanSummary>
                  Za kvalitu odvedené práce ručí řemeslník, ne my. Platby si vyřizujete mezi sebou. 
                  Když nám spadne server, nenahradíme vám ušlý zisk.
                </HumanSummary>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4.1 Omezení odpovědnosti Provozovatele</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Provozovatel jako zprostředkovatel <strong>neodpovídá za</strong>:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4 mb-4">
                  <li>Kvalitu, rozsah, termín nebo způsob provedení služeb poskytnutých Dodavatelem</li>
                  <li>Platby mezi Poptávajícím a Dodavatelem, včetně jejich neprovedení či prodlení</li>
                  <li>Škody způsobené při provádění služeb nebo v souvislosti s nimi</li>
                  <li>Pravdivost a úplnost informací uvedených uživateli</li>
                  <li>Spory mezi Poptávajícím a Dodavatelem</li>
                  <li>Porušení právních předpisů ze strany uživatelů (např. neoprávněné podnikání)</li>
                </ul>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4.2 Vyšší moc a technické výpadky</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Provozovatel neodpovídá za škody vzniklé v důsledku:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4 mb-4">
                  <li>Výpadků serverů, internetového připojení nebo jiných technických problémů</li>
                  <li>Plánované údržby platformy</li>
                  <li>Kybernetických útoků nebo bezpečnostních incidentů</li>
                  <li>Vyšší moci (přírodní katastrofy, pandemie, válečné konflikty apod.)</li>
                </ul>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <p className="text-foreground/80">
                    <strong>Ušlý zisk:</strong> Provozovatel v žádném případě neodpovídá za ušlý zisk, 
                    ztracené příležitosti nebo nepřímé škody vzniklé v souvislosti s nedostupností 
                    nebo omezenou funkčností platformy.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4.3 Odpovědnost uživatelů</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Uživatelé jsou plně odpovědní za:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
                  <li>Obsah svých poptávek, nabídek a profilů</li>
                  <li>Dodržování smluvních závazků vůči ostatním uživatelům</li>
                  <li>Dodržování právních předpisů při poskytování služeb (živnostenský zákon, daňové předpisy apod.)</li>
                  <li>Škody způsobené třetím osobám v souvislosti s používáním platformy</li>
                </ul>
              </section>

              {/* Article 5 */}
              <section id="zaverecna" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6 pb-2 border-b">
                  Článek 5: Závěrečná ustanovení
                </h2>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.1 Rozhodné právo</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Tyto VOP a veškeré právní vztahy vznikající v souvislosti s používáním platformy se řídí 
                  <strong> právním řádem České republiky</strong>, zejména zákonem č. 89/2012 Sb., občanský zákoník, 
                  a zákonem č. 480/2004 Sb., o některých službách informační společnosti.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.2 Příslušnost soudů</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Pro řešení sporů vzniklých z těchto VOP nebo v souvislosti s nimi jsou příslušné 
                  <strong> soudy České republiky</strong>, místně příslušné podle sídla Provozovatele, 
                  pokud kogentní právní předpisy nestanoví jinak.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.3 Změny obchodních podmínek</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Provozovatel si vyhrazuje právo tyto VOP jednostranně měnit. O změnách bude Provozovatel 
                  informovat uživatele prostřednictvím e-mailu nebo oznámení na platformě nejméně 
                  <strong> 30 dní</strong> před nabytím účinnosti změn.
                </p>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Pokračováním v používání platformy po nabytí účinnosti změn uživatel vyjadřuje souhlas 
                  s novým zněním VOP.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.4 Salvátorská klauzule</h3>
                <p className="text-foreground/80 leading-relaxed mb-4">
                  Je-li nebo stane-li se některé ustanovení těchto VOP neplatným, neúčinným nebo 
                  nevymahatelným, nedotýká se to platnosti, účinnosti a vymahatelnosti ostatních ustanovení.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.5 Kontaktní údaje</h3>
                <div className="bg-muted/50 p-6 rounded-lg mb-8">
                  <p className="text-foreground/80 mb-2">
                    <strong>Provozovatel:</strong> Zrobee s.r.o.
                  </p>
                  <p className="text-foreground/80 mb-2">
                    <strong>Sídlo:</strong> [DOPLNIT ADRESU]
                  </p>
                  <p className="text-foreground/80 mb-2">
                    <strong>IČO:</strong> [DOPLNIT]
                  </p>
                  <p className="text-foreground/80 mb-2">
                    <strong>DIČ:</strong> [DOPLNIT]
                  </p>
                  <p className="text-foreground/80">
                    <strong>E-mail:</strong>{" "}
                    <a href="mailto:info@zrobee.cz" className="text-primary hover:underline">
                      info@zrobee.cz
                    </a>
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.6 Účinnost</h3>
                <p className="text-foreground/80 leading-relaxed mb-6">
                  Tyto obchodní podmínky nabývají účinnosti dnem 1. ledna 2025.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5.7 Mimosoudní řešení sporů</h3>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <p className="text-foreground/80 leading-relaxed mb-4">
                    V případě vzniku spotřebitelského sporu mezi Provozovatelem a Uživatelem-spotřebitelem, 
                    který se nepodaří vyřešit vzájemnou dohodou, má Uživatel právo na mimosoudní 
                    řešení spotřebitelského sporu.
                  </p>
                  <p className="text-foreground/80 leading-relaxed mb-4 font-semibold">
                    Subjektem mimosoudního řešení je:
                  </p>
                  <p className="text-foreground/80 leading-relaxed mb-4">
                    Česká obchodní inspekce<br />
                    Ústřední inspektorát – oddělení ADR<br />
                    Štěpánská 15, 120 00 Praha 2<br />
                    Web: <a href="https://adr.coi.cz" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">adr.coi.cz</a>
                  </p>
                  <p className="text-foreground/80 leading-relaxed">
                    Uživatel může využít rovněž platformu pro řešení sporů on-line zřízenou 
                    Evropskou komisí na adrese: <a href="http://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr/</a>.
                  </p>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>
      </div>
    </DetailLayout>
  );
};

export default Terms;
