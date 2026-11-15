// app/lib/server/subscription.ts — SERVER ONLY.
// Logica comună de activare a planului, folosită de AMBELE căi de confirmare:
//   1. webhook-ul Stripe (/api/webhooks/stripe)  — asincron, poate întârzia sau lipsi local
//   2. verificarea directă (/api/checkout/verify) — apelată imediat la revenirea din Stripe
// Ambele scriu aceleași coloane din `profiles` (subscription_tier, stripe_customer_id,
// stripe_subscription_id, updated_at), iar operația este idempotentă: rulată de două ori
// cu aceeași sesiune, a doua rulare nu schimbă nimic.
import 'server-only'; // Build eșuează dacă un component client importă acest modul (izolarea secretelor)
import type Stripe from 'stripe';
import { isPaidPlan, type PaidPlanId } from '@/app/lib/billing/stripe';
import { normalizeInterval } from '@/app/lib/plan/tiers';
import { activateProfilePlan, getCurrentSubscriptionId } from './db';
import type { BillingInterval, PlanTier } from '@/app/types';

// Stripe poate returna fie id-ul (string), fie obiectul expandat
export function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

// ── Sincronizarea perioadei de abonament ─────────────────────────────────────
// Sursa de adevăr pentru expirare e Stripe. Din obiectul Subscription copiem în `profiles`:
//   • current_period_end   -> data (ISO) până la care e plătit abonamentul
//   • billing_interval     -> 'month' | 'year' (ciclul facturat)
//   • cancel_at_period_end -> true dacă utilizatorul a anulat și planul expiră la finalul perioadei
// Ele sunt scrise de AMBELE căi de confirmare (verify + webhook), deci rămân coerente.
export interface SubscriptionPeriod {
  currentPeriodEnd: string | null;
  interval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
}

// În API-ul Stripe curent (basil+), `current_period_end` e pe item-ul abonamentului, nu pe
// abonament. Dacă sunt mai multe item-uri, luăm cea mai apropiată dată de încheiere.
export function readPeriod(subscription: Stripe.Subscription): SubscriptionPeriod {
  const items = subscription.items?.data ?? [];
  const ends = items.map((item) => item.current_period_end).filter((n) => typeof n === 'number');
  return {
    currentPeriodEnd: ends.length > 0 ? new Date(Math.min(...ends) * 1000).toISOString() : null,
    // Intervalul real facturat vine din prețul Stripe; metadata e doar rezervă
    interval:
      normalizeInterval(items[0]?.price?.recurring?.interval) ??
      normalizeInterval(subscription.metadata?.interval),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
  };
}

// Setează planul + id-urile Stripe + perioada pentru un utilizator (scrierea e în db.ts)
export async function activatePlan(
  userId: string,
  tier: PlanTier,
  customerId: string | null,
  subscriptionId: string | null,
  period?: SubscriptionPeriod | null
): Promise<{ previousSubscriptionId: string | null }> {
  const previousSubscriptionId = await getCurrentSubscriptionId(userId);
  await activateProfilePlan(userId, { tier, customerId, subscriptionId, period });
  console.log(`[SUCVAR] ${userId} -> ${tier}`);
  return { previousSubscriptionId };
}

export interface PaidSession {
  userId: string;
  plan: PaidPlanId;
}

// Extrage (userId, plan) dintr-o sesiune PLĂTITĂ; null dacă nu e plătită / date lipsă
export function readPaidSession(session: Stripe.Checkout.Session): PaidSession | null {
  if (session.payment_status !== 'paid') return null;
  const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  const plan = session.metadata?.plan;
  if (!userId || !isPaidPlan(plan)) return null;
  return { userId, plan };
}

// Activează planul pentru o sesiune plătită și anulează abonamentul vechi (upgrade),
// ca să nu se factureze dublu. Idempotent: la a doua apel abonamentul e același -> nimic de anulat.
export async function applyPaidSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  paid: PaidSession
): Promise<void> {
  const customerId = idOf(session.customer as string | { id: string } | null);
  const subscriptionId = idOf(session.subscription as string | { id: string } | null);

  // Citim abonamentul direct din Stripe pentru data de expirare și ciclul facturat
  let period: SubscriptionPeriod | null = null;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    period = readPeriod(subscription);
  }

  const { previousSubscriptionId } = await activatePlan(
    paid.userId,
    paid.plan,
    customerId,
    subscriptionId,
    period
  );

  if (previousSubscriptionId && subscriptionId && previousSubscriptionId !== subscriptionId) {
    try {
      await stripe.subscriptions.cancel(previousSubscriptionId);
      console.log(`[SUCVAR] Abonament vechi anulat: ${previousSubscriptionId}`);
    } catch (cancelError) {
      console.error('[SUCVAR] Nu s-a putut anula abonamentul vechi:', cancelError);
    }
  }
}

// Aplică starea unui abonament ACTIV (updated / invoice.paid) pe profilul proprietarului:
// reînnoire (current_period_end nou), schimbare de ciclu, anulare programată (cancel_at_period_end).
// Ignoră abonamentele vechi, înlocuite de unul nou după un upgrade.
// Returnează false dacă evenimentul nu a putut fi aplicat (metadate lipsă / abonament învechit).
export async function syncActiveSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  const userId = subscription.metadata?.user_id;
  const plan = subscription.metadata?.plan;
  if (!userId || !isPaidPlan(plan)) return false;

  const currentId = await getCurrentSubscriptionId(userId);
  if (currentId && currentId !== subscription.id) return false;

  await activatePlan(
    userId,
    plan,
    idOf(subscription.customer as string | { id: string } | null),
    subscription.id,
    readPeriod(subscription)
  );
  return true;
}
