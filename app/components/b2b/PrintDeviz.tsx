// app/components/b2b/PrintDeviz.tsx
// Deviz tehnic / ofertă B2B — vizibil DOAR la tipărire (window.print → „Salvează ca PDF").
// Fără elemente de interfață: antet SUCVAR, metadate proiect, Înainte/După, tabel de
// materiale pe categorii, manoperă, totaluri, condiții și semnături. Format A4 (vezi @page în globals.css).
import React from 'react';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import { CATEGORIES, eur, type LineItem } from '@/app/lib/b2b/estimate';
import type { Party } from '@/app/lib/b2b/exports';
import type { ClientMeta } from '@/app/lib/b2b/portfolio';

export interface PrintProject {
  title: string;
  modeLabel: string;
  spaceLabel: string;
  styleName: string;
  dims: string; // ex: "4 × 5 × 2,6 m"
  createdAt: string;
  originalImage: string | null;
  generatedImage: string | null;
}

export interface PrintLaborRow { name: string; hours: number; rate: number; cost: number }

interface PrintDevizProps {
  isRo: boolean;
  docNo: string;
  printDate: string;
  project: PrintProject | null;
  projectName: string;
  seller: Party;
  client: ClientMeta;
  labor: PrintLaborRow[];
  items: LineItem[];
  totals: {
    labor: number; materials: number;
    contingency: number; contingencyPct: number;
    margin: number; marginPct: number;
    net: number; vat: number; vatAmt: number; gross: number;
  };
  schedule: { days: number; crew: number; hours: number };
}

const th = 'p-2 font-semibold';
const num = 'p-2 font-mono text-right tabular-nums whitespace-nowrap';

export default function PrintDeviz({ isRo, docNo, printDate, project, projectName, seller, client, labor, items, totals, schedule }: PrintDevizProps) {
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const title = project?.title || projectName;
  const laborRows = labor.filter((l) => l.hours > 0);
  const hasImages = !!(project?.originalImage || project?.generatedImage);

  const meta: [string, string][] = [
    [t('Proiect', 'Project'), title || '—'],
    ...(project ? ([
      [t('Tip spațiu', 'Space'), `${project.modeLabel} · ${project.spaceLabel}`],
      [t('Stil', 'Style'), project.styleName],
      [t('Dimensiuni', 'Dimensions'), project.dims],
    ] as [string, string][]) : []),
    [t('Adresa șantierului', 'Site address'), client.siteAddress || '—'],
  ];

  return (
    <section className="hidden print:block bg-white text-[#1A1A1A] text-[11px] leading-snug">
      {/* Antet arhitectural */}
      <header className="flex items-start justify-between border-b-2 border-[#111111] pb-4">
        <SucvarLogo size={36} withWordmark />
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">{t('Deviz tehnic · Ofertă', 'Technical estimate · Offer')}</p>
          <p className="font-mono mt-1">{docNo ? `Nr. ${docNo}` : ''}{docNo && printDate ? ' · ' : ''}{printDate}</p>
          <p className="mt-0.5 text-stone-500">{t('Valabilitate ofertă: 30 zile', 'Offer valid for 30 days')}</p>
        </div>
      </header>

      {/* Părți + metadate proiect */}
      <div className="grid grid-cols-2 gap-6 mt-5">
        <div>
          <p className="uppercase tracking-[0.18em] text-[9px] text-stone-500 mb-1.5">{t('Furnizor', 'Contractor')}</p>
          <p className="font-semibold">{seller.name || '—'}</p>
          {seller.vatId && <p className="font-mono">{t('CUI', 'VAT ID')}: {seller.vatId}</p>}
          <p className="uppercase tracking-[0.18em] text-[9px] text-stone-500 mt-4 mb-1.5">{t('Client', 'Client')}</p>
          <p className="font-semibold">{client.name || '—'}</p>
          {client.vatId && <p className="font-mono">{t('CUI', 'VAT ID')}: {client.vatId}</p>}
          {client.address && <p>{client.address}</p>}
          {(client.phone || client.email) && <p>{[client.phone, client.email].filter(Boolean).join(' · ')}</p>}
        </div>
        <dl className="border border-stone-300 divide-y divide-stone-200 self-start">
          {meta.map(([k, v]) => (
            <div key={k} className="flex gap-3 px-2.5 py-1.5">
              <dt className="w-28 shrink-0 text-stone-500">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Înainte / După */}
      {hasImages && (
        <div className="grid grid-cols-2 gap-4 mt-5 break-inside-avoid">
          {([[t('Înainte', 'Before'), project?.originalImage], [t('După (design AI)', 'After (AI design)'), project?.generatedImage]] as const).map(([label, src]) => (
            <figure key={label}>
              <figcaption className="uppercase tracking-[0.18em] text-[9px] text-stone-500 mb-1">{label}</figcaption>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={label} className="w-full h-44 object-cover border border-stone-300" />
              ) : (
                <div className="w-full h-44 border border-dashed border-stone-300 flex items-center justify-center text-stone-400">
                  {t('Fără imagine', 'No image')}
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Materiale pe categorii */}
      <h2 className="mt-6 mb-1.5 uppercase tracking-[0.18em] text-[10px] font-semibold text-[#111111]">{t('1. Materiale', '1. Materials')}</h2>
      <table className="w-full border border-stone-300">
        <thead>
          <tr className="bg-stone-100 text-left">
            <th className={`${th} w-[46%]`}>{t('Descriere', 'Description')}</th>
            <th className={th}>U.M.</th>
            <th className={`${th} text-right`}>{t('Cant.', 'Qty')}</th>
            <th className={`${th} text-right`}>{t('Preț unitar', 'Unit price')}</th>
            <th className={`${th} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={5} className="p-2 text-stone-500">{t('Nu au fost definite linii de materiale.', 'No material lines defined.')}</td></tr>
          )}
          {CATEGORIES.map((cat) => {
            const rows = items.filter((i) => i.cat === cat.id);
            if (!rows.length) return null;
            const sub = rows.reduce((s, i) => s + i.qty * i.price, 0);
            return (
              <React.Fragment key={cat.id}>
                <tr className="bg-stone-50 font-semibold break-inside-avoid"><td colSpan={4} className="p-2">{t(cat.ro, cat.en)}</td><td className={num}>{eur(sub)}</td></tr>
                {rows.map((i) => (
                  <tr key={i.id} className="border-t border-stone-200 break-inside-avoid">
                    <td className="p-2">{(isRo ? i.ro : i.en) || '—'}</td>
                    <td className="p-2">{i.unit}</td>
                    <td className={num}>{i.qty}</td>
                    <td className={num}>{eur(i.price)}</td>
                    <td className={num}>{eur(i.qty * i.price)}</td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          <tr className="border-t border-stone-300 font-semibold"><td className="p-2" colSpan={4}>{t('Total materiale', 'Materials total')}</td><td className={num}>{eur(totals.materials)}</td></tr>
        </tbody>
      </table>

      {/* Manoperă */}
      <h2 className="mt-6 mb-1.5 uppercase tracking-[0.18em] text-[10px] font-semibold text-[#111111]">{t('2. Manoperă', '2. Labour')}</h2>
      <table className="w-full border border-stone-300 break-inside-avoid">
        <thead>
          <tr className="bg-stone-100 text-left">
            <th className={`${th} w-[46%]`}>{t('Meserie', 'Trade')}</th>
            <th className={`${th} text-right`}>{t('Ore', 'Hours')}</th>
            <th className={`${th} text-right`}>€/h</th>
            <th className={th} />
            <th className={`${th} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {laborRows.map((l) => (
            <tr key={l.name} className="border-t border-stone-200">
              <td className="p-2">{l.name}</td>
              <td className={num}>{l.hours.toFixed(1)}</td>
              <td className={num}>{l.rate.toFixed(2)}</td>
              <td />
              <td className={num}>{eur(l.cost)}</td>
            </tr>
          ))}
          <tr className="border-t border-stone-300 font-semibold"><td className="p-2" colSpan={4}>{t('Total manoperă', 'Labour total')}</td><td className={num}>{eur(totals.labor)}</td></tr>
        </tbody>
      </table>

      {/* Totaluri */}
      <div className="mt-6 flex items-start justify-between gap-8 break-inside-avoid">
        <div className="flex-1 text-stone-600 space-y-1">
          <p><span className="font-semibold text-[#1A1A1A]">{t('Durată estimată', 'Estimated duration')}:</span> {schedule.days} {t('zile lucrătoare', 'working days')} ({schedule.crew} {t('persoane', 'people')}, {schedule.hours.toFixed(0)} h)</p>
          {client.notes && <p className="whitespace-pre-line"><span className="font-semibold text-[#1A1A1A]">{t('Observații', 'Notes')}:</span> {client.notes}</p>}
          <p className="text-[10px]">{t('Cantitățile provin din cotele proiectului; prețurile sunt exprimate în EUR.', 'Quantities derive from the project dimensions; prices are in EUR.')}</p>
        </div>
        <table className="w-72 border border-stone-300 shrink-0">
          <tbody>
            <tr><td className="p-2">{t('Materiale', 'Materials')}</td><td className={num}>{eur(totals.materials)}</td></tr>
            <tr><td className="p-2">{t('Manoperă', 'Labour')}</td><td className={num}>{eur(totals.labor)}</td></tr>
            <tr><td className="p-2">{t('Contingență', 'Contingency')} {totals.contingencyPct}%</td><td className={num}>{eur(totals.contingency)}</td></tr>
            <tr><td className="p-2">{t('Marjă', 'Margin')} {totals.marginPct}%</td><td className={num}>{eur(totals.margin)}</td></tr>
            <tr className="border-t border-stone-300 font-semibold"><td className="p-2">{t('Total fără TVA', 'Net total')}</td><td className={num}>{eur(totals.net)}</td></tr>
            <tr><td className="p-2">{t('TVA', 'VAT')} {totals.vat}%</td><td className={num}>{eur(totals.vatAmt)}</td></tr>
            <tr className="bg-[#111111] text-white font-semibold text-xs"><td className="p-2">{t('Total cu TVA', 'Gross total')}</td><td className={num}>{eur(totals.gross)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Semnături */}
      <div className="grid grid-cols-2 gap-10 mt-12 break-inside-avoid">
        {[t('Furnizor', 'Contractor'), t('Client (acceptare ofertă)', 'Client (offer acceptance)')].map((who) => (
          <div key={who} className="border-t border-stone-400 pt-1.5 text-stone-500">{who} — {t('semnătură & ștampilă', 'signature & stamp')}</div>
        ))}
      </div>

      <footer className="mt-8 pt-3 border-t border-stone-300 text-[10px] text-stone-500 flex justify-between">
        <span>{t('Deviz generat cu SUCVAR · valori orientative, supuse confirmării pe șantier', 'Generated with SUCVAR · indicative values, subject to on-site confirmation')}</span>
        <span>SUCVAR</span>
      </footer>
    </section>
  );
}
