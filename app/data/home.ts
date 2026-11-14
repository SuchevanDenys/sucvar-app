// app/data/home.ts
// Static content of the landing page (hero metrics, case studies, process, formulas, suppliers).

// ── Hero proof metrics ──────────────────────────────────────────────────────
export const HERO_STATS = [
  { value: '45s', ro: 'față de 6 ore de releveu și metraj manual', en: 'vs. 6 hours of manual survey & takeoff' },
  { value: '15,000+ m²', ro: 'simulați și calculați normativ', en: 'simulated & norm-calculated' },
  { value: '400+', ro: 'specificații mapate la standarde europene (SR EN, ISO, DIN)', en: 'specifications mapped to European Standards (SR EN, ISO, DIN)' },
  { value: '0%', ro: 'derivă de specificație între randarea AI și execuție', en: 'specification drift between AI render and execution' },
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
      { nameRo: 'Parchet triplustratificat din stejar', nameEn: 'Engineered oak parquet', qty: '75.2 m²', std: 'EN 13489' },
      { nameRo: 'Lamele acustice din fetru', nameEn: 'Acoustic felt slats', qty: '18.0 m²', std: 'EN ISO 354' },
      { nameRo: 'Șină magnetică 48V', nameEn: '48V magnetic track', qty: '14.0 ml', std: 'EN 60598' },
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
      { label: 'Fire class', value: 'Euroclass A1' },
    ],
    summaryRo: 'Fațadă ventilată din ceramică peste un înveliș termic incombustibil (Euroclass A1). Cantitățile de panouri, structură și izolație provin din același model de suprafață.',
    summaryEn: 'Ventilated ceramic cladding over a non-combustible thermal envelope (Euroclass A1). Panel, substructure and insulation quantities come from the same surface model.',
    listTitleRo: 'Sinteză inginerească',
    listTitleEn: 'Engineering summary',
    materials: [
      { nameRo: 'Panouri ceramice pentru fațadă ventilată', nameEn: 'Ventilated ceramic panels', qty: '252 m²', std: 'EN 14411' },
      { nameRo: 'Vată minerală bazaltică, clasa A1', nameEn: 'Mineral wool, Euroclass A1', qty: '252 m²', std: 'EN 13501-1' },
      { nameRo: 'Substructură din aluminiu cu rupere termică', nameEn: 'Thermally-broken aluminium substructure', qty: '240 m²', std: 'EN 1999' },
    ],
  },
];

// ── Supplier ecosystem ──────────────────────────────────────────────────────
// Deep-link URL templates: {q} is replaced with the encoded normative search term.
// Verify each template against the live retailer site before launch; they change.
export const SAMPLE_QUERY = 'parchet triplustratificat stejar 14 mm';
export const SAMPLE_PARAMS = ['EN 13489', '14 mm', 'wear layer 3.5 mm', '+10% waste'];

export const SUPPLIERS = [
  { name: 'Dedeman', roleRo: 'Materiale de construcții și finisaje', roleEn: 'Construction & finishing materials', url: 'https://www.dedeman.ro/ro/cautare?q={q}' },
  { name: 'Hornbach', roleRo: 'Bricolaj, pardoseli, iluminat', roleEn: 'DIY, flooring, lighting', url: 'https://www.hornbach.ro/s/{q}' },
  { name: 'Leroy Merlin', roleRo: 'Finisaje, sanitare, electrice', roleEn: 'Finishes, plumbing, electrical', url: 'https://www.leroymerlin.ro/search/{q}' },
  { name: 'Mathaus', roleRo: 'Structură, termoizolație, fațade', roleEn: 'Structure, insulation, facades', url: 'https://www.mathaus.ro/catalogsearch/result/?q={q}' },
];

export const LOOP_STEPS = [
  {
    ro: 'SUCVAR generează termenul de căutare normativ și parametrii tehnici exacți.',
    en: 'SUCVAR generates the normative search term and exact technical parameters.',
  },
  {
    ro: 'Fiecare linie din deviz primește un deep-link direct către magazinul ales.',
    en: 'Each bill-of-materials line gets a direct deep-link to the retailer you choose.',
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
    titleRo: 'Cotele',
    titleEn: 'Dimensions',
    descRo: 'Introduci lățimea, lungimea, înălțimea și numărul de uși și ferestre.',
    descEn: 'Enter width, length, height and the number of doors and windows.',
    meta: '±4 mm · W × L × H',
  },
  {
    number: '02',
    icon: Cpu,
    titleRo: 'Proiectul',
    titleEn: 'Design',
    descRo: 'Încarci fotografia spațiului. Structura rămâne intactă, stilul se schimbă.',
    descEn: 'Upload a photo of the space. Structure stays intact, only the style changes.',
    meta: 'IMG → RENDER',
  },
  {
    number: '03',
    icon: FileCheck2,
    titleRo: 'Specificația',
    titleEn: 'Specification',
    descRo: 'Primești devizul, cantitățile exacte și link-uri către produse.',
    descEn: 'Get the bill of materials, exact quantities and product links.',
    meta: 'BOM · CSV · PDF',
  },
];

export const NORMS = [
  'SR EN 1991-1-1', 'SR EN ISO 6946', 'C107/2005', 'P118/1999', 'SR EN 13501-1',
  'SR EN 12467', 'SR EN 14041', 'I7/2011', 'ISO 19650', 'SR EN 13986',
];

export const FORMULAS = [
  { labelRo: 'Arie netă pereți', labelEn: 'Net wall area', formula: 'P × H − (uși × 1.89 + ferestre × 2.10) m²' },
  { labelRo: 'Pardoseală (parchet / gresie)', labelEn: 'Flooring (parquet / tiles)', formula: 'L × l × 1.10  (+10%)' },
  { labelRo: 'Vopsea lavabilă', labelEn: 'Wall paint', formula: 'arie netă × 2 straturi ÷ 10 m²/L × 1.10' },
  { labelRo: 'Plintă', labelEn: 'Baseboard', formula: '(P − uși × 0.90) × 1.05  ml' },
  { labelRo: 'Gips-carton (tavan)', labelEn: 'Plasterboard (ceiling)', formula: 'L × l × 1.10 ÷ 3.0 m²/placă' },
  { labelRo: 'Flux luminos necesar', labelEn: 'Required luminous flux', formula: 'E(lx) × A ÷ (0.6 × 0.9)  lm' },
  { labelRo: 'Manoperă', labelEn: 'Labor', formula: 'Σ (cantitate × tarif) · tarif după buget' },
];
