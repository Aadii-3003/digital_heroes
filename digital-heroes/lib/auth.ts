import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { go } from './flash';

export async function getProfile() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
export async function requireProfile() {
  const p = await getProfile();
  if (!p) redirect('/login');
  return p;
}
export async function requireAdmin() {
  const p = await requireProfile();
  if (p.role !== 'admin') redirect('/dashboard');
  return p;
}

/**
 * Real-time subscription check. Evaluated from the stored status AND the period end,
 * so a lapsed / expired subscription loses access without waiting for a webhook.
 */
export function subscription(p: any) {
  const end = p?.current_period_end ? new Date(p.current_period_end) : null;
  const inDate = !!end && end.getTime() > Date.now();
  const status: string = p?.subscription_status || 'none';
  if ((status === 'active' || status === 'cancelled') && inDate) {
    return { active: true, cancelling: status === 'cancelled', label: status === 'cancelled' ? 'Cancelling' : 'Active', end };
  }
  if (status === 'none') return { active: false, cancelling: false, label: 'Inactive', end };
  return { active: false, cancelling: false, label: 'Lapsed', end };
}

/** Guard for every subscriber-only mutation. */
export async function requireActive(back = '/dashboard') {
  const p = await requireProfile();
  if (!subscription(p).active) go('/subscribe', 'error', 'You need an active subscription to do that.');
  return p;
}
