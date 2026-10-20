// app/types/studio.ts
// Shared types used by pages, catalog, API route and Supabase helpers.

export type Language = 'ro' | 'en';
export type ThemeMode = 'light' | 'dark';
export type DesignMode = 'interiors' | 'exteriors' | 'gardens';
export type BudgetTier = 'economy' | 'standard' | 'luxury';
export type StoreName = 'IKEA' | 'Mobexpert' | 'Dedeman' | 'eMAG';

// One architectural style (text only, no photos)
export interface VisualStyle {
  id: string;
  nameRo: string;
  nameEn: string;
  descRo: string;
  descEn: string;
  prompt: string;
  colors: string[];
}

// Room dimensions typed by the user (meters) + generation settings
export interface RoomDimensions {
  width: number;
  length: number;
  height: number;
  doorsCount: number;
  windowsCount: number;
  aiStrength: number;
  layoutPreset: string;
  budget: BudgetTier;
}

// Result of calculateEngineering()
export interface EngineeringSpecs {
  floorArea: number; // m²
  volume: number; // m³
  netWallArea: number; // m², goluri de uși/ferestre scăzute
  flooringWithWaste: number; // m², +10% pierderi
  paintLiters: number; // litri, 2 straturi
  baseboardMeters: number; // ml
  // --- Iluminat (metoda lumenului) ---
  targetLux: number; // nivel de iluminare țintă pentru spațiul ales
  requiredLumens: number; // flux luminos total necesar
  lightFixtures: number; // număr de corpuri de iluminat
  // --- Gips-carton (tavan suspendat, doar interioare) ---
  plasterboardSheets: number; // plăci 12,5 mm (1,2 × 2,5 m)
  ceilingProfileMeters: number; // profile CD 60
  perimeterProfileMeters: number; // profile UD 27
  ceilingHangers: number; // bride / pendule de susținere
}

// Un rând din devizul de manoperă
export interface LaborLine {
  id: string;
  nameRo: string;
  nameEn: string;
  quantity: number;
  unit: string; // "m²", "ml", "buc."
  unitRate: number; // € per unitate, deja ajustat după nivelul de buget
  total: number; // quantity × unitRate, în €
}

// Rezultatul estimării de manoperă
export interface LaborEstimate {
  lines: LaborLine[];
  total: number; // €
  ratePerSqm: number; // € / m² de pardoseală
}

// Planurile tarifare (pagina Home și /checkout)
export type PlanId = 'starter' | 'pro' | 'agency';

// Furnizorul de imagini AI folosit de /api/generate
export type AiProviderId = 'stable-diffusion' | 'replicate' | 'demo';

// Parametri avansați de generare, editabili din Studio
export interface AiSettings {
  extraPrompt: string; // text adăugat la promptul construit automat
  negativePrompt: string; // ce NU vrem în imagine
  inferenceSteps: number; // pași de inferență (calitate vs. timp)
  guidanceScale: number; // cât de strict urmează modelul promptul (CFG)
  seed: number | null; // null = aleatoriu; același seed = rezultat reproductibil
}

// One line of the bill of materials
export interface FurnitureItem {
  id: string;
  nameRo: string;
  nameEn: string;
  category: string;
  dimensions: string;
  estimatedPrice: number;
  storeName: StoreName;
  searchQuery: string;
  included: boolean;
}

// A project saved in Supabase / localStorage
// createdAt is an ISO string (for example "2026-10-17T10:30:00.000Z")
export interface SavedProject {
  id: string;
  userEmail: string;
  title: string;
  mode: DesignMode;
  spaceType: string;
  styleId: string;
  dimensions: RoomDimensions;
  originalImage: string | null;
  generatedImage: string | null;
  totalBudget: number;
  createdAt: string;
}

// Exact shape of one row in the Supabase table `projects` (snake_case columns)
export interface ProjectRow {
  id: string; // uuid
  user_email: string; // text
  title: string; // text
  mode: DesignMode; // text
  space_type: string; // text
  style_id: string; // text
  dimensions: RoomDimensions; // jsonb
  original_image: string | null; // text
  generated_image: string | null; // text
  total_budget: number; // numeric
  created_at: string; // timestamptz (ISO string)
}

// Result of saveProjectToDb()
export interface SaveProjectResult {
  savedToCloud: boolean;
  errorMessage?: string;
}

// Result of the authentication helpers in app/lib/supabase.ts
// 'ok'            -> a real Supabase session exists (email / fullName are filled in when known)
// 'confirm-email' -> account created, but the user must confirm the email before signing in
// 'error'         -> rejected (wrong password, network down, ...) - NO session was created
export type AuthStatus = 'ok' | 'confirm-email' | 'error';

export interface AuthResult {
  status: AuthStatus;
  message?: string;
  email?: string;
  fullName?: string | null;
  needsConfirmation?: boolean;
}
