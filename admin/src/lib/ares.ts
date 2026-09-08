export interface AresResult {
  registrationNo: string;
  vatNo: string;
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  source?: 'ARES' | 'VIES' | 'AI' | 'MANUAL';
}

const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
  'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI'
];

export const COUNTRY_OPTIONS = [
  { code: 'CZ', name: 'Česká republika', flag: '🇨🇿' },
  { code: 'DE', name: 'Německo', flag: '🇩🇪' },
  { code: 'AT', name: 'Rakousko', flag: '🇦🇹' },
  { code: 'SK', name: 'Slovensko', flag: '🇸🇰' },
  { code: 'CH', name: 'Švýcarsko', flag: '🇨🇭' },
  { code: 'US', name: 'Spojené státy (USA)', flag: '🇺🇸' },
  { code: 'FR', name: 'Francie', flag: '🇫🇷' },
  { code: 'GB', name: 'Velká Británie', flag: '🇬🇧' },
  { code: 'PL', name: 'Polsko', flag: '🇵🇱' },
  { code: 'IT', name: 'Itálie', flag: '🇮🇹' },
  { code: 'NL', name: 'Nizozemsko', flag: '🇳🇱' },
  { code: 'ES', name: 'Španělsko', flag: '🇪🇸' },
  { code: 'BE', name: 'Belgie', flag: '🇧🇪' },
  { code: 'HU', name: 'Maďarsko', flag: '🇭🇺' },
  { code: 'SE', name: 'Švédsko', flag: '🇸🇪' },
  { code: 'NO', name: 'Norsko', flag: '🇳🇴' },
  { code: 'FI', name: 'Finsko', flag: '🇫🇮' },
  { code: 'DK', name: 'Dánsko', flag: '🇩🇰' },
  { code: 'IE', name: 'Irsko', flag: '🇮🇪' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrálie', flag: '🇦🇺' },
];

export const COUNTRY_NAMES: Record<string, string> = COUNTRY_OPTIONS.reduce((acc, curr) => {
  acc[curr.code] = curr.name;
  return acc;
}, {} as Record<string, string>);

// 1. Fetch Czech ARES
export async function fetchCompanyByIco(ico: string): Promise<AresResult | null> {
  const cleanIco = ico.trim().padStart(8, '0');
  if (!/^\d{8}$/.test(cleanIco)) {
    throw new Error("IČO musí mít 8 číslic");
  }

  try {
    const res = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${cleanIco}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Subjekt s tímto IČO nebyl v ARES nalezen");
      }
      throw new Error(`ARES API chyba: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Parse ARES address
    const sidlo = data.sidlo || {};
    const street = sidlo.nazevUlice 
      ? `${sidlo.nazevUlice} ${sidlo.cisloDomovni}${sidlo.cisloOrientacni ? '/' + sidlo.cisloOrientacni : ''}`
      : sidlo.textovaAdresa || sidlo.nazevObce || "";
    
    const city = sidlo.nazevObce || sidlo.nazevMestskeCastiObce || "";
    const zip = sidlo.psc ? String(sidlo.psc) : "";
    const dic = data.dic ? data.dic : (data.dicSkupina ? data.dicSkupina : "");

    return {
      registrationNo: data.ico || cleanIco,
      vatNo: dic,
      name: data.obchodniJmeno || "",
      street,
      city,
      zip,
      country: sidlo.nazevStatu || "CZ",
      source: 'ARES'
    };
  } catch (err: any) {
    console.error("Failed to fetch from ARES:", err);
    throw err;
  }
}

// 2. Fetch EU VIES (VAT Information Exchange System)
export async function fetchCompanyByVies(vatNo: string, countryCode?: string): Promise<AresResult | null> {
  let cleanVat = vatNo.trim().toUpperCase().replace(/[\s\.-]/g, '');
  let cc = countryCode?.toUpperCase() || '';
  
  if (!cc && cleanVat.length > 2 && EU_COUNTRY_CODES.includes(cleanVat.substring(0, 2))) {
    cc = cleanVat.substring(0, 2);
    cleanVat = cleanVat.substring(2);
  }

  if (!cc || !EU_COUNTRY_CODES.includes(cc)) {
    throw new Error("Neznámý nebo nepodporovaný kód země pro EU VIES");
  }

  try {
    const res = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${cleanVat}`);
    if (!res.ok) {
      throw new Error(`VIES API chyba (${res.status}): Registr neodpovídá`);
    }

    const data = await res.json();
    if (!data.isValid) {
      throw new Error(`DIČ ${cc}${cleanVat} nebyla v EU VIES registru nalezena nebo není platná.`);
    }

    // Parse VIES address string
    const rawAddress: string = data.address || '';
    const addressLines = rawAddress.split('\n').map(l => l.trim()).filter(Boolean);
    
    let street = '';
    let city = '';
    let zip = '';

    if (addressLines.length >= 2) {
      street = addressLines[0];
      const cityLine = addressLines[1];
      const zipMatch = cityLine.match(/^(\d{4,5}|\w{2,5}\s?\d{3,5})\s+(.*)$/);
      if (zipMatch) {
        zip = zipMatch[1];
        city = zipMatch[2];
      } else {
        city = cityLine;
      }
    } else if (addressLines.length === 1) {
      street = addressLines[0];
    }

    return {
      registrationNo: '',
      vatNo: `${cc}${cleanVat}`,
      name: data.name || '',
      street,
      city,
      zip,
      country: cc,
      source: 'VIES'
    };
  } catch (err: any) {
    console.error("Failed to fetch from VIES:", err);
    throw err;
  }
}

// 3. Smart Unified Lookup (ARES -> VIES -> Smart parsing)
export async function smartCompanyLookup(query: string, countryHint?: string): Promise<AresResult | null> {
  const q = query.trim();
  if (!q) throw new Error("Zadejte IČO, DIČ nebo název firmy");

  // A) Czech 8-digit IČO
  const cleanIco = q.replace(/\s+/g, '').padStart(8, '0');
  if (/^\d{8}$/.test(cleanIco)) {
    return await fetchCompanyByIco(cleanIco);
  }

  // B) EU VAT Number (e.g. DE123456789, ATU12345678, SK2020123456, CZ08603936)
  const cleanVat = q.toUpperCase().replace(/[\s\.-]/g, '');
  if (cleanVat.startsWith('CZ') && /^\d{8}$/.test(cleanVat.substring(2))) {
    return await fetchCompanyByIco(cleanVat.substring(2));
  }

  const matchesEuVat = EU_COUNTRY_CODES.some(cc => cleanVat.startsWith(cc) && cleanVat.length >= 6);
  if (matchesEuVat || (countryHint && EU_COUNTRY_CODES.includes(countryHint))) {
    return await fetchCompanyByVies(cleanVat, countryHint);
  }

  throw new Error("Pro vyhledání zadejte české IČO (8 číslic) nebo evropské DIČ (např. DE123456789, ATU12345678).");
}

