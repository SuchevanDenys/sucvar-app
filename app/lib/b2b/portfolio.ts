// app/lib/b2b/portfolio.ts
// Portofoliul B2B: pentru fiecare proiect salvat al unui cont `agency` păstrăm
// datele clientului + parametrii devizului (regiune, echipă, marje, linii de materiale).
//
// FLUX DE DATE B2B (de la proiect la PDF):
//   1. Proiectele vin din arhiva contului (`fetchProjectsFromDb`: Supabase `projects`,
//      filtrate pe email, cu rezervă locală) — aceleași date ca în Studio.
//   2. Pentru proiectul ales, `seedMaterials` + `seedScope` pornesc de la cotele din
//      `calculateEngineering` (arii, litri de vopsea, plăci gips-carton etc.).
//   3. Antreprenorul completează clientul, tarifele și prețurile unitare; totul se
//      salvează per proiect în localStorage (`STORAGE_KEYS.b2bWorkspaces`).
//   4. Devizul tehnic se tipărește (browser → „Salvează ca PDF") din `PrintDeviz`.
// ATENȚIE: datele de deviz rămân în browserul antreprenorului; nu există încă un tabel
// Supabase pentru ele. Accesul la pagină este doar UX — vezi `useEnterpriseAccess`.
import { calculateEngineering } from '@/app/data/catalog';
import { STORAGE_KEYS, readStorage, writeStorage } from '@/app/lib/storage';
import type { SavedProject } from '@/app/types';
import type { Party } from './exports';
import { uid, type LineItem, type RegionId, type TradeId } from './estimate';

export interface ClientMeta {
  name: string;
  vatId: string;
  email: string;
  phone: string;
  address: string; // sediul clientului
  siteAddress: string; // adresa șantierului
  notes: string; // condiții / observații tipărite în ofertă
}

export interface Workspace {
  client: ClientMeta;
  docNo: string;
  area: number;
  region: RegionId;
  level: string;
  crew: number;
  rateOverride: Partial<Record<TradeId, number>>;
  scope: Partial<Record<TradeId, number>>;
  contingency: number;
  margin: number;
  vat: number;
  items: LineItem[];
  updatedAt: string;
}

export const EMPTY_CLIENT: ClientMeta = { name: '', vatId: '', email: '', phone: '', address: '', siteAddress: '', notes: '' };

type WorkspaceMap = Record<string, Workspace>;

function readMap(): WorkspaceMap {
  try {
    const raw = readStorage(STORAGE_KEYS.b2bWorkspaces);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as WorkspaceMap) : {};
  } catch {
    return {};
  }
}

export const loadWorkspace = (projectId: string): Workspace | null => readMap()[projectId] ?? null;

export const savedWorkspaceIds = (): Set<string> => new Set(Object.keys(readMap()));

export function saveWorkspace(projectId: string, ws: Workspace): boolean {
  const map = readMap();
  map[projectId] = ws;
  return writeStorage(STORAGE_KEYS.b2bWorkspaces, JSON.stringify(map));
}

export function loadSeller(): Party {
  try {
    const parsed = JSON.parse(readStorage(STORAGE_KEYS.b2bSeller) ?? '{}') as Partial<Party>;
    return { name: String(parsed.name ?? ''), vatId: String(parsed.vatId ?? '') };
  } catch {
    return { name: '', vatId: '' };
  }
}

export const saveSeller = (seller: Party): boolean => writeStorage(STORAGE_KEYS.b2bSeller, JSON.stringify(seller));

// ── Pornirea devizului din cotele proiectului ─────────────────────────────────

/** Aria de lucru a proiectului (m²): pardoseala, sau fațada netă pentru exterioare. */
export function projectArea(p: SavedProject): number {
  const eng = calculateEngineering(p.dimensions, p.mode, p.spaceType);
  return p.mode === 'exteriors' ? eng.netWallArea : eng.floorArea;
}

/** Aria pe meserie: gips-carton doar la interioare, sanitare doar la bucătărie. */
export function seedScope(p: SavedProject): Partial<Record<TradeId, number>> {
  const area = projectArea(p);
  return {
    drywall: p.mode === 'interiors' ? area : 0,
    plumbing: p.spaceType === 'kitchen' ? area : 0,
  };
}

// Prețuri unitare ORIENTATIVE pentru material (€, fără TVA, fără montaj; montajul e în manoperă).
// Sunt doar un punct de pornire — antreprenorul le înlocuiește cu lista lui de prețuri.
const MAT = { floor: 28, paint: 9, base: 4, board: 7, cd: 1.6, ud: 1.2, hanger: 0.5, lightIn: 18, lightOut: 35, facade: 32, paving: 38, planting: 14 };

/** Linii de materiale cu cantități calculate din proiect (rotunjite în sus, pierderile incluse). */
export function seedMaterials(p: SavedProject): LineItem[] {
  const e = calculateEngineering(p.dimensions, p.mode, p.spaceType);
  const line = (cat: string, ro: string, en: string, unit: string, qty: number, price: number): LineItem => ({ id: uid(), cat, ro, en, unit, qty, price });
  const out: LineItem[] = [];
  if (e.floorArea <= 0) return out;

  if (p.mode === 'interiors') {
    out.push(
      line('finishes', 'Pardoseală (cu 10% pierderi)', 'Flooring (incl. 10% waste)', 'm²', e.flooringWithWaste, MAT.floor),
      line('finishes', 'Vopsea lavabilă (2 straturi)', 'Washable paint (2 coats)', 'L', e.paintLiters, MAT.paint),
      line('finishes', 'Plintă', 'Baseboard', 'ml', e.baseboardMeters, MAT.base),
      line('structure', 'Plăci gips-carton 12,5 mm', 'Plasterboard 12.5 mm', 'buc.', e.plasterboardSheets, MAT.board),
      line('structure', 'Profile CD 60', 'CD 60 profiles', 'ml', e.ceilingProfileMeters, MAT.cd),
      line('structure', 'Profile UD 27', 'UD 27 profiles', 'ml', e.perimeterProfileMeters, MAT.ud),
      line('structure', 'Bride / pendule', 'Hangers', 'buc.', e.ceilingHangers, MAT.hanger),
      line('electric', 'Corpuri LED încastrate', 'Recessed LED fixtures', 'buc.', e.lightFixtures, MAT.lightIn),
    );
  } else if (p.mode === 'exteriors') {
    out.push(
      line('finishes', 'Fațadă: termosistem + finisaj', 'Facade: ETICS + finish', 'm²', e.netWallArea, MAT.facade),
      line('electric', 'Corpuri exterior IP65', 'Exterior fixtures IP65', 'buc.', e.lightFixtures, MAT.lightOut),
    );
  } else {
    out.push(
      line('finishes', 'Pavaj / deck (40% din arie)', 'Paving / decking (40% of area)', 'm²', +(e.flooringWithWaste * 0.4).toFixed(1), MAT.paving),
      line('other', 'Spațiu verde (60% din arie)', 'Planting (60% of area)', 'm²', +(e.floorArea * 0.6).toFixed(1), MAT.planting),
      line('electric', 'Corpuri iluminat grădină', 'Garden fixtures', 'buc.', e.lightFixtures, MAT.lightOut),
    );
  }
  return out.filter((i) => i.qty > 0);
}
