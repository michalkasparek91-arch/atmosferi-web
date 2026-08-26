export type InvoiceStatus = 'open' | 'paid' | 'overdue' | 'cancelled' | 'proforma';

// 'personal' = faktura pouze pod vlastním jménem, bez firemní značky v hlavičce.
export type BrandType = 'pixl' | 'atmosferi' | 'personal';

export type LanguageType = 'cs' | 'en';

export type CurrencyType = 'CZK' | 'EUR';

export interface InvoiceItem {
  id: string;
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
}

export interface BankAccount {
  id: string;
  name: string; // e.g. "UniCredit CZK", "Wise EUR"
  accountNumber: string; // e.g. "1336168004/2700"
  iban: string; // e.g. "BE18967525779065"
  swift: string; // e.g. "TRWIBEB1XXX"
  currency: CurrencyType;
}

export interface SupplierInfo {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  registrationNo: string; // IČO
  vatNo: string; // DIČ
  vatPayerStatus: string; // e.g. "Neplátce DPH" | "Identifikovaná osoba" | "Plátce DPH"
}

export interface Contact {
  id: string;
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  registrationNo: string; // IČO
  vatNo: string; // DIČ
  email?: string;
  phone?: string;
  web?: string;
  currency?: CurrencyType;
  language?: LanguageType;
}

export interface Invoice {
  id: string;
  number: string; // e.g. "2026-0025"
  variableSymbol: string; // e.g. "20260025"
  brand: BrandType; // 'pixl' or 'atmosferi'
  language: LanguageType; // 'cs' or 'en'
  status: InvoiceStatus;
  isProforma: boolean;
  
  // Dates
  issuedOn: string; // YYYY-MM-DD
  dueOn: string; // YYYY-MM-DD
  dueDays: number;
  paidOn?: string;
  
  // Bank details
  bankAccount: BankAccount;

  // Supplier & Client
  supplier: SupplierInfo;
  client: Contact;

  // Items & Amount
  items: InvoiceItem[];
  currency: CurrencyType;
  subtotal: number;
  total: number;
  exchangeRate?: number; // default 1.0 for CZK
  
  note?: string;
}

export interface InvoicingSettings {
  bankAccounts: BankAccount[];
  suppliers: Record<BrandType, SupplierInfo>;
  primaryAccounts: {
    cs: string; // bankAccountId
    en: string; // bankAccountId
  };
}
