// app/types/project.ts
// Saved projects (Supabase table `projects` / localStorage).
import type { DesignMode, RoomDimensions } from './studio';

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
