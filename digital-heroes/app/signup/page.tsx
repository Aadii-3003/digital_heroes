import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { admin } from '@/lib/supabase/admin';
import { MAX_CHARITY_PERCENT, MIN_CHARITY_PERCENT } from '@/lib/config';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function Signup({ searchParams }: { searchParams: any }) {
  let charities: any[] = [];
  try { charities = (await admin().from('charities').select('id,name,category').eq('active', true).order('name')).data || []; } catch {}
  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <h1 className="text-4xl font-extrabold">Create your account</h1>
      <p className="mt-2 text-plum/70">Next you&apos;ll pick a plan. Your charity choice is set now and can be changed any time.</p>
      <div className="mt-6"><Flash sp={searchParams} /></div>
      <form action={signUp} className="card space-y-4">
        <div><label className="label" htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required autoComplete="name" className="input" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="password">Password (8+ characters)</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" /></div>
        <div>
          <label className="label" htmlFor="charity_id">Charity you want to support</label>
          <select id="charity_id" name="charity_id" required defaultValue="" className="input">
            <option value="" disabled>Choose a charity</option>
            {charities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="charity_percent">Share of your fee to donate (%)</label>
          <input id="charity_percent" name="charity_percent" type="number" min={MIN_CHARITY_PERCENT} max={MAX_CHARITY_PERCENT} defaultValue={MIN_CHARITY_PERCENT} className="input" />
          <p className="mt-1 text-xs text-plum/60">Minimum {MIN_CHARITY_PERCENT}%, maximum {MAX_CHARITY_PERCENT}%.</p>
        </div>
        <button className="btn btn-primary w-full">Create account</button>
      </form>
      <p className="mt-5 text-center text-sm text-plum/70">Already a member? <Link href="/login" className="font-semibold text-bloom">Log in</Link></p>
    </div>
  );
}
