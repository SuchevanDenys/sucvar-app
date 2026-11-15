// app/data/spaces.ts
// Catalogul de spații: 9 interioare, 4 exterioare, 3 grădini. Fiecare spațiu are
// dimensiuni implicite realiste, presetări de mărime, scenarii arhitecturale (chips),
// nivel de iluminare țintă și tarife de dotare (mobilier / echipamente).
// `catalog.ts` re-exportă tot ce se află aici, deci importurile existente rămân valabile.
import type { BudgetTier, DesignMode, SizePresetId } from '@/app/types';

// ── Tipuri ─────────────────────────────────────────────────────────────
export interface LayoutOption {
  id: string;
  labelRo: string;
  labelEn: string;
  prompt: string;
}

/** Scenariu arhitectural real (chip): îmbogățește promptul AI și contextul de materiale. */
export interface ScenarioOption {
  id: string;
  labelRo: string;
  labelEn: string;
  /** Fragment scurt EN (≤ 8 cuvinte) adăugat în promptul AI */
  prompt: string;
  /** Materiale / echipamente tipice scenariului, afișate sub chips și în specificații */
  materialRo: string;
  materialEn: string;
}

export type Rates = Record<BudgetTier, number>;

export interface FitoutRate extends Rates {
  labelRo: string;
  labelEn: string;
}

export interface SpaceDefaults {
  width: number;
  length: number;
  height: number;
  doorsCount: number;
  windowsCount: number;
}

export interface SizePreset {
  width: number;
  length: number;
  height?: number;
}

export interface SpaceOption {
  id: string;
  labelRo: string;
  labelEn: string;
  scenePrompt: string;
  layouts: LayoutOption[];
  scenarios: ScenarioOption[];
  /** Cote implicite realiste (= presetarea „Standard”) */
  defaults: SpaceDefaults;
  /** Presetările „Compact” și „Spacious”; „Standard” se derivă din `defaults` */
  sizePresets: Record<Exclude<SizePresetId, 'standard'>, SizePreset>;
  /** Nivel de iluminare recomandat (lx) pentru metoda lumenului */
  targetLux: number;
  /** Mobilier / dotări specifice spațiului, în € pe m² */
  fitout: FitoutRate;
  /** Multiplicator pe pardoseală + pereți (ex. baia: gresie, faianță, hidroizolație) */
  finishFactor: number;
  /** Exterior: „facade” = deviz pe suprafața pereților, „surface” = deviz pe suprafață orizontală */
  costBasis: 'facade' | 'surface';
  /** Grădini: ponderea suprafeței dalate / deck (restul = spațiu verde) */
  hardscapeShare: number;
}

export interface ModeConfig {
  labelRo: string;
  labelEn: string;
  spaces: SpaceOption[];
}

// ── Constructori compacți (păstrează datele lizibile) ──────────────────
const lay = (id: string, labelRo: string, labelEn: string, prompt: string): LayoutOption => ({
  id,
  labelRo,
  labelEn,
  prompt,
});

const sc = (
  id: string,
  labelRo: string,
  labelEn: string,
  prompt: string,
  materialRo: string,
  materialEn: string,
): ScenarioOption => ({ id, labelRo, labelEn, prompt, materialRo, materialEn });

const rate = (economy: number, standard: number, luxury: number): Rates => ({ economy, standard, luxury });

const fit = (labelRo: string, labelEn: string, economy: number, standard: number, luxury: number): FitoutRate => ({
  ...rate(economy, standard, luxury),
  labelRo,
  labelEn,
});

const dims = (
  width: number,
  length: number,
  height: number,
  doorsCount: number,
  windowsCount: number,
): SpaceDefaults => ({ width, length, height, doorsCount, windowsCount });

const preset = (width: number, length: number, height?: number): SizePreset => ({ width, length, height });

// ── Layout-uri comune pentru fațade ────────────────────────────────────
const FACADE_LAYOUTS: LayoutOption[] = [
  lay(
    'ventilated_facade',
    'Fațadă ventilată cu lemn termotratat și sticlă panoramică',
    'Ventilated facade with thermo-wood and panoramic glass',
    'thermo-treated wood cladding, large floor-to-ceiling black aluminum windows, warm wall sconces',
  ),
  lay(
    'minimal_white',
    'Tencuială albă + accente de piatră naturală (ardezie)',
    'White render + natural slate stone accents',
    'white minimalist render, dark slate stone accent wall, architectural driveway lighting',
  ),
];

// ======================================================================
// Spațiile aplicației, grupate pe cele 3 categorii
// ======================================================================
export const SPACE_MODES: Record<DesignMode, ModeConfig> = {
  // ─────────────────────────── INTERIOARE ───────────────────────────
  interiors: {
    labelRo: 'Interioare',
    labelEn: 'Interiors',
    spaces: [
      {
        id: 'living room',
        labelRo: 'Living / Open-Space',
        labelEn: 'Living / Open-Space',
        scenePrompt:
          'fully furnished modern living room featuring a large comfortable sofa, two armchairs, coffee table, TV media unit, area rug, floor lamp, curtains',
        layouts: [
          lay('open_lounge', 'Open-space (canapea pe axul TV + zonă dining)', 'Open-space (sofa on TV axis + dining area)', 'open-plan layout, sofa facing the media wall, dining table near the window'),
          lay('sectional_media_wall', 'Colțar modular + perete media cu rafturi încorporate', 'Sectional sofa + media wall with built-in shelving', 'L-shaped sectional sofa facing a media wall with built-in shelving'),
        ],
        scenarios: [
          sc('liv_fireplace', 'Șemineu cu bioetanol & perete de piatră', 'Bioethanol fireplace & stone feature wall', 'linear fireplace in stone feature wall', 'Piatră naturală placată, focar bioetanol, nișă TV încastrată', 'Stone cladding, bioethanol burner, recessed TV niche'),
          sc('liv_dining', 'Zonă de dining integrată (masă 6 persoane)', 'Integrated dining zone (seats 6)', 'integrated dining table for six, pendant light', 'Masă extensibilă, scaune tapițate, corp de iluminat suspendat', 'Extendable table, upholstered chairs, pendant fixture'),
          sc('liv_library', 'Bibliotecă încorporată & colț de lectură', 'Built-in library & reading nook', 'built-in bookshelves, reading nook armchair', 'Rafturi MDF până în tavan, iluminat LED în nișe', 'Floor-to-ceiling MDF shelving, LED niche lighting'),
          sc('liv_terrace', 'Ieșire spre terasă prin uși glisante', 'Terrace access via sliding doors', 'floor-to-ceiling sliding glass doors to terrace', 'Tâmplărie glisantă aluminiu, sticlă triplă, prag îngropat', 'Aluminium lift-slide frames, triple glazing, flush threshold'),
        ],
        defaults: dims(4.5, 6, 2.7, 1, 2),
        sizePresets: { compact: preset(3.6, 5), spacious: preset(6, 8) },
        targetLux: 200,
        fitout: fit('Mobilier living', 'Living room furniture', 150, 300, 650),
        finishFactor: 1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'kitchen',
        labelRo: 'Bucătărie',
        labelEn: 'Kitchen',
        scenePrompt:
          'fully furnished modern kitchen with fitted cabinetry, kitchen island with bar stools, built-in appliances, pendant lights',
        layouts: [
          lay('l_island', 'Bucătărie în L + insulă centrală (triunghi ergonomic)', 'L-shape kitchen + central island (work triangle)', 'L-shaped ergonomic layout, central marble island, sink by the window'),
          lay('u_shape', 'Configurație în U pe 3 pereți (depozitare maximă)', 'U-shape, 3-wall configuration (max storage)', 'U-shaped layout on three walls, tall pantry cabinets, LED counter lighting'),
        ],
        scenarios: [
          sc('kit_island', 'Insulă centrală & electrocasnice încorporate', 'Central island & built-in appliances', 'central island with built-in hob and oven', 'Blat cuarț 20 mm, plită inducție încastrată, hotă insulară', 'Quartz top 20 mm, flush induction hob, island hood'),
          sc('kit_linear', 'Bucătărie liniară compactă', 'Compact linear kitchen', 'compact single-wall linear kitchen', 'Corpuri 60 cm modulare, electrocasnice 60 cm, blat 38 mm', 'Modular 60 cm units, 60 cm appliances, 38 mm worktop'),
          sc('kit_dining', 'Open-space cu zonă de dining', 'Open-plan with dining area', 'open-plan kitchen flowing into dining table', 'Masă dining 160 cm, iluminat suspendat pe două puncte', '160 cm dining table, two-point pendant lighting'),
          sc('kit_pantry', 'Cămară walk-in & coloane ascunse', 'Walk-in pantry & concealed columns', 'tall handleless pantry columns, hidden storage', 'Coloane H 240 cm, uși push-to-open, sertare organizate', '240 cm columns, push-to-open doors, organised drawers'),
        ],
        defaults: dims(3.5, 4.5, 2.6, 1, 1),
        sizePresets: { compact: preset(2.5, 3.5), spacious: preset(5, 6.5) },
        targetLux: 300,
        fitout: fit('Mobilier bucătărie & electrocasnice', 'Kitchen cabinetry & appliances', 420, 800, 1600),
        finishFactor: 1.15,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'master bedroom',
        labelRo: 'Dormitor',
        labelEn: 'Bedroom',
        scenePrompt:
          'fully furnished modern bedroom featuring a luxury upholstered king bed, two nightstands with lamps, integrated ambient lighting, custom wardrobe, bedding and curtains',
        layouts: [
          lay('bed_symmetric', 'Pat central pe peretele tăbliei + noptiere simetrice', 'Centered bed on headboard wall + symmetrical nightstands', 'king bed centered on the headboard wall, symmetrical nightstands, wall sconces'),
          lay('bed_wardrobe_wall', 'Perete de dulapuri încorporate + colț de lectură', 'Built-in wardrobe wall + reading corner', 'floor-to-ceiling built-in wardrobe wall, king bed, reading armchair by the window'),
        ],
        scenarios: [
          sc('bed_headboard', 'Perete accent cu tăblie lambrisată', 'Accent wall with panelled headboard', 'panelled headboard accent wall, wall sconces', 'Lambriu MDF vopsit, aplice cu braț reglabil', 'Painted MDF panelling, swing-arm sconces'),
          sc('bed_suite', 'Suită parentală cu dressing & baie', 'Master suite with dressing & ensuite', 'master suite with open dressing area', 'Sticlă securizată 8 mm, ușă pivotantă, pardoseală continuă', '8 mm tempered glass, pivot door, continuous flooring'),
          sc('bed_blackout', 'Draperii blackout & lumină ambientală', 'Blackout curtains & ambient light', 'full-height blackout curtains, cove lighting', 'Draperii dublu-strat pe șină ascunsă, bandă LED 2700 K', 'Double-layer curtains on recessed track, 2700 K LED strip'),
          sc('bed_workspace', 'Colț de birou integrat în dormitor', 'Integrated desk corner', 'compact built-in desk corner by the window', 'Blat suspendat 60 cm, priză integrată, corp liniar', '60 cm floating desk, integrated outlet, linear lamp'),
        ],
        defaults: dims(3.8, 4.5, 2.6, 1, 1),
        sizePresets: { compact: preset(3, 3.6), spacious: preset(5, 6) },
        targetLux: 150,
        fitout: fit('Mobilier dormitor & dulapuri', 'Bedroom furniture & wardrobes', 170, 340, 760),
        finishFactor: 1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'bathroom',
        labelRo: 'Baie / Spa',
        labelEn: 'Bathroom / Spa',
        scenePrompt:
          'fully finished modern bathroom with vanity unit and mirror, walk-in shower, toilet, towel radiator, recessed lighting',
        layouts: [
          lay('bath_walkin', 'Duș walk-in + lavoar suspendat pe peretele opus', 'Walk-in shower + wall-hung vanity opposite', 'walk-in shower with glass screen, floating vanity, large mirror'),
          lay('bath_tub_window', 'Cadă sub fereastră + vanity dublu', 'Bathtub under window + double vanity', 'bathtub under the window, double vanity, wall niches'),
        ],
        scenarios: [
          sc('bath_walkin', 'Duș walk-in & plăci format mare', 'Walk-in shower & large-format tiles', 'walk-in shower, large-format porcelain slabs', 'Gresie 120×60 rectificată, rigolă liniară, sticlă 8 mm', 'Rectified 120×60 tiles, linear drain, 8 mm glass'),
          sc('bath_tub', 'Cadă freestanding & lumină ambientală', 'Freestanding tub & ambient lighting', 'freestanding bathtub, soft ambient cove light', 'Cadă acril/piatră compozită, baterie pe pardoseală, LED 2700 K', 'Acrylic/composite tub, floor-mounted tap, 2700 K LED'),
          sc('bath_double', 'Lavoar dublu & oglinzi iluminate', 'Double vanity & lit mirrors', 'double floating vanity, backlit mirrors', 'Blat cuarț, oglinzi LED antiaburire, sifoane ascunse', 'Quartz top, anti-fog LED mirrors, concealed traps'),
          sc('bath_sauna', 'Colț de spa: saună infraroșu & duș ploaie', 'Spa corner: infrared sauna & rain shower', 'infrared sauna cabin, rain shower, natural stone', 'Cabină saună lemn cedru, duș cap 30 cm, piatră naturală', 'Cedar sauna cabin, 30 cm rain head, natural stone'),
        ],
        defaults: dims(2.2, 3, 2.5, 1, 1),
        sizePresets: { compact: preset(1.7, 2.4), spacious: preset(3.2, 4) },
        targetLux: 200,
        fitout: fit('Obiecte sanitare, vanity & cabină duș', 'Sanitaryware, vanity & shower', 480, 900, 1900),
        finishFactor: 1.6,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'home office',
        labelRo: 'Birou / Home Office',
        labelEn: 'Home Office',
        scenePrompt:
          'fully furnished home office featuring a large wooden desk, ergonomic office chair, built-in bookshelves, task lamp, area rug, laptop on the desk',
        layouts: [
          lay('desk_window', 'Birou orientat spre fereastră + biblioteci încorporate', 'Desk facing the window + built-in bookshelves', 'desk placed in front of the window, built-in bookshelves on the side wall'),
          lay('desk_l_shape', 'Birou în L pe perete + rafturi până în tavan', 'L-shaped wall desk + floor-to-ceiling shelving', 'L-shaped desk along the wall, floor-to-ceiling shelving, focused task lighting'),
        ],
        scenarios: [
          sc('off_standing', 'Birou reglabil electric & dual-monitor', 'Standing desk & dual-monitor setup', 'electric standing desk with dual monitors', 'Blat 160×75, motor dublu, braț monitor, management cabluri', '160×75 top, dual motor, monitor arm, cable management'),
          sc('off_meeting', 'Colț de întâlniri pentru clienți', 'Client meeting corner', 'small round meeting table with two chairs', 'Masă Ø90, scaune tapițate, panou acustic', 'Ø90 table, upholstered chairs, acoustic panel'),
          sc('off_acoustic', 'Panouri acustice & izolare fonică', 'Acoustic panels & sound insulation', 'acoustic wall panels, quiet focused atmosphere', 'Panouri fonoabsorbante PET, ușă cu garnitură', 'PET acoustic panels, gasketed door'),
          sc('off_library', 'Perete bibliotecă cu scară de rafturi', 'Library wall with shelving ladder', 'wall-to-wall library with rolling ladder', 'Rafturi stejar 220 cm, scară pe șină, iluminat în nișe', '220 cm oak shelving, rail ladder, niche lighting'),
        ],
        defaults: dims(3, 3.5, 2.6, 1, 1),
        sizePresets: { compact: preset(2.2, 2.8), spacious: preset(4, 5) },
        targetLux: 500,
        fitout: fit('Mobilier birou & biblioteci', 'Office furniture & bookcases', 130, 260, 560),
        finishFactor: 1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'entryway',
        labelRo: 'Hol / Intrare',
        labelEn: 'Hall / Entryway',
        scenePrompt:
          'fully furnished modern entryway with a built-in shoe cabinet, bench, wall mirror, coat hooks, console table, pendant light',
        layouts: [
          lay('hall_cabinet', 'Dulap încastrat pe un perete + bancă de încălțat', 'Built-in cabinet wall + shoe bench', 'full-height built-in cabinet wall, bench seat, tall mirror'),
          lay('hall_console', 'Consolă centrală + oglindă mare + cuier', 'Console + large mirror + coat rack', 'slim console table, oversized mirror, coat rack'),
        ],
        scenarios: [
          sc('hall_storage', 'Dulap încorporat & bancă de încălțat', 'Built-in storage & shoe bench', 'built-in cabinetry with integrated bench', 'Corp PAL 18 mm, bancă tapițată, sertare pantofi', '18 mm PAL carcass, upholstered bench, shoe drawers'),
          sc('hall_mirror', 'Oglindă full-height & iluminat accent', 'Full-height mirror & accent lighting', 'full-height mirror with accent wall lighting', 'Oglindă 6 mm, bandă LED perimetrală', '6 mm mirror, perimeter LED strip'),
          sc('hall_tile', 'Pardoseală rezistentă din gresie mare', 'Durable large-format tile floor', 'large-format stone-look tile floor', 'Gresie 80×80 antiderapantă R10', 'Anti-slip R10 80×80 tiles'),
        ],
        defaults: dims(2, 4, 2.6, 2, 0),
        sizePresets: { compact: preset(1.5, 3), spacious: preset(3, 5.5) },
        targetLux: 100,
        fitout: fit('Mobilier hol & depozitare', 'Hall furniture & storage', 120, 240, 520),
        finishFactor: 1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'attic loft',
        labelRo: 'Mansardă',
        labelEn: 'Attic Loft',
        scenePrompt:
          'fully furnished attic loft room with sloped ceiling, exposed timber beams, skylight windows, cozy sofa, bed or desk, built-in under-eave storage',
        layouts: [
          lay('attic_open', 'Spațiu deschis sub șarpantă + grinzi aparente', 'Open plan under the roof + exposed beams', 'open attic under pitched roof, exposed timber beams, skylights'),
          lay('attic_zoned', 'Zonare: dormit + lucru sub luminatoare', 'Zoned: sleeping + working under skylights', 'sleeping area and desk zone, roof windows, eave storage'),
        ],
        scenarios: [
          sc('attic_skylight', 'Ferestre de mansardă & lumină zenitală', 'Roof windows & zenithal light', 'large roof windows flooding the room with light', 'Ferestre Velux 78×140, rulouri exterioare de protecție solară', '78×140 roof windows, external solar-shading blinds'),
          sc('attic_eave', 'Depozitare încorporată sub streașină', 'Built-in under-eave storage', 'custom built-in storage along low sloped walls', 'Dulapuri pe comandă la înclinație, sertare pe ghidaje', 'Custom sloped-wall units, full-extension drawers'),
          sc('attic_beams', 'Grinzi aparente restaurate', 'Restored exposed beams', 'restored exposed wooden roof beams, white walls', 'Grinzi lemn tratate ignifug, izolație 20 cm sub căprior', 'Fire-treated timber, 20 cm under-rafter insulation'),
          sc('attic_suite', 'Mansardă ca suită de oaspeți cu mini-baie', 'Guest suite with mini-bath', 'attic guest suite with compact ensuite shower', 'Baie prefabricată compactă, ventilație mecanică', 'Compact prefab bathroom, mechanical ventilation'),
        ],
        defaults: dims(4.5, 7, 2.4, 1, 2),
        sizePresets: { compact: preset(3.5, 5), spacious: preset(6, 9) },
        targetLux: 200,
        fitout: fit('Mobilier mansardă & depozitare sub streașină', 'Loft furniture & eave storage', 160, 320, 700),
        finishFactor: 1.1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'walk-in closet',
        labelRo: 'Dressing / Walk-in Closet',
        labelEn: 'Walk-in Closet',
        scenePrompt:
          'fully fitted walk-in closet with floor-to-ceiling wardrobes, hanging rails, shelves, drawers island, mirror, integrated LED lighting',
        layouts: [
          lay('closet_u', 'Dressing în U cu insulă de sertare', 'U-shaped closet with drawer island', 'U-shaped wardrobe system, central drawer island with glass top'),
          lay('closet_parallel', 'Două pereți paraleli + oglindă la capăt', 'Two parallel walls + end mirror', 'parallel wardrobe walls, full-length mirror at the end'),
        ],
        scenarios: [
          sc('clo_island', 'Insulă centrală cu sertare & blat sticlă', 'Central island with glass-top drawers', 'central island with glass-top drawers', 'Sertare soft-close, blat sticlă 8 mm, separatoare', 'Soft-close drawers, 8 mm glass top, dividers'),
          sc('clo_led', 'Iluminat LED integrat cu senzor', 'Integrated LED with motion sensor', 'integrated LED strips with motion sensor', 'Profile LED 3000 K, senzor PIR pe ușă', '3000 K LED profiles, PIR door sensor'),
          sc('clo_shoes', 'Perete dedicat pantofi & genți', 'Dedicated shoe & bag wall', 'illuminated shoe and handbag display wall', 'Rafturi înclinate, fund oglindă, vitrină sticlă', 'Angled shelves, mirrored back, glass display'),
        ],
        defaults: dims(2.2, 3, 2.6, 1, 0),
        sizePresets: { compact: preset(1.8, 2.4), spacious: preset(3.2, 4) },
        targetLux: 200,
        fitout: fit('Sistem dressing pe comandă', 'Custom closet system', 380, 720, 1500),
        finishFactor: 0.9,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'commercial cafe',
        labelRo: 'Spațiu Comercial / Cafenea',
        labelEn: 'Commercial / Café',
        scenePrompt:
          'stylish commercial cafe interior with service counter, espresso machine, bar stools, small tables with chairs, pendant lights, display shelving',
        layouts: [
          lay('cafe_counter', 'Tejghea frontală + locuri la geam', 'Front counter + window seating', 'long service counter, window bench seating, small round tables'),
          lay('cafe_lounge', 'Zonă lounge + bar lateral', 'Lounge zone + side bar', 'lounge sofas, side bar with stools, warm pendant lighting'),
        ],
        scenarios: [
          sc('caf_counter', 'Tejghea de servire cu vitrină frigorifică', 'Service counter with chilled display', 'long service counter with chilled pastry display', 'Tejghea corian, vitrină refrigerată 1.5 m, espressor profesional', 'Solid-surface counter, 1.5 m chilled display, pro espresso'),
          sc('caf_window', 'Bar la geam & scaune înalte', 'Window bar & high stools', 'window bar with high stools facing the street', 'Blat lemn masiv 40 mm, taburete h 75 cm', '40 mm solid timber top, 75 cm stools'),
          sc('caf_lounge', 'Zonă lounge cu canapele & lumină caldă', 'Lounge zone with sofas & warm light', 'cozy lounge corner, velvet sofas, warm light', 'Canapele tapițate ignifug (M1), corpuri 2700 K', 'Fire-rated upholstery (M1), 2700 K fixtures'),
          sc('caf_acoustic', 'Tavan acustic & materiale rezistente', 'Acoustic ceiling & hard-wearing finishes', 'acoustic baffle ceiling, durable terrazzo floor', 'Baffle fonoabsorbant, pardoseală terrazzo, pereți lavabili', 'Acoustic baffles, terrazzo floor, washable walls'),
        ],
        defaults: dims(6, 9, 3.2, 2, 3),
        sizePresets: { compact: preset(4.5, 6.5), spacious: preset(9, 14) },
        targetLux: 300,
        fitout: fit('Mobilier HoReCa, tejghea & echipamente', 'HoReCa furniture, counter & equipment', 260, 520, 1100),
        finishFactor: 1.2,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
    ],
  },

  // ─────────────────────────── EXTERIOARE ───────────────────────────
  exteriors: {
    labelRo: 'Exterioare & Fațade',
    labelEn: 'Exteriors & Facades',
    spaces: [
      {
        id: 'modern villa exterior',
        labelRo: 'Fațadă Casă / Vilă',
        labelEn: 'House / Villa Facade',
        scenePrompt:
          'modern single-family villa exterior with a finished facade, entrance door, landscaped front garden, driveway',
        layouts: FACADE_LAYOUTS,
        scenarios: [
          sc('fac_wood', 'Placări din lemn termotratat', 'Thermo-wood cladding accents', 'thermo-treated wood cladding accents', 'Riflaj pin termotratat 20×120, sistem ventilat', '20×120 thermo-pine boards, ventilated system'),
          sc('fac_glass', 'Vitraje panoramice & tâmplărie neagră', 'Panoramic glazing & black frames', 'panoramic glazing with slim black frames', 'Tâmplărie aluminiu cu ruptură termică, sticlă Low-E', 'Thermally broken aluminium, Low-E glass'),
          sc('fac_roof', 'Acoperiș plat cu atic & streașină lungă', 'Flat roof with parapet & deep eaves', 'flat roof with deep cantilevered eaves', 'Hidroizolație membrană PVC, atic termoizolat', 'PVC membrane waterproofing, insulated parapet'),
          sc('fac_light', 'Iluminat arhitectural de fațadă', 'Architectural facade lighting', 'architectural wall-wash facade lighting at dusk', 'Aplice IP65 up/down 3000 K, proiectoare de grădină', 'IP65 up/down sconces 3000 K, garden spotlights'),
        ],
        defaults: dims(9, 11, 6.5, 2, 8),
        sizePresets: { compact: preset(7, 9, 5.5), spacious: preset(12, 15, 7.5) },
        targetLux: 30,
        fitout: fit('Tâmplărie, copertină & intrare', 'Joinery, canopy & entrance', 55, 110, 240),
        finishFactor: 1,
        costBasis: 'facade',
        hardscapeShare: 0.4,
      },
      {
        id: 'terrace pergola',
        labelRo: 'Terasă & Pergolă',
        labelEn: 'Terrace & Pergola',
        scenePrompt:
          'covered terrace with an aluminum pergola, outdoor sofa set, dining table with chairs, planters, string lights',
        layouts: [
          lay('terr_lounge', 'Lounge + dining sub pergolă', 'Lounge + dining under the pergola', 'pergola over lounge and dining zones, decking floor'),
          lay('terr_firepit', 'Zonă de foc & scaune joase', 'Fire pit zone + low seating', 'fire pit with low lounge seating, timber deck'),
        ],
        scenarios: [
          sc('ter_bio', 'Pergolă bioclimatică cu lamele reglabile', 'Bioclimatic pergola with louvres', 'bioclimatic pergola with adjustable louvres', 'Aluminiu 6060 T5, lamele 0–135°, senzor ploaie/vânt', '6060 T5 aluminium, 0–135° louvres, rain/wind sensor'),
          sc('ter_deck', 'Deck WPC antiderapant', 'Anti-slip WPC decking', 'warm composite deck flooring', 'WPC 140×25 antiderapant, subconstrucție ventilată', 'Anti-slip 140×25 WPC, ventilated substructure'),
          sc('ter_screen', 'Paravane & perdele exterioare', 'Privacy screens & outdoor curtains', 'slatted privacy screens, outdoor curtains', 'Lamele aluminiu aspect lemn, draperii impermeabile', 'Wood-look aluminium slats, waterproof drapes'),
          sc('ter_heater', 'Încălzire cu infraroșu & iluminat ambiental', 'Infrared heating & ambient lighting', 'infrared heaters and soft ambient lighting', 'Radiatoare IR 2 kW IP65, ghirlande LED', '2 kW IP65 IR heaters, LED festoons'),
        ],
        defaults: dims(4, 6, 2.8, 1, 0),
        sizePresets: { compact: preset(3, 4), spacious: preset(6, 9) },
        targetLux: 50,
        fitout: fit('Pergolă, mobilier & accesorii', 'Pergola, furniture & accessories', 90, 190, 420),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.4,
      },
      {
        id: 'balcony',
        labelRo: 'Balcon / Logie',
        labelEn: 'Balcony / Loggia',
        scenePrompt:
          'cozy urban balcony with a bistro table and chairs, planters, railing, wooden deck tiles, string lights',
        layouts: [
          lay('balc_bistro', 'Set bistro + jardiniere pe balustradă', 'Bistro set + railing planters', 'bistro table for two, railing planters, deck tiles'),
          lay('balc_lounge', 'Banchetă încorporată cu depozitare', 'Built-in bench with storage', 'built-in storage bench with cushions, vertical garden'),
        ],
        scenarios: [
          sc('bal_greens', 'Grădină verticală & jardiniere', 'Vertical garden & planters', 'vertical garden wall with planters', 'Panouri modulare irigate, jardiniere aluminiu', 'Irrigated modular panels, aluminium planters'),
          sc('bal_glazed', 'Închidere cu vitraj glisant (logie)', 'Sliding glazing enclosure (loggia)', 'frameless sliding glass enclosure', 'Sistem glisant fără ramă 8 mm, ancorare certificată', 'Frameless 8 mm sliding system, certified anchoring'),
          sc('bal_deck', 'Dale de lemn & mobilier pliabil', 'Wooden deck tiles & foldable furniture', 'click-in wooden deck tiles, folding furniture', 'Dale acacia 30×30 clic, mobilier pliabil', 'Click-in acacia 30×30 tiles, folding furniture'),
        ],
        defaults: dims(1.6, 4, 2.5, 1, 0),
        sizePresets: { compact: preset(1.2, 2.5), spacious: preset(2.2, 6) },
        targetLux: 50,
        fitout: fit('Mobilier balcon & jardiniere', 'Balcony furniture & planters', 60, 130, 300),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.4,
      },
      {
        id: 'poolside deck',
        labelRo: 'Zonă Piscină & Lounge',
        labelEn: 'Poolside Deck & Lounge',
        scenePrompt:
          'poolside deck with a rectangular swimming pool, timber deck, sun loungers, parasol, outdoor planters',
        layouts: [
          lay('pool_deck', 'Piscină dreptunghiulară + deck din lemn + șezlonguri', 'Rectangular pool + timber deck + sun loungers', 'rectangular pool with timber deck, sun loungers, ambient garden lighting'),
          lay('pool_infinity', 'Piscină infinity + zonă lounge', 'Infinity pool + lounge area', 'infinity edge pool, lounge area, glass balustrade'),
        ],
        scenarios: [
          sc('pool_infinity', 'Piscină infinity cu margine de preaplin', 'Infinity-edge pool', 'infinity edge pool overlooking the garden', 'Beton armat hidroizolat, mozaic sticlă, skimmer ascuns', 'Waterproofed RC, glass mosaic, hidden skimmer'),
          sc('pool_lounge', 'Șezlonguri & zonă de umbră', 'Sun loungers & shade area', 'sun loungers under large parasol and shade sail', 'Șezlonguri aluminiu/textilenă, parasol Ø350', 'Aluminium/textilene loungers, Ø350 parasol'),
          sc('pool_light', 'Iluminat subacvatic & de ambient', 'Underwater & ambient lighting', 'glowing underwater pool lights at dusk', 'Proiectoare LED RGB IP68, alimentare 12 V', 'IP68 RGB LED lights, 12 V supply'),
          sc('pool_bar', 'Bar exterior & duș de piscină', 'Outdoor bar & pool shower', 'outdoor bar counter and pool shower', 'Tejghea piatră, duș inox, bar cu frigider exterior', 'Stone counter, stainless shower, outdoor fridge bar'),
        ],
        defaults: dims(8, 12, 2.5, 0, 0),
        sizePresets: { compact: preset(6, 9), spacious: preset(10, 16) },
        targetLux: 50,
        fitout: fit('Piscină, deck & șezlonguri', 'Pool, deck & loungers', 160, 330, 700),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.4,
      },
    ],
  },

  // ─────────────────────────── GRĂDINI ───────────────────────────
  gardens: {
    labelRo: 'Grădini & Peisagistică',
    labelEn: 'Gardens & Landscape',
    spaces: [
      {
        id: 'residential garden',
        labelRo: 'Grădină Rezidențială',
        labelEn: 'Residential Garden',
        scenePrompt:
          'landscaped residential garden with a green lawn, ornamental shrubs, trees, flower beds, stone pathway, low garden lights',
        layouts: [
          lay('garden_lawn', 'Gazon central + borduri florale + alee', 'Central lawn + flower borders + path', 'central lawn, layered flower borders, curved stone path'),
          lay('garden_terraced', 'Terase la nivele cu ziduri de sprijin', 'Terraced levels with retaining walls', 'terraced garden levels, low stone retaining walls, steps'),
        ],
        scenarios: [
          sc('gar_perennial', 'Straturi de graminee & perene', 'Layered grasses & perennials', 'layered ornamental grasses and perennial beds', 'Graminee, lavandă, hortensii; mulci și irigație prin picurare', 'Grasses, lavender, hydrangea; mulch and drip irrigation'),
          sc('gar_trees', 'Arbori ornamentali & pâlcuri umbrite', 'Ornamental trees & shaded groves', 'ornamental trees casting dappled shade', 'Arbori 8–10 cm girth, ancorare subterană', '8–10 cm girth trees, underground anchoring'),
          sc('gar_light', 'Iluminat peisager jos & spoturi pe arbori', 'Low landscape lighting & tree uplights', 'low path lights and tree uplighting at dusk', 'Balize LED IP65 12 V, proiectoare reglabile', 'IP65 12 V bollards, adjustable uplights'),
          sc('gar_water', 'Luciu de apă & peisaj acvatic', 'Water feature & pond', 'small natural water feature with stone edge', 'Lac cu geomembrană EPDM, pompă recirculare', 'EPDM-lined pond, recirculation pump'),
        ],
        defaults: dims(12, 20, 3, 0, 0),
        sizePresets: { compact: preset(8, 12), spacious: preset(20, 30) },
        targetLux: 30,
        fitout: fit('Mobilier, iluminat decorativ & irigații', 'Furniture, decorative lighting & irrigation', 30, 70, 160),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.3,
      },
      {
        id: 'outdoor pavilion',
        labelRo: 'Foișor & Bucătărie de Vară',
        labelEn: 'Pavilion & Outdoor Kitchen',
        scenePrompt:
          'garden pavilion with outdoor kitchen, built-in barbecue, dining table with chairs, timber roof structure, pendant lights',
        layouts: [
          lay('pav_bbq', 'Bucătărie liniară + masă lungă dining', 'Linear kitchen + long dining table', 'linear outdoor kitchen with barbecue, long dining table'),
          lay('pav_lounge', 'Foișor cu șemineu & zonă lounge', 'Pavilion with fireplace & lounge', 'timber pavilion with stone fireplace and lounge seating'),
        ],
        scenarios: [
          sc('pav_kitchen', 'Bucătărie de vară cu grătar & plită', 'Summer kitchen with grill & hob', 'built-in grill, side hob and stone counter', 'Grătar inox 304, blat granit, corp inox IP-resistent', '304 stainless grill, granite top, weather-rated cabinets'),
          sc('pav_oven', 'Cuptor pe lemne & zonă de preparare', 'Wood-fired oven & prep zone', 'wood-fired pizza oven with prep counter', 'Cuptor refractar, coș inox dublu perete', 'Refractory oven, double-wall stainless flue'),
          sc('pav_roof', 'Structură lemn lamelar & acoperiș verde', 'Glulam structure & green roof', 'glulam timber frame with green roof', 'Lemn lamelat GL24h, hidroizolație, sedum', 'GL24h glulam, waterproofing, sedum cover'),
          sc('pav_dining', 'Masă lungă pentru 10 persoane & iluminat', 'Long table for ten & pendant lights', 'long communal table for ten, string lights', 'Masă tec 280 cm, bănci, ghirlande LED', '280 cm teak table, benches, LED festoons'),
        ],
        defaults: dims(4, 6, 2.8, 0, 0),
        sizePresets: { compact: preset(3, 4.5), spacious: preset(6, 9) },
        targetLux: 100,
        fitout: fit('Bucătărie de vară, grătar & mobilier', 'Summer kitchen, grill & furniture', 220, 450, 950),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.8,
      },
      {
        id: 'courtyard walkway',
        labelRo: 'Curte & Alee Arhitecturală',
        labelEn: 'Courtyard & Walkways',
        scenePrompt:
          'architectural courtyard with a paved stone walkway, planting beds, low walls, feature tree, low landscape lights',
        layouts: [
          lay('court_paved', 'Alee pavată + graminee ornamentale + iluminat jos', 'Paved path + ornamental grasses + low lighting', 'stone paved pathway, ornamental grasses, low landscape lighting'),
          lay('court_geometric', 'Pavaj geometric cu insule de plantare', 'Geometric paving with planting islands', 'geometric paving pattern with planting islands, feature tree'),
        ],
        scenarios: [
          sc('crt_paving', 'Pavaj din piatră naturală & rosturi înierbate', 'Natural stone paving with grass joints', 'natural stone slabs with grass joints', 'Plăci granit/calcar 60×40 pe strat drenant', '60×40 granite/limestone slabs on drainage bed'),
          sc('crt_wall', 'Ziduri joase & bănci integrate', 'Low walls & integrated benches', 'low stone walls doubling as bench seating', 'Gabioane sau beton aparent, capac lemn', 'Gabion or exposed concrete with timber cap'),
          sc('crt_tree', 'Arbore solitar & lumină de accent', 'Feature tree & accent lighting', 'single feature tree with accent uplight', 'Arbore multi-trunchi, proiector IP67 în sol', 'Multi-stem tree, in-ground IP67 uplight'),
          sc('crt_drain', 'Drenaj ascuns & pante corecte', 'Concealed drainage & correct slopes', 'clean flush drainage channels, crisp edges', 'Rigole liniare inox, pantă 1.5%, geotextil', 'Stainless linear drains, 1.5% fall, geotextile'),
        ],
        defaults: dims(6, 10, 3, 0, 0),
        sizePresets: { compact: preset(4, 7), spacious: preset(9, 16) },
        targetLux: 50,
        fitout: fit('Alei, borduri & iluminat decorativ', 'Pathways, edging & decorative lighting', 35, 80, 180),
        finishFactor: 1,
        costBasis: 'surface',
        hardscapeShare: 0.7,
      },
    ],
  },
};

// ── Compatibilitate: id-uri din versiunile anterioare ale aplicației ──
// Proiectele salvate înainte de extinderea catalogului păstrează spațiul cel mai apropiat.
const LEGACY_SPACE_IDS: Record<string, string> = {
  'townhouse facade': 'modern villa exterior',
  'commercial building': 'modern villa exterior',
  'backyard patio': 'residential garden',
  'poolside garden': 'residential garden',
  'front yard': 'courtyard walkway',
};

export function getSpace(mode: DesignMode, spaceId: string | null | undefined): SpaceOption {
  const spaces = SPACE_MODES[mode].spaces;
  const resolvedId = spaceId ? (LEGACY_SPACE_IDS[spaceId] ?? spaceId) : null;
  return spaces.find((s) => s.id === resolvedId) ?? spaces[0];
}

export function getLayout(space: SpaceOption, layoutId: string | null | undefined): LayoutOption {
  return space.layouts.find((l) => l.id === layoutId) ?? space.layouts[0];
}

// ── Scenarii (chips) ───────────────────────────────────────────────────
/** Numărul maxim de scenarii bifate simultan (promptul AI are un buget de ~72 tokeni). */
export const MAX_FOCUS_CHIPS = 3;

// Păstrează doar id-urile valide pentru spațiu, fără duplicate, în limita permisă.
export function sanitizeFocusIds(space: SpaceOption, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(space.scenarios.map((s) => s.id));
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && valid.has(item) && !result.includes(item)) result.push(item);
    if (result.length >= MAX_FOCUS_CHIPS) break;
  }
  return result;
}

export function getFocusScenarios(space: SpaceOption, focusIds: readonly string[] | undefined): ScenarioOption[] {
  return (focusIds ?? [])
    .map((id) => space.scenarios.find((s) => s.id === id))
    .filter((s): s is ScenarioOption => Boolean(s));
}

// Constructorul de prompt pentru scenarii: fragmentele EN ale chips-urilor bifate,
// separate prin virgulă, în ordinea în care au fost alese.
export function buildScenarioPrompt(space: SpaceOption, focusIds: readonly string[] | undefined): string {
  return getFocusScenarios(space, focusIds)
    .map((s) => s.prompt)
    .join(', ');
}

// ── Presetări de mărime (1 click) ──────────────────────────────────────
export const SIZE_PRESET_IDS: SizePresetId[] = ['compact', 'standard', 'spacious'];

// Cotele unei presetări pentru un spațiu. „Standard” = valorile implicite ale spațiului.
// Golurile urmează mărimea: o cameră compactă are cu o fereastră mai puțin (dacă are > 1),
// una spațioasă cu o fereastră în plus (dacă are cel puțin una).
export function getSizePreset(space: SpaceOption, id: SizePresetId): SpaceDefaults {
  const base = space.defaults;
  if (id === 'standard') return { ...base };
  const p = space.sizePresets[id];
  const windowsCount =
    id === 'compact'
      ? base.windowsCount > 1 ? base.windowsCount - 1 : base.windowsCount
      : base.windowsCount > 0 ? base.windowsCount + 1 : 0;
  return { ...base, width: p.width, length: p.length, height: p.height ?? base.height, windowsCount };
}

// Presetarea activă = cea ale cărei lățime × lungime coincid cu cotele curente (altfel „personalizat”).
export function detectSizePreset(
  space: SpaceOption,
  width: number,
  length: number,
): SizePresetId | null {
  for (const id of SIZE_PRESET_IDS) {
    const p = getSizePreset(space, id);
    if (p.width === width && p.length === length) return id;
  }
  return null;
}
