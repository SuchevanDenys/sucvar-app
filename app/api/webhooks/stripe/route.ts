// app/api/webhooks/stripe/route.ts
// Primește evenimentele Stripe și sincronizează `profiles` (Service Role, ocolește RLS):
//   • checkout.session.completed      -> plan plătit + stripe_customer_id + stripe_subscription_id
//   • customer.subscription.updated   -> reactivare / schimbare plan / anulare programată / perioadă nouă
//   • customer.subscription.deleted   -> înapoi la 'starter' (expirarea efectivă a abonamentului)
//   • invoice.paid                    -> reînnoire plătită: prelungește current_period_end
//
// SINCRONIZAREA PERIOADEI: la fiecare eveniment copiem din Stripe în `profiles`
// current_period_end (ISO), billing_interval ('month'|'year') și cancel_at_period_end.
// Clientul și serverul compară current_period_end cu „acum" ca să trateze un abonament
// expirat drept 'starter', chiar dacă webhook-ul de ștergere ar întârzia.
//
// CONFIRMARE DUBLĂ (webhook + verificare directă):
//   Planul se activează pe DOUĂ căi independente, care scriu aceleași coloane din `profiles`
//   (subscription_tier, stripe_customer_id, stripe_subscription_id) prin aceeași funcție
//   (lib/server/subscription.ts):
//     1. acest webhook — sursa de adevăr pe termen lung (reînnoiri, anulări, expirări);
//     2. /api/checkout/verify — apelat de pagina de succes, activează planul INSTANT,
//        fără să aștepte webhook-ul (care local poate lipsi sau întârzia).
//   Oricare ajunge prima, cealaltă nu strică nimic: operația este idempotentă.
//
// IMPORTANT: semnătura se verifică pe corpul BRUT (request.text()), nu pe JSON parsat.
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getAdmin } from '@/app/lib/supabase/admin';
import { getStripe } from '@/app/lib/billing/stripe';
import { applyPaidSession, readPaidSession, syncActiveSubscription } from '@/app/lib/server/subscription';

function getAdminOrThrow() {
  const { client: admin } = getAdmin();
  if (!admin) throw new Error('Supabase admin neconfigurat (SUPABASE_SERVICE_ROLE_KEY).');
  return admin;
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
      current_period_end: null,
      billing_interval: null,
      cancel_at_period_end: false,
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

        const paid = readPaidSession(session);
        if (!paid) {
          console.error('[SUCVAR] checkout.session.completed fără user_id / plan valid:', session.id);
          break; // nu are sens să reîncercăm
        }

        // Aceeași funcție ca în /api/checkout/verify => aceleași coloane, idempotent
        await applyPaidSession(stripe, session, paid);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Perioadă nouă / anulare programată / schimbare de ciclu
          await syncActiveSubscription(subscription);
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

      case 'invoice.paid': {
        // Reînnoirea (lunară/anuală) a fost plătită: abonamentul are o nouă current_period_end.
        const invoice = event.data.object as Stripe.Invoice;
        const ref = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof ref === 'string' ? ref : ref?.id;
        if (!subscriptionId) break; // factură fără abonament
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          await syncActiveSubscription(subscription);
        }
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