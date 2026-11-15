// app/lib/b2b/procurementSync.ts — trimite lista de materiale din Studio în devizul B2B al proiectului.
//   • Local: scrie în `STORAGE_KEYS.b2bWorkspaces` (același loc din care /b2b își încarcă devizul).
//   • Cloud: PUT /api/b2b/estimates (doar `agency`; pentru alte planuri serverul răspunde 403 și
//     rămâne varianta locală — fără excepții).
// Pozițiile au id-uri stabile (`proc-…`): o a doua trimitere ÎNLOCUIEȘTE lista anterioară, nu o dublează.
import { calculateEngineering } from '@/app/data/catalog';
import type { BomItem } from '@/app/lib/procurement';
import type { RoomDimensions } from '@/app/types';
import type { SavedProject } from '@/app/types';
import { pushWorkspace, workspaceToPayload, type CloudResult } from './cloud';
import type { LineItem } from './estimate';
import { EMPTY_CLIENT, loadWorkspace, saveWorkspace, seedScope, type Workspace } from './portfolio';

export interface SyncProject {
  id: string;
  title: string;
  mode: SavedProject['mode'];
  spaceType: string;
  styleId: string;
  dimensions: RoomDimensions;
}

const toLine = (i: BomItem): LineItem => ({ id: i.id, cat: i.cat, ro: i.titleRo, en: i.titleEn, unit: i.unit, qty: i.qty, price: i.unitPrice });

export async function sendBomToB2b(
  project: SyncProject,
  bomItems: BomItem[],
): Promise<{ saved: boolean; cloud: CloudResult<null>['status'] }> {
  const lines = bomItems.map(toLine);
  const existing = loadWorkspace(project.id);
  let ws: Workspace;

  if (existing) {
    // Păstrăm tot ce a introdus antreprenorul; schimbăm doar pozițiile generate de procurement
    ws = { ...existing, items: [...existing.items.filter((i) => !i.id.startsWith('proc-')), ...lines], updatedAt: new Date().toISOString() };
  } else {
    // Deviz nou: aceleași valori implicite ca în /b2b; materialele detectate înlocuiesc lista generică
    const stub: SavedProject = { ...project, userEmail: '', originalImage: null, generatedImage: null, totalBudget: 0, createdAt: new Date().toISOString() };
    const eng = calculateEngineering(project.dimensions, project.mode, project.spaceType);
    ws = {
      client: EMPTY_CLIENT,
      docNo: '',
      area: +(project.mode === 'exteriors' ? eng.netWallArea : eng.floorArea).toFixed(1) || 1,
      region: 'center',
      level: 'standard',
      crew: 3,
      rateOverride: {},
      scope: seedScope(stub),
      contingency: 5,
      margin: 15,
      vat: 21,
      items: lines,
      updatedAt: new Date().toISOString(),
    };
  }

  const saved = saveWorkspace(project.id, ws);
  // Totalurile complete (cu manoperă) le recalculează /b2b la deschidere și le retrimite în cloud;
  // aici trimitem doar valoarea materialelor, ca rândul din `b2b_estimates` să nu fie gol.
  const net = ws.items.reduce((s, i) => s + i.qty * i.price, 0);
  const cloud = await pushWorkspace(workspaceToPayload(project.id, ws, net, net * (1 + ws.vat / 100)));
  return { saved, cloud: cloud.status };
}
