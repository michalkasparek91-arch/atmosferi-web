// Central place for page titles shown in the top header (and used as the single H1 for SEO).

const PAGE_META: Record<string, { title: string; description?: string }> = {
  // Public pages
  "/": { title: "", description: "Najděte kvalitní řemeslníky a profesionály pro všechny vaše potřeby. Od instalatérů po elektrikáře, stavbu domu až po zahradnictví." },
  "/jak-to-funguje": { title: "Jak to funguje", description: "Zjistěte, jak snadno najít řemeslníka přes Zrobee. Zadejte poptávku, porovnejte nabídky a vyberte si nejlepšího odborníka." },
  "/o-nas": { title: "O nás", description: "Poznejte tým Zrobee – platforma, která spojuje zákazníky s kvalitními řemeslníky a profesionály po celé ČR." },
  "/vsechny-sluzby": { title: "Všechny služby", description: "Kompletní přehled řemeslnických a profesionálních služeb dostupných na Zrobee – od stavby po vzdělávání." },
  "/kariera": { title: "Kariéra", description: "Připojte se k týmu Zrobee. Hledáme šikovné lidi, kteří chtějí měnit svět řemeslných služeb." },
  "/podpora": { title: "Podpora", description: "Potřebujete pomoc? Kontaktujte podporu Zrobee – jsme tu pro vás." },
  "/prihlaseni": { title: "Přihlášení", description: "Přihlaste se do svého účtu Zrobee nebo si vytvořte nový." },
  "/registrace-remeslnika": { title: "Registrace řemeslníka", description: "Zaregistrujte se jako řemeslník na Zrobee a začněte získávat nové zakázky ještě dnes." },
  "/ochrana-udaju": { title: "Ochrana osobních údajů", description: "Informace o ochraně osobních údajů a zásady zpracování dat na platformě Zrobee." },
  "/podminky": { title: "Podmínky", description: "Obchodní podmínky používání platformy Zrobee." },
  "/prohlizet-zakazky": { title: "Dostupné zakázky", description: "Prohlédněte si aktuální poptávky zákazníků a najděte zakázky ve vašem oboru." },
  "/body-info": { title: "Jak fungují body", description: "Vše o kreditovém systému Zrobee – jak body získat, používat a co vám přinesou." },

  // Auth (already covered above with description)

  // Worker
  "/remeslnik/hledej": { title: "Hledej nové zakázky" },
  "/remeslnik/nabidky": { title: "Odeslané nabídky" },
  "/remeslnik/probihajici": { title: "Probíhající zakázky" },
  "/remeslnik/kalendar": { title: "Kalendář" },
  "/remeslnik/zpravy": { title: "Zprávy" },
  "/remeslnik/nastaveni": { title: "Nastavení" },
  "/remeslnik/nastaveni/oznameni": { title: "Oznámení" },
  "/remeslnik/nastaveni/sluzby": { title: "Služby a lokalita" },
  "/remeslnik/nastaveni/ucet": { title: "Správa účtu" },
  "/remeslnik/fakturace": { title: "Fakturace" },
  "/remeslnik/zakazka": { title: "Detail zakázky" },

  // Customer
  "/zakaznik/poptavky": { title: "Moje poptávky" },
  "/zakaznik/nova-zakazka": { title: "Vytvořit poptávku" },
  "/zakaznik/prehled": { title: "Přehled" },
  "/zakaznik/nastaveni": { title: "Nastavení" },
  "/zakaznik/profici": { title: "Profíci" },
  "/zakaznik/zpravy": { title: "Zprávy" },
};

// Helpers for dynamic city × service landing pages
const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function dynamicMeta(pathname: string): { title: string; description: string } | null {
  // /cenik/:serviceSlug
  const priceMatch = pathname.match(/^\/cenik\/([^/]+)\/?$/);
  if (priceMatch) {
    const service = titleCase(priceMatch[1]);
    return {
      title: `Ceník ${service} 2026 | Orientační ceny řemeslníků`,
      description: `Aktuální ceník pro ${service.toLowerCase()} pro rok 2026. Zjistěte běžné ceny, co ovlivňuje rozpočet a získejte přesnou nabídku zdarma od profíků na Zrobee.`,
    };
  }

  // /sluzby/:categorySlug/:subcategorySlug/:citySlug
  const subCityMatch = pathname.match(/^\/sluzby\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (subCityMatch && subCityMatch[2] !== "kraj") {
    const subcat = titleCase(subCityMatch[2]);
    const city = titleCase(subCityMatch[3]);
    return {
      title: `Nejlepší ${subcat} ${city} | Ověření profíci a recenze`,
      description: `Hledáte ${subcat.toLowerCase()} v lokalitě ${city}? Máme prověřené řemeslníky v okolí. Porovnejte recenze, portfolia a získejte nabídky zdarma na Zrobee.`,
    };
  }

  // /sluzby/:categorySlug/:citySlug
  const cityMatch = pathname.match(/^\/sluzby\/([^/]+)\/([^/]+)\/?$/);
  if (cityMatch) {
    const cat = titleCase(cityMatch[1]);
    const city = titleCase(cityMatch[2]);
    return {
      title: `${cat} ${city} | Prověření řemeslníci a ceny 2026`,
      description: `Najděte ověřené profíky pro ${cat.toLowerCase()} v ${city}. Máme desítky specialistů v okolí. Porovnejte nabídky a recenze. Zadání poptávky zdarma.`,
    };
  }
  // /sluzby/:categorySlug
  const catMatch = pathname.match(/^\/sluzby\/([^/]+)\/?$/);
  if (catMatch) {
    const cat = titleCase(catMatch[1]);
    return {
      title: `${cat} | Ověření řemeslníci po celé ČR`,
      description: `Hledáte odborníka na ${cat.toLowerCase()}? Najděte ověřené řemeslníky ve vašem okolí, recenze a ceny. Získejte nabídky zdarma.`,
    };
  }
  return null;
}

export function getPageTitle(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";

  // Handle dynamic routes
  if (path.startsWith("/remeslnik/zakazka/")) return PAGE_META["/remeslnik/zakazka"]?.title ?? "Detail zakázky";
  if (path.startsWith("/zakaznik/zakazka/")) return PAGE_META["/zakaznik/zakazka"]?.title ?? "Detail zakázky";

  const dyn = dynamicMeta(path);
  if (dyn) return dyn.title;

  return PAGE_META[path]?.title ?? null;
}

export function getPageDescription(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const dyn = dynamicMeta(path);
  if (dyn) return dyn.description;
  return PAGE_META[path]?.description ?? null;
}
