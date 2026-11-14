// app/api/webhooks/stripe/route.ts
// Primește evenimentele Stripe și sincronizează `profiles` (Service Role, ocolește RLS):
//   • checkout.session.completed      -> plan plătit + stripe_customer_id + stripe_subscription_id
//   • customer.subscription.updated   -> reactivare / schimbare plan / anulare efectivă
//   • customer.subscription.deleted   -> înapoi la 'starter'
//
// IMPORTANT: semnătura se verifică pe corpul BRUT (request.text()), nu pe JSON parsat.
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAdmin } from '@/app/lib/quota';
import { getStripe, isPaidPlan } from '@/app/lib/stripe';

type Tier = 'starter' | 'pro' | 'agency';

function getAdminOrThrow() {
  const { client: admin } = getAdmin();
  if (!admin) throw new Error('Supabase admin neconfigurat (SUPABASE_SERVICE_ROLE_KEY).');
  return admin;
}

// Stripe poate returna fie id-ul (string), fie obiectul expandat
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

// Setează planul + id-urile Stripe pentru un utilizator
async function activatePlan(
  userId: string,
  tier: Tier,
  customerId: string | null,
  subscriptionId: string | null
): Promise<{ previousSubscriptionId: string | null }> {
  const admin = getAdminOrThrow();

  const { data: current } = await admin
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle();

  const { data, error } = await admin
    .from('profiles')
    .update({
      subscription_tier: tier,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id');

  if (error) throw new Error(`Actualizare profiles eșuată: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(`Nu există rând în profiles pentru utilizatorul ${userId}.`);
  }
  console.log(`[SUCVAR] ${userId} -> ${tier}`);
  return { previousSubscriptionId: current?.stripe_subscription_id ?? null };
}

// Coboară la 'starter' DOAR dacă abonamentul anulat este cel curent al utilizatorului.
// (Altfel, anularea abonamentului vechi după un upgrade ar anula planul nou.)
async function downgradeBySubscription(subscriptionId: string): Promise<void> {
  const admin = getAdminOrThrow();
  const { data, error } = await admin
    .from('profiles')
    .update({
      subscription_tier: 'starter',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)
    .select('id');

  if (error) throw new Error(`Downgrade eșuat: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`[SUCVAR] Abonament ${subscriptionId} ignorat (nu mai este cel curent).`);
    return;
  }
  console.log(`[SUCVAR] ${data[0].id} -> starter`);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!stripe || !secret) {
    console.error('[SUCVAR] Webhook Stripe neconfigurat (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).');
    return NextResponse.json({ error: 'Webhook neconfigurat.' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Lipsește semnătura Stripe.' }, { status: 400 });
  }

  // 1. Verificare semnătură (respinge cererile false)
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[SUCVAR] Semnătură webhook invalidă:', err);
    return NextResponse.json({ error: 'Semnătură invalidă.' }, { status: 400 });
  }

  // 2. Procesare. La eroare răspundem 500 => Stripe reîncearcă automat.
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid') break;

        const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
        const plan = session.metadata?.plan;
        if (!userId || !isPaidPlan(plan)) {
          console.error('[SUCVAR] checkout.session.completed fără user_id / plan valid:', session.id);
          break; // nu are sens să reîncercăm
        }

        const customerId = idOf(session.customer as string | { id: string } | null);
        const subscriptionId = idOf(session.subscription as string | { id: string } | null);

        const { previousSubscriptionId } = await activatePlan(userId, plan, customerId, subscriptionId);

        // Upgrade/schimbare de plan: anulăm abonamentul vechi ca să nu se factureze dublu.
        if (previousSubscriptionId && subscriptionId && previousSubscriptionId !== subscriptionId) {
          try {
            await stripe.subscriptions.cancel(previousSubscriptionId);
            console.log(`[SUCVAR] Abonament vechi anulat: ${previousSubscriptionId}`);
          } catch (cancelError) {
            console.error('[SUCVAR] Nu s-a putut anula abonamentul vechi:', cancelError);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          if (!userId || !isPaidPlan(plan)) break;

          // Ignorăm actualizările unui abonament vechi, înlocuit de unul nou
          const admin = getAdminOrThrow();
          const { data: profile } = await admin
            .from('profiles')
            .select('stripe_subscription_id')
            .eq('id', userId)
            .maybeSingle();
          if (profile?.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) break;

          await activatePlan(
            userId,
            plan,
            idOf(subscription.customer as string | { id: string } | null),
            subscription.id
          );
        } else if (
          subscription.status === 'canceled' ||
          subscription.status === 'unpaid' ||
          subscription.status === 'incomplete_expired'
        ) {
          await downgradeBySubscription(subscription.id);
        }
        // past_due / incomplete: Stripe reîncearcă plata, nu schimbăm planul încă
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await downgradeBySubscription(subscription.id);
        break;
      }

      default:
        break; // alte evenimente: ignorate
    }
  } catch (err) {
    console.error('[SUCVAR] Procesare webhook eșuată:', err);
    return NextResponse.json({ error: 'Procesare eșuată.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}