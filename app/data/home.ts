// app/data/home.ts
// Static content of the landing page (hero metrics, case studies, process, formulas, suppliers).

// ── Hero proof metrics ──────────────────────────────────────────────────────
// Insigne de telemetrie din hero. Valorile sunt capabilități reale ale produsului,
// nu metrici de marketing: numărul de stiluri e derivat în page.tsx din catalog.
export const HERO_STATS = [
  { value: '12', ro: 'Limbaje de design, fiecare cu materiale și lumină proprii', en: 'Design languages, each with its own materials and light' },
  { value: 'BOM', ro: 'Deviz elegant, recalculat pe loc la fiecare schimbare', en: 'An elegant estimate, recalculated instantly as you refine' },
  { value: 'PDF', ro: 'Dosare B2B rafinate: Blueprint și Material Passport', en: 'Refined B2B dossiers: Blueprint and Material Passport' },
  { value: '±4 mm', ro: 'precizie în calcul, pornind de la cotele tale', en: 'precision in every calculation, from your own dimensions' },
];

// ── Case-study imagery → /public/showcase/ ──────────────────────────────────
export interface CaseStudy {
  id: string;
  code: string;
  output: string;
  titleRo: string;
  titleEn: string;
  before: string;
  after: string;
  meta: { label: string; value: string }[];
  summaryRo: string;
  summaryEn: string;
  listTitleRo: string;
  listTitleEn: string;
  materials: { nameRo: string; nameEn: string; qty: string; std: string }[];
}
import { Cpu, FileCheck2, Ruler } from 'lucide-react';

export const CASES: CaseStudy[] = [
  {
    id: 'apartment',
    code: 'CASE 01',
    output: 'BOM · 41s',
    titleRo: 'Apartament din blocuri de beton anii ’80 → open-space Japandi cald',
    titleEn: '1980s concrete-block apartment → warm Japandi open-concept',
    before: '/showcase/room-before.jpg',
    after: '/showcase/room-after.jpg',
    meta: [
      { label: 'Scope', value: '68.4 m²' },
      { label: 'Net wall', value: '142 m²' },
      { label: 'Budget', value: 'Standard' },
    ],
    summaryRo: 'Demolarea pereților nestructurali și compartimentarea deschisă sunt calculate o singură dată; fiecare finisaj preia cotele nete, cu pierderi de tăiere incluse.',
    summaryEn: 'Non-structural demolition and the open layout are computed once; every finish inherits the net dimensions, cutting waste included.',
    listTitleRo: 'Materiale calculate (extras)',
    listTitleEn: 'Calculated materials (excerpt)',
    materials: [
      { nameRo: 'Parchet triplustratificat din stejar', nameEn: 'Engineered oak parquet', qty: '75.2 m²', std: 'Stejar · 14 mm' },
      { nameRo: 'Lamele acustice din fetru', nameEn: 'Acoustic felt slats', qty: '18.0 m²', std: 'Fetru · acustic' },
      { nameRo: 'Șină magnetică 48V', nameEn: '48V magnetic track', qty: '14.0 ml', std: 'Lumină caldă' },
    ],
  },
  {
    id: 'villa',
    code: 'CASE 02',
    output: 'BOM · 44s',
    titleRo: 'Fațadă de vilă monolit contemporană',
    titleEn: 'Contemporary monolith villa facade',
    before: '/showcase/villa-before.jpg',
    after: '/showcase/villa-after.jpg',
    meta: [
      { label: 'Scope', value: '240 m² facade' },
      { label: 'Envelope', value: 'Ventilated ceramic' },
      { label: 'Finish', value: 'Matte ceramic' },
    ],
    summaryRo: 'O fațadă ventilată din ceramică mată, ridicată peste un înveliș izolant discret. Panourile, structura și izolația se nasc din același desen al suprafeței.',
    summaryEn: 'A ventilated matte-ceramic facade over a quiet insulating envelope. Panels, structure and insulation all grow from the same drawing of the surface.',
    listTitleRo: 'Sinteză inginerească',
    listTitleEn: 'Engineering summary',
    materials: [
      { nameRo: 'Panouri ceramice pentru fațadă ventilată', nameEn: 'Ventilated ceramic panels', qty: '252 m²', std: 'Ceramică' },
      { nameRo: 'Vată minerală bazaltică', nameEn: 'Basalt mineral wool', qty: '252 m²', std: 'Bazalt · A1' },
      { nameRo: 'Substructură din aluminiu cu rupere termică', nameEn: 'Thermally-broken aluminium substructure', qty: '240 m²', std: 'Aluminiu' },
    ],
  },
];

// ── Supplier ecosystem ──────────────────────────────────────────────────────
// Deep-link URL templates: {q} is replaced with the encoded search term.
// Verify each template against the live retailer site before launch; they change.
export const SAMPLE_QUERY = 'parchet triplustratificat stejar 14 mm';
export const SAMPLE_PARAMS = ['stejar', '14 mm', 'strat uzură 3.5 mm', '+10% rezervă'];

export const SUPPLIERS = [
  { name: 'Dedeman', roleRo: 'Materiale de construcții și finisaje', roleEn: 'Construction & finishing materials', url: 'https://www.dedeman.ro/ro/cautare?q={q}' },
  { name: 'Hornbach', roleRo: 'Bricolaj, pardoseli, iluminat', roleEn: 'DIY, flooring, lighting', url: 'https://www.hornbach.ro/s/{q}' },
  { name: 'Leroy Merlin', roleRo: 'Finisaje, sanitare, electrice', roleEn: 'Finishes, plumbing, electrical', url: 'https://www.leroymerlin.ro/search/{q}' },
  { name: 'Mathaus', roleRo: 'Structură, termoizolație, fațade', roleEn: 'Structure, insulation, facades', url: 'https://www.mathaus.ro/catalogsearch/result/?q={q}' },
];

export const LOOP_STEPS = [
  {
    ro: 'SUCVAR formulează căutarea potrivită, cu dimensiunile și finisajul exact.',
    en: 'SUCVAR phrases the right search, with exact dimensions and finish.',
  },
  {
    ro: 'Fiecare linie din deviz primește un link direct către magazinul ales.',
    en: 'Each line of the estimate gets a direct link to the retailer you choose.',
  },
  {
    ro: 'Exporți devizul ca CSV direct în sistemul de cerere de ofertă al antreprenorului.',
    en: 'Export the bill as CSV straight into the contractor’s RFQ system.',
  },
];

// ── Process ─────────────────────────────────────────────────────────────────
export const STEPS = [
  {
    number: '01',
    icon: Ruler,
    titleRo: 'Geometrie parametrică a încăperii',
    titleEn: 'Parametric Room Geometry',
    descRo: 'Fotografia și cotele (L × l × H, uși, ferestre) fixează volumul: arii nete, perimetre și deschideri sunt calculate înainte de orice randare.',
    descEn: 'The photo and dimensions (W × L × H, doors, windows) fix the volume: net areas, perimeters and openings are computed before any rendering.',
    meta: 'W × L × H · ±4 mm',
  },
  {
    number: '02',
    icon: Cpu,
    titleRo: 'Sinteză neurală constrânsă de materiale',
    titleEn: 'Material-Constrained Neural Synthesis',
    descRo: 'Modelul primește structura camerei plus fișa stilului: pardoseală, pereți, accente și temperatură de culoare intră direct în prompt.',
    descEn: 'The model receives the room structure plus the style spec: flooring, walls, accents and colour temperature go straight into the prompt.',
    meta: 'IMG + SPEC → RENDER',
  },
  {
    number: '03',
    icon: FileCheck2,
    titleRo: 'Cost în timp real & export B2B',
    titleEn: 'Real-Time Cost & B2B Export',
    descRo: 'Cantitățile din geometrie, înmulțite cu factorul stilului, dau devizul la fiecare modificare. Exporți BOM ca CSV și specificația ca PDF.',
    descEn: 'Quantities from the geometry, scaled by the style factor, produce the estimate on every change. Export the BOM as CSV and the specification as PDF.',
    meta: 'BOM · CSV · PDF',
  },
];

// ── Matrice de capabilități pe planuri ──────────────────────────────────────
// Oglindește regulile reale din app/lib/plan/tiers.ts și PRICING_PLANS:
// generări nelimitate pentru Pro/Agency, portal /b2b doar pentru Agency.
// Valori: true = inclus, false = neinclus, text = valoare concretă.
export type CapabilityValue = boolean | { ro: string; en: string };
export const CAPABILITY_MATRIX: {
  ro: string;
  en: string;
  starter: CapabilityValue;
  pro: CapabilityValue;
  agency: CapabilityValue;
}[] = [
  { ro: 'Proiecte / generări Studio', en: 'Studio projects / generations', starter: { ro: '3 / lună', en: '3 / month' }, pro: { ro: 'Nelimitat', en: 'Unlimited' }, agency: { ro: 'Nelimitat', en: 'Unlimited' } },
  { ro: 'Sisteme arhitecturale cu fișă tehnică', en: 'Architectural systems with technical spec', starter: true, pro: true, agency: true },
  { ro: 'Deviz detaliat (materiale + cost)', en: 'Detailed materials & cost estimate', starter: true, pro: true, agency: true },
  { ro: 'Export PDF Blueprint', en: 'PDF Blueprint export', starter: true, pro: true, agency: true },
  { ro: 'Material Passport (PDF)', en: 'Material Passport (PDF)', starter: false, pro: true, agency: true },
  { ro: 'Arhivă de proiecte în cloud', en: 'Cloud project archive', starter: false, pro: true, agency: true },
  { ro: 'Portal B2B (/b2b)', en: 'B2B portal (/b2b)', starter: false, pro: false, agency: true },
  { ro: 'Conturi de echipă', en: 'Team seats', starter: false, pro: false, agency: { ro: '5', en: '5' } },
  { ro: 'Antet tehnic de proiectare în PDF', en: 'Engineering header in PDF', starter: false, pro: false, agency: true },
  { ro: 'Procesare prioritară', en: 'Priority processing', starter: false, pro: false, agency: true },
];

export const TIER_WORKFLOWS = {
  starter: {
    ro: 'Un singur spațiu: încarci fotografia, alegi sistemul arhitectural, primești randarea și devizul orientativ.',
    en: 'A single space: upload the photo, pick the architectural system, get the render and indicative estimate.',
  },
  pro: {
    ro: 'Arhitect sau designer independent: proiecte multiple, arhivă în cloud, Material Passport pentru clientul final.',
    en: 'Independent architect or designer: multiple projects, cloud archive, Material Passport for the end client.',
  },
  agency: {
    ro: 'Firmă de construcții sau birou de proiectare: portal B2B, echipă de 5 conturi, PDF cu antet tehnic.',
    en: 'Construction or design firm: B2B portal, 5-seat team, PDF with engineering header.',
  },
};


export const FORMULAS = [
  { labelRo: 'Arie netă pereți', labelEn: 'Net wall area', formula: 'P × H − (uși × 1.89 + ferestre × 2.10) m²' },
  { labelRo: 'Pardoseală (parchet / gresie)', labelEn: 'Flooring (parquet / tiles)', formula: 'L × l × 1.10  (+10%)' },
  { labelRo: 'Vopsea lavabilă', labelEn: 'Wall paint', formula: 'arie netă × 2 straturi ÷ 10 m²/L × 1.10' },
  { labelRo: 'Plintă', labelEn: 'Baseboard', formula: '(P − uși × 0.90) × 1.05  ml' },
  { labelRo: 'Gips-carton (tavan)', labelEn: 'Plasterboard (ceiling)', formula: 'L × l × 1.10 ÷ 3.0 m²/placă' },
  { labelRo: 'Flux luminos necesar', labelEn: 'Required luminous flux', formula: 'E(lx) × A ÷ (0.6 × 0.9)  lm' },
  { labelRo: 'Manoperă', labelEn: 'Labor', formula: 'Σ (cantitate × tarif) · tarif după buget' },
];
