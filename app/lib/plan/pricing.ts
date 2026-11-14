// app/lib/plan/pricing.ts
// Prețurile afișate în UI pentru un plan și un ciclu de facturare (doar afișare:
// suma reală o calculează serverul în lib/billing/stripe.ts, cu aceeași formulă).
import { annualMonthlyEquivalentCents, annualTotalCents, formatEuro } from '@/app/lib/plan/tiers';
import type { BillingInterval } from '@/app/types';

export interface DisplayPrice {
  /** Suma mare afișată: prețul lunar (lunar) sau echivalentul lunar redus (anual) */
  main: string;
  /** Prețul lunar întreg, tăiat — doar la ciclul anual */
  struck: string | null;
  /** Totalul facturat anual (ex. „278,40 €") — doar la ciclul anual */
  yearlyTotal: string | null;
}

export function displayPrice(monthlyCents: number, interval: BillingInterval): DisplayPrice {
  if (interval === 'year' && monthlyCents > 0) {
    return {
      main: formatEuro(annualMonthlyEquivalentCents(monthlyCents)),
      struck: formatEuro(monthlyCents),
      yearlyTotal: formatEuro(annualTotalCents(monthlyCents)),
    };
  }
  return { main: formatEuro(monthlyCents), struck: null, yearlyTotal: null };
}
