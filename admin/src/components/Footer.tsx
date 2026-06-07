import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookieSettingsDialog } from "./CookieConsentBanner";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import TopPseoLinks from "@/components/seo/TopPseoLinks";

const Footer = () => {
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const isNativeApp = useIsNativeApp();
  const navigate = useNavigate();

  if (isNativeApp) return null;

  return (
    <footer className="text-xs" style={{ background: 'hsl(100 8% 88%)' }}>
      {/* CTA Banners */}
      <div className="px-4 md:px-8 lg:px-[150px] pt-10 pb-6">
        <div className="grid md:grid-cols-2 gap-3 mb-10">
          <div className="bg-background rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Vyřešte své starosti s profíky</h3>
              <p className="text-xs text-muted-foreground font-normal mt-1">Zadejte poptávku zdarma</p>
            </div>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-dark-green text-white hover:bg-dark-green/90 border-0 text-xs"
            >
              <Link to="/nova-poptavka">Poptat</Link>
            </Button>
          </div>
          <div className="bg-background rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Nabízíte své služby?</h3>
              <p className="text-xs text-muted-foreground font-normal mt-1">Registrujte se a získejte zakázky</p>
            </div>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-0 text-xs"
            >
              <Link to="/registrace-remeslnika">Registrovat</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8">
          <div>
            <h3 className="font-bold text-foreground mb-4 uppercase text-[10px] tracking-wider">Společnost</h3>
            <ul className="space-y-2.5">
              <li><Link to="/o-zrobee" className="text-muted-foreground hover:text-foreground transition-colors">O Zrobee</Link></li>
              <li><Link to="/proc-zrobee" className="text-muted-foreground hover:text-foreground transition-colors">Proč Zrobee?</Link></li>
              <li><Link to="/jak-to-funguje" className="text-muted-foreground hover:text-foreground transition-colors">Jak to funguje</Link></li>
              <li><Link to="/kariera" className="text-muted-foreground hover:text-foreground transition-colors">Kariéra</Link></li>
              <li><Link to="/podpora" className="text-muted-foreground hover:text-foreground transition-colors">Podpora</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4 uppercase text-[10px] tracking-wider">Pro zákazníky</h3>
            <ul className="space-y-2.5">
              <li><Link to="/nova-poptavka" className="text-muted-foreground hover:text-foreground transition-colors">Vložit zakázku</Link></li>
              <li><Link to="/remeslnici-v-okoli" className="text-muted-foreground hover:text-foreground transition-colors">Profíci blízko mě</Link></li>
              <li><Link to="/vsechny-sluzby" className="text-muted-foreground hover:text-foreground transition-colors">Procházet služby</Link></li>
              <li><Link to="/adresar" className="text-muted-foreground font-bold hover:text-foreground transition-colors">Adresář služeb</Link></li>
              <li><Link to="/poptavky" className="text-muted-foreground hover:text-foreground transition-colors">Veřejné poptávky</Link></li>
              <li><Link to="/radce" className="text-muted-foreground hover:text-foreground transition-colors">Rady a tipy</Link></li>
            </ul>

            <h3 className="font-bold text-foreground mb-4 mt-8 uppercase text-[10px] tracking-wider">Pro profíky</h3>
            <ul className="space-y-2.5">
              <li><Link to="/registrace-remeslnika" className="text-muted-foreground hover:text-foreground transition-colors">Registrace profesionála</Link></li>
              <li><Link to="/poptavky" className="text-muted-foreground hover:text-foreground transition-colors">Nástěnka zakázek</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4 uppercase text-[10px] tracking-wider">Top profese</h3>
            <ul className="space-y-2.5">
              {[
                { name: "Instalatéři", slug: "instalater" },
                { name: "Elektrikáři", slug: "elektro" },
                { name: "Malíři", slug: "malirske-prace" },
                { name: "Hodinový manžel", slug: "hodinovy-manzel" },
                { name: "Úklid", slug: "uklid" },
              ].map((svc) => (
                <li key={svc.slug}>
                  <Link to={`/sluzby/${svc.slug}`} className="text-muted-foreground hover:text-foreground transition-colors">{svc.name}</Link>
                  <div className="flex flex-wrap gap-x-1.5 mt-1 opacity-70">
                    {["praha", "brno", "ostrava", "plzen", "liberec", "olomouc"].map((city) => (
                      <Link key={city} to={`/sluzby/${svc.slug}/${city}`} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        {city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, " ")}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4 uppercase text-[10px] tracking-wider">Top města</h3>
            <ul className="space-y-2.5">
              {[
                { name: "Praha", slug: "praha" },
                { name: "Brno", slug: "brno" },
                { name: "Plzeň", slug: "plzen" },
                { name: "Liberec", slug: "liberec" },
                { name: "Olomouc", slug: "olomouc" },
                { name: "České Budějovice", slug: "ceske-budejovice" },
                { name: "Hradec Králové", slug: "hradec-kralove" },
                { name: "Pardubice", slug: "pardubice" },
                { name: "Zlín", slug: "zlin" },
              ].map((city) => (
                <li key={city.slug}>
                  <Link to={`/mesta/${city.slug}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="font-bold text-foreground mb-4 mt-8 uppercase text-[10px] tracking-wider">Region Moravskoslezsko</h3>
            <ul className="space-y-2.5">
              {[
                { name: "Ostrava", slug: "ostrava" },
                { name: "Havířov", slug: "havirov" },
                { name: "Frýdek-Místek", slug: "frydek-mistek" },
                { name: "Opava", slug: "opava" },
                { name: "Karviná", slug: "karvina" },
              ].map((city) => (
                <li key={city.slug}>
                  <Link to={`/mesta/${city.slug}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4 uppercase text-[10px] tracking-wider">Právní informace</h3>
            <ul className="space-y-2.5">
              <li><Link to="/podminky" className="text-muted-foreground hover:text-foreground transition-colors">Obchodní podmínky (VOP)</Link></li>
              <li><Link to="/ochrana-udaju" className="text-muted-foreground hover:text-foreground transition-colors">Ochrana osobních údajů (GDPR)</Link></li>
              <li><Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">Zásady cookies</Link></li>
              <li><button onClick={() => setCookieSettingsOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">Nastavení cookies</button></li>
              <li><a href="https://zrobee.cz/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Mapa stránek (XML)</a></li>
            </ul>
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-1.5 text-muted-foreground">
              <p className="font-bold text-foreground text-[11px]">Zrobee s.r.o.</p>
              <p>Václavské náměstí 123</p>
              <p>110 00 Praha 1</p>
              <p className="text-[10px] pt-1">
                <span className="text-foreground/70">IČO:</span> 12345678 · <span className="text-foreground/70">DIČ:</span> CZ12345678
              </p>
            </div>
            <div className="flex items-center mt-4">
              <img src="/zrobee-logo.svg" alt="Zrobee" className="h-5 logo-adaptive" />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-foreground/10">
          <TopPseoLinks variant="footer" className="mb-8" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground">
              © {new Date().getFullYear()} Zrobee s.r.o. Všechna práva vyhrazena.
            </div>

            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn"><Linkedin className="h-5 w-5" /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter"><Twitter className="h-5 w-5" /></a>
            </div>
          </div>
        </div>
      </div>
      
      <CookieSettingsDialog open={cookieSettingsOpen} onOpenChange={setCookieSettingsOpen} />
    </footer>
  );
};

export default Footer;
