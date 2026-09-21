import Link from 'next/link';
import { notFound } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { adminAddScore, adminDeleteScore, adminSetSubscription, adminUpdateScore, adminUpdateUser } from '@/lib/actions/admin';
import { subscription } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function UserDetail({ params, searchParams }: { params: { id: string }; searchParams: any }) {
  const db = admin();
  const { data: u } = await db.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!u) notFound();
  const [{ data: scores }, { data: charities }] = await Promise.all([
    db.from('scores').select('*').eq('user_id', u.id).order('played_on', { ascending: false }),
    db.from('charities').select('id,name').order('name'),
  ]);
  const s = subscription(u);

  return (
    <div>
      <Link href="/admin/users" className="text-sm font-medium text-plum/60 hover:text-plum">← All users</Link>
      <h1 className="mt-2 text-3xl font-extrabold">{u.full_name || u.email}</h1>
      <p className="text-plum/65">{u.email} · currently <b>{s.label.toLowerCase()}</b></p>
      <div className="mt-5"><Flash sp={searchParams} /></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={adminUpdateUser} className="card space-y-3">
          <h2 className="text-xl font-bold">Profile</h2>
          <input type="hidden" name="id" value={u.id} />
          <div><label className="label">Full name</label><input name="full_name" defaultValue={u.full_name || ''} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Role</label><select name="role" defaultValue={u.role} className="input"><option value="subscriber">Subscriber</option><option value="admin">Admin</option></select></div>
            <div><label className="label">Charity %</label><input name="charity_percent" type="number" min={10} max={50} defaultValue={u.charity_percent} className="input" /></div>
          </div>
          <div><label className="label">Charity</label><select name="charity_id" defaultValue={u.charity_id || ''} className="input"><option value="">None</option>{charities?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button className="btn btn-dark">Save profile</button>
        </form>

        <form action={adminSetSubscription} className="card space-y-3">
          <h2 className="text-xl font-bold">Subscription</h2>
          <input type="hidden" name="id" value={u.id} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Status</label><select name="status" defaultValue={u.subscription_status} className="input"><option value="none">None</option><option value="active">Active</option><option value="cancelled">Cancelled (until period end)</option><option value="lapsed">Lapsed</option></select></div>
            <div><label className="label">Plan</label><select name="plan" defaultValue={u.plan || ''} className="input"><option value="">None</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
          </div>
          <div><label className="label">Period end</label><input name="period_end" type="date" defaultValue={u.current_period_end?.slice(0, 10) || ''} className="input" /></div>
          <button className="btn btn-dark">Save subscription</button>
        </form>
      </div>

      <section className="card mt-6">
        <h2 className="text-xl font-bold">Golf scores</h2>
        <form action={adminAddScore} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="user_id" value={u.id} />
          <div><label className="label">Score</label><input name="score" type="number" min={1} max={45} required className="input w-24" /></div>
          <div><label className="label">Date</label><input name="played_on" type="date" required className="input" /></div>
          <button className="btn btn-primary">Add score</button>
        </form>
        <ul className="mt-5 divide-y divide-plum/10">
          {(scores || []).map((sc) => (
            <li key={sc.id} className="flex flex-wrap items-end gap-2 py-3">
              <form action={adminUpdateScore} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={sc.id} /><input type="hidden" name="user_id" value={u.id} />
                <input name="score" type="number" min={1} max={45} defaultValue={sc.score} className="input w-24" aria-label="Score" />
                <input name="played_on" type="date" defaultValue={sc.played_on} className="input" aria-label="Date" />
                <button className="btn btn-dark btn-sm">Save</button>
              </form>
              <form action={adminDeleteScore}><input type="hidden" name="id" value={sc.id} /><input type="hidden" name="user_id" value={u.id} /><button className="btn btn-danger btn-sm">Delete</button></form>
              <span className="text-xs text-plum/50">{fmtDate(sc.played_on)}</span>
            </li>
          ))}
          {!scores?.length && <li className="py-3 text-sm text-plum/60">This user has no scores.</li>}
        </ul>
      </section>
    </div>
  );
}
