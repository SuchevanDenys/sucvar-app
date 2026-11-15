// app/lib/procurement.ts — motorul „Listă Materiale & Furnizori" (Bill of Materials).
// Modul PUR (fără React, fără acces la server): același cod rulează în ruta /api/analyze-materials
// și, ca rezervă, în browser pentru profilurile demo fără sesiune Supabase.
//
// DE CE LINK-URI DE CĂUTARE + CANTITĂȚI DETERMINISTE, ȘI NU SCRAPING:
//   • Magazinele (Dedeman, Leroy Merlin, Hornbach, IKEA) nu oferă un API public de prețuri/stoc;
//     scraping-ul le încalcă termenii, se strică la fiecare redesign al paginii, e blocat de
//     anti-bot și ar pune pe serverul nostru o dependență fragilă de site-uri terțe.
//   • Un link de căutare cu interogarea corect codificată (encodeURIComponent) nu se strică niciodată:
//     utilizatorul vede prețul și stocul REAL, direct la sursă, iar noi nu afișăm date inventate.
//   • Cantitățile NU se „ghicesc": derivă din geometria camerei (aceleași formule ca
//     `calculateEngineering`: arii, perimetre, pierderi +10% la pardoseală), deci același proiect
//     dă mereu aceeași listă — verificabilă într-o lucrare de licență și reproductibilă la testare.
//   • Prețurile sunt ORIENTATIVE (tarife medii de raft, scalate după buget și stil); nu sunt prețuri live.
//   • Stilul ales (fișa tehnică din `styleSpecs.ts`) și scenariile bifate (chips) aleg *ce* se caută;
//     geometria alege *cât*.
import { SPACE_MODES, calculateEngineering, getScope, getSpace, getStyle } from '@/app/data/catalog';
import type { DesignMode, RoomDimensions } from '@/app/types';

export type RetailerId = 'dedeman' | 'leroy' | 'hornbach' | 'ikea';
/** Categoria de aprovizionare: decide ce magazine apar primele. */
export type ProcCategory = 'construction' | 'furniture' | 'lighting' | 'outdoor';
export type BomUnit = 'm²' | 'ml' | 'buc.';

export interface RetailerLink {
  retailer: RetailerId;
  label: string;
  url: string;
}

export interface BomItem {
  /** Stabil între rulări (`proc-…`): sincronizarea cu devizul B2B înlocuiește, nu duplică. */
  id: string;
  /** Id-ul categoriei din devizul B2B (`CATEGORIES` din app/lib/b2b/estimate.ts) */
  cat: string;
  procCategory: ProcCategory;
  titleRo: string;
  titleEn: string;
  specRo: string;
  specEn: string;
  qty: number;
  unit: BomUnit;
  unitPrice: number; // € fără TVA, orientativ
  total: number; // € = qty × unitPrice
  query: string;
  links: RetailerLink[];
}

export interface BomInput {
  mode: DesignMode;
  spaceType: string;
  styleId: string;
  dimensions: RoomDimensions;
}

export interface BomResult {
  items: BomItem[];
  total: number;
  currency: 'EUR';
}

// ── Linkuri către magazine ────────────────────────────────────────────────────

const RETAILERS: Record<RetailerId, { label: string; build: (q: string) => string }> = {
  dedeman: { label: 'Dedeman', build: (q) => `https://www.dedeman.ro/ro/catalogsearch/result/?q=${q}` },
  leroy: { label: 'Leroy Merlin', build: (q) => `https://www.leroymerlin.ro/search?q=${q}` },
  hornbach: { label: 'Hornbach', build: (q) => `https://www.hornbach.ro/s/${q}` },
  ikea: { label: 'IKEA', build: (q) => `https://www.ikea.com/ro/ro/search/?q=${q}` },
};

// Ordinea de prioritate per categorie: construcții/finisaje → bricolaj primul, IKEA nu apare;
// mobilier/iluminat → IKEA primul; exterior/grădină → Hornbach (specializat) primul.
const RETAILER_PRIORITY: Record<ProcCategory, RetailerId[]> = {
  construction: ['dedeman', 'leroy', 'hornbach'],
  furniture: ['ikea', 'dedeman', 'leroy'],
  lighting: ['ikea', 'leroy', 'dedeman'],
  outdoor: ['hornbach', 'dedeman', 'leroy'],
};

/** Linkuri de căutare cu interogarea codificată; maximum 3 magazine, cele relevante primele. */
export function buildRetailerLinks(query: string, category: ProcCategory): RetailerLink[] {
  // trim + limită de lungime: interogarea ajunge în URL-uri, deci nu lăsăm șiruri uriașe
  const q = encodeURIComponent(query.trim().slice(0, 120));
  return RETAILER_PRIORITY[category].map((id) => ({ retailer: id, label: RETAILERS[id].label, url: RETAILERS[id].build(q) }));
}

// ── Prețuri orientative de raft (€ fără TVA, buget „standard") ────────────────

const BUDGET_K = { economy: 0.8, standard: 1, luxury: 1.6 } as const;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const up1 = (n: number) => Math.ceil(n * 10 - 1e-9) / 10; // rotunjire în sus la 0,1 (nu cumpărăm „mai puțin")

// Ce se caută pentru pardoseală / pereți, per stil (textul afișat vine din fișa stilului)
const STYLE_QUERY: Record<string, { floor: string; wall: string }> = {
  scandinavian: { floor: 'parchet stejar uleiat', wall: 'vopsea lavabila alb cald' },
  modern: { floor: 'parchet laminat stejar gri', wall: 'vopsea lavabila alba mata' },
  contemporary: { floor: 'parchet triplustratificat nuc', wall: 'vopsea lavabila gri' },
  minimalist: { floor: 'gresie portelanata beton 80x80', wall: 'vopsea lavabila alba' },
  minimalist_obsidian: { floor: 'gresie portelanata neagra mata', wall: 'vopsea lavabila antracit' },
  japandi: { floor: 'parchet stejar natural periat', wall: 'vopsea lavabila bej' },
  traditional: { floor: 'parchet masiv stejar', wall: 'vopsea lavabila crem' },
  mid_century_modern: { floor: 'parchet nuc triplustratificat', wall: 'vopsea lavabila verde salvie' },
  coastal: { floor: 'parchet stejar albit', wall: 'vopsea lavabila albastru deschis' },
  industrial: { floor: 'gresie aspect beton', wall: 'vopsea lavabila gri beton' },
  brutalist_concrete: { floor: 'gresie portelanata beton', wall: 'amorsa decorativa aspect beton' },
  biophilic: { floor: 'parchet stejar natural', wall: 'vopsea lavabila verde' },
};

interface Draft {
  key: string;
  cat: string;
  procCategory: ProcCategory;
  titleRo: string;
  titleEn: string;
  specRo: string;
  specEn: string;
  qty: number;
  unit: BomUnit;
  /** preț de bază per unitate la buget „standard" */
  basePrice: number;
  /** aplică și multiplicatorul de cost al stilului (finisaje / mobilier) */
  withStyle: boolean;
  query: string;
}

// Mobilier / dotări principale per tip de spațiu: [titluRo, titluEn, specRo, specEn, qty, preț, interogare]
type Kit = [string, string, string, string, number, number, string];
const SPACE_KIT: Record<string, Kit[]> = {
  'living room': [
    ['Canapea 3 locuri tapițată', '3-seat upholstered sofa', 'Structură lemn masiv, spumă HR', 'Solid-wood frame, HR foam', 1, 520, 'canapea 3 locuri'],
    ['Măsuță de cafea + comodă TV', 'Coffee table + TV unit', 'MDF furniruit, 140–180 cm', 'Veneered MDF, 140–180 cm', 1, 260, 'comoda tv living'],
  ],
  kitchen: [
    ['Corpuri bucătărie (baze + suspendate)', 'Kitchen cabinetry (base + wall)', 'MDF melaminat, balamale amortizate', 'Melamine MDF, soft-close hinges', 0, 240, 'corpuri bucatarie'],
    ['Blat de lucru postformat 38 mm', 'Post-formed worktop 38 mm', 'PAL laminat HPL, rezistent la umezeală', 'HPL laminate chipboard, moisture-resistant', 0, 55, 'blat bucatarie'],
  ],
  'master bedroom': [
    ['Pat 160×200 cu somieră', 'Bed 160×200 with slatted base', 'Cadru lemn, tăblie tapițată', 'Wood frame, upholstered headboard', 1, 480, 'pat 160x200'],
    ['Dulap cu uși glisante', 'Sliding-door wardrobe', 'Structură PAL 18 mm, oglindă', 'Chipboard 18 mm carcass, mirror', 1, 420, 'dulap dormitor usi glisante'],
  ],
  bathroom: [
    ['Set sanitar suspendat (vas WC + lavoar)', 'Wall-hung sanitary set (WC + basin)', 'Porțelan sanitar, rezervor încastrat', 'Vitreous china, concealed cistern', 1, 390, 'vas wc suspendat rezervor incastrat'],
    ['Cabină de duș + baterie termostatică', 'Shower enclosure + thermostatic mixer', 'Sticlă securizată 8 mm', '8 mm tempered glass', 1, 340, 'cabina dus sticla securizata'],
  ],
  'home office': [
    ['Birou 140×70 cm', 'Desk 140×70 cm', 'Blat 25 mm, reglaj cabluri', '25 mm top, cable management', 1, 220, 'birou 140x70'],
    ['Scaun ergonomic', 'Ergonomic chair', 'Suport lombar, înălțime reglabilă', 'Lumbar support, height-adjustable', 1, 190, 'scaun birou ergonomic'],
  ],
  entryway: [
    ['Pantofar cu bancă', 'Shoe cabinet with bench', 'PAL melaminat, 100 cm', 'Melamine chipboard, 100 cm', 1, 160, 'pantofar cu banca'],
    ['Cuier + oglindă hol', 'Coat rack + hall mirror', 'Metal vopsit, oglindă 80 cm', 'Painted metal, 80 cm mirror', 1, 90, 'oglinda hol cuier'],
  ],
  'attic loft': [
    ['Canapea / pat de zi', 'Sofa / day bed', 'Structură lemn, înălțime joasă', 'Wood frame, low profile', 1, 450, 'canapea extensibila'],
    ['Rafturi sub înclinare', 'Under-slope shelving', 'PAL 18 mm, la comandă', 'Made-to-measure 18 mm chipboard', 1, 280, 'raft mansarda'],
  ],
  'walk-in closet': [
    ['Sistem dressing modular', 'Modular dressing system', 'Montanți + rafturi + bare', 'Uprights + shelves + rails', 1, 650, 'sistem dressing modular'],
    ['Comodă cu sertare', 'Chest of drawers', 'Sertare cu amortizare', 'Soft-close drawers', 1, 210, 'comoda sertare'],
  ],
  'commercial cafe': [
    ['Mese de cafenea (set 4)', 'Cafe tables (set of 4)', 'Blat HPL, picior metalic', 'HPL top, metal base', 1, 380, 'masa cafenea'],
    ['Scaune HoReCa (set 8)', 'Commercial chairs (set of 8)', 'Stivuibile, rezistente la uz intens', 'Stackable, heavy-duty', 1, 480, 'scaun cafenea horeca'],
  ],
};

const OUTDOOR_KIT: Kit[] = [
  ['Set mobilier exterior (masă + 4 scaune)', 'Outdoor furniture set (table + 4 chairs)', 'Aluminiu / ratan sintetic, rezistent UV', 'Aluminium / synthetic rattan, UV-resistant', 1, 420, 'set mobilier gradina'],
  ['Jardinieră / ghivece mari', 'Large planters', 'Beton sau polipropilenă, Ø40–60 cm', 'Concrete or polypropylene, Ø40–60 cm', 2, 70, 'ghivece mari exterior'],
];

// Spații umede: gresie + faianță în loc de parchet + vopsea integrală
const WET_SPACES = new Set(['bathroom', 'kitchen']);

export function buildBom(input: BomInput): BomResult {
  const { mode, spaceType, styleId, dimensions: dims } = input;
  const space = getSpace(mode, spaceType);
  const style = getStyle(styleId);
  const scope = getScope(dims.scope);
  const f = scope.factors;
  const eng = calculateEngineering(dims, mode, space.id);
  const kelvin = style.lightingSpec.kelvin;
  const sq = STYLE_QUERY[style.id] ?? { floor: 'parchet laminat', wall: 'vopsea lavabila alba' };
  // Cât din suprafață se refinisează (Refresh = parțial). Peste 1 (La Roșu) rămâne 1: aceeași arie, mai multă manoperă.
  const share = (k: number) => Math.min(Math.max(k, 0), 1);
  const perimeter = (Math.max(dims.width, 0) + Math.max(dims.length, 0)) * 2;
  const wet = mode === 'interiors' && WET_SPACES.has(space.id);

  const drafts: Draft[] = [];
  const add = (d: Draft) => drafts.push(d);

  if (eng.floorArea > 0 && mode === 'interiors') {
    if (scope.id === 'shell') {
      add({ key: 'screed', cat: 'structure', procCategory: 'construction', titleRo: 'Șapă autonivelantă 40 mm', titleEn: 'Self-levelling screed 40 mm', specRo: 'Mortar ciment, ~2 kg/m²/mm; strat nou pe structură brută', specEn: 'Cement mortar, ~2 kg/m²/mm; new layer on raw structure', qty: up1(eng.floorArea), unit: 'm²', basePrice: 9, withStyle: false, query: 'sapa autonivelanta' });
    }
    // 1. Pardoseală (+10% pierderi, din calculateEngineering)
    if (share(f.floor) > 0) {
      add(wet
        ? { key: 'floor', cat: 'finishes', procCategory: 'construction', titleRo: 'Gresie porțelanată 60×60 cm', titleEn: 'Porcelain floor tile 60×60 cm', specRo: 'Antiderapantă R10, rectificată; include 10% pierderi', specEn: 'Anti-slip R10, rectified; incl. 10% waste', qty: up1(eng.flooringWithWaste * share(f.floor)), unit: 'm²', basePrice: 24, withStyle: true, query: 'gresie portelanata 60x60 antiderapanta' }
        : { key: 'floor', cat: 'finishes', procCategory: 'construction', titleRo: style.materials.flooring.ro, titleEn: style.materials.flooring.en, specRo: 'Include 10% pierderi la tăiere; adeziv / folie suport separat', specEn: 'Incl. 10% cutting waste; underlay / adhesive separate', qty: up1(eng.flooringWithWaste * share(f.floor)), unit: 'm²', basePrice: 28, withStyle: true, query: sq.floor });
    }
    // 2. Finisaj pereți
    if (share(f.walls) > 0) {
      if (wet) {
        const tiled = eng.netWallArea * (space.id === 'bathroom' ? 0.65 : 0.25) * share(f.walls);
        add({ key: 'walltile', cat: 'finishes', procCategory: 'construction', titleRo: 'Faianță 30×60 cm', titleEn: 'Wall tile 30×60 cm', specRo: space.id === 'bathroom' ? 'Zonă duș + lavoar; hidroizolație și adeziv flexibil separat' : 'Backsplash și zona de lucru; include 10% pierderi', specEn: space.id === 'bathroom' ? 'Shower + basin zone; waterproofing and flexible adhesive separate' : 'Backsplash and work zone; incl. 10% waste', qty: up1(tiled * 1.1), unit: 'm²', basePrice: 20, withStyle: true, query: 'faianta 30x60' });
        add({ key: 'paint', cat: 'finishes', procCategory: 'construction', titleRo: 'Vopsea lavabilă pentru spații umede', titleEn: 'Moisture-resistant washable paint', specRo: 'Zonele netăiate cu faianță; 2 straturi + grund', specEn: 'Non-tiled areas; 2 coats + primer', qty: up1(Math.max(eng.netWallArea * share(f.walls) - tiled, 0) + eng.floorArea), unit: 'm²', basePrice: 4.5, withStyle: false, query: 'vopsea lavabila anti mucegai baie' });
      } else {
        add({ key: 'paint', cat: 'finishes', procCategory: 'construction', titleRo: style.materials.walls.ro, titleEn: style.materials.walls.en, specRo: `Aprox. ${eng.paintLiters} L (2 straturi) + grund; arie netă fără goluri`, specEn: `About ${eng.paintLiters} L (2 coats) + primer; net area excl. openings`, qty: up1(eng.netWallArea * share(f.walls)), unit: 'm²', basePrice: 4.5, withStyle: true, query: sq.wall });
      }
    }
    // 3. Plintă
    if (share(f.baseboard) > 0 && eng.baseboardMeters > 0) {
      add({ key: 'base', cat: 'finishes', procCategory: 'construction', titleRo: 'Plintă MDF 80 mm', titleEn: 'MDF baseboard 80 mm', specRo: 'Perimetru minus uși, +5% rezervă', specEn: 'Perimeter minus doors, +5% reserve', qty: up1(eng.baseboardMeters * share(f.baseboard)), unit: 'ml', basePrice: 4, withStyle: false, query: 'plinta mdf 80 mm' });
    }
    // 4. Tavan suspendat
    if (share(f.ceiling) > 0 && eng.plasterboardSheets > 0) {
      add({ key: 'ceiling', cat: 'structure', procCategory: 'construction', titleRo: 'Gips-carton 12,5 mm + profile CD/UD', titleEn: 'Plasterboard 12.5 mm + CD/UD profiles', specRo: `${eng.plasterboardSheets} plăci 1,2×2,5 m, +10% pierderi; sistem de suspendare inclus`, specEn: `${eng.plasterboardSheets} sheets 1.2×2.5 m, +10% waste; hanger system included`, qty: up1(eng.floorArea * 1.1 * share(f.ceiling)), unit: 'm²', basePrice: 11, withStyle: false, query: 'placa gips carton 12.5 mm' });
    }
    // 5. Iluminat liniar la temperatura stilului
    if (share(f.light) > 0 && perimeter > 0) {
      add({ key: 'led', cat: 'electric', procCategory: 'lighting', titleRo: `Bandă LED ${kelvin}K cu profil aluminiu încastrat`, titleEn: `${kelvin}K LED strip with recessed aluminium profile`, specRo: 'IP20, 12 W/m, difuzor opal; sursă de alimentare separat', specEn: 'IP20, 12 W/m, opal diffuser; power supply separate', qty: up1(perimeter * share(f.light)), unit: 'ml', basePrice: 14, withStyle: true, query: `banda led ${kelvin}k profil aluminiu` });
    }
    // 6. Spoturi: număr din metoda lumenului
    if (share(f.light) > 0 && eng.lightFixtures > 0) {
      add({ key: 'spots', cat: 'electric', procCategory: 'lighting', titleRo: `Spot LED încastrat ${kelvin}K`, titleEn: `Recessed LED downlight ${kelvin}K`, specRo: `${eng.targetLux} lx țintă → ${eng.requiredLumens} lm total (metoda lumenului)`, specEn: `${eng.targetLux} lx target → ${eng.requiredLumens} lm total (lumen method)`, qty: Math.max(1, Math.ceil(eng.lightFixtures * share(f.light))), unit: 'buc.', basePrice: 12, withStyle: true, query: `spot led incastrat ${kelvin}k` });
    }
    // 7–8. Mobilier / dotări
    const kit = SPACE_KIT[space.id] ?? [];
    kit.forEach((k, i) => {
      // Bucătăria: lungimea corpurilor din perimetru (aprox. 55% din perimetru e ocupat de linii de corpuri)
      const kitchenMl = up1(Math.max(perimeter * 0.27, 1));
      const qty = space.id === 'kitchen' ? kitchenMl : k[4];
      add({ key: `kit${i}`, cat: 'other', procCategory: 'furniture', titleRo: k[0], titleEn: k[1], specRo: space.id === 'kitchen' && i === 0 ? `${k[2]}; ~${qty} ml de linie` : k[2], specEn: space.id === 'kitchen' && i === 0 ? `${k[3]}; ~${qty} ml run` : k[3], qty, unit: space.id === 'kitchen' ? 'ml' : 'buc.', basePrice: k[5], withStyle: true, query: k[6] });
    });
  } else if (eng.floorArea > 0 && mode === 'exteriors') {
    const facade = space.costBasis === 'facade';
    if (facade && share(f.envelope) > 0) {
      add({ key: 'etics', cat: 'finishes', procCategory: 'construction', titleRo: 'Polistiren expandat EPS 100 – 10 cm', titleEn: 'EPS 100 insulation – 10 cm', specRo: 'Termosistem; dibluri, plasă și adeziv separat; +5% pierderi', specEn: 'ETICS; fixings, mesh and adhesive separate; +5% waste', qty: up1(eng.netWallArea * share(f.envelope) * 1.05), unit: 'm²', basePrice: 9, withStyle: false, query: 'polistiren expandat eps 100 10 cm' });
      add({ key: 'render', cat: 'finishes', procCategory: 'construction', titleRo: style.materials.walls.ro, titleEn: style.materials.walls.en, specRo: 'Tencuială decorativă siliconică + amorsă', specEn: 'Silicone decorative render + primer', qty: up1(eng.netWallArea * share(f.envelope)), unit: 'm²', basePrice: 8, withStyle: true, query: 'tencuiala decorativa siliconica fatada' });
      add({ key: 'sills', cat: 'finishes', procCategory: 'construction', titleRo: 'Glaf exterior aluminiu', titleEn: 'Aluminium exterior window sill', specRo: 'Una per fereastră, lățime ~1,2 m', specEn: 'One per window, ~1.2 m wide', qty: Math.max(dims.windowsCount, 1) * 1.2, unit: 'ml', basePrice: 18, withStyle: false, query: 'glaf exterior aluminiu' });
    } else if (share(f.envelope) > 0) {
      add({ key: 'deck', cat: 'finishes', procCategory: 'outdoor', titleRo: style.materials.flooring.ro, titleEn: style.materials.flooring.en, specRo: 'Deck / dale exterioare; +10% pierderi', specEn: 'Outdoor decking / pavers; +10% waste', qty: up1(eng.flooringWithWaste * share(f.envelope)), unit: 'm²', basePrice: 36, withStyle: true, query: 'deck exterior wpc' });
      add({ key: 'joists', cat: 'structure', procCategory: 'outdoor', titleRo: 'Rigle de susținere tratate', titleEn: 'Treated support joists', specRo: 'Axe la 40 cm; lemn tratat autoclavizat', specEn: '40 cm centres; pressure-treated timber', qty: up1(Math.max(dims.width, 0) / 0.4 * Math.max(dims.length, 0)), unit: 'ml', basePrice: 3.2, withStyle: false, query: 'rigla lemn tratat autoclavizat' });
    }
    if (share(f.light) > 0 && eng.lightFixtures > 0) {
      add({ key: 'outlight', cat: 'electric', procCategory: 'outdoor', titleRo: `Aplică LED exterior IP65 ${kelvin}K`, titleEn: `Exterior LED wall light IP65 ${kelvin}K`, specRo: 'Rezistentă la ploaie și praf, corp aluminiu', specEn: 'Rain- and dust-proof, aluminium body', qty: Math.max(1, Math.ceil(eng.lightFixtures * share(f.light))), unit: 'buc.', basePrice: 32, withStyle: true, query: `aplica led exterior ip65 ${kelvin}k` });
    }
    OUTDOOR_KIT.forEach((k, i) => add({ key: `kit${i}`, cat: 'other', procCategory: 'outdoor', titleRo: k[0], titleEn: k[1], specRo: k[2], specEn: k[3], qty: k[4], unit: 'buc.', basePrice: k[5], withStyle: true, query: k[6] }));
  } else if (eng.floorArea > 0) {
    // Grădini: pavaj + gazon în proporția din spațiu, borduri pe perimetru
    const hard = eng.flooringWithWaste * space.hardscapeShare * share(f.envelope);
    const green = eng.floorArea * (1 - space.hardscapeShare) * share(f.envelope);
    if (hard > 0) add({ key: 'paving', cat: 'finishes', procCategory: 'outdoor', titleRo: 'Dale / pavele de exterior', titleEn: 'Outdoor paving slabs', specRo: `${Math.round(space.hardscapeShare * 100)}% din arie; +10% pierderi; strat de nisip și piatră separat`, specEn: `${Math.round(space.hardscapeShare * 100)}% of area; +10% waste; sand and gravel bed separate`, qty: up1(hard), unit: 'm²', basePrice: 22, withStyle: true, query: 'dale beton exterior' });
    if (green > 0) {
      add({ key: 'turf', cat: 'other', procCategory: 'outdoor', titleRo: 'Gazon în rulou', titleEn: 'Turf rolls', specRo: 'Zona verde; pământ vegetal separat', specEn: 'Planted zone; topsoil separate', qty: up1(green), unit: 'm²', basePrice: 4.5, withStyle: false, query: 'gazon rulou' });
      add({ key: 'soil', cat: 'other', procCategory: 'outdoor', titleRo: 'Pământ vegetal 5 cm strat', titleEn: 'Topsoil, 5 cm layer', specRo: `~${(green * 0.05).toFixed(1)} m³ pentru zona verde`, specEn: `~${(green * 0.05).toFixed(1)} m³ for the planted zone`, qty: up1(green), unit: 'm²', basePrice: 2.2, withStyle: false, query: 'pamant vegetal' });
    }
    add({ key: 'edging', cat: 'finishes', procCategory: 'outdoor', titleRo: 'Bordură de grădină', titleEn: 'Garden edging', specRo: 'Pe perimetrul zonei amenajate', specEn: 'Along the landscaped perimeter', qty: up1(perimeter), unit: 'ml', basePrice: 3.5, withStyle: false, query: 'bordura gradina' });
    if (share(f.light) > 0 && eng.lightFixtures > 0) {
      add({ key: 'gardenlight', cat: 'electric', procCategory: 'outdoor', titleRo: `Balizi LED de grădină ${kelvin}K`, titleEn: `LED garden bollards ${kelvin}K`, specRo: 'IP65, 12 V; transformator și cablu separat', specEn: 'IP65, 12 V; transformer and cable separate', qty: Math.max(1, Math.ceil(eng.lightFixtures * share(f.light))), unit: 'buc.', basePrice: 30, withStyle: true, query: `baliza led gradina ${kelvin}k` });
    }
    OUTDOOR_KIT.forEach((k, i) => add({ key: `kit${i}`, cat: 'other', procCategory: 'outdoor', titleRo: k[0], titleEn: k[1], specRo: k[2], specEn: k[3], qty: k[4], unit: 'buc.', basePrice: k[5], withStyle: true, query: k[6] }));
  }

  // Scenariile bifate (chips): materialul/echipamentul tipic al scenariului devine o poziție „pachet".
  // Titlul vine din catalog (bilingv); interogarea = primul termen din descrierea RO (fără diacritice).
  const chips: Draft[] = space.scenarios
    .filter((s) => dims.focusIds?.includes(s.id))
    .map((s) => ({
      key: `sc-${s.id}`,
      cat: 'other',
      procCategory: (mode === 'interiors' ? 'construction' : 'outdoor') as ProcCategory,
      titleRo: s.labelRo,
      titleEn: s.labelEn,
      specRo: `${s.materialRo} — pachet orientativ`,
      specEn: `${s.materialEn} — indicative allowance`,
      qty: 1,
      unit: 'buc.' as BomUnit,
      basePrice: 240,
      withStyle: true,
      query: s.materialRo.split(',')[0].normalize('NFD').replace(/[̀-ͯ]/g, ''),
    }));

  // 6–10 poziții: scenariile se taie primele dacă lista depășește plafonul
  const room = Math.max(0, 10 - drafts.length);
  const all = [...drafts, ...chips.slice(0, room)].slice(0, 10);

  const k = BUDGET_K[dims.budget] ?? 1;
  const items: BomItem[] = all
    .filter((d) => d.qty > 0)
    .map((d) => {
      const unitPrice = round2(d.basePrice * k * (d.withStyle ? style.costFactor : 1));
      const qty = d.unit === 'buc.' ? Math.ceil(d.qty) : round2(d.qty);
      return {
        id: `proc-${d.key}`,
        cat: d.cat,
        procCategory: d.procCategory,
        titleRo: d.titleRo,
        titleEn: d.titleEn,
        specRo: d.specRo,
        specEn: d.specEn,
        qty,
        unit: d.unit,
        unitPrice,
        total: round2(qty * unitPrice),
        query: d.query,
        links: buildRetailerLinks(d.query, d.procCategory),
      };
    });

  return { items, total: round2(items.reduce((s, i) => s + i.total, 0)), currency: 'EUR' };
}

/** Verifică, pentru input nesigur (corp de cerere), că modul și spațiul există. */
export function isKnownSpace(mode: unknown, spaceType: unknown): mode is DesignMode {
  return (
    typeof mode === 'string' &&
    Object.prototype.hasOwnProperty.call(SPACE_MODES, mode) &&
    typeof spaceType === 'string' &&
    SPACE_MODES[mode as DesignMode].spaces.some((s) => s.id === spaceType)
  );
}
