// app/types/studio.ts
// Design / Studio domain types (modes, styles, dimensions, engineering, bill of materials).

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
