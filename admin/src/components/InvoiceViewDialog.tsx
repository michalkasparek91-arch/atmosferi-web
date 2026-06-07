import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

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
  items: Array<{ desc: string; qty: number; price: number }>;
  billing_snapshot: {
    company_name?: string;
    ico?: string;
    dic?: string;
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
}

interface InvoiceViewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Company info - Zrobee s.r.o.
const COMPANY_INFO = {
  name: "Zrobee s.r.o.",
  ico: "12345678", // Replace with actual IČO
  dic: "CZ12345678", // Replace with actual DIČ
  street: "Václavské náměstí 1",
  city: "Praha 1",
  zip: "110 00",
  country: "Česká republika",
  bankAccount: "123456789/0100", // Replace with actual bank account
  email: "fakturace@zrobee.cz",
};

const InvoiceViewDialog = ({ invoice, open, onOpenChange }: InvoiceViewDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const formatCurrency = (amount: number, currency: string = "CZK") => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faktura ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #000; }
            .invoice-title { font-size: 20px; color: #666; text-align: right; }
            .invoice-number { font-size: 14px; color: #666; }
            .parties { display: flex; gap: 40px; margin-bottom: 30px; }
            .party { flex: 1; }
            .party-title { font-weight: bold; margin-bottom: 10px; color: #666; font-size: 12px; text-transform: uppercase; }
            .party-name { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .party-detail { font-size: 13px; color: #666; line-height: 1.5; }
            .dates { display: flex; gap: 40px; margin-bottom: 30px; padding: 15px; background: #f5f5f5; }
            .date-item { }
            .date-label { font-size: 12px; color: #666; }
            .date-value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; color: #666; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total-row.final { border-bottom: none; border-top: 2px solid #333; padding-top: 12px; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
            .status-badge { display: inline-block; padding: 4px 12px; background: #22c55e; color: white; border-radius: 4px; font-size: 12px; font-weight: bold; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const billing = invoice.billing_snapshot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Faktura {invoice.invoice_number}</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Tisknout
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Stáhnout PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="bg-background p-6 rounded-lg">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Zrobee</h1>
              <p className="text-muted-foreground text-sm">Tržiště služeb</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold text-muted-foreground">DAŇOVÝ DOKLAD - FAKTURA</h2>
              <p className="text-sm text-muted-foreground">Číslo: {invoice.invoice_number}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded">
                {invoice.status === "paid" ? "UHRAZENO" : "STORNOVÁNO"}
              </span>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Parties */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Dodavatel</p>
              <p className="font-semibold text-foreground">{COMPANY_INFO.name}</p>
              <p className="text-sm text-muted-foreground">{COMPANY_INFO.street}</p>
              <p className="text-sm text-muted-foreground">{COMPANY_INFO.zip} {COMPANY_INFO.city}</p>
              <p className="text-sm text-muted-foreground mt-2">IČO: {COMPANY_INFO.ico}</p>
              <p className="text-sm text-muted-foreground">DIČ: {COMPANY_INFO.dic}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Odběratel</p>
              <p className="font-semibold text-foreground">{billing.company_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{billing.street || "—"}</p>
              <p className="text-sm text-muted-foreground">
                {billing.zip} {billing.city}
              </p>
              {billing.ico && (
                <p className="text-sm text-muted-foreground mt-2">IČO: {billing.ico}</p>
              )}
              {billing.dic && (
                <p className="text-sm text-muted-foreground">DIČ: {billing.dic}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-8 mb-8 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Datum vystavení</p>
              <p className="font-medium text-foreground">
                {format(new Date(invoice.issued_at), "d. MMMM yyyy", { locale: cs })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Datum zdanitelného plnění</p>
              <p className="font-medium text-foreground">
                {format(new Date(invoice.tax_date), "d. MMMM yyyy", { locale: cs })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Způsob úhrady</p>
              <p className="font-medium text-foreground">Platební karta</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-3 text-xs font-medium text-muted-foreground uppercase">Popis služby</th>
                <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase">Množství</th>
                <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase">Cena/ks bez DPH</th>
                <th className="text-right py-3 text-xs font-medium text-muted-foreground uppercase">Celkem bez DPH</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const priceWithoutVat = item.price / (1 + invoice.vat_rate / 100);
                return (
                  <tr key={index} className="border-b border-border">
                    <td className="py-3 text-foreground">{item.desc}</td>
                    <td className="py-3 text-right text-foreground">{item.qty}</td>
                    <td className="py-3 text-right text-foreground">
                      {formatCurrency(priceWithoutVat, invoice.currency)}
                    </td>
                    <td className="py-3 text-right text-foreground">
                      {formatCurrency(priceWithoutVat * item.qty, invoice.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Základ daně</span>
                <span className="text-foreground">{formatCurrency(invoice.amount_without_vat, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">DPH {invoice.vat_rate}%</span>
                <span className="text-foreground">{formatCurrency(invoice.vat_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-foreground mt-2">
                <span className="font-bold text-foreground text-lg">Celkem k úhradě</span>
                <span className="font-bold text-foreground text-lg">
                  {formatCurrency(invoice.amount_total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Faktura je uhrazena. • Vygenerováno systémem Zrobee
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {COMPANY_INFO.email} • www.zrobee.cz
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewDialog;
