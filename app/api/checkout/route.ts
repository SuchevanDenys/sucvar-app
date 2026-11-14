// app/api/checkout/route.ts
// Creează o sesiune Stripe Checkout (abonament lunar) pentru utilizatorul autentificat
// și returnează URL-ul paginii de plată Stripe.
//
// Securitate: utilizatorul (id + email) este luat din token-ul Supabase, NU din body.
// Altfel oricine ar putea declanșa plăți pe numele altui cont.
import { NextResponse } from 'next/server';
import { getAdmin } from '@/app/lib/supabase/admin';
import { PAID_PLANS, PLAN_CURRENCY, getStripe, isPaidPlan } from '@/app/lib/billing/stripe';

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  try {
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
    const header = request.headers.get('authorization') ?? '';
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    if (!token) return fail(401, 'AUTH_REQUIRED', 'Autentifică-te pentru a plăti.');

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user || !userData.user.email) {
      return fail(401, 'AUTH_INVALID', 'Sesiune invalidă. Autentifică-te din nou.');
    }
    const user = userData.user;

    // 2. Planul cerut (doar 'pro' sau 'agency')
    const body: unknown = await request.json().catch(() => null);
    const requested =
      typeof body === 'object' && body !== null ? (body as { plan?: unknown }).plan : null;
    if (!isPaidPlan(requested)) {
      return fail(400, 'INVALID_PLAN', 'Plan invalid.');
    }
    const plan = requested;

    // 3. Nu vindem același plan de două ori; refolosim clientul Stripe existent
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.subscription_tier === plan) {
      return fail(409, 'ALREADY_SUBSCRIBED', 'Ai deja acest plan activ.');
    }

    // 4. Sesiunea Stripe Checkout
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get('origin') ||
      new URL(request.url).origin
    ).replace(/\/$/, '');

    const details = PAID_PLANS[plan];
    // Aceleași metadate pe sesiune ȘI pe abonament: webhook-ul le citește din amândouă
    const metadata = { user_id: user.id, plan };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // `customer` și `customer_email` se exclud reciproc
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id as string }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PLAN_CURRENCY,
            unit_amount: details.unitAmount,
            recurring: { interval: 'month' },
            product_data: { name: details.name },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      success_url: `${siteUrl}/generate?payment=success`,
      cancel_url: `${siteUrl}/checkout?plan=${plan}&canceled=1`,
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