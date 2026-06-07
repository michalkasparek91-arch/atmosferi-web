import DetailLayout from "@/components/DetailLayout";

import { Search, MessageCircle, FileText, HelpCircle, Users, Shield, CreditCard, Wrench, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Article {
  title: string;
  content: React.ReactNode;
}

interface Category {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  articles: Article[];
}

const Support = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);

  const helpCategories: Category[] = [
    {
      icon: Users,
      title: "Začínáme",
      description: "První kroky na platformě",
      articles: [
        {
          title: "Jak vytvořit účet",
          content: (
            <div className="space-y-4">
              <p>Registrace je jednoduchá a zdarma.</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Klikněte na tlačítko <strong>"Registrovat"</strong> v pravém horním rohu.</li>
                <li>Vyberte, zda hledáte pomoc (<strong>Poptávající</strong>) nebo nabízíte služby (<strong>Dodavatel</strong>).</li>
                <li>Zadejte svůj email a bezpečné heslo, nebo využijte rychlé přihlášení přes Google/Facebook.</li>
                <li>Potvrďte svůj email kliknutím na odkaz ve vaší schránce.</li>
              </ol>
            </div>
          )
        },
        {
          title: "Jak funguje platforma",
          content: (
            <div className="space-y-4">
              <p><strong>Zrobee.cz</strong> je tržiště služeb, které funguje jako zprostředkovatel kontaktu.</p>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Poptávající</strong> zadá poptávku zdarma.</li>
                <li><strong>Dodavatelé</strong> (řemeslníci) si zobrazí detail poptávky.</li>
                <li>Pokud má Dodavatel zájem, uhradí malý poplatek (v kreditech) za odemčení kontaktu na Poptávajícího.</li>
              </ol>
              <p className="mt-4 p-4 bg-muted rounded-lg">
                Samotná domluva, realizace a platba za práci probíhá přímo mezi Poptávajícím a Dodavatelem. 
                <strong> Zrobee do tohoto procesu již nezasahuje a nebere si žádné provize.</strong>
              </p>
            </div>
          )
        },
        {
          title: "Nastavení profilu",
          content: (
            <div className="space-y-4">
              <p>Kvalitní profil je základem úspěchu.</p>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Pro Dodavatele:</h4>
                  <p>V sekci "Můj profil" nahrajte reálnou profilovou fotografii, popište své zkušenosti a nahrajte ukázky předchozích prací. Vyplněný profil zvyšuje šanci na získání zakázky.</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Pro Poptávající:</h4>
                  <p>Uveďte správné kontaktní údaje. Vaše telefonní číslo je skryté a zobrazí se pouze vybraným řemeslníkům.</p>
                </div>
              </div>
            </div>
          )
        },
        {
          title: "Bezpečnostní tipy",
          content: (
            <div className="space-y-4">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Smlouva:</strong> U větších zakázek vždy doporučujeme sepsat písemnou smlouvu o dílo nebo předávací protokol.
                  </div>
                </li>
                <li className="flex gap-3">
                  <CreditCard className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Platby:</strong> Nikdy neposílejte řemeslníkovi celou částku předem bez dokladu.
                  </div>
                </li>
                <li className="flex gap-3">
                  <MessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Komunikace:</strong> Prvotní detaily si vyjasněte v chatu na platformě, abyste měli historii komunikace.
                  </div>
                </li>
              </ul>
            </div>
          )
        },
      ]
    },
    {
      icon: FileText,
      title: "Pro zákazníky",
      description: "Hledání služeb",
      articles: [
        {
          title: "Jak vytvořit zakázku",
          content: (
            <div className="space-y-4">
              <p>Klikněte na <strong>"Zadat poptávku"</strong>. Vyberte kategorii (např. Instalatér), popište problém co nejpřesněji a přidejte lokalitu.</p>
              <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                <strong>Tip:</strong> Přidejte fotografie (např. kapajícího kohoutku). Poptávky s fotkou mají o <strong>40 % rychlejší odezvu</strong>.
              </div>
            </div>
          )
        },
        {
          title: "Jak vybrat pracovníka",
          content: (
            <div className="space-y-4">
              <p>Po zadání poptávky se vám začnou ozývat Dodavatelé. V jejich profilu sledujte:</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="w-2 h-2 bg-foreground rounded-full mt-2" />
                  <div>
                    <strong>Odznak "Ověřeno":</strong> Dodavatel doložil svou identitu a IČO.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-2 h-2 bg-foreground rounded-full mt-2" />
                  <div>
                    <strong>Recenze:</strong> Zkušenosti ostatních uživatelů.
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="w-2 h-2 bg-foreground rounded-full mt-2" />
                  <div>
                    <strong>Portfolio:</strong> Fotografie předchozích realizací.
                  </div>
                </li>
              </ul>
            </div>
          )
        },
        {
          title: "Komunikace s pracovníky",
          content: (
            <div className="space-y-4">
              <p>Jakmile Dodavatel "odemkne" vaši poptávku, získá vaše telefonní číslo a může vás kontaktovat (hovor/SMS) nebo vám napsat přes interní chat Zrobee.</p>
              <p className="font-medium">Vy uvidíte číslo Dodavatele také.</p>
            </div>
          )
        },
        {
          title: "Hodnocení a recenze",
          content: (
            <div className="space-y-4">
              <p>Hodnocení je klíčové pro kvalitu tržiště.</p>
              <p>Recenzi můžete udělit až poté, co došlo k prokazatelnému propojení s Dodavatelem. Odkaz na formulář hodnocení najdete u své poptávky po uplynutí předpokládaného data realizace.</p>
            </div>
          )
        },
      ]
    },
    {
      icon: Wrench,
      title: "Pro pracovníky",
      description: "Nabízení služeb",
      articles: [
        {
          title: "Jak získat první zakázky",
          content: (
            <div className="space-y-4">
              <p>Začátky mohou být těžké. Doporučujeme:</p>
              <ul className="space-y-2">
                <li className="flex gap-2 items-start">
                  <span className="text-primary font-bold">1.</span>
                  Vyplnit profil na 100 % a nahrát fotku tváře (ne jen logo).
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-primary font-bold">2.</span>
                  Získat odznak "Ověřeno" nahráním dokladů.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-primary font-bold">3.</span>
                  Reagovat na poptávky rychle – první 3 volající mají největší šanci.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-primary font-bold">4.</span>
                  Požádat první spokojené klienty o recenzi.
                </li>
              </ul>
            </div>
          )
        },
        {
          title: "Systém bodů (Kredity)",
          content: (
            <div className="space-y-4">
              <p>Zrobee funguje na principu <strong>"Pay-to-Contact"</strong>. Neplatíte provize z ceny zakázky. Platíte pouze Kredity za zobrazení telefonního čísla zákazníka.</p>
              <ul className="space-y-2 mt-4">
                <li className="flex gap-2 items-center">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Cena kontaktu se pohybuje typicky mezi <strong>1 až 10 kredity</strong> (dle hodnoty zakázky).
                </li>
                <li className="flex gap-2 items-center">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Kredity nakoupíte v balíčcích v sekci <strong>"Dobít kredity"</strong>.
                </li>
              </ul>
            </div>
          )
        },
        {
          title: "Vytvoření nabídky",
          content: (
            <div className="space-y-4">
              <p>Když vás poptávka zaujme, klikněte na <strong>"Odemknout kontakt"</strong>.</p>
              <p>Tím se vám strhnou kredity a zobrazí se telefon zákazníka. Ihned poté mu zavolejte nebo napište zprávu s vaší cenovou nabídkou a termínem.</p>
            </div>
          )
        },
        {
          title: "Správa profilu pracovníka",
          content: (
            <div className="space-y-4">
              <p>V sekci <strong>"Nastavení"</strong> si můžete nastavit notifikace na nové zakázky ve vašem okolí.</p>
              <p>Udržujte své údaje (IČO, telefon) aktuální. <strong>Neaktivní profily mohou být dočasně skryty.</strong></p>
            </div>
          )
        },
      ]
    },
    {
      icon: Shield,
      title: "Bezpečnost",
      description: "Ochrana a soukromí",
      articles: [
        {
          title: "Bezpečné používání platformy",
          content: (
            <div className="space-y-4">
              <p>Dodržujte naše <strong>"Desatero bezpečnosti"</strong>. Nikdy nesdílejte hesla.</p>
              <p>Pokud vás někdo žádá o podezřelé platby mimo běžnou praxi, <strong>nahlaste ho</strong>.</p>
            </div>
          )
        },
        {
          title: "Ochrana osobních údajů (GDPR)",
          content: (
            <div className="space-y-4">
              <p>Vaše data jsou u nás v bezpečí.</p>
              <p>Telefonní čísla Poptávajících jsou maskovaná a odkrýváme je pouze omezenému počtu ověřených Dodavatelů za účelem zprostředkování služby.</p>
              <p className="mt-4">
                Více viz sekce <Link to="/ochrana-udaju" className="text-primary hover:underline">"Zásady ochrany osobních údajů"</Link>.
              </p>
            </div>
          )
        },
        {
          title: "Jak nahlásit problém",
          content: (
            <div className="space-y-4">
              <p>U každého profilu uživatele a u každé poptávky najdete tlačítko/ikonu <strong>"Nahlásit"</strong>.</p>
              <p>Využijte ji, pokud obsah porušuje pravidla, je urážlivý nebo se jedná o spam.</p>
            </div>
          )
        },
        {
          title: "Ověřování pracovníků",
          content: (
            <div className="space-y-4">
              <p>Proces verifikace zvyšuje důvěru.</p>
              <p>Vyžadujeme scan <strong>Občanského průkazu</strong> (pro ověření identity) a <strong>IČO</strong> (pro ověření podnikatelského oprávnění).</p>
              <p className="p-4 bg-muted rounded-lg mt-4">
                Dokumenty jsou bezpečně uloženy a slouží pouze k jednorázové kontrole administrátorem.
              </p>
            </div>
          )
        },
      ]
    },
    {
      icon: CreditCard,
      title: "Platby a body",
      description: "Platební informace",
      articles: [
        {
          title: "Jak nakoupit body",
          content: (
            <div className="space-y-4">
              <p>Přejděte do sekce <strong>"Můj profil → Peněženka/Kredity"</strong>.</p>
              <p>Vyberte si balíček (např. Start, Profi) a klikněte na <strong>"Koupit"</strong>.</p>
            </div>
          )
        },
        {
          title: "Platební metody",
          content: (
            <div className="space-y-4">
              <p>Podporujeme bezpečné online platby:</p>
              <ul className="space-y-2 mt-2">
                <li className="flex gap-2 items-center">
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  Platební kartou (Visa, Mastercard) přes bránu Stripe
                </li>
                <li className="flex gap-2 items-center">
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  Rychlé bankovní převody
                </li>
              </ul>
              <p className="mt-4 font-medium">Kredity jsou připsány ihned po potvrzení platby.</p>
            </div>
          )
        },
        {
          title: "Fakturace",
          content: (
            <div className="space-y-4">
              <p>Jsme plátci DPH.</p>
              <p>Ke každému nákupu kreditů automaticky vystavujeme <strong>zjednodušený daňový doklad</strong>, který vám přijde na email a je archivován ve vašem profilu.</p>
            </div>
          )
        },
        {
          title: "Vrácení peněz (Reklamační řád)",
          content: (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border-l-4 border-foreground">
                <h4 className="font-semibold mb-2">Reklamace kontaktu:</h4>
                <p>Kredity vracíme, pokud je telefonní číslo neexistující.</p>
              </div>
              <div className="p-4 bg-muted rounded-lg border-l-4 border-muted-foreground">
                <h4 className="font-semibold mb-2">Nevratné případy:</h4>
                <p>Kredity nevracíme, pokud se zákazník rozhodl pro jiného dodavatele, nezvedá telefon nebo si realizaci rozmyslel.</p>
                <p className="mt-2 text-sm text-muted-foreground">Toto je považováno za běžné podnikatelské riziko spojené s nákupem leadu (kontaktu).</p>
              </div>
            </div>
          )
        },
      ]
    },
    {
      icon: HelpCircle,
      title: "Řešení problémů",
      description: "Časté technické problémy",
      articles: [
        {
          title: "Nemohu se přihlásit",
          content: (
            <div className="space-y-4">
              <p>Zkontrolujte, zda:</p>
              <ul className="space-y-2">
                <li className="flex gap-2 items-start">
                  <span className="text-primary">•</span>
                  Zadáváte správný email (bez překlepů)
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-primary">•</span>
                  Nemáte zapnutý Caps Lock
                </li>
              </ul>
              <p className="mt-4">Pokud problém přetrvává, zkuste vymazat cookies v prohlížeči.</p>
            </div>
          )
        },
        {
          title: "Zapomenuté heslo",
          content: (
            <div className="space-y-4">
              <p>Na přihlašovací obrazovce klikněte na <strong>"Zapomněl jsem heslo"</strong>.</p>
              <p>Zadejte registrační email a my vám pošleme instrukce pro reset hesla.</p>
            </div>
          )
        },
        {
          title: "Chyby na platformě",
          content: (
            <div className="space-y-4">
              <p>Narazili jste na technickou chybu?</p>
              <p>Udělejte prosím <strong>snímek obrazovky (screenshot)</strong> a pošlete nám ho na <a href="mailto:podpora@zrobee.cz" className="text-primary hover:underline">podpora@zrobee.cz</a> s popisem situace.</p>
              <p className="text-muted-foreground">Pomůže nám to chybu rychleji opravit.</p>
            </div>
          )
        },
        {
          title: "Kontaktování podpory",
          content: (
            <div className="space-y-4">
              <p>Jsme tu pro vás v pracovní dny od <strong>9:00 do 17:00</strong>.</p>
              <p>
                Email: <a href="mailto:podpora@zrobee.cz" className="text-primary hover:underline font-medium">podpora@zrobee.cz</a>
              </p>
              <p className="text-muted-foreground">Na dotazy obvykle odpovídáme do 24 hodin.</p>
            </div>
          )
        },
      ]
    },
  ];

  const popularArticles = [
    { title: "Jak vytvořit účet na Zrobee", category: "Začínáme", articleIndex: 0 },
    { title: "Jak funguje systém bodů pro pracovníky", category: "Pro pracovníky", articleIndex: 1 },
    { title: "Jak vybrat spolehlivého pracovníka", category: "Pro zákazníky", articleIndex: 1 },
    { title: "Ověřování pracovníků", category: "Bezpečnost", articleIndex: 3 },
    { title: "Vrácení peněz", category: "Platby a body", articleIndex: 3 },
  ];

  const handleArticleClick = (article: Article, category: Category) => {
    setSelectedArticle(article);
    setSelectedCategory(category);
    setArticleDialogOpen(true);
  };

  const handlePopularArticleClick = (article: typeof popularArticles[0]) => {
    const category = helpCategories.find(c => c.title === article.category);
    if (category) {
      handleArticleClick(category.articles[article.articleIndex], category);
    }
  };

  const filteredCategories = helpCategories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <DetailLayout title="Nápověda">
      
      <main className="container mx-auto px-8 md:px-16 lg:px-24 py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Centrum nápovědy
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Najděte odpovědi na vaše otázky nebo nás kontaktujte pro podporu
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Hledat v nápovědě..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </section>

        {/* Popular Articles */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Oblíbené články
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {popularArticles.map((article, index) => (
              <button
                key={index}
                onClick={() => handlePopularArticleClick(article)}
                className="px-4 py-2 bg-card rounded-full text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
              >
                {article.title}
              </button>
            ))}
          </div>
        </section>

        {/* Help Categories */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            Procházet podle kategorie
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="bg-card rounded-3xl p-6 shadow-sm text-left"
                >
                  <div className="w-12 h-12 bg-foreground rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-background" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      <li key={articleIndex}>
                        <button
                          onClick={() => handleArticleClick(article, category)}
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors w-full text-left"
                        >
                          <ChevronRight className="w-3 h-3 flex-shrink-0" />
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Support */}
        <section className="bg-primary/10 rounded-3xl p-12 text-center">
          <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Stále potřebujete pomoc?
          </h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Náš tým podpory je tu pro vás v pracovní dny od 9:00 do 17:00.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="mailto:podpora@zrobee.cz"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
            >
              Kontaktovat podporu
            </a>
            <Link
              to="/zakaznik/zpravy"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-card text-foreground font-medium hover:bg-muted transition-colors border border-border"
            >
              Živý chat
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Často kladené otázky
          </h2>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card rounded-2xl px-6 border-none shadow-sm">
                <AccordionTrigger className="text-foreground hover:no-underline">
                  Je registrace na platformě zdarma?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ano, registrace i vytváření zakázek je pro zákazníky zcela zdarma. 
                  Pracovníci platí pouze za odemčení kontaktů pomocí systému kreditů.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card rounded-2xl px-6 border-none shadow-sm">
                <AccordionTrigger className="text-foreground hover:no-underline">
                  Jak dlouho trvá, než obdržím nabídky?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Většina zákazníků obdrží první kontakt do 24 hodin od vytvoření zakázky. 
                  Rychlost závisí na typu služby a lokalitě.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card rounded-2xl px-6 border-none shadow-sm">
                <AccordionTrigger className="text-foreground hover:no-underline">
                  Jsou pracovníci ověřeni?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Pracovníci s odznakem "Ověřeno" doložili svou identitu a IČO. 
                  Můžete si také prohlédnout jejich profily, portfolia a recenze před výběrem.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card rounded-2xl px-6 border-none shadow-sm">
                <AccordionTrigger className="text-foreground hover:no-underline">
                  Berete si provizi z ceny zakázky?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ne. Zrobee funguje na modelu "Pay-to-Contact". Řemeslníci platí pouze za odemčení kontaktu. 
                  Samotná platba za práci probíhá přímo mezi vámi a řemeslníkem bez jakýchkoliv provizí.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-card rounded-2xl px-6 border-none shadow-sm">
                <AccordionTrigger className="text-foreground hover:no-underline">
                  Mohu změnit svou registraci z pracovníka na zákazníka?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Ano, v hlavičce stránky najdete tlačítko pro přepnutí mezi účty. 
                  Můžete mít aktivní oba typy účtů současně.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      

      {/* Article Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && selectedCategory && (
            <div>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <selectedCategory.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedCategory.title}</span>
                </div>
                <DialogTitle className="text-xl text-center">{selectedArticle.title}</DialogTitle>
              </DialogHeader>
              <div className="mt-6 text-foreground">
                {selectedArticle.content}
              </div>
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Další články v této kategorii</p>
                <ul className="space-y-2">
                  {selectedCategory.articles
                    .filter(a => a.title !== selectedArticle.title)
                    .map((article, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => setSelectedArticle(article)}
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {article.title}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DetailLayout>
  );
};

export default Support;
