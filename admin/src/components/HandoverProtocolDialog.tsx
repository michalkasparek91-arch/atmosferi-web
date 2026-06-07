import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface HandoverProtocolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: {
    title: string;
    description: string;
    createdAt: string;
    completedAt?: string;
    status: string;
    address?: string;
  };
  workerData: {
    name: string;
    phone?: string;
    billing?: {
      company_name: string | null;
      ico: string | null;
      dic: string | null;
      street: string | null;
      city: string | null;
      zip: string | null;
      bank_account: string | null;
    };
  };
  customerData: {
    name: string;
    address?: string;
    billing?: {
      company_name: string | null;
      ico: string | null;
      dic: string | null;
      street: string | null;
      city: string | null;
      zip: string | null;
    };
  };
  additionalCosts?: Array<{
    description: string;
    amount: number;
    confirmed_by_other: boolean;
  }>;
  finalPrice?: number;
  basePrice?: number;
}

const COMPANY_INFO = {
  name: "Zrobee s.r.o.",
  website: "www.zrobee.cz",
};

export const HandoverProtocolDialog = ({
  isOpen,
  onClose,
  jobData,
  workerData,
  customerData,
  additionalCosts = [],
  finalPrice = 0,
  basePrice = 0,
}: HandoverProtocolDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const isCompletedAndApproved = jobData.status === 'completed';

  const handlePrint = () => {
    setIsPrinting(true);
    
    const printContent = printRef.current;
    if (!printContent) {
      setIsPrinting(false);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Předávací protokol - ${jobData.title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1a1a1a;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #f59e0b;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 8px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .section {
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e5e5;
            }
            .parties {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .party {
              background: #f9fafb;
              padding: 16px;
              border: 1px solid #eee;
              border-radius: 8px;
            }
            .party-label {
              font-size: 11px;
              font-weight: 700;
              color: #f59e0b;
              text-transform: uppercase;
              margin-bottom: 8px;
              border-bottom: 1px solid #ffeeba;
              padding-bottom: 4px;
            }
            .party-name {
              font-size: 14px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 6px;
            }
            .party-detail {
              font-size: 13px;
              color: #444;
              line-height: 1.4;
            }
            .price-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .price-table th {
              text-align: left;
              font-size: 12px;
              color: #666;
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .price-table td {
              padding: 10px 8px;
              font-size: 14px;
              border-bottom: 1px solid #f5f5f5;
            }
            .price-total {
              font-weight: 700;
              font-size: 16px;
              color: #000;
            }
            .disclaimer {
              margin-top: 30px;
              padding: 15px;
              background: #fffbeb;
              border: 1px solid #fef3c7;
              border-radius: 8px;
              font-size: 13px;
              color: #92400e;
              line-height: 1.5;
            }
            .qr-section {
              margin-top: 30px;
              display: flex;
              align-items: center;
              gap: 20px;
              padding: 15px;
              border: 1px solid #eee;
              border-radius: 8px;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              background: #eee;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              text-align: center;
              color: #999;
            }
            .status-badge {
              display: inline-block;
              background: #22c55e;
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 700;
              margin-top: 15px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e5;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
            .signature-section {
              display: flex;
              gap: 40px;
              margin-top: 40px;
            }
            .signature-box {
              flex: 1;
              border-top: 1px solid #ccc;
              padding-top: 8px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Předávací protokol</h1>
            <p>${COMPANY_INFO.website}</p>
          </div>

          <div class="parties">
            <div class="party">
              <div class="party-label">Zhotovitel (Dodavatel)</div>
              <div class="party-name">${workerData.billing?.company_name || workerData.name}</div>
              <div class="party-detail">
                ${workerData.billing?.street || ''}<br>
                ${workerData.billing?.zip || ''} ${workerData.billing?.city || ''}<br>
                ${workerData.billing?.ico ? `IČO: ${workerData.billing.ico}<br>` : ''}
                ${workerData.billing?.dic ? `DIČ: ${workerData.billing.dic}<br>` : ''}
                ${workerData.phone ? `Tel: ${workerData.phone}` : ''}
              </div>
            </div>
            <div class="party">
              <div class="party-label">Objednatel (Odběratel)</div>
              <div class="party-name">${customerData.billing?.company_name || customerData.name}</div>
              <div class="party-detail">
                ${customerData.billing?.street || customerData.address || ''}<br>
                ${customerData.billing?.zip || ''} ${customerData.billing?.city || ''}<br>
                ${customerData.billing?.ico ? `IČO: ${customerData.billing.ico}<br>` : ''}
                ${customerData.billing?.dic ? `DIČ: ${customerData.billing.dic}` : ''}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Předmět zakázky a vyúčtování</div>
            <div class="job-details" style="background: none; padding: 0;">
              <div class="job-title" style="font-size: 16px;">${jobData.title}</div>
              <div class="job-description">${jobData.description}</div>
              
              <table class="price-table">
                <thead>
                  <tr>
                    <th>Popis položky</th>
                    <th style="text-align: right;">Částka</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Základní cena zakázky</td>
                    <td style="text-align: right;">${(basePrice || finalPrice).toLocaleString('cs-CZ')} Kč</td>
                  </tr>
                  ${additionalCosts.map(cost => `
                    <tr>
                      <td>${cost.description} ${!cost.confirmed_by_other ? '<span style="color: #f59e0b; font-size: 11px;">(neodsouhlaseno)</span>' : ''}</td>
                      <td style="text-align: right;">${cost.amount.toLocaleString('cs-CZ')} Kč</td>
                    </tr>
                  `).join('')}
                  <tr class="price-total">
                    <td style="border-top: 2px solid #000; padding-top: 15px;">CELKEM K ÚHRADĚ</td>
                    <td style="text-align: right; border-top: 2px solid #000; padding-top: 15px;">${finalPrice.toLocaleString('cs-CZ')} Kč</td>
                  </tr>
                </tbody>
              </table>

              <div class="job-meta" style="margin-top: 20px;">
                <div class="job-meta-item">
                  <span class="job-meta-label">Místo realizace</span>
                  <span class="job-meta-value">${jobData.address || 'Neuvedeno'}</span>
                </div>
                <div class="job-meta-item">
                  <span class="job-meta-label">Datum předání</span>
                  <span class="job-meta-value">${format(new Date(), "d. MMMM yyyy", { locale: cs })}</span>
                </div>
              </div>
              
              ${isCompletedAndApproved ? '<div class="status-badge">✓ DOKONČENO A SCHVÁLENO KLIENTEM PŘES APLIKACI</div>' : ''}
            </div>
          </div>

          <div class="disclaimer">
            <strong>Prohlášení o převzetí:</strong> Odběratel potvrzuje, že práce byly provedeny v dohodnutém rozsahu a kvalitě. Dnešním dnem odběratel přebírá dílo bez zjevných vad a nedodělků. Smluvní strany berou na vědomí, že tímto protokolem dochází k ukončení realizace zakázky.
          </div>

          ${workerData.billing?.bank_account ? `
          <div class="qr-section">
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`SPD*1.0*ACC:${workerData.billing.bank_account.replace(/\//g, '')}*AM:${finalPrice}*CC:CZK*MSG:Zakazka ${jobData.title.substring(0, 20)}`)}&size=120x120" alt="QR Platba">
            </div>
            <div>
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">Informace k platbě</div>
              <div style="font-size: 13px; color: #444;">
                Číslo účtu: <strong>${workerData.billing.bank_account}</strong><br>
                Částka: <strong>${finalPrice.toLocaleString('cs-CZ')} Kč</strong><br>
                <span style="font-size: 11px; color: #666; margin-top: 4px; display: block;">Naskenujte QR kód ve své bankovní aplikaci pro rychlý převod.</span>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="signature-section" style="margin-top: 60px;">
            <div class="signature-box" style="border-top: 1px solid #000; padding-top: 10px;">
              Za zhotovitele<br>
              <span style="font-size: 10px; color: #999;">(datum a podpis)</span>
            </div>
            <div class="signature-box" style="border-top: 1px solid #000; padding-top: 10px;">
              Za objednatele<br>
              <span style="font-size: 10px; color: #999;">(datum a podpis)</span>
            </div>
          </div>

          <div class="footer">
            Vygenerováno automaticky systémem Zrobee • ${format(new Date(), "d.M.yyyy HH:mm", { locale: cs })}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      setIsPrinting(false);
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Předávací protokol
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="py-2">
          {/* Preview of the protocol */}
          <div className="border rounded-xl p-4 md:p-8 bg-white text-black shadow-sm max-w-[800px] mx-auto font-sans">
            {/* Header */}
            <div className="text-center border-b-2 border-primary pb-4 mb-6">
              <h2 className="text-2xl font-bold">Předávací protokol</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{COMPANY_INFO.website}</p>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <p className="text-[10px] font-bold text-primary uppercase mb-2 border-b border-primary/20 pb-1">Zhotovitel (Dodavatel)</p>
                <p className="font-bold text-sm">{workerData.billing?.company_name || workerData.name}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>{workerData.billing?.street || ''}</p>
                  <p>{workerData.billing?.zip || ''} {workerData.billing?.city || ''}</p>
                  {workerData.billing?.ico && <p>IČO: {workerData.billing.ico}</p>}
                  {workerData.billing?.dic && <p>DIČ: {workerData.billing.dic}</p>}
                  {workerData.phone && <p>Tel: {workerData.phone}</p>}
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <p className="text-[10px] font-bold text-primary uppercase mb-2 border-b border-primary/20 pb-1">Objednatel (Odběratel)</p>
                <p className="font-bold text-sm">{customerData.billing?.company_name || customerData.name}</p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>{customerData.billing?.street || customerData.address || ''}</p>
                  <p>{customerData.billing?.zip || ''} {customerData.billing?.city || ''}</p>
                  {customerData.billing?.ico && <p>IČO: {customerData.billing.ico}</p>}
                  {customerData.billing?.dic && <p>DIČ: {customerData.billing.dic}</p>}
                </div>
              </div>
            </div>

            {/* Price Table */}
            <div className="mb-8">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 pb-1 border-b">
                Předmět zakázky a vyúčtování
              </p>
              <div className="px-1">
                <h3 className="font-bold text-sm mb-1">{jobData.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-3">
                  {jobData.description}
                </p>
                
                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-xs">
                    <span>Základní cena zakázky</span>
                    <span>{(basePrice || finalPrice).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  {additionalCosts.map((cost, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {cost.description}
                        {!cost.confirmed_by_other && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">neodsouhlaseno</span>}
                      </span>
                      <span>{cost.amount.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t-2 border-black pt-3 mt-2">
                    <span className="font-bold text-sm uppercase">Celkem k úhradě</span>
                    <span className="font-bold text-lg">{finalPrice.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 mb-8">
              <p className="text-[11px] text-amber-900 leading-relaxed italic">
                <strong>Prohlášení o převzetí:</strong> Odběratel potvrzuje, že práce byly provedeny v dohodnutém rozsahu a kvalitě. Dnešním dnem odběratel přebírá dílo bez zjevných vad a nedodělků.
              </p>
            </div>

            {/* QR Section */}
            {workerData.billing?.bank_account && (
              <div className="flex items-center gap-4 p-3 border rounded-xl bg-slate-50/50 mb-8">
                <div className="w-20 h-20 bg-white p-1 border rounded shadow-sm flex items-center justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`SPD*1.0*ACC:${workerData.billing.bank_account.replace(/\//g, '')}*AM:${finalPrice}*CC:CZK*MSG:Zakazka ${jobData.title.substring(0, 20)}`)}&size=80x80`} alt="QR" className="w-full h-full" />
                </div>
                <div className="text-xs">
                  <p className="font-bold mb-1">Platební údaje</p>
                  <p className="text-muted-foreground">Účet: <span className="text-foreground font-medium">{workerData.billing.bank_account}</span></p>
                  <p className="text-muted-foreground">Částka: <span className="text-foreground font-medium">{finalPrice.toLocaleString('cs-CZ')} Kč</span></p>
                </div>
              </div>
            )}

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-8 mt-12 pb-4">
              <div className="border-t border-black pt-2 text-center">
                <p className="text-[9px] text-muted-foreground">Podpis zhotovitele</p>
              </div>
              <div className="border-t border-black pt-2 text-center">
                <p className="text-[9px] text-muted-foreground">Podpis objednatele</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[9px] text-muted-foreground mt-8 pt-4 border-t border-dotted">
              Vygenerováno automaticky systémem Zrobee • {format(new Date(), "d.M.yyyy HH:mm", { locale: cs })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Zavřít
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <>Připravuji...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Stáhnout PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
