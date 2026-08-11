import { Invoice, Contact, BankAccount, InvoicingSettings } from "@/types/invoicing";

export const defaultBankAccounts: BankAccount[] = [
  {
    id: "unicredit-czk",
    name: "UniCredit CZK",
    accountNumber: "1336168004/2700",
    iban: "",
    swift: "",
    currency: "CZK"
  },
  {
    id: "wise-eur",
    name: "Wise EUR",
    accountNumber: "",
    iban: "BE18967525779065",
    swift: "TRWIBEB1XXX",
    currency: "EUR"
  }
];

export const defaultSettings: InvoicingSettings = {
  bankAccounts: defaultBankAccounts,
  primaryAccounts: {
    cs: "unicredit-czk",
    en: "wise-eur"
  },
  suppliers: {
    pixl: {
      name: "Michal Kašpárek",
      street: "Heřmanická 2041",
      city: "Rychvald",
      zip: "735 32",
      country: "CZ",
      registrationNo: "03504174",
      vatNo: "CZ9107055947",
      vatPayerStatus: "Neplátce DPH"
    },
    atmosferi: {
      name: "Atmosferi",
      street: "Heřmanická 2041",
      city: "Rychvald",
      zip: "735 32",
      country: "CZ",
      registrationNo: "03504174",
      vatNo: "CZ9107055947",
      vatPayerStatus: "Neplátce DPH"
    }
  }
};

// Seed contacts parsed from user's CSV
export const initialContacts: Contact[] = [
  { id: "c1", name: "archeting s.r.o.", street: "Fr. Halase 982/27", city: "České Budějovice", zip: "37008", country: "CZ", registrationNo: "08603936", vatNo: "CZ08603936" },
  { id: "c2", name: "Archidee ateliér s.r.o.", street: "Palackého 3145/41", city: "Jablonec nad Nisou", zip: "46601", country: "CZ", registrationNo: "19700431", vatNo: "CZ19700431" },
  { id: "c3", name: "Architektonická kancelář Burian-Křivinka s.r.o.", street: "Kalvodova 114/13", city: "Brno - Pisárky", zip: "60200", country: "CZ", registrationNo: "29189187", vatNo: "CZ29189187" },
  { id: "c4", name: "ARLET Engineering s.r.o.", street: "Místecká 762", city: "Paskov", zip: "73921", country: "CZ", registrationNo: "26878488", vatNo: "CZ26878488", web: "http://www.arlet.cz" },
  { id: "c5", name: "A. S. Dadgar", street: "Tersteegenweg 16", city: "Essen", zip: "45149", country: "DE", registrationNo: "", vatNo: "" },
  { id: "c6", name: "ATELIER KOSNAR s.r.o.", street: "Na lučinách 2535/1", city: "Praha - Žižkov", zip: "13000", country: "CZ", registrationNo: "03926397", vatNo: "CZ03926397" },
  { id: "c7", name: "ATELIER RAW s.r.o.", street: "Lidická 1879/48", city: "Brno", zip: "60200", country: "CZ", registrationNo: "28299442", vatNo: "CZ28299442" },
  { id: "c8", name: "Atelier Šumperk s.r.o.", street: "Francouzská 3093/12", city: "Šumperk", zip: "78701", country: "CZ", registrationNo: "27805271", vatNo: "CZ27805271" },
  { id: "c9", name: "AT Plan&Arkitektur", street: "Postboks 1232", city: "Tromsø", zip: "9262", country: "NO", registrationNo: "", vatNo: "" },
  { id: "c10", name: "Byty Domy Nemovitosti s.r.o.", street: "Kurdějov 273", city: "Kurdějov", zip: "69301", country: "CZ", registrationNo: "01812114", vatNo: "CZ01812114" },
  { id: "c11", name: "consequence forma s.r.o.", street: "Nový Hrozenkov 623", city: "Nový Hrozenkov", zip: "75604", country: "CZ", registrationNo: "04849582", vatNo: "CZ04849582" },
  { id: "c12", name: "CV ARCHITEKT s.r.o.", street: "Bechyňská 839", city: "Týn nad Vltavou", zip: "37501", country: "CZ", registrationNo: "22652876", vatNo: "CZ22652876" },
  { id: "c13", name: "Design&Build s.r.o.", street: "Bořivojova 748/73", city: "Praha - Žižkov", zip: "13000", country: "CZ", registrationNo: "24270857", vatNo: "CZ24270857" },
  { id: "c14", name: "DI Andreas Spiss, MEng", street: "Unterort 4", city: "Kärnten", zip: "9150", country: "AT", registrationNo: "ATU70228979", vatNo: "" },
  { id: "c15", name: "Dive Architects AB", street: "Skeppargatan 39", city: "Stockholm", zip: "114 52", country: "SE", registrationNo: "5567164123", vatNo: "" },
  { id: "c16", name: "DKarchitekti, s.r.o.", street: "Křenová 409/52", city: "Brno - Trnitá", zip: "60200", country: "CZ", registrationNo: "05290236", vatNo: "CZ05290236" },
  { id: "c17", name: "DMP Nordic AS", street: "Ensjøveien 20", city: "OSLO", zip: "0661", country: "NO", registrationNo: "", vatNo: "" },
  { id: "c18", name: "DOBRÝ DŮM, s.r.o.", street: "Minská 198/60", city: "Brno", zip: "61600", country: "CZ", registrationNo: "26259257", vatNo: "CZ26259257" },
  { id: "c19", name: "Dyrø og Moen AS", street: "Hovfaret 4", city: "Oslo", zip: "0275", country: "CZ", registrationNo: "", vatNo: "" },
  { id: "c20", name: "FARA ON union s.r.o.", street: "Lidická 700/19", city: "Brno - Veveří", zip: "60200", country: "CZ", registrationNo: "03365930", vatNo: "CZ03365930" },
  { id: "c21", name: "Fornet Architectes", street: "Avenue d’Echallens 22", city: "Lausanne", zip: "1004", country: "CH", registrationNo: "", vatNo: "CHE-133.162.124", currency: "EUR", language: "en" },
  { id: "c22", name: "Gnist Arkitekter", street: "Sjøgata 5", city: "Bodø", zip: "8006", country: "NO", registrationNo: "", vatNo: "" },
  { id: "c23", name: "Grido,architektura a design,s.r.o.", street: "Karlická 1493", city: "Černošice", zip: "25228", country: "CZ", registrationNo: "25786954", vatNo: "CZ25786954" },
  { id: "c24", name: "Hanns-Georg Rimkus", street: "Albert-Einstein-Straße 1", city: "Würzburg", zip: "97080", country: "DE", registrationNo: "", vatNo: "DE238083796", currency: "EUR", language: "en" },
  { id: "c25", name: "IDEARCH s.r.o.", street: "Malinovského náměstí 603/4", city: "Brno", zip: "60200", country: "CZ", registrationNo: "11640332", vatNo: "CZ11640332" },
  { id: "c26", name: "Ing. arch. Bohuslav Strejc", street: "U Poradny 1447/8", city: "Plzeň - Bolevec", zip: "32300", country: "CZ", registrationNo: "87886286", vatNo: "" },
  { id: "c27", name: "Ing. arch. David Kotek", street: "Pustkovecká 97/152", city: "Ostrava", zip: "70800", country: "CZ", registrationNo: "73267945", vatNo: "CZ7704175534" },
  { id: "c28", name: "Ing.arch. David Mareš", street: "U křížku 1398/14", city: "Praha - Nusle", zip: "14000", country: "CZ", registrationNo: "66561752", vatNo: "CZ7105065374" },
  { id: "c29", name: "Ing. arch. et Ing. Miloslav Krůpa", street: "Majdalenky 908/10c", city: "Brno", zip: "63800", country: "CZ", registrationNo: "76506843", vatNo: "CZ8006235853" },
  { id: "c30", name: "Ing. arch. MgA. Mateásko David", street: "Univerzitní 686/12", city: "Praha 10 - Malešice", zip: "10800", country: "CZ", registrationNo: "61025879", vatNo: "CZ7109240116" },
  { id: "c31", name: "Ing. arch. Tomáš Jurák", street: "Chudčická 1352/10", city: "Brno - Bystrc", zip: "63500", country: "CZ", registrationNo: "76061647", vatNo: "" },
  { id: "c32", name: "Ing.arch. VYSLOUŽIL ONDŘEJ", street: "Tyršova 1761/14", city: "Ostrava", zip: "70200", country: "CZ", registrationNo: "73060755", vatNo: "CZ7906145588", web: "http://www.vyslouzilarch.cz" },
  { id: "c33", name: "Ing. et. Ing. arch. Jan Vrbka", street: "Tučkova 659/18", city: "Brno", zip: "60200", country: "CZ", registrationNo: "74145827", vatNo: "" },
  { id: "c34", name: "Ing. Ondřej Kubla", street: "Kladeruby 25", city: "Kladeruby", zip: "75643", country: "CZ", registrationNo: "74574302", vatNo: "" },
  { id: "c35", name: "JA architekti, s.r.o.", street: "Salvátorská 1092/10", city: "Praha - Staré Město", zip: "11000", country: "CZ", registrationNo: "11834692", vatNo: "CZ11834692" },
  { id: "c36", name: "Jan Hanousek Architekti s.r.o.", street: "Porážka 459/2", city: "Brno - Trnitá", zip: "60200", country: "CZ", registrationNo: "04145470", vatNo: "CZ04145470" },
  { id: "c37", name: "J&T INVESTIČNÍ SPOLEČNOST, a.s.", street: "Sokolovská 700/113a", city: "Praha", zip: "18600", country: "CZ", registrationNo: "47672684", vatNo: "CZ699000619" },
  { id: "c38", name: "Kamil Mrva Architects, s.r.o.", street: "Záhumenní 1358/30c", city: "Kopřivnice", zip: "74221", country: "CZ", registrationNo: "28647611", vatNo: "CZ28647611", web: "http://mrva.net" },
  { id: "c39", name: "KINGFISHER CB DEVELOPMENT s.r.o.", street: "Pražská tř. 1813/3", city: "České Budějovice", zip: "37004", country: "CZ", registrationNo: "09624988", vatNo: "CZ09624988" },
  { id: "c40", name: "KINGFISHER CB, spol. s r.o.", street: "Pražská tř. 1813/3", city: "České Budějovice", zip: "37004", country: "CZ", registrationNo: "28142179", vatNo: "CZ28142179" },
  { id: "c41", name: "Kubla&Architects s.r.o.", street: "Valašské Meziříčí 508", city: "Valašské Meziříčí", zip: "75701", country: "CZ", registrationNo: "05448689", vatNo: "CZ05448689", web: "http://www.kublarchitects.cz" },
  { id: "c42", name: "LETky, z. s.", street: "Formanova 555/17", city: "Čáslav", zip: "28601", country: "CZ", registrationNo: "09833447", vatNo: "" },
  { id: "c43", name: "Martin Brída", street: "Tišnovská 1476/102", city: "Brno - Černá Pole", zip: "61300", country: "CZ", registrationNo: "86966111", vatNo: "CZ8402293801" },
  { id: "c44", name: "Master Design s.r.o.", street: "Bolzanova 1615/1", city: "Praha", zip: "11000", country: "CZ", registrationNo: "28631447", vatNo: "CZ28631447" },
  { id: "c45", name: "Mer Arkkitehdit Oy", street: "Ratakatu 1 b A4", city: "Helsinki", zip: "00120", country: "FI", registrationNo: "", vatNo: "" },
  { id: "c46", name: "Město Čáslav", street: "nám. Jana Žižky z Trocnova 1/1", city: "Čáslav", zip: "28601", country: "CZ", registrationNo: "00236021", vatNo: "CZ00236021" },
  { id: "c47", name: "Michael Türk", street: "Hochstraße 96", city: "Heinsberg", zip: "52525", country: "DE", registrationNo: "", vatNo: "" },
  { id: "c48", name: "Mikulov development s.r.o.", street: "Bezručova 1575/49a", city: "Mikulov", zip: "69201", country: "CZ", registrationNo: "09135367", vatNo: "CZ09135367" },
  { id: "c49", name: "mosa atelier s.r.o.", street: "Žerotínovo nám. 21/15", city: "Třebíč - Podklášteří", zip: "67401", country: "CZ", registrationNo: "21872708", vatNo: "CZ21872708" },
  { id: "c50", name: "neuje s.r.o.", street: "Podhořany u Ronova 123", city: "Podhořany u Ronova", zip: "53803", country: "CZ", registrationNo: "08579946", vatNo: "CZ08579946" },
  { id: "c51", name: "Origis s.r.o.", street: "U Strouhy 264/13", city: "Praha 9 - Miškovice", zip: "19600", country: "CZ", registrationNo: "28933907", vatNo: "CZ28933907" },
  { id: "c52", name: "OSTRAVICE HOTEL a.s.", street: "Sokolovská 700/113a", city: "Praha", zip: "18600", country: "CZ", registrationNo: "27574911", vatNo: "CZ27574911" },
  { id: "c53", name: "Petr Čermák", street: "Za Sokolovnou 701", city: "Lázně Bohdanec", zip: "53341", country: "CZ", registrationNo: "", vatNo: "" },
  { id: "c54", name: "Plotbase s. r. o.", street: "Pečnianska ulica 5", city: "Bratislava - mestská časť Petržalka", zip: "85101", country: "SK", registrationNo: "45674515", vatNo: "SK2023089761" },
  { id: "c55", name: "Plus 2 architectes", street: "Av. du Général Guisan 1", city: "Fribourg", zip: "1700", country: "CH", registrationNo: "", vatNo: "CHE-383.917.587", email: "atelier@plusdeux.ch" },
  { id: "c56", name: "Plus Arkitektur", street: "Kristian Augusts Gate 13", city: "Oslo", zip: "", country: "NO", registrationNo: "990 055 718", vatNo: "" },
  { id: "c57", name: "ProjekCZE s.r.o.", street: "Karlova 933/7", city: "Brno - Maloměřice", zip: "61400", country: "CZ", registrationNo: "08771588", vatNo: "CZ08771588" },
  { id: "c58", name: "PROJEKTSTUDIO EUCZ, s.r.o.", street: "Opavská 6230/29a", city: "Ostrava", zip: "70800", country: "CZ", registrationNo: "27787443", vatNo: "CZ27787443" },
  { id: "c59", name: "ProKiga 10 An der Witwe Dortmund GmbH & Co. KG", street: "Steinbecker Dorfstr. 38", city: "Höhenland", zip: "16259", country: "DE", registrationNo: "", vatNo: "" },
  { id: "c60", name: "R4 ESTATE s.r.o.", street: "Palackého třída 295/24", city: "Brno", zip: "61200", country: "CZ", registrationNo: "04512936", vatNo: "CZ04512936" },
  { id: "c61", name: "REALDOMUS s.r.o.", street: "Radniční 133/1", city: "České Budějovice", zip: "37001", country: "CZ", registrationNo: "26070405", vatNo: "CZ26070405", web: "https://www.realdomus.cz" },
  { id: "c62", name: "Robin Group s.r.o.", street: "Křížkovského 479/15", city: "Třebíč - Horka-Domky", zip: "67401", country: "CZ", registrationNo: "22379916", vatNo: "" },
  { id: "c63", name: "Rob Pyatt", street: "3020 Carbon Place Suite 103", city: "Boulder, Colorado", zip: "80301", country: "US", registrationNo: "303 803 6810", vatNo: "" },
  { id: "c64", name: "Sarong Praha s.r.o.", street: "Na Poříčí 1038/6", city: "Praha", zip: "11000", country: "CZ", registrationNo: "24255114", vatNo: "CZ24255114" },
  { id: "c65", name: "SENAA architekti, s.r.o.", street: "Merhautova 950/72", city: "Brno - Černá Pole", zip: "61300", country: "CZ", registrationNo: "04024176", vatNo: "CZ04024176" },
  { id: "c66", name: "SIADESIGN LIBEREC s.r.o.", street: "Fügnerova 667/7", city: "Liberec", zip: "46001", country: "CZ", registrationNo: "27314731", vatNo: "CZ27314731", web: "http://www.siadesign.cz" },
  { id: "c67", name: "SLÁDEK GROUP, a.s.", street: "Jana Nohy 1441", city: "Benešov", zip: "25601", country: "CZ", registrationNo: "46356886", vatNo: "CZ46356886", web: "https://www.sladekgroup.cz" },
  { id: "c68", name: "STREETPARK s.r.o.", street: "Třebíč 40", city: "Třebíč", zip: "67401", country: "CZ", registrationNo: "06077315", vatNo: "CZ06077315" },
  { id: "c69", name: "Studio MOM Architektur ZT GmbH", street: "Belgradplatz 5/Top 4", city: "Wien", zip: "1100", country: "CZ", registrationNo: "FN586086t", vatNo: "ATU78405557" },
  { id: "c70", name: "TAKENAKA EUROPE GmbH - organizační složka", street: "Grafenberger Allee 136", city: "D-40237 Düsseldorf", zip: "", country: "DE", registrationNo: "64355535", vatNo: "CZ64355535" },
  { id: "c71", name: "talaša kutěj architekti s.r.o. v likvidaci", street: "Modenská 697/6", city: "Praha", zip: "10900", country: "CZ", registrationNo: "04744471", vatNo: "CZ04744471" },
  { id: "c72", name: "Tereza Janků", street: "Bubenečská 365/41", city: "Praha - Bubeneč", zip: "16000", country: "CZ", registrationNo: "71419811", vatNo: "" },
  { id: "c73", name: "Torami s.r.o.", street: "Dr. Suzy 956/28", city: "Třebíč - Podklášteří", zip: "67401", country: "CZ", registrationNo: "11680571", vatNo: "CZ11680571" },
  { id: "c74", name: "VA Arkitektar", street: "Laugavegi 26", city: "Reykjavík", zip: "101", country: "IS", registrationNo: "450400-3510", vatNo: "", currency: "EUR", language: "en" },
  { id: "c75", name: "VISIO, spol. s r.o.", street: "Šípkova 849", city: "Lázně Bohdaneč", zip: "53341", country: "CZ", registrationNo: "05886503", vatNo: "CZ05886503" },
  { id: "c76", name: "Wanderlust", street: "Odinsgotu 7", city: "101 Reykjavík", zip: "680813-1080", country: "IS", registrationNo: "", vatNo: "" }
];

// Helper to create invoice object
const createSeedInvoice = (
  id: string,
  number: string,
  variableSymbol: string,
  clientName: string,
  status: Invoice['status'],
  issuedOn: string,
  dueOn: string,
  amount: number,
  currency: 'CZK' | 'EUR' = 'CZK',
  language: 'cs' | 'en' = 'cs',
  paidOn?: string,
  description: string = "Architektonické vizualizace a služby"
): Invoice => {
  const client = initialContacts.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || {
    id: `c_gen_${id}`,
    name: clientName,
    street: "",
    city: "",
    zip: "",
    country: currency === 'EUR' ? "DE" : "CZ",
    registrationNo: "",
    vatNo: ""
  };

  const bankAccount = currency === 'EUR' ? defaultBankAccounts[1] : defaultBankAccounts[0];
  const supplier = defaultSettings.suppliers.pixl;

  return {
    id,
    number,
    variableSymbol,
    brand: "pixl",
    language,
    status,
    isProforma: false,
    issuedOn,
    dueOn,
    dueDays: 30,
    paidOn,
    bankAccount,
    supplier,
    client,
    items: [
      {
        id: `item_${id}_1`,
        quantity: 1,
        description,
        unitPrice: amount,
        total: amount
      }
    ],
    currency,
    subtotal: amount,
    total: amount,
    exchangeRate: currency === 'EUR' ? 24.2 : 1.0
  };
};

export const initialInvoices: Invoice[] = [
  createSeedInvoice("60976468", "2026-0025", "20260025", "IDEARCH s.r.o.", "open", "2026-07-27", "2026-08-26", 15000, "CZK", "cs"),
  createSeedInvoice("60879884", "2026-0024", "20260024", "Plus 2 architectes", "paid", "2026-07-23", "2026-08-22", 600, "EUR", "en", "2026-08-05"),
  createSeedInvoice("60594775", "2026-0023", "20260023", "DI Andreas Spiss, MEng", "open", "2026-07-13", "2026-08-12", 500, "EUR", "en"),
  createSeedInvoice("59609242", "2026-0022", "20260022", "DKarchitekti, s.r.o.", "paid", "2026-06-11", "2026-07-11", 69000, "CZK", "cs", "2026-07-10"),
  
  // Custom invoice 2026-0021 from user screenshot!
  {
    id: "59608887",
    number: "2026-0021",
    variableSymbol: "20260021",
    brand: "pixl",
    language: "cs",
    status: "overdue",
    isProforma: false,
    issuedOn: "2026-06-11",
    dueOn: "2026-07-11",
    dueDays: 30,
    bankAccount: defaultBankAccounts[0],
    supplier: defaultSettings.suppliers.pixl,
    client: initialContacts.find(c => c.name === "CV ARCHITEKT s.r.o.")!,
    items: [
      {
        id: "item_21_1",
        quantity: 6,
        description: "Nábřeží Týn | architektonická vizualizace | pohled chodce",
        unitPrice: 6000,
        total: 36000
      },
      {
        id: "item_21_2",
        quantity: 2,
        description: "Nábřeží Týn | architektonická vizualizace | nadhledy",
        unitPrice: 7250,
        total: 14500
      }
    ],
    currency: "CZK",
    subtotal: 50500,
    total: 50500,
    exchangeRate: 1.0
  },

  createSeedInvoice("58908525", "2026-0020", "20260020", "Hanns-Georg Rimkus", "paid", "2026-05-20", "2026-06-19", 700, "EUR", "en", "2026-05-21"),
  createSeedInvoice("58898747", "2026-0019", "20260019", "Atelier Šumperk s.r.o.", "paid", "2026-05-20", "2026-06-19", 25000, "CZK", "cs", "2026-05-28"),
  createSeedInvoice("58646859", "2026-0018", "20260018", "REALDOMUS s.r.o.", "overdue", "2026-05-12", "2026-06-11", 25000, "CZK", "cs"),
  createSeedInvoice("58497859", "2026-0017", "20260017", "Tereza Janků", "paid", "2026-05-07", "2026-06-06", 20000, "CZK", "cs", "2026-05-08"),
  createSeedInvoice("58116050", "2026-0016", "20260016", "Fornet Architectes", "paid", "2026-04-29", "2026-05-29", 360, "EUR", "en", "2026-05-28"),
  createSeedInvoice("57779417", "2026-0015", "20260015", "ProjekCZE s.r.o.", "overdue", "2026-04-17", "2026-05-17", 6000, "CZK", "cs"),
  createSeedInvoice("57779061", "2026-0014", "20260014", "Robin Group s.r.o.", "overdue", "2026-05-07", "2026-06-06", 20000, "CZK", "cs"),
  createSeedInvoice("56946573", "2026-0013", "20260013", "Tereza Janků", "paid", "2026-03-25", "2026-04-24", 60000, "CZK", "cs", "2026-03-26"),
  createSeedInvoice("56862623", "2026-0012", "20260012", "JA architekti, s.r.o.", "paid", "2026-03-23", "2026-04-22", 30000, "CZK", "cs", "2026-04-30"),
  createSeedInvoice("56837404", "2026-0011", "20260011", "Hanns-Georg Rimkus", "paid", "2026-03-22", "2026-04-21", 150, "EUR", "en", "2026-05-22"),
  createSeedInvoice("56699589", "2026-0010", "20260010", "DKarchitekti, s.r.o.", "paid", "2026-03-17", "2026-04-16", 6000, "CZK", "cs", "2026-04-14"),
  createSeedInvoice("56291781", "2026-0009", "20260009", "mosa atelier s.r.o.", "paid", "2026-03-03", "2026-04-02", 20200, "CZK", "cs", "2026-03-06"),
  createSeedInvoice("56094067", "2026-0008", "20260008", "Plus 2 architectes", "paid", "2026-02-26", "2026-03-28", 860, "EUR", "en", "2026-04-03"),
  createSeedInvoice("56094046", "2026-0007", "20260007", "Plus 2 architectes", "paid", "2026-02-26", "2026-03-28", 860, "EUR", "en", "2026-04-03"),
  createSeedInvoice("56075303", "2026-0006", "20260006", "CV ARCHITEKT s.r.o.", "paid", "2026-02-26", "2026-03-28", 39000, "CZK", "cs", "2026-02-26"),
  createSeedInvoice("55668784", "2026-0005", "20260005", "Fornet Architectes", "paid", "2026-02-11", "2026-03-13", 360, "EUR", "en", "2026-03-11"),
  createSeedInvoice("55213663", "2026-0004", "20260004", "JA architekti, s.r.o.", "paid", "2026-01-29", "2026-02-28", 12000, "CZK", "cs", "2026-03-05"),
  createSeedInvoice("55213656", "2026-0003", "20260003", "Dive Architects AB", "paid", "2026-01-29", "2026-02-28", 660, "EUR", "en", "2026-02-11"),
  createSeedInvoice("55185373", "2026-0002", "20260002", "AT Plan&Arkitektur", "paid", "2026-01-28", "2026-02-27", 1000, "EUR", "en", "2026-03-03"),
  createSeedInvoice("54773134", "2026-0001", "20260001", "JA architekti, s.r.o.", "paid", "2026-01-29", "2026-02-28", 22500, "CZK", "cs", "2026-03-05"),
  createSeedInvoice("54031079", "2025-0043", "20250043", "Torami s.r.o.", "paid", "2025-12-18", "2026-01-17", 6000, "CZK", "cs", "2026-01-15"),
  createSeedInvoice("53731468", "2025-0042", "20250042", "mosa atelier s.r.o.", "paid", "2025-12-11", "2026-01-10", 28500, "CZK", "cs", "2025-12-11"),
  createSeedInvoice("53648352", "2025-0041", "20250041", "Fornet Architectes", "paid", "2025-12-09", "2026-01-08", 1020, "EUR", "en", "2025-12-17"),
  createSeedInvoice("53647561", "2025-0040", "20250040", "DKarchitekti, s.r.o.", "paid", "2025-12-09", "2026-01-08", 20000, "CZK", "cs", "2026-01-15"),
  createSeedInvoice("53460519", "2025-0039", "20250039", "JA architekti, s.r.o.", "paid", "2025-12-04", "2026-01-03", 30000, "CZK", "cs", "2026-01-15"),
  createSeedInvoice("52843813", "2025-0038", "20250038", "JA architekti, s.r.o.", "paid", "2025-11-18", "2025-12-18", 18000, "CZK", "cs", "2025-12-03"),
  createSeedInvoice("52699769", "2025-0037", "20250037", "Hanns-Georg Rimkus", "paid", "2025-11-13", "2025-12-13", 620, "EUR", "en", "2026-01-15"),
  createSeedInvoice("52618702", "2025-0036", "20250036", "Torami s.r.o.", "paid", "2025-11-11", "2025-12-11", 16000, "CZK", "cs", "2026-01-21"),
  createSeedInvoice("52003000", "2025-0035", "20250035", "VA Arkitektar", "paid", "2025-10-22", "2025-11-21", 12000, "EUR", "en", "2025-11-18")
];
