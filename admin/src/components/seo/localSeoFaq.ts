import { getLocativeForCity, getPreposition } from "@/lib/city-regions";

export interface LocalSeoFaqItem {
  q: string;
  a: string;
}

const safeCap = (str: string | null | undefined) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Category-aware FAQ extras — keyed by lowercase keyword in category name
const categorySpecificFaqs: { match: RegExp; build: (city: string, prep: string, loc: string) => LocalSeoFaqItem[] }[] = [
  {
    match: /elektr|hlin/i,
    build: (city, prep, loc) => [
      {
        q: `Vyplatí se ${prep} ${loc} vyměnit hliníkové rozvody za měď?`,
        a: `Ano. Hliníkové rozvody jsou v panelácích ${prep} ${loc} běžnou příčinou poruch a požárů. Výměna se obvykle vrátí v podobě nižších rizik a vyšší prodejní hodnoty bytu.`,
      },
      {
        q: `Kolik stojí revize elektro ${prep} ${loc}?`,
        a: `Revize bytu se ${prep} ${loc} pohybuje obvykle mezi 2 500–5 000 Kč. Cena závisí na počtu okruhů a stáří instalace. Přesnou nabídku získáte přes Zrobee zdarma.`,
      },
    ],
  },
  {
    match: /instalat|voda|odpad/i,
    build: (city, prep, loc) => [
      {
        q: `Kdo ${prep} ${loc} přijede na havárii vody i o víkendu?`,
        a: `Mnoho instalatérů na Zrobee nabízí pohotovostní výjezdy ${prep} ${loc} včetně víkendů. Při vytváření poptávky označte „urgentní" — profíci dostanou přednostní upozornění.`,
      },
      {
        q: `Co když odpad teče opakovaně? Stačí čištění?`,
        a: `Občas je problém v zaneseném sifonu, ale pokud se odpad ucpává opakovaně, doporučujeme kamerovou inspekci. Profíci ${prep} ${loc} ji běžně nabízí jako součást diagnostiky.`,
      },
    ],
  },
  {
    match: /hodinov|manžel|drobn/i,
    build: (city, prep, loc) => [
      {
        q: `Co všechno hodinový manžel ${prep} ${loc} udělá?`,
        a: `Pověšení obrazů, montáž nábytku z IKEA, drobné opravy klik a baterií, výměna žárovek na vysokých stropech. Větší zakázky kombinujte do jednoho výjezdu — ušetříte za dopravu.`,
      },
      {
        q: `Mám si připravit nářadí, nebo si ho profík přiveze?`,
        a: `Hodinoví manželé ${prep} ${loc} si standardně vozí vlastní nářadí. Pokud potřebujete speciální materiál (kotvy do panelu, hmoždinky), domluvte se předem v chatu.`,
      },
    ],
  },
  {
    match: /malíř|maleb|stěn/i,
    build: (city, prep, loc) => [
      {
        q: `Kolik stojí vymalování bytu ${prep} ${loc}?`,
        a: `Bílá výmalba se ${prep} ${loc} pohybuje kolem 70–120 Kč/m² včetně přípravy. Barevné stěny, štuk nebo oprava trhlin cenu navýší. Materiál se obvykle účtuje zvlášť.`,
      },
      {
        q: `Musím si vystěhovat nábytek?`,
        a: `Ne. Většina malířů ${prep} ${loc} si nábytek odsune doprostřed místnosti a zakryje fólií. Drobné věci a obrazy je dobré sundat předem.`,
      },
    ],
  },
  {
    match: /rekonstrukc|stavb|jádr|umakart|koupeln/i,
    build: (city, prep, loc) => [
      {
        q: `Jak dlouho trvá rekonstrukce jádra ${prep} ${loc}?`,
        a: `Standardní rekonstrukce umakartového jádra v paneláku ${prep} ${loc} trvá obvykle 3–5 týdnů. Záleží na rozsahu (jen koupelna vs. kuchyň + WC) a dostupnosti materiálu.`,
      },
      {
        q: `Potřebuji ${prep} ${loc} stavební povolení?`,
        a: `Pro výměnu jádra v bytě obvykle stačí ohlášení správci a SVJ. Větší zásahy (bourání nosných stěn) vyžadují projekt a souhlas statika — to vám profík rád doporučí.`,
      },
    ],
  },
  {
    match: /úklid|čistění/i,
    build: (city, prep, loc) => [
      {
        q: `Jak často objednávat úklid ${prep} ${loc}?`,
        a: `Domácnosti ${prep} ${loc} nejčastěji volí 1× týdně nebo 1× za 14 dní. Pravidelná frekvence bývá levnější než jednorázový úklid.`,
      },
      {
        q: `Vozí firma vlastní prostředky?`,
        a: `Většina úklidových firem ${prep} ${loc} si vozí profesionální chemii i nářadí. Pokud preferujete eko nebo bezvonné prostředky, řekněte to v poptávce.`,
      },
    ],
  },
  {
    match: /zahrad|sek/i,
    build: (city, prep, loc) => [
      {
        q: `Kdy je nejlepší čas na seč trávníku ${prep} ${loc}?`,
        a: `Hlavní sezóna ${prep} ${loc} je duben–říjen. V suchých obdobích sečte méně často a výš (5–7 cm), v dešti je naopak vhodné sečit pravidelněji.`,
      },
    ],
  },
  {
    match: /truhl|nábyt/i,
    build: (city, prep, loc) => [
      {
        q: `Vyrobí truhlář ${prep} ${loc} kuchyň na míru?`,
        a: `Ano. Místní truhláři ${prep} ${loc} dělají kuchyně, vestavěné skříně i atypické díly. Cena za m² běžné kuchyně začíná kolem 8 000–12 000 Kč bez spotřebičů.`,
      },
    ],
  },
];

export const buildLocalSeoFaqs = (categoryName: string, cityName: string): LocalSeoFaqItem[] => {
  const locativeCity = getLocativeForCity(cityName) || cityName;
  const prep = getPreposition(cityName) || "v";
  const seed = hashString(`${categoryName}-${cityName}`);

  const generic: LocalSeoFaqItem[] = [
    {
      q: `Jak rychle najdu profíka na ${categoryName} ${prep} ${locativeCity}?`,
      a: `Na Zrobee najdete volné termíny pro ${locativeCity} často už do 24 hodin. Místní specialisté dostanou upozornění okamžitě.`,
    },
    {
      q: `Jsou řemeslníci na Zrobee ověření?`,
      a: `Ano, spolupracujeme s prověřenými profíky. Každý profil má recenze od reálných zákazníků z vašeho okolí, fotky realizací a transparentní hodnocení.`,
    },
    {
      q: `Kolik stojí služba ${categoryName} ${prep} ${locativeCity}?`,
      a: `Cena závisí na rozsahu práce. ${safeCap(prep)} ${locativeCity} doporučujeme vytvořit bezplatnou poptávku a porovnat konkrétní nabídky od místních profíků.`,
    },
    {
      q: `Jak rychle dostanu nabídky?`,
      a: `U aktivních lokalit jako je ${cityName} přichází první reakce často během několika hodin. Profíci v okolí dostanou upozornění hned po vložení poptávky.`,
    },
    {
      q: `Je zadání poptávky zdarma?`,
      a: `Ano. Zákazník vytvoří poptávku zdarma a nezávazně. Platbu a finální cenu si následně domlouvá přímo s vybraným profíkem.`,
    },
    {
      q: `Co když pro službu ${categoryName} ${prep} ${locativeCity} zatím není volný profík?`,
      a: `Poptávku můžeme rozeslat odborníkům z okolních měst a regionu. Zrobee průběžně rozšiřuje síť profíků i v menších lokalitách.`,
    },
    {
      q: `Jak vybrat nejlepšího odborníka ${prep} ${locativeCity}?`,
      a: `Sledujte hodnocení, počet recenzí, popis zkušeností, fotky dokončených prací a styl komunikace po odeslání poptávky.`,
    },
    {
      q: `Můžu poptat i menší opravu nebo havárii?`,
      a: `Ano. Na Zrobee lze zadat drobnou opravu, pravidelnou údržbu i větší projekt. Čím přesnější popis a fotky přidáte, tím lépe profíci odhadnou cenu.`,
    },
    {
      q: `Vystaví profík daňový doklad?`,
      a: `Mnoho PRO partnerů jsou OSVČ nebo firmy a doklad vystaví. Doporučujeme si tuto možnost potvrdit v chatu ještě před zahájením práce.`,
    },
    {
      q: `Můžu zaplatit kartou nebo převodem?`,
      a: `Způsob platby si domlouváte přímo s profíkem. Většina ${prep} ${locativeCity} přijímá hotovost i převod, část živnostníků i platbu kartou na místě.`,
    },
  ];

  const categoryFaqs = categorySpecificFaqs
    .filter(({ match }) => match.test(categoryName))
    .flatMap(({ build }) => build(cityName, prep, locativeCity));

  // Mix: 2 category-specific (if available) + 2 generic — deterministic per page
  const picked: LocalSeoFaqItem[] = [];
  if (categoryFaqs.length > 0) {
    picked.push(categoryFaqs[seed % categoryFaqs.length]);
    if (categoryFaqs.length > 1) {
      picked.push(categoryFaqs[(seed + 1) % categoryFaqs.length]);
    }
  }
  while (picked.length < 4) {
    const next = generic[(seed + picked.length * 3) % generic.length];
    if (!picked.find((p) => p.q === next.q)) picked.push(next);
    else picked.push(generic[(seed + picked.length * 5 + 1) % generic.length]);
  }
  return picked.slice(0, 4);
};
