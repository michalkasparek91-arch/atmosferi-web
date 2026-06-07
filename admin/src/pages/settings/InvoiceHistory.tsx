import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Eye, Receipt, LifeBuoy } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState, useEffect } from "react";
import InvoiceViewDialog from "@/components/InvoiceViewDialog";
import { BillingSupportModal } from "@/components/BillingSupportModal";

interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
}

interface BillingSnapshot {
  company_name?: string;
  ico?: string;
  dic?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount_total: number;
  amount_without_vat: number;
  vat_amount: number;
  vat_rate: number;
  currency: string;
  status: "paid" | "void";
  issued_at: string;
  tax_date: string;
  items: InvoiceItem[];
  billing_snapshot: BillingSnapshot;
}

const InvoiceHistory = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match Invoice interface
      return (data || []).map(row => ({
        ...row,
        status: row.status as "paid" | "void",
        items: (row.items as unknown as InvoiceItem[]) || [],
        billing_snapshot: (row.billing_snapshot as unknown as BillingSnapshot) || {},
      })) as Invoice[];
    },
  });

  const formatCurrency = (amount: number, currency: string = "CZK") => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mt-1 mb-1">
        <div className="flex items-center min-h-[36px] -mx-3 px-3 md:mx-0 md:px-0 pb-1">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Historie plateb a faktury</h2>
            <p className="text-xs text-muted-foreground">
              Přehled všech vašich plateb a možnost stažení daňových dokladů.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Vystavené faktury
          </CardTitle>
          <CardDescription>
            Daňové doklady za zakoupené kredity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Zatím zde nejsou žádné faktury.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Jakmile provedete první nákup, zobrazí se tu vaše faktury.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Číslo dokladu</TableHead>
                    <TableHead>Položka</TableHead>
                    <TableHead className="text-right">Částka</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {format(new Date(invoice.issued_at), "d. M. yyyy", { locale: cs })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.items?.[0]?.desc || "Nákup kreditů"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.amount_total, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={invoice.status === "paid" ? "default" : "secondary"}
                          className={invoice.status === "paid" ? "bg-green-500" : ""}
                        >
                          {invoice.status === "paid" ? "Uhrazeno" : "Stornováno"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Support Footer */}
        <div className="px-6 py-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LifeBuoy className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">
              Nesedí údaje na faktuře nebo máte problém s platbou?{" "}
              <button
                onClick={() => setSupportModalOpen(true)}
                className="text-primary hover:underline font-medium"
              >
                Kontaktovat podporu pro úpravu dokladu
              </button>
            </span>
          </div>
        </div>
      </Card>

      <InvoiceViewDialog
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      />

      <BillingSupportModal
        open={supportModalOpen}
        onOpenChange={setSupportModalOpen}
        lastInvoiceId={invoices?.[0]?.id ?? null}
        lastInvoiceNumber={invoices?.[0]?.invoice_number ?? null}
      />
    </div>
  );
};

export default InvoiceHistory;
