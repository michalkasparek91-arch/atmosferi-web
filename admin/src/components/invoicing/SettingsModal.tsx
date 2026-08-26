import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InvoicingSettings, BankAccount, BrandType } from "@/types/invoicing";
import { Plus, Trash2, CheckCircle2, Building2, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: InvoicingSettings;
  onSave: (newSettings: InvoicingSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  settings,
  onSave
}) => {
  const [formData, setFormData] = useState<InvoicingSettings>(settings);
  const [editingAccId, setEditingAccId] = useState<string | null>(null);

  // Synchronize when opened
  React.useEffect(() => {
    setFormData(settings);
  }, [settings, open]);

  // Primary Bank Account Handlers
  const handleSetPrimaryForLang = (lang: 'cs' | 'en', accId: string) => {
    setFormData(prev => ({
      ...prev,
      primaryAccounts: {
        ...prev.primaryAccounts,
        [lang]: accId
      }
    }));
    toast.success(`Primární účet pro ${lang === 'cs' ? 'Češtinu' : 'Angličtinu'} nastaven`);
  };

  // Bank Account Add/Update
  const handleSaveBankAccount = (acc: BankAccount) => {
    setFormData(prev => {
      const exists = prev.bankAccounts.some(a => a.id === acc.id);
      const bankAccounts = exists
        ? prev.bankAccounts.map(a => a.id === acc.id ? acc : a)
        : [...prev.bankAccounts, acc];

      return {
        ...prev,
        bankAccounts
      };
    });
    setEditingAccId(null);
    toast.success("Bankovní účet uložen");
  };

  const handleDeleteBankAccount = (id: string) => {
    if (formData.bankAccounts.length <= 1) {
      toast.error("V systému musí zůstat alespoň jeden bankovní účet");
      return;
    }
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(a => a.id !== id)
    }));
    toast.success("Bankovní účet smazán");
  };

  const handleAddNewAccount = () => {
    const newAcc: BankAccount = {
      id: "acc_" + Date.now(),
      name: "Nový Bankovní Účet",
      accountNumber: "",
      iban: "",
      swift: "",
      currency: "CZK"
    };
    setFormData(prev => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newAcc]
    }));
    setEditingAccId(newAcc.id);
  };

  // Supplier info update
  const handleSupplierChange = (brand: BrandType, field: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      suppliers: {
        ...prev.suppliers,
        [brand]: {
          ...prev.suppliers[brand],
          [field]: val
        }
      }
    }));
  };

  const handleSaveAll = () => {
    onSave(formData);
    onOpenChange(false);
    toast.success("Nastavení fakturace bylo úspěšně uloženo");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Nastavení Bankovních Účtů a Značek
          </DialogTitle>
          <DialogDescription>
            Správa vašich účtů, výchozího účtu pro češtinu a angličtinu a údajů dodavatele.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="accounts" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="accounts" className="font-semibold">
              Bankovní Účty & Jazyky
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="font-semibold">
              Fakturační Údaje Dodavatele (Pixl / Atmosferi)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BANK ACCOUNTS & PRIMARY SETTINGS */}
          <TabsContent value="accounts" className="space-y-6">
            {/* Primary Account Per Language Card */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Výchozí Primární Účet podle Jazyka Faktury
              </h3>
              <p className="text-xs text-muted-foreground">
                Při vytvoření faktury se automaticky zvolí tento účet na základě zvoleného jazyka dokladu.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary for CS */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Pro ČEŠTINU (CS)</Label>
                  <Select
                    value={formData.primaryAccounts?.cs || ""}
                    onValueChange={(val) => handleSetPrimaryForLang("cs", val)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Vyberte účet pro CS..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency} - {acc.accountNumber || acc.iban})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Primary for EN */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Pro ANGLIČTINU (EN)</Label>
                  <Select
                    value={formData.primaryAccounts?.en || ""}
                    onValueChange={(val) => handleSetPrimaryForLang("en", val)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Vyberte účet pro EN..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.bankAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency} - {acc.accountNumber || acc.iban})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bank Accounts List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Seznam Bankovních Účtů</Label>
                <Button size="sm" variant="outline" onClick={handleAddNewAccount} className="gap-1.5 text-xs">
                  <Plus className="h-4 w-4" /> Přidat Další Účet
                </Button>
              </div>

              <div className="space-y-4">
                {formData.bankAccounts.map((acc) => {
                  const isPrimaryCs = formData.primaryAccounts?.cs === acc.id;
                  const isPrimaryEn = formData.primaryAccounts?.en === acc.id;

                  return (
                    <div key={acc.id} className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{acc.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                            {acc.currency}
                          </span>
                          {isPrimaryCs && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Primární CS
                            </span>
                          )}
                          {isPrimaryEn && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Primární EN
                            </span>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeleteBankAccount(acc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Název účtu</Label>
                          <Input
                            className="mt-1"
                            value={acc.name}
                            onChange={(e) => handleSaveBankAccount({ ...acc, name: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">Měna</Label>
                          <Select
                            value={acc.currency}
                            onValueChange={(val: any) => handleSaveBankAccount({ ...acc, currency: val })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CZK">CZK (Česká Koruna)</SelectItem>
                              <SelectItem value="EUR">EUR (Euro)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">Číslo účtu (tvar: 1336168004/2700)</Label>
                          <Input
                            className="mt-1 font-mono"
                            value={acc.accountNumber || ""}
                            placeholder="1336168004/2700"
                            onChange={(e) => handleSaveBankAccount({ ...acc, accountNumber: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">IBAN (pro mezinárodní platby)</Label>
                          <Input
                            className="mt-1 font-mono"
                            value={acc.iban || ""}
                            placeholder="BE18967525779065"
                            onChange={(e) => handleSaveBankAccount({ ...acc, iban: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] text-muted-foreground">SWIFT / BIC</Label>
                          <Input
                            className="mt-1 font-mono"
                            value={acc.swift || ""}
                            placeholder="TRWIBEB1XXX"
                            onChange={(e) => handleSaveBankAccount({ ...acc, swift: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SUPPLIER DETAILS */}
          <TabsContent value="suppliers" className="space-y-6">
            {(["pixl", "atmosferi", "personal"] as BrandType[]).map((brand) => {
              // Starší uložená nastavení nemusí mít 'personal' — doplníme prázdný záznam.
              const sup = formData.suppliers[brand] || {
                name: "", street: "", city: "", zip: "", country: "CZ",
                registrationNo: "", vatNo: "", vatPayerStatus: "Neplátce DPH",
              };
              return (
                <div key={brand} className="p-4 rounded-xl border border-border bg-card space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">
                      {brand === "personal" ? (
                        <>Fakturace <span className="text-primary">pod vlastním jménem</span></>
                      ) : (
                        <>Značka: <span className="text-primary">{brand}</span></>
                      )}
                    </h3>
                  </div>
                  {brand === "personal" && (
                    <p className="text-[11px] text-muted-foreground -mt-2">
                      Na faktuře se nezobrazí žádné logo ani název firmy — pouze toto jméno.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px]">Název / Jméno dodavatele</Label>
                      <Input
                        className="mt-1"
                        value={sup.name}
                        onChange={(e) => handleSupplierChange(brand, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Ulice a ČP</Label>
                      <Input
                        className="mt-1"
                        value={sup.street}
                        onChange={(e) => handleSupplierChange(brand, "street", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Město</Label>
                      <Input
                        className="mt-1"
                        value={sup.city}
                        onChange={(e) => handleSupplierChange(brand, "city", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">PSČ</Label>
                      <Input
                        className="mt-1"
                        value={sup.zip}
                        onChange={(e) => handleSupplierChange(brand, "zip", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">IČO</Label>
                      <Input
                        className="mt-1 font-mono"
                        value={sup.registrationNo}
                        onChange={(e) => handleSupplierChange(brand, "registrationNo", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">DIČ (pokud existuje)</Label>
                      <Input
                        className="mt-1 font-mono"
                        value={sup.vatNo || ""}
                        onChange={(e) => handleSupplierChange(brand, "vatNo", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px]">Stav DPH text (např. Neplátce DPH)</Label>
                      <Input
                        className="mt-1"
                        value={sup.vatPayerStatus || ""}
                        onChange={(e) => handleSupplierChange(brand, "vatPayerStatus", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSaveAll} className="gap-2">
            Uložit Nastavení
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
