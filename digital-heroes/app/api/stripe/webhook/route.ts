import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { admin } from '@/lib/supabase/admin';
import { activateSubscription, recordPayment } from '@/lib/billing';
import type { PlanKey } from '@/lib/config';

export const runtime = 'nodejs';

const periodEnd = (sub: any): Date => {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return new Date((ts || Math.floor(Date.now() / 1000) + 30 * 86400) * 1000);
};

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  const body = await req.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    return NextResponse.json({ error: `Bad signature: ${e.message}` }, { status: 400 });
  }
  const db = admin();

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      if (s.metadata?.kind === 'donation') {
        await db.from('donations').insert({ user_id: s.metadata.user_id, charity_id: s.metadata.charity_id, amount: Number(s.metadata.amount), source: 'stripe' });
        break;
      }
      if (s.mode === 'subscription') {
        const sub: any = await stripe.subscriptions.retrieve(s.subscription);
        await activateSubscription(s.metadata.user_id, s.metadata.plan as PlanKey, periodEnd(sub), { stripe_customer_id: s.customer, stripe_subscription_id: s.subscription });
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const inv = event.data.object;
      if (inv.billing_reason !== 'subscription_cycle') break; // first payment is handled above
      const { data: p } = await db.from('profiles').select('*').eq('stripe_customer_id', inv.customer).maybeSingle();
      if (!p) break;
      const sub: any = await stripe.subscriptions.retrieve(inv.subscription ?? inv.parent?.subscription_details?.subscription);
      await db.from('profiles').update({ subscription_status: 'active', current_period_end: periodEnd(sub).toISOString() }).eq('id', p.id);
      await recordPayment(p.id, p.plan, p, 'stripe');
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await db
        .from('profiles')
        .update({ subscription_status: sub.cancel_at_period_end ? 'cancelled' : sub.status === 'active' ? 'active' : 'lapsed', current_period_end: periodEnd(sub).toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'customer.subscription.deleted': {
      await db.from('profiles').update({ subscription_status: 'lapsed' }).eq('stripe_subscription_id', event.data.object.id);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
