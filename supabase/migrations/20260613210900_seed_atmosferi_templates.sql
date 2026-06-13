INSERT INTO email_templates (
  slug, name, category, subject, greeting, body, cta_text, cta_url, layout_type, target_role, trigger_type, is_enabled, hero_image_url, segment_filters
) VALUES
(
  'atmosferi-arch',
  'Atmosferi: Architektonické studio',
  'architekti',
  'Web pro {{studio}} — portfolio na úrovni vaší architektury',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Specializuji se na portfolia architektonických studií — editoriální, obrazem vedené weby s redakčním systémem, ve kterém si projekty spravujete sami. K tomu umíme dodat i vizualizace nepostavených staveb.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/07-loop.webp", "https://atmosferi.com/demos/atmosferi-viz/img/08-courtyards.webp", "https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp"]}'::jsonb
),
(
  'atmosferi-interior',
  'Atmosferi: Interiérové studio',
  'architekti',
  'Web a vizualizace pro {{studio}}',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro interiérová studia stavíme weby, kde vyniknou materiály, světlo a detail — a doplňujeme je fotorealistickými vizualizacemi interiérů a 360° prohlídkami, ve kterých klient projde návrh ještě před realizací.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/chalet-living.jpg',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/chalet-dining.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/chalet-bedroom.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb
),
(
  'atmosferi-developer',
  'Atmosferi: Realitní developer',
  'developeri',
  'Prezentace projektu, která prodává — web, vizualizace a 360° prohlídky',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro developery stavíme prodejní prezentace projektů — web s přehledem dostupnosti jednotek, fotorealistické vizualizace, animované průlety a interaktivní 360° prohlídky. Kupující projekt pochopí dřív, než se kopne do země.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp", "https://atmosferi.com/demos/atmosferi-viz/img/09-horizon.webp", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb
),
(
  'atmosferi-urban',
  'Atmosferi: Urbanismus',
  'stavebnictvi',
  'Srozumitelná prezentace vašeho projektu pro veřejnost',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro urbanistické a veřejné projekty stavíme weby, které srozumitelně vysvětlí záměr občanům i zastupitelům — mapy, fáze, vizualizace a 360° pohledy na jednom přehledném místě.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/08-courtyards.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/05-crossing.webp", "https://atmosferi.com/demos/atmosferi-viz/img/04-tidewater.webp", "https://atmosferi.com/demos/atmosferi-viz/img/07-loop.webp"]}'::jsonb
),
(
  'atmosferi-individual',
  'Atmosferi: Samostatný architekt',
  'architekti',
  'Portfolio web, který staví vaši práci do popředí',
  'Dobrý den, {{osloveni}},

{{icebreaker}}',
  'jmenuji se Michal Kašpárek a vedu studio Atmosferi — navrhujeme, programujeme a vizualizujeme weby výhradně pro lidi, kteří tvoří prostor.

Pro samostatné architekty děláme čisté, rychlé portfolio weby, které práci nechají dýchat — bez šablonovitosti, s důrazem na typografii a obraz. Ideální vstupní úroveň, kterou lze později rozšířit.

Rád vám během dvaceti minut ukážu pár konkrétních směrů, jak by web pro {{studio}} mohl vypadat. Hodil by se vám příští týden krátký hovor?',
  'Zobrazit ukázky',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/12-fjord.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/06-canopy.webp", "https://atmosferi.com/demos/atmosferi-viz/img/03-concert.webp", "https://atmosferi.com/demos/atmosferi-viz/img/12-fjord.webp"]}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  greeting = EXCLUDED.greeting,
  body = EXCLUDED.body,
  hero_image_url = EXCLUDED.hero_image_url,
  segment_filters = EXCLUDED.segment_filters;
