'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { go } from '@/lib/flash';
import { admin } from '@/lib/supabase/admin';
import { changeScore, insertScore, removeScore } from '@/lib/scoreLogic';
import { parseManual } from '@/lib/draw';
import { publishDraw, simulateDraw } from '@/lib/drawService';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- Users ----------
export async function adminUpdateUser(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  const back = `/admin/users/${id}`;
  const { error } = await admin()
    .from('profiles')
    .update({
      full_name: String(fd.get('full_name') || ''),
      role: fd.get('role') === 'admin' ? 'admin' : 'subscriber',
      charity_id: String(fd.get('charity_id') || '') || null,
      charity_percent: Math.min(50, Math.max(10, Number(fd.get('charity_percent')) || 10)),
    })
    .eq('id', id);
  error ? go(back, 'error', error.message) : go(back, 'msg', 'Profile updated.');
}
export async function adminSetSubscription(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id'));
  const status = String(fd.get('status'));
  const plan = String(fd.get('plan')) || null;
  const end = String(fd.get('period_end') || '');
  const { error } = await admin()
    .from('profiles')
    .update({ subscription_status: status, plan: plan || null, current_period_end: end ? new Date(end + 'T23:59:59Z').toISOString() : null })
    .eq('id', id);
  error ? go(`/admin/users/${id}`, 'error', error.message) : go(`/admin/users/${id}`, 'msg', 'Subscription updated.');
}
export async function adminAddScore(fd: FormData) {
  await requireAdmin();
  const uid = String(fd.get('user_id'));
  const err = await insertScore(uid, Number(fd.get('score')), String(fd.get('played_on')));
  err ? go(`/admin/users/${uid}`, 'error', err) : go(`/admin/users/${uid}`, 'msg', 'Score added.');
}
export async function adminUpdateScore(fd: FormData) {
  await requireAdmin();
  const uid = String(fd.get('user_id'));
  const err = await changeScore(uid, String(fd.get('id')), Number(fd.get('score')), String(fd.get('played_on')));
  err ? go(`/admin/users/${uid}`, 'error', err) : go(`/admin/users/${uid}`, 'msg', 'Score updated.');
}
export async function adminDeleteScore(fd: FormData) {
  await requireAdmin();
  const uid = String(fd.get('user_id'));
  const err = await removeScore(uid, String(fd.get('id')));
  err ? go(`/admin/users/${uid}`, 'error', err) : go(`/admin/users/${uid}`, 'msg', 'Score deleted.');
}

// ---------- Draws ----------
export async function runSimulation(fd: FormData) {
  await requireAdmin();
  const month = String(fd.get('month') || '');
  if (!/^\d{4}-\d{2}$/.test(month)) go('/admin/draws', 'error', 'Pick a month.');
  const mode = fd.get('mode') === 'algorithmic' ? 'algorithmic' : 'random';
  const manualRaw = String(fd.get('manual') || '').trim();
  const manual = manualRaw ? parseManual(manualRaw) : null;
  if (manualRaw && !manual) go('/admin/draws', 'error', 'Manual numbers must be 5 different whole numbers from 1 to 45.');
  const err = await simulateDraw(`${month}-01`, mode, manual);
  revalidatePath('/admin/draws');
  err ? go('/admin/draws', 'error', err) : go('/admin/draws', 'msg', 'Simulation ready. Review it below, then publish.');
}
export async function publishDrawAction(fd: FormData) {
  await requireAdmin();
  const err = await publishDraw(String(fd.get('id')));
  revalidatePath('/', 'layout');
  err ? go('/admin/draws', 'error', err) : go('/admin/draws', 'msg', 'Draw published. Winners have been notified on their dashboards.');
}
export async function discardSimulation(fd: FormData) {
  await requireAdmin();
  await admin().from('draws').delete().eq('id', String(fd.get('id'))).eq('status', 'simulated');
  revalidatePath('/admin/draws');
  go('/admin/draws', 'msg', 'Simulation discarded.');
}

// ---------- Charities ----------
function parseEvents(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [title, date, location] = l.split('|').map((x) => x?.trim());
      return { title, date: date || '', location: location || '' };
    });
}
export async function saveCharityAdmin(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id') || '');
  const name = String(fd.get('name') || '').trim();
  if (!name) go('/admin/charities', 'error', 'Name is required.');
  const row = {
    name,
    slug: slugify(String(fd.get('slug') || '') || name),
    category: String(fd.get('category') || '') || null,
    tagline: String(fd.get('tagline') || '') || null,
    description: String(fd.get('description') || '') || null,
    image_url: String(fd.get('image_url') || '') || null,
    featured: fd.get('featured') === 'on',
    active: fd.get('active') === 'on',
    events: parseEvents(String(fd.get('events') || '')),
  };
  const db = admin();
  if (row.featured) await db.from('charities').update({ featured: false }).neq('id', id || '00000000-0000-0000-0000-000000000000');
  const { error } = id ? await db.from('charities').update(row).eq('id', id) : await db.from('charities').insert(row);
  revalidatePath('/', 'layout');
  error ? go('/admin/charities', 'error', error.message) : go('/admin/charities', 'msg', id ? 'Charity updated.' : 'Charity added.');
}
export async function deleteCharityAdmin(fd: FormData) {
  await requireAdmin();
  const { error } = await admin().from('charities').delete().eq('id', String(fd.get('id')));
  revalidatePath('/', 'layout');
  error ? go('/admin/charities', 'error', error.message) : go('/admin/charities', 'msg', 'Charity deleted.');
}

// ---------- Winners ----------
export async function reviewWinner(fd: FormData) {
  await requireAdmin();
  const approve = fd.get('decision') === 'approve';
  const { error } = await admin()
    .from('winners')
    .update({ verification_status: approve ? 'approved' : 'rejected' })
    .eq('id', String(fd.get('id')))
    .eq('verification_status', 'submitted');
  revalidatePath('/admin/winners');
  error ? go('/admin/winners', 'error', error.message) : go('/admin/winners', 'msg', approve ? 'Submission approved.' : 'Submission rejected. The winner can upload again.');
}
export async function markPaid(fd: FormData) {
  await requireAdmin();
  const { error } = await admin()
    .from('winners')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', String(fd.get('id')))
    .eq('verification_status', 'approved');
  revalidatePath('/admin/winners');
  error ? go('/admin/winners', 'error', error.message) : go('/admin/winners', 'msg', 'Payout marked as paid.');
}
