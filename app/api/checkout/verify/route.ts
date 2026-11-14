// app/api/checkout/verify/route.ts
// Verificare DIRECTĂ a sesiunii Stripe, apelată de pagina de succes imediat după plată.
// Nu depinde de webhook (care poate întârzia sau nu ajunge deloc în dezvoltare locală):
// întrebăm Stripe direct dacă sesiunea e plătită și activăm planul în `profiles`.
//
// Securitate: sesiunea trebuie să aparțină utilizatorului autentificat (token Supabase),
// altfel cineva ar putea „revendica" sesiunea altui cont.
import { NextResponse } from 'next/server';
import { getAdmin } from '@/app/lib/supabase/admin';
import { getStripe } from '@/app/lib/billing/stripe';
import { applyPaidSession, readPaidSession } from '@/app/lib/server/subscription';

function fail(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { client: admin } = getAdmin();
    if (!stripe || !admin) return fail(500, 'NOT_CONFIGURED', 'Plata nu este configurată pe server.');

    const header = request.headers.get('authorization') ?? '';
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    if (!token) return fail(401, 'AUTH_REQUIRED', 'Autentifică-te pentru a verifica plata.');
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return fail(401, 'AUTH_INVALID', 'Sesiune invalidă. Autentifică-te din nou.');
    }

    const body: unknown = await request.json().catch(() => null);
    const sessionId =
      typeof body === 'object' && body !== null ? (body as { session_id?: unknown }).session_id : null;
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return fail(400, 'INVALID_SESSION', 'session_id invalid.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = readPaidSession(session);
    if (!paid) {
      // Nu e (încă) plătită: clientul poate reîncerca
      return NextResponse.json({ paid: false, status: session.payment_status }, { status: 200 });
    }
    if (paid.userId !== userData.user.id) {
      return fail(403, 'SESSION_MISMATCH', 'Această sesiune de plată aparține altui cont.');
    }

    await applyPaidSession(stripe, session, paid);
    return NextResponse.json({ paid: true, tier: paid.plan });
  } catch (error) {
    console.error('[SUCVAR] Eroare verificare checkout:', error);
    return fail(500, 'VERIFY_FAILED', 'Nu s-a putut verifica plata.');
  }
}
