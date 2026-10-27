SELECT coalesce(category,'(prázdné)') AS kategorie,
       coalesce(language,'(prázdné)') AS jazyk,
       count(*) AS kontaktu
FROM public.marketing_leads
WHERE email IS NOT NULL AND email <> ''
GROUP BY 1,2
ORDER BY 3 DESC
LIMIT 25;
