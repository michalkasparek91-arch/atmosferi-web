// City coordinates (latitude, longitude)
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Hlavní město Praha
  "Praha": { lat: 50.0755, lng: 14.4378 },
  
  // Středočeský kraj
  "Kladno": { lat: 50.1476, lng: 14.1028 },
  "Mladá Boleslav": { lat: 50.4113, lng: 14.9031 },
  "Příbram": { lat: 49.6900, lng: 14.0106 },
  "Kolín": { lat: 50.0281, lng: 15.2000 },
  "Benešov": { lat: 49.7817, lng: 14.6870 },
  "Beroun": { lat: 49.9639, lng: 14.0717 },
  "Mělník": { lat: 50.3507, lng: 14.4743 },
  "Čelákovice": { lat: 50.1628, lng: 14.7456 },
  "Brandýs nad Labem-Stará Boleslav": { lat: 50.1872, lng: 14.6633 },
  "Neratovice": { lat: 50.2593, lng: 14.5175 },
  "Říčany": { lat: 49.9917, lng: 14.6544 },
  "Rakovník": { lat: 50.1036, lng: 13.7333 },
  "Slaný": { lat: 50.2303, lng: 14.0869 },
  "Kutná Hora": { lat: 49.9483, lng: 15.2680 },
  
  // Jihočeský kraj
  "České Budějovice": { lat: 48.9745, lng: 14.4743 },
  "Tábor": { lat: 49.4144, lng: 14.6578 },
  "Písek": { lat: 49.3088, lng: 14.1475 },
  "Strakonice": { lat: 49.2614, lng: 13.9023 },
  "Jindřichův Hradec": { lat: 49.1441, lng: 15.0031 },
  
  // Plzeňský kraj
  "Plzeň": { lat: 49.7478, lng: 13.3775 },
  "Klatovy": { lat: 49.3958, lng: 13.2950 },
  "Rokycany": { lat: 49.7428, lng: 13.5947 },
  "Domažlice": { lat: 49.4403, lng: 12.9297 },
  "Tachov": { lat: 49.7958, lng: 12.6344 },
  
  // Karlovarský kraj
  "Karlovy Vary": { lat: 50.2329, lng: 12.8716 },
  "Cheb": { lat: 50.0796, lng: 12.3740 },
  "Sokolov": { lat: 50.1814, lng: 12.6403 },
  
  // Ústecký kraj
  "Ústí nad Labem": { lat: 50.6607, lng: 14.0322 },
  "Děčín": { lat: 50.7821, lng: 14.2148 },
  "Teplice": { lat: 50.6404, lng: 13.8245 },
  "Chomutov": { lat: 50.4607, lng: 13.4177 },
  "Most": { lat: 50.5030, lng: 13.6366 },
  "Litoměřice": { lat: 50.5338, lng: 14.1318 },
  "Litvínov": { lat: 50.6003, lng: 13.6112 },
  "Louny": { lat: 50.3571, lng: 13.7969 },
  "Bílina": { lat: 50.5483, lng: 13.7754 },
  "Rumburk": { lat: 50.9513, lng: 14.5566 },
  "Varnsdorf": { lat: 50.9114, lng: 14.6181 },
  
  // Liberecký kraj
  "Liberec": { lat: 50.7663, lng: 15.0543 },
  "Jablonec nad Nisou": { lat: 50.7244, lng: 15.1710 },
  "Česká Lípa": { lat: 50.6855, lng: 14.5376 },
  "Turnov": { lat: 50.5843, lng: 15.1521 },
  "Semily": { lat: 50.6022, lng: 15.3356 },
  "Tanvald": { lat: 50.7383, lng: 15.3158 },
  
  // Královéhradecký kraj
  "Hradec Králové": { lat: 50.2091, lng: 15.8327 },
  "Náchod": { lat: 50.4167, lng: 16.1630 },
  "Jičín": { lat: 50.4372, lng: 15.3518 },
  "Trutnov": { lat: 50.5610, lng: 15.9127 },
  "Rychnov nad Kněžnou": { lat: 50.1633, lng: 16.2747 },
  "Dvůr Králové nad Labem": { lat: 50.4317, lng: 15.8142 },
  "Nové Město nad Metují": { lat: 50.3419, lng: 16.1517 },
  
  // Pardubický kraj
  "Pardubice": { lat: 50.0343, lng: 15.7812 },
  "Chrudim": { lat: 49.9511, lng: 15.7956 },
  "Ústí nad Orlicí": { lat: 49.9743, lng: 16.3935 },
  "Svitavy": { lat: 49.7561, lng: 16.4683 },
  "Litomyšl": { lat: 49.8694, lng: 16.3131 },
  "Vysoké Mýto": { lat: 49.9556, lng: 16.1614 },
  
  // Kraj Vysočina
  "Jihlava": { lat: 49.3961, lng: 15.5910 },
  "Havlíčkův Brod": { lat: 49.6078, lng: 15.5808 },
  "Třebíč": { lat: 49.2149, lng: 15.8819 },
  "Žďár nad Sázavou": { lat: 49.5627, lng: 15.9393 },
  "Pelhřimov": { lat: 49.4314, lng: 15.2236 },
  
  // Jihomoravský kraj
  "Brno": { lat: 49.1951, lng: 16.6068 },
  "Znojmo": { lat: 48.8555, lng: 16.0488 },
  "Břeclav": { lat: 48.7589, lng: 16.8822 },
  "Hodonín": { lat: 48.8489, lng: 17.1324 },
  "Vyškov": { lat: 49.2775, lng: 16.9989 },
  "Blansko": { lat: 49.3631, lng: 16.6441 },
  "Boskovice": { lat: 49.4878, lng: 16.6603 },
  "Kyjov": { lat: 49.0106, lng: 17.1219 },
  "Veselí nad Moravou": { lat: 48.9531, lng: 17.3772 },
  
  // Olomoucký kraj
  "Olomouc": { lat: 49.5938, lng: 17.2509 },
  "Prostějov": { lat: 49.4719, lng: 17.1118 },
  "Přerov": { lat: 49.4551, lng: 17.4509 },
  "Šumperk": { lat: 49.9653, lng: 16.9706 },
  "Jeseník": { lat: 50.2297, lng: 17.2044 },
  "Bruntál": { lat: 49.9883, lng: 17.4647 },
  
  // Zlínský kraj
  "Zlín": { lat: 49.2237, lng: 17.6693 },
  "Uherské Hradiště": { lat: 49.0697, lng: 17.4597 },
  "Kroměříž": { lat: 49.2979, lng: 17.3929 },
  "Vsetín": { lat: 49.3386, lng: 17.9959 },
  "Uherský Brod": { lat: 49.0253, lng: 17.6469 },
  "Valašské Meziříčí": { lat: 49.4719, lng: 17.9711 },
  "Rožnov pod Radhoštěm": { lat: 49.4586, lng: 18.1431 },
  
  // Moravskoslezský kraj
  "Ostrava": { lat: 49.8209, lng: 18.2625 },
  "Opava": { lat: 49.9387, lng: 17.9026 },
  "Karviná": { lat: 49.8541, lng: 18.5419 },
  "Havířov": { lat: 49.7794, lng: 18.4370 },
  "Frýdek-Místek": { lat: 49.6832, lng: 18.3479 },
  "Třinec": { lat: 49.6774, lng: 18.6708 },
  "Nový Jičín": { lat: 49.5944, lng: 18.0103 },
  "Kopřivnice": { lat: 49.5994, lng: 18.1447 },
  "Bohumín": { lat: 49.9039, lng: 18.3572 },
  "Orlová": { lat: 49.8453, lng: 18.4303 },
  "Český Těšín": { lat: 49.7461, lng: 18.6261 },
  // Ostrava Districts (Hyper-local PSEO)
  "Ostrava-Poruba": { lat: 49.83, lng: 18.17 },
  "Ostrava-Jih": { lat: 49.78, lng: 18.25 },
  "Ostrava-Mariánské Hory": { lat: 49.83, lng: 18.25 },
  "Ostrava-Výškovice": { lat: 49.79, lng: 18.22 },
  // Praha Districts (Hyper-local PSEO)
  "Praha 1": { lat: 50.0878, lng: 14.4205 },
  "Praha 2": { lat: 50.0736, lng: 14.4323 },
  "Praha 3": { lat: 50.0850, lng: 14.4600 },
  "Praha 4": { lat: 50.0350, lng: 14.4500 },
  "Praha 5": { lat: 50.0600, lng: 14.3800 },
  "Praha 6": { lat: 50.1000, lng: 14.3600 },
  "Praha 7": { lat: 50.1050, lng: 14.4300 },
  "Praha 8": { lat: 50.1150, lng: 14.4650 },
  "Praha 9": { lat: 50.1100, lng: 14.5200 },
  "Praha 10": { lat: 50.0650, lng: 14.4900 },
  // Brno Districts (Hyper-local PSEO)
  "Brno-střed": { lat: 49.1920, lng: 16.6080 },
  "Brno-Královo Pole": { lat: 49.2250, lng: 16.5950 },
  "Brno-Bystrc": { lat: 49.2220, lng: 16.5250 },
  "Brno-sever": { lat: 49.2200, lng: 16.6250 },
};

// Locative forms (6. pád) for Czech cities to improve SEO grammar
export const CITY_LOCATIVES: Record<string, string> = {
  "Praha": "Praze",
  "Kladno": "Kladně",
  "Mladá Boleslav": "Mladé Boleslavi",
  "Příbram": "Příbrami",
  "Kolín": "Kolíně",
  "Benešov": "Benešově",
  "Beroun": "Berouně",
  "Mělník": "Mělníku",
  "Čelákovice": "Čelákovicích",
  "Brandýs nad Labem-Stará Boleslav": "Brandýse nad Labem-Staré Boleslavi",
  "Neratovice": "Neratovicích",
  "Říčany": "Říčanech",
  "Rakovník": "Rakovníku",
  "Slaný": "Slaném",
  "Kutná Hora": "Kutné Hoře",
  "České Budějovice": "Českých Budějovicích",
  "Tábor": "Táboře",
  "Písek": "Písku",
  "Strakonice": "Strakonicích",
  "Jindřichův Hradec": "Jindřichově Hradci",
  "Plzeň": "Plzni",
  "Klatovy": "Klatovech",
  "Rokycany": "Rokycanech",
  "Domažlice": "Domažlicích",
  "Tachov": "Tachově",
  "Karlovy Vary": "Karlových Varech",
  "Cheb": "Chebu",
  "Sokolov": "Sokolově",
  "Ústí nad Labem": "Ústí nad Labem",
  "Děčín": "Děčíně",
  "Teplice": "Teplicích",
  "Chomutov": "Chomutově",
  "Most": "Mostě",
  "Litoměřice": "Litoměřicích",
  "Litvínov": "Litvínově",
  "Louny": "Lounech",
  "Bílina": "Bílině",
  "Rumburk": "Rumburku",
  "Varnsdorf": "Varnsdorfu",
  "Liberec": "Liberci",
  "Jablonec nad Nisou": "Jablonci nad Nisou",
  "Česká Lípa": "České Lípě",
  "Turnov": "Turnově",
  "Semily": "Semilech",
  "Tanvald": "Tanvaldu",
  "Hradec Králové": "Hradci Králové",
  "Náchod": "Náchodě",
  "Jičín": "Jičíně",
  "Trutnov": "Trutnově",
  "Rychnov nad Kněžnou": "Rychnově nad Kněžnou",
  "Dvůr Králové nad Labem": "Dvoře Králové nad Labem",
  "Nové Město nad Metují": "Novém Městě nad Metují",
  "Pardubice": "Pardubicích",
  "Chrudim": "Chrudimi",
  "Ústí nad Orlicí": "Ústí nad Orlicí",
  "Svitavy": "Svitavách",
  "Litomyšl": "Litomyšli",
  "Vysoké Mýto": "Vysokém Mýtě",
  "Jihlava": "Jihlava",
  "Havlíčkův Brod": "Havlíčkově Brodě",
  "Třebíč": "Třebíči",
  "Žďár nad Sázavou": "Žďáru nad Sázavou",
  "Pelhřimov": "Pelhřimově",
  "Brno": "Brně",
  "Znojmo": "Znojmě",
  "Břeclav": "Břeclavi",
  "Hodonín": "Hodoníně",
  "Vyškov": "Vyškově",
  "Blansko": "Blansku",
  "Boskovice": "Boskovicích",
  "Kyjov": "Kyjově",
  "Veselí nad Moravou": "Veselí nad Moravou",
  "Olomouc": "Olomouci",
  "Prostějov": "Prostějově",
  "Přerov": "Přerově",
  "Šumperk": "Šumperku",
  "Jeseník": "Jeseníku",
  "Bruntál": "Bruntále",
  "Zlín": "Zlíně",
  "Uherské Hradiště": "Uherském Hradišti",
  "Kroměříž": "Kroměříži",
  "Vsetín": "Vsetíně",
  "Uherský Brod": "Uherském Brodě",
  "Valašské Meziříčí": "Valašském Meziříčí",
  "Rožnov pod Radhoštěm": "Rožnově pod Radhoštěm",
  "Ostrava": "Ostravě",
  "Opava": "Opavě",
  "Karviná": "Karviné",
  "Havířov": "Havířově",
  "Frýdek-Místek": "Frýdku-Místku",
  "Třinec": "Třinci",
  "Nový Jičín": "Novém Jičíně",
  "Kopřivnice": "Kopřivnici",
  "Bohumín": "Bohumíně",
  "Orlová": "Orlové",
  "Český Těšín": "Českém Těšíně",
  "Ostrava-Poruba": "Ostravě-Porubě",
  "Ostrava-Jih": "Ostravě-Jihu",
  "Ostrava-Mariánské Hory": "Ostravě-Mariánských Horách",
  "Ostrava-Výškovice": "Ostravě-Výškovicích",
  "Praha 1": "Praze 1",
  "Praha 2": "Praze 2",
  "Praha 3": "Praze 3",
  "Praha 4": "Praze 4",
  "Praha 5": "Praze 5",
  "Praha 6": "Praze 6",
  "Praha 7": "Praze 7",
  "Praha 8": "Praze 8",
  "Praha 9": "Praze 9",
  "Praha 10": "Praze 10",
  "Brno-střed": "Brně-středu",
  "Brno-Královo Pole": "Brně-Králově Poli",
  "Brno-Bystrc": "Brně-Bystrci",
  "Brno-sever": "Brně-severu",
};

export const cityToSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const SLUG_TO_CITY: Record<string, string> = Object.fromEntries(
  Object.keys(CITY_COORDINATES).map((c) => [cityToSlug(c), c])
);

export const TOP_CITIES = ["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc"];

export const PRIORITY_PSEO_CITIES = [
  'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Pardubice', 'Zlín', 
  'Ústí nad Labem', 'Havířov', 'Kladno', 'Most', 'Opava', 'Frýdek-Místek', 'Karviná', 'Jihlava', 'Teplice', 'Děčín', 
  'Chomutov', 'Karlovy Vary', 'Jablonec nad Nisou', 'Mladá Boleslav', 'Prostějov', 'Přerov', 'Třebíč', 'Trutnov', 
  'Tábor', 'Znojmo', 'Příbram', 'Kolín', 'Písek', 'Uherské Hradiště', 'Třinec',
  'Praha 1', 'Praha 2', 'Praha 3', 'Praha 4', 'Praha 5', 'Praha 6', 'Praha 7', 'Praha 8', 'Praha 9', 'Praha 10',
  'Brno-střed', 'Brno-Královo Pole', 'Brno-Bystrc', 'Brno-sever', 'Ostrava-Poruba', 'Ostrava-Jih'
];

export const getLocativeForCity = (city: string): string => {
  return CITY_LOCATIVES[city] || city;
};

/**
 * Returns the correct preposition (v/ve) for a Czech city name in locative.
 */
export const getPreposition = (city: string): "v" | "ve" => {
  const veCities = [
    "Zlín", "Vsetín", "Vyškov", "Varnsdorf", "Vrchlabí", 
    "Svitavy", "Strakonice", "Sokolov", "Šumperk", "Semily"
  ];
  
  if (veCities.some(vc => city.startsWith(vc))) {
    return "ve";
  }
  
  // Heuristic: if city starts with V, S, Z, Š, Ž followed by another consonant
  const firstChar = city.charAt(0).toLowerCase();
  const secondChar = city.charAt(1).toLowerCase();
  const consonants = "bcdfghjklmnpqrstvwxzščřž";
  
  if (["v", "s", "z", "š", "ž"].includes(firstChar) && consonants.includes(secondChar)) {
    return "ve";
  }

  return "v";
};

// Calculate distance between two cities in kilometers using Haversine formula
export const calculateDistance = (city1: string, city2: string): number => {
  const coords1 = CITY_COORDINATES[city1];
  const coords2 = CITY_COORDINATES[city2];
  
  if (!coords1 || !coords2) return Infinity;
  
  return calculateDistanceFromCoords(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
};

// Calculate distance between two coordinate pairs in kilometers using Haversine formula
export const calculateDistanceFromCoords = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
};

// Mapping of Czech cities to their regions (kraje)
export const CITY_TO_REGION: Record<string, string> = {
  // Hlavní město Praha
  "Praha": "Hlavní město Praha",
  
  // Středočeský kraj
  "Kladno": "Středočeský kraj",
  "Mladá Boleslav": "Středočeský kraj",
  "Příbram": "Středočeský kraj",
  "Kolín": "Středočeský kraj",
  "Benešov": "Středočeský kraj",
  "Beroun": "Středočeský kraj",
  "Mělník": "Středočeský kraj",
  "Čelákovice": "Středočeský kraj",
  "Brandýs nad Labem-Stará Boleslav": "Středočeský kraj",
  "Neratovice": "Středočeský kraj",
  "Říčany": "Středočeský kraj",
  "Rakovník": "Středočeský kraj",
  "Slaný": "Středočeský kraj",
  "Kutná Hora": "Středočeský kraj",
  
  // Jihočeský kraj
  "České Budějovice": "Jihočeský kraj",
  "Tábor": "Jihočeský kraj",
  "Písek": "Jihočeský kraj",
  "Strakonice": "Jihočeský kraj",
  "Jindřichův Hradec": "Jihočeský kraj",
  
  // Plzeňský kraj
  "Plzeň": "Plzeňský kraj",
  "Klatovy": "Plzeňský kraj",
  "Rokycany": "Plzeňský kraj",
  "Domažlice": "Plzeňský kraj",
  "Tachov": "Plzeňský kraj",
  
  // Karlovarský kraj
  "Karlovy Vary": "Karlovarský kraj",
  "Cheb": "Karlovarský kraj",
  "Sokolov": "Karlovarský kraj",
  
  // Ústecký kraj
  "Ústí nad Labem": "Ústecký kraj",
  "Děčín": "Ústecký kraj",
  "Teplice": "Ústecký kraj",
  "Chomutov": "Ústecký kraj",
  "Most": "Ústecký kraj",
  "Litoměřice": "Ústecký kraj",
  "Litvínov": "Ústecký kraj",
  "Louny": "Ústecký kraj",
  "Bílina": "Ústecký kraj",
  "Rumburk": "Ústecký kraj",
  "Varnsdorf": "Ústecký kraj",
  
  // Liberecký kraj
  "Liberec": "Liberecký kraj",
  "Jablonec nad Nisou": "Liberecký kraj",
  "Česká Lípa": "Liberecký kraj",
  "Turnov": "Liberecký kraj",
  "Semily": "Liberecký kraj",
  "Tanvald": "Liberecký kraj",
  
  // Královéhradecký kraj
  "Hradec Králové": "Královéhradecký kraj",
  "Náchod": "Královéhradecký kraj",
  "Jičín": "Královéhradecký kraj",
  "Trutnov": "Královéhradecký kraj",
  "Rychnov nad Kněžnou": "Královéhradecký kraj",
  "Dvůr Králové nad Labem": "Královéhradecký kraj",
  "Nové Město nad Metují": "Královéhradecký kraj",
  
  // Pardubický kraj
  "Pardubice": "Pardubický kraj",
  "Chrudim": "Pardubický kraj",
  "Ústí nad Orlicí": "Pardubický kraj",
  "Svitavy": "Pardubický kraj",
  "Litomyšl": "Pardubický kraj",
  "Vysoké Mýto": "Pardubický kraj",
  
  // Kraj Vysočina
  "Jihlava": "Kraj Vysočina",
  "Havlíčkův Brod": "Kraj Vysočina",
  "Třebíč": "Kraj Vysočina",
  "Žďár nad Sázavou": "Kraj Vysočina",
  "Pelhřimov": "Kraj Vysočina",
  
  // Jihomoravský kraj
  "Brno": "Jihomoravský kraj",
  "Znojmo": "Jihomoravský kraj",
  "Břeclav": "Jihomoravský kraj",
  "Hodonín": "Jihomoravský kraj",
  "Vyškov": "Jihomoravský kraj",
  "Blansko": "Jihomoravský kraj",
  "Boskovice": "Jihomoravský kraj",
  "Kyjov": "Jihomoravský kraj",
  "Veselí nad Moravou": "Jihomoravský kraj",
  
  // Olomoucký kraj
  "Olomouc": "Olomoucký kraj",
  "Prostějov": "Olomoucký kraj",
  "Přerov": "Olomoucký kraj",
  "Šumperk": "Olomoucký kraj",
  "Jeseník": "Olomoucký kraj",
  "Bruntál": "Olomoucký kraj",
  
  // Zlínský kraj
  "Zlín": "Zlínský kraj",
  "Uherské Hradiště": "Zlínský kraj",
  "Kroměříž": "Zlínský kraj",
  "Vsetín": "Zlínský kraj",
  "Uherský Brod": "Zlínský kraj",
  "Valašské Meziříčí": "Zlínský kraj",
  "Rožnov pod Radhoštěm": "Zlínský kraj",
  
  // Moravskoslezský kraj
  "Ostrava": "Moravskoslezský kraj",
  "Opava": "Moravskoslezský kraj",
  "Karviná": "Moravskoslezský kraj",
  "Havířov": "Moravskoslezský kraj",
  "Frýdek-Místek": "Moravskoslezský kraj",
  "Třinec": "Moravskoslezský kraj",
  "Nový Jičín": "Moravskoslezský kraj",
  "Kopřivnice": "Moravskoslezský kraj",
  "Bohumín": "Moravskoslezský kraj",
  "Orlová": "Moravskoslezský kraj",
  "Český Těšín": "Moravskoslezský kraj",
  "Ostrava-Poruba": "Moravskoslezský kraj",
  "Ostrava-Jih": "Moravskoslezský kraj",
  "Ostrava-Mariánské Hory": "Moravskoslezský kraj",
  "Ostrava-Výškovice": "Moravskoslezský kraj",
  "Praha 1": "Hlavní město Praha",
  "Praha 2": "Hlavní město Praha",
  "Praha 3": "Hlavní město Praha",
  "Praha 4": "Hlavní město Praha",
  "Praha 5": "Hlavní město Praha",
  "Praha 6": "Hlavní město Praha",
  "Praha 7": "Hlavní město Praha",
  "Praha 8": "Hlavní město Praha",
  "Praha 9": "Hlavní město Praha",
  "Praha 10": "Hlavní město Praha",
  "Brno-střed": "Jihomoravský kraj",
  "Brno-Královo Pole": "Jihomoravský kraj",
  "Brno-Bystrc": "Jihomoravský kraj",
  "Brno-sever": "Jihomoravský kraj",
};

export const getRegionForCity = (city: string): string => {
  return CITY_TO_REGION[city] || "";
};

export const getCountryForCity = (city: string): string => {
  // All Czech cities are in Czech Republic
  return CITY_TO_REGION[city] ? "Česká republika" : "";
};

// Region slug helpers
const regionToSlug = (region: string): string =>
  region
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export const REGION_TO_SLUG: Record<string, string> = Object.fromEntries(
  Array.from(new Set(Object.values(CITY_TO_REGION))).map((r) => [r, regionToSlug(r)])
);

export const SLUG_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_TO_SLUG).map(([region, slug]) => [slug, region])
);

export const getCitiesInRegion = (regionName: string): string[] =>
  Object.entries(CITY_TO_REGION)
    .filter(([, r]) => r === regionName)
    .map(([city]) => city);

