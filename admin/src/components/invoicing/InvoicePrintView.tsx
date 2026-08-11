import React from "react";
import { Invoice } from "@/types/invoicing";
import { QRCodeSVG } from "qrcode.react";

interface InvoicePrintViewProps {
  invoice: Invoice;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice }) => {
  const isEn = invoice.language === "en";
  const isPixl = invoice.brand === "pixl";

  // Format currency helper
  const formatMoney = (amount: number, currency: string) => {
    const formatted = new Intl.NumberFormat(isEn ? "en-US" : "cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    if (currency === "EUR") {
      return isEn ? `€${formatted}` : `${formatted} €`;
    }
    return `${formatted} Kč`;
  };

  // Generate Czech SPAYD string for QR Platba if bank account is CZK
  const buildSpaydString = () => {
    if (invoice.currency !== "CZK" || !invoice.bankAccount.accountNumber) return null;
    
    // Clean account number (e.g. "1336168004/2700" -> "1336168004~2700")
    const accFormatted = invoice.bankAccount.accountNumber.replace("/", "~");
    const amountStr = invoice.total.toFixed(2);
    const vs = invoice.variableSymbol;
    
    return `SPD*1.0*ACC:${accFormatted}*AM:${amountStr}*CC:CZK*X-VS:${vs}*MSG:Faktura ${invoice.number}`;
  };

  const spaydString = buildSpaydString();

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white text-zinc-900 p-8 sm:p-12 shadow-md print:shadow-none print:p-0 print:m-0 font-sans text-xs leading-relaxed transition-all">
      {/* Header Bar */}
      <div className="flex justify-between items-start mb-8">
        {/* Brand Logo Box */}
        <div>
          {isPixl ? (
            <div className="border-2 border-black px-3 py-1.5 inline-block font-black text-xl tracking-tight text-black">
              pixl
            </div>
          ) : (
            <div className="font-black text-2xl tracking-widest text-black uppercase">
              atmosferi
            </div>
          )}
        </div>

        {/* Invoice Title */}
        <div className="text-right">
          <div className="border-b-2 border-zinc-900 pb-1 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {isEn ? "Invoice" : "Faktura"} {invoice.number}
            </h1>
          </div>
        </div>
      </div>

      {/* Line Divider */}
      <div className="w-full h-px bg-zinc-300 my-6" />

      {/* Supplier & Client Section */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* DODAVATEL / SUPPLIER */}
        <div>
          <div className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase mb-2">
            {isEn ? "SUPPLIER" : "DODAVATEL"}
          </div>
          <div className="font-bold text-sm text-zinc-900 mb-1">
            {invoice.supplier.name}
          </div>
          <div className="text-zinc-600 mb-4 whitespace-pre-line">
            {invoice.supplier.street}<br />
            {invoice.supplier.zip} {invoice.supplier.city}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <div className="text-zinc-500">{isEn ? "Reg. No." : "IČO"}</div>
            <div className="font-medium text-zinc-900">{invoice.supplier.registrationNo}</div>

            {invoice.supplier.vatNo ? (
              <>
                <div className="text-zinc-500">{isEn ? "VAT No." : "DIČ"}</div>
                <div className="font-medium text-zinc-900">{invoice.supplier.vatNo}</div>
              </>
            ) : (
              <div className="col-span-2 text-zinc-600 font-medium mt-0.5">
                {invoice.supplier.vatPayerStatus || (isEn ? "Non-VAT payer" : "Neplátce DPH")}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
            {invoice.bankAccount.accountNumber && (
              <>
                <div className="text-zinc-500">{isEn ? "Bank Account" : "Bankovní účet"}</div>
                <div className="font-semibold text-zinc-900">{invoice.bankAccount.accountNumber}</div>
              </>
            )}

            {invoice.bankAccount.iban && (
              <>
                <div className="text-zinc-500">IBAN</div>
                <div className="font-semibold text-zinc-900">{invoice.bankAccount.iban}</div>
              </>
            )}

            {invoice.bankAccount.swift && (
              <>
                <div className="text-zinc-500">SWIFT/BIC</div>
                <div className="font-semibold text-zinc-900">{invoice.bankAccount.swift}</div>
              </>
            )}

            <div className="text-zinc-500">{isEn ? "Variable Symbol" : "Variabilní symbol"}</div>
            <div className="font-semibold text-zinc-900">{invoice.variableSymbol}</div>

            <div className="text-zinc-500">{isEn ? "Payment Method" : "Způsob platby"}</div>
            <div className="font-medium text-zinc-900">{isEn ? "Bank transfer" : "Převodem"}</div>
          </div>
        </div>

        {/* ODBĚRATEL / CLIENT */}
        <div>
          <div className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase mb-2">
            {isEn ? "CLIENT" : "ODBĚRATEL"}
          </div>
          <div className="font-bold text-sm text-zinc-900 mb-1">
            {invoice.client.name}
          </div>
          <div className="text-zinc-600 mb-4 whitespace-pre-line">
            {invoice.client.street}<br />
            {invoice.client.zip} {invoice.client.city}<br />
            {invoice.client.country !== "CZ" ? invoice.client.country : ""}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            {invoice.client.registrationNo && (
              <>
                <div className="text-zinc-500">{isEn ? "Reg. No." : "IČO"}</div>
                <div className="font-medium text-zinc-900">{invoice.client.registrationNo}</div>
              </>
            )}

            {invoice.client.vatNo && (
              <>
                <div className="text-zinc-500">{isEn ? "VAT No." : "DIČ"}</div>
                <div className="font-medium text-zinc-900">{invoice.client.vatNo}</div>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
            <div className="text-zinc-500">{isEn ? "Issue Date" : "Datum vystavení"}</div>
            <div className="font-medium text-zinc-900">{invoice.issuedOn}</div>

            <div className="text-zinc-500">{isEn ? "Due Date" : "Datum splatnosti"}</div>
            <div className="font-semibold text-zinc-900">{invoice.dueOn}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="my-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-t border-zinc-300 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <th className="py-2.5 px-1 w-12 text-center">{isEn ? "Qty" : "Počet"}</th>
              <th className="py-2.5 px-2">{isEn ? "Item Description" : "Popis položky"}</th>
              <th className="py-2.5 px-2 text-right w-32">{isEn ? "UNIT PRICE" : "CENA ZA MJ"}</th>
              <th className="py-2.5 px-1 text-right w-32">{isEn ? "TOTAL" : "CELKEM"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {invoice.items.map((item, idx) => (
              <tr key={item.id || idx} className="py-2">
                <td className="py-3 px-1 text-center font-medium text-zinc-700">{item.quantity}</td>
                <td className="py-3 px-2 font-medium text-zinc-900">{item.description}</td>
                <td className="py-3 px-2 text-right text-zinc-700">{formatMoney(item.unitPrice, invoice.currency)}</td>
                <td className="py-3 px-1 text-right font-semibold text-zinc-900">{formatMoney(item.total, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Bottom Area */}
      <div className="grid grid-cols-2 gap-8 items-end mt-10 pt-4 border-t border-zinc-200">
        {/* Left: QR Platba (if CZK) */}
        <div>
          {spaydString ? (
            <div className="inline-flex flex-col items-center border border-zinc-200 p-2.5 rounded-lg bg-zinc-50/50">
              <QRCodeSVG value={spaydString} size={110} level="M" />
              <span className="text-[10px] font-bold text-zinc-400 mt-1.5 uppercase tracking-wider">QR Platba</span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 italic">
              {isEn ? "International Wire Transfer" : "Zahraniční bankovní převod"}
            </div>
          )}
        </div>

        {/* Right: Big Total Amount */}
        <div className="text-right">
          <div className="w-full h-1 bg-zinc-900 mb-2" />
          <div className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {formatMoney(invoice.total, invoice.currency)}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-16 text-[10px] text-zinc-400 text-center border-t border-zinc-100 pt-4">
        {isEn 
          ? "Registered in the Trade Licensing Register." 
          : "Fyzická osoba zapsaná v živnostenském rejstříku."
        }
      </div>
    </div>
  );
};
