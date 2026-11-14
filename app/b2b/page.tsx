// app/b2b/page.tsx — v4.2 Enterprise contractor workspace.
//   • Gate: unauthenticated / starter / pro → "Enterprise Restricted Module".
//     `agency` (profiles.subscription_tier) or an admin email → full dashboard.
//   • Access: useEnterpriseAccess() — 'agency' is a distinct tier; admins: NEXT_PUBLIC_ADMIN_EMAILS.
//   • Domain data + pure helpers live in app/lib/b2b/estimate.ts.
//   • Labor matrix (4 trades × regional hourly rates), crew scheduling, contingency + margin sliders.
//   • Itemised lines (templates from v3), CSV export, Factur-X (CII / EN 16931) XML export, print/PDF.
//   • Portofoliu: proiectele salvate ale contului → date client + deviz per proiect (lib/b2b/portfolio.ts),
//     cantități de material calculate din cotele proiectului, ofertă tipărită cu Înainte/După.
//   • Acces: DOAR 'agency' (sau admin cu sesiune reală) — poarta e UX; datele proiectelor sunt oricum
//     filtrate pe email-ul contului în `fetchProjectsFromDb` (și prin RLS în Supabase).
// SSR safety: no Date / Math.random during render (useClientDate for the print header).
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileCode,
  FileSpreadsheet,
  FolderOpen,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import { useEnterpriseAccess } from '@/app/lib/plan/useEnterpriseAccess';
import { usePlan } from '@/app/lib/plan/usePlan';
import { SubscriptionBadge } from '@/app/components/ui/SubscriptionCard';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { useClientDate } from '@/app/lib/useStoredValue';
import {
  TRADES,
  REGIONS,
  FINISH_LEVELS,
  CATEGORIES,
  TEMPLATES,
  round2,
  eur,
  clampNum,
  uid,
  download,
  type TradeId,
  type RegionId,
  type Template,
  type LineItem,
  type InvoiceLine,
} from '@/app/lib/b2b/estimate';
import EnterpriseGate from '@/app/components/b2b/EnterpriseGate';
import PrintDeviz, { type PrintProject } from '@/app/components/b2b/PrintDeviz';
import { buildCsv, buildFacturX } from '@/app/lib/b2b/exports';
import { fetchProjectsFromDb } from '@/app/lib/supabase/projects';
import { SPACE_MODES, getSpace, getStyle, calculateEngineering } from '@/app/data/catalog';
import type { SavedProject } from '@/app/types';
import {
  EMPTY_CLIENT,
  loadSeller,
  loadWorkspace,
  projectArea,
  saveSeller,
  saveWorkspace,
  savedWorkspaceIds,
  seedMaterials,
  seedScope,
  type ClientMeta,
} from '@/app/lib/b2b/portfolio';
import { getSkin, EYEBROW } from '@/app/lib/theme/skin';
import { LiveDot, Corners } from '@/app/components/ui/Editorial';

export default function B2BPage() {
  const { isDark, isRo } = usePrefs();
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;

  const access = useEnterpriseAccess();
  const subscription = usePlan(); // ciclu + zile rămase pentru badge-ul de abonament
  const email = access.email; // inclusiv profilurile demo (sesiune reală sau demo)

  // ── Portofoliu: proiecte salvate ale contului ───────────────────────────
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null); // emailul pentru care s-au încărcat proiectele
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  // ── Workspace state ─────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('');
  const [area, setArea] = useState(68.4);
  const [region, setRegion] = useState<RegionId>('center');
  const [level, setLevel] = useState('standard');
  const [crew, setCrew] = useState(3);
  const [rateOverride, setRateOverride] = useState<Partial<Record<TradeId, number>>>({});
  const [scope, setScope] = useState<Partial<Record<TradeId, number>>>({});
  const [contingency, setContingency] = useState(5);
  const [margin, setMargin] = useState(15);
  const [vat, setVat] = useState(21);
  const [items, setItems] = useState<LineItem[]>([]);
  const [seller, setSeller] = useState(loadSeller);
  const [client, setClient] = useState<ClientMeta>(EMPTY_CLIENT);
  const [invoiceNo, setInvoiceNo] = useState('');
  const printDate = useClientDate(); // client-only date for the printed header

  // Încarcă proiectele DOAR după ce accesul enterprise este confirmat.
  const canLoad = access.isEnterprise && !!email;
  const projectsLoading = canLoad && loadedFor !== email;
  useEffect(() => {
    if (!canLoad || !email) return;
    let alive = true;
    fetchProjectsFromDb(email)
      .then((list) => {
        if (!alive) return;
        setProjects(list);
        setSavedIds(savedWorkspaceIds());
      })
      .catch(() => undefined)
      .finally(() => alive && setLoadedFor(email));
    return () => {
      alive = false;
    };
  }, [canLoad, email]);

  // Datele firmei (furnizor) se rețin între sesiuni.
  useEffect(() => {
    saveSeller(seller);
  }, [seller]);

  // Salvare automată a devizului pentru proiectul selectat (client + parametri + linii).
  useEffect(() => {
    if (!selectedId) return;
    saveWorkspace(selectedId, {
      client, docNo: invoiceNo, area, region, level, crew, rateOverride, scope,
      contingency, margin, vat, items, updatedAt: new Date().toISOString(),
    });
  }, [selectedId, client, invoiceNo, area, region, level, crew, rateOverride, scope, contingency, margin, vat, items]);

  // ── Calculations ────────────────────────────────────────────────────────
  const regionData = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const levelK = FINISH_LEVELS.find((l) => l.id === level)?.k ?? 1;

  const labor = useMemo(() => {
    return TRADES.map((tr) => {
      const m2 = scope[tr.id] ?? area;
      const hours = m2 * tr.hoursPerM2 * levelK;
      const rate = rateOverride[tr.id] ?? regionData.rates[tr.id];
      return { ...tr, m2, hours, rate, cost: hours * rate };
    });
  }, [area, scope, levelK, rateOverride, regionData]);

  const laborTotal = labor.reduce((s, l) => s + l.cost, 0);
  const laborHours = labor.reduce((s, l) => s + l.hours, 0);
  const itemsTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of items) m[i.cat] = (m[i.cat] ?? 0) + i.qty * i.price;
    return m;
  }, [items]);

  const base = laborTotal + itemsTotal;
  const contingencyAmt = base * (contingency / 100);
  const subtotal = base + contingencyAmt;
  const marginAmt = subtotal * (margin / 100);
  const net = subtotal + marginAmt;
  const vatAmt = net * (vat / 100);
  const gross = net + vatAmt;
  const uplift = base > 0 ? net / base : 1;
  const workDays = crew > 0 ? Math.ceil(laborHours / (crew * 8)) : 0;

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  const printProject: PrintProject | null = selectedProject && {
    title: selectedProject.title,
    modeLabel: t(SPACE_MODES[selectedProject.mode].labelRo, SPACE_MODES[selectedProject.mode].labelEn),
    spaceLabel: (() => { const sp = getSpace(selectedProject.mode, selectedProject.spaceType); return t(sp.labelRo, sp.labelEn); })(),
    styleName: (() => { const st = getStyle(selectedProject.styleId); return t(st.nameRo, st.nameEn); })(),
    dims: `${selectedProject.dimensions.width} × ${selectedProject.dimensions.length} × ${selectedProject.dimensions.height} m`,
    createdAt: selectedProject.createdAt,
    originalImage: selectedProject.originalImage,
    generatedImage: selectedProject.generatedImage,
  };

  // ── Invoice lines (contingency + margin spread pro-rata over every line) ──
  const buildInvoiceLines = (): InvoiceLine[] => {
    const lines: InvoiceLine[] = [];
    for (const l of labor) {
      if (l.cost <= 0 || l.hours <= 0) continue;
      const total = round2(l.cost * uplift);
      lines.push({ name: `${isRo ? 'Manoperă' : 'Labour'} – ${isRo ? l.ro : l.en}`, unit: 'h', qty: round2(l.hours), unitPrice: round2(total / l.hours), total });
    }
    for (const i of items) {
      const cost = i.qty * i.price;
      if (cost <= 0 || i.qty <= 0) continue;
      const total = round2(cost * uplift);
      lines.push({ name: (isRo ? i.ro : i.en) || (isRo ? 'Articol' : 'Item'), unit: i.unit, qty: i.qty, unitPrice: round2(total / i.qty), total });
    }
    return lines;
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const addFromTemplate = (tpl: Template) =>
    setItems((p) => [...p, { id: uid(), cat: tpl.cat, ro: tpl.ro, en: tpl.en, unit: tpl.unit, qty: tpl.qty, price: 0 }]);
  const addBlank = (cat: string) =>
    setItems((p) => [...p, { id: uid(), cat, ro: '', en: '', unit: 'buc.', qty: 1, price: 0 }]);
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const resetAll = () => {
    setItems([]); setProjectName(''); setRateOverride({}); setScope({});
    setContingency(5); setMargin(15); setArea(68.4); setCrew(3);
    setClient(EMPTY_CLIENT); setInvoiceNo(''); setSelectedId(null);
  };

  // Alege un proiect din portofoliu: reia devizul salvat sau îl pornește din cotele proiectului.
  const selectProject = (p: SavedProject) => {
    const ws = loadWorkspace(p.id);
    setSelectedId(p.id);
    setProjectName(p.title);
    if (ws) {
      setClient({ ...EMPTY_CLIENT, ...ws.client }); setInvoiceNo(ws.docNo); setArea(ws.area);
      setRegion(ws.region); setLevel(ws.level); setCrew(ws.crew); setRateOverride(ws.rateOverride);
      setScope(ws.scope); setContingency(ws.contingency); setMargin(ws.margin); setVat(ws.vat); setItems(ws.items);
    } else {
      setClient(EMPTY_CLIENT); setInvoiceNo(''); setArea(+projectArea(p).toFixed(1) || 1);
      setRateOverride({}); setScope(seedScope(p)); setItems(seedMaterials(p));
    }
    setSavedIds((prev) => new Set(prev).add(p.id));
  };

  // Recalculează materialele din cotele proiectului (suprascrie liniile curente).
  const reseedFromProject = () => {
    if (!selectedProject) return;
    setArea(+projectArea(selectedProject).toFixed(1) || 1);
    setScope(seedScope(selectedProject));
    setItems(seedMaterials(selectedProject));
  };

  const exportCsv = () => {
    const name = `sucvar-deviz-${(projectName || 'project').replace(/\s+/g, '-').toLowerCase()}.csv`;
    download(name, buildCsv({ lines: buildInvoiceLines(), net, vat, vatAmt, gross }), 'text/csv', true);
  };

  const exportFacturX = () => {
    const xml = buildFacturX({ lines: buildInvoiceLines(), vat, invoiceNo, seller, buyer: client });
    download(`factur-x-${(invoiceNo || 'draft').replace(/\s+/g, '-')}.xml`, xml, 'application/xml');
  };

  // ── Shared classes ──────────────────────────────────────────────────────
  const field = `h-9 px-2.5 rounded-sm border text-sm w-full transition-colors ${sk.input}`;
  const numField = `${field} font-mono tabular-nums text-right`;
  const range = `w-full ${isDark ? 'accent-emerald-400' : 'accent-emerald-700'}`;
  const panel = `relative border rounded-sm ${sk.card}`;
  const panelHead = `flex items-center justify-between px-5 h-9 border-b ${sk.line} ${eyebrow}`;
  const lbl = (s: string) => <span className={`block mb-1 ${eyebrow}`}>{s}</span>;

  // ═══════════════════════════════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════════════════════════════
  if (access.isChecking) {
    return (
      <div className={`min-h-screen font-sans pb-28 ${sk.page}`}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16">
          <div className={`h-80 border rounded-sm animate-pulse ${sk.card}`} aria-busy="true" />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Gate: Enterprise Restricted Module
  // ═══════════════════════════════════════════════════════════════════════
  if (!access.isEnterprise) {
    return <EnterpriseGate isSignedIn={access.isSignedIn} planId={access.planId} />;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Enterprise dashboard
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen font-sans pb-28 transition-colors print:bg-white print:text-black print:pb-0 ${sk.page}`}>
      <Navbar />

      <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <LiveDot label={t('Enterprise activ', 'Enterprise active')} className={sk.accent} />
            <h1 className={`text-3xl font-semibold tracking-tight ${sk.strong}`}>
              {t('Spațiu de lucru pentru antreprenori', 'Contractor workspace')}
            </h1>
            {email && <p className={`font-mono text-xs ${sk.dim}`}>{email}</p>}
            <SubscriptionBadge plan={subscription} isRo={isRo} className={sk.dim} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={exportCsv} className={`inline-flex items-center gap-2 h-10 px-4 rounded-sm ${EYEBROW} cursor-pointer touch-manipulation transition-colors ${sk.btnGhost}`}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" onClick={exportFacturX} className={`inline-flex items-center gap-2 h-10 px-4 rounded-sm ${EYEBROW} font-semibold cursor-pointer touch-manipulation transition-colors ${sk.btn}`}>
              <FileCode className="w-3.5 h-3.5" /> Factur-X
            </button>
            <button type="button" onClick={() => window.print()} className={`inline-flex items-center gap-2 h-10 px-4 rounded-sm ${EYEBROW} cursor-pointer touch-manipulation transition-colors ${sk.btnGhost}`}>
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button type="button" onClick={resetAll} aria-label={t('Resetează', 'Reset')} className={`inline-flex items-center justify-center h-10 w-10 rounded-sm cursor-pointer touch-manipulation transition-colors ${sk.btnGhost}`}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT: inputs ─────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Portfolio: proiecte salvate */}
            <section className={panel}>
              <div className={panelHead}>
                <span>portfolio.projects</span>
                <span>{String(projects.length).padStart(2, '0')}</span>
              </div>
              {projectsLoading ? (
                <div className={`m-5 h-24 border rounded-sm animate-pulse ${sk.card}`} aria-busy="true" />
              ) : projects.length === 0 ? (
                <p className={`p-8 text-center text-sm ${sk.dim}`}>
                  {t('Nu ai proiecte salvate. Generează și salvează un design în Studio, apoi alege-l aici.', 'No saved projects. Generate and save a design in the Studio, then pick it here.')}
                </p>
              ) : (
                <ul className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto">
                  {projects.map((p) => {
                    const active = p.id === selectedId;
                    const sp = getSpace(p.mode, p.spaceType);
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => selectProject(p)} aria-pressed={active} className={`w-full text-left border rounded-sm overflow-hidden cursor-pointer touch-manipulation transition-colors ${active ? `${sk.accent} border-current` : sk.line} ${sk.rowHover}`}>
                          <div className={`h-24 flex items-center justify-center ${sk.cell}`}>
                            {p.generatedImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.generatedImage} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <FolderOpen className={`w-5 h-5 ${sk.dim}`} />
                            )}
                          </div>
                          <div className="p-3 space-y-1">
                            <p className={`text-sm font-medium truncate ${sk.strong}`}>{p.title}</p>
                            <p className={`font-mono text-[11px] ${sk.dim}`}>
                              {t(sp.labelRo, sp.labelEn)} · {calculateEngineering(p.dimensions, p.mode, p.spaceType).floorArea} m² · {p.createdAt.slice(0, 10)}
                            </p>
                            {savedIds.has(p.id) && <p className={`${eyebrow} ${sk.accent}`}>{t('deviz salvat', 'estimate saved')}</p>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selectedProject && (
                <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t ${sk.line}`}>
                  <p className={`text-xs ${sk.muted}`}>{t('Deviz activ:', 'Active estimate:')} <span className={sk.strong}>{selectedProject.title}</span> · {t('se salvează automat', 'autosaved')}</p>
                  <button type="button" onClick={reseedFromProject} className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm text-xs cursor-pointer touch-manipulation ${sk.btnGhost}`}>
                    <RotateCcw className="w-3 h-3" /> {t('Recalculează materialele din proiect', 'Recompute materials from project')}
                  </button>
                </div>
              )}
            </section>

            {/* Project parameters */}
            <section className={panel}>
              <div className={panelHead}><span>project.params</span></div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="col-span-2">
                  {lbl(t('Proiect', 'Project'))}
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t('ex: Vila Floreasca – etaj 1', 'e.g. Floreasca Villa – floor 1')} className={field} />
                </label>
                <label>
                  {lbl(t('Suprafață (m²)', 'Area (m²)'))}
                  <input type="number" inputMode="decimal" min={0} step="0.1" value={area} onChange={(e) => setArea(clampNum(e.target.value))} className={numField} />
                </label>
                <label>
                  {lbl(t('Echipă (persoane)', 'Crew (people)'))}
                  <input type="number" inputMode="numeric" min={1} max={50} value={crew} onChange={(e) => setCrew(clampNum(e.target.value, 1, 50))} className={numField} />
                </label>
                <label className="col-span-2">
                  {lbl(t('Regiune (tarife orare)', 'Region (hourly rates)'))}
                  <select value={region} onChange={(e) => { setRegion(e.target.value as RegionId); setRateOverride({}); }} className={field}>
                    {REGIONS.map((r) => <option key={r.id} value={r.id} className={sk.option}>{t(r.ro, r.en)}</option>)}
                  </select>
                </label>
                <label className="col-span-2">
                  {lbl(t('Nivel finisaje', 'Finish level'))}
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={field}>
                    {FINISH_LEVELS.map((l) => <option key={l.id} value={l.id} className={sk.option}>{t(l.ro, l.en)} (×{l.k})</option>)}
                  </select>
                </label>
              </div>
            </section>

            {/* Labor matrix */}
            <section className={panel}>
              <div className={panelHead}>
                <span>labor.matrix</span>
                <span>{t('tarife editabile', 'editable rates')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className={`text-left border-b ${sk.line} ${eyebrow}`}>
                      <th className="px-5 py-2.5 font-normal">{t('Meserie', 'Trade')}</th>
                      <th className="px-2 py-2.5 font-normal text-right">{t('Arie m²', 'Scope m²')}</th>
                      <th className="px-2 py-2.5 font-normal text-right">h/m²</th>
                      <th className="px-2 py-2.5 font-normal text-right">{t('Ore', 'Hours')}</th>
                      <th className="px-2 py-2.5 font-normal text-right">€/h</th>
                      <th className="px-5 py-2.5 font-normal text-right">{t('Cost', 'Cost')}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${sk.divide}`}>
                    {labor.map((l) => (
                      <tr key={l.id}>
                        <td className={`px-5 py-2.5 ${sk.strong}`}>{t(l.ro, l.en)}</td>
                        <td className="px-2 py-2.5 w-28">
                          <input type="number" min={0} step="0.1" value={scope[l.id] ?? area} onChange={(e) => setScope((p) => ({ ...p, [l.id]: clampNum(e.target.value) }))} className={numField} aria-label={`${l.en} scope`} />
                        </td>
                        <td className={`px-2 py-2.5 text-right font-mono tabular-nums ${sk.dim}`}>{(l.hoursPerM2 * levelK).toFixed(2)}</td>
                        <td className={`px-2 py-2.5 text-right font-mono tabular-nums ${sk.muted}`}>{l.hours.toFixed(1)}</td>
                        <td className="px-2 py-2.5 w-24">
                          <input type="number" min={0} step="0.5" value={l.rate} onChange={(e) => setRateOverride((p) => ({ ...p, [l.id]: clampNum(e.target.value) }))} className={numField} aria-label={`${l.en} rate`} />
                        </td>
                        <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${sk.strong}`}>{eur(l.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t ${sk.line}`}>
                      <td className={`px-5 py-3 ${eyebrow}`} colSpan={3}>{t('Total manoperă', 'Labor total')}</td>
                      <td className={`px-2 py-3 text-right font-mono tabular-nums ${sk.muted}`}>{laborHours.toFixed(1)}</td>
                      <td />
                      <td className={`px-5 py-3 text-right font-mono tabular-nums font-medium ${sk.strong}`}>{eur(laborTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className={`px-5 py-3 border-t text-[11px] leading-snug ${sk.line} ${sk.dim}`}>
                {t(
                  'Normele de timp (h/m²) și tarifele regionale sunt valori implicite orientative; înlocuiește-le cu cele din lista ta de prețuri.',
                  'Time norms (h/m²) and regional rates are indicative defaults; replace them with your own price book.',
                )}
              </p>
            </section>

            {/* Itemised lines */}
            <section className={panel}>
              <div className={panelHead}>
                <span>items.lines</span>
                <span>{String(items.length).padStart(2, '0')}</span>
              </div>
              <div className={`p-5 border-b space-y-4 ${sk.line}`}>
                <p className={eyebrow}>{t('Adaugă din șablon', 'Add from template')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((tpl) => (
                    <button key={tpl.en} type="button" onClick={() => addFromTemplate(tpl)} className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm text-xs cursor-pointer touch-manipulation transition-colors ${sk.btnGhost}`}>
                      <Plus className="w-3 h-3" /> {t(tpl.ro, tpl.en)}
                    </button>
                  ))}
                </div>
              </div>

              {items.length === 0 ? (
                <p className={`p-10 text-center text-sm ${sk.dim}`}>
                  {t('Apasă un șablon pentru a adăuga prima linie în deviz.', 'Press a template to add the first line to the estimate.')}
                </p>
              ) : (
                CATEGORIES.map((cat) => {
                  const rows = items.filter((i) => i.cat === cat.id);
                  if (rows.length === 0) return null;
                  return (
                    <div key={cat.id} className={`border-b last:border-b-0 ${sk.line}`}>
                      <div className={`flex items-center justify-between px-5 h-9 ${eyebrow} ${sk.strong}`}>
                        <span>{t(cat.ro, cat.en)}</span>
                        <span className="font-mono normal-case tracking-normal">{eur(totalByCat[cat.id] ?? 0)}</span>
                      </div>
                      <div className={`divide-y ${sk.divide}`}>
                        {rows.map((i) => (
                          <div key={i.id} className="grid grid-cols-12 gap-2 px-5 py-2.5 items-center">
                            <input type="text" value={isRo ? i.ro : i.en} onChange={(e) => updateItem(i.id, isRo ? { ro: e.target.value } : { en: e.target.value })} placeholder={t('Descriere…', 'Description…')} className={`${field} col-span-12 sm:col-span-5`} />
                            <input type="text" value={i.unit} onChange={(e) => updateItem(i.id, { unit: e.target.value })} className={`${field} col-span-3 sm:col-span-1`} aria-label="Unit" />
                            <input type="number" min={0} step="0.5" value={i.qty} onChange={(e) => updateItem(i.id, { qty: clampNum(e.target.value) })} className={`${numField} col-span-3 sm:col-span-2`} aria-label="Quantity" />
                            <input type="number" min={0} step="0.5" value={i.price === 0 ? '' : i.price} placeholder="0" onChange={(e) => updateItem(i.id, { price: clampNum(e.target.value) })} className={`${numField} col-span-4 sm:col-span-2`} aria-label="Unit price" />
                            <span className={`hidden sm:block col-span-1 text-right font-mono text-xs tabular-nums ${sk.muted}`}>{(i.qty * i.price).toFixed(0)}</span>
                            <button type="button" onClick={() => removeItem(i.id)} aria-label={t('Șterge linia', 'Delete line')} className={`col-span-2 sm:col-span-1 inline-flex h-9 items-center justify-center rounded-sm cursor-pointer touch-manipulation ${sk.dim} ${sk.rowHover}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 pb-3">
                        <button type="button" onClick={() => addBlank(cat.id)} className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm text-xs cursor-pointer touch-manipulation ${sk.btnGhost}`}>
                          <Plus className="w-3 h-3" /> {t('Linie personalizată', 'Custom line')}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Client + furnizor (apar în oferta tipărită și în Factur-X) */}
            <section className={panel}>
              <div className={panelHead}><span>client.details</span></div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label>{lbl(t('Furnizor (firma ta)', 'Seller (your company)'))}<input value={seller.name} onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))} className={field} /></label>
                <label>{lbl(t('CUI furnizor', 'Seller VAT ID'))}<input value={seller.vatId} onChange={(e) => setSeller((s) => ({ ...s, vatId: e.target.value }))} placeholder="RO12345678" className={`${field} font-mono`} /></label>
                <label>{lbl(t('Client', 'Buyer'))}<input value={client.name} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} className={field} /></label>
                <label>{lbl(t('CUI client', 'Buyer VAT ID'))}<input value={client.vatId} onChange={(e) => setClient((c) => ({ ...c, vatId: e.target.value }))} className={`${field} font-mono`} /></label>
                <label>{lbl(t('Email client', 'Client email'))}<input type="email" value={client.email} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} className={field} /></label>
                <label>{lbl(t('Telefon client', 'Client phone'))}<input type="tel" value={client.phone} onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))} className={field} /></label>
                <label>{lbl(t('Adresa clientului', 'Client address'))}<input value={client.address} onChange={(e) => setClient((c) => ({ ...c, address: e.target.value }))} className={field} /></label>
                <label>{lbl(t('Adresa șantierului', 'Site address'))}<input value={client.siteAddress} onChange={(e) => setClient((c) => ({ ...c, siteAddress: e.target.value }))} className={field} /></label>
                <label>{lbl(t('Număr document', 'Document number'))}<input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="SUC-2026-001" className={`${field} font-mono`} /></label>
                <label className="sm:col-span-2">{lbl(t('Observații / condiții (apar în ofertă)', 'Notes / terms (shown on the offer)'))}<textarea rows={2} value={client.notes} onChange={(e) => setClient((c) => ({ ...c, notes: e.target.value }))} className={`${field} h-auto py-2`} /></label>
              </div>
            </section>
          </div>

          {/* ── RIGHT: sticky pricing console ───────────────────────────── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">
            <section className={panel}>
              <Corners isDark={isDark} />
              <div className={panelHead}>
                <span>margin.console</span>
                <LiveDot label="Live" className={sk.dim} />
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={eyebrow}>{t('Marjă de profit', 'Profit margin')}</span>
                    <span className={`font-mono text-sm tabular-nums ${sk.accent}`}>{margin}%</span>
                  </div>
                  <input type="range" min={10} max={25} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className={range} aria-label="Profit margin" />
                  <div className={`flex justify-between font-mono text-[10px] ${sk.dim}`}><span>10%</span><span>25%</span></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={eyebrow}>{t('Contingență', 'Contingency')}</span>
                    <span className={`font-mono text-sm tabular-nums ${sk.accent}`}>{contingency}%</span>
                  </div>
                  <input type="range" min={0} max={15} step={1} value={contingency} onChange={(e) => setContingency(Number(e.target.value))} className={range} aria-label="Contingency" />
                  <div className={`flex justify-between font-mono text-[10px] ${sk.dim}`}><span>0%</span><span>15%</span></div>
                </div>
                <label className="block">
                  {lbl(t('TVA (%)', 'VAT (%)'))}
                  <input type="number" min={0} max={100} step="1" value={vat} onChange={(e) => setVat(clampNum(e.target.value, 0, 100))} className={numField} />
                </label>
              </div>

              <dl className={`border-t divide-y text-sm ${sk.line} ${sk.divide}`}>
                {[
                  [t('Manoperă', 'Labor'), laborTotal],
                  [t('Linii articole', 'Item lines'), itemsTotal],
                  [`${t('Contingență', 'Contingency')} ${contingency}%`, contingencyAmt],
                  [`${t('Marjă', 'Margin')} ${margin}%`, marginAmt],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center justify-between px-5 py-2.5">
                    <dt className={sk.muted}>{k}</dt>
                    <dd className={`font-mono tabular-nums ${sk.strong}`}>{eur(v as number)}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className={eyebrow}>{t('Total fără TVA', 'Net total')}</dt>
                  <dd className={`font-mono tabular-nums text-lg font-medium ${sk.strong}`}>{eur(net)}</dd>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <dt className={sk.muted}>{t('TVA', 'VAT')} {vat}%</dt>
                  <dd className={`font-mono tabular-nums ${sk.muted}`}>{eur(vatAmt)}</dd>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className={eyebrow}>{t('Total cu TVA', 'Gross total')}</dt>
                  <dd className={`font-mono tabular-nums text-xl font-medium ${sk.accent}`}>{eur(gross)}</dd>
                </div>
              </dl>
            </section>

            <section className={panel}>
              <div className={panelHead}><span>schedule.est</span></div>
              <div className="p-5 flex items-end justify-between">
                <div>
                  <p className={`font-mono text-3xl tabular-nums tracking-tight ${sk.strong}`}>{workDays}</p>
                  <p className={`mt-1 text-xs ${sk.dim}`}>{t('zile lucrătoare', 'working days')} · {crew} {t('persoane', 'people')} · 8 h</p>
                </div>
                <p className={`font-mono text-xs tabular-nums ${sk.muted}`}>{laborHours.toFixed(0)} h</p>
              </div>
            </section>

            <p className={`text-[11px] leading-snug ${sk.dim}`}>
              {t(
                'Factur-X: exportul generează XML-ul CII (EN 16931) pentru a fi încorporat într-un PDF/A-3 de sistemul tău de facturare. Pentru facturile B2B din România, e-Factura (RO CIUS) rămâne canalul oficial.',
                'Factur-X: the export generates the CII (EN 16931) XML, to be embedded in a PDF/A-3 by your invoicing system. For Romanian B2B invoices, e-Factura (RO CIUS) remains the official channel.',
              )}
            </p>
          </aside>
        </div>
      </div>

      {/* ══ PRINT ONLY ═══════════════════════════════════════════════════ */}
      <PrintDeviz
        isRo={isRo}
        docNo={invoiceNo}
        printDate={printDate}
        project={printProject}
        projectName={projectName}
        seller={seller}
        client={client}
        labor={labor.map((l) => ({ name: t(l.ro, l.en), hours: l.hours, rate: l.rate, cost: l.cost }))}
        items={items}
        totals={{ labor: laborTotal, materials: itemsTotal, contingency: contingencyAmt, contingencyPct: contingency, margin: marginAmt, marginPct: margin, net, vat, vatAmt, gross }}
        schedule={{ days: workDays, crew, hours: laborHours }}
      />
    </div>
  );
}