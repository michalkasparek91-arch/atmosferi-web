import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice, Contact, BankAccount, BrandType, LanguageType, InvoiceItem, InvoicingSettings } from "@/types/invoicing";
import { fetchCompanyByIco } from "@/lib/ares";
import { Plus, Trash2, Search, Loader2, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";

interface InvoiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  contacts: Contact[];
  settings: InvoicingSettings;
  onSave: (invoice: Invoice) => void;
  getNextInvoiceNumber: (year?: number) => { number: string; variableSymbol: string };
  getPrimaryBankAccountForLanguage: (lang: LanguageType) => BankAccount;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  open,
  onOpenChange,
  invoice,
  contacts,
  settings,
  onSave,
  getNextInvoiceNumber,
  getPrimaryBankAccountForLanguage
}) => {
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [aresLoading, setAresLoading] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (open) {
      if (invoice) {
        setFormData(invoice);
        const match = contacts.find(c => c.name === invoice.client.name);
        if (match) setSelectedContactId(match.id);
      } else {
        // Create new invoice defaults
        const defaultLang: LanguageType = "cs";
        const defaultBrand: BrandType = "pixl";
        const defaultBank = getPrimaryBankAccountForLanguage(defaultLang);
        const defaultSupplier = settings.suppliers[defaultBrand];
        const nextNum = getNextInvoiceNumber();
        const today = new Date().toISOString().split("T")[0];
        const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

        setFormData({
          id: "inv_" + Date.now(),
          number: nextNum.number,
          variableSymbol: nextNum.variableSymbol,
          brand: defaultBrand,
          language: defaultLang,
          status: "open",
          isProforma: false,
          issuedOn: today,
          dueOn: due30,
          dueDays: 30,
          bankAccount: defaultBank,
          supplier: defaultSupplier,
          client: contacts[0] || {
            id: "c_new",
            name: "",
            street: "",
            city: "",
            zip: "",
            country: "CZ",
            registrationNo: "",
            vatNo: ""
          },
          items: [
            {
              id: "item_1",
              quantity: 1,
              description: "Architektonické vizualizace",
              unitPrice: 15000,
              total: 15000
            }
          ],
          currency: defaultBank.currency,
          subtotal: 15000,
          total: 15000,
          exchangeRate: defaultBank.currency === "EUR" ? 24.2 : 1.0
        });
        if (contacts.length > 0) setSelectedContactId(contacts[0].id);
      }
    }
  }, [open, invoice]);

  // When language changes -> auto switch primary bank account for that language
  const handleLanguageChange = (lang: LanguageType) => {
    const primaryBank = getPrimaryBankAccountForLanguage(lang);
    setFormData(prev => ({
      ...prev,
      language: lang,
      bankAccount: primaryBank,
      currency: primaryBank.currency
    }));
    toast.info(`Byl nastaven primární bankovní účet pro ${lang === 'cs' ? 'Češtinu' : 'Angličtinu'}: ${primaryBank.name}`);
  };

  // When brand changes -> update supplier info
  const handleBrandChange = (brand: BrandType) => {
    const supplier = settings.suppliers[brand];
    setFormData(prev => ({
      ...prev,
      brand,
      supplier
    }));
  };

  // When bank account selector changes
  const handleBankChange = (bankId: string) => {
    const bank = settings.bankAccounts.find(b => b.id === bankId);
    if (!bank) return;
    setFormData(prev => ({
      ...prev,
      bankAccount: bank,
      currency: bank.currency
    }));
  };

  // When client dropdown changes
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const selected = contacts.find(c => c.id === contactId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        client: selected
      }));
    }
  };

  // ARES Lookup helper
  const handleAresLookup = async () => {
    const ico = formData.client?.registrationNo;
    if (!ico) {
      toast.error("Zadejte IČO klienta pro vyhledání v ARES");
      return;
    }
    setAresLoading(true);
    try {
      const result = await fetchCompanyByIco(ico);
      if (result) {
        setFormData(prev => ({
          ...prev,
          client: {
            ...prev.client,
            id: prev.client?.id || "c_" + Date.now(),
            name: result.name,
            street: result.street,
            city: result.city,
            zip: result.zip,
            country: result.country,
            registrationNo: result.registrationNo,
            vatNo: result.vatNo
          }
        }));
        toast.success(`Načteno z ARES: ${result.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Nepodařilo se načíst data z ARES");
    } finally {
      setAresLoading(false);
    }
  };

  // Item management
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setFormData(prev => {
      const items = [...(prev.items || [])];
      const cur = { ...items[index] };

      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(val) : cur.quantity;
        const price = field === "unitPrice" ? Number(val) : cur.unitPrice;
        cur.quantity = qty;
        cur.unitPrice = price;
        cur.total = qty * price;
      } else {
        (cur as any)[field] = val;
      }

      items[index] = cur;

      const subtotal = items.reduce((acc, i) => acc + i.total, 0);

      return {
        ...prev,
        items,
        subtotal,
        total: subtotal
      };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      const items = [
        ...(prev.items || []),
        {
          id: "item_" + Date.now(),
          quantity: 1,
          description: "",
          unitPrice: 0,
          total: 0
        }
      ];
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      const items = (prev.items || []).filter((_, i) => i !== index);
      const subtotal = items.reduce((acc, i) => acc + i.total, 0);
      return { ...prev, items, subtotal, total: subtotal };
    });
  };

  const handleSubmit = () => {
    if (!formData.number || !formData.client?.name) {
      toast.error("Vyplňte číslo faktury a název klienta");
      return;
    }
    onSave(formData as Invoice);
    onOpenChange(false);
    toast.success(`Faktura ${formData.number} byla úspěšně uložena`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {invoice ? `Úprava Faktury ${invoice.number}` : "Vytvořit Novou Fakturu"}
          </DialogTitle>
          <DialogDescription>
            Zvolte značku, jazyk dokladu, bankovní účet a zadejte položky faktury.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Top Options Bar: Brand, Language, Bank Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border">
            {/* Brand */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Značka (Brand)</Label>
              <Select
                value={formData.brand || "pixl"}
                onValueChange={(val: BrandType) => handleBrandChange(val)}
              >
                <SelectTrigger className="mt-1 bg-background font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pixl">pixl (výchozí)</SelectItem>
                  <SelectItem value="atmosferi">atmosferi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Jazyk dokladu</Label>
              <Select
                value={formData.language || "cs"}
                onValueChange={(val: LanguageType) => handleLanguageChange(val)}
              >
                <SelectTrigger className="mt-1 bg-background font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Čeština (CS)</SelectItem>
                  <SelectItem value="en">Angličtina (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase">Bankovní Účet</Label>
              <Select
                value={formData.bankAccount?.id || ""}
                onValueChange={handleBankChange}
              >
                <SelectTrigger className="mt-1 bg-background font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Basic Details: Number, VS, Dates, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <Label className="text-[11px]">Číslo Faktury</Label>
              <Input
                className="mt-1 font-mono font-bold"
                value={formData.number || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[11px]">Variabilní Symbol</Label>
              <Input
                className="mt-1 font-mono"
                value={formData.variableSymbol || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, variableSymbol: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[11px]">Datum Vystavení</Label>
              <Input
                type="date"
                className="mt-1"
                value={formData.issuedOn || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, issuedOn: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[11px]">Datum Splatnosti</Label>
              <Input
                type="date"
                className="mt-1 font-semibold"
                value={formData.dueOn || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, dueOn: e.target.value }))}
              />
            </div>
          </div>

          {/* Client Selection & Details */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Údaje Odběratele (Klienta)
              </Label>
              
              <div className="flex items-center gap-2">
                <Select value={selectedContactId} onValueChange={handleContactSelect}>
                  <SelectTrigger className="w-[260px] text-xs">
                    <SelectValue placeholder="Vybrat ze 78 kontaktů..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.registrationNo ? `(IČO: ${c.registrationNo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={handleAresLookup}
                  disabled={aresLoading}
                  className="text-xs gap-1.5"
                >
                  {aresLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                  ARES
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <Label className="text-[11px]">Název firmy / Jméno klienta</Label>
                <Input
                  className="mt-1 font-bold"
                  value={formData.client?.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client!, name: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-[11px]">IČO</Label>
                <Input
                  className="mt-1 font-mono"
                  value={formData.client?.registrationNo || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client!, registrationNo: e.target.value } }))}
                />
              </div>

              <div>
                <Label className="text-[11px]">Ulice a ČP</Label>
                <Input
                  className="mt-1"
                  value={formData.client?.street || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client!, street: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-[11px]">Město</Label>
                <Input
                  className="mt-1"
                  value={formData.client?.city || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client!, city: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="text-[11px]">DIČ</Label>
                <Input
                  className="mt-1 font-mono"
                  value={formData.client?.vatNo || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client!, vatNo: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Položky Faktury</Label>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" /> Přidat Položku
              </Button>
            </div>

            <div className="space-y-2">
              {(formData.items || []).map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border bg-card text-xs">
                  <div className="col-span-1">
                    <Label className="text-[10px] text-muted-foreground">Počet</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    />
                  </div>

                  <div className="col-span-6">
                    <Label className="text-[10px] text-muted-foreground">Popis položky</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      placeholder="Popis služby nebo projektu..."
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Cena za MJ ({formData.currency})</Label>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 text-right">
                    <Label className="text-[10px] text-muted-foreground block">Celkem</Label>
                    <div className="font-bold py-2 text-sm">
                      {item.total.toLocaleString()} {formData.currency}
                    </div>
                  </div>

                  <div className="col-span-1 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 mt-3"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={(formData.items || []).length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="flex justify-end pt-3 border-t border-border">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Celková částka faktury:</div>
                <div className="text-2xl font-black text-foreground mt-0.5">
                  {(formData.total || 0).toLocaleString()} {formData.currency}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            Uložit Fakturu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
