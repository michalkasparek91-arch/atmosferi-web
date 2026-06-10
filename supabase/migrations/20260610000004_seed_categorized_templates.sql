-- 1. Promazání starých šablon
DELETE FROM public.email_templates;

-- 2. Vložení nových roztříděných šablon pro Atmosferi Web
INSERT INTO public.email_templates (
    name, 
    slug, 
    category,
    target_role,
    subject, 
    emoji,
    greeting,
    body, 
    layout_type, 
    trigger_type, 
    is_enabled, 
    show_job_widget, 
    show_cta_button, 
    cta_text,
    cta_url,
    ps_footer_enabled,
    ps_footer_text,
    language,
    hero_image_url
) VALUES 

-- ARCHITEKTI A DESIGNÉŘI
(
    'Architekti: Luxusní portfolia',
    'architekti-portfolio-cz',
    'architekti',
    'Architekt / Designér',
    'Vaše projekty si zaslouží lepší online prezentaci',
    '🏛️',
    'Dobrý den,',
    'píšu Vám, protože se specializujeme na tvorbu prémiových webových stránek přímo pro architektonická a designová studia. Všiml jsem si, že máte spoustu skvělých realizací, ale Váš aktuální web by je dokázal prodat mnohem lépe.

Tvoříme vizuálně čisté a bleskově rychlé weby, které dají vyniknout Vaší práci a pomohou Vám přilákat tu správnou (a bonitnější) klientelu. 

Rádi pro Vás nezávazně připravíme ukázku toho, jak by mohla vypadat Vaše nová online identita.',
    'magazine',
    'cron',
    true,
    false,
    true,
    'Prohlédnout naše reference',
    'https://atmosferi.com/reference',
    true,
    'Pokud právě teď nový web neřešíte, omlouvám se za vyrušení. V opačném případě se budu těšit na nezávazný hovor.',
    'cs',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'
),

-- DEVELOPERSKÉ PROJEKTY
(
    'Developeři: Prodejní weby projektů',
    'developeri-projekty-cz',
    'developeri',
    'Developer / Investor',
    'Jak rychle prodáváte své nové projekty?',
    '🏗️',
    'Vážený pane / Vážená paní,',
    'dnešní trh s nemovitostmi vyžaduje bezchybnou prezentaci. Úspěch developerského projektu často závisí na tom, jak rychle a efektivně dokážete oslovit kupce ještě před samotnou dostavbou.

V Atmosferi vytváříme vysoce konverzní "sniper" landing page, které mění návštěvníky v reálné zájemce. Propojíme web s 3D vizualizacemi, interaktivním výběrem bytů a napojíme ho přímo na Vaše CRM.

Rádi Vám ukážeme, jak naše weby zrychlují prodej projektů.',
    'sniper',
    'cron',
    true,
    true,
    true,
    'Mám zájem o ukázku zdarma',
    'https://atmosferi.com/sluzby',
    true,
    'Díky automatizaci sběru kontaktů ušetří Váš prodejní tým desítky hodin měsíčně.',
    'cs',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop'
),

-- STAVEBNÍ FIRMY
(
    'Stavebnictví: Budování důvěry',
    'stavebni-firmy-cz',
    'stavebnictvi',
    'Majitel stavební firmy',
    'Získáváte ty nejlepší zakázky z internetu?',
    '👷',
    'Dobrý den,',
    'mnoho spolehlivých stavebních firem dnes přichází o ty nejlepší zakázky (nebo o kvalitní zaměstnance) jen proto, že jejich web neodpovídá kvalitě jejich reálné práce. Zastaralý web nevzbuzuje důvěru.

Pomáháme stavebním firmám vybudovat silnou online prezenci. Vytvoříme Vám moderní web, který jasně odprezentuje Vaši odbornost, historii a úspěšné projekty.

Cílem není jen "mít web", ale mít nástroj, který generuje stabilní přísun těch správných poptávek.',
    'standard',
    'cron',
    true,
    true,
    true,
    'Získat nezávaznou kalkulaci',
    'https://atmosferi.com/kontakt',
    false,
    '',
    'cs',
    'https://images.unsplash.com/photo-1541888086953-e5541c4f5cd8?q=80&w=2070&auto=format&fit=crop'
),

-- REALITNÍ MAKLÉŘI A KANCELÁŘE
(
    'Reality: Osobní značka makléře',
    'realitni-makleri-cz',
    'reality',
    'Realitní makléř / Majitel RK',
    'Jak se odlišujete od tisíců dalších makléřů?',
    '🏡',
    'Dobrý den,',
    'realitní trh je extrémně konkurenční a nespoléhat se jen na Sreality je dnes nutnost. Ti nejúspěšnější makléři si budují vlastní osobní značku a generují poptávky přes svůj vlastní web.

Vytvoříme pro Vás exkluzivní osobní web, který podtrhne Vaši profesionalitu, odprezentuje Vaše úspěšné prodeje a přesvědčí prodávající, že právě Vy jste ta správná volba pro prodej jejich nemovitosti.

Nenechte své kontakty konkurenci. Budujte vlastní databázi klientů.',
    'magazine',
    'cron',
    true,
    false,
    true,
    'Chci svůj vlastní web',
    'https://atmosferi.com',
    true,
    'Nabízíme i napojení webu na realitní software pro automatický import nabídek.',
    'cs',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop'
);
