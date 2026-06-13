-- ===========================================================================
-- Atmosferi° — cold-outreach email templates (40 rows = 8 × 5)
-- Target: public.email_templates (Supabase). Safe to re-run (idempotent on slug).
-- Merge variables: {{jmeno}} (already supported) and {{studio}}.
-- ===========================================================================

INSERT INTO public.email_templates
  (slug, category, name, subject, greeting, body, cta_text, cta_url, target_role, trigger_type, is_enabled)
VALUES
  ('outreach-cz-arch', 'outreach', 'Oslovení · Architektonické studio · Česko', 'Vizualizace pro {{studio}} — a web, který je ukáže', 'Dobrý den, {{jmeno}},', 'jsem Michal z pražského studia Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor. Právě proto víme, jak moc u vaší práce záleží na obrazu, světle a detailu. Ozývám se rovnou k věci:

U architektonických studií začínám vizualizacemi — špičkové rendery nasvícené a vyladěné jako fotografie, ne jako strojový výstup. Ukážou projekt dřív, než stojí. A k tomu postavím web, který těm obrazům dodá rámec — velké fotky, čistá typografie a administrace, ve které si projekty spravujete sami.

Rád vám pošlu pár ukázek na míru {{studio}} a do dvaceti minut to spolu probereme. Hodí se vám tento týden krátký hovor?', 'Mrknout na ukázky', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=cs', 'all', 'manual', true),
  ('outreach-cz-interior', 'outreach', 'Oslovení · Interiérové studio · Česko', 'Web a vizualizace pro {{studio}}', 'Dobrý den, {{jmeno}},', 'jsem Michal z pražského studia Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor. Právě proto víme, jak moc u vaší práce záleží na obrazu, světle a detailu. Ozývám se rovnou k věci:

U interiérových studií stavíme weby, kde vynikne materiál, světlo a detail — a k tomu fotorealistické vizualizace interiérů i 360° prohlídky, ve kterých si klient projde návrh ještě před realizací.

Rád vám pošlu pár ukázek na míru {{studio}} a do dvaceti minut to spolu probereme. Hodí se vám tento týden krátký hovor?', 'Mrknout na ukázky', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-cz-developer', 'outreach', 'Oslovení · Realitní developer · Česko', 'Prodejní web pro váš nový projekt', 'Dobrý den, {{jmeno}},', 'jsem Michal z pražského studia Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor. Právě proto víme, jak moc u vaší práce záleží na obrazu, světle a detailu. Ozývám se rovnou k věci:

Pro developery děláme prezentace projektů, které prodávají — web s přehledem dostupnosti jednotek, fotorealistické vizualizace, animované průlety a 360° prohlídky. Kupující projekt pochopí dřív, než se kopne do země.

Rád vám pošlu pár ukázek na míru {{studio}} a do dvaceti minut to spolu probereme. Hodí se vám tento týden krátký hovor?', 'Mrknout na ukázky', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-cz-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Česko', 'Srozumitelná prezentace vašeho projektu pro veřejnost', 'Dobrý den, {{jmeno}},', 'jsem Michal z pražského studia Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor. Právě proto víme, jak moc u vaší práce záleží na obrazu, světle a detailu. Ozývám se rovnou k věci:

U urbanistických a veřejných projektů děláme weby, které záměr srozumitelně vysvětlí občanům i zastupitelům — mapy, fáze, vizualizace a 360° pohledy přehledně na jednom místě.

Rád vám pošlu pár ukázek na míru {{studio}} a do dvaceti minut to spolu probereme. Hodí se vám tento týden krátký hovor?', 'Mrknout na ukázky', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-cz-individual', 'outreach', 'Oslovení · Samostatný architekt · Česko', 'Portfolio web pro vaši práci', 'Dobrý den, {{jmeno}},', 'jsem Michal z pražského studia Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor. Právě proto víme, jak moc u vaší práce záleží na obrazu, světle a detailu. Ozývám se rovnou k věci:

Pro samostatné architekty děláme čisté, rychlé portfolio weby, které práci nechají dýchat — bez šablony, s důrazem na typografii a obraz. Ideální vstup, který lze později rozšířit.

Rád vám pošlu pár ukázek na míru {{studio}} a do dvaceti minut to spolu probereme. Hodí se vám tento týden krátký hovor?', 'Mrknout na ukázky', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-de-arch', 'outreach', 'Oslovení · Architektonické studio · Německo', 'Visualisierung für {{studio}} — und eine Website, die sie zeigt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Architekturbüros beginne ich mit der Visualisierung — erstklassige Renderings, ausgeleuchtet und gegradet wie Fotografie, nicht wie ein Maschinen-Output. Sie zeigen das Projekt, bevor es steht. Dazu baue ich eine Website, die diesen Bildern den Rahmen gibt — große Bilder, klare Typografie und ein CMS, das Sie selbst pflegen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=de', 'all', 'manual', true),
  ('outreach-de-interior', 'outreach', 'Oslovení · Interiérové studio · Německo', 'Website und Visualisierung für {{studio}}', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Innenarchitektur-Studios bauen wir Websites, auf denen Material, Licht und Detail wirken — dazu fotorealistische Innenraum-Visualisierungen und 360°-Rundgänge, durch die Ihre Kunden den Entwurf vorab begehen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-de-developer', 'outreach', 'Oslovení · Realitní developer · Německo', 'Eine Verkaufs-Website für Ihr neues Projekt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für Entwickler machen wir Projektpräsentationen, die verkaufen — Website mit Verfügbarkeitsübersicht, fotorealistische Visualisierungen, animierte Kameraflüge und 360°-Touren. Käufer verstehen das Projekt, bevor der erste Spatenstich erfolgt.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-de-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Německo', 'Eine klare, öffentliche Präsentation Ihres Projekts', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei städtebaulichen und öffentlichen Projekten machen wir Websites, die das Vorhaben Bürgern wie Entscheidern verständlich machen — Karten, Phasen, Visualisierungen und 360°-Ansichten übersichtlich an einem Ort.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-de-individual', 'outreach', 'Oslovení · Samostatný architekt · Německo', 'Eine Portfolio-Website für Ihre Arbeit', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für selbstständige Architekt:innen machen wir klare, schnelle Portfolio-Websites, die der Arbeit Raum lassen — keine Vorlage, Fokus auf Typografie und Bild. Ein idealer Einstieg, später erweiterbar.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-at-arch', 'outreach', 'Oslovení · Architektonické studio · Rakousko', 'Visualisierung für {{studio}} — und eine Website, die sie zeigt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Architekturbüros beginne ich mit der Visualisierung — erstklassige Renderings, ausgeleuchtet und gegradet wie Fotografie, nicht wie ein Maschinen-Output. Sie zeigen das Projekt, bevor es steht. Dazu baue ich eine Website, die diesen Bildern den Rahmen gibt — große Bilder, klare Typografie und ein CMS, das Sie selbst pflegen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=de', 'all', 'manual', true),
  ('outreach-at-interior', 'outreach', 'Oslovení · Interiérové studio · Rakousko', 'Website und Visualisierung für {{studio}}', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Innenarchitektur-Studios bauen wir Websites, auf denen Material, Licht und Detail wirken — dazu fotorealistische Innenraum-Visualisierungen und 360°-Rundgänge, durch die Ihre Kunden den Entwurf vorab begehen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-at-developer', 'outreach', 'Oslovení · Realitní developer · Rakousko', 'Eine Verkaufs-Website für Ihr neues Projekt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für Entwickler machen wir Projektpräsentationen, die verkaufen — Website mit Verfügbarkeitsübersicht, fotorealistische Visualisierungen, animierte Kameraflüge und 360°-Touren. Käufer verstehen das Projekt, bevor der erste Spatenstich erfolgt.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-at-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Rakousko', 'Eine klare, öffentliche Präsentation Ihres Projekts', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei städtebaulichen und öffentlichen Projekten machen wir Websites, die das Vorhaben Bürgern wie Entscheidern verständlich machen — Karten, Phasen, Visualisierungen und 360°-Ansichten übersichtlich an einem Ort.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-at-individual', 'outreach', 'Oslovení · Samostatný architekt · Rakousko', 'Eine Portfolio-Website für Ihre Arbeit', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschließlich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für selbstständige Architekt:innen machen wir klare, schnelle Portfolio-Websites, die der Arbeit Raum lassen — keine Vorlage, Fokus auf Typografie und Bild. Ein idealer Einstieg, später erweiterbar.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-ch-arch', 'outreach', 'Oslovení · Architektonické studio · Švýcarsko', 'Visualisierung für {{studio}} — und eine Website, die sie zeigt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschliesslich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Architekturbüros beginne ich mit der Visualisierung — erstklassige Renderings, ausgeleuchtet und gegradet wie Fotografie, nicht wie ein Maschinen-Output. Sie zeigen das Projekt, bevor es steht. Dazu baue ich eine Website, die diesen Bildern den Rahmen gibt — grosse Bilder, klare Typografie und ein CMS, das Sie selbst pflegen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=de', 'all', 'manual', true),
  ('outreach-ch-interior', 'outreach', 'Oslovení · Interiérové studio · Švýcarsko', 'Website und Visualisierung für {{studio}}', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschliesslich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei Innenarchitektur-Studios bauen wir Websites, auf denen Material, Licht und Detail wirken — dazu fotorealistische Innenraum-Visualisierungen und 360°-Rundgänge, durch die Ihre Kunden den Entwurf vorab begehen.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-ch-developer', 'outreach', 'Oslovení · Realitní developer · Švýcarsko', 'Eine Verkaufs-Website für Ihr neues Projekt', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschliesslich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für Entwickler machen wir Projektpräsentationen, die verkaufen — Website mit Verfügbarkeitsübersicht, fotorealistische Visualisierungen, animierte Kameraflüge und 360°-Touren. Käufer verstehen das Projekt, bevor der erste Spatenstich erfolgt.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-ch-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Švýcarsko', 'Eine klare, öffentliche Präsentation Ihres Projekts', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschliesslich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Bei städtebaulichen und öffentlichen Projekten machen wir Websites, die das Vorhaben Bürgern wie Entscheidern verständlich machen — Karten, Phasen, Visualisierungen und 360°-Ansichten übersichtlich an einem Ort.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-ch-individual', 'outreach', 'Oslovení · Samostatný architekt · Švýcarsko', 'Eine Portfolio-Website für Ihre Arbeit', 'Guten Tag {{jmeno}},', 'ich bin Michal vom Prager Studio Atmosferi — wir gestalten, entwickeln und visualisieren Websites ausschliesslich für Menschen, die Raum gestalten. Genau deshalb wissen wir, wie sehr es bei Ihrer Arbeit auf Bild, Licht und Detail ankommt. Gleich zur Sache:

Für selbstständige Architekt:innen machen wir klare, schnelle Portfolio-Websites, die der Arbeit Raum lassen — keine Vorlage, Fokus auf Typografie und Bild. Ein idealer Einstieg, später erweiterbar.

Ich schicke Ihnen gerne ein paar Ansätze für {{studio}} und wir besprechen es in zwanzig Minuten. Hätten Sie diese Woche kurz Zeit?', 'Arbeiten ansehen', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-fi-arch', 'outreach', 'Oslovení · Architektonické studio · Finsko', 'Visualisation for {{studio}} — and a website that shows it', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With architecture studios I begin with the visualisation — top-tier renders lit and graded like photography, not machine output. They show the project before it''s built. Then I build a website that gives those images their frame — large images, clean typography and a CMS you run yourself.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=en', 'all', 'manual', true),
  ('outreach-fi-interior', 'outreach', 'Oslovení · Interiérové studio · Finsko', 'A website and visualisation for {{studio}}', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With interior studios, we build sites where material, light and detail come through — plus photoreal interior visualisations and 360° tours that let a client walk the design before it''s built.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-fi-developer', 'outreach', 'Oslovení · Realitní developer · Finsko', 'A sales website for your next project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For developers we make project presentations that sell — a site with a unit-availability overview, photoreal visualisations, animated fly-throughs and 360° tours. Buyers get the project before the ground is broken.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-fi-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Finsko', 'A clear, public-facing presentation of your project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With urban and public projects, we make sites that explain the intent clearly to residents and officials alike — maps, phases, visualisations and 360° views in one legible place.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-fi-individual', 'outreach', 'Oslovení · Samostatný architekt · Finsko', 'A portfolio site for your work', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For individual architects we make clean, fast portfolio sites that let the work breathe — no template, focused on typography and image. An ideal start you can grow later.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-no-arch', 'outreach', 'Oslovení · Architektonické studio · Norsko', 'Visualisation for {{studio}} — and a website that shows it', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With architecture studios I begin with the visualisation — top-tier renders lit and graded like photography, not machine output. They show the project before it''s built. Then I build a website that gives those images their frame — large images, clean typography and a CMS you run yourself.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=en', 'all', 'manual', true),
  ('outreach-no-interior', 'outreach', 'Oslovení · Interiérové studio · Norsko', 'A website and visualisation for {{studio}}', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With interior studios, we build sites where material, light and detail come through — plus photoreal interior visualisations and 360° tours that let a client walk the design before it''s built.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-no-developer', 'outreach', 'Oslovení · Realitní developer · Norsko', 'A sales website for your next project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For developers we make project presentations that sell — a site with a unit-availability overview, photoreal visualisations, animated fly-throughs and 360° tours. Buyers get the project before the ground is broken.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-no-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Norsko', 'A clear, public-facing presentation of your project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With urban and public projects, we make sites that explain the intent clearly to residents and officials alike — maps, phases, visualisations and 360° views in one legible place.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-no-individual', 'outreach', 'Oslovení · Samostatný architekt · Norsko', 'A portfolio site for your work', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For individual architects we make clean, fast portfolio sites that let the work breathe — no template, focused on typography and image. An ideal start you can grow later.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-us-arch', 'outreach', 'Oslovení · Architektonické studio · USA', 'Visualisation for {{studio}} — and a website that shows it', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualize websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With architecture studios I begin with the visualization — top-tier renders lit and graded like photography, not machine output. They show the project before it''s built. Then I build a website that gives those images their frame — large images, clean typography and a CMS you run yourself.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=en', 'all', 'manual', true),
  ('outreach-us-interior', 'outreach', 'Oslovení · Interiérové studio · USA', 'A website and visualization for {{studio}}', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualize websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With interior studios, we build sites where material, light and detail come through — plus photoreal interior visualizations and 360° tours that let a client walk the design before it''s built.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-us-developer', 'outreach', 'Oslovení · Realitní developer · USA', 'A sales website for your next project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualize websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For developers we make project presentations that sell — a site with a unit-availability overview, photoreal visualizations, animated fly-throughs and 360° tours. Buyers get the project before the ground is broken.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-us-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · USA', 'A clear, public-facing presentation of your project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualize websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With urban and public projects, we make sites that explain the intent clearly to residents and officials alike — maps, phases, visualizations and 360° views in one legible place.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-us-individual', 'outreach', 'Oslovení · Samostatný architekt · USA', 'A portfolio site for your work', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualize websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For individual architects we make clean, fast portfolio sites that let the work breathe — no template, focused on typography and image. An ideal start you can grow later.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-au-arch', 'outreach', 'Oslovení · Architektonické studio · Austrálie', 'Visualisation for {{studio}} — and a website that shows it', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With architecture studios I begin with the visualisation — top-tier renders lit and graded like photography, not machine output. They show the project before it''s built. Then I build a website that gives those images their frame — large images, clean typography and a CMS you run yourself.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com/demos/atmosferi-viz/index.html?lang=en', 'all', 'manual', true),
  ('outreach-au-interior', 'outreach', 'Oslovení · Interiérové studio · Austrálie', 'A website and visualisation for {{studio}}', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With interior studios, we build sites where material, light and detail come through — plus photoreal interior visualisations and 360° tours that let a client walk the design before it''s built.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-au-developer', 'outreach', 'Oslovení · Realitní developer · Austrálie', 'A sales website for your next project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For developers we make project presentations that sell — a site with a unit-availability overview, photoreal visualisations, animated fly-throughs and 360° tours. Buyers get the project before the ground is broken.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-au-urban', 'outreach', 'Oslovení · Urbanismus / veřejný sektor · Austrálie', 'A clear, public-facing presentation of your project', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

With urban and public projects, we make sites that explain the intent clearly to residents and officials alike — maps, phases, visualisations and 360° views in one legible place.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true),
  ('outreach-au-individual', 'outreach', 'Oslovení · Samostatný architekt · Austrálie', 'A portfolio site for your work', 'Hello {{jmeno}},', 'I''m Michal from Atmosferi, a Prague studio — we design, build and visualise websites only for people who shape space. That''s exactly why we know how much your work lives on image, light and detail. Straight to the point:

For individual architects we make clean, fast portfolio sites that let the work breathe — no template, focused on typography and image. An ideal start you can grow later.

I''ll send a few directions for {{studio}} and we can talk it through in twenty minutes. Would you have time for a short call this week?', 'See the work', 'https://atmosferi.com', 'all', 'manual', true)
ON CONFLICT (slug) DO UPDATE SET
  category=EXCLUDED.category, name=EXCLUDED.name, subject=EXCLUDED.subject,
  greeting=EXCLUDED.greeting, body=EXCLUDED.body, cta_text=EXCLUDED.cta_text,
  cta_url=EXCLUDED.cta_url, target_role=EXCLUDED.target_role,
  trigger_type=EXCLUDED.trigger_type, is_enabled=EXCLUDED.is_enabled, updated_at=NOW();
