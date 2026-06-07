import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getRegionForCity, getCountryForCity } from "@/lib/city-regions";

// Major Czech cities, towns, and villages
const CZECH_CITIES = [
  // Major cities
  "Praha",
  "Brno",
  "Ostrava",
  "Plzeň",
  "Liberec",
  "Olomouc",
  "Ústí nad Labem",
  "České Budějovice",
  "Hradec Králové",
  "Pardubice",
  "Zlín",
  "Havířov",
  "Kladno",
  "Most",
  "Opava",
  "Frýdek-Místek",
  "Jihlava",
  "Teplice",
  "Karviná",
  "Karlovy Vary",
  "Děčín",
  "Chomutov",
  "Jablonec nad Nisou",
  "Mladá Boleslav",
  "Prostějov",
  "Přerov",
  "Třinec",
  "Tábor",
  "Znojmo",
  "Příbram",
  "Cheb",
  "Třebíč",
  "Hodonín",
  "Kroměříž",
  "Vsetín",
  "Sokolov",
  "Nový Jičín",
  "Kolín",
  "Břeclav",
  "Písek",
  "Trutnov",
  "Chrudim",
  "Česká Lípa",
  "Šumperk",
  "Litoměřice",
  "Vyškov",
  "Klatovy",
  "Havlíčkův Brod",
  "Benešov",
  "Uherské Hradiště",
  "Strakonice",
  "Blansko",
  "Žďár nad Sázavou",
  "Ústí nad Orlicí",
  "Kutná Hora",
  "Náchod",
  "Jičín",
  "Turnov",
  "Rokycany",
  "Svitavy",
  "Beroun",
  "Mělník",
  "Čelákovice",
  "Brandýs nad Labem-Stará Boleslav",
  "Neratovice",
  "Říčany",
  "Rakovník",
  "Slaný",
  "Pelhřimov",
  "Jindřichův Hradec",
  "Domažlice",
  "Tachov",
  "Litvínov",
  "Louny",
  "Bílina",
  "Rumburk",
  "Varnsdorf",
  "Semily",
  "Tanvald",
  "Rychnov nad Kněžnou",
  "Dvůr Králové nad Labem",
  "Nové Město nad Metují",
  "Litomyšl",
  "Vysoké Mýto",
  "Boskovice",
  "Kyjov",
  "Veselí nad Moravou",
  "Uherský Brod",
  "Valašské Meziříčí",
  "Rožnov pod Radhoštěm",
  "Kopřivnice",
  "Bohumín",
  "Orlová",
  "Český Těšín",
  "Bruntál",
  "Jeseník",
  // Smaller towns
  "Moravská Třebová",
  "Kralupy nad Vltavou",
  "Poděbrady",
  "Nymburk",
  "Lysá nad Labem",
  "Milovice",
  "Čáslav",
  "Hlinsko",
  "Polička",
  "Česká Třebová",
  "Lanškroun",
  "Žamberk",
  "Králíky",
  "Choceň",
  "Holice",
  "Moravské Budějovice",
  "Dačice",
  "Telč",
  "Bystřice nad Pernštejnem",
  "Velké Meziříčí",
  "Nové Město na Moravě",
  "Chotěboř",
  "Světlá nad Sázavou",
  "Humpolec",
  "Pacov",
  "Kamenice nad Lipou",
  "Počátky",
  "Slavonice",
  "Studená",
  "Mikulov",
  "Hustopeče",
  "Pohořelice",
  "Ivančice",
  "Rosice",
  "Tišnov",
  "Kuřim",
  "Šlapanice",
  "Slavkov u Brna",
  "Bučovice",
  "Rousínov",
  "Židlochovice",
  "Moravský Krumlov",
  "Miroslav",
  "Vranov nad Dyjí",
  "Strážnice",
  "Bzenec",
  "Vracov",
  "Dubňany",
  "Ratíškovice",
  "Luhačovice",
  "Vizovice",
  "Napajedla",
  "Otrokovice",
  "Staré Město",
  "Kunovice",
  "Nivnice",
  "Bojkovice",
  "Slavičín",
  "Brumov-Bylnice",
  "Valašské Klobouky",
  "Zubří",
  "Frenštát pod Radhoštěm",
  "Příbor",
  "Studénka",
  "Bílovec",
  "Odry",
  "Fulnek",
  "Vítkov",
  "Budišov nad Budišovkou",
  "Hlučín",
  "Kravaře",
  "Kobeřice",
  "Dolní Benešov",
  "Hradec nad Moravicí",
  "Krnov",
  "Rýmařov",
  "Albrechtice",
  "Město Albrechtice",
  "Petřvald",
  "Rychvald",
  "Dolní Lutyně",
  "Dětmarovice",
  "Karviná-Nové Město",
  "Stonava",
  "Horní Suchá",
  "Havířov-Město",
  "Šenov",
  "Václavovice",
  "Vratimov",
  "Paskov",
  "Staříč",
  "Sviadnov",
  "Místek",
  "Frýdlant nad Ostravicí",
  "Kunčice pod Ondřejníkem",
  "Čeladná",
  "Ostravice",
  "Bílá",
  "Staré Hamry",
  "Mosty u Jablunkova",
  "Jablunkov",
  "Návsí",
  "Hrádek",
  "Vendryně",
  "Ropice",
  "Smilovice",
  "Komorní Lhotka",
  "Dobratice",
  "Hnojník",
  "Třanovice",
  "Vělopolí",
  // Villages and smaller municipalities
  "Lipník nad Bečvou",
  "Hranice",
  "Potštát",
  "Tršice",
  "Velký Týnec",
  "Hlubočky",
  "Šternberk",
  "Uničov",
  "Litovel",
  "Mohelnice",
  "Loštice",
  "Zábřeh",
  "Postřelmov",
  "Bludov",
  "Hanušovice",
  "Staré Město pod Sněžníkem",
  "Javorník",
  "Vidnava",
  "Zlaté Hory",
  "Mikulovice",
  "Žulová",
  "Velká Kraš",
  "Česká Ves",
  "Bělá pod Pradědem",
  "Vrbno pod Pradědem",
  "Město Libavá",
  "Lipová-lázně",
  "Horní Heřmanice",
  "Bernartice",
  "Vápenná",
  "Kobylá nad Vidnavkou",
  "Stará Červená Voda",
  "Skorošice",
  "Uhelná",
  "Ostružná",
  "Branná",
  "Jindřichov",
  "Velké Losiny",
  "Loučná nad Desnou",
  "Vernířovice",
  "Sobotín",
  "Rapotín",
  "Vikýřovice",
  "Dolní Studénky",
  "Sudkov",
  "Bohdíkov",
  "Ruda nad Moravou",
  "Olšany",
  "Libina",
  "Hrabišín",
  "Dlouhomilov",
  "Lukavice",
  "Chromeč",
  "Rohle",
  "Hoštejn",
  "Jedlí",
  "Třeština",
  "Klášterec",
  "Mírov",
  // More villages across regions
  "Nový Bydžov",
  "Chlumec nad Cidlinou",
  "Hořice",
  "Lázně Bělohrad",
  "Pecka",
  "Miletín",
  "Úpice",
  "Rtyně v Podkrkonoší",
  "Červený Kostelec",
  "Velké Poříčí",
  "Police nad Metují",
  "Broumov",
  "Teplice nad Metují",
  "Meziměstí",
  "Stárkov",
  "Hronov",
  "Česká Skalice",
  "Velký Vřešťov",
  "Jaroměř",
  "Josefov",
  "Smiřice",
  "Holohlavy",
  "Lochenice",
  "Třebechovice pod Orebem",
  "Týniště nad Orlicí",
  "Kostelec nad Orlicí",
  "Vamberk",
  "Doudleby nad Orlicí",
  "Rokytnice v Orlických horách",
  "Deštné v Orlických horách",
  "Sedloňov",
  "Olešnice v Orlických horách",
  "Pěčín",
  "Liberek",
  "Slatina nad Zdobnicí",
  "Dobré",
  "Kvasiny",
  "Solnice",
  "Bílý Újezd",
  "Černíkovice",
  "Opočno",
  "Dobruška",
  "Pohoří",
  "Křovice",
  "Jílovice",
  "Domašín",
  "Přepychy",
  "Bohuslavice nad Metují",
  "Slavětín nad Metují",
  "Machov",
  "Nový Hrádek",
  "Nové Město nad Metují",
  "Spy",
  "Provodov-Šonov",
  "Nahořany",
  "Vysokov",
  "Zábrodí",
  "Velká Jesenice",
  "Vestec",
  "Sendražice",
  "Lično",
  "Jestřebí",
  "Vršovka",
  "Mezilečí",
  "Běstovice",
  "Lhoty u Potštejna",
  "Záchlumí",
  "Potštejn",
  "Litice nad Orlicí",
  "Sopotnice",
  "Zámrsk",
  "Albrechtice nad Orlicí",
  "Ledce",
  "Lípa nad Orlicí",
  "Bolehošť",
  "Rohenice",
  "Hláska",
  "Čermná nad Orlicí",
  "Dobříkov",
  "Roveň",
  "Újezd u Chocně",
  "Vraclav",
  "Brandýs nad Orlicí",
  "Sudslava",
  "Mostek",
  "Skořenice",
  "Řetová",
  "Řetůvka",
  "Koldín",
  "Orlice",
  "Seč",
  "Libecina",
  "Tisová",
  "Kunvald",
  "Helvíkovice",
  "Klášterec nad Orlicí",
  "Pastviny",
  "Nekoř",
  "Bartošovice v Orlických horách",
  "Říčky v Orlických horách",
  "Zdobnice",
  "Bystré",
  // Additional Středočeský kraj villages
  "Černošice",
  "Roztoky",
  "Úvaly",
  "Odolena Voda",
  "Kostelec nad Černými lesy",
  "Český Brod",
  "Sadská",
  "Pečky",
  "Plaňany",
  "Zásmucky",
  "Uhlířské Janovice",
  "Vlašim",
  "Divišov",
  "Týnec nad Sázavou",
  "Sázava",
  "Stříbrná Skalice",
  "Ondřejov",
  "Mnichovice",
  "Velké Popovice",
  "Kamenice",
  "Jesenice",
  "Psáry",
  "Dolní Břežany",
  "Zlatníky-Hodkovice",
  "Vestec",
  "Modletice",
  "Popovičky",
  "Čestlice",
  "Průhonice",
  "Dobřejovice",
  "Nupaky",
  "Světice",
  "Všestary",
  "Sulice",
  "Březí",
  "Kunice",
  "Tehovec",
  "Louňovice",
  "Strančice",
  "Mukařov",
  "Svojetice",
  "Květnice",
  "Sibřina",
  "Koloděje",
  "Újezd nad Lesy",
  "Klánovice",
  "Šestajovice",
  "Jirny",
  "Zeleneč",
  "Svémyslice",
  "Zápy",
  "Lázně Toušeň",
  "Káraný",
  "Skorkov",
  "Sudovo Hlavno",
  "Křenek",
  "Ovčáry",
  "Kostomlaty nad Labem",
  "Jiřice",
  "Stará Lysá",
  "Semice",
  "Přerov nad Labem",
  "Velenka",
  "Bobnice",
  "Stratov",
  "Ostrá",
  "Rožďalovice",
  "Křinec",
  "Loučeň",
  "Mcely",
  "Velenice",
  "Vrátno",
  "Všejany",
  "Luštěnice",
  "Vinec",
  "Dlouhopolsko",
  "Hořátev",
  "Vlkava",
  "Straky",
  "Vestec",
  "Jizbice",
  "Oskořínek",
  "Krchleby",
  "Městec Králové",
  "Běrunice",
  "Sloveč",
  "Hradčany",
  "Žehuň",
  "Choťovice",
  "Vrbová Lhota",
  "Radim",
  "Kněžice",
  "Dymokury",
  "Činěves",
  "Chotěšice",
  "Chroustov",
  "Malešov",
].sort();

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationChange?: (city: string, region: string, country: string) => void;
  label?: string;
  placeholder?: string;
}

const CityAutocomplete = ({ 
  value, 
  onChange,
  onLocationChange,
  label = "Město",
  placeholder = "Vyberte město..."
}: CityAutocompleteProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = CZECH_CITIES.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCities(filtered);
      // Don't auto-show suggestions when value changes - only show when explicitly opened
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    onChange(city);
    setShowSuggestions(false);
    
    // Auto-populate region and country
    if (onLocationChange) {
      const region = getRegionForCity(city);
      const country = getCountryForCity(city);
      onLocationChange(city, region, country);
    }
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {label && <Label htmlFor="city">{label}</Label>}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
        
        {showSuggestions && (
          <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Hledat město..."
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredCities.length > 0 ? (
                filteredCities.map((city, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleSelect(city, e)}
                    className="w-full px-4 py-2 text-left hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                  >
                    {city}
                  </button>
                ))
              ) : (
                CZECH_CITIES.map((city, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleSelect(city, e)}
                    className="w-full px-4 py-2 text-left hover:bg-primary hover:text-primary-foreground transition-colors text-sm"
                  >
                    {city}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CityAutocomplete;
