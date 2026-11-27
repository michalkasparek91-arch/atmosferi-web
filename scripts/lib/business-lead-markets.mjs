export const germanCityAliases = {
  München: ['Munich'], Köln: ['Cologne'], Hannover: ['Hanover'], Nürnberg: ['Nuremberg'], Hameln: ['Hamelin'],
};

export const cityAliasesByCountry = {
  DE: germanCityAliases, CZ: { Praha:['Praze','Prague'], Plzeň:['Plzni','Pilsen'] },
  SK: { Bratislava:['Bratislave'], Košice:['Košiciach'] }, AT: { Wien:['Vienna','Vídeň'] },
  CH: { Zürich:['Zurich'] }, PL: { Warszawa:['Warsaw'], Kraków:['Krakow','Cracow'], Wrocław:['Wroclaw'] },
};

export const markets = {
  CZ: ['cs', 'Česko', ['Praha', 'Brno', 'Ostrava', 'Plzeň'], ['marketingová agentura', 'architektonické studio', 'realitní developer'], ['/kontakt', '/kontakty']],
  SK: ['sk', 'Slovensko', ['Bratislava', 'Košice', 'Žilina'], ['marketingová agentúra', 'architektonické štúdio', 'realitný developer'], ['/kontakt', '/kontakty']],
  DE: ['de', 'Německo', ['Berlin', 'Hamburg', 'München', 'Frankfurt am Main'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  AT: ['de', 'Rakousko', ['Wien', 'Graz', 'Linz', 'Salzburg'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  CH: ['de', 'Švýcarsko', ['Zürich', 'Bern', 'Basel'], ['Marketingagentur', 'Architekturbüro', 'Immobilien Projektentwickler'], ['/kontakt', '/impressum']],
  PL: ['pl', 'Polsko', ['Warszawa', 'Kraków', 'Wrocław'], ['agencja marketingowa', 'pracownia architektoniczna', 'deweloper nieruchomości'], ['/kontakt']],
  HU: ['hu', 'Maďarsko', ['Budapest', 'Debrecen', 'Szeged'], ['marketing ügynökség', 'építész iroda', 'ingatlanfejlesztő'], ['/kapcsolat']],
  GB: ['en', 'Spojené království', ['London', 'Manchester', 'Birmingham'], ['marketing agency', 'architecture practice', 'property developer'], ['/contact', '/contact-us']],
  US: ['en', 'USA', ['New York', 'Chicago', 'Los Angeles'], ['marketing agency', 'architecture firm', 'real estate developer'], ['/contact', '/contact-us']],
  FR: ['fr', 'Francie', ['Paris', 'Lyon', 'Marseille'], ['agence marketing', 'agence architecture', 'promoteur immobilier'], ['/contact', '/nous-joindre']],
};
