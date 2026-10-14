import { VatRegime, LanguageType, Invoice } from "@/types/invoicing";

/**
 * Povinné poznámky na faktuře při dodání do jiného členského státu EU.
 *
 * POZOR: jde o běžně používaná znění, ne o daňové poradenství. Konkrétní
 * formulaci si nech potvrdit účetní — liší se podle toho, zda jde o zboží
 * nebo službu a zda jsi plátce / identifikovaná osoba.
 */

// Členské státy EU (ISO kódy) — mimo ně se reverse charge v tomto smyslu neuplatní.
export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

export interface VatNoteText {
  cs: string;
  en: string;
  /** Odkaz na směrnici — tiskne se drobným písmem pod hlavní větou. */
  legalRef?: string;
}

export const VAT_NOTES: Record<Exclude<VatRegime, "none" | "custom">, VatNoteText> = {
  reverse_charge: {
    cs: "Daň odvede zákazník.",
    en: "Reverse charge — VAT to be accounted for by the customer.",
    legalRef: "čl. 196 směrnice Rady 2006/112/ES · Art. 196 of Council Directive 2006/112/EC",
  },
  intra_eu_goods: {
    cs: "Dodání zboží do jiného členského státu, osvobozené od DPH.",
    en: "Intra-Community supply of goods, exempt from VAT.",
    legalRef: "čl. 138 směrnice Rady 2006/112/ES · Art. 138 of Council Directive 2006/112/EC",
  },
  non_payer: {
    cs: "Nejsem plátcem DPH.",
    en: "Not a VAT payer.",
  },
};

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  none: "Bez daňové poznámky",
  reverse_charge: "Služba do EU — daň odvede zákazník (reverse charge)",
  intra_eu_goods: "Zboží do EU — osvobozeno od DPH",
  non_payer: "Neplátce DPH",
  custom: "Vlastní text…",
};

/** Je odběratel z jiného členského státu EU než dodavatel? */
export function isCrossBorderEu(supplierCountry?: string, clientCountry?: string): boolean {
  const s = (supplierCountry || "CZ").toUpperCase().trim();
  const c = (clientCountry || "").toUpperCase().trim();
  if (!c) return false;
  return EU_COUNTRIES.has(s) && EU_COUNTRIES.has(c) && s !== c;
}

/**
 * Doporučený režim pro nově vytvářenou fakturu.
 * Atmosferi/pixl prodává služby → u zákazníka z jiné země EU s platným DIČ
 * jde typicky o reverse charge.
 */
export function suggestVatRegime(supplierCountry?: string, clientCountry?: string, clientVatNo?: string): VatRegime {
  if (!isCrossBorderEu(supplierCountry, clientCountry)) return "none";
  return clientVatNo && clientVatNo.trim() ? "reverse_charge" : "none";
}

/**
 * Výsledný text poznámky pro tisk. U cizojazyčné faktury vrací i české znění —
 * český zákon vyžaduje údaje v tuzemském jazyce, anglický text je pro zákazníka.
 */
export function resolveVatNote(invoice: Pick<Invoice, "vatRegime" | "vatNoteCustom" | "language">): {
  primary: string;
  secondary?: string;
  legalRef?: string;
} | null {
  const regime = invoice.vatRegime;
  if (!regime || regime === "none") return null;

  if (regime === "custom") {
    const t = (invoice.vatNoteCustom || "").trim();
    return t ? { primary: t } : null;
  }

  const texts = VAT_NOTES[regime];
  if (!texts) return null;

  const isEn = (invoice.language as LanguageType) === "en";
  return {
    primary: isEn ? texts.en : texts.cs,
    secondary: isEn ? texts.cs : undefined, // u EN faktury doplníme i české znění
    legalRef: texts.legalRef,
  };
}
