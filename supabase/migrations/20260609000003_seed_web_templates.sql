-- Vložení úvodních šablon pro kampaň tvorby webů
INSERT INTO public.email_templates (
    name, 
    slug, 
    subject, 
    body, 
    layout_type, 
    category, 
    trigger_type, 
    is_enabled, 
    show_job_widget, 
    show_cta_button, 
    ps_footer_enabled, 
    language
) VALUES 
-- ARCHITEKTI A DESIGNÉŘI
(
    'Architekti: Portfolia (CZ)',
    'architekti-weby-cz',
    'Vaše architektonické/designové portfolio online',
    '{{icebreaker}}

Píšu Vám, protože se specializujeme na tvorbu prémiových webových stránek a digitálních portfolií přímo pro architektonická a designová studia. Všiml jsem si, že máte spoustu skvělých realizací, ale moderní a rychlý web by je dokázal prodat mnohem lépe.

Tvoříme vizuálně čisté stránky, které dají vyniknout Vaší práci a pomohou Vám přilákat tu správnou (a bonitnější) klientelu. 

Zvažovali jste v poslední době modernizaci Vaší webové prezentace? Rád Vám ukážu pár našich referencí, pokud Vám to dává smysl.

Ať se daří,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'cs'
),
(
    'Architekti: Portfólia (SK)',
    'architekti-weby-sk',
    'Vaše architektonické/dizajnové portfólio online',
    '{{icebreaker}}

Píšem Vám, pretože sa špecializujeme na tvorbu prémiových webových stránok a digitálnych portfólií priamo pre architektonické a dizajnové štúdiá. Všimol som si, že máte množstvo skvelých realizácií, ale moderný a rýchly web by ich dokázal predať oveľa lepšie.

Tvoríme vizuálne čisté stránky, ktoré dajú vyniknúť Vašej práci a pomôžu Vám prilákať tú správnu (a bonitnejšiu) klientelu.

Zvažovali ste v poslednej dobe modernizáciu Vašej webovej prezentácie? Rád Vám ukážem zopár našich referencií, ak Vám to dáva zmysel.

Nech sa darí,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'sk'
),
(
    'Architects: Portfolios (EN)',
    'architekti-weby-en',
    'Upgrading your architecture/design portfolio',
    '{{icebreaker}}

I am reaching out because we specialize in creating premium websites and digital portfolios specifically for architecture and interior design studios. I noticed you have some fantastic projects, but a modern, fast website could showcase them much more effectively.

We build visually clean websites that highlight your work and help attract the right, high-end clients.

Have you considered updating your online presence recently? If this sounds interesting, I would love to show you some of our recent work.

Best regards,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'en'
),
(
    'Architekten: Portfolios (DE)',
    'architekti-weby-de',
    'Ihr Architektur-/Design-Portfolio online',
    '{{icebreaker}}

Ich schreibe Ihnen, da wir uns auf die Erstellung von Premium-Websites und digitalen Portfolios speziell für Architektur- und Designstudios spezialisiert haben. Mir ist aufgefallen, dass Sie fantastische Projekte haben, aber eine moderne, schnelle Website könnte diese noch viel besser zur Geltung bringen.

Wir erstellen visuell saubere Websites, die Ihre Arbeit in den Vordergrund stellen und Ihnen helfen, die richtigen (und zahlungskräftigeren) Kunden anzuziehen.

Haben Sie in letzter Zeit über eine Modernisierung Ihrer Website nachgedacht? Wenn das für Sie interessant klingt, zeige ich Ihnen gerne einige unserer Referenzen.

Mit freundlichen Grüßen,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'de'
),

-- DEVELOPERSKÉ PROJEKTY
(
    'Developeři: Weby projektů (CZ)',
    'developeri-weby-cz',
    'Tvorba webu pro Váš další developerský projekt',
    '{{icebreaker}}

Ozývám se Vám, protože se zaměřujeme na tvorbu vysoce konverzních webových stránek přímo pro developerské projekty. Víme, že hezký a přehledný web je dnes naprostý základ pro to, aby se byty či domy prodaly co nejrychleji a za ty nejlepší ceny.

Dokážeme pro Vás postavit kompletní projektový web včetně interaktivních plánků bytů a galerií tak, aby byl hotový přesně v moment, kdy spouštíte prodej.

Máte aktuálně v přípravě nový projekt, pro který budete brzy řešit webovou prezentaci?

Budu rád za zprávu,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'cs'
),
(
    'Developeri: Weby projektov (SK)',
    'developeri-weby-sk',
    'Tvorba webu pre Váš ďalší developerský projekt',
    '{{icebreaker}}

Ozývam sa Vám, pretože sa zameriavame na tvorbu vysoko konverzných webových stránok priamo pre developerské projekty. Vieme, že pekný a prehľadný web je dnes absolútny základ pre to, aby sa byty či domy predali čo najrýchlejšie a za tie najlepšie ceny.

Dokážeme pre Vás postaviť kompletný projektový web vrátane interaktívnych plánikov bytov a galérií tak, aby bol hotový presne v momente, kedy spúšťate predaj.

Máte aktuálne v príprave nový projekt, pre ktorý budete čoskoro riešiť webovú prezentáciu?

Budem rád za správu,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'sk'
),
(
    'Developers: Project websites (EN)',
    'developeri-weby-en',
    'Website creation for your upcoming real estate project',
    '{{icebreaker}}

I am reaching out because we focus on creating highly converting websites specifically for real estate development projects. We know that a beautiful, user-friendly website is essential today to sell units as quickly as possible and at the best price points.

We can build a complete project website for you, including interactive floor plans and galleries, ready exactly when you launch your sales phase.

Do you currently have a new project in the pipeline that will soon need a website?

Looking forward to your reply,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'en'
),
(
    'Bauträger: Projekt-Websites (DE)',
    'developeri-weby-de',
    'Website-Erstellung für Ihr kommendes Bauprojekt',
    '{{icebreaker}}

Ich melde mich bei Ihnen, da wir uns auf die Erstellung hochkonvertierender Websites speziell für Immobilienprojekte konzentrieren. Wir wissen, dass eine ansprechende und übersichtliche Website heute unerlässlich ist, um Wohnungen oder Häuser so schnell wie möglich und zu den besten Preisen zu verkaufen.

Wir können für Sie eine komplette Projekt-Website erstellen, inklusive interaktiver Grundrisse und Galerien, die genau dann fertig ist, wenn Sie den Verkauf starten.

Haben Sie derzeit ein neues Projekt in Planung, für das Sie bald eine Website benötigen?

Ich freue mich auf Ihre Nachricht,
Michal',
    'sniper_recruitment',
    'marketing',
    'manual',
    true,
    false,
    false,
    true,
    'de'
)
ON CONFLICT (slug) DO UPDATE 
SET 
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    language = EXCLUDED.language;
