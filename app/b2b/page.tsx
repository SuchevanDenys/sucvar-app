// app/b2b/page.tsx
// Modul B2B / Antreprenori — SUCVAR
// Deviz tehnic granular pentru șantier: prize, întrerupătoare, cabluri, sanitare etc.
// Utilizatorul setează propriile prețuri unitare și obține totalul instantaneu.
"use client";

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, Printer, Download } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import { getUi } from '@/app/lib/theme';
import { Language, ThemeMode } from '@/app/types/studio';

// ── Tipuri ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  categoryId: string;
  descriptionRo: string;
  descriptionEn: string;
  unit: string;
  quantity: number;
  unitPrice: number;   // €, setat de utilizator
}

interface Category {
  id: string;
  labelRo: string;
  labelEn: string;
  color: string;       // culoare accent pentru titlul categoriei (Tailwind text-)
}

// ── Categorii fixe ────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'electric',  labelRo: 'Instalații electrice',   labelEn: 'Electrical works',      color: 'text-amber-600' },
  { id: 'sanitary',  labelRo: 'Instalații sanitare',    labelEn: 'Plumbing works',         color: 'text-sky-600' },
  { id: 'finishes',  labelRo: 'Finisaje manoperă',      labelEn: 'Finishing labour',       color: 'text-[#3B4D43]' },
  { id: 'structure', labelRo: 'Structură & gips-carton', labelEn: 'Structure & drywall',   color: 'text-stone-500' },
  { id: 'other',     labelRo: 'Altele',                 labelEn: 'Other',                  color: 'text-stone-400' },
];

// ── Template-uri predefinite ───────────────────────────────────────────────────
// Utilizatorul le poate adăuga dintr-un click; prețul unitare este 0 până îl completează.

interface Template {
  categoryId: string;
  descriptionRo: string;
  descriptionEn: string;
  unit: string;
  defaultQty: number;
}

const TEMPLATES: Template[] = [
  // Electrice
  { categoryId: 'electric', descriptionRo: 'Priză dublă aparentă/îngropată 16A', descriptionEn: 'Double socket outlet 16A', unit: 'buc.', defaultQty: 10 },
  { categoryId: 'electric', descriptionRo: 'Întrerupător simplu 10A', descriptionEn: 'Single switch 10A', unit: 'buc.', defaultQty: 6 },
  { categoryId: 'electric', descriptionRo: 'Întrerupător dublu (cap scară) 10A', descriptionEn: 'Double two-way switch 10A', unit: 'buc.', defaultQty: 2 },
  { categoryId: 'electric', descriptionRo: 'Cablu electric NYM-J 3×2.5 mm²', descriptionEn: 'Cable NYM-J 3×2.5 mm²', unit: 'ml', defaultQty: 80 },
  { categoryId: 'electric', descriptionRo: 'Cablu electric NYM-J 3×1.5 mm²', descriptionEn: 'Cable NYM-J 3×1.5 mm²', unit: 'ml', defaultQty: 50 },
  { categoryId: 'electric', descriptionRo: 'Tub PVC Ø20 mm (protecție cablu)', descriptionEn: 'PVC conduit Ø20 mm', unit: 'ml', defaultQty: 60 },
  { categoryId: 'electric', descriptionRo: 'Tablou electric echipat (sigurante + disjunctor general)', descriptionEn: 'Equipped consumer unit (breakers + main switch)', unit: 'buc.', defaultQty: 1 },
  { categoryId: 'electric', descriptionRo: 'Spot LED încastrat 9W 3000K', descriptionEn: 'Recessed LED spot 9W 3000K', unit: 'buc.', defaultQty: 8 },

  // Sanitare
  { categoryId: 'sanitary', descriptionRo: 'Punct de apă rece/caldă (apometru, valve)', descriptionEn: 'Water connection point (meter, valves)', unit: 'punct', defaultQty: 4 },
  { categoryId: 'sanitary', descriptionRo: 'Punct de scurgere DN 40/50', descriptionEn: 'Drainage point DN 40/50', unit: 'punct', defaultQty: 3 },
  { categoryId: 'sanitary', descriptionRo: 'Țeavă PPR Ø20 mm (alimentare)', descriptionEn: 'PPR pipe Ø20 mm (supply)', unit: 'ml', defaultQty: 25 },
  { categoryId: 'sanitary', descriptionRo: 'Țeavă PVC Ø110 mm (canalizare)', descriptionEn: 'PVC pipe Ø110 mm (drainage)', unit: 'ml', defaultQty: 6 },
  { categoryId: 'sanitary', descriptionRo: 'Vas WC suspendat cu rezervor încastrat', descriptionEn: 'Wall-hung WC with concealed cistern', unit: 'buc.', defaultQty: 1 },
  { categoryId: 'sanitary', descriptionRo: 'Lavoar ceramică + baterie monocomandă', descriptionEn: 'Ceramic basin + single-lever tap', unit: 'buc.', defaultQty: 1 },
  { categoryId: 'sanitary', descriptionRo: 'Cabină duș + baterie termostatată', descriptionEn: 'Shower cabin + thermostatic valve', unit: 'buc.', defaultQty: 1 },

  // Finisaje manoperă
  { categoryId: 'finishes', descriptionRo: 'Montaj parchet triplustratificat', descriptionEn: 'Engineered parquet installation', unit: 'm²', defaultQty: 20 },
  { categoryId: 'finishes', descriptionRo: 'Vopsit pereți (2 straturi + grunduire)', descriptionEn: 'Wall painting (2 coats + primer)', unit: 'm²', defaultQty: 60 },
  { categoryId: 'finishes', descriptionRo: 'Placare gresie / faianță', descriptionEn: 'Floor/wall tiling', unit: 'm²', defaultQty: 15 },
  { categoryId: 'finishes', descriptionRo: 'Montaj ușă interioară + tocul aferent', descriptionEn: 'Interior door installation + frame', unit: 'buc.', defaultQty: 3 },

  // Structură
  { categoryId: 'structure', descriptionRo: 'Execuție tavan suspendat gips-carton', descriptionEn: 'Suspended GK ceiling installation', unit: 'm²', defaultQty: 20 },
  { categoryId: 'structure', descriptionRo: 'Perete gips-carton simplu (1 strat/față)', descriptionEn: 'Single-layer GK partition wall', unit: 'm²', defaultQty: 12 },
  { categoryId: 'structure', descriptionRo: 'Șapă autonivelantă 40 mm', descriptionEn: 'Self-levelling screed 40 mm', unit: 'm²', defaultQty: 20 },
];

// ── Helper UID simplu ─────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Componenta principală ─────────────────────────────────────────────────────

export default function B2BPage() {
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [items, setItems] = useState<LineItem[]>([]);
  const [projectName, setProjectName] = useState('');

  const isDark = theme === 'dark';
  const ui = getUi(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);

  // ── Calcule ────────────────────────────────────────────────────────────────

  const totalByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.categoryId] = (map[item.categoryId] ?? 0) + item.quantity * item.unitPrice;
    }
    return map;
  }, [items]);

  const grandTotal = Object.values(totalByCategory).reduce((a, b) => a + b, 0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const addFromTemplate = (tpl: Template) => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        categoryId: tpl.categoryId,
        descriptionRo: tpl.descriptionRo,
        descriptionEn: tpl.descriptionEn,
        unit: tpl.unit,
        quantity: tpl.defaultQty,
        unitPrice: 0,
      },
    ]);
  };

  const addBlankLine = (categoryId: string) => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        categoryId,
        descriptionRo: '',
        descriptionEn: '',
        unit: 'buc.',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const resetAll = () => { setItems([]); setProjectName(''); };

  const handleExport = () => window.print();

  // ── Clase ─────────────────────────────────────────────────────────────────
  const eyebrow = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;
  const fieldCls = `h-9 px-2 rounded-md border bg-transparent text-sm outline-none transition-colors w-full ${ui.input}`;
  const numFieldCls = `h-9 px-2 rounded-md border bg-transparent text-sm font-mono outline-none transition-colors text-right w-full ${ui.input}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen font-sans pb-28 transition-colors print:bg-white print:text-black print:pb-0 ${ui.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      {/* ══ WORKSPACE ════════════════════════════════════════════════════════ */}
      <div className="print:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className={eyebrow}>B2B · {t('Modul Antreprenori', 'Contractor Module')}</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">
              {t('Deviz tehnic de șantier', 'Site technical estimate')}
            </h1>
            <p className={`text-sm mt-2 max-w-xl ${ui.muted}`}>
              {t(
                'Adaugă articolele din șablon sau creează linii proprii. Setează prețul tău unitar pentru fiecare element — totalul se calculează instant.',
                'Add items from templates or create custom lines. Set your own unit price for each element — the total updates instantly.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleExport} className={`inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btn}`}>
              <Printer className="w-4 h-4" /> PDF
            </button>
            <button type="button" onClick={resetAll} className={`inline-flex items-center gap-2 h-10 px-4 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}>
              <RotateCcw className="w-3.5 h-3.5" /> {t('Resetează', 'Reset')}
            </button>
          </div>
        </div>

        {/* Nume proiect */}
        <div className="max-w-sm">
          <label className="space-y-1 block">
            <span className={`text-[11px] ${ui.muted}`}>{t('Numele proiectului', 'Project name')}</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('ex: Vila Floreasca – etaj 1', 'e.g. Floreasca Villa – floor 1')}
              className={`h-11 px-3 rounded-md border bg-transparent text-sm outline-none transition-colors w-full ${ui.input}`}
            />
          </label>
        </div>

        {/* ── ȘABLOANE ────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <p className={eyebrow}>{t('Adaugă din șablon', 'Add from template')}</p>
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const catTemplates = TEMPLATES.filter((tpl) => tpl.categoryId === cat.id);
              if (catTemplates.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${cat.color}`}>
                    {t(cat.labelRo, cat.labelEn)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catTemplates.map((tpl) => (
                      <button
                        key={tpl.descriptionRo}
                        type="button"
                        onClick={() => addFromTemplate(tpl)}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs cursor-pointer touch-manipulation transition-colors ${ui.btnGhost}`}
                      >
                        <Plus className="w-3 h-3" />
                        {t(tpl.descriptionRo, tpl.descriptionEn)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── TABELUL DEVIZULUI ────────────────────────────────────────────── */}
        {items.length > 0 && (
          <section className="space-y-8">
            <p className={eyebrow}>{t('Deviz curent', 'Current estimate')}</p>

            {CATEGORIES.map((cat) => {
              const catItems = items.filter((i) => i.categoryId === cat.id);
              if (catItems.length === 0) return null;
              const catTotal = totalByCategory[cat.id] ?? 0;

              return (
                <div key={cat.id} className={`border rounded-md overflow-hidden ${ui.card} ${ui.line}`}>
                  {/* Header categorie */}
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${ui.soft} ${ui.line}`}>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${cat.color}`}>
                      {t(cat.labelRo, cat.labelEn)}
                    </p>
                    <span className={`text-sm font-semibold font-mono ${ui.muted}`}>
                      {catTotal.toFixed(2)} €
                    </span>
                  </div>

                  {/* Header coloane */}
                  <div className={`hidden sm:grid grid-cols-12 gap-2 px-4 py-2 border-b text-[10px] uppercase tracking-widest ${ui.muted} ${ui.line}`}>
                    <span className="col-span-5">{t('Descriere', 'Description')}</span>
                    <span className="col-span-2">{t('U.M.', 'Unit')}</span>
                    <span className="col-span-2 text-right">{t('Cant.', 'Qty')}</span>
                    <span className="col-span-2 text-right">{t('Preț unitar (€)', 'Unit price (€)')}</span>
                    <span className="col-span-1 text-right">{t('Total', 'Total')}</span>
                  </div>

                  {/* Linii */}
                  <div className={`divide-y ${ui.line}`}>
                    {catItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                        {/* Descriere */}
                        <div className="col-span-12 sm:col-span-5">
                          <input
                            type="text"
                            value={lang === 'ro' ? item.descriptionRo : item.descriptionEn}
                            onChange={(e) =>
                              updateItem(item.id, lang === 'ro'
                                ? { descriptionRo: e.target.value }
                                : { descriptionEn: e.target.value })
                            }
                            placeholder={t('Descriere articol…', 'Item description…')}
                            className={fieldCls}
                          />
                        </div>
                        {/* U.M. */}
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                            className={fieldCls}
                            aria-label={t('Unitate de măsură', 'Unit of measure')}
                          />
                        </div>
                        {/* Cantitate */}
                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.5"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
                            className={numFieldCls}
                            aria-label={t('Cantitate', 'Quantity')}
                          />
                        </div>
                        {/* Preț unitar */}
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.5"
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            placeholder="0"
                            onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                            className={numFieldCls}
                            aria-label={t('Preț unitar', 'Unit price')}
                          />
                        </div>
                        {/* Total linie */}
                        <div className="col-span-1 text-right">
                          <span className="text-sm font-mono font-semibold">
                            {(item.quantity * item.unitPrice).toFixed(0)} €
                          </span>
                        </div>
                        {/* Șterge */}
                        <div className="hidden sm:flex justify-end col-span-12 sm:col-span-1 sm:justify-end -mt-1 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={t('Șterge linia', 'Delete line')}
                            className={`p-1.5 rounded-md transition-colors touch-manipulation ${ui.btnGhost} border-0 opacity-60 hover:opacity-100`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Adaugă linie goală */}
                  <div className={`px-4 py-2 border-t ${ui.line}`}>
                    <button
                      type="button"
                      onClick={() => addBlankLine(cat.id)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs cursor-pointer touch-manipulation transition-colors ${ui.btnGhost}`}
                    >
                      <Plus className="w-3 h-3" />
                      {t('Adaugă linie personalizată', 'Add custom line')}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ── TOTAL GENERAL ─────────────────────────────────────────────── */}
            <div className={`border rounded-md p-6 ${ui.card} ${ui.line}`}>
              <div className="space-y-2">
                {CATEGORIES.filter((c) => (totalByCategory[c.id] ?? 0) > 0).map((cat) => (
                  <div key={cat.id} className="flex justify-between text-sm">
                    <span className={ui.muted}>{t(cat.labelRo, cat.labelEn)}</span>
                    <span className="font-mono">{(totalByCategory[cat.id] ?? 0).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className={`mt-4 pt-4 border-t flex justify-between items-center ${ui.line}`}>
                <span className="text-xs uppercase tracking-widest font-semibold">
                  {t('Total deviz (fără TVA)', 'Total estimate (excl. VAT)')}
                </span>
                <span className="text-2xl font-semibold font-mono">{grandTotal.toFixed(2)} €</span>
              </div>
              <div className={`mt-2 flex justify-between items-center`}>
                <span className={`text-xs uppercase tracking-widest ${ui.muted}`}>
                  {t('TVA 19%', 'VAT 19%')}
                </span>
                <span className={`font-mono text-sm ${ui.muted}`}>
                  {(grandTotal * 0.19).toFixed(2)} €
                </span>
              </div>
              <div className={`mt-2 flex justify-between items-center font-semibold`}>
                <span className="text-xs uppercase tracking-widest">
                  {t('Total cu TVA', 'Total incl. VAT')}
                </span>
                <span className="text-xl font-mono">{(grandTotal * 1.19).toFixed(2)} €</span>
              </div>
              <p className={`text-[11px] mt-4 ${ui.muted}`}>
                {t(
                  'Devizul nu include materiale de construcție. Prețurile unitare sunt setate de utilizator și nu reflectă prețurile de piață SUCVAR.',
                  'Estimate covers labour only. Unit prices are set by the user and do not reflect SUCVAR market pricing.',
                )}
              </p>
            </div>
          </section>
        )}

        {/* Stare goală */}
        {items.length === 0 && (
          <div className={`border border-dashed rounded-md p-16 flex flex-col items-center gap-4 ${ui.card} ${ui.muted}`}>
            <Download className="w-8 h-8 opacity-40" />
            <p className="text-sm text-center max-w-xs">
              {t(
                'Apasă un șablon de mai sus pentru a adăuga primul articol în deviz.',
                'Press a template above to add the first item to the estimate.',
              )}
            </p>
          </div>
        )}
      </div>

      {/* ══ PRINT ONLY ═══════════════════════════════════════════════════════ */}
      <section className="hidden print:block bg-white text-[#1A1A1A] p-10">
        <header className="flex items-center justify-between border-b border-stone-300 pb-5">
          <SucvarLogo size={36} withWordmark />
          <div className="text-right">
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">
              SUCVAR · Deviz tehnic B2B
            </p>
            {projectName && <p className="text-xs font-semibold mt-0.5">{projectName}</p>}
            <p className="text-xs mt-0.5">{new Date().toLocaleDateString('ro-RO')}</p>
          </div>
        </header>

        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.categoryId === cat.id);
          if (catItems.length === 0) return null;
          return (
            <div key={cat.id} className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] mb-2">
                {lang === 'ro' ? cat.labelRo : cat.labelEn}
              </h2>
              <table className="w-full text-xs border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-left">
                    <th className="p-2 w-1/2">Descriere</th>
                    <th className="p-2">U.M.</th>
                    <th className="p-2 text-right">Cant.</th>
                    <th className="p-2 text-right">Preț unitar (€)</th>
                    <th className="p-2 text-right">Total (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item) => (
                    <tr key={item.id} className="border-b border-stone-200">
                      <td className="p-2">{lang === 'ro' ? item.descriptionRo : item.descriptionEn}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2 font-mono text-right">{item.quantity}</td>
                      <td className="p-2 font-mono text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="p-2 font-mono text-right">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-stone-50">
                    <td className="p-2" colSpan={4}>{lang === 'ro' ? 'Subtotal' : 'Subtotal'}</td>
                    <td className="p-2 font-mono text-right">{(totalByCategory[cat.id] ?? 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        <table className="w-full text-xs border border-stone-300 mt-8">
          <tbody>
            {CATEGORIES.filter((c) => (totalByCategory[c.id] ?? 0) > 0).map((cat) => (
              <tr key={cat.id} className="border-b border-stone-200">
                <td className="p-2">{lang === 'ro' ? cat.labelRo : cat.labelEn}</td>
                <td className="p-2 font-mono text-right">{(totalByCategory[cat.id] ?? 0).toFixed(2)} €</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="p-2">Total fără TVA</td>
              <td className="p-2 font-mono text-right">{grandTotal.toFixed(2)} €</td>
            </tr>
            <tr>
              <td className="p-2">TVA 19%</td>
              <td className="p-2 font-mono text-right">{(grandTotal * 0.19).toFixed(2)} €</td>
            </tr>
            <tr className="font-semibold bg-stone-100">
              <td className="p-2">Total cu TVA</td>
              <td className="p-2 font-mono text-right">{(grandTotal * 1.19).toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>

        <footer className="mt-10 pt-5 border-t border-stone-300 text-xs flex justify-between">
          <span>Deviz generat de SUCVAR · suchevandenys.com</span>
          <span>Signed: Lead Systems Architect — Suchevan Denys</span>
        </footer>
      </section>
    </div>
  );
}
