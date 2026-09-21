import { admin } from './supabase/admin';
import { PLANS, PRIZE_POOL_PERCENT, round2, type PlanKey } from './config';

/** Mark a user as subscribed and log the payment (charity / prize split is stored per payment). */
export async function activateSubscription(userId: string, plan: PlanKey, periodEnd: Date, extra: Record<string, any> = {}, source = 'stripe') {
  const db = admin();
  const { data: profile } = await db.from('profiles').select('charity_id,charity_percent').eq('id', userId).single();
  await db
    .from('profiles')
    .update({ plan, subscription_status: 'active', current_period_end: periodEnd.toISOString(), ...extra })
    .eq('id', userId);
  await recordPayment(userId, plan, profile, source);
}

export async function recordPayment(userId: string, plan: PlanKey, profile: any, source: string) {
  const db = admin();
  const amount = PLANS[plan].price;
  await db.from('payments').insert({
    user_id: userId,
    charity_id: profile?.charity_id ?? null,
    plan,
    amount,
    charity_amount: round2((amount * (profile?.charity_percent ?? 10)) / 100),
    prize_amount: round2((amount * PRIZE_POOL_PERCENT) / 100),
    source,
  });
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}
