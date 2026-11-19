/* Atmosferi° websites page: German and Czech copy (English is the source). */
(function () {
  "use strict";
  var D = window.I18N_DICT = window.I18N_DICT || {};
  D.de = D.de || {}; D.cs = D.cs || {};
  var rows = [
    // [english, german, czech]
    ["Websites", "Websites", "Weby"],
    ["Websites for architects.", "Websites für Architekten.", "Weby pro architekty."],
    ["I'm Michal, an architect who designs and builds websites. I help you present your projects clearly, from the images and text to the finished site.", "Ich bin Michal, Architekt, und ich gestalte und programmiere Websites. Ich helfe Ihnen, Ihre Projekte klar zu präsentieren, von den Bildern und Texten bis zur fertigen Website.", "Jsem Michal, architekt, který navrhuje a staví weby. Pomůžu vám přehledně představit vaše projekty, od obrázků a textů až po hotový web."],
    ["Tell me about it", "Erzählen Sie mir davon", "Napište mi o něm"],
    ["Website concepts", "Website-Konzepte", "Koncepty webů"],
    ["A few ways to show your work.", "Ein paar Wege, Ihre Arbeit zu zeigen.", "Několik způsobů, jak ukázat vaši práci."],
    ["Working concepts, each exploring a different way to present architecture.", "Funktionierende Konzepte, jedes zeigt Architektur auf eine andere Art.", "Funkční koncepty, každý ukazuje architekturu jinak."],
    ["Previous website", "Vorherige Website", "Předchozí web"],
    ["Next website", "Nächste Website", "Další web"],
    ["Open the website ↗", "Website öffnen ↗", "Otevřít web ↗"],
    ["Website concepts", "Website-Konzepte", "Koncepty webů"],
    ["Architecture studio. Big projects, big images, a confident voice.", "Architekturbüro. Große Projekte, große Bilder, eine selbstbewusste Stimme.", "Architektonické studio. Velké projekty, velké obrázky, sebevědomý hlas."],
    ["Architecture studio. Quiet Nordic houses, told slowly with light and space.", "Architekturbüro. Stille nordische Häuser, langsam erzählt mit Licht und Raum.", "Architektonické studio. Tiché severské domy, vyprávěné pomalu světlem a prostorem."],
    ["Residential development. A tower floor by floor, with apartments buyers can compare.", "Wohnprojekt. Ein Turm Etage für Etage, mit Wohnungen, die Käufer vergleichen können.", "Rezidenční projekt. Věž patro po patře a byty, které si kupci mohou porovnat."],
    ["Interior design studio. Rooms, materials and the light that ties them together.", "Innenarchitekturbüro. Räume, Materialien und das Licht, das sie verbindet.", "Studio interiérového designu. Místnosti, materiály a světlo, které je spojuje."],
    ["Waterfront development. A whole neighbourhood with a map, homes and events.", "Quartier am Wasser. Ein ganzes Viertel mit Karte, Wohnungen und Veranstaltungen.", "Projekt na nábřeží. Celá čtvrť s mapou, byty a akcemi."],
    ["What I do", "Was ich mache", "Co dělám"],
    ["From the first image", "Vom ersten Bild", "Od prvního obrázku"],
    ["to the finished site.", "bis zur fertigen Website.", "po hotový web."],
    ["Web design", "Webdesign", "Webdesign"],
    ["A considered website that makes your projects easy to browse, with clear navigation and images that have room to breathe.", "Eine durchdachte Website, in der man Ihre Projekte leicht durchsucht, mit klarer Navigation und Bildern, die Raum zum Atmen haben.", "Promyšlený web, ve kterém se vaše projekty snadno procházejí, s jasnou navigací a obrázky, které mají prostor dýchat."],
    ["Development", "Entwicklung", "Vývoj"],
    ["I build the site too. It's fast, works on phones and lets you add projects or change text without needing a developer.", "Ich baue die Website auch. Sie ist schnell, funktioniert auf dem Handy, und Sie können Projekte und Texte selbst ändern, ganz ohne Entwickler.", "Web i postavím. Je rychlý, funguje v telefonu a projekty nebo texty si upravíte sami, bez programátora."],
    ["3D & visualisation", "3D & Visualisierung", "3D a vizualizace"],
    ["I can help select and improve your existing images, or create renders, films and 360° tours for projects that aren't built yet.", "Ich helfe, Ihre vorhandenen Bilder auszuwählen und zu verbessern, oder erstelle Renderings, Filme und 360°-Touren für noch nicht gebaute Projekte.", "Pomůžu vybrat a vylepšit vaše stávající obrázky, nebo vytvořím vizualizace, filmy a 360° prohlídky projektů, které ještě nestojí."],
    ["Films & 360° tours →", "Filme & 360°-Touren →", "Filmy a 360° prohlídky →"],
    ["Behind the studio", "Hinter dem Studio", "Kdo za tím stojí"],
    ["An architect who builds websites.", "Ein Architekt, der Websites baut.", "Architekt, který staví weby."],
    ["I trained as an architect and have spent more than a decade making visualisations for architecture studios and developers. That experience helps me choose the right images, organise projects and explain what makes a building interesting.", "Ich bin ausgebildeter Architekt und erstelle seit mehr als zehn Jahren Visualisierungen für Architekturbüros und Bauträger. Diese Erfahrung hilft mir, die richtigen Bilder zu wählen, Projekte zu ordnen und zu erklären, was ein Gebäude besonders macht.", "Vystudoval jsem architekturu a přes deset let dělám vizualizace pro architektonická studia a developery. Díky tomu umím vybrat správné obrázky, uspořádat projekty a vysvětlit, co je na stavbě zajímavé."],
    ["I design and code the websites myself, so you'll work directly with the person making yours.", "Ich gestalte und programmiere die Websites selbst, Sie arbeiten also direkt mit der Person, die Ihre macht.", "Weby sám navrhuji i programuji, takže jednáte přímo s tím, kdo ten váš dělá."],
    ["Founder, Atmosferi°", "Gründer, Atmosferi°", "Zakladatel, Atmosferi°"],
    ["Websites", "Websites", "Weby"]
  ];
  rows.forEach(function (r) { if (!(r[0] in D.de)) D.de[r[0]] = r[1]; if (!(r[0] in D.cs)) D.cs[r[0]] = r[2]; });
})();
