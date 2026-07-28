-- Matice oslovovacich sablon: 9 trhu x 5 typu klienta = 45 sablon.
-- Generovano automaticky. Parovani leadu probiha na (category, language).
BEGIN;

-- 1) Smazani prebytecnych/duplicitnich sablon (vcetne navazanych radku v email_outbox,
--    jinak by cizi klic email_outbox_template_slug_fkey mazani zablokoval).
DELETE FROM public.email_outbox WHERE template_slug IN ('developeri-projekty-cz','outreach-cz-developer','outreach-cz-arch','atmosferi-urban','outreach-fi-arch','realitni-makleri-cz','stavebni-firmy-cz');
DELETE FROM public.email_templates WHERE slug IN ('developeri-projekty-cz','outreach-cz-developer','outreach-cz-arch','atmosferi-urban','outreach-fi-arch','realitni-makleri-cz','stavebni-firmy-cz');

-- 2) Oprava spatne oznacene sablony: byla vedena jako cz/outreach, patri k AU/architekt.
UPDATE public.email_templates SET language='au', category='architekt' WHERE slug='outreach-au-individual';

-- 3) Nove univerzalni anglicke sablony (fallback pro vsechny ostatni zeme sveta).
INSERT INTO public.email_templates (slug, name, subject, body, category, language)
  SELECT 'atmosferi-individual-en','tmp','tmp','tmp','architekti','en'
  WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug='atmosferi-individual-en');
INSERT INTO public.email_templates (slug, name, subject, body, category, language)
  SELECT 'atmosferi-arch-en','tmp','tmp','tmp','architekti','en'
  WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug='atmosferi-arch-en');
INSERT INTO public.email_templates (slug, name, subject, body, category, language)
  SELECT 'atmosferi-interior-en','tmp','tmp','tmp','architekti','en'
  WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug='atmosferi-interior-en');
INSERT INTO public.email_templates (slug, name, subject, body, category, language)
  SELECT 'atmosferi-developer-en','tmp','tmp','tmp','architekti','en'
  WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug='atmosferi-developer-en');
INSERT INTO public.email_templates (slug, name, subject, body, category, language)
  SELECT 'atmosferi-urban-en','tmp','tmp','tmp','architekti','en'
  WHERE NOT EXISTS (SELECT 1 FROM public.email_templates WHERE slug='atmosferi-urban-en');

-- 4) Vyladeny obsah pro kazdou kombinaci.
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (CZ)$tpl$, subject=$tpl$Vizualizace a portfolio web pro {{studio}}$tpl$, greeting=$tpl$Dobrý den, {{osloveni}},$tpl$, body=$tpl$jmenuji se Michal Kašpárek, architekt a zakladatel studia Atmosferi. Děláme architektonické vizualizace a weby — výhradně pro lidi, kteří utvářejí prostor.

{{icebreaker}}

U samostatných architektů začínám vizualizací — rendery nasvícené a barevně sladěné jako fotografie, ne jako výstup ze softwaru. Ukážou návrh dřív, než se postaví, a rozhodnou soutěž i jednání s investorem.

Na ně navazuje portfolio web, který Vaši práci prezentuje ve stejné kvalitě — bez šablon, bez zbytečné údržby.

Pošlu Vám pár konkrétních návrhů pro {{studio}} a projdeme je za dvacet minut. Našel byste si tento týden chvíli na krátký hovor?$tpl$,
  cta_text=$tpl$Zobrazit ukázky$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$S pozdravem$tpl$, signature_role=$tpl$web a vizualizace pro architekturu$tpl$, target_role=$tpl$Samostatný architekt$tpl$,
  category='architekt', language='cz', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (CZ)$tpl$, subject=$tpl$Vizualizace pro {{studio}} — a web, který je ukáže$tpl$, greeting=$tpl$Dobrý den, {{osloveni}},$tpl$, body=$tpl$jmenuji se Michal Kašpárek, architekt a zakladatel studia Atmosferi. Děláme architektonické vizualizace a weby — výhradně pro lidi, kteří utvářejí prostor.

{{icebreaker}}

S architektonickými studii začínám vizualizací — špičkové rendery pro soutěže a prezentace investorům, nasvícené jako fotografie. Ukážou projekt dřív, než vznikne.

Pak stavím web, který celé portfolio drží pohromadě: projekty v pořadí, které dává smysl, rychlé načítání a prezentace hodná práce, která za tím stojí.

Pošlu Vám pár konkrétních návrhů pro {{studio}} a projdeme je za dvacet minut. Našel byste si tento týden chvíli na krátký hovor?$tpl$,
  cta_text=$tpl$Zobrazit ukázky$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$S pozdravem$tpl$, signature_role=$tpl$web a vizualizace pro architekturu$tpl$, target_role=$tpl$Architektonické studio$tpl$,
  category='architekti', language='cz', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (CZ)$tpl$, subject=$tpl$Interiérové vizualizace pro {{studio}} — materiál a světlo$tpl$, greeting=$tpl$Dobrý den, {{osloveni}},$tpl$, body=$tpl$jmenuji se Michal Kašpárek, architekt a zakladatel studia Atmosferi. Děláme architektonické vizualizace a weby — výhradně pro lidi, kteří utvářejí prostor.

{{icebreaker}}

U interiérů rozhoduje materiál a světlo. Dělám vizualizace, na kterých je poznat dub od jasanu a ranní světlo od večerního — přesně to, co klientovi na výkresu nikdy nevysvětlíte.

Web pak stavím tak, aby fungoval jako Vaše portfolio i prodejní nástroj: realizace vedle sebe, detaily materiálů, stavy před a po.

Pošlu Vám pár konkrétních návrhů pro {{studio}} a projdeme je za dvacet minut. Našel byste si tento týden chvíli na krátký hovor?$tpl$,
  cta_text=$tpl$Zobrazit ukázky$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$S pozdravem$tpl$, signature_role=$tpl$web a vizualizace pro architekturu$tpl$, target_role=$tpl$Interiérové studio$tpl$,
  category='interiery', language='cz', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (CZ)$tpl$, subject=$tpl$Prodejní web a vizualizace pro projekty {{studio}}$tpl$, greeting=$tpl$Dobrý den, {{osloveni}},$tpl$, body=$tpl$jmenuji se Michal Kašpárek, architekt a zakladatel studia Atmosferi. Děláme architektonické vizualizace a weby — výhradně pro lidi, kteří utvářejí prostor.

{{icebreaker}}

U developerských projektů prodává obrázek dřív než hrubá stavba. Dělám vizualizace, které ukážou bydlení, ne jen budovu — a k nim prodejní web projektu: dostupnost jednotek, půdorysy, etapy a 360° průhledy na jednom srozumitelném místě.

Zájemce si tak vybere byt dřív, než přijede na stavbu.

Pošlu Vám pár konkrétních návrhů pro {{studio}} a projdeme je za dvacet minut. Našel byste si tento týden chvíli na krátký hovor?$tpl$,
  cta_text=$tpl$Zobrazit ukázky$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$S pozdravem$tpl$, signature_role=$tpl$web a vizualizace pro architekturu$tpl$, target_role=$tpl$Realitní developer$tpl$,
  category='developeri', language='cz', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (CZ)$tpl$, subject=$tpl$Srozumitelná prezentace projektů {{studio}}$tpl$, greeting=$tpl$Dobrý den, {{osloveni}},$tpl$, body=$tpl$jmenuji se Michal Kašpárek, architekt a zakladatel studia Atmosferi. Děláme architektonické vizualizace a weby — výhradně pro lidi, kteří utvářejí prostor.

{{icebreaker}}

U urbanistických a veřejných projektů rozhoduje, jestli záměru porozumí obyvatelé i úředníci. Stavím weby, které to vysvětlí bez odborného žargonu — mapy, etapy, vizualizace a 360° průhledy na jednom přehledném místě.

Míň dotazů, míň odporu, rychlejší projednání.

Pošlu Vám pár konkrétních návrhů pro {{studio}} a projdeme je za dvacet minut. Našel byste si tento týden chvíli na krátký hovor?$tpl$,
  cta_text=$tpl$Zobrazit ukázky$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$S pozdravem$tpl$, signature_role=$tpl$web a vizualizace pro architekturu$tpl$, target_role=$tpl$Urbanismus / veřejný sektor$tpl$,
  category='urbanismus', language='cz', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-cz-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (DE)$tpl$, subject=$tpl$Visualisierung und Portfolio-Website für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei selbstständigen Architekten beginne ich mit der Visualisierung — Renderings, die wie Fotografie belichtet und farblich abgestimmt sind, nicht wie Software-Output. Sie zeigen den Entwurf, bevor er gebaut ist, und entscheiden Wettbewerbe wie auch Investorengespräche.

Darauf folgt eine Portfolio-Website, die Ihre Arbeit in derselben Qualität präsentiert — ohne Templates, ohne unnötige Wartung.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Selbstständiger Architekt$tpl$,
  category='architekt', language='de', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-de-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (DE)$tpl$, subject=$tpl$Visualisierungen für {{studio}} — und eine Website, die sie zeigt$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Architekturbüros beginne ich mit der Visualisierung — hochwertige Renderings für Wettbewerbe und Investorenpräsentationen, belichtet wie Fotografie. Sie zeigen das Projekt, bevor es entsteht.

Danach baue ich die Website, die das gesamte Portfolio zusammenhält: Projekte in sinnvoller Reihenfolge, schnelle Ladezeiten und eine Präsentation, die der Arbeit dahinter gerecht wird.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Architekturbüro$tpl$,
  category='architekti', language='de', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-arch-copy';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (DE)$tpl$, subject=$tpl$Interieur-Visualisierungen für {{studio}} — Material und Licht$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Im Interieur entscheiden Material und Licht. Ich erstelle Visualisierungen, auf denen man Eiche von Esche unterscheidet und Morgenlicht von Abendlicht — genau das, was sich am Plan nie erklären lässt.

Die Website baue ich so, dass sie Portfolio und Verkaufswerkzeug zugleich ist: Projekte nebeneinander, Materialdetails, Vorher-Nachher.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Innenarchitekturbüro$tpl$,
  category='interiery', language='de', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-interior-de';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (DE)$tpl$, subject=$tpl$Projekt-Website und Visualisierungen für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Entwicklungsprojekten verkauft das Bild, lange bevor der Rohbau steht. Ich erstelle Visualisierungen, die Wohnen zeigen, nicht nur ein Gebäude — dazu die Projekt-Website: Verfügbarkeit der Einheiten, Grundrisse, Bauphasen und 360°-Ansichten an einem verständlichen Ort.

Interessenten wählen ihre Wohnung, bevor sie die Baustelle sehen.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Immobilienentwickler$tpl$,
  category='developeri', language='de', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-developer-de';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (DE)$tpl$, subject=$tpl$Verständliche Präsentation der Projekte von {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Stadtplanung und öffentlichen Projekten entscheidet, ob Anwohner und Behörden das Vorhaben verstehen. Ich baue Websites, die das ohne Fachjargon erklären — Karten, Bauphasen, Visualisierungen und 360°-Ansichten an einem übersichtlichen Ort.

Weniger Rückfragen, weniger Widerstand, schnellere Verfahren.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Stadtplanung / öffentlicher Sektor$tpl$,
  category='urbanismus', language='de', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-de-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (AT)$tpl$, subject=$tpl$Visualisierung und Portfolio-Website für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei selbstständigen Architekten beginne ich mit der Visualisierung — Renderings, die wie Fotografie belichtet und farblich abgestimmt sind, nicht wie Software-Output. Sie zeigen den Entwurf, bevor er gebaut ist, und entscheiden Wettbewerbe wie auch Investorengespräche.

Darauf folgt eine Portfolio-Website, die Ihre Arbeit in derselben Qualität präsentiert — ohne Templates, ohne unnötige Wartung.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Selbstständiger Architekt$tpl$,
  category='architekt', language='at', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-at-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (AT)$tpl$, subject=$tpl$Visualisierungen für {{studio}} — und eine Website, die sie zeigt$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Architekturbüros beginne ich mit der Visualisierung — hochwertige Renderings für Wettbewerbe und Investorenpräsentationen, belichtet wie Fotografie. Sie zeigen das Projekt, bevor es entsteht.

Danach baue ich die Website, die das gesamte Portfolio zusammenhält: Projekte in sinnvoller Reihenfolge, schnelle Ladezeiten und eine Präsentation, die der Arbeit dahinter gerecht wird.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Architekturbüro$tpl$,
  category='architekti', language='at', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-at-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (AT)$tpl$, subject=$tpl$Interieur-Visualisierungen für {{studio}} — Material und Licht$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Im Interieur entscheiden Material und Licht. Ich erstelle Visualisierungen, auf denen man Eiche von Esche unterscheidet und Morgenlicht von Abendlicht — genau das, was sich am Plan nie erklären lässt.

Die Website baue ich so, dass sie Portfolio und Verkaufswerkzeug zugleich ist: Projekte nebeneinander, Materialdetails, Vorher-Nachher.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Innenarchitekturbüro$tpl$,
  category='interiery', language='at', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-at-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (AT)$tpl$, subject=$tpl$Projekt-Website und Visualisierungen für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Entwicklungsprojekten verkauft das Bild, lange bevor der Rohbau steht. Ich erstelle Visualisierungen, die Wohnen zeigen, nicht nur ein Gebäude — dazu die Projekt-Website: Verfügbarkeit der Einheiten, Grundrisse, Bauphasen und 360°-Ansichten an einem verständlichen Ort.

Interessenten wählen ihre Wohnung, bevor sie die Baustelle sehen.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Immobilienentwickler$tpl$,
  category='developeri', language='at', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-at-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (AT)$tpl$, subject=$tpl$Verständliche Präsentation der Projekte von {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Stadtplanung und öffentlichen Projekten entscheidet, ob Anwohner und Behörden das Vorhaben verstehen. Ich baue Websites, die das ohne Fachjargon erklären — Karten, Bauphasen, Visualisierungen und 360°-Ansichten an einem übersichtlichen Ort.

Weniger Rückfragen, weniger Widerstand, schnellere Verfahren.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Stadtplanung / öffentlicher Sektor$tpl$,
  category='urbanismus', language='at', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-at-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (CH)$tpl$, subject=$tpl$Visualisierung und Portfolio-Website für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei selbstständigen Architekten beginne ich mit der Visualisierung — Renderings, die wie Fotografie belichtet und farblich abgestimmt sind, nicht wie Software-Output. Sie zeigen den Entwurf, bevor er gebaut ist, und entscheiden Wettbewerbe wie auch Investorengespräche.

Darauf folgt eine Portfolio-Website, die Ihre Arbeit in derselben Qualität präsentiert — ohne Templates, ohne unnötige Wartung.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Selbstständiger Architekt$tpl$,
  category='architekt', language='ch', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-ch-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (CH)$tpl$, subject=$tpl$Visualisierungen für {{studio}} — und eine Website, die sie zeigt$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Architekturbüros beginne ich mit der Visualisierung — hochwertige Renderings für Wettbewerbe und Investorenpräsentationen, belichtet wie Fotografie. Sie zeigen das Projekt, bevor es entsteht.

Danach baue ich die Website, die das gesamte Portfolio zusammenhält: Projekte in sinnvoller Reihenfolge, schnelle Ladezeiten und eine Präsentation, die der Arbeit dahinter gerecht wird.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Architekturbüro$tpl$,
  category='architekti', language='ch', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-ch-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (CH)$tpl$, subject=$tpl$Interieur-Visualisierungen für {{studio}} — Material und Licht$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Im Interieur entscheiden Material und Licht. Ich erstelle Visualisierungen, auf denen man Eiche von Esche unterscheidet und Morgenlicht von Abendlicht — genau das, was sich am Plan nie erklären lässt.

Die Website baue ich so, dass sie Portfolio und Verkaufswerkzeug zugleich ist: Projekte nebeneinander, Materialdetails, Vorher-Nachher.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Innenarchitekturbüro$tpl$,
  category='interiery', language='ch', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-ch-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (CH)$tpl$, subject=$tpl$Projekt-Website und Visualisierungen für {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Entwicklungsprojekten verkauft das Bild, lange bevor der Rohbau steht. Ich erstelle Visualisierungen, die Wohnen zeigen, nicht nur ein Gebäude — dazu die Projekt-Website: Verfügbarkeit der Einheiten, Grundrisse, Bauphasen und 360°-Ansichten an einem verständlichen Ort.

Interessenten wählen ihre Wohnung, bevor sie die Baustelle sehen.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Immobilienentwickler$tpl$,
  category='developeri', language='ch', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-ch-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (CH)$tpl$, subject=$tpl$Verständliche Präsentation der Projekte von {{studio}}$tpl$, greeting=$tpl$Guten Tag, {{osloveni}},$tpl$, body=$tpl$mein Name ist Michal Kašpárek, Architekt und Gründer des Studios Atmosferi. Wir erstellen Architekturvisualisierungen und Websites — ausschließlich für Menschen, die Raum gestalten.

{{icebreaker}}

Bei Stadtplanung und öffentlichen Projekten entscheidet, ob Anwohner und Behörden das Vorhaben verstehen. Ich baue Websites, die das ohne Fachjargon erklären — Karten, Bauphasen, Visualisierungen und 360°-Ansichten an einem übersichtlichen Ort.

Weniger Rückfragen, weniger Widerstand, schnellere Verfahren.

Ich schicke Ihnen einige konkrete Ansätze für {{studio}} und wir besprechen sie in zwanzig Minuten. Hätten Sie diese Woche Zeit für ein kurzes Gespräch?$tpl$,
  cta_text=$tpl$Arbeiten ansehen$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Mit freundlichen Grüßen$tpl$, signature_role=$tpl$Web und Visualisierung für Architektur$tpl$, target_role=$tpl$Stadtplanung / öffentlicher Sektor$tpl$,
  category='urbanismus', language='ch', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-ch-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (US)$tpl$, subject=$tpl$Visualisation and a portfolio site for {{studio}}$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With independent architects I start from the visualisation — renders lit and graded like photography, not like software output. They show the design before it's built, and they decide competitions and investor conversations alike.

The portfolio site follows, presenting your work at the same level — no templates, no needless upkeep.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Independent architect$tpl$,
  category='architekt', language='us', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-us-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (US)$tpl$, subject=$tpl$Visualisations for {{studio}} — and a site that shows them$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With architecture studios I begin with the visualisation — top-tier renders for competitions and investor presentations, lit and graded like photography. They show the project before it exists.

Then I build the website that holds the portfolio together: projects in an order that makes sense, fast loading, and a presentation worthy of the work behind it.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Architecture studio$tpl$,
  category='architekti', language='us', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-us-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (US)$tpl$, subject=$tpl$Interior visualisations for {{studio}} — material and light$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In interiors, material and light decide everything. I create visualisations where you can tell oak from ash and morning light from evening — exactly what a drawing can never explain to a client.

The website then works as portfolio and sales tool at once: projects side by side, material detail, before and after.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Interior studio$tpl$,
  category='interiery', language='us', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-us-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (US)$tpl$, subject=$tpl$A sales site and visualisations for {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In development projects the image sells long before the shell is up. I create visualisations that show living, not just a building — plus the project sales site: unit availability, floor plans, phases and 360° views in one legible place.

Buyers choose their apartment before they ever visit the site.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Property developer$tpl$,
  category='developeri', language='us', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-us-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (US)$tpl$, subject=$tpl$A clear, public-facing presentation of {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With urban and public projects, everything depends on whether residents and officials understand the intent. I build sites that explain it without jargon — maps, phases, visualisations and 360° views in one legible place.

Fewer questions, less resistance, faster approvals.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Urban planning / public sector$tpl$,
  category='urbanismus', language='us', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-us-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (AU)$tpl$, subject=$tpl$Visualisation and a portfolio site for {{studio}}$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With independent architects I start from the visualisation — renders lit and graded like photography, not like software output. They show the design before it's built, and they decide competitions and investor conversations alike.

The portfolio site follows, presenting your work at the same level — no templates, no needless upkeep.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Independent architect$tpl$,
  category='architekt', language='au', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-au-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (AU)$tpl$, subject=$tpl$Visualisations for {{studio}} — and a site that shows them$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With architecture studios I begin with the visualisation — top-tier renders for competitions and investor presentations, lit and graded like photography. They show the project before it exists.

Then I build the website that holds the portfolio together: projects in an order that makes sense, fast loading, and a presentation worthy of the work behind it.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Architecture studio$tpl$,
  category='architekti', language='au', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-au-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (AU)$tpl$, subject=$tpl$Interior visualisations for {{studio}} — material and light$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In interiors, material and light decide everything. I create visualisations where you can tell oak from ash and morning light from evening — exactly what a drawing can never explain to a client.

The website then works as portfolio and sales tool at once: projects side by side, material detail, before and after.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Interior studio$tpl$,
  category='interiery', language='au', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-au-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (AU)$tpl$, subject=$tpl$A sales site and visualisations for {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In development projects the image sells long before the shell is up. I create visualisations that show living, not just a building — plus the project sales site: unit availability, floor plans, phases and 360° views in one legible place.

Buyers choose their apartment before they ever visit the site.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Property developer$tpl$,
  category='developeri', language='au', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-au-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (AU)$tpl$, subject=$tpl$A clear, public-facing presentation of {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With urban and public projects, everything depends on whether residents and officials understand the intent. I build sites that explain it without jargon — maps, phases, visualisations and 360° views in one legible place.

Fewer questions, less resistance, faster approvals.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Urban planning / public sector$tpl$,
  category='urbanismus', language='au', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-au-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (FI)$tpl$, subject=$tpl$Visualisation and a portfolio site for {{studio}}$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With independent architects I start from the visualisation — renders lit and graded like photography, not like software output. They show the design before it's built, and they decide competitions and investor conversations alike.

The portfolio site follows, presenting your work at the same level — no templates, no needless upkeep.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Independent architect$tpl$,
  category='architekt', language='f', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-fi-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (FI)$tpl$, subject=$tpl$Visualisations for {{studio}} — and a site that shows them$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With architecture studios I begin with the visualisation — top-tier renders for competitions and investor presentations, lit and graded like photography. They show the project before it exists.

Then I build the website that holds the portfolio together: projects in an order that makes sense, fast loading, and a presentation worthy of the work behind it.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Architecture studio$tpl$,
  category='architekti', language='f', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-arch-copy-5042';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (FI)$tpl$, subject=$tpl$Interior visualisations for {{studio}} — material and light$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In interiors, material and light decide everything. I create visualisations where you can tell oak from ash and morning light from evening — exactly what a drawing can never explain to a client.

The website then works as portfolio and sales tool at once: projects side by side, material detail, before and after.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Interior studio$tpl$,
  category='interiery', language='f', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-fi-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (FI)$tpl$, subject=$tpl$A sales site and visualisations for {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In development projects the image sells long before the shell is up. I create visualisations that show living, not just a building — plus the project sales site: unit availability, floor plans, phases and 360° views in one legible place.

Buyers choose their apartment before they ever visit the site.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Property developer$tpl$,
  category='developeri', language='f', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-fi-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (FI)$tpl$, subject=$tpl$A clear, public-facing presentation of {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With urban and public projects, everything depends on whether residents and officials understand the intent. I build sites that explain it without jargon — maps, phases, visualisations and 360° views in one legible place.

Fewer questions, less resistance, faster approvals.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Urban planning / public sector$tpl$,
  category='urbanismus', language='f', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-fi-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (NO)$tpl$, subject=$tpl$Visualisation and a portfolio site for {{studio}}$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With independent architects I start from the visualisation — renders lit and graded like photography, not like software output. They show the design before it's built, and they decide competitions and investor conversations alike.

The portfolio site follows, presenting your work at the same level — no templates, no needless upkeep.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Independent architect$tpl$,
  category='architekt', language='no', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-no-individual';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (NO)$tpl$, subject=$tpl$Visualisations for {{studio}} — and a site that shows them$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With architecture studios I begin with the visualisation — top-tier renders for competitions and investor presentations, lit and graded like photography. They show the project before it exists.

Then I build the website that holds the portfolio together: projects in an order that makes sense, fast loading, and a presentation worthy of the work behind it.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Architecture studio$tpl$,
  category='architekti', language='no', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-no-arch';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (NO)$tpl$, subject=$tpl$Interior visualisations for {{studio}} — material and light$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In interiors, material and light decide everything. I create visualisations where you can tell oak from ash and morning light from evening — exactly what a drawing can never explain to a client.

The website then works as portfolio and sales tool at once: projects side by side, material detail, before and after.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Interior studio$tpl$,
  category='interiery', language='no', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-no-interior';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (NO)$tpl$, subject=$tpl$A sales site and visualisations for {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In development projects the image sells long before the shell is up. I create visualisations that show living, not just a building — plus the project sales site: unit availability, floor plans, phases and 360° views in one legible place.

Buyers choose their apartment before they ever visit the site.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Property developer$tpl$,
  category='developeri', language='no', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-no-developer';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (NO)$tpl$, subject=$tpl$A clear, public-facing presentation of {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With urban and public projects, everything depends on whether residents and officials understand the intent. I build sites that explain it without jargon — maps, phases, visualisations and 360° views in one legible place.

Fewer questions, less resistance, faster approvals.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Urban planning / public sector$tpl$,
  category='urbanismus', language='no', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='outreach-no-urban';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Samostatný architekt (INT)$tpl$, subject=$tpl$Visualisation and a portfolio site for {{studio}}$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With independent architects I start from the visualisation — renders lit and graded like photography, not like software output. They show the design before it's built, and they decide competitions and investor conversations alike.

The portfolio site follows, presenting your work at the same level — no templates, no needless upkeep.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Independent architect$tpl$,
  category='architekt', language='en', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-individual-en';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Architektonické studio (INT)$tpl$, subject=$tpl$Visualisations for {{studio}} — and a site that shows them$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With architecture studios I begin with the visualisation — top-tier renders for competitions and investor presentations, lit and graded like photography. They show the project before it exists.

Then I build the website that holds the portfolio together: projects in an order that makes sense, fast loading, and a presentation worthy of the work behind it.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$📐$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Architecture studio$tpl$,
  category='architekti', language='en', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-arch-en';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Interiérové studio (INT)$tpl$, subject=$tpl$Interior visualisations for {{studio}} — material and light$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In interiors, material and light decide everything. I create visualisations where you can tell oak from ash and morning light from evening — exactly what a drawing can never explain to a client.

The website then works as portfolio and sales tool at once: projects side by side, material detail, before and after.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🛋️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Interior studio$tpl$,
  category='interiery', language='en', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-interior-en';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Realitní developer (INT)$tpl$, subject=$tpl$A sales site and visualisations for {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

In development projects the image sells long before the shell is up. I create visualisations that show living, not just a building — plus the project sales site: unit availability, floor plans, phases and 360° views in one legible place.

Buyers choose their apartment before they ever visit the site.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏗️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Property developer$tpl$,
  category='developeri', language='en', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-developer-en';
UPDATE public.email_templates SET
  name=$tpl$Atmosferi: Urbanismus (INT)$tpl$, subject=$tpl$A clear, public-facing presentation of {{studio}} projects$tpl$, greeting=$tpl$Hello {{osloveni}},$tpl$, body=$tpl$my name is Michal Kašpárek, an architect and the founder of Atmosferi. We create architectural visualisations and websites — exclusively for people who shape space.

{{icebreaker}}

With urban and public projects, everything depends on whether residents and officials understand the intent. I build sites that explain it without jargon — maps, phases, visualisations and 360° views in one legible place.

Fewer questions, less resistance, faster approvals.

I'll put together a few concrete directions for {{studio}} and we can walk through them in twenty minutes. Would you have time for a short call this week?$tpl$,
  cta_text=$tpl$See our work$tpl$, cta_url='https://atmosferi.com', emoji=$tpl$🏙️$tpl$,
  signature_greeting=$tpl$Best regards$tpl$, signature_role=$tpl$web & visualisation for architecture$tpl$, target_role=$tpl$Urban planning / public sector$tpl$,
  category='urbanismus', language='en', is_enabled=true, trigger_type='manual',
  layout_type='atmosferi_studio', heading=NULL, secondary_text='',
  show_cta_button=true, show_job_widget=false, urgency_banner_enabled=false,
  promo_banner_enabled=false, ps_footer_enabled=false, updated_at=now()
WHERE slug='atmosferi-urban-en';

-- 5) Kontrola: musi vyjit presne 45 radku, kazda dvojice (language,category) prave jednou.
DO $$ DECLARE n int; d int; BEGIN
  SELECT count(*) INTO n FROM public.email_templates;
  SELECT count(*) INTO d FROM (SELECT language,category FROM public.email_templates GROUP BY 1,2 HAVING count(*)>1) x;
  IF n <> 45 THEN RAISE EXCEPTION 'Ocekavano 45 sablon, je %', n; END IF;
  IF d > 0 THEN RAISE EXCEPTION 'Nalezeny duplicitni kombinace jazyk/kategorie: %', d; END IF;
END $$;

COMMIT;