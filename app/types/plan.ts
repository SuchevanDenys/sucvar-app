// app/types/plan.ts
// Subscription tiers. Single source of truth for client AND server.
// 'pro' and 'agency' both have unlimited Studio generations;
// 'agency' additionally unlocks the /b2b portal and enterprise features.
export type PlanTier = 'starter' | 'pro' | 'agency';

/** Tariff plan shown on Home and /checkout (same set as the account tier). */
export type PlanId = PlanTier;

/** Ciclu de facturare Stripe: lunar (`month`) sau anual (`year`, cu reducere). */
export type BillingInterval = 'month' | 'year';
