import { admin } from '@/lib/supabase/admin';
import { getImpact } from '@/lib/stats';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Reports() {
  const db = admin();
  const [users, charities, payments, donations, draws, winners] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('charities').select('id,name'),
    db.from('payments').select('charity_id,charity_amount,prize_amount,amount'),
    db.from('donations').select('charity_id,amount'),
    db.from('draws').select('*').order('draw_month', { ascending: false }),
    db.from('winners').select('prize_amount,payment_status,match_count'),
  ]);
  const impact = await getImpact();
  const pubDraws = (draws.data || []).filter((d) => d.status === 'published');
  const prizeTotal = pubDraws.reduce((s, d) => s + Number(d.pool_total), 0);
  const perCharity = (charities.data || []).map((c) => ({
    name: c.name,
    fees: (payments.data || []).filter((p) => p.charity_id === c.id).reduce((s, p) => s + Number(p.charity_amount), 0),
    donated: (donations.data || []).filter((d) => d.charity_id === c.id).reduce((s, d) => s + Number(d.amount), 0),
  }));
  const w = winners.data || [];
  const paidOut = w.filter((x) => x.payment_status === 'paid').reduce((s, x) => s + Number(x.prize_amount), 0);
  const pending = w.filter((x) => x.payment_status !== 'paid').reduce((s, x) => s + Number(x.prize_amount), 0);

  const stat = (label: string, value: string | number, tone = '') => (
    <div className="card"><dd className={`font-display text-3xl font-extrabold ${tone}`}>{value}</dd><dt className="mt-1 text-sm text-plum/65">{label}</dt></div>
  );
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Reports and analytics</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat('Total users', users.count || 0)}
        {stat('Active subscribers', impact.subscribers, 'text-lagoon')}
        {stat('Current monthly prize pool', money(impact.pool), 'text-bloom')}
        {stat('Total charity contributions', money(perCharity.reduce((s, c) => s + c.fees + c.donated, 0)))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-xl font-bold">Charity contribution totals</h2>
          <table className="mt-3 w-full"><thead><tr className="border-b border-plum/10"><th className="th">Charity</th><th className="th">From subscriptions</th><th className="th">Donations</th></tr></thead>
            <tbody>{perCharity.map((c) => <tr key={c.name} className="border-b border-plum/5"><td className="td font-medium">{c.name}</td><td className="td">{money(c.fees)}</td><td className="td">{money(c.donated)}</td></tr>)}</tbody></table>
        </section>
        <section className="card">
          <h2 className="text-xl font-bold">Draw statistics</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div><dd className="font-display text-2xl font-extrabold">{pubDraws.length}</dd><dt className="text-sm text-plum/65">draws published</dt></div>
            <div><dd className="font-display text-2xl font-extrabold">{w.length}</dd><dt className="text-sm text-plum/65">total winners</dt></div>
            <div><dd className="font-display text-2xl font-extrabold">{money(prizeTotal)}</dd><dt className="text-sm text-plum/65">total prize pools</dt></div>
            <div><dd className="font-display text-2xl font-extrabold">{money(paidOut)}</dd><dt className="text-sm text-plum/65">paid out ({money(pending)} pending)</dt></div>
          </dl>
          <table className="mt-4 w-full"><thead><tr className="border-b border-plum/10"><th className="th">Month</th><th className="th">Numbers</th><th className="th">Pool</th><th className="th">Rolled over</th></tr></thead>
            <tbody>{pubDraws.slice(0, 6).map((d) => <tr key={d.id} className="border-b border-plum/5"><td className="td">{d.draw_month.slice(0, 7)}</td><td className="td">{d.winning_numbers.join(', ')}</td><td className="td">{money(d.pool_total)}</td><td className="td">{money(d.jackpot_carry_out)}</td></tr>)}</tbody></table>
        </section>
      </div>
    </div>
  );
}
