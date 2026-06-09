-- Oprava práv pro Edge Funkci, aby mohla číst tvé nastavení klíčových slov a lokalit
GRANT SELECT ON public.app_settings TO service_role;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;
