import React from "react";
import { Invoice } from "@/types/invoicing";
import { QRCodeSVG } from "qrcode.react";
import { COUNTRY_NAMES } from "@/lib/ares";

interface InvoicePrintViewProps {
  invoice: Invoice;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice }) => {
  const isEn = invoice.language === "en";
  const isPixl = invoice.brand === "pixl";
  const isPersonal = invoice.brand === "personal";

  // Format money for CZK, EUR, USD, GBP
  const formatMoney = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat(isEn ? "en-US" : "cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    switch (currency) {
      case "EUR": return isEn ? `€${formatted}` : `${formatted} €`;
      case "USD": return `$${formatted}`;
      case "GBP": return `£${formatted}`;
      case "CZK":
      default: return isEn ? `CZK ${formatted}` : `${formatted} Kč`;
    }
  };

  // Generate Czech SPAYD string for QR Platba if bank account is CZK
  const buildSpaydString = () => {
    if (invoice.currency !== "CZK" || !invoice.bankAccount.accountNumber) return null;
    const accFormatted = invoice.bankAccount.accountNumber.replace("/", "~");
    const amountStr = invoice.total.toFixed(2);
    const vs = invoice.variableSymbol;
    return `SPD*1.0*ACC:${accFormatted}*AM:${amountStr}*CC:CZK*X-VS:${vs}*MSG:Faktura ${invoice.number}`;
  };

  const spaydString = buildSpaydString();

  // Helper to format country name
  const getCountryLabel = (codeOrName?: string) => {
    if (!codeOrName || codeOrName === "CZ" || codeOrName === "Česká republika") return "";
    return COUNTRY_NAMES[codeOrName] || codeOrName;
  };

  const clientCountry = getCountryLabel(invoice.client.country);
  const supplierCountry = getCountryLabel(invoice.supplier.country);

  return (
    <div className="w-full max-w-[820px] mx-auto bg-white text-zinc-900 p-8 sm:p-12 print:p-0 print:m-0 print:max-w-none font-sans text-xs leading-relaxed transition-all">
      {/* Printable Page Wrapper */}
      <div className="flex flex-col min-h-[960px] justify-between">
        <div>
          {/* Header Bar */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-zinc-200">
            {/* Brand / Supplier Title */}
            <div>
              {isPersonal ? (
                <div>
                  <div className="font-bold text-2xl tracking-tight text-zinc-950">{invoice.supplier.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {invoice.supplier.registrationNo ? `${isEn ? "Reg. No." : "IČO"} ${invoice.supplier.registrationNo}` : null}
                  </div>
                </div>
              ) : isPixl ? (
                <div>
                  <div className="text-3xl font-black tracking-tighter text-zinc-950 lowercase">
                    pixl<span className="text-amber-500">.</span>
                  </div>
                  <div className="text-[11px] font-medium text-zinc-400 mt-0.5 tracking-wide">
                    STUDIO & VISUALS
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-black tracking-widest text-zinc-950 uppercase">
                    atmosferi
                  </div>
                  <div className="text-[10px] font-medium text-zinc-400 mt-0.5 tracking-wider uppercase">
                    Architectural Network & Media
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Document Title & Numbers */}
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                {isEn ? "TAX DOCUMENT" : "DAŇOVÝ DOKLAD"}
              </div>
              <h1 className="text-3xl font-black text-zinc-950 tracking-tight">
                {isEn ? "Invoice" : "Faktura"} <span className="text-zinc-700">#{invoice.number}</span>
              </h1>
              <div className="text-xs text-zinc-500 mt-1">
                {isEn ? "Variable Symbol" : "Variabilní symbol"}: <span className="font-mono font-semibold text-zinc-900">{invoice.variableSymbol}</span>
              </div>
            </div>
          </div>

          {/* Supplier & Client 2-Column Section */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* DODAVATEL / SUPPLIER */}
            <div className="bg-zinc-50/80 rounded-xl p-5 border border-zinc-100/90 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-2 flex items-center justify-between">
                  <span>{isEn ? "SUPPLIER" : "DODAVATEL"}</span>
                </div>
                <div className="font-bold text-sm text-zinc-950 mb-1.5">
                  {invoice.supplier.name}
                </div>
                <div className="text-zinc-600 space-y-0.5 leading-snug">
                  <div>{invoice.supplier.street}</div>
                  <div>{invoice.supplier.zip} {invoice.supplier.city}</div>
                  {supplierCountry && <div className="font-medium text-zinc-800">{supplierCountry}</div>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                {invoice.supplier.registrationNo && (
                  <>
                    <div className="text-zinc-500">{isEn ? "Reg. No." : "IČO"}:</div>
                    <div className="font-mono font-semibold text-zinc-900">{invoice.supplier.registrationNo}</div>
                  </>
                )}
                {invoice.supplier.vatNo ? (
                  <>
                    <div className="text-zinc-500">{isEn ? "VAT No." : "DIČ"}:</div>
                    <div className="font-mono font-semibold text-zinc-900">{invoice.supplier.vatNo}</div>
                  </>
                ) : (
                  <div className="col-span-2 text-zinc-500 italic mt-0.5">
                    {invoice.supplier.vatPayerStatus || (isEn ? "Non-VAT payer" : "Neplátce DPH")}
                  </div>
                )}
              </div>
            </div>

            {/* ODBĚRATEL / CLIENT */}
            <div className="bg-zinc-50/80 rounded-xl p-5 border border-zinc-100/90 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-2 flex items-center justify-between">
                  <span>{isEn ? "CLIENT / BILL TO" : "ODBĚRATEL"}</span>
                </div>
                <div className="font-bold text-sm text-zinc-950 mb-1.5">
                  {invoice.client.name}
                </div>
                <div className="text-zinc-600 space-y-0.5 leading-snug">
                  {invoice.client.street && <div>{invoice.client.street}</div>}
                  {(invoice.client.zip || invoice.client.city) && (
                    <div>{invoice.client.zip} {invoice.client.city}</div>
                  )}
                  {clientCountry && <div className="font-bold text-zinc-900 mt-0.5">{clientCountry}</div>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/60 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                {invoice.client.registrationNo ? (
                  <>
                    <div className="text-zinc-500">{isEn ? "Reg. No." : "IČO"}:</div>
                    <div className="font-mono font-semibold text-zinc-900">{invoice.client.registrationNo}</div>
                  </>
                ) : <div />}

                {invoice.client.vatNo ? (
                  <>
                    <div className="text-zinc-500">{isEn ? "VAT No." : "DIČ"}:</div>
                    <div className="font-mono font-semibold text-zinc-900">{invoice.client.vatNo}</div>
                  </>
                ) : <div />}
              </div>
            </div>
          </div>

          {/* Payment & Dates Highlight Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900 text-white mb-8 shadow-sm">
            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{isEn ? "Issue Date" : "Datum vystavení"}</div>
              <div className="font-semibold text-sm text-white mt-0.5">{invoice.issuedOn}</div>
            </div>

            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{isEn ? "Due Date" : "Datum splatnosti"}</div>
              <div className="font-bold text-sm text-amber-400 mt-0.5">{invoice.dueOn}</div>
            </div>

            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{isEn ? "Payment Method" : "Způsob úhrady"}</div>
              <div className="font-medium text-xs text-zinc-200 mt-0.5">{isEn ? "Bank Transfer" : "Bankovní převod"}</div>
            </div>

            <div>
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{isEn ? "Currency" : "Měna"}</div>
              <div className="font-bold text-sm text-white mt-0.5">{invoice.currency}</div>
            </div>
          </div>

          {/* Bank Account Details Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 py-3 mb-8 rounded-lg border border-zinc-200/80 bg-zinc-50/50 text-xs">
            {invoice.bankAccount.accountNumber && (
              <div>
                <span className="text-zinc-400 font-medium">{isEn ? "Account No:" : "Bankovní účet:"}</span>{" "}
                <span className="font-mono font-bold text-zinc-900">{invoice.bankAccount.accountNumber}</span>
              </div>
            )}
            {invoice.bankAccount.iban && (
              <div>
                <span className="text-zinc-400 font-medium">IBAN:</span>{" "}
                <span className="font-mono font-bold text-zinc-900">{invoice.bankAccount.iban}</span>
              </div>
            )}
            {invoice.bankAccount.swift && (
              <div>
                <span className="text-zinc-400 font-medium">SWIFT/BIC:</span>{" "}
                <span className="font-mono font-bold text-zinc-900">{invoice.bankAccount.swift}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100/90 text-zinc-600 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-3 px-3 w-12 text-center">{isEn ? "Qty" : "Počet"}</th>
                  <th className="py-3 px-3">{isEn ? "Item Description" : "Popis položky / Služby"}</th>
                  <th className="py-3 px-3 text-right w-36">{isEn ? "Unit Price" : "Cena za MJ"}</th>
                  <th className="py-3 px-3 text-right w-36">{isEn ? "Total Amount" : "Celkem"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 text-xs">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3.5 px-3 text-center font-semibold text-zinc-600">{item.quantity}</td>
                    <td className="py-3.5 px-3 font-medium text-zinc-900 leading-relaxed whitespace-pre-line">{item.description}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-700">{formatMoney(item.unitPrice, invoice.currency)}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-zinc-950">{formatMoney(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Bottom Area */}
        <div>
          <div className="grid grid-cols-2 gap-8 items-end pt-6 border-t-2 border-zinc-900 mb-8">
            {/* Left: QR Platba (if CZK) or Wire Transfer instructions */}
            <div>
              {spaydString ? (
                <div className="inline-flex items-center gap-4 border border-zinc-200 p-3 rounded-xl bg-zinc-50/60">
                  <QRCodeSVG value={spaydString} size={90} level="M" />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 uppercase tracking-wider">QR Platba</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                      Naskenujte v bankovní aplikaci<br />pro okamžitou úhradu.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-200/70 leading-relaxed max-w-sm">
                  <div className="font-semibold text-zinc-900 mb-0.5">
                    {isEn ? "International Wire Transfer Instructions" : "Instrukce k zahraničnímu převodu"}
                  </div>
                  <div>
                    {isEn 
                      ? `Please include invoice number ${invoice.number} as payment reference.`
                      : `Uveďte prosím variabilní symbol ${invoice.variableSymbol} do zprávy pro příjemce.`
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Right: Big Total Amount Box */}
            <div className="text-right bg-zinc-900 text-white p-5 rounded-2xl shadow-sm">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                {isEn ? "TOTAL AMOUNT DUE" : "CELKOVÁ ČÁSTKA K ÚHRADĚ"}
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                {formatMoney(invoice.total, invoice.currency)}
              </div>
            </div>
          </div>

          {/* Footer Legal Note */}
          <div className="text-[10px] text-zinc-400 text-center border-t border-zinc-200 pt-4 pb-2">
            {isEn 
              ? "Registered in the Trade Licensing Register. Thank you for your business!" 
              : "Fyzická osoba zapsaná v živnostenském rejstříku. Děkujeme za spolupráci!"
            }
          </div>
        </div>
      </div>
    </div>
  );
};

