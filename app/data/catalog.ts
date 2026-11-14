// app/data/catalog.ts
// Catalogul aplicației: spații, stiluri, planuri tarifare și calculatorul ingineresc.
// v2.0 — manopera și link-urile de magazine au fost eliminate.
//         Devizul expune acum specificații tehnice de producător, nu prețuri de retail.
// v3.0 — stiluri cu paletă + materiale, estimare de cost orientativă (€/m²) în timp real.
import {
  BudgetTier,
  CostEstimate,
  CostLine,
  DesignMode,
  EngineeringSpecs,
  PlanId,
  RoomDimensions,
  VisualStyle,
} from '@/app/types';

// =====================================================================
// 1. SPACE MODES
// =====================================================================
export interface LayoutOption {
  id: string;
  labelRo: string;
  labelEn: string;
  prompt: string;
}

export interface SpaceOption {
  id: string;
  labelRo: string;
  labelEn: string;
  scenePrompt: string;
  layouts: LayoutOption[];
}

export interface ModeConfig {
  labelRo: string;
  labelEn: string;
  spaces: SpaceOption[];
}

const EXTERIOR_LAYOUTS: LayoutOption[] = [
  {
    id: 'ventilated_facade',
    labelRo: 'Fațadă ventilată cu lemn termotratat și sticlă panoramică',
    labelEn: 'Ventilated facade with thermo-wood and panoramic glass',
    prompt:
      'thermo-treated wood cladding, large floor-to-ceiling black aluminum windows, warm wall sconces',
  },
  {
    id: 'minimal_white',
    labelRo: 'Tencuială albă + accente de piatră naturală (ardezie)',
    labelEn: 'White render + natural slate stone accents',
    prompt: 'white minimalist render, dark slate stone accent wall, architectural driveway lighting',
  },
];

export const SPACE_MODES: Record<DesignMode, ModeConfig> = {
  interiors: {
    labelRo: 'Interioare',
    labelEn: 'Interiors',
    spaces: [
      {
        id: 'kitchen',
        labelRo: 'Bucătărie & Dining',
        labelEn: 'Kitchen & Dining',
        scenePrompt:
          'fully furnished modern kitchen and dining area with fitted cabinetry, kitchen island with bar stools, dining table with chairs, built-in appliances, pendant lights',
        layouts: [
          {
            id: 'l_island',
            labelRo: 'Bucătărie în L + insulă centrală (triunghi ergonomic)',
            labelEn: 'L-shape kitchen + central island (work triangle)',
            prompt: 'L-shaped ergonomic layout, central marble island, sink by the window',
          },
          {
            id: 'u_shape',
            labelRo: 'Configurație în U pe 3 pereți (depozitare maximă)',
            labelEn: 'U-shape, 3-wall configuration (max storage)',
            prompt: 'U-shaped layout on three walls, tall pantry cabinets, LED counter lighting',
          },
        ],
      },
      {
        id: 'living room',
        labelRo: 'Living',
        labelEn: 'Living Room',
        scenePrompt:
          'fully furnished modern living room featuring a large comfortable sofa, two armchairs, coffee table, TV media unit, area rug, floor lamp, curtains',
        layouts: [
          {
            id: 'open_lounge',
            labelRo: 'Open-space (canapea pe axul TV + zonă dining)',
            labelEn: 'Open-space (sofa on TV axis + dining area)',
            prompt: 'open-plan layout, sofa facing the media wall, dining table near the window',
          },
          {
            id: 'sectional_media_wall',
            labelRo: 'Colțar modular + perete media cu rafturi încorporate',
            labelEn: 'Sectional sofa + media wall with built-in shelving',
            prompt: 'L-shaped sectional sofa facing a media wall with built-in shelving',
          },
        ],
      },
      {
        id: 'master bedroom',
        labelRo: 'Dormitor matrimonial',
        labelEn: 'Master Bedroom',
        scenePrompt:
          'fully furnished modern bedroom featuring a luxury upholstered king bed, two nightstands with lamps, integrated ambient lighting, custom wardrobe, bedding and curtains',
        layouts: [
          {
            id: 'bed_symmetric',
            labelRo: 'Pat central pe peretele tăbliei + noptiere simetrice',
            labelEn: 'Centered bed on headboard wall + symmetrical nightstands',
            prompt: 'king bed centered on the headboard wall, symmetrical nightstands, wall sconces',
          },
          {
            id: 'bed_wardrobe_wall',
            labelRo: 'Perete de dulapuri încorporate + colț de lectură',
            labelEn: 'Built-in wardrobe wall + reading corner',
            prompt:
              'floor-to-ceiling built-in wardrobe wall, king bed, reading armchair by the window',
          },
        ],
      },
      {
        id: 'home office',
        labelRo: 'Birou acasă',
        labelEn: 'Home Office',
        scenePrompt:
          'fully furnished home office featuring a large wooden desk, ergonomic office chair, built-in bookshelves, task lamp, area rug, laptop on the desk',
        layouts: [
          {
            id: 'desk_window',
            labelRo: 'Birou orientat spre fereastră + biblioteci încorporate',
            labelEn: 'Desk facing the window + built-in bookshelves',
            prompt: 'desk placed in front of the window, built-in bookshelves on the side wall',
          },
          {
            id: 'desk_l_shape',
            labelRo: 'Birou în L pe perete + rafturi până în tavan',
            labelEn: 'L-shaped wall desk + floor-to-ceiling shelving',
            prompt: 'L-shaped desk along the wall, floor-to-ceiling shelving, focused task lighting',
          },
        ],
      },
    ],
  },
  exteriors: {
    labelRo: 'Exterioare & Fațade',
    labelEn: 'Exteriors & Facades',
    spaces: [
      {
        id: 'modern villa exterior',
        labelRo: 'Casă / vilă unifamilială',
        labelEn: 'Single-family villa',
        scenePrompt:
          'modern single-family villa exterior with a finished facade, entrance door, landscaped front garden, driveway',
        layouts: EXTERIOR_LAYOUTS,
      },
      {
        id: 'townhouse facade',
        labelRo: 'Fațadă duplex / townhouse',
        labelEn: 'Townhouse facade',
        scenePrompt:
          'modern townhouse facade with a finished render, entrance canopy, balcony railings, paved entrance',
        layouts: EXTERIOR_LAYOUTS,
      },
      {
        id: 'commercial building',
        labelRo: 'Clădire birouri / showroom',
        labelEn: 'Commercial facade',
        scenePrompt:
          'modern commercial building facade with glazed storefront, entrance canopy, paved plaza, outdoor planters',
        layouts: EXTERIOR_LAYOUTS,
      },
    ],
  },
  gardens: {
    labelRo: 'Grădini & Terase',
    labelEn: 'Gardens & Patios',
    spaces: [
      {
        id: 'backyard patio',
        labelRo: 'Terasă cu pergolă & lounge',
        labelEn: 'Patio & pergola lounge',
        scenePrompt:
          'landscaped backyard patio with an outdoor sofa set, dining table with chairs, potted plants, string lights',
        layouts: [
          {
            id: 'pergola_firepit',
            labelRo: 'Pergolă bioclimatică + zonă BBQ + alei de piatră',
            labelEn: 'Bioclimatic pergola + outdoor kitchen + stone pathways',
            prompt:
              'aluminum bioclimatic pergola, outdoor sofa lounge, built-in barbecue station, stone pathways',
          },
        ],
      },
      {
        id: 'poolside garden',
        labelRo: 'Curte cu piscină & deck',
        labelEn: 'Poolside & deck garden',
        scenePrompt:
          'landscaped poolside garden with a rectangular swimming pool, wooden deck, sun loungers, outdoor planters',
        layouts: [
          {
            id: 'pool_deck',
            labelRo: 'Piscină dreptunghiulară + deck din lemn + șezlonguri',
            labelEn: 'Rectangular pool + timber deck + sun loungers',
            prompt: 'rectangular pool with timber deck, sun loungers, ambient garden lighting',
          },
        ],
      },
      {
        id: 'front yard',
        labelRo: 'Grădină la intrare & alei pavate',
        labelEn: 'Front yard & pathways',
        scenePrompt:
          'landscaped front yard with a paved pathway, green lawn, ornamental shrubs, trees, low garden lights',
        layouts: [
          {
            id: 'paved_pathway',
            labelRo: 'Alee pavată + graminee ornamentale + iluminat jos',
            labelEn: 'Paved pathway + ornamental grasses + low lighting',
            prompt: 'stone paved pathway, ornamental grasses, low landscape lighting',
          },
        ],
      },
    ],
  },
};

export function getSpace(mode: DesignMode, spaceId: string | null | undefined): SpaceOption {
  const spaces = SPACE_MODES[mode].spaces;
  return spaces.find((s) => s.id === spaceId) ?? spaces[0];
}

export function getLayout(space: SpaceOption, layoutId: string | null | undefined): LayoutOption {
  return space.layouts.find((l) => l.id === layoutId) ?? space.layouts[0];
}

// =====================================================================
// 2. VISUAL STYLES
//    Fiecare stil are: prompt AI, paletă curatată (hex + denumire), materiale
//    caracteristice și un multiplicator de cost (`costFactor`) aplicat în estimare.
// =====================================================================
type StyleInput = Omit<VisualStyle, 'colors'>;

// Derivă `colors` din paletă, ca să existe o singură sursă de adevăr pentru culori
const defineStyle = (style: StyleInput): VisualStyle => ({
  ...style,
  colors: style.palette.map((swatch) => swatch.hex),
});

export const VISUAL_STYLES: VisualStyle[] = [
  defineStyle({
    id: 'scandinavian',
    nameRo: 'Modern Scandinavian',
    nameEn: 'Modern Scandinavian',
    descRo: 'Stejar deschis, țesături naturale, lumină caldă și funcționalitate nordică.',
    descEn: 'Light oak timber, natural textiles, warm daylight and Nordic functionality.',
    prompt:
      'scandinavian architectural style, light natural oak wood, warm white walls, soft linen and wool textures, clean functional lines, bright natural daylight, 8k photorealistic',
    palette: [
      { hex: '#F4F1EA', nameRo: 'Alb cald', nameEn: 'Warm white' },
      { hex: '#D8C7B2', nameRo: 'Stejar deschis', nameEn: 'Light oak' },
      { hex: '#8A9A86', nameRo: 'Verde salvie', nameEn: 'Sage green' },
      { hex: '#2C3531', nameRo: 'Antracit verzui', nameEn: 'Green charcoal' },
    ],
    materialsRo: ['Stejar natur', 'Lână și in', 'Vopsea mată caldă', 'Ceramică mată'],
    materialsEn: ['Natural oak', 'Wool and linen', 'Warm matte paint', 'Matte ceramics'],
    costFactor: 1.0,
  }),
  defineStyle({
    id: 'modern',
    nameRo: 'Modern',
    nameEn: 'Modern',
    descRo: 'Linii drepte, volume clare, suprafețe mate și iluminat arhitectural.',
    descEn: 'Crisp lines, clean volumes, matte surfaces and architectural lighting.',
    prompt:
      'modern architectural interior design, sleek walnut and matte stone surfaces, recessed linear LED lighting, balanced proportions, 8k photorealistic',
    palette: [
      { hex: '#F2F0EC', nameRo: 'Alb de var', nameEn: 'Chalk white' },
      { hex: '#5C4033', nameRo: 'Nuc', nameEn: 'Walnut' },
      { hex: '#A39B8B', nameRo: 'Gri piatră', nameEn: 'Stone grey' },
      { hex: '#1C1C1A', nameRo: 'Negru mat', nameEn: 'Matte black' },
    ],
    materialsRo: ['Furnir de nuc', 'Piatră sinterizată', 'Oțel negru mat', 'Sticlă extra-clară'],
    materialsEn: ['Walnut veneer', 'Sintered stone', 'Matte black steel', 'Extra-clear glass'],
    costFactor: 1.1,
  }),
  defineStyle({
    id: 'contemporary',
    nameRo: 'Contemporary',
    nameEn: 'Contemporary',
    descRo: 'Texturi actuale, contraste subtile, piatră naturală și mobilier curbat.',
    descEn: 'Current textures, subtle contrast, natural stone and sculpted furniture.',
    prompt:
      'contemporary architectural design, travertine stone, bouclé upholstery, brushed bronze details, warm ambient lighting, 8k photorealistic',
    palette: [
      { hex: '#EAE6DF', nameRo: 'Ecru', nameEn: 'Ecru' },
      { hex: '#B89F82', nameRo: 'Travertin', nameEn: 'Travertine' },
      { hex: '#6E786E', nameRo: 'Verde măsliniu', nameEn: 'Olive green' },
      { hex: '#1F2421', nameRo: 'Grafit', nameEn: 'Graphite' },
    ],
    materialsRo: ['Travertin', 'Bouclé', 'Bronz periat', 'Lemn afumat'],
    materialsEn: ['Travertine', 'Bouclé', 'Brushed bronze', 'Smoked timber'],
    costFactor: 1.25,
  }),
  defineStyle({
    id: 'minimalist',
    nameRo: 'Minimalist',
    nameEn: 'Minimalist',
    descRo: 'Spațiu aerisit, depozitare ascunsă, paletă monocromă caldă fără încărcare.',
    descEn: 'Uncluttered space, concealed storage, warm monochrome palette.',
    prompt:
      'warm minimalist architectural design, flush handleless cabinetry, microcement and pale timber, serene uncluttered space, soft diffused light, 8k photorealistic',
    palette: [
      { hex: '#F7F6F2', nameRo: 'Alb pur cald', nameEn: 'Soft white' },
      { hex: '#E2DDD4', nameRo: 'Bej nisip', nameEn: 'Sand beige' },
      { hex: '#9E988E', nameRo: 'Gri cald', nameEn: 'Warm grey' },
      { hex: '#141413', nameRo: 'Negru', nameEn: 'Black' },
    ],
    materialsRo: ['Microciment', 'Mobilier fără mânere', 'Lemn palid', 'Vopsea mată'],
    materialsEn: ['Microcement', 'Handleless cabinetry', 'Pale timber', 'Matte paint'],
    costFactor: 1.05,
  }),
  defineStyle({
    id: 'minimalist_obsidian',
    nameRo: 'Minimalist Obsidian',
    nameEn: 'Minimalist Obsidian',
    descRo: 'Minimalism întunecat: negru obsidian, piatră neagră mată și lumină liniară discretă.',
    descEn: 'Dark minimalism: obsidian black, matte black stone and discreet linear light.',
    prompt:
      'dark minimalist obsidian architectural design, matte black stone surfaces, charcoal microcement, smoked oak, hidden linear LED lighting, moody serene atmosphere, 8k photorealistic',
    palette: [
      { hex: '#0E0F10', nameRo: 'Negru obsidian', nameEn: 'Obsidian black' },
      { hex: '#2A2D30', nameRo: 'Cărbune', nameEn: 'Charcoal' },
      { hex: '#6B6E70', nameRo: 'Gri bazalt', nameEn: 'Basalt grey' },
      { hex: '#B08D57', nameRo: 'Alamă satinată', nameEn: 'Satin brass' },
    ],
    materialsRo: ['Piatră neagră mată', 'Microciment antracit', 'Stejar afumat', 'Alamă satinată'],
    materialsEn: ['Matte black stone', 'Charcoal microcement', 'Smoked oak', 'Satin brass'],
    costFactor: 1.4,
  }),
  defineStyle({
    id: 'japandi',
    nameRo: 'Japandi',
    nameEn: 'Japandi',
    descRo: 'Fuziune japoneză–nordică: lemn cald, linii joase, ceramică artizanală și calm.',
    descEn: 'Japanese–Nordic fusion: warm timber, low lines, handmade ceramics and calm.',
    prompt:
      'japandi architectural design, warm ash and walnut wood, low profile furniture, paper shoji lighting, handmade ceramics, neutral earthy tones, calm zen atmosphere, 8k photorealistic',
    palette: [
      { hex: '#EFE9DE', nameRo: 'Hârtie de orez', nameEn: 'Rice paper' },
      { hex: '#C9B79C', nameRo: 'Frasin', nameEn: 'Ash wood' },
      { hex: '#7C6A55', nameRo: 'Cafeniu pământiu', nameEn: 'Earth brown' },
      { hex: '#3A3F3A', nameRo: 'Verde mușchi închis', nameEn: 'Deep moss' },
    ],
    materialsRo: ['Frasin și nuc', 'Ceramică artizanală', 'Hârtie shoji', 'Fibre naturale'],
    materialsEn: ['Ash and walnut', 'Handmade ceramics', 'Shoji paper', 'Natural fibres'],
    costFactor: 1.2,
  }),
  defineStyle({
    id: 'traditional',
    nameRo: 'Neo-Classic Paris',
    nameEn: 'Neo-Classic Paris',
    descRo: 'Eleganță haussmanniană: parchet chevron, lambriuri, cornișe și alamă patinată.',
    descEn: 'Haussmann elegance: chevron parquet, wall moldings, cornices and aged brass.',
    prompt:
      'refined neo-classic Parisian architectural design, classic wall wainscoting, chevron oak parquet, ornate ceiling cornices, tailored upholstery, warm brass sconces, 8k photorealistic',
    palette: [
      { hex: '#F5F2EB', nameRo: 'Alb de cornișă', nameEn: 'Cornice white' },
      { hex: '#B5946B', nameRo: 'Parchet miere', nameEn: 'Honey parquet' },
      { hex: '#4A5550', nameRo: 'Verde Paris', nameEn: 'Paris green' },
      { hex: '#2B2623', nameRo: 'Bronz închis', nameEn: 'Dark bronze' },
    ],
    materialsRo: ['Parchet chevron stejar', 'Lambriuri și cornișe', 'Alamă patinată', 'Marmură Carrara'],
    materialsEn: ['Chevron oak parquet', 'Wainscoting and cornices', 'Aged brass', 'Carrara marble'],
    costFactor: 1.45,
  }),
  defineStyle({
    id: 'mid_century_modern',
    nameRo: 'Mid-century Modern',
    nameEn: 'Mid-century Modern',
    descRo: 'Lemn de tec și nuc, piese iconice pe picioare suple și accente calde.',
    descEn: 'Teak and walnut wood, iconic tapered-leg furniture and warm accents.',
    prompt:
      'mid-century modern architectural design, warm teak and walnut wood paneling, iconic organic furniture, cognac leather, statement pendant lamp, 8k photorealistic',
    palette: [
      { hex: '#F3EFE6', nameRo: 'Crem', nameEn: 'Cream' },
      { hex: '#9A5B34', nameRo: 'Tec', nameEn: 'Teak' },
      { hex: '#4F6354', nameRo: 'Verde pin', nameEn: 'Pine green' },
      { hex: '#1E1E1C', nameRo: 'Negru cald', nameEn: 'Warm black' },
    ],
    materialsRo: ['Tec și nuc', 'Piele coniac', 'Lână bouclé', 'Metal alămit'],
    materialsEn: ['Teak and walnut', 'Cognac leather', 'Wool bouclé', 'Brass-finish metal'],
    costFactor: 1.3,
  }),
  defineStyle({
    id: 'coastal',
    nameRo: 'Coastal',
    nameEn: 'Coastal',
    descRo: 'Tonuri de nisip, in natural, lemn albit și atmosferă luminoasă, relaxată.',
    descEn: 'Sand tones, natural linen, bleached timber and airy coastal light.',
    prompt:
      'refined coastal architectural design, bleached oak flooring, crisp linen drapery, limestone textures, soft mineral blue-grey accents, abundant sunlight, 8k photorealistic',
    palette: [
      { hex: '#F8F7F4', nameRo: 'Alb spumă', nameEn: 'Sea-foam white' },
      { hex: '#D9CEBE', nameRo: 'Nisip', nameEn: 'Sand' },
      { hex: '#7A9199', nameRo: 'Albastru mineral', nameEn: 'Mineral blue' },
      { hex: '#2F3E46', nameRo: 'Bleumarin adânc', nameEn: 'Deep navy' },
    ],
    materialsRo: ['Stejar albit', 'In natural', 'Calcar', 'Ratan'],
    materialsEn: ['Bleached oak', 'Natural linen', 'Limestone', 'Rattan'],
    costFactor: 1.0,
  }),
  defineStyle({
    id: 'industrial',
    nameRo: 'Industrial Loft',
    nameEn: 'Industrial Loft',
    descRo: 'Beton aparent, oțel negru mat, cărămidă sau microciment și piele coniac.',
    descEn: 'Exposed concrete, matte black steel, microcement and cognac leather.',
    prompt:
      'architectural industrial loft design, microcement surfaces, matte black steel framing, warm cognac leather, exposed timber beams, warm track lighting, 8k photorealistic',
    palette: [
      { hex: '#D6D3CD', nameRo: 'Beton deschis', nameEn: 'Light concrete' },
      { hex: '#8C5332', nameRo: 'Cărămidă aparentă', nameEn: 'Exposed brick' },
      { hex: '#474B4F', nameRo: 'Oțel vechi', nameEn: 'Aged steel' },
      { hex: '#141413', nameRo: 'Negru mat', nameEn: 'Matte black' },
    ],
    materialsRo: ['Microciment', 'Cărămidă aparentă', 'Oțel negru mat', 'Grinzi din lemn'],
    materialsEn: ['Microcement', 'Exposed brick', 'Matte black steel', 'Timber beams'],
    costFactor: 1.1,
  }),
  defineStyle({
    id: 'brutalist_concrete',
    nameRo: 'Brutalist Concrete',
    nameEn: 'Brutalist Concrete',
    descRo: 'Beton turnat aparent, volume masive, lemn brut și lumină dramatică, laterală.',
    descEn: 'Board-formed exposed concrete, massive volumes, raw timber and dramatic side light.',
    prompt:
      'brutalist architectural design, raw board-formed exposed concrete walls, massive monolithic volumes, raw timber accents, blackened steel, dramatic raking light, 8k photorealistic',
    palette: [
      { hex: '#BDBAB3', nameRo: 'Beton turnat', nameEn: 'Cast concrete' },
      { hex: '#8D8A84', nameRo: 'Gri brut', nameEn: 'Raw grey' },
      { hex: '#5A4B3E', nameRo: 'Lemn brut', nameEn: 'Raw timber' },
      { hex: '#191919', nameRo: 'Oțel înnegrit', nameEn: 'Blackened steel' },
    ],
    materialsRo: ['Beton aparent cofrat', 'Oțel înnegrit', 'Lemn brut', 'Sticlă fixă'],
    materialsEn: ['Board-formed concrete', 'Blackened steel', 'Raw timber', 'Fixed glazing'],
    costFactor: 1.15,
  }),
  defineStyle({
    id: 'biophilic',
    nameRo: 'Biophilic Organic',
    nameEn: 'Biophilic Organic',
    descRo: 'Plante integrate, piatră naturală, lemn cu textură și lumină naturală abundentă.',
    descEn: 'Integrated greenery, natural stone, textured timber and abundant daylight.',
    prompt:
      'biophilic organic architectural design, abundant living plants, natural stone, textured raw timber, rattan, earthy green and terracotta tones, soft natural daylight, 8k photorealistic',
    palette: [
      { hex: '#EDEBE1', nameRo: 'Var natural', nameEn: 'Natural lime' },
      { hex: '#6F8F5F', nameRo: 'Verde frunză', nameEn: 'Leaf green' },
      { hex: '#B4694A', nameRo: 'Teracotă', nameEn: 'Terracotta' },
      { hex: '#33392E', nameRo: 'Verde pădure', nameEn: 'Forest green' },
    ],
    materialsRo: ['Plante integrate', 'Piatră naturală', 'Lemn texturat', 'Teracotă'],
    materialsEn: ['Integrated planting', 'Natural stone', 'Textured timber', 'Terracotta'],
    costFactor: 1.15,
  }),
];

// Stilul cu id-ul dat; dacă id-ul e necunoscut (date vechi), se folosește primul stil.
export function getStyle(styleId: string | null | undefined): VisualStyle {
  return VISUAL_STYLES.find((s) => s.id === styleId) ?? VISUAL_STYLES[0];
}

// =====================================================================
// 3. PRICING PLANS
// =====================================================================
export interface PricingPlan {
  id: PlanId;
  nameRo: string;
  nameEn: string;
  price: string;
  periodRo: string;
  periodEn: string;
  descRo: string;
  descEn: string;
  featuresRo: string[];
  featuresEn: string[];
  popular: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    nameRo: 'Studio (gratuit)',
    nameEn: 'Studio (free)',
    price: '0 €',
    periodRo: '/ lună',
    periodEn: '/ month',
    descRo: 'Pentru o singură cameră sau un proiect personal.',
    descEn: 'For a single room or a personal project.',
    featuresRo: [
      '3 proiecte pe lună',
      'Specificații tehnice de producător',
      `Cele ${VISUAL_STYLES.length} direcții arhitecturale de stil`,
      'Export PDF Blueprint',
    ],
    featuresEn: [
      '3 projects per month',
      'Manufacturer technical specifications',
      `All ${VISUAL_STYLES.length} architectural style directions`,
      'PDF Blueprint export',
    ],
    popular: false,
  },
  {
    id: 'pro',
    nameRo: 'Professional',
    nameEn: 'Professional',
    price: '29 €',
    periodRo: '/ lună',
    periodEn: '/ month',
    descRo: 'Pentru designeri, agenți imobiliari și firme de amenajări.',
    descEn: 'For designers, real estate agents and renovation firms.',
    featuresRo: [
      'Proiecte nelimitate',
      'Interioare, fațade și grădini',
      'Deviz tehnic complet post-generare AI',
      'Export PDF: Blueprint & Material Passport',
      'Arhivă de proiecte în cloud',
      'Modul B2B Antreprenori',
    ],
    featuresEn: [
      'Unlimited projects',
      'Interiors, facades and gardens',
      'Full AI post-generation technical spec',
      'PDF export: Blueprint & Material Passport',
      'Cloud project archive',
      'B2B Contractor module',
    ],
    popular: true,
  },
  {
    id: 'agency',
    nameRo: 'Business',
    nameEn: 'Business',
    price: '79 €',
    periodRo: '/ lună',
    periodEn: '/ month',
    descRo: 'Pentru dezvoltatori imobiliari și birouri de arhitectură.',
    descEn: 'For property developers and architecture firms.',
    featuresRo: [
      'Tot ce include Professional',
      '5 conturi de echipă',
      'PDF cu antet tehnic de proiectare',
      'Procesare prioritară',
    ],
    featuresEn: [
      'Everything in Professional',
      '5 team seats',
      'Engineering blueprint PDF header',
      'Priority processing',
    ],
    popular: false,
  },
];

export function getPlanById(planId: string | null | undefined): PricingPlan | null {
  return PRICING_PLANS.find((p) => p.id === planId) ?? null;
}

// =====================================================================
// 4. CALCULATORUL INGINERESC
//    Toate formulele sunt pure (aceleași date de intrare → același rezultat),
//    deci rulează identic în browser (calcul în timp real) și pe server.
// =====================================================================

// ── Constante geometrice și de execuție ──────────────────────────────
const DOOR_AREA = 1.89;          // m²  (0.9 × 2.1 m)
const WINDOW_AREA = 2.1;         // m²  (1.5 × 1.4 m)
const DOOR_WIDTH = 0.9;          // m   (scăzut din plintă)
const FLOORING_WASTE = 1.1;      // +10% tăiere
const BASEBOARD_WASTE = 1.05;    // +5% rezervă
const PAINT_COATS = 2;
const PAINT_COVERAGE = 10;       // m²/L/strat
const PAINT_RESERVE = 1.1;

// Metoda lumenului: Φ = E × A / (UF × MF)
//   Φ  = flux luminos total necesar (lm)
//   E  = nivel de iluminare țintă (lx)
//   A  = suprafața (m²)
//   UF = factor de utilizare, MF = factor de mentenanță
const UTILIZATION_FACTOR = 0.6;
const MAINTENANCE_FACTOR = 0.9;
const LUMENS_PER_FIXTURE = 800;  // ~9 W LED spot
const DEFAULT_TARGET_LUX = 200;

// Nivelul de iluminare recomandat (lx) pentru fiecare tip de spațiu
const TARGET_LUX_BY_SPACE: Record<string, number> = {
  kitchen: 300,
  'living room': 200,
  'master bedroom': 150,
  'home office': 500,
  'modern villa exterior': 30,
  'townhouse facade': 30,
  'commercial building': 50,
  'backyard patio': 50,
  'poolside garden': 50,
  'front yard': 30,
};

// Gips-carton tavan suspendat (doar interioare)
const PLASTERBOARD_SHEET_AREA = 3.0;      // m²/placă (1.2 × 2.5 m)
const PLASTERBOARD_WASTE = 1.1;
const CEILING_PROFILE_PER_SQM = 3.2;      // ml CD 60 / m²
const CEILING_HANGERS_PER_SQM = 1.5;      // bride / m²

// Valoare numerică sigură: orice NaN / Infinity / număr negativ devine 0
const safeNumber = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

// Calculează toate cantitățile (arii, volum, materiale, iluminat, gips-carton)
// pornind de la cotele introduse de utilizator. Este apelată la fiecare modificare
// a cotelor, de aceea nu are efecte secundare.
export function calculateEngineering(
  dims: RoomDimensions,
  mode: DesignMode = 'interiors',
  spaceType: string = 'living room',
): EngineeringSpecs {
  const width = safeNumber(dims.width);
  const length = safeNumber(dims.length);
  const height = safeNumber(dims.height);
  // Uși și ferestre sunt numere întregi (o jumătate de ușă nu există)
  const doors = Math.floor(safeNumber(dims.doorsCount));
  const windows = Math.floor(safeNumber(dims.windowsCount));

  // Aria pardoselii: A = lățime × lungime;  volum: V = A × înălțime
  const floorArea = +(width * length).toFixed(2);
  const volume = +(floorArea * height).toFixed(2);
  const perimeter = (width + length) * 2;
  const grossWallArea = perimeter * height;

  // Aria netă a pereților = aria brută − golurile (uși + ferestre)
  const openings = doors * DOOR_AREA + windows * WINDOW_AREA;
  const netWallArea = Math.max(0, +(grossWallArea - openings).toFixed(2));

  // Pardoseală (+10% pierderi), vopsea (litri = arie × straturi / randament × rezervă),
  // plintă (perimetrul minus lățimea ușilor, +5% rezervă; niciodată negativă)
  const flooringWithWaste = +(floorArea * FLOORING_WASTE).toFixed(2);
  const paintLiters = Math.ceil(((netWallArea * PAINT_COATS) / PAINT_COVERAGE) * PAINT_RESERVE);
  const baseboardMeters = +(Math.max(0, perimeter - doors * DOOR_WIDTH) * BASEBOARD_WASTE).toFixed(1);

  // Iluminat: fluxul total (metoda lumenului), apoi numărul de corpuri (rotunjit în sus)
  const targetLux = TARGET_LUX_BY_SPACE[spaceType] ?? DEFAULT_TARGET_LUX;
  const requiredLumens = Math.round(
    (targetLux * floorArea) / (UTILIZATION_FACTOR * MAINTENANCE_FACTOR),
  );
  const lightFixtures = floorArea > 0 ? Math.max(1, Math.ceil(requiredLumens / LUMENS_PER_FIXTURE)) : 0;

  // Tavan suspendat din gips-carton: plăci, profile CD (câmp), UD (perimetru) și bride
  const hasCeiling = mode === 'interiors' && floorArea > 0;
  const plasterboardSheets = hasCeiling
    ? Math.ceil((floorArea * PLASTERBOARD_WASTE) / PLASTERBOARD_SHEET_AREA)
    : 0;
  const ceilingProfileMeters = hasCeiling ? Math.ceil(floorArea * CEILING_PROFILE_PER_SQM * 1.05) : 0;
  const perimeterProfileMeters = hasCeiling ? Math.ceil(perimeter * 1.05) : 0;
  const ceilingHangers = hasCeiling ? Math.ceil(floorArea * CEILING_HANGERS_PER_SQM) : 0;

  return {
    floorArea,
    volume,
    netWallArea,
    flooringWithWaste,
    paintLiters,
    baseboardMeters,
    targetLux,
    requiredLumens,
    lightFixtures,
    plasterboardSheets,
    ceilingProfileMeters,
    perimeterProfileMeters,
    ceilingHangers,
  };
}

// =====================================================================
// 4b. ESTIMAREA DE COST (€ / m²)
//     cost linie = cantitate × tarif unitar(buget) × factor de stil
//     cost total = suma liniilor;  cost / m² = total ÷ aria pardoselii
//     Tarifurile sunt orientative (piața din România, material + montaj, fără TVA).
// =====================================================================
type Rates = Record<BudgetTier, number>;

// Tarife unitare pe nivel de buget: [economic, standard, premium]
const rate = (economy: number, standard: number, luxury: number): Rates => ({ economy, standard, luxury });

const UNIT_RATES = {
  flooring: rate(24, 48, 110),   // €/m² pardoseală (material + montaj)
  walls: rate(6, 11, 24),        // €/m² perete (pregătire + 2 straturi finisaj)
  ceiling: rate(17, 26, 42),     // €/m² tavan suspendat gips-carton finisat
  baseboard: rate(3, 6.5, 15),   // €/ml plintă montată
  lightInterior: rate(20, 42, 105),  // €/corp LED încastrat + cablaj
  lightOutdoor: rate(28, 60, 140),   // €/corp exterior IP65
  facade: rate(32, 62, 135),     // €/m² fațadă (termosistem + finisaj/riflaj)
  hardscape: rate(42, 75, 150),  // €/m² pavaj / deck exterior
  planting: rate(12, 26, 55),    // €/m² spațiu verde (sol, plante, gazon)
} as const;

// Mobilier și dotări specifice spațiului, în € pe m² de suprafață utilă
const FITOUT_PER_SQM: Record<string, Rates & { labelRo: string; labelEn: string }> = {
  kitchen: { ...rate(420, 800, 1600), labelRo: 'Mobilier bucătărie & electrocasnice', labelEn: 'Kitchen cabinetry & appliances' },
  'living room': { ...rate(150, 300, 650), labelRo: 'Mobilier living', labelEn: 'Living room furniture' },
  'master bedroom': { ...rate(170, 340, 760), labelRo: 'Mobilier dormitor & dulapuri', labelEn: 'Bedroom furniture & wardrobes' },
  'home office': { ...rate(130, 260, 560), labelRo: 'Mobilier birou & biblioteci', labelEn: 'Office furniture & bookcases' },
  'modern villa exterior': { ...rate(55, 110, 240), labelRo: 'Tâmplărie, copertină & intrare', labelEn: 'Joinery, canopy & entrance' },
  'townhouse facade': { ...rate(45, 90, 200), labelRo: 'Tâmplărie, copertină & balustrade', labelEn: 'Joinery, canopy & railings' },
  'commercial building': { ...rate(70, 140, 300), labelRo: 'Vitrină, copertină & pavaj', labelEn: 'Storefront, canopy & paving' },
  'backyard patio': { ...rate(70, 150, 340), labelRo: 'Pergolă, mobilier & zonă BBQ', labelEn: 'Pergola, furniture & BBQ area' },
  'poolside garden': { ...rate(160, 330, 700), labelRo: 'Piscină, deck & șezlonguri', labelEn: 'Pool, deck & loungers' },
  'front yard': { ...rate(18, 40, 95), labelRo: 'Alei, borduri & iluminat decorativ', labelEn: 'Pathways, edging & decorative lighting' },
};

const HARDSCAPE_SHARE = 0.4;  // ponderea suprafeței dalate/deck în grădini (restul = spațiu verde)
const COST_RANGE = 0.15;      // intervalul de incertitudine ±15%

const round = (n: number): number => Math.round(n);
const fmtNum = (n: number): string => String(+n.toFixed(2));

// Construiește estimarea de cost în timp real din cotele proiectului, stilul ales și buget.
export function estimateCost(
  dims: RoomDimensions,
  mode: DesignMode,
  spaceType: string,
  styleId: string,
  eng: EngineeringSpecs,
): CostEstimate {
  const budget = dims.budget;
  const styleFactor = getStyle(styleId).costFactor;
  const spaceKey = spaceType in FITOUT_PER_SQM ? spaceType : getSpace(mode, spaceType).id;
  const fitout = FITOUT_PER_SQM[spaceKey];
  const lines: CostLine[] = [];

  // Adaugă o linie: cantitate × tarif (× factorul stilului, dacă se aplică)
  const addLine = (
    id: string,
    labelRo: string,
    labelEn: string,
    quantity: number,
    unit: string,
    unitRate: number,
    withStyle: boolean,
  ) => {
    if (quantity <= 0) return;
    const factor = withStyle ? styleFactor : 1;
    const factorTxt = factor !== 1 ? ` × ${factor.toFixed(2)}` : '';
    const formula = `${fmtNum(quantity)} ${unit} × ${fmtNum(unitRate)} €/${unit}${factorTxt}`;
    lines.push({
      id,
      labelRo,
      labelEn,
      formulaRo: formula + (factor !== 1 ? ' (stil)' : ''),
      formulaEn: formula + (factor !== 1 ? ' (style)' : ''),
      total: round(quantity * unitRate * factor),
    });
  };

  if (eng.floorArea > 0) {
    if (mode === 'interiors') {
      addLine('c-floor', 'Pardoseală', 'Flooring', eng.flooringWithWaste, 'm²', UNIT_RATES.flooring[budget], true);
      addLine('c-walls', 'Finisaj pereți', 'Wall finish', eng.netWallArea, 'm²', UNIT_RATES.walls[budget], true);
      addLine('c-ceiling', 'Tavan suspendat', 'Suspended ceiling', eng.floorArea, 'm²', UNIT_RATES.ceiling[budget], false);
      addLine('c-base', 'Plintă', 'Baseboard', eng.baseboardMeters, 'ml', UNIT_RATES.baseboard[budget], false);
      addLine('c-light', 'Iluminat LED', 'LED lighting', eng.lightFixtures, 'buc', UNIT_RATES.lightInterior[budget], true);
    } else if (mode === 'exteriors') {
      addLine('c-facade', 'Fațadă (termosistem + finisaj)', 'Facade (ETICS + finish)', eng.netWallArea, 'm²', UNIT_RATES.facade[budget], true);
      addLine('c-light', 'Iluminat exterior IP65', 'Exterior lighting IP65', eng.lightFixtures, 'buc', UNIT_RATES.lightOutdoor[budget], true);
    } else {
      addLine('c-hard', 'Pavaj / deck', 'Paving / decking', eng.flooringWithWaste * HARDSCAPE_SHARE, 'm²', UNIT_RATES.hardscape[budget], true);
      addLine('c-green', 'Spațiu verde', 'Planting', eng.floorArea * (1 - HARDSCAPE_SHARE), 'm²', UNIT_RATES.planting[budget], false);
      addLine('c-light', 'Iluminat grădină', 'Garden lighting', eng.lightFixtures, 'buc', UNIT_RATES.lightOutdoor[budget], true);
    }
    addLine('c-fitout', fitout.labelRo, fitout.labelEn, eng.floorArea, 'm²', fitout[budget], true);
  }

  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return {
    lines,
    total,
    perSqm: eng.floorArea > 0 ? round(total / eng.floorArea) : 0,
    min: round(total * (1 - COST_RANGE)),
    max: round(total * (1 + COST_RANGE)),
  };
}

// =====================================================================
// 5. SPECIFICAȚII TEHNICE DE PRODUCĂTOR
//    Fiecare articol din deviz conține parametri tehnici exacti (nu prețuri de retail)
//    cu care utilizatorul poate căuta produsele independent.
// =====================================================================

// Multiplicator de calitate în funcție de buget (nu mai este preț; este un flag de calitate)
export type QualityTier = 'economy' | 'standard' | 'luxury';

function getQualityLabel(budget: BudgetTier): { ro: string; en: string } {
  if (budget === 'economy') return { ro: 'Calitate economică (clasa A)', en: 'Economy grade (class A)' };
  if (budget === 'luxury') return { ro: 'Calitate premium (clasa AAA)', en: 'Premium grade (class AAA)' };
  return { ro: 'Calitate standard (clasa AA)', en: 'Standard grade (class AA)' };
}

// Specificația unui articol din deviz — fără preț, fără link de magazin
export interface SpecItem {
  id: string;
  categoryRo: string;
  categoryEn: string;
  nameRo: string;               // denumire comercială orientativă
  nameEn: string;
  technicalSpecRo: string;      // parametri de producător (dimensiuni, material, tip, standard)
  technicalSpecEn: string;
  searchKeywordsRo: string;     // cuvinte cheie pentru căutare online
  searchKeywordsEn: string;
  quantity: string;             // cantitate calculată (ex: "14.30 m²", "3 buc.")
  included: boolean;            // poate fi debifat de utilizator
}

export function generateSpecItems(
  mode: DesignMode,
  spaceType: string,
  dims: RoomDimensions,
  eng: EngineeringSpecs,
): SpecItem[] {
  const q = getQualityLabel(dims.budget);

  // ── Exterioare ──────────────────────────────────────────────────────
  if (mode === 'exteriors') {
    return [
      {
        id: 'ext-render',
        categoryRo: 'Fațadă',
        categoryEn: 'Facade',
        nameRo: 'Tencuială decorativă siliconică + riflaj lemn termotratat',
        nameEn: 'Silicone decorative render + thermo-wood cladding',
        technicalSpecRo:
          'Tencuială siliconică hidrofugă, granulație 1.5 mm, rezistență la UV, clasa de reacție la foc A2; riflaj din lemn de pin termotratat 200°C, profil 20×120 mm, umiditate <6%, fără substanțe chimice.',
        technicalSpecEn:
          'Hydrophobic silicone render, 1.5 mm grain, UV-resistant, fire class A2; thermo-pine cladding boards 20×120 mm, moisture <6%, chemical-free treatment.',
        searchKeywordsRo: 'tencuiala siliconica decorativa exterior granulatie 1.5mm',
        searchKeywordsEn: 'silicone decorative exterior render 1.5mm grain',
        quantity: `${eng.netWallArea} m²`,
        included: true,
      },
      {
        id: 'ext-light',
        categoryRo: 'Iluminat exterior',
        categoryEn: 'Exterior lighting',
        nameRo: 'Aplice LED arhitecturale exterior IP65 (up & down)',
        nameEn: 'Architectural LED wall sconces exterior IP65',
        technicalSpecRo:
          'Corp iluminat LED integrat, IP65, fascicul bidirectionat (up/down), 3000 K, Ra>90, 800 lm, alimentare 220V, carcasă aluminiu turnat.',
        technicalSpecEn:
          'Integrated LED fixture, IP65, bi-directional beam (up/down), 3000 K, Ra>90, 800 lm, 220V, die-cast aluminium body.',
        searchKeywordsRo: 'aplica led exterior ip65 3000k bidirectional aluminiu',
        searchKeywordsEn: 'exterior led wall sconce ip65 3000k bidirectional',
        quantity: '8 buc.',
        included: true,
      },
    ];
  }

  // ── Grădini ──────────────────────────────────────────────────────────
  if (mode === 'gardens') {
    return [
      {
        id: 'gar-deck',
        categoryRo: 'Terasă & Deck',
        categoryEn: 'Patio & Deck',
        nameRo: 'Pardoseală exterioară WPC + pergolă bioclimatică aluminiu',
        nameEn: 'WPC composite decking + aluminum bioclimatic pergola',
        technicalSpecRo:
          'Pardoseală WPC (lemn-plastic) antiderapantă, profil plin 140×25 mm, rezistentă la UV și umiditate, culoare teak; pergolă aluminiu 6060 T5, lamele orientabile 0–135°, vopsit electrostatic RAL 7016.',
        technicalSpecEn:
          'WPC anti-slip decking, solid 140×25 mm profile, UV and moisture resistant, teak color; aluminium pergola 6060 T5, 0–135° adjustable louvres, electrostatic coating RAL 7016.',
        searchKeywordsRo: 'pardoseala wpc exterior 140x25mm antiderapanta teak',
        searchKeywordsEn: 'wpc composite decking 140x25mm anti-slip outdoor',
        quantity: `${eng.flooringWithWaste} m²`,
        included: true,
      },
      {
        id: 'gar-furniture',
        categoryRo: 'Mobilier grădină',
        categoryEn: 'Garden furniture',
        nameRo: 'Set mobilier lounge exterior impermeabil',
        nameEn: 'Weatherproof outdoor lounge set',
        technicalSpecRo:
          'Structură din aluminiu 5052 H32 sau ratan sintetic PE, tapițerie textilă Olefin rezistentă la apă (300 g/m²), spumă poliuretanică densitate 28 kg/m³. Cerere: 4–6 locuri.',
        technicalSpecEn:
          'Frame in 5052 H32 aluminium or PE synthetic rattan, Olefin waterproof textile (300 g/m²), PU foam 28 kg/m³. Required: 4–6 seats.',
        searchKeywordsRo: 'mobilier exterior aluminiu ratan sintetic olefin impermeabil',
        searchKeywordsEn: 'outdoor aluminium rattan lounge set olefin fabric weatherproof',
        quantity: '1 set 4–6 locuri',
        included: true,
      },
    ];
  }

  // ── Interioare ────────────────────────────────────────────────────────
  const qualityNote = q.ro;
  const qualityNoteEn = q.en;

  const items: SpecItem[] = [
    {
      id: 'mat-floor',
      categoryRo: 'Finisaje pardoseală',
      categoryEn: 'Flooring finishes',
      nameRo: 'Parchet triplustratificat stejar natur',
      nameEn: 'Engineered oak parquet',
      technicalSpecRo: `Parchet triplustratificat, strat uzură stejar 4 mm, total 14 mm, format 2200×200 mm, lac UV mat, clasa de utilizare 32 (uz rezidențial intens). ${qualityNote}.`,
      technicalSpecEn: `Engineered 3-layer parquet, 4 mm oak wear layer, total 14 mm, 2200×200 mm, UV matte lacquer, use class 32 (heavy residential). ${qualityNoteEn}.`,
      searchKeywordsRo: 'parchet triplustratificat stejar 14mm clasa 32 lac mat',
      searchKeywordsEn: 'engineered oak parquet 14mm class 32 matte lacquer',
      quantity: `${eng.flooringWithWaste} m² (+10% pierderi incluse)`,
      included: true,
    },
    {
      id: 'mat-paint',
      categoryRo: 'Finisaje pereți',
      categoryEn: 'Wall finishes',
      nameRo: 'Vopsea lavabilă mată pentru interior',
      nameEn: 'Interior matte washable paint',
      technicalSpecRo:
        'Vopsea lavabilă pe bază de apă, finisaj mat, acoperire ≥9 m²/L/strat, rezistentă la frecare umedă (clasa 2 EN 13300), fără solvenți, VOC <30 g/L.',
      technicalSpecEn:
        'Water-based washable paint, matte finish, coverage ≥9 m²/L/coat, wet scrub resistant (class 2 EN 13300), solvent-free, VOC <30 g/L.',
      searchKeywordsRo: 'vopsea lavabila mata interior clasa 2 EN13300 VOC scazut',
      searchKeywordsEn: 'matte washable interior paint class 2 EN13300 low VOC',
      quantity: `${eng.paintLiters} L (2 straturi, ${eng.netWallArea} m² arie netă)`,
      included: true,
    },
    {
      id: 'mat-plinth',
      categoryRo: 'Finisaje pardoseală',
      categoryEn: 'Flooring finishes',
      nameRo: 'Plintă duropolimer alb mat',
      nameEn: 'Matte white polymer baseboard',
      technicalSpecRo:
        'Plintă duropolimer (polistiren expandat acoperit cu răşină), profil H=80 mm, grosime 12 mm, finisaj alb mat RAL 9016, ușor de vopsit, rezistentă la umiditate.',
      technicalSpecEn:
        'Duropolymer baseboard (EPS coated with resin), H=80 mm, 12 mm thick, matte white RAL 9016, paintable, moisture-resistant.',
      searchKeywordsRo: 'plinta duropolimer 80mm alb mat RAL9016 polistiren',
      searchKeywordsEn: 'duropolymer baseboard 80mm matte white RAL9016',
      quantity: `${eng.baseboardMeters} ml (+5% rezervă)`,
      included: true,
    },
    {
      id: 'mat-gk',
      categoryRo: 'Structură / Plafon',
      categoryEn: 'Structure / Ceiling',
      nameRo: 'Sistem tavan suspendat gips-carton',
      nameEn: 'Suspended plasterboard ceiling system',
      technicalSpecRo:
        `Plăci gips-carton 12.5 mm standard GKB (EN 520), format 1200×2500 mm; profil CD 60/27 din tablă zincată 0.6 mm; profil UD 27 perimetral; bride rapide de suspensie h=100–300 mm. ${qualityNote}.`,
      technicalSpecEn:
        `Standard GKB plasterboard 12.5 mm (EN 520), 1200×2500 mm; CD 60/27 galvanized profile 0.6 mm; perimeter UD 27; rapid-adjust hangers h=100–300 mm. ${qualityNoteEn}.`,
      searchKeywordsRo: 'placa gips carton 12.5mm GKB EN520 profil CD60 bride suspensie',
      searchKeywordsEn: 'plasterboard 12.5mm GKB EN520 CD60 profile rapid hangers',
      quantity: `${eng.plasterboardSheets} plăci · ${eng.ceilingProfileMeters} ml CD · ${eng.perimeterProfileMeters} ml UD · ${eng.ceilingHangers} bride`,
      included: true,
    },
    {
      id: 'mat-light',
      categoryRo: 'Iluminat',
      categoryEn: 'Lighting',
      nameRo: 'Spoturi LED încastrate tavan (CCT 2700–3000 K)',
      nameEn: 'Recessed LED ceiling spots (CCT 2700–3000 K)',
      technicalSpecRo:
        `Corp LED încastrat Ø75 mm, flux ≥800 lm/buc., temperatura culorii 2700–3000 K, Ra≥90, unghi fascicul 38°, driver integrat 220–240V, IP20 (interior). Necesar: ${eng.lightFixtures} buc. pentru ${eng.targetLux} lx la ${eng.floorArea} m².`,
      technicalSpecEn:
        `Recessed LED Ø75 mm, flux ≥800 lm each, CCT 2700–3000 K, Ra≥90, 38° beam, integrated driver 220–240V, IP20 (indoor). Required: ${eng.lightFixtures} pcs for ${eng.targetLux} lx at ${eng.floorArea} m².`,
      searchKeywordsRo: `spot led incastrat 75mm 800lm 3000k Ra90 driver integrat IP20`,
      searchKeywordsEn: `recessed led spot 75mm 800lm 3000k Ra90 integrated driver IP20`,
      quantity: `${eng.lightFixtures} buc. · total ${eng.requiredLumens} lm · ${eng.targetLux} lx țintă`,
      included: true,
    },
  ];

  // Mobilier specific spațiului
  items.push(...getInteriorFurnitureSpec(spaceType, dims, eng));
  return items;
}

function getInteriorFurnitureSpec(
  spaceType: string,
  dims: RoomDimensions,
  eng: EngineeringSpecs,
): SpecItem[] {
  if (spaceType === 'kitchen') {
    return [
      {
        id: 'kit-cabinet',
        categoryRo: 'Mobilier bucătărie',
        categoryEn: 'Kitchen furniture',
        nameRo: 'Sistem modular bucătărie MDF + blat cuarț',
        nameEn: 'Modular MDF kitchen + quartz countertop',
        technicalSpecRo:
          'Corp MDF hidrofug 18 mm, front MDF vopsit mat sau furnir, balamale cu amortizor soft-close 110°, sertar cu ghidaje full-extension; blat cuarț agglomerat 20 mm, rezistență la zgârieturi și căldură.',
        technicalSpecEn:
          'Moisture-resistant 18 mm MDF carcass, matte painted or veneered front, 110° soft-close hinges, full-extension drawer runners; 20 mm agglomerated quartz countertop, scratch and heat resistant.',
        searchKeywordsRo: 'bucatarie MDF hidrofug 18mm soft-close blat cuart 20mm',
        searchKeywordsEn: 'MDF kitchen cabinet moisture-resistant soft-close quartz countertop 20mm',
        quantity: `L=${(dims.length * 0.85).toFixed(1)} m × H=240 cm`,
        included: true,
      },
      {
        id: 'kit-appliance',
        categoryRo: 'Electrocasnice',
        categoryEn: 'Appliances',
        nameRo: 'Pachet electrocasnice încorporabile (plită inducție + cuptor + hotă)',
        nameEn: 'Built-in appliance pack (induction hob + oven + hood)',
        technicalSpecRo:
          'Plită inducție 60 cm, 4 zone, putere totală 7.4 kW, funcție boost; cuptor multifuncțional 60 cm, volum ≥65 L, clasa A+; hotă telescopică 60 cm, debit ≥650 m³/h, filtre grase din aluminiu.',
        technicalSpecEn:
          '60 cm induction hob, 4 zones, 7.4 kW total, boost function; 60 cm multifunction oven ≥65 L, class A+; telescopic hood 60 cm, ≥650 m³/h airflow, aluminium grease filters.',
        searchKeywordsRo: 'plita inductie 60cm 7.4kw boost cuptor 65L A+ hota 650m3h',
        searchKeywordsEn: 'induction hob 60cm 7.4kw boost oven 65L class A+ extractor 650m3h',
        quantity: '1 set (3 buc.)',
        included: true,
      },
    ];
  }

  if (spaceType === 'master bedroom') {
    const wardrobeLen = +Math.min(3.6, Math.max(1.6, dims.width * 0.7)).toFixed(1);
    return [
      {
        id: 'bed-frame',
        categoryRo: 'Mobilier dormitor',
        categoryEn: 'Bedroom furniture',
        nameRo: 'Pat matrimonial tapițat king size cu tăblie înaltă',
        nameEn: 'Upholstered king-size bed with tall headboard',
        technicalSpecRo:
          'Cadru lemn masiv pin/fag, tapițerie catifea sau textil bouclé, tăblie H≥120 cm, ladă de depozitare cu mecanism hidraulic, somieră cu lamele flexibile 180×200 cm.',
        technicalSpecEn:
          'Solid pine/beech frame, velvet or bouclé textile upholstery, headboard H≥120 cm, hydraulic storage base, flexible slatted bed base 180×200 cm.',
        searchKeywordsRo: 'pat tapitat king 180x200 catifea boucle talie 120cm lada hidraulica',
        searchKeywordsEn: 'upholstered king bed 180x200 velvet bouclé headboard 120cm hydraulic storage',
        quantity: '180×200 cm, 1 buc.',
        included: true,
      },
      {
        id: 'bed-wardrobe',
        categoryRo: 'Depozitare',
        categoryEn: 'Storage',
        nameRo: 'Dulap pe comandă, uși glisante cu sistem soft-close',
        nameEn: 'Custom built-in wardrobe with soft-close sliding doors',
        technicalSpecRo:
          'Corp PAL melaminat 18 mm, glisante pe șine aluminiu extrudat cu amortizor, oglindă sau furnir pe față, organizare interioară: tijă, sertare, rafturi ajustabile.',
        technicalSpecEn:
          '18 mm melamine chipboard carcass, extruded aluminium sliding rail with damper, mirror or veneer front, interior: hanging rail, drawers, adjustable shelves.',
        searchKeywordsRo: 'dulap glisant PAL 18mm sina aluminiu soft-close oglinda organizare interior',
        searchKeywordsEn: 'sliding door wardrobe 18mm melamine aluminium track soft-close mirror interior',
        quantity: `L=${wardrobeLen} m × H=240 cm`,
        included: true,
      },
    ];
  }

  if (spaceType === 'home office') {
    const bookcaseLen = +(dims.width * 0.6).toFixed(1);
    return [
      {
        id: 'off-desk',
        categoryRo: 'Mobilier birou',
        categoryEn: 'Office furniture',
        nameRo: 'Birou ergonomic cu înălțime reglabilă electric',
        nameEn: 'Electric height-adjustable ergonomic desk',
        technicalSpecRo:
          'Blat MDF 25 mm, ramă metal, reglaj electric 70–120 cm, motor silențios (<45 dB), memorie 4 poziții, capacitate 80 kg, certificat ergonomic.',
        technicalSpecEn:
          '25 mm MDF top, metal frame, electric adjustment 70–120 cm, silent motor (<45 dB), 4 memory positions, 80 kg load, ergonomic certified.',
        searchKeywordsRo: 'birou reglabil electric 70-120cm MDF 25mm motor silentios ergonomic',
        searchKeywordsEn: 'electric height-adjustable desk 70-120cm MDF 25mm silent motor ergonomic',
        quantity: '160×75 cm, 1 buc.',
        included: true,
      },
      {
        id: 'off-bookcase',
        categoryRo: 'Depozitare',
        categoryEn: 'Storage',
        nameRo: 'Bibliotecă modulară până la tavan',
        nameEn: 'Modular floor-to-ceiling bookcase',
        technicalSpecRo:
          'Sistem modular PAL sau MDF 18 mm, coloane H=220 cm, rafturi reglabile la pas 32 mm, fixare perete prin traverse, finisaj alb mat sau furnir stejar.',
        technicalSpecEn:
          'Modular 18 mm PAL or MDF, columns H=220 cm, adjustable shelves at 32 mm pitch, wall-fixed with crossbeams, matte white or oak veneer finish.',
        searchKeywordsRo: 'biblioteca modulara PAL 18mm 220cm rafturi reglabile alb mat furnir stejar',
        searchKeywordsEn: 'modular bookcase 18mm PAL 220cm adjustable shelves matte white oak veneer',
        quantity: `L=${bookcaseLen} m × H=220 cm`,
        included: true,
      },
    ];
  }

  // Living room (fallback pentru orice spațiu interior necunoscut)
  return [
    {
      id: 'liv-sofa',
      categoryRo: 'Mobilier living',
      categoryEn: 'Living room furniture',
      nameRo: 'Canapea modulară cu șezlong',
      nameEn: 'Modular sectional sofa with chaise',
      technicalSpecRo:
        'Structură lemn pin/fag, umplutură spumă HR 35 kg/m³ + fibra, tapițerie textil structurat sau catifea, picioare lemn masiv sau metal mat, configurabil L+șezlong.',
      technicalSpecEn:
        'Pine/beech frame, HR foam 35 kg/m³ + fibre fill, structured fabric or velvet upholstery, solid wood or matte metal legs, L-shape + chaise configurable.',
      searchKeywordsRo: 'canapea modulara HR35 textil structurat sezlong picioare lemn',
      searchKeywordsEn: 'modular sectional sofa HR35 structured fabric chaise solid wood legs',
      quantity: `Adaptat la ${eng.floorArea} m²`,
      included: true,
    },
    {
      id: 'liv-tv',
      categoryRo: 'Mobilier living',
      categoryEn: 'Living room furniture',
      nameRo: 'Comodă TV suspendată + măsuță cafea',
      nameEn: 'Wall-mounted TV unit + coffee table',
      technicalSpecRo:
        'Comodă TV: PAL melaminat sau MDF vopsit mat, suspendat la h=40 cm de pardoseală, L=160–200 cm, cablu management integrat. Măsuță: blat sticlă temperată 8 mm sau PAL, picioare metal.',
      technicalSpecEn:
        'TV unit: melamine PAL or matte MDF, wall-hung at h=40 cm, L=160–200 cm, integrated cable management. Coffee table: 8 mm tempered glass or PAL top, metal legs.',
      searchKeywordsRo: 'comoda tv suspendata MDF mat 160cm management cabluri masuta sticla temperata',
      searchKeywordsEn: 'wall-mounted TV unit MDF 160cm cable management coffee table tempered glass',
      quantity: '1 set (2 buc.)',
      included: true,
    },
  ];
}