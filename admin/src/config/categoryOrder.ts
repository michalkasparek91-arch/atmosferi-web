/**
 * Hardcoded category display order (sorted by subcategory count from DB).
 * Used as `initialData` for React Query to prevent flickering/skeleton flash.
 * Update this list when categories change in the database.
 */
export const CATEGORY_ORDER = [
  { id: "bf360cd2-7ce3-41c9-8aab-912898ba8855", name: "Stavby / Rekonstrukce", icon: "House", slug: "stavby-rekonstrukce" },
  { id: "0feccee1-5152-4a2f-8ec7-13f169de6168", name: "Autoservis", icon: "Car", slug: "auto-moto" },
  { id: "ee11b1e5-73d9-4ef3-a9cc-aad85e8f260c", name: "Výuka a jazyky", icon: "BookOpen", slug: "vyuka-jazyky" },
  { id: "54f35c7c-e8a0-4a0d-a680-10a14280f6cd", name: "Instalatér", icon: "Droplet", slug: "instalater" },
  { id: "aa36ca8a-f286-4356-94a0-97a4fa88410c", name: "Elektro", icon: "Zap", slug: "elektro" },
  { id: "be43f2bf-d840-46ef-a8cf-c6231ea2e6dc", name: "Zdraví a Sport", icon: "Activity", slug: "zdravi-sport" },
  { id: "a499e6f5-1111-49de-a5f9-8380d30c627f", name: "Cestování", icon: "Plane", slug: "cestovani" },
  { id: "e6697ed8-9a50-4338-97ed-f0ddb3507cec", name: "Gastro a Akce", icon: "Utensils", slug: "gastro-akce" },
  { id: "65ea7e19-d910-4fa6-96d7-817b63bc9111", name: "Úklid", icon: "Sparkles", slug: "uklid" },
  { id: "4acc36df-e68f-4ea3-ae34-1792234c11b7", name: "Zahrada", icon: "Flower", slug: "zahrada" },
  { id: "b273d0ed-9798-4573-b02f-596033188770", name: "Truhlářství / Nábytek", icon: "Armchair", slug: "truharstvo" },
  { id: "e07c4451-d104-4e7f-8e3a-00423a1b0b54", name: "PC a Mobily", icon: "Monitor", slug: "pc-a-mobile" },
  { id: "d92d4b78-3de5-4ad1-ba20-2d6161256bb2", name: "Doprava a Logistika", icon: "Truck", slug: "doprava-logistika" },
  { id: "a7f3da33-1b8f-42f9-9345-497b97d5e449", name: "Pro firmy", icon: "Briefcase", slug: "pro-firmy" },
  { id: "fc067ba7-2eda-4905-8c29-8d40b365636d", name: "Zámečník", icon: "Lock", slug: "zamecnik" },
  { id: "4b1dabc0-66ec-4d32-9b86-458c6bc3855d", name: "Projektování", icon: "Ruler", slug: "projektovani" },
  { id: "4da4c0af-f98d-417d-92d9-2a535870024f", name: "Finance a Daně", icon: "DollarSign", slug: "finance-dane" },
  { id: "723ab8aa-e205-4f00-ab28-5ed4ff6d5b5a", name: "Hlídání a péče", icon: "Baby", slug: "hlidani-a-pece" },
  { id: "cab210ce-3270-4886-9ec7-4a97ebb1eac5", name: "Hodinový manžel", icon: "Hammer", slug: "hodinovy-manzel" },
  { id: "5668b1d5-747a-4642-b5da-19c8c2b7413e", name: "Mazlíčci", icon: "PawPrint", slug: "mazlicci" },
  { id: "8cdaca17-8089-4625-8ac2-1c0ab591478c", name: "Právní služby", icon: "Scale", slug: "pravni-sluzby" },
  { id: "92a377a0-f4c7-40a7-91c2-8c1373944d45", name: "Další služby", icon: "Paintbrush", slug: "ostatni" },
] as const;

export type ServiceCategory = { id: string; name: string; icon: string; slug: string };

/** Sort fetched categories to match the hardcoded display order. */
export function sortCategoriesByOrder(categories: ServiceCategory[]): ServiceCategory[] {
  const orderMap = new Map(CATEGORY_ORDER.map((c, i) => [c.slug, i]));
  return [...categories].sort((a, b) => {
    const ia = orderMap.get(a.slug as any) ?? 999;
    const ib = orderMap.get(b.slug as any) ?? 999;
    return ia - ib;
  });
}
