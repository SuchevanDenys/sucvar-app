// app/api/checkout/route.ts
// Creează o sesiune Stripe Checkout (abonament lunar sau anual) pentru utilizatorul autentificat
// și returnează URL-ul paginii de plată Stripe.
//
// Securitate: utilizatorul (id + email) este luat din token-ul Supabase, NU din body.
// Altfel oricine ar putea declanșa plăți pe numele altui cont.
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp, getBearerToken, readBodyText, tooManyRequests } from '@/app/lib/server/http';
import { getAdmin } from '@/app/lib/supabase/admin';
import { getEffectiveSubscription } from '@/app/lib/server/db';
import { canPurchase, normalizeInterval } from '@/app/lib/plan/tiers';
import {
  PAID_PLANS,
  PLAN_CURRENCY,
  configuredPriceId,
  getStripe,
  isPaidPlan,
  unitAmountFor,
} from '@/app/lib/billing/stripe';

// Limite de rată: pe IP (înainte de Supabase) și pe utilizator. Fiecare cerere creează o
// sesiune Stripe, deci plafonăm strict pentru a preveni spam-ul de sesiuni.
const RATE_IP = { name: 'checkout:ip', limit: 30, windowSeconds: 600 } as const;
const RATE_USER = { name: 'checkout:user', limit: 8, windowSeconds: 600 } as const;
const MAX_BODY_BYTES = 2_000;

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  try {
    const ipWait = checkRateLimit(RATE_IP, clientIp(request));
    if (ipWait !== null) return tooManyRequests(ipWait);

    const stripe = getStripe();
    const { client: admin, missing } = getAdmin();
    if (!stripe || !admin) {
      const lacks = [...(stripe ? [] : ['STRIPE_SECRET_KEY']), ...missing];
      console.error('[SUCVAR] Config lipsă pentru checkout:', lacks.join(', '));
      return fail(
        500,
        'NOT_CONFIGURED',
        process.env.NODE_ENV === 'production'
          ? 'Plata nu este configurată pe server.'
          : `Plata nu este configurată. Lipsește din .env.local: ${lacks.join(', ')}`
      );
    }

    // 1. Utilizatorul din token-ul Supabase
    const token = getBearerToken(request);
    if (!token) return fail(401, 'AUTH_REQUIRED', 'Autentifică-te pentru a plăti.');

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user || !userData.user.email) {
      return fail(401, 'AUTH_INVALID', 'Sesiune invalidă. Autentifică-te din nou.');
    }
    const user = userData.user;

    const userWait = checkRateLimit(RATE_USER, user.id);
    if (userWait !== null) return tooManyRequests(userWait);

    // 2. Planul cerut (doar 'pro' sau 'agency'); corpul legitim are sub 100 de octeți
    const raw = await readBodyText(request, MAX_BODY_BYTES);
    if (!raw.ok) return raw.response;
    let body: unknown = null;
    try {
      body = JSON.parse(raw.text);
    } catch {
      body = null;
    }
    const fields =
      typeof body === 'object' && body !== null ? (body as { plan?: unknown; interval?: unknown }) : {};
    if (!isPaidPlan(fields.plan)) {
      return fail(400, 'INVALID_PLAN', 'Plan invalid.');
    }
    const plan = fields.plan;
    // Ciclul de facturare: lipsă => lunar (compatibil cu clienții vechi); orice altceva => 400
    const interval = fields.interval === undefined ? 'month' : normalizeInterval(fields.interval);
    if (!interval) {
      return fail(400, 'INVALID_INTERVAL', 'Ciclu de facturare invalid (month | year).');
    }

    // 3. Nu vindem același plan de două ori; refolosim clientul Stripe existent
    const sub = await getEffectiveSubscription(user.id);
    // Planul curent se calculează „efectiv": un abonament expirat (current_period_end < acum)
    // devine 'starter', deci utilizatorul îl poate cumpăra din nou.
    // Gardă (pe server, nu poate fi ocolită din UI) — vezi canPurchase în tiers.ts:
    //   pro lunar -> pro anual / agency;  agency lunar -> agency anual;
    //   același plan + același ciclu sau un plan inferior => 409.
    // Upgrade-ul refolosește `stripe_customer_id`, fără client Stripe duplicat; abonamentul vechi
    // e anulat după plată (applyPaidSession), deci nu se facturează dublu.
    const currentTier = sub.tier;
    const currentInterval = sub.interval;
    if (!canPurchase({ tier: currentTier, interval: currentInterval }, { tier: plan, interval })) {
      const same = currentTier === plan;
      return NextResponse.json(
        {
          code: same ? 'ALREADY_SUBSCRIBED' : 'PLAN_INCLUDED',
          error: same
            ? 'Ai deja acest plan activ (sau unul anual echivalent). / You already have this plan active.'
            : `Planul tău curent (${currentTier}) îl include deja pe ${plan}. / Your current plan (${currentTier}) already includes ${plan}.`,
          currentTier,
          redirect: currentTier === 'agency' ? '/b2b' : '/generate',
        },
        { status: 409 }
      );
    }

    // 4. Sesiunea Stripe Checkout
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      new URL(request.url).origin
    ).replace(/\/$/, '');

    const details = PAID_PLANS[plan];
    const priceId = configuredPriceId(plan, interval);
    // Aceleași metadate pe sesiune ȘI pe abonament: webhook-ul le citește din amândouă
    const metadata = { user_id: user.id, plan, interval };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // `customer` și `customer_email` se exclud reciproc
      ...(sub.stripeCustomerId
        ? { customer: sub.stripeCustomerId }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      // Price ID din env, dacă e configurat; altfel `price_data` dinamic cu intervalul recurent
      // ales (month | year). Anualul = 12 luni − 20%, facturat o dată pe an.
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: PLAN_CURRENCY,
                unit_amount: unitAmountFor(plan, interval),
                recurring: { interval },
                product_data: {
                  name: interval === 'year' ? `${details.name} (anual)` : details.name,
                },
              },
            },
      ],
      metadata,
      subscription_data: { metadata },
      // {CHECKOUT_SESSION_ID} e înlocuit de Stripe; pagina de succes îl trimite la /api/checkout/verify
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?plan=${plan}&interval=${interval}&canceled=1`,
    });

    if (!session.url) {
      return fail(502, 'NO_CHECKOUT_URL', 'Stripe nu a returnat adresa de plată.');
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[SUCVAR] Eroare checkout:', error);
    return fail(500, 'CHECKOUT_FAILED', 'Nu s-a putut porni plata. Încearcă din nou.');
  }
}