import { useState, useEffect } from "react";
import { Invoice, Contact, InvoicingSettings, BankAccount, LanguageType, InvoiceStatus, BrandType } from "@/types/invoicing";
import { initialInvoices, initialContacts, defaultSettings } from "./fakturoidSeedData";

const INVOICES_STORAGE_KEY = "atmosferi_admin_invoices_v1";
const CONTACTS_STORAGE_KEY = "atmosferi_admin_contacts_v1";
const SETTINGS_STORAGE_KEY = "atmosferi_admin_invoicing_settings_v1";

// Helper for initial load
export function loadInvoicesFromStorage(): Invoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(initialInvoices));
      return initialInvoices;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading invoices from storage", err);
    return initialInvoices;
  }
}

export function saveInvoicesToStorage(invoices: Invoice[]): void {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
  } catch (err) {
    console.error("Error saving invoices to storage", err);
  }
}

export function loadContactsFromStorage(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(initialContacts));
      return initialContacts;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading contacts from storage", err);
    return initialContacts;
  }
}

export function saveContactsToStorage(contacts: Contact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error("Error saving contacts to storage", err);
  }
}

export function loadSettingsFromStorage(): InvoicingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    const parsed = JSON.parse(raw);
    // Ensure primaryAccounts object exists
    if (!parsed.primaryAccounts) {
      parsed.primaryAccounts = defaultSettings.primaryAccounts;
    }
    return parsed;
  } catch (err) {
    console.error("Error reading settings from storage", err);
    return defaultSettings;
  }
}

export function saveSettingsToStorage(settings: InvoicingSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("Error saving settings to storage", err);
  }
}

// Hook for invoicing state
export function useInvoicing() {
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoicesFromStorage);
  const [contacts, setContacts] = useState<Contact[]>(loadContactsFromStorage);
  const [settings, setSettings] = useState<InvoicingSettings>(loadSettingsFromStorage);

  useEffect(() => {
    saveInvoicesToStorage(invoices);
  }, [invoices]);

  useEffect(() => {
    saveContactsToStorage(contacts);
  }, [contacts]);

  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // Save/Update invoice
  const upsertInvoice = (invoice: Invoice) => {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === invoice.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = invoice;
        return next;
      }
      return [invoice, ...prev];
    });
  };

  // Delete invoice
  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  // Update status
  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const paidOn = status === 'paid' ? new Date().toISOString().split('T')[0] : inv.paidOn;
        return { ...inv, status, paidOn };
      }
      return inv;
    }));
  };

  // Duplicate invoice
  const duplicateInvoice = (id: string): Invoice | null => {
    const existing = invoices.find(i => i.id === id);
    if (!existing) return null;

    const currentYear = new Date().getFullYear();
    const countThisYear = invoices.filter(i => i.number.startsWith(`${currentYear}-`)).length + 1;
    const nextNum = `${currentYear}-${String(countThisYear).padStart(4, '0')}`;
    const nextVs = `${currentYear}${String(countThisYear).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      ...existing,
      id: "inv_" + Date.now(),
      number: nextNum,
      variableSymbol: nextVs,
      status: 'open',
      issuedOn: new Date().toISOString().split('T')[0],
      dueOn: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paidOn: undefined
    };

    upsertInvoice(newInvoice);
    return newInvoice;
  };

  // Contact operations
  const upsertContact = (contact: Contact) => {
    setContacts(prev => {
      const idx = prev.findIndex(c => c.id === contact.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = contact;
        return next;
      }
      return [contact, ...prev];
    });
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Primary Bank Account logic
  const getPrimaryBankAccountForLanguage = (lang: LanguageType): BankAccount => {
    const primaryId = settings.primaryAccounts[lang];
    const found = settings.bankAccounts.find(acc => acc.id === primaryId);
    if (found) return found;
    // Fallback based on currency
    if (lang === 'en') {
      return settings.bankAccounts.find(acc => acc.currency === 'EUR') || settings.bankAccounts[0];
    }
    return settings.bankAccounts.find(acc => acc.currency === 'CZK') || settings.bankAccounts[0];
  };

  const setPrimaryBankAccount = (lang: LanguageType, bankAccountId: string) => {
    setSettings(prev => ({
      ...prev,
      primaryAccounts: {
        ...prev.primaryAccounts,
        [lang]: bankAccountId
      }
    }));
  };

  const updateSettings = (newSettings: Partial<InvoicingSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  // KPI Calculations
  const stats = {
    allCount: invoices.length,
    allSumCzk: invoices.reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0),
    
    unpaidCount: invoices.filter(i => i.status === 'open' || i.status === 'overdue').length,
    unpaidSumCzk: invoices.filter(i => i.status === 'open' || i.status === 'overdue').reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0),
    
    overdueCount: invoices.filter(i => i.status === 'overdue').length,
    overdueSumCzk: invoices.filter(i => i.status === 'overdue').reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0),
    
    paidCount: invoices.filter(i => i.status === 'paid').length,
    paidSumCzk: invoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0),
    
    proformaCount: invoices.filter(i => i.isProforma || i.status === 'proforma').length,
    proformaSumCzk: invoices.filter(i => i.isProforma || i.status === 'proforma').reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0),
    
    cancelledCount: invoices.filter(i => i.status === 'cancelled').length,
    cancelledSumCzk: invoices.filter(i => i.status === 'cancelled').reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total * (inv.exchangeRate || 24.2) : inv.total), 0)
  };

  // Generate next invoice number
  const getNextInvoiceNumber = (year: number = new Date().getFullYear()): { number: string; variableSymbol: string } => {
    const yearPrefix = `${year}-`;
    const yearInvoices = invoices.filter(i => i.number.startsWith(yearPrefix));
    let maxNum = 0;
    yearInvoices.forEach(i => {
      const parts = i.number.split('-');
      if (parts[1]) {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    });
    const nextSeq = String(maxNum + 1).padStart(4, '0');
    return {
      number: `${year}-${nextSeq}`,
      variableSymbol: `${year}${nextSeq}`
    };
  };

  return {
    invoices,
    contacts,
    settings,
    stats,
    upsertInvoice,
    deleteInvoice,
    updateInvoiceStatus,
    duplicateInvoice,
    upsertContact,
    deleteContact,
    updateSettings,
    getPrimaryBankAccountForLanguage,
    setPrimaryBankAccount,
    getNextInvoiceNumber
  };
}
