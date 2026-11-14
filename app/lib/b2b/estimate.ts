// app/lib/b2b/estimate.ts
// B2B estimator: domain data, types and pure helpers (no React).


export type TradeId = 'finishes' | 'electrical' | 'drywall' | 'plumbing';
export type RegionId = 'bucharest' | 'west' | 'center' | 'southeast';

export const TRADES: { id: TradeId; ro: string; en: string; hoursPerM2: number }[] = [
  { id: 'finishes', ro: 'Finisaje', en: 'Finishes', hoursPerM2: 1.2 },
  { id: 'electrical', ro: 'Electrice', en: 'Electrical', hoursPerM2: 0.6 },
  { id: 'drywall', ro: 'Gips-carton', en: 'Drywall', hoursPerM2: 0.9 },
  { id: 'plumbing', ro: 'Sanitare', en: 'Plumbing', hoursPerM2: 0.5 },
];

// Illustrative starting rates (€/h, excl. VAT). Every rate is editable in the UI,
// so treat these as defaults to be replaced by your own price book.
export const REGIONS: { id: RegionId; ro: string; en: string; rates: Record<TradeId, number> }[] = [
  { id: 'bucharest', ro: 'București – Ilfov', en: 'Bucharest – Ilfov', rates: { finishes: 9, electrical: 12, drywall: 8.5, plumbing: 11 } },
  { id: 'west', ro: 'Vest (Cluj, Timișoara)', en: 'West (Cluj, Timișoara)', rates: { finishes: 8.5, electrical: 11, drywall: 8, plumbing: 10.5 } },
  { id: 'center', ro: 'Centru / Nord (Brașov, Iași, Suceava)', en: 'Center / North (Brașov, Iași, Suceava)', rates: { finishes: 6.5, electrical: 8.5, drywall: 6, plumbing: 8 } },
  { id: 'southeast', ro: 'Sud / Est', en: 'South / East', rates: { finishes: 6, electrical: 8, drywall: 5.5, plumbing: 7.5 } },
];

export const FINISH_LEVELS = [
  { id: 'standard', ro: 'Standard', en: 'Standard', k: 1 },
  { id: 'premium', ro: 'Premium', en: 'Premium', k: 1.25 },
  { id: 'bespoke', ro: 'La comandă', en: 'Bespoke', k: 1.5 },
];

export interface Category { id: string; ro: string; en: string }
export const CATEGORIES: Category[] = [
  { id: 'electric', ro: 'Instalații electrice', en: 'Electrical works' },
  { id: 'sanitary', ro: 'Instalații sanitare', en: 'Plumbing works' },
  { id: 'finishes', ro: 'Finisaje', en: 'Finishes' },
  { id: 'structure', ro: 'Structură & gips-carton', en: 'Structure & drywall' },
  { id: 'other', ro: 'Altele', en: 'Other' },
];

export interface Template { cat: string; ro: string; en: string; unit: string; qty: number }
export const TEMPLATES: Template[] = [
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

export interface LineItem {
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

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Deterministic money format (no Intl → identical on server and client). */
export const eur = (n: number) => {
  const [i, d] = round2(n).toFixed(2).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${d} €`;
};
export const clampNum = (v: string, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
export const xmlEsc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export const unitCode = (u: string) => (u === 'm²' ? 'MTK' : u === 'ml' ? 'MTR' : u === 'h' ? 'HUR' : 'C62');

let uidCounter = 0; // only called from event handlers, never during render
export const uid = () => `l${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export function download(filename: string, content: string, mime: string, bom = false) {
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

export interface InvoiceLine { name: string; unit: string; qty: number; unitPrice: number; total: number }
