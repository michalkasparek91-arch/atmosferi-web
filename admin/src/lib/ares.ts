export interface AresResult {
  registrationNo: string;
  vatNo: string;
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

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
      country: sidlo.nazevStatu || "CZ"
    };
  } catch (err: any) {
    console.error("Failed to fetch from ARES:", err);
    throw err;
  }
}
