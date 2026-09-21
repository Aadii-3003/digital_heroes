'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireProfile, subscription } from '@/lib/auth';
import { go } from '@/lib/flash';
import { admin } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { activateSubscription, addMonths } from '@/lib/billing';
import { CURRENCY_CODE, PLANS, SITE_URL, type PlanKey } from '@/lib/config';

export async function subscribe(fd: FormData) {
  const p = await requireProfile();
  const plan = String(fd.get('plan')) as PlanKey;
  if (!PLANS[plan]) go('/subscribe', 'error', 'Choose a plan.');
  if (subscription(p).active && !subscription(p).cancelling) go('/dashboard', 'msg', 'You already have an active subscription.');

  if (stripe) {
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: p.stripe_customer_id || undefined,
      customer_email: p.stripe_customer_id ? undefined : p.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY_CODE,
            unit_amount: PLANS[plan].price * 100,
            recurring: { interval: PLANS[plan].interval },
            product_data: { name: `Digital Heroes ${PLANS[plan].label}` },
          },
        },
      ],
      metadata: { user_id: p.id, plan },
      subscription_data: { metadata: { user_id: p.id, plan } },
      success_url: `${SITE_URL}/dashboard?msg=${encodeURIComponent('Welcome aboard! Your subscription is being confirmed.')}`,
      cancel_url: `${SITE_URL}/subscribe?error=${encodeURIComponent('Checkout was cancelled.')}`,
    });
    redirect(s.url!);
  }

  // ---- Demo mode (no Stripe keys configured): simulate a successful payment ----
  await activateSubscription(p.id, plan, addMonths(new Date(), PLANS[plan].months), {}, 'demo');
  revalidatePath('/', 'layout');
  go('/dashboard', 'msg', `${PLANS[plan].label} plan activated (demo checkout).`);
}

export async function cancelSubscription() {
  const p = await requireProfile();
  if (stripe && p.stripe_subscription_id) await stripe.subscriptions.update(p.stripe_subscription_id, { cancel_at_period_end: true });
  await admin().from('profiles').update({ subscription_status: 'cancelled' }).eq('id', p.id);
  revalidatePath('/dashboard');
  go('/dashboard', 'msg', 'Subscription cancelled. You keep access until the end of your billing period.');
}
