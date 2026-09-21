'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActive, requireProfile } from '@/lib/auth';
import { go } from '@/lib/flash';
import { admin } from '@/lib/supabase/admin';
import { changeScore, insertScore, removeScore } from '@/lib/scoreLogic';
import { MAX_CHARITY_PERCENT, MIN_CHARITY_PERCENT, CURRENCY_CODE, SITE_URL } from '@/lib/config';
import { stripe } from '@/lib/stripe';

const D = '/dashboard';

// ---------- Scores ----------
export async function addScore(fd: FormData) {
  const p = await requireActive();
  const err = await insertScore(p.id, Number(fd.get('score')), String(fd.get('played_on')));
  revalidatePath(D);
  err ? go(D, 'error', err) : go(D, 'msg', 'Score saved.');
}
export async function updateScore(fd: FormData) {
  const p = await requireActive();
  const err = await changeScore(p.id, String(fd.get('id')), Number(fd.get('score')), String(fd.get('played_on')));
  revalidatePath(D);
  err ? go(D, 'error', err) : go(D, 'msg', 'Score updated.');
}
export async function deleteScore(fd: FormData) {
  const p = await requireActive();
  const err = await removeScore(p.id, String(fd.get('id')));
  revalidatePath(D);
  err ? go(D, 'error', err) : go(D, 'msg', 'Score deleted.');
}

// ---------- Charity choice ----------
export async function saveCharity(fd: FormData) {
  const p = await requireProfile();
  const pct = Math.round(Number(fd.get('charity_percent')));
  if (!pct || pct < MIN_CHARITY_PERCENT || pct > MAX_CHARITY_PERCENT) go(D, 'error', `Choose between ${MIN_CHARITY_PERCENT}% and ${MAX_CHARITY_PERCENT}%.`);
  const { error } = await admin().from('profiles').update({ charity_id: String(fd.get('charity_id')) || null, charity_percent: pct }).eq('id', p.id);
  revalidatePath(D);
  error ? go(D, 'error', error.message) : go(D, 'msg', 'Charity preferences saved.');
}

// ---------- Independent donation (not tied to gameplay) ----------
export async function donate(fd: FormData) {
  const p = await requireProfile();
  const charityId = String(fd.get('charity_id'));
  const slug = String(fd.get('slug'));
  const amount = Math.round(Number(fd.get('amount')));
  if (!amount || amount < 50) go(`/charities/${slug}`, 'error', 'Minimum donation is ₹50.');
  if (stripe) {
    const s = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: p.email,
      line_items: [{ quantity: 1, price_data: { currency: CURRENCY_CODE, unit_amount: amount * 100, product_data: { name: 'Donation' } } }],
      metadata: { kind: 'donation', user_id: p.id, charity_id: charityId, amount: String(amount) },
      success_url: `${SITE_URL}/charities/${slug}?msg=${encodeURIComponent('Thank you for your donation!')}`,
      cancel_url: `${SITE_URL}/charities/${slug}`,
    });
    redirect(s.url!);
  }
  await admin().from('donations').insert({ user_id: p.id, charity_id: charityId, amount, source: 'demo' });
  go(`/charities/${slug}`, 'msg', 'Thank you! Your donation was recorded (demo checkout).');
}

// ---------- Winner proof upload ----------
export async function uploadProof(fd: FormData) {
  const p = await requireProfile();
  const id = String(fd.get('winner_id'));
  const file = fd.get('proof') as File | null;
  const db = admin();
  const { data: w } = await db.from('winners').select('*').eq('id', id).eq('user_id', p.id).maybeSingle();
  if (!w) go(D, 'error', 'Winning not found.');
  if (!['awaiting_proof', 'rejected'].includes(w.verification_status)) go(D, 'error', 'Proof was already submitted.');
  if (!file || !file.size) go(D, 'error', 'Choose a screenshot to upload.');
  if (file.size > 4 * 1024 * 1024) go(D, 'error', 'File is too large (max 4 MB).');
  if (!/^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type)) go(D, 'error', 'Upload a PNG, JPG, WEBP or PDF.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${p.id}/${id}-${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from('proofs').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (upErr) go(D, 'error', upErr.message);
  await db.from('winners').update({ proof_path: path, verification_status: 'submitted' }).eq('id', id);
  revalidatePath(D);
  go(D, 'msg', 'Proof uploaded. An admin will review it shortly.');
}
