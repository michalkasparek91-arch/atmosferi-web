DELETE FROM email_templates WHERE slug IN (
  'atmosferi-arch-de', 
  'atmosferi-interior-de', 
  'atmosferi-developer-de'
);

INSERT INTO email_templates (
  slug, name, category, subject, greeting, body, cta_text, cta_url, layout_type, target_role, trigger_type, is_enabled, hero_image_url, segment_filters, language
) VALUES
(
  'atmosferi-arch-de',
  'Atmosferi: Architekten (DE)',
  'architekti',
  'Website für {{studio}} — Portfolio auf dem Niveau Ihrer Architektur',
  'Guten Tag {{osloveni}},

{{icebreaker}}',
  'mein Name ist Michal Kasparek und ich leite das Studio Atmosferi — wir entwerfen, programmieren und visualisieren Websites ausschließlich für Menschen, die Räume erschaffen.

Ich bin spezialisiert auf Portfolios für Architekturbüros — editoriale, bildgesteuerte Websites mit einem CMS, in dem Sie Ihre Projekte selbst verwalten können. Darüber hinaus bieten wir fotorealistische Visualisierungen von ungebauten Projekten an.

Gerne zeige ich Ihnen in zwanzig Minuten ein paar konkrete Richtungen auf, wie eine Website für {{studio}} aussehen könnte. Würde Ihnen ein kurzes Gespräch nächste Woche passen?',
  'Beispiele ansehen',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/07-loop.webp", "https://atmosferi.com/demos/atmosferi-viz/img/08-courtyards.webp", "https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp"]}'::jsonb,
  'de'
),
(
  'atmosferi-interior-de',
  'Atmosferi: Innenarchitektur (DE)',
  'architekti',
  'Website und Visualisierungen für {{studio}}',
  'Guten Tag {{osloveni}},

{{icebreaker}}',
  'mein Name ist Michal Kasparek und ich leite das Studio Atmosferi — wir entwerfen, programmieren und visualisieren Websites ausschließlich für Menschen, die Räume erschaffen.

Für Innenarchitekturstudios bauen wir Websites, auf denen Materialien, Licht und Details zur Geltung kommen — und ergänzen sie mit fotorealistischen Innenraumvisualisierungen und 360°-Rundgängen, bei denen der Kunde den Entwurf schon vor der Umsetzung begehen kann.

Gerne zeige ich Ihnen in zwanzig Minuten ein paar konkrete Richtungen auf, wie eine Website für {{studio}} aussehen könnte. Würde Ihnen ein kurzes Gespräch nächste Woche passen?',
  'Beispiele ansehen',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/chalet-living.jpg',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/chalet-dining.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/chalet-bedroom.jpg", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb,
  'de'
),
(
  'atmosferi-developer-de',
  'Atmosferi: Immobilienentwickler (DE)',
  'developeri',
  'Projektpräsentation, die verkauft — Website, Visualisierungen und 360°-Touren',
  'Guten Tag {{osloveni}},

{{icebreaker}}',
  'mein Name ist Michal Kasparek und ich leite das Studio Atmosferi — wir entwerfen, programmieren und visualisieren Websites ausschließlich für Menschen, die Räume erschaffen.

Für Bauträger erstellen wir verkaufsfördernde Projektpräsentationen — eine Website mit einer Übersicht der verfügbaren Einheiten, fotorealistischen Visualisierungen, animierten Rundflügen und interaktiven 360°-Touren. Die Käufer verstehen das Projekt, bevor der erste Spatenstich getan ist.

Gerne zeige ich Ihnen in zwanzig Minuten ein paar konkrete Richtungen auf, wie eine Website für {{studio}} aussehen könnte. Würde Ihnen ein kurzes Gespräch nächste Woche passen?',
  'Beispiele ansehen',
  'https://atmosferi.com',
  'atmosferi_studio',
  'all',
  'manual',
  true,
  'https://atmosferi.com/demos/atmosferi-viz/img/01-nightfall.webp',
  '{"carousel_images": ["https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp", "https://atmosferi.com/demos/atmosferi-viz/img/09-horizon.webp", "https://atmosferi.com/demos/atmosferi-viz/img/10-penthouse.webp"]}'::jsonb,
  'de'
);
