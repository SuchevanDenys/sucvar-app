// app/components/b2b/PrintDeviz.tsx
// Print-only B2B bill of quantities (visible only with window.print()).
import React from 'react';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import type { InvoiceLine } from '@/app/lib/b2b/estimate';

interface PrintDevizProps {
  isRo: boolean;
  projectName: string;
  printDate: string;
  lines: InvoiceLine[];
  net: number;
  vat: number;
  vatAmt: number;
  gross: number;
}

export default function PrintDeviz({ isRo, projectName, printDate, lines, net, vat, vatAmt, gross }: PrintDevizProps) {
  const t = (ro: string, en: string) => (isRo ? ro : en);

  return (
    <section className="hidden print:block bg-white text-[#1A1A1A] p-10">
      <header className="flex items-center justify-between border-b border-stone-300 pb-5">
        <SucvarLogo size={36} withWordmark />
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">SUCVAR · Deviz tehnic B2B</p>
          {projectName && <p className="text-xs font-semibold mt-0.5">{projectName}</p>}
          {printDate && <p className="text-xs mt-0.5">{printDate}</p>}
        </div>
      </header>

      <table className="w-full text-xs border border-stone-300 mt-6">
        <thead>
          <tr className="bg-stone-100 text-left">
            <th className="p-2 w-1/2">{t('Descriere', 'Description')}</th>
            <th className="p-2">U.M.</th>
            <th className="p-2 text-right">{t('Cant.', 'Qty')}</th>
            <th className="p-2 text-right">{t('Preț unitar', 'Unit price')}</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.name}-${i}`} className="border-b border-stone-200">
              <td className="p-2">{l.name}</td>
              <td className="p-2">{l.unit}</td>
              <td className="p-2 font-mono text-right">{l.qty}</td>
              <td className="p-2 font-mono text-right">{l.unitPrice.toFixed(2)}</td>
              <td className="p-2 font-mono text-right">{l.total.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="p-2" colSpan={4}>{t('Total fără TVA', 'Net total')}</td>
            <td className="p-2 font-mono text-right">{net.toFixed(2)} €</td>
          </tr>
          <tr>
            <td className="p-2" colSpan={4}>{t('TVA', 'VAT')} {vat}%</td>
            <td className="p-2 font-mono text-right">{vatAmt.toFixed(2)} €</td>
          </tr>
          <tr className="font-semibold bg-stone-100">
            <td className="p-2" colSpan={4}>{t('Total cu TVA', 'Gross total')}</td>
            <td className="p-2 font-mono text-right">{gross.toFixed(2)} €</td>
          </tr>
        </tbody>
      </table>

      <footer className="mt-10 pt-5 border-t border-stone-300 text-xs flex justify-between">
        <span>Deviz generat de SUCVAR · suchevandenys.com</span>
        <span>Signed: Lead Systems Architect — Suchevan Denys</span>
      </footer>
    </section>
  );
}
