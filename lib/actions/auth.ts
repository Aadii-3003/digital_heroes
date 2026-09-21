'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { go } from '@/lib/flash';
import { MAX_CHARITY_PERCENT, MIN_CHARITY_PERCENT } from '@/lib/config';

export async function signUp(fd: FormData) {
  const email = String(fd.get('email') || '').trim().toLowerCase();
  const password = String(fd.get('password') || '');
  const full_name = String(fd.get('full_name') || '').trim();
  const charity_id = String(fd.get('charity_id') || '');
  const pct = Math.min(MAX_CHARITY_PERCENT, Math.max(MIN_CHARITY_PERCENT, Number(fd.get('charity_percent')) || MIN_CHARITY_PERCENT));
  if (!full_name) go('/signup', 'error', 'Enter your name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) go('/signup', 'error', 'Enter a valid email address.');
  if (password.length < 8) go('/signup', 'error', 'Password must be at least 8 characters.');
  if (!charity_id) go('/signup', 'error', 'Choose a charity to support.');

  const sb = createClient();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, charity_id, charity_percent: pct } } });
  if (error) go('/signup', 'error', error.message);
  if (!data.session) go('/login', 'msg', 'Account created. Confirm your email, then log in.');
  redirect('/subscribe');
}

export async function signIn(fd: FormData) {
  const sb = createClient();
  const { error } = await sb.auth.signInWithPassword({ email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') });
  if (error) go('/login', 'error', 'Email or password is incorrect.');
  const p = await getProfile();
  redirect(p?.role === 'admin' ? '/admin' : '/dashboard');
}

export async function signOut() {
  await createClient().auth.signOut();
  redirect('/');
}
