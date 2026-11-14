// app/components/login/quickProfiles.ts
import { Briefcase, GraduationCap, ShieldCheck } from 'lucide-react';
import type { PlanTier } from '@/app/types';

// Profiluri DEMO pentru prezentarea la comisie
export const QUICK_PROFILES = [
  {
    id: 'architect',
    email: 'denys@sucvar.ro',
    roleRo: 'Arhitect Sistem (Fondator)',
    roleEn: 'Lead Systems Architect',
    badge: 'PRO',
    tier: 'pro' as PlanTier,
    icon: ShieldCheck,
  },
  {
    id: 'committee',
    email: 'comisie@usv.ro',
    roleRo: 'Comisie Evaluare Licență',
    roleEn: 'Thesis Evaluation Board',
    badge: 'USV',
    tier: 'pro' as PlanTier,
    icon: GraduationCap,
  },
  {
    id: 'client',
    email: 'client@sucvar.ro',
    roleRo: 'Client / Beneficiar Proiect',
    roleEn: 'Project Homeowner / Client',
    badge: 'STUDIO',
    tier: 'starter' as PlanTier,
    icon: Briefcase,
  },
];
