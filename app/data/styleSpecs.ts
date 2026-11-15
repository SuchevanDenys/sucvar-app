// app/data/styleSpecs.ts
// Fișele tehnice ale celor 12 stiluri arhitecturale (bilingv RO / EN).
//
// Cum sunt folosite aceste date (o singură sursă de adevăr):
//   1. `catalog.ts` le atașează fiecărui `VisualStyle` prin `defineStyle`.
//   2. Studio: `StyleSpecCard` (inspectorul din pasul 03) afișează brief-ul,
//      materialele, iluminarea și raționamentul de cost.
//   3. Landing: secțiunea „Sisteme arhitecturale” arată aceleași fișe.
//   4. Promptul AI: `promptSpec` intră în `app/api/generate/route.ts`, imediat după scenă,
//      deci materialele și temperatura de culoare ajung în randare înaintea
//      textului generic al stilului (bugetul de ~72 tokeni CLIP taie finalul, nu începutul).
//   Procentul de cost NU e scris aici: se derivă din `costFactor` (vezi `costDeltaLabel`),
//   ca textul și multiplicatorul să nu se desincronizeze niciodată.
import type { StyleSpec } from '@/app/types';

export const STYLE_SPECS: Record<string, StyleSpec> = {
  scandinavian: {
    architecturalBrief: {
      ro: 'Volume deschise, proporții joase și lumină de nord distribuită uniform. Spațiul se organizează pe funcțiune, cu mobilier modular și fără ornament structural.',
      en: 'Open volumes, low proportions and evenly distributed north light. Space is organised by function, with modular furniture and no structural ornament.',
    },
    materials: {
      flooring: { ro: 'Parchet stejar uleiat, 14 mm', en: 'Oiled oak parquet, 14 mm' },
      walls: { ro: 'Vopsea mată caldă, finisaj alb-cald', en: 'Warm-white matte paint finish' },
      accents: { ro: 'Lână, in, ceramică mată, oțel vopsit', en: 'Wool, linen, matte ceramics, painted steel' },
    },
    lightingSpec: { ro: '4000K lumină de zi difuză', en: '4000K diffused daylight', kelvin: 4000 },
    costRationale: {
      ro: 'nivel de referință — materiale standardizate, mobilier de serie',
      en: 'baseline — standardised materials, series-produced furniture',
    },
    promptSpec: 'scandinavian, oiled oak floor, warm white matte walls, linen and wool, 4000K diffused daylight',
  },
  modern: {
    architecturalBrief: {
      ro: 'Volume rectangulare, linii continue și raport plin–gol controlat. Suprafețele mate și iluminatul liniar încastrat definesc un spațiu precis, fără decor suprapus.',
      en: 'Rectangular volumes, continuous lines and a controlled solid-to-void ratio. Matte surfaces and recessed linear lighting define a precise space with no applied decor.',
    },
    materials: {
      flooring: { ro: 'Gresie mată format mare 120×60', en: 'Large-format matte porcelain 120×60' },
      walls: { ro: 'Furnir de nuc + tencuială fină gri-piatră', en: 'Walnut veneer + fine stone-grey plaster' },
      accents: { ro: 'Oțel negru mat, piatră sinterizată, sticlă extra-clară', en: 'Matte black steel, sintered stone, extra-clear glass' },
    },
    lightingSpec: { ro: '3000K LED liniar încastrat', en: '3000K recessed linear LED', kelvin: 3000 },
    costRationale: {
      ro: 'furnir de nuc și feronerie de precizie peste nivelul de referință',
      en: 'walnut veneer and precision hardware above baseline',
    },
    promptSpec: 'modern, large-format matte tile floor, walnut veneer walls, black steel, 3000K recessed linear LED',
  },
  contemporary: {
    architecturalBrief: {
      ro: 'Geometrii curbate și contraste subtile între piatră caldă și lemn afumat. Mobilierul sculptural are rol de punct focal într-un volum altfel liniștit.',
      en: 'Curved geometry and subtle contrast between warm stone and smoked timber. Sculptural furniture acts as the focal point in an otherwise calm volume.',
    },
    materials: {
      flooring: { ro: 'Travertin șlefuit, rost minim', en: 'Honed travertine, minimal joints' },
      walls: { ro: 'Tencuială venețiană mată + panouri lemn afumat', en: 'Matte Venetian plaster + smoked timber panels' },
      accents: { ro: 'Bronz periat, bouclé, piatră naturală', en: 'Brushed bronze, bouclé, natural stone' },
    },
    lightingSpec: { ro: '2700K ambient indirect, cove', en: '2700K indirect ambient cove', kelvin: 2700 },
    costRationale: {
      ro: 'piatră naturală și tapițerii la comandă',
      en: 'natural stone and made-to-order upholstery',
    },
    promptSpec: 'contemporary, honed travertine floor, venetian plaster walls, brushed bronze, 2700K indirect cove light',
  },
  minimalist: {
    architecturalBrief: {
      ro: 'Reducție la elementele structurale: depozitare încastrată, uși și mobilier fără mânere, o singură paletă caldă. Calitatea vine din rosturi și planeitate, nu din obiecte.',
      en: 'Reduction to structural elements: flush storage, handleless doors and furniture, one warm palette. Quality comes from joints and flatness, not objects.',
    },
    materials: {
      flooring: { ro: 'Microciment continuu, fără rosturi', en: 'Seamless continuous microcement' },
      walls: { ro: 'Vopsea mată + panouri încastrate la nivel', en: 'Matte paint + flush-fitted panels' },
      accents: { ro: 'Lemn palid, oțel vopsit alb, sticlă satinată', en: 'Pale timber, white-painted steel, satin glass' },
    },
    lightingSpec: { ro: '3500K difuz, fără corpuri vizibile', en: '3500K diffused, no visible fixtures', kelvin: 3500 },
    costRationale: {
      ro: 'toleranțe strânse la mobilier încastrat și microciment turnat',
      en: 'tight tolerances on flush joinery and poured microcement',
    },
    promptSpec: 'minimalist, seamless microcement floor, flush matte walls, pale timber, 3500K hidden diffused light',
  },
  minimalist_obsidian: {
    architecturalBrief: {
      ro: 'Minimalism cu valori tonale joase: piatră neagră și microciment antracit absorb lumina, iar sursele ascunse modelează volumele. Atmosferă concentrată, cu contrast controlat.',
      en: 'Minimalism in a low tonal range: black stone and charcoal microcement absorb light while concealed sources sculpt the volumes. A focused atmosphere with controlled contrast.',
    },
    materials: {
      flooring: { ro: 'Piatră neagră mată, format mare', en: 'Large-format matte black stone' },
      walls: { ro: 'Microciment antracit + stejar afumat', en: 'Charcoal microcement + smoked oak' },
      accents: { ro: 'Alamă satinată, piatră neagră, sticlă fumurie', en: 'Satin brass, black stone, smoked glass' },
    },
    lightingSpec: { ro: '2400K liniar ascuns, accent punctual', en: '2400K hidden linear, spot accent', kelvin: 2400 },
    costRationale: {
      ro: 'piatră neagră masivă, microciment pigmentat și alamă la comandă',
      en: 'solid black stone, pigmented microcement and bespoke brass',
    },
    promptSpec: 'dark minimalist, matte black stone floor, charcoal microcement walls, satin brass, 2400K hidden linear light',
  },
  japandi: {
    architecturalBrief: {
      ro: 'Proporții joase, linii orizontale și goluri lăsate intenționat libere. Lemnul cald și lumina filtrată creează o ierarhie liniștită între mobilier, ceramică și perete.',
      en: 'Low proportions, horizontal lines and deliberately empty zones. Warm timber and filtered light set a quiet hierarchy between furniture, ceramics and wall.',
    },
    materials: {
      flooring: { ro: 'Parchet frasin, finisaj mat', en: 'Ash parquet, matte finish' },
      walls: { ro: 'Tencuială argiloasă + panouri shoji', en: 'Clay plaster + shoji panels' },
      accents: { ro: 'Nuc, ceramică artizanală, fibre naturale', en: 'Walnut, handmade ceramics, natural fibres' },
    },
    lightingSpec: { ro: '2700K filtrat prin hârtie, joasă', en: '2700K paper-filtered, low level', kelvin: 2700 },
    costRationale: {
      ro: 'esențe fine de lemn și tâmplărie cu îmbinări vizibile',
      en: 'fine hardwoods and joinery with exposed joints',
    },
    promptSpec: 'japandi, ash wood floor, clay plaster walls, shoji paper light, handmade ceramics, 2700K low warm glow',
  },
  traditional: {
    architecturalBrief: {
      ro: 'Compoziție simetrică pe axe, cu ierarhie clară între soclu, lambriu și cornișă. Ornamentul este structural și respectă modulul clasic al încăperii.',
      en: 'Axially symmetric composition with a clear hierarchy of plinth, wainscot and cornice. Ornament is structural and follows the classical module of the room.',
    },
    materials: {
      flooring: { ro: 'Parchet chevron stejar, 15 mm', en: 'Chevron oak parquet, 15 mm' },
      walls: { ro: 'Lambriuri decorative + cornișe în gips', en: 'Decorative wainscoting + plaster cornices' },
      accents: { ro: 'Alamă patinată, marmură Carrara, catifea', en: 'Aged brass, Carrara marble, velvet' },
    },
    lightingSpec: { ro: '2700K aplice și candelabru', en: '2700K sconces and chandelier', kelvin: 2700 },
    costRationale: {
      ro: 'piatră naturală, profile de gips executate și tâmplărie la comandă',
      en: 'natural stone, cast plaster profiles and made-to-order joinery',
    },
    promptSpec: 'neo-classic Parisian, chevron oak parquet, wainscoting walls, aged brass, 2700K warm sconces',
  },
  mid_century_modern: {
    architecturalBrief: {
      ro: 'Plan deschis cu mobilier pe picioare suple, care păstrează vizibilă podeaua. Placajul de lemn cald și accentele cromatice unesc zonele fără pereți separatori.',
      en: 'Open plan with tapered-leg furniture that keeps the floor visible. Warm timber cladding and colour accents link zones without partition walls.',
    },
    materials: {
      flooring: { ro: 'Parchet nuc, finisaj satinat', en: 'Satin-finish walnut parquet' },
      walls: { ro: 'Placaj tec + vopsea verde pin', en: 'Teak cladding + pine-green paint' },
      accents: { ro: 'Piele coniac, metal alămit, lână bouclé', en: 'Cognac leather, brass-finish metal, wool bouclé' },
    },
    lightingSpec: { ro: '2700K pendul central + lampă de masă', en: '2700K central pendant + table lamp', kelvin: 2700 },
    costRationale: {
      ro: 'esențe de tec și nuc, mobilier de design tapițat în piele',
      en: 'teak and walnut species, leather-upholstered design furniture',
    },
    promptSpec: 'mid-century modern, walnut parquet, teak wood walls, cognac leather, brass pendant, 2700K warm light',
  },
  coastal: {
    architecturalBrief: {
      ro: 'Spațiu înalt și luminos, orientat spre deschideri mari. Culorile minerale deschise și texturile naturale reduc contrastul și măresc percepția volumului.',
      en: 'Tall, bright space oriented towards large openings. Light mineral colours and natural textures reduce contrast and enlarge the perceived volume.',
    },
    materials: {
      flooring: { ro: 'Stejar albit, finisaj mat', en: 'Bleached oak, matte finish' },
      walls: { ro: 'Var mineral + lambriu vertical alb', en: 'Mineral limewash + white vertical boarding' },
      accents: { ro: 'In natural, ratan, calcar', en: 'Natural linen, rattan, limestone' },
    },
    lightingSpec: { ro: '5000K lumină naturală abundentă', en: '5000K abundant natural daylight', kelvin: 5000 },
    costRationale: {
      ro: 'nivel de referință — finisaje deschise, fibre naturale de serie',
      en: 'baseline — light finishes, series natural fibres',
    },
    promptSpec: 'coastal, bleached oak floor, limewash walls, natural linen and rattan, 5000K bright daylight',
  },
  industrial: {
    architecturalBrief: {
      ro: 'Structura rămâne vizibilă: grinzi, conducte și planșee sunt parte din compoziție. Materialele brute creează contrast cu piesele calde din piele și lemn.',
      en: 'Structure stays visible: beams, services and slabs are part of the composition. Raw materials contrast with warm leather and timber pieces.',
    },
    materials: {
      flooring: { ro: 'Microciment șlefuit sau beton elicopterizat', en: 'Polished microcement or power-floated concrete' },
      walls: { ro: 'Cărămidă aparentă + beton aparent', en: 'Exposed brick + exposed concrete' },
      accents: { ro: 'Oțel negru mat, piele coniac, grinzi lemn', en: 'Matte black steel, cognac leather, timber beams' },
    },
    lightingSpec: { ro: '3000K spoturi pe șină', en: '3000K track spotlights', kelvin: 3000 },
    costRationale: {
      ro: 'structură metalică la comandă și tratamente de suprafață pentru beton',
      en: 'custom steel framing and concrete surface treatments',
    },
    promptSpec: 'industrial loft, polished microcement floor, exposed brick walls, black steel, 3000K track lighting',
  },
  brutalist_concrete: {
    architecturalBrief: {
      ro: 'Volume monolitice, cu textura cofrajului lăsată aparentă. Golurile mici și adânci modelează lumina laterală și accentuează masa structurii.',
      en: 'Monolithic volumes with the formwork texture left visible. Small, deep openings shape the raking light and emphasise the mass of the structure.',
    },
    materials: {
      flooring: { ro: 'Beton șlefuit sigilat mat', en: 'Matte-sealed ground concrete' },
      walls: { ro: 'Beton aparent turnat în cofraj de scândură', en: 'Board-formed exposed concrete' },
      accents: { ro: 'Oțel înnegrit, lemn brut, sticlă fixă', en: 'Blackened steel, raw timber, fixed glazing' },
    },
    lightingSpec: { ro: '3200K lumină laterală, contrast ridicat', en: '3200K raking side light, high contrast', kelvin: 3200 },
    costRationale: {
      ro: 'cofraj special, beton aparent cu toleranțe stricte și sticlă fixă de dimensiuni mari',
      en: 'special formwork, tight-tolerance exposed concrete and large fixed glazing',
    },
    promptSpec: 'brutalist, ground concrete floor, board-formed concrete walls, blackened steel, 3200K dramatic raking light',
  },
  biophilic: {
    architecturalBrief: {
      ro: 'Vegetația este element de proiect, nu decor: jardiniere integrate, ventilare naturală și vederi spre exterior pe axele principale. Texturile organice susțin confortul vizual.',
      en: 'Greenery is a design element, not decor: integrated planters, natural ventilation and outward views on the main axes. Organic textures support visual comfort.',
    },
    materials: {
      flooring: { ro: 'Piatră naturală + teracotă nesmălțuită', en: 'Natural stone + unglazed terracotta' },
      walls: { ro: 'Tencuială de var + perete verde integrat', en: 'Lime plaster + integrated living wall' },
      accents: { ro: 'Lemn texturat, ratan, ceramică teracotă', en: 'Textured timber, rattan, terracotta ceramics' },
    },
    lightingSpec: { ro: '4500K lumină naturală, completare 3000K', en: '4500K natural daylight, 3000K fill', kelvin: 4500 },
    costRationale: {
      ro: 'sistem de irigare, jardiniere încastrate și piatră naturală',
      en: 'irrigation system, built-in planters and natural stone',
    },
    promptSpec: 'biophilic, natural stone floor, lime plaster walls, living plants, textured timber, 4500K soft daylight',
  },
};

// Eticheta procentuală derivată din multiplicator: 1.45 → "+45%", 1.0 → "±0%".
export function costDeltaLabel(costFactor: number): string {
  const pct = Math.round((costFactor - 1) * 100);
  return pct === 0 ? '±0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
}
