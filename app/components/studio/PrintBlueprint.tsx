// app/components/studio/PrintBlueprint.tsx
// Print-only "Blueprint & Material Passport" (visible only with window.print()).
import React from 'react';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import type { SpecItem } from '@/app/data/catalog';
import type { CostEstimate, Language, RoomDimensions } from '@/app/types';

interface PrintBlueprintProps {
  lang: Language;
  issueDate: string;
  projectName: string;
  modeLabel: string;
  spaceLabel: string;
  styleName: string;
  roomDimensions: RoomDimensions;
  generatedImage: string | null;
  specRows: { label: string; value: string }[];
  selectedItems: SpecItem[];
  cost: CostEstimate;
}

export default function PrintBlueprint({
  lang,
  issueDate,
  projectName,
  modeLabel,
  spaceLabel,
  styleName,
  roomDimensions,
  generatedImage,
  specRows,
  selectedItems,
  cost,
}: PrintBlueprintProps) {
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  return (
    <section className="hidden print:block bg-white text-[#1A1A1A] p-10">
      <header className="flex items-center justify-between border-b border-stone-300 pb-5">
        <SucvarLogo size={40} withWordmark />
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            SUCVAR SPATIAL Blueprint &amp; Material Passport
          </p>
          <p className="text-xs mt-1">{issueDate}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-6 mt-6 text-xs">
        <div className="space-y-1">
          <p><strong>{t('Proiect', 'Project')}:</strong> {projectName}</p>
          <p><strong>{t('Categorie', 'Category')}:</strong> {modeLabel}</p>
          <p><strong>{t('Spațiu', 'Space')}:</strong> {spaceLabel}</p>
          <p><strong>{t('Stil', 'Style')}:</strong> {styleName}</p>
          <p>
            <strong>{t('Cote', 'Dimensions')}:</strong>{' '}
            {roomDimensions.width} × {roomDimensions.length} × {roomDimensions.height} m ·{' '}
            {roomDimensions.doorsCount} {t('uși', 'doors')} · {roomDimensions.windowsCount} {t('ferestre', 'windows')}
          </p>
        </div>
        {generatedImage && (
          <img src={generatedImage} alt="Design" className="w-full h-40 object-cover rounded-sm" />
        )}
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mt-8 mb-2">
        {t('Specificații inginerești', 'Engineering specifications')}
      </h2>
      <table className="w-full text-xs border border-stone-300">
        <tbody>
          {specRows.map((row) => (
            <tr key={row.label} className="border-b border-stone-200">
              <td className="p-2">{row.label}</td>
              <td className="p-2 font-mono text-right">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mt-8 mb-2">
        {t('Estimare cost orientativă', 'Indicative cost estimate')}
      </h2>
      <table className="w-full text-xs border border-stone-300">
        <tbody>
          {cost.lines.map((line) => (
            <tr key={line.id} className="border-b border-stone-200">
              <td className="p-2">{t(line.labelRo, line.labelEn)}</td>
              <td className="p-2 font-mono text-stone-500">{t(line.formulaRo, line.formulaEn)}</td>
              <td className="p-2 font-mono text-right">{line.total.toLocaleString('ro-RO')} €</td>
            </tr>
          ))}
          <tr className="bg-stone-100 font-semibold">
            <td className="p-2">{t('Total estimat', 'Estimated total')}</td>
            <td className="p-2 font-mono">{cost.perSqm.toLocaleString('ro-RO')} €/m²</td>
            <td className="p-2 font-mono text-right">{cost.total.toLocaleString('ro-RO')} €</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] mt-8 mb-2">
        {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
      </h2>
      <table className="w-full text-xs border border-stone-300">
        <thead>
          <tr className="bg-stone-100 text-left">
            <th className="p-2">{t('Articol', 'Item')}</th>
            <th className="p-2">{t('Parametri tehnici', 'Technical parameters')}</th>
            <th className="p-2">{t('Cantitate', 'Quantity')}</th>
            <th className="p-2">{t('Cuvinte cheie căutare', 'Search keywords')}</th>
          </tr>
        </thead>
        <tbody>
          {selectedItems.map((item) => (
            <tr key={item.id} className="border-b border-stone-200">
              <td className="p-2 font-medium">{lang === 'ro' ? item.nameRo : item.nameEn}</td>
              <td className="p-2 leading-snug">{lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}</td>
              <td className="p-2 font-mono whitespace-nowrap">{item.quantity}</td>
              <td className="p-2 font-mono text-[10px] text-stone-500">
                {lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[10px] mt-3">
        {t(
          'Parametrii tehnici sunt orientativi și servesc la identificarea produselor. Solicită fișe de produs furnizorilor înainte de achiziție.',
          'Technical parameters are indicative and serve for product identification. Request product data sheets from suppliers before purchase.',
        )}
      </p>

      <footer className="mt-12 pt-5 border-t border-stone-300 text-xs flex justify-between">
        <span>Signed virtually: Lead Systems Architect: Suchevan Denys</span>
        <span>SUCVAR · Spatial &amp; Engineering Systems</span>
      </footer>
    </section>
  );
}
