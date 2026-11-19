/* Atmosferi° films & 360° page: German and Czech copy (English is the source). */
(function () {
  "use strict";
  var D = window.I18N_DICT = window.I18N_DICT || {};
  D.de = D.de || {}; D.cs = D.cs || {};
  var rows = [
    // [english, german, czech]
    ["Films", "Filme", "Filmy"],
    ["360° tours", "360°-Touren", "360° prohlídky"],
    ["Visualisations", "Visualisierungen", "Vizualizace"],
    ["Films & 360° tours.", "Filme & 360°-Touren.", "Filmy a 360° prohlídky."],
    ["Films & 360° tours", "Filme & 360°-Touren", "Filmy a 360° prohlídky"],
    ["Architecture in motion: light, season and the way through a building, told in a short film or a tour you can walk yourself.", "Architektur in Bewegung: Licht, Jahreszeit und der Weg durch ein Gebäude, erzählt in einem kurzen Film oder einer Tour, die man selbst begeht.", "Architektura v pohybu: světlo, roční období a cesta budovou, vyprávěné krátkým filmem nebo prohlídkou, kterou si projdete sami."],
    ["Architectural films", "Architekturfilme", "Architektonické filmy"],
    ["Sound off", "Ton aus", "Zvuk vypnutý"],
    ["Sound on", "Ton an", "Zvuk zapnutý"],
    ["Play or pause the film", "Film abspielen oder pausieren", "Přehrát nebo pozastavit film"],
    ["Film position", "Position im Film", "Pozice ve filmu"],
    ["Choose a film", "Film wählen", "Vyberte film"],
    ["Mountain retreat", "Rückzugsort in den Bergen", "Horský dům"],
    ["A house on the slope above the lake, from first light to evening.", "Ein Haus am Hang über dem See, vom ersten Licht bis zum Abend.", "Dům ve svahu nad jezerem, od prvního světla do večera."],
    ["Exterior film · 0:39", "Außenfilm · 0:39", "Exteriérový film · 0:39"],
    ["Interior study", "Innenraumstudie", "Studie interiéru"],
    ["Fire, timber and the view: a slow walk through a mountain interior.", "Feuer, Holz und Ausblick: ein langsamer Gang durch ein Interieur in den Bergen.", "Oheň, dřevo a výhled: pomalá procházka horským interiérem."],
    ["Interior film · 0:40", "Innenraumfilm · 0:40", "Interiérový film · 0:40"],
    ["Forest cabin", "Waldhütte", "Chata v lese"],
    ["A short loop for a website header: morning mist over a cabin in the trees.", "Ein kurzer Loop für den Website-Header: Morgennebel über einer Hütte im Wald.", "Krátká smyčka do záhlaví webu: ranní mlha nad chatou mezi stromy."],
    ["Website loop · 0:06", "Website-Loop · 0:06", "Smyčka pro web · 0:06"],
    ["Step inside before it's built.", "Treten Sie ein, bevor es gebaut ist.", "Vejděte dovnitř dřív, než se postaví."],
    ["Look around, walk from room to room and open the details. The tour runs in the browser, on a phone and in a VR headset, with no app to install.", "Sehen Sie sich um, gehen Sie von Raum zu Raum und öffnen Sie Details. Die Tour läuft im Browser, auf dem Handy und in einer VR-Brille, ohne App.", "Rozhlédněte se, projděte místnost po místnosti a otevřete detaily. Prohlídka běží v prohlížeči, v telefonu i ve VR brýlích, bez instalace aplikace."],
    ["Explore in 360°", "In 360° erkunden", "Prozkoumat v 360°"],
    ["Open the VR tour ↗", "VR-Tour öffnen ↗", "Otevřít VR prohlídku ↗"],
    ["Drag", "Ziehen", "Tažením"],
    ["to look around", "zum Umsehen", "se rozhlédnete"],
    ["Pinch or ⌘ + scroll", "Zwei Finger oder ⌘ + Scrollen", "Dvěma prsty nebo ⌘ + kolečko"],
    ["to zoom", "zum Zoomen", "přiblížíte"],
    ["Dots", "Punkte", "Body"],
    ["move between rooms", "führen von Raum zu Raum", "vedou mezi místnostmi"],
    ["Rooms", "Räume", "Místnosti"],
    ["Exit tour ×", "Tour verlassen ×", "Ukončit prohlídku ×"],
    ["Auto-rotate", "Automatisch drehen", "Automatické otáčení"],
    ["Fullscreen", "Vollbild", "Celá obrazovka"],
    ["Where it works", "Wo es wirkt", "Kde to funguje"],
    ["One model,", "Ein Modell,", "Jeden model,"],
    ["many ways to show it.", "viele Wege, es zu zeigen.", "mnoho způsobů, jak ho ukázat."],
    ["Competitions and planning", "Wettbewerbe und Genehmigung", "Soutěže a povolování"],
    ["A short film that explains the idea, the site and the light in under a minute.", "Ein kurzer Film, der Idee, Ort und Licht in unter einer Minute erklärt.", "Krátký film, který za necelou minutu vysvětlí myšlenku, místo i světlo."],
    ["Sales and marketing", "Vertrieb und Marketing", "Prodej a marketing"],
    ["Loops for the website header and social media, tours for buyers who cannot visit yet.", "Loops für Website-Header und Social Media, Touren für Käufer, die noch nicht vor Ort sein können.", "Smyčky do záhlaví webu a na sociální sítě, prohlídky pro kupce, kteří se zatím nemohou přijít podívat."],
    ["Client presentations", "Kundenpräsentationen", "Prezentace klientům"],
    ["Walk through the rooms together on screen or in a headset before decisions are fixed.", "Gehen Sie gemeinsam am Bildschirm oder mit VR-Brille durch die Räume, bevor Entscheidungen feststehen.", "Projděte místnosti společně na obrazovce nebo ve VR brýlích dřív, než padnou rozhodnutí."],
    ["Your website", "Ihre Website", "Váš web"],
    ["Films and tours embedded straight into the project page, fast on any phone.", "Filme und Touren direkt in der Projektseite, schnell auf jedem Handy.", "Filmy a prohlídky vložené přímo do stránky projektu, rychlé na každém telefonu."],
    ["Skip to content", "Zum Inhalt springen", "Přeskočit na obsah"],
    ["Films & 360° tours", "Filme & 360°-Touren", "Filmy a 360° prohlídky"]
  ];
  rows.forEach(function (r) { if (!(r[0] in D.de)) D.de[r[0]] = r[1]; if (!(r[0] in D.cs)) D.cs[r[0]] = r[2]; });
})();
