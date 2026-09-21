import { admin } from '@/lib/supabase/admin';
import { discardSimulation, publishDrawAction, runSimulation } from '@/lib/actions/admin';
import { fmtMonth, money } from '@/lib/format';
import { PRIZE_POOL_PERCENT, TIER_SHARES, MIN_SCORES_FOR_DRAW } from '@/lib/config';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function DrawsAdmin({ searchParams }: { searchParams: any }) {
  const draws = (await admin().from('draws').select('*').order('draw_month', { ascending: false })).data || [];
  const nextMonth = new Date(); nextMonth.setUTCDate(1);
  const defaultMonth = nextMonth.toISOString().slice(0, 7);
  return (
    <div>
      <h1 className="text-3xl font-extrabold">Draw management</h1>
      <div className="mt-5"><Flash sp={searchParams} /></div>

      <form action={runSimulation} className="card grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
        <div><label className="label" htmlFor="month">Draw month</label><input id="month" name="month" type="month" defaultValue={defaultMonth} required className="input" /></div>
        <div><label className="label" htmlFor="mode">Draw logic</label>
          <select id="mode" name="mode" className="input"><option value="random">Random (standard lottery)</option><option value="algorithmic">Algorithmic (weighted by score frequency)</option></select></div>
        <div><label className="label" htmlFor="manual">Manual numbers (optional, for testing)</label><input id="manual" name="manual" placeholder="e.g. 7, 12, 23, 31, 40" className="input" /></div>
        <button className="btn btn-primary">Run simulation</button>
      </form>
      <p className="mt-3 text-sm text-plum/60">Simulations are private. Pool = {PRIZE_POOL_PERCENT}% of each active subscriber&apos;s fee, split {TIER_SHARES[5] * 100}/{TIER_SHARES[4] * 100}/{TIER_SHARES[3] * 100} across 5/4/3 matches. Members need {MIN_SCORES_FOR_DRAW} stored scores to be entered. Re-run a simulation as often as you like before publishing.</p>

      <div className="mt-8 space-y-5">
        {draws.length === 0 && <p className="card text-center text-plum/60">No draws yet. Run your first simulation above.</p>}
        {draws.map((d) => (
          <section key={d.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{fmtMonth(d.draw_month)}</h2>
                <span className={`badge ${d.status === 'published' ? 'bg-lagoon/15 text-lagoon-dark' : 'bg-sun/40'}`}>{d.status === 'published' ? 'Published' : 'Simulation'}</span>
                <span className="text-xs text-plum/55">{d.mode}</span>
              </div>
              {d.status === 'simulated' && (
                <div className="flex gap-2">
                  <form action={discardSimulation}><input type="hidden" name="id" value={d.id} /><button className="btn btn-ghost btn-sm">Discard</button></form>
                  <form action={publishDrawAction}><input type="hidden" name="id" value={d.id} /><button className="btn btn-primary btn-sm">Publish results</button></form>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">{d.winning_numbers.map((n: number) => <span key={n} className="flex h-11 w-11 items-center justify-center rounded-full bg-plum font-display font-bold text-white">{n}</span>)}</div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:grid-cols-6">
              <div><dd className="font-bold">{d.subscriber_count}</dd><dt className="text-plum/60">active subscribers</dt></div>
              <div><dd className="font-bold">{d.participant_count}</dd><dt className="text-plum/60">entered</dt></div>
              <div><dd className="font-bold">{money(d.pool_total)}</dd><dt className="text-plum/60">pool</dt></div>
              <div><dd className="font-bold">{money(d.tier5_pool)}</dd><dt className="text-plum/60">5-match (incl. {money(d.jackpot_carry_in)} rolled over)</dt></div>
              <div><dd className="font-bold">{money(d.tier4_pool)}</dd><dt className="text-plum/60">4-match</dt></div>
              <div><dd className="font-bold">{money(d.tier3_pool)}</dd><dt className="text-plum/60">3-match</dt></div>
            </dl>
            <div className="mt-4 rounded-xl bg-paper p-4 text-sm">
              <p className="font-semibold">{(d.preview || []).length ? 'Winners' : 'No winners this month'}{d.jackpot_carry_out > 0 && ` · ${money(d.jackpot_carry_out)} jackpot rolls over`}</p>
              {(d.preview || []).length > 0 && (
                <ul className="mt-2 space-y-1">{d.preview.map((w: any) => <li key={w.user_id} className="flex justify-between"><span>{w.name}</span><span>{w.matches} matches · {money(w.prize)}</span></li>)}</ul>
              )}
              {d.status === 'published' && <p className="mt-2 text-xs text-plum/55">Winner list above is the simulation snapshot; final winners are on the Winners tab.</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
