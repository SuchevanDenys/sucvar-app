// app/b2b/page.tsx — v4.2 Enterprise contractor workspace.
//   • Gate: unauthenticated / starter / pro → "Enterprise Restricted Module".
//     `agency` (profiles.subscription_tier) or an admin email → full dashboard.
//   • v4.2: access is resolved from resolvePlan() (reads the DB tier directly), so 'agency'
//     unlocks the page even if usePlan() collapses it to 'pro'. Admins: NEXT_PUBLIC_ADMIN_EMAILS.
//   • Labor matrix (4 trades × regional hourly rates), crew scheduling, contingency + margin sliders.
//   • Itemised lines (templates from v3), CSV export, Factur-X (CII / EN 16931) XML export, print/PDF.
// SSR safety: no Date / Math.random during render. Dates are set in effects or click handlers.
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  Calculator,
  FileCode,
  FileSpreadsheet,
  FileText,
  Lock,
  Percent,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import { usePlan } from '@/app/lib/usePlan';
import { PLAN_EVENT, isAdminEmail, resolvePlan } from '@/app/lib/plan';
import { getSessionEmail } from '@/app/lib/supabase';
import { getSkin, EYEBROW, LiveDot, Corners } from '@/app/lib/skin';
import { Language, ThemeMode } from '@/app/types/studio';

// ═════════════════════════════════════════════════════════════════════════════
// Access control
// ═════════════════════════════════════════════════════════════════════════════

/** Shape we read from usePlan(). Everything beyond isLoading is optional on purpose,
 *  so this compiles whichever fields your hook exposes. */
interface PlanShape {
  isLoading: boolean;
  isSignedIn?: boolean;
  isPro?: boolean;
  isAgency?: boolean;
  isBusiness?: boolean;
  plan?: unknown;
  planId?: unknown;
  tier?: unknown;
}

/** Accepts a string, or an object carrying `tier` / `plan` / `planId`. */
const asPlanId = (v: unknown): string => {
  if (typeof v === 'string') return v.trim().toLowerCase();
  if (v && typeof v === 'object') {
    const o = v as { tier?: unknown; plan?: unknown; planId?: unknown };
    return asPlanId(o.tier) || asPlanId(o.plan) || asPlanId(o.planId);
  }
  return '';
};

const isAgencyId = (id: string) => id === 'agency' || id === 'enterprise' || id === 'business';

/** Resolves whether the current session may use the Enterprise workspace.
 *  The DB tier (via resolvePlan) is authoritative: it is looked up whenever the hook
 *  does not already say 'agency'. Secure default: anything unknown is NOT enterprise. */
function useEnterpriseAccess() {
  const p = usePlan() as unknown as PlanShape;
  const declared = asPlanId(p.tier) || asPlanId(p.plan) || asPlanId(p.planId);
  const hookSaysAgency = p.isAgency === true || p.isBusiness === true || isAgencyId(declared);

  const [resolved, setResolved] = useState<{ id: string; email: string | null } | null>(null);
  const [tick, setTick] = useState(0);

  // Re-check when the plan changes elsewhere (checkout, webhook refresh, sign-in/out)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(PLAN_EVENT, bump);
    return () => window.removeEventListener(PLAN_EVENT, bump);
  }, []);

  useEffect(() => {
    if (p.isLoading || !p.isSignedIn || hookSaysAgency) return;
    let alive = true;
    resolvePlan()
      .then((r) => alive && setResolved({ id: asPlanId(r.tier), email: r.email }))
      .catch(() => alive && setResolved({ id: '', email: null }));
    return () => {
      alive = false;
    };
  }, [p.isLoading, p.isSignedIn, hookSaysAgency, tick]);

  const needsLookup = !!p.isSignedIn && !hookSaysAgency && resolved === null;
  const resolvedAgency = resolved !== null && isAgencyId(resolved.id);
  const isAdmin = !!p.isSignedIn && isAdminEmail(resolved?.email);
  const isEnterprise = hookSaysAgency || resolvedAgency || isAdmin;
  const planId = isEnterprise
    ? 'agency'
    : resolved?.id || declared || (p.isPro ? 'pro' : 'starter');

  return {
    isChecking: p.isLoading || needsLookup,
    isSignedIn: !!p.isSignedIn,
    planId,
    isEnterprise,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Domain data
// ═════════════════════════════════════════════════════════════════════════════

type TradeId = 'finishes' | 'electrical' | 'drywall' | 'plumbing';
type RegionId = 'bucharest' | 'west' | 'center' | 'southeast';

const TRADES: { id: TradeId; ro: string; en: string; hoursPerM2: number }[] = [
  { id: 'finishes', ro: 'Finisaje', en: 'Finishes', hoursPerM2: 1.2 },
  { id: 'electrical', ro: 'Electrice', en: 'Electrical', hoursPerM2: 0.6 },
  { id: 'drywall', ro: 'Gips-carton', en: 'Drywall', hoursPerM2: 0.9 },
  { id: 'plumbing', ro: 'Sanitare', en: 'Plumbing', hoursPerM2: 0.5 },
];

// Illustrative starting rates (€/h, excl. VAT). Every rate is editable in the UI,
// so treat these as defaults to be replaced by your own price book.
const REGIONS: { id: RegionId; ro: string; en: string; rates: Record<TradeId, number> }[] = [
  { id: 'bucharest', ro: 'București – Ilfov', en: 'Bucharest – Ilfov', rates: { finishes: 9, electrical: 12, drywall: 8.5, plumbing: 11 } },
  { id: 'west', ro: 'Vest (Cluj, Timișoara)', en: 'West (Cluj, Timișoara)', rates: { finishes: 8.5, electrical: 11, drywall: 8, plumbing: 10.5 } },
  { id: 'center', ro: 'Centru / Nord (Brașov, Iași, Suceava)', en: 'Center / North (Brașov, Iași, Suceava)', rates: { finishes: 6.5, electrical: 8.5, drywall: 6, plumbing: 8 } },
  { id: 'southeast', ro: 'Sud / Est', en: 'South / East', rates: { finishes: 6, electrical: 8, drywall: 5.5, plumbing: 7.5 } },
];

const FINISH_LEVELS = [
  { id: 'standard', ro: 'Standard', en: 'Standard', k: 1 },
  { id: 'premium', ro: 'Premium', en: 'Premium', k: 1.25 },
  { id: 'bespoke', ro: 'La comandă', en: 'Bespoke', k: 1.5 },
];

interface Category { id: string; ro: string; en: string }
const CATEGORIES: Category[] = [
  { id: 'electric', ro: 'Instalații electrice', en: 'Electrical works' },
  { id: 'sanitary', ro: 'Instalații sanitare', en: 'Plumbing works' },
  { id: 'finishes', ro: 'Finisaje', en: 'Finishes' },
  { id: 'structure', ro: 'Structură & gips-carton', en: 'Structure & drywall' },
  { id: 'other', ro: 'Altele', en: 'Other' },
];

interface Template { cat: string; ro: string; en: string; unit: string; qty: number }
const TEMPLATES: Template[] = [
  { cat: 'electric', ro: 'Priză dublă 16A', en: 'Double socket 16A', unit: 'buc.', qty: 10 },
  { cat: 'electric', ro: 'Întrerupător simplu 10A', en: 'Single switch 10A', unit: 'buc.', qty: 6 },
  { cat: 'electric', ro: 'Cablu NYM-J 3×2.5 mm²', en: 'Cable NYM-J 3×2.5 mm²', unit: 'ml', qty: 80 },
  { cat: 'electric', ro: 'Tablou electric echipat', en: 'Equipped consumer unit', unit: 'buc.', qty: 1 },
  { cat: 'electric', ro: 'Spot LED încastrat 9W', en: 'Recessed LED spot 9W', unit: 'buc.', qty: 8 },
  { cat: 'sanitary', ro: 'Punct apă rece/caldă', en: 'Water connection point', unit: 'punct', qty: 4 },
  { cat: 'sanitary', ro: 'Țeavă PPR Ø20 mm', en: 'PPR pipe Ø20 mm', unit: 'ml', qty: 25 },
  { cat: 'sanitary', ro: 'Vas WC suspendat + rezervor încastrat', en: 'Wall-hung WC + concealed cistern', unit: 'buc.', qty: 1 },
  { cat: 'finishes', ro: 'Montaj parchet triplustratificat', en: 'Engineered parquet installation', unit: 'm²', qty: 20 },
  { cat: 'finishes', ro: 'Vopsit pereți (2 straturi + grund)', en: 'Wall painting (2 coats + primer)', unit: 'm²', qty: 60 },
  { cat: 'finishes', ro: 'Placare gresie / faianță', en: 'Floor/wall tiling', unit: 'm²', qty: 15 },
  { cat: 'structure', ro: 'Tavan suspendat gips-carton', en: 'Suspended GK ceiling', unit: 'm²', qty: 20 },
  { cat: 'structure', ro: 'Perete gips-carton simplu', en: 'Single-layer GK partition', unit: 'm²', qty: 12 },
  { cat: 'structure', ro: 'Șapă autonivelantă 40 mm', en: 'Self-levelling screed 40 mm', unit: 'm²', qty: 20 },
];

interface LineItem {
  id: string;
  cat: string;
  ro: string;
  en: string;
  unit: string;
  qty: number;
  price: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Deterministic money format (no Intl → identical on server and client). */
const eur = (n: number) => {
  const [i, d] = round2(n).toFixed(2).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${d} €`;
};
const clampNum = (v: string, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const unitCode = (u: string) => (u === 'm²' ? 'MTK' : u === 'ml' ? 'MTR' : u === 'h' ? 'HUR' : 'C62');

let uidCounter = 0; // only called from event handlers, never during render
const uid = () => `l${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

function download(filename: string, content: string, mime: string, bom = false) {
  const blob = new Blob([bom ? '\uFEFF' + content : content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface InvoiceLine { name: string; unit: string; qty: number; unitPrice: number; total: number }

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════

export default function B2BPage() {
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const isDark = theme === 'dark';
  const isRo = lang === 'ro';
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (isRo ? ro : en);
  const eyebrow = `${EYEBROW} ${sk.dim}`;

  const access = useEnterpriseAccess();
  const [email, setEmail] = useState<string | null>(null);

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
  const [seller, setSeller] = useState({ name: '', vatId: '' });
  const [buyer, setBuyer] = useState({ name: '', vatId: '' });
  const [invoiceNo, setInvoiceNo] = useState('');
  const [printDate, setPrintDate] = useState('');

  useEffect(() => {
    let alive = true;
    getSessionEmail()
      .then((e) => alive && setEmail(e ?? null))
      .catch(() => undefined);
    // Client-only date for the printed header (keeps SSR output date-free)
    setPrintDate(new Date().toISOString().slice(0, 10));
    return () => {
      alive = false;
    };
  }, []);

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
  };

  const exportCsv = () => {
    const lines = buildInvoiceLines();
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [
      ['No', 'Description', 'UM', 'Qty', 'Unit price (EUR, excl. VAT)', 'Total (EUR, excl. VAT)'].map(q).join(';'),
      ...lines.map((l, i) => [i + 1, q(l.name), q(l.unit), l.qty, l.unitPrice.toFixed(2), l.total.toFixed(2)].join(';')),
      '',
      [q('Net total'), '', '', '', '', net.toFixed(2)].join(';'),
      [q(`VAT ${vat}%`), '', '', '', '', vatAmt.toFixed(2)].join(';'),
      [q('Gross total'), '', '', '', '', gross.toFixed(2)].join(';'),
    ];
    download(`sucvar-deviz-${(projectName || 'project').replace(/\s+/g, '-').toLowerCase()}.csv`, rows.join('\r\n'), 'text/csv', true);
  };

  const exportFacturX = () => {
    const lines = buildInvoiceLines();
    const lineSum = round2(lines.reduce((s, l) => s + l.total, 0));
    const tax = round2(lineSum * (vat / 100));
    const total = round2(lineSum + tax);
    const issue = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // click handler → client only
    const party = (tag: string, p: { name: string; vatId: string }) => `
      <ram:${tag}>
        <ram:Name>${xmlEsc(p.name || 'N/A')}</ram:Name>
        <ram:PostalTradeAddress><ram:CountryID>RO</ram:CountryID></ram:PostalTradeAddress>${
          p.vatId ? `\n        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEsc(p.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''
        }
      </ram:${tag}>`;
    const lineXml = lines
      .map(
        (l, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${xmlEsc(l.name)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${l.unitPrice.toFixed(2)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(l.unit)}">${l.qty}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${vat.toFixed(2)}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${l.total.toFixed(2)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`,
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${xmlEsc(invoiceNo || 'DRAFT')}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issue}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>${party('SellerTradeParty', seller)}${party('BuyerTradeParty', buyer)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${tax.toFixed(2)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${lineSum.toFixed(2)}</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${vat.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${lineSum.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${lineSum.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${tax.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
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
        <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
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
    const features = [
      { icon: Calculator, ro: 'Matrici de cost manoperă', en: 'Labor cost matrices', dRo: 'Finisaje, electrice, gips-carton și sanitare, cu tarife orare regionale.', dEn: 'Finishes, electrical, drywall and plumbing with regional hourly rates.' },
      { icon: CalendarRange, ro: 'Planificare echipe', en: 'Team scheduling', dRo: 'Durata în zile lucrătoare, în funcție de mărimea echipei.', dEn: 'Duration in working days based on crew size.' },
      { icon: Percent, ro: 'Marje și contingență', en: 'Contractor margins', dRo: 'Marjă de profit 10–25% și rezervă de risc, aplicate pe fiecare linie.', dEn: '10–25% profit margin and risk contingency, applied to every line.' },
      { icon: FileText, ro: 'Export Factur-X', en: 'Factur-X export', dRo: 'Deviz în CSV și XML Factur-X (EN 16931), gata pentru facturare.', dEn: 'Deviz as CSV and Factur-X XML (EN 16931), ready for invoicing.' },
    ];
    const ctaHref = access.isSignedIn ? '/checkout?plan=agency' : '/login';
    return (
      <div className={`min-h-screen font-sans pb-28 transition-colors ${sk.page}`}>
        <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
        <div className="relative">
          <div className={`pointer-events-none absolute inset-0 ${sk.grid} [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]`} />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16">
            <div className={`${panel}`}>
              <Corners isDark={isDark} />
              <div className={panelHead}>
                <span>b2b.enterprise // restricted</span>
                <LiveDot label={t('Modul blocat', 'Module locked')} active={false} className={sk.dim} />
              </div>

              <div className="p-6 sm:p-10 space-y-8">
                <div className="space-y-4 max-w-xl">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-sm border ${sk.line} ${sk.accent}`}>
                    <Lock className="w-4 h-4" />
                  </span>
                  <h1 className={`text-3xl font-semibold tracking-tight ${sk.strong}`}>
                    {t('Modul restricționat Enterprise', 'Enterprise restricted module')}
                  </h1>
                  <p className={`text-sm leading-relaxed ${sk.muted}`}>
                    {t(
                      'Spațiul de lucru pentru antreprenori este inclus doar în planul Enterprise B2B.',
                      'The contractor workspace is included only in the Enterprise B2B plan.',
                    )}
                  </p>
                </div>

                {/* Telemetry */}
                <dl className={`grid grid-cols-1 sm:grid-cols-3 gap-px border rounded-sm overflow-hidden ${sk.line} ${sk.gap}`}>
                  {[
                    { k: t('Sesiune', 'Session'), v: access.isSignedIn ? t('Autentificat', 'Authenticated') : t('Neautentificat', 'Not signed in') },
                    { k: t('Plan curent', 'Current plan'), v: access.isSignedIn ? access.planId : '—' },
                    { k: t('Plan necesar', 'Required plan'), v: 'agency (enterprise)' },
                  ].map((r) => (
                    <div key={r.k} className={`p-4 ${sk.cell}`}>
                      <dt className={eyebrow}>{r.k}</dt>
                      <dd className={`mt-1.5 font-mono text-sm ${sk.strong}`}>{r.v}</dd>
                    </div>
                  ))}
                </dl>

                {/* Feature breakdown */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-px border rounded-sm overflow-hidden ${sk.line} ${sk.gap}`}>
                  {features.map((f) => (
                    <div key={f.en} className={`p-5 flex gap-4 ${sk.cell}`}>
                      <f.icon className={`w-4 h-4 mt-0.5 shrink-0 ${sk.accent}`} />
                      <div>
                        <p className={`text-sm font-medium tracking-tight ${sk.strong}`}>{t(f.ro, f.en)}</p>
                        <p className={`mt-1 text-xs leading-relaxed ${sk.dim}`}>{t(f.dRo, f.dEn)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={ctaHref}
                    className={`inline-flex items-center gap-2 h-10 px-5 rounded-sm ${EYEBROW} font-semibold transition-colors touch-manipulation ${sk.btn}`}
                  >
                    {access.isSignedIn ? t('Upgrade la Enterprise B2B', 'Upgrade to Enterprise B2B') : t('Autentifică-te pentru upgrade', 'Sign in to upgrade')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/#pricing"
                    className={`inline-flex items-center h-10 px-5 rounded-sm ${EYEBROW} transition-colors touch-manipulation ${sk.btnGhost}`}
                  >
                    {t('Compară planurile', 'Compare plans')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Enterprise dashboard
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen font-sans pb-28 transition-colors print:bg-white print:text-black print:pb-0 ${sk.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <LiveDot label={t('Enterprise activ', 'Enterprise active')} className={sk.accent} />
            <h1 className={`text-3xl font-semibold tracking-tight ${sk.strong}`}>
              {t('Spațiu de lucru pentru antreprenori', 'Contractor workspace')}
            </h1>
            {email && <p className={`font-mono text-xs ${sk.dim}`}>{email}</p>}
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

            {/* Invoice parties */}
            <section className={panel}>
              <div className={panelHead}><span>factur-x.parties</span></div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label>{lbl(t('Furnizor (firma ta)', 'Seller (your company)'))}<input value={seller.name} onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))} className={field} /></label>
                <label>{lbl(t('CUI furnizor', 'Seller VAT ID'))}<input value={seller.vatId} onChange={(e) => setSeller((s) => ({ ...s, vatId: e.target.value }))} placeholder="RO12345678" className={`${field} font-mono`} /></label>
                <label>{lbl(t('Client', 'Buyer'))}<input value={buyer.name} onChange={(e) => setBuyer((s) => ({ ...s, name: e.target.value }))} className={field} /></label>
                <label>{lbl(t('CUI client', 'Buyer VAT ID'))}<input value={buyer.vatId} onChange={(e) => setBuyer((s) => ({ ...s, vatId: e.target.value }))} className={`${field} font-mono`} /></label>
                <label>{lbl(t('Număr document', 'Document number'))}<input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="SUC-2026-001" className={`${field} font-mono`} /></label>
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
            {buildInvoiceLines().map((l, i) => (
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
    </div>
  );
}