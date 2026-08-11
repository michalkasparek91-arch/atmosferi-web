import React, { useState, useEffect } from "react";
import { useInvoicing } from "@/lib/invoicingStore";
import { Invoice, InvoiceStatus, BrandType, CurrencyType } from "@/types/invoicing";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { InvoicePrintView } from "@/components/invoicing/InvoicePrintView";
import { InvoiceFormModal } from "@/components/invoicing/InvoiceFormModal";
import { SettingsModal } from "@/components/invoicing/SettingsModal";

import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Trash2, 
  Edit, 
  Settings, 
  ArrowUpDown, 
  Download, 
  Upload, 
  Building2,
  DollarSign,
  XCircle,
  FileCheck
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function AdminInvoices() {
  const { 
    invoices, 
    contacts, 
    settings, 
    stats, 
    upsertInvoice, 
    deleteInvoice, 
    updateInvoiceStatus, 
    duplicateInvoice, 
    updateSettings,
    getPrimaryBankAccountForLanguage,
    getNextInvoiceNumber 
  } = useInvoicing();

  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "due">("newest");

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Auto open form modal if redirected from contacts with query param ?newFor=contactId
  useEffect(() => {
    const newForId = searchParams.get("newFor");
    if (newForId) {
      setEditingInvoice(null);
      setFormModalOpen(true);
    }
  }, [searchParams]);

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    // Search
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      inv.number.toLowerCase().includes(q) ||
      inv.variableSymbol.toLowerCase().includes(q) ||
      inv.client.name.toLowerCase().includes(q) ||
      inv.items.some(i => i.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "unpaid" && !(inv.status === "open" || inv.status === "overdue")) return false;
    if (statusFilter === "overdue" && inv.status !== "overdue") return false;
    if (statusFilter === "paid" && inv.status !== "paid") return false;
    if (statusFilter === "proforma" && !(inv.isProforma || inv.status === "proforma")) return false;
    if (statusFilter === "cancelled" && inv.status !== "cancelled") return false;

    // Brand filter
    if (brandFilter !== "all" && inv.brand !== brandFilter) return false;

    // Currency filter
    if (currencyFilter !== "all" && inv.currency !== currencyFilter) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === "newest") return b.number.localeCompare(a.number);
    if (sortBy === "oldest") return a.number.localeCompare(b.number);
    if (sortBy === "due") return a.dueOn.localeCompare(b.dueOn);
    return 0;
  });

  const handleCreateNew = () => {
    setEditingInvoice(null);
    setFormModalOpen(true);
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormModalOpen(true);
  };

  const handleDuplicate = (invId: string) => {
    const dup = duplicateInvoice(invId);
    if (dup) {
      toast.success(`Faktura byla duplikována jako ${dup.number}`);
    }
  };

  const handleDelete = (inv: Invoice) => {
    if (confirm(`Opravdu chcete smazat fakturu ${inv.number}?`)) {
      deleteInvoice(inv.id);
      toast.success(`Faktura ${inv.number} byla smazána`);
    }
  };

  const handlePrint = (inv: Invoice) => {
    setPreviewInvoice(inv);
  };

  const executePrint = () => {
    window.print();
  };

  // CSV Export helper
  const exportToCsv = () => {
    if (invoices.length === 0) return;
    const headers = ["Číslo", "VS", "Značka", "Jazyk", "Stav", "Klient", "IČO", "Vystaveno", "Splatnost", "Měna", "Celkem"];
    const rows = invoices.map(i => [
      i.number,
      i.variableSymbol,
      i.brand,
      i.language,
      i.status,
      `"${i.client.name.replace(/"/g, '""')}"`,
      i.client.registrationNo || "",
      i.issuedOn,
      i.dueOn,
      i.currency,
      i.total
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `faktury_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV soubor s fakturami byl stažen");
  };

  // Helper formatting money
  const formatMoney = (amount: number, currency: string = "CZK") => {
    return new Intl.NumberFormat("cs-CZ", {
      maximumFractionDigits: 2,
    }).format(amount) + (currency === "EUR" ? " €" : " Kč");
  };

  // Badge status helper
  const renderStatusBadge = (inv: Invoice) => {
    if (inv.status === "paid") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold gap-1">
          <CheckCircle2 className="h-3 w-3" /> Zaplacená
        </Badge>
      );
    }
    if (inv.status === "overdue") {
      // Calculate overdue days
      const due = new Date(inv.dueOn).getTime();
      const now = new Date().getTime();
      const diffDays = Math.max(1, Math.floor((now - due) / 86400000));
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold gap-1">
          <AlertCircle className="h-3 w-3" /> Po splatnosti {diffDays} dní
        </Badge>
      );
    }
    if (inv.status === "proforma" || inv.isProforma) {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold gap-1">
          <FileCheck className="h-3 w-3" /> Zálohovka
        </Badge>
      );
    }
    if (inv.status === "cancelled") {
      return (
        <Badge className="bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 font-semibold gap-1">
          <XCircle className="h-3 w-3" /> Stornovaná
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold gap-1">
        <Clock className="h-3 w-3" /> Vystavená
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={FileText}
        title={`Faktury & Doklady (${invoices.length})`}
        subtitle="Kompletní fakturační systém s náhradou Fakturoidu pro pixl & atmosferi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsModalOpen(true)} className="gap-1.5 text-xs">
              <Settings className="h-4 w-4" /> Nastavení Účtů & Jazyků
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCsv} className="gap-1.5 text-xs">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" /> Nová Faktura
            </Button>
          </div>
        }
      />

      {/* 6 KPI Metric Cards matching Fakturoid Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Všechny */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Všechny</span>
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{stats.allCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-zinc-500">{formatMoney(stats.allSumCzk)}</div>
          </CardContent>
        </Card>

        {/* Card 2: Nezaplacené */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "unpaid" ? "border-amber-500 bg-amber-500/5" : "border-border"}`}
          onClick={() => setStatusFilter("unpaid")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Nezaplacené</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.unpaidCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-amber-600/80">{formatMoney(stats.unpaidSumCzk)}</div>
          </CardContent>
        </Card>

        {/* Card 3: Po splatnosti */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "overdue" ? "border-red-500 bg-red-500/5" : "border-border"}`}
          onClick={() => setStatusFilter("overdue")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Po splatnosti</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overdueCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-red-600/80">{formatMoney(stats.overdueSumCzk)}</div>
          </CardContent>
        </Card>

        {/* Card 4: Zaplacené */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "paid" ? "border-emerald-500 bg-emerald-500/5" : "border-border"}`}
          onClick={() => setStatusFilter("paid")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Zaplacené</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paidCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-emerald-600/80">{formatMoney(stats.paidSumCzk)}</div>
          </CardContent>
        </Card>

        {/* Card 5: Zálohovky */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "proforma" ? "border-purple-500 bg-purple-500/5" : "border-border"}`}
          onClick={() => setStatusFilter("proforma")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Pouze zálohovky</span>
              <FileCheck className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.proformaCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-purple-600/80">{formatMoney(stats.proformaSumCzk)}</div>
          </CardContent>
        </Card>

        {/* Card 6: Stornované */}
        <Card 
          className={`rounded-xl border cursor-pointer transition-all hover:shadow-md ${statusFilter === "cancelled" ? "border-zinc-500 bg-zinc-500/5" : "border-border"}`}
          onClick={() => setStatusFilter("cancelled")}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Stornované</span>
              <XCircle className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-xl font-bold text-zinc-500">{stats.cancelledCount} <span className="text-xs font-normal text-muted-foreground">faktur</span></div>
            <div className="text-[11px] font-semibold text-zinc-400">{formatMoney(stats.cancelledSumCzk)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar: Search & Filters */}
      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="flex items-center gap-2 w-full md:w-80 bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Vyhledat fakturu, číslo, klienta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 text-xs p-0 h-7"
            />
          </div>

          {/* Filters dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
            {/* Brand Filter */}
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Značka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny značky</SelectItem>
                <SelectItem value="pixl">pixl</SelectItem>
                <SelectItem value="atmosferi">atmosferi</SelectItem>
              </SelectContent>
            </Select>

            {/* Currency Filter */}
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Měna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny měny</SelectItem>
                <SelectItem value="CZK">CZK</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>

            {/* Sorting */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Řazení" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nejnovější</SelectItem>
                <SelectItem value="oldest">Nejstarší</SelectItem>
                <SelectItem value="due">Podle splatnosti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-32">Číslo Faktury</th>
                <th className="py-3 px-4 w-36">Stav Dokladu</th>
                <th className="py-3 px-4 w-28">Vystaveno</th>
                <th className="py-3 px-4">Klient / Odběratel</th>
                <th className="py-3 px-4 w-20 text-center">Značka</th>
                <th className="py-3 px-4 w-20 text-center">Jazyk</th>
                <th className="py-3 px-4 w-32 text-right">Částka</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Záhadně žádné faktury neodpovídají zvoleným filtrům.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      <button 
                        onClick={() => handlePrint(inv)}
                        className="hover:underline text-primary text-left"
                      >
                        {inv.number}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(inv)}
                    </td>

                    {/* Issued On */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {inv.issuedOn}
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="line-clamp-1">{inv.client.name}</div>
                    </td>

                    {/* Brand */}
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {inv.brand}
                      </Badge>
                    </td>

                    {/* Language */}
                    <td className="py-3.5 px-4 text-center font-mono uppercase text-muted-foreground">
                      {inv.language}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-sm text-foreground">
                      {formatMoney(inv.total, inv.currency)}
                    </td>

                    {/* Actions dropdown */}
                    <td className="py-3.5 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem onClick={() => handlePrint(inv)} className="gap-2 font-medium">
                            <Printer className="h-4 w-4 text-blue-500" /> Vytisknout / PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(inv)} className="gap-2">
                            <Edit className="h-4 w-4 text-zinc-500" /> Upravit fakturu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {inv.status !== "paid" ? (
                            <DropdownMenuItem onClick={() => updateInvoiceStatus(inv.id, "paid")} className="gap-2 text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" /> Označit ako zaplacenou
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateInvoiceStatus(inv.id, "open")} className="gap-2 text-amber-600">
                              <Clock className="h-4 w-4" /> Označit ako nevystavenou
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleDuplicate(inv.id)} className="gap-2">
                            <Copy className="h-4 w-4 text-purple-500" /> Duplikovat fakturu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(inv)} className="gap-2 text-red-600">
                            <Trash2 className="h-4 w-4" /> Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Form Modal */}
      <InvoiceFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        invoice={editingInvoice}
        contacts={contacts}
        settings={settings}
        onSave={upsertInvoice}
        getNextInvoiceNumber={getNextInvoiceNumber}
        getPrimaryBankAccountForLanguage={getPrimaryBankAccountForLanguage}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settings={settings}
        onSave={updateSettings}
      />

      {/* Print Preview & Print Dialog */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 print:p-0">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Náhled Faktury {previewInvoice?.number}</span>
              <Button onClick={executePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Vytisknout / Stáhnout PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {previewInvoice && (
            <div className="py-4">
              <InvoicePrintView invoice={previewInvoice} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
